import { runMockTransaction, generateId } from './db';
import { costingService } from './costing';
import type { ProductionOrder, ProductionOrderItem, InventoryMovement, Item, CageType } from '../types';

export const productionService = {
  completeProductionOrder(
    woId: string, 
    actualQty: number, 
    actualItems: { id: string, item_id: string, actual_qty: number, unit_price: number, total_cost: number }[],
    costs: { labor_cost: number, overhead_cost: number, other_cost: number },
    userId: string = 'system'
  ): { success: boolean, message?: string } {

    // let // // errorMessage = "";

    const txResult = runMockTransaction((txDb): any => {
      // 1. Ambil WO terbaru
      const wo = txDb.getById<ProductionOrder>('production_orders', woId);
      if (!wo) throw new Error('Work Order tidak ditemukan');
      
      // 2. Guard: Pastikan status valid dan belum pernah di-complete
      if (wo.status !== 'In Progress') throw new Error(`Status WO tidak valid (${wo.status})`);
      if (wo.completed_at || wo.completion_transaction_id) {
        throw new Error('Produksi ini sudah pernah diselesaikan dan tidak dapat diposting ulang.');
      }

      // 3. Generate Transaction ID
      const txId = generateId();
      const today = new Date().toISOString();

      // Kalkulasi Cost Material & Potong Stok
      let totalMaterialCost = 0;
      
      for (const reqItem of actualItems) {
        totalMaterialCost += reqItem.total_cost;
        
        // Update PO item
        txDb.update('production_order_items', reqItem.id, {
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
            movement_type: 'Keluar untuk Produksi',
            direction: 'OUT',
            quantity: reqItem.actual_qty,
            unit_cost: reqItem.unit_price,
            total_cost: reqItem.total_cost,
            stock_before: currentStock,
            stock_after: newStock,
            reference_type: 'ProductionOrder',
            reference_id: wo.id,
            reference_number: wo.production_number,
            notes: `Material untuk ${wo.production_number}`,
            
            created_by: userId
          });
        }
      }

      // Tambah Hasil Produksi (Kandang Jadi)
      const ct = txDb.getById<CageType>('cage_types', wo.cage_type_id);
      if (!ct) throw new Error('Tipe kandang tidak ditemukan!');

      const existingItems = txDb.query<Item>('items', i => i.name === ct.name && i.category === 'Kandang Jadi');
      let cageItem = existingItems[0];
      
      if (!cageItem) {
        cageItem = txDb.insert<Item>('items', {
          name: ct.name,
          category: 'Kandang Jadi',
          unit: 'Set',
          min_stock: 0,
          avg_cost: 0
        });
      }

      const totalProdCost = totalMaterialCost + costs.labor_cost + costs.overhead_cost + costs.other_cost;
      const hpp = actualQty > 0 ? totalProdCost / actualQty : 0;

      // Cek apakah ada bahan yang harganya 0 (artinya costing_status = Incomplete)
      const hasZeroCostItems = actualItems.some(i => i.unit_price === 0);

      if (actualQty > 0) {
        const itemMovements = txDb.query<InventoryMovement>('inventory_movements', m => m.item_id === cageItem.id);
        const currentStock = itemMovements.reduce((sum, m) => m.direction === 'IN' ? sum + m.quantity : sum - m.quantity, 0);
        const newStock = currentStock + actualQty;

        // Calculate moving average for finished good (Kandang Jadi)
        const oldAvgCost = cageItem.avg_cost || 0;
        const newAvgCost = costingService.calculateMovingAverageCost(currentStock, oldAvgCost, actualQty, hpp);

        // Update avg_cost in Items table
        txDb.update('items', cageItem.id, { avg_cost: newAvgCost });

        txDb.insert<InventoryMovement>('inventory_movements', {
          transaction_id: txId,
          project_id: wo.project_id,
          item_id: cageItem.id,
          movement_type: 'Masuk dari Produksi',
          direction: 'IN',
          quantity: actualQty,
          unit_cost: hpp,
          total_cost: totalProdCost,
          stock_before: currentStock,
          stock_after: newStock,
          reference_type: 'ProductionOrder',
          reference_id: wo.id,
          reference_number: wo.production_number,
          notes: `Hasil Produksi ${wo.production_number}`,
          
          created_by: userId
        });
      }

      // Finalize WO
      txDb.update('production_orders', wo.id, {
        status: 'Completed',
        actual_qty: actualQty,
        labor_cost: costs.labor_cost,
        overhead_cost: costs.overhead_cost,
        other_cost: costs.other_cost,
        total_material_cost: totalMaterialCost,
        total_production_cost: totalProdCost,
        hpp_per_cage: hpp,
        costing_status: hasZeroCostItems ? 'Incomplete' : 'Valid',
        completed_at: today,
        completed_by: userId,
        completion_transaction_id: txId
      });
      
    });

    if (txResult) {
      return { success: true };
    } else {
      return { success: false, message: 'Transaksi digagalkan oleh sistem validasi. Data telah dikembalikan ke awal.' };
    }
  },

  reverseProductionOrder(woId: string, reason: string, userId: string = 'system'): { success: boolean, message?: string } {


    if (reason.length < 10) return { success: false, message: 'Alasan pembatalan minimal 10 karakter' };

    const txResult = runMockTransaction((txDb): any => {
      const wo = txDb.getById<ProductionOrder>('production_orders', woId);
      if (!wo) throw new Error('Work Order tidak ditemukan');
      
      if (wo.status !== 'Completed') throw new Error(`Hanya WO Completed yang dapat direverse. Status saat ini: ${wo.status}`);
      if (wo.reversed_at || wo.reversal_transaction_id) {
        throw new Error('Produksi ini sudah pernah dibatalkan dan tidak dapat direverse ulang.');
      }

      const txId = generateId();
      const today = new Date().toISOString();

      // Retrieve used items
      const usedItems = txDb.query<ProductionOrderItem>('production_order_items', i => i.production_order_id === wo.id);
      
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
            movement_type: 'Reversal Produksi',
            direction: 'IN',
            quantity: item.actual_qty,
            unit_cost: item.unit_price,
            total_cost: item.total_cost,
            stock_before: currentStock,
            stock_after: newStock,
            reference_type: 'ProductionOrder',
            reference_id: wo.id,
            reference_number: wo.production_number,
            notes: `Reversal material WO ${wo.production_number}`,
            
            created_by: userId});
        }
      }

      // Kurangi stok kandang jadi (OUT)
      const ct = txDb.getById<CageType>('cage_types', wo.cage_type_id);
      if (ct) {
        const existingItems = txDb.query<Item>('items', i => i.name === ct.name && i.category === 'Kandang Jadi');
        if (existingItems.length > 0 && wo.actual_qty > 0) {
          const cageItem = existingItems[0];
          const itemMovements = txDb.query<InventoryMovement>('inventory_movements', m => m.item_id === cageItem.id);
          const currentStock = itemMovements.reduce((sum, m) => m.direction === 'IN' ? sum + m.quantity : sum - m.quantity, 0);
          
          if (currentStock < wo.actual_qty) {
            throw new Error(`Stok kandang jadi tidak mencukupi untuk dibatalkan. Dibutuhkan: ${wo.actual_qty}, Tersedia: ${currentStock}`);
          }
          const newStock = currentStock - wo.actual_qty;

          // Note: reversing finished goods does not usually revert the moving average easily without complex logic. 
          // For MVP we just deduct stock.
          
          txDb.insert<InventoryMovement>('inventory_movements', {
            transaction_id: txId,
            project_id: wo.project_id,
            item_id: cageItem.id,
            movement_type: 'Reversal Produksi',
            direction: 'OUT',
            quantity: wo.actual_qty,
            unit_cost: wo.hpp_per_cage,
            total_cost: wo.total_production_cost,
            stock_before: currentStock,
            stock_after: newStock,
            reference_type: 'ProductionOrder',
            reference_id: wo.id,
            reference_number: wo.production_number,
            notes: `Reversal hasil produksi WO ${wo.production_number}`,
            
            created_by: userId
          });
        }
      }

      txDb.update('production_orders', wo.id, {
        status: 'Reversed',
        reversal_reason: reason,
        reversed_at: today,
        reversed_by: userId,
        reversal_transaction_id: txId
      });

    });

    if (txResult) {
      return { success: true };
    } else {
      return { success: false, message: 'Transaksi pembatalan digagalkan oleh sistem. Cek apakah stok cukup untuk direverse.' };
    }
  }
};
