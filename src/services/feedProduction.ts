import { runMockTransaction, generateId } from './db';
import { costingService } from './costing';
import type { FeedProductionOrder, FeedProductionOrderItem, InventoryMovement, Item, FeedRecipe } from '../types';

export const feedProductionService = {
  completeFeedProductionOrder(
    woId: string, 
    actualQty: number, // actual_yield in Kg
    actualItems: { id: string, item_id: string, actual_qty: number, unit_price: number, total_cost: number }[],
    costs: { labor_cost: number, machine_electricity_cost: number, additional_vitamin_cost: number, overhead_cost: number, other_cost: number },
    userId: string = 'system'
  ): { success: boolean, message?: string } {
    
    let txResult: any = false;
    try {
      txResult = runMockTransaction((txDb): any => {
        // 1. Ambil WO terbaru
        const wo = txDb.getById<FeedProductionOrder>('feed_production_orders', woId);
        if (!wo) throw new Error('Work Order tidak ditemukan');
        
        // 2. Guard: Pastikan status valid dan belum pernah di-complete
        if (wo.status !== 'In Progress') throw new Error(`Status WO tidak valid (${wo.status})`);
        if (wo.completed_at || wo.completion_transaction_id) {
          throw new Error('Produksi pakan ini sudah pernah diselesaikan dan tidak dapat diposting ulang.');
        }

        // 3. Generate Transaction ID
        const txId = generateId();
        const today = new Date().toISOString();

        // Kalkulasi Cost Material & Potong Stok
        let totalMaterialCost = 0;
        
        for (const reqItem of actualItems) {
          totalMaterialCost += reqItem.total_cost;
          
          // Update PO item
          txDb.update('feed_production_order_items', reqItem.id, {
            actual_qty: reqItem.actual_qty,
            unit_price: reqItem.unit_price,
            total_cost: reqItem.total_cost});

          // Pengurangan Inventory Material
          if (reqItem.actual_qty > 0) {
            const itemMovements = txDb.query<InventoryMovement>('inventory_movements', m => m.item_id === reqItem.item_id);
            const currentStock = itemMovements.reduce((sum, m) => m.direction === 'IN' ? sum + m.quantity : sum - m.quantity, 0);
            
            if (currentStock < reqItem.actual_qty) {
              throw new Error(`Stok tidak cukup untuk bahan ID: ${reqItem.item_id}. Dibutuhkan ${reqItem.actual_qty}, tersedia ${currentStock}`);
            }

            const newStock = currentStock - reqItem.actual_qty;

            txDb.insert<InventoryMovement>('inventory_movements', {
              transaction_id: txId,
              project_id: wo.project_id,
              item_id: reqItem.item_id,
              movement_type: 'Keluar untuk Produksi Pakan',
              direction: 'OUT',
              quantity: reqItem.actual_qty,
              unit_cost: reqItem.unit_price,
              total_cost: reqItem.total_cost,
              stock_before: currentStock,
              stock_after: newStock,
              reference_type: 'FeedProductionOrder',
              reference_id: wo.id,
              reference_number: wo.production_number,
              notes: `Material untuk WO Pakan ${wo.production_number}`,
              
              created_by: userId
            });
          }
        }

        // Tambah Hasil Produksi (Pakan Jadi)
        const recipe = txDb.getById<FeedRecipe>('feed_recipes', wo.recipe_id);
        if (!recipe) throw new Error('Resep tidak ditemukan!');

        // Item name pattern e.g. "Pakan Jadi Layer"
        const feedItemName = `Pakan Jadi ${recipe.feed_type}`;
        
        const existingItems = txDb.query<Item>('items', i => i.name === feedItemName && i.category === 'Pakan Jadi');
        let feedItem = existingItems[0];
        
        if (!feedItem) {
          feedItem = txDb.insert<Item>('items', {
            name: feedItemName,
            category: 'Pakan Jadi',
            unit: 'Kg',
            min_stock: 0,
            avg_cost: 0
          });
        }

        const totalProdCost = totalMaterialCost + costs.labor_cost + costs.machine_electricity_cost + costs.additional_vitamin_cost + costs.overhead_cost + costs.other_cost;
        const hpp = actualQty > 0 ? totalProdCost / actualQty : 0;

        // Cek apakah ada bahan yang harganya 0 (artinya costing_status = Incomplete)
        const hasZeroCostItems = actualItems.some(i => i.unit_price === 0);

        if (actualQty > 0) {
          const itemMovements = txDb.query<InventoryMovement>('inventory_movements', m => m.item_id === feedItem.id);
          const currentStock = itemMovements.reduce((sum, m) => m.direction === 'IN' ? sum + m.quantity : sum - m.quantity, 0);
          const newStock = currentStock + actualQty;

          // Calculate moving average for finished feed
          const oldAvgCost = feedItem.avg_cost || 0;
          const newAvgCost = costingService.calculateMovingAverageCost(currentStock, oldAvgCost, actualQty, hpp);

          // Update avg_cost in Items table
          txDb.update('items', feedItem.id, { avg_cost: newAvgCost });

          txDb.insert<InventoryMovement>('inventory_movements', {
            transaction_id: txId,
            project_id: wo.project_id,
            item_id: feedItem.id,
            movement_type: 'Masuk dari Produksi Pakan',
            direction: 'IN',
            quantity: actualQty,
            unit_cost: hpp,
            total_cost: totalProdCost,
            stock_before: currentStock,
            stock_after: newStock,
            reference_type: 'FeedProductionOrder',
            reference_id: wo.id,
            reference_number: wo.production_number,
            notes: `Hasil Produksi Pakan ${wo.production_number}`,
            
            created_by: userId
          });
        }

        // Finalize WO
        txDb.update('feed_production_orders', wo.id, {
          status: 'Completed',
          actual_yield: actualQty,
          labor_cost: costs.labor_cost,
          machine_electricity_cost: costs.machine_electricity_cost,
          additional_vitamin_cost: costs.additional_vitamin_cost,
          overhead_cost: costs.overhead_cost,
          other_cost: costs.other_cost,
          total_material_cost: totalMaterialCost,
          total_production_cost: totalProdCost,
          hpp_per_kg: hpp,
          costing_status: hasZeroCostItems ? 'Incomplete' : 'Valid',
          completed_at: today,
          completed_by: userId,
          completion_transaction_id: txId
        });
        
      });
    } catch(err: any) {
      return { success: false, message: err.message };
    }

    if (txResult) {
      return { success: true };
    } else {
      return { success: false, message: 'Transaksi digagalkan oleh sistem validasi. Data telah dikembalikan ke awal.' };
    }
  },

  reverseFeedProductionOrder(woId: string, reason: string, userId: string = 'system'): { success: boolean, message?: string } {
    if (reason.length < 10) return { success: false, message: 'Alasan pembatalan minimal 10 karakter' };

    let txResult: any = false;
    try {
      txResult = runMockTransaction((txDb): any => {
        const wo = txDb.getById<FeedProductionOrder>('feed_production_orders', woId);
        if (!wo) throw new Error('Work Order tidak ditemukan');
        
        if (wo.status !== 'Completed') throw new Error(`Hanya WO Completed yang dapat direverse. Status saat ini: ${wo.status}`);
        if (wo.reversed_at || wo.reversal_transaction_id) {
          throw new Error('Produksi ini sudah pernah dibatalkan dan tidak dapat direverse ulang.');
        }

        const txId = generateId();
        const today = new Date().toISOString();

        // Retrieve used items
        const usedItems = txDb.query<FeedProductionOrderItem>('feed_production_order_items', i => i.feed_production_order_id === wo.id);
        
        // Kembalikan bahan (IN)
        for(const item of usedItems) {
          if (item.actual_qty > 0) {
            const itemMovements = txDb.query<InventoryMovement>('inventory_movements', m => m.item_id === item.item_id);
            const currentStock = itemMovements.reduce((sum, m) => m.direction === 'IN' ? sum + m.quantity : sum - m.quantity, 0);
            const newStock = currentStock + item.actual_qty;

            txDb.insert<InventoryMovement>('inventory_movements', {
              transaction_id: txId,
              project_id: wo.project_id,
              item_id: item.item_id,
              movement_type: 'Reversal Produksi Pakan',
              direction: 'IN',
              quantity: item.actual_qty,
              unit_cost: item.unit_price,
              total_cost: item.total_cost,
              stock_before: currentStock,
              stock_after: newStock,
              reference_type: 'FeedProductionOrder',
              reference_id: wo.id,
              reference_number: wo.production_number,
              notes: `Reversal material pakan WO ${wo.production_number}`,
              
              created_by: userId});
          }
        }

        // Kurangi stok pakan jadi (OUT)
        const recipe = txDb.getById<FeedRecipe>('feed_recipes', wo.recipe_id);
        if (recipe) {
          const feedItemName = `Pakan Jadi ${recipe.feed_type}`;
          const existingItems = txDb.query<Item>('items', i => i.name === feedItemName && i.category === 'Pakan Jadi');
          
          if (existingItems.length > 0 && wo.actual_yield > 0) {
            const feedItem = existingItems[0];
            const itemMovements = txDb.query<InventoryMovement>('inventory_movements', m => m.item_id === feedItem.id);
            const currentStock = itemMovements.reduce((sum, m) => m.direction === 'IN' ? sum + m.quantity : sum - m.quantity, 0);
            
            if (currentStock < wo.actual_yield) {
              throw new Error(`Stok pakan jadi tidak mencukupi untuk dibatalkan. Dibutuhkan: ${wo.actual_yield}, Tersedia: ${currentStock}`);
            }
            const newStock = currentStock - wo.actual_yield;

            txDb.insert<InventoryMovement>('inventory_movements', {
              transaction_id: txId,
              project_id: wo.project_id,
              item_id: feedItem.id,
              movement_type: 'Reversal Produksi Pakan',
              direction: 'OUT',
              quantity: wo.actual_yield,
              unit_cost: wo.hpp_per_kg,
              total_cost: wo.total_production_cost,
              stock_before: currentStock,
              stock_after: newStock,
              reference_type: 'FeedProductionOrder',
              reference_id: wo.id,
              reference_number: wo.production_number,
              notes: `Reversal hasil pakan WO ${wo.production_number}`,
              
              created_by: userId
            });
          }
        }

        txDb.update('feed_production_orders', wo.id, {
          status: 'Reversed',
          reversal_reason: reason,
          reversed_at: today,
          reversed_by: userId,
          reversal_transaction_id: txId
        });

      });
    } catch (err: any) {
      return { success: false, message: err.message };
    }

    if (txResult) {
      return { success: true };
    } else {
      return { success: false, message: 'Transaksi pembatalan digagalkan oleh sistem. Cek apakah stok cukup untuk direverse.' };
    }
  }
};
