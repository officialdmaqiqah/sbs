import { runMockTransaction, generateId } from './db';
import { costingService } from './costing';
import { stockOpnameService } from './stockOpname';
import type { 
  SalesOrder, InventoryReservation, SalesDelivery, 
  InventoryMovement, Product, PackageComponent
} from '../types';

export const salesFulfillmentService = {

  // --- Helpers ---
  getPhysicalStock(txDb: any, itemId: string): number {
    return stockOpnameService.getCurrentStock(txDb, itemId);
  },

  getReservedStock(txDb: any, itemId: string): number {
    const activeReservations = txDb.query('inventory_reservations', (r: any) => r.item_id === itemId && r.status === 'Active');
    return activeReservations.reduce((sum: number, r: any) => sum + r.quantity, 0);
  },

  getAvailableStock(txDb: any, itemId: string): number {
    const physical = this.getPhysicalStock(txDb, itemId);
    const reserved = this.getReservedStock(txDb, itemId);
    return physical - reserved;
  },

  logAudit(txDb: any, entity_type: string, entity_id: string, action: string, notes: string, created_by: string) {
    txDb.insert('audit_logs', {
      entity_type,
      entity_id,
      action,
      notes,
      
      created_by
    });
  },

  // --- Reservation ---
  reserveSalesOrderStock(soId: string, userId: string): { success: boolean, message?: string } {
    let result: any = false;
    // let // // errorMessage = "";

    result = runMockTransaction((txDb): any => {
      const so = txDb.getById<SalesOrder>('sales_orders', soId);
      if (!so) throw new Error('Sales Order tidak ditemukan');
      if (so.status !== 'Confirmed' && so.status !== 'Production') throw new Error(`Status tidak valid untuk reservasi: ${so.status}`);

      const itemsToReserve: { item_id: string, qty: number }[] = [];

      if (so.order_type === 'Produk') {
        const product = txDb.getById<Product>('products', so.item_id);
        if (product?.inventory_item_id && product.stock_tracked) {
          itemsToReserve.push({ item_id: product.inventory_item_id, qty: so.qty});
        }
      } else if (so.order_type === 'Paket') {
        const components = txDb.query<PackageComponent>('package_components', (c: any) => c.package_id === so.item_id && c.required);
        if (components.length === 0) throw new Error('Mapping inventory komponen paket belum lengkap.');
        for (const comp of components) {
          itemsToReserve.push({ item_id: comp.item_id, qty: comp.quantity_per_package * so.qty });
        }
      }

      if (itemsToReserve.length === 0) {
        // No stock tracked items, skip reservation
        txDb.update('sales_orders', soId, { status: 'Ready to Deliver' });
        return;
      }

      let allFullyReserved = true;

      for (const item of itemsToReserve) {
        // Check existing reservation
        const existingRes = txDb.query<InventoryReservation>('inventory_reservations', (r: any) => r.sales_order_id === so.id && r.item_id === item.item_id && r.status === 'Active');
        const alreadyReservedQty = existingRes.reduce((sum: number, r: any) => sum + r.quantity, 0);
        
        const qtyNeeded = item.qty - alreadyReservedQty;
        if (qtyNeeded <= 0) continue; // Already fully reserved

        const available = this.getAvailableStock(txDb, item.item_id);
        const qtyToReserve = Math.min(qtyNeeded, available);

        if (qtyToReserve > 0) {
          txDb.insert<InventoryReservation>('inventory_reservations', {
            project_id: so.project_id,
            sales_order_id: so.id,
            item_id: item.item_id,
            quantity: qtyToReserve,
            status: 'Active',
            reserved_at: new Date().toISOString(),
            reserved_by: userId
          });
        }

        if (qtyToReserve < qtyNeeded) {
          allFullyReserved = false;
        }
      }

      const newStatus = allFullyReserved ? 'Stock Reserved' : 'Production';
      txDb.update('sales_orders', soId, { status: newStatus });
      this.logAudit(txDb, 'SalesOrder', so.id, 'Reserve', `Reservasi stok. Status: ${newStatus}`, userId);
    });

    return result ? { success: true } : { success: false, message: 'Transaksi digagalkan oleh sistem' };
  },

  releaseSalesOrderReservation(soId: string, userId: string): { success: boolean, message?: string } {
    let result: any = false;
    result = runMockTransaction((txDb): any => {
      const reservations = txDb.query<InventoryReservation>('inventory_reservations', (r: any) => r.sales_order_id === soId && r.status === 'Active');
      for (const res of reservations) {
        txDb.update('inventory_reservations', res.id, {
          status: 'Released',
          released_at: new Date().toISOString()});
      }
      
      const so = txDb.getById<SalesOrder>('sales_orders', soId);
      if (so && so.status === 'Stock Reserved') {
        txDb.update('sales_orders', soId, { status: 'Confirmed' });
      }

      this.logAudit(txDb, 'SalesOrder', soId, 'Release Reservation', 'Reservasi stok dilepas', userId);
    });
    return result ? { success: true } : { success: false, message: 'Gagal melepas reservasi' };
  },

  // --- Delivery Order ---
  createSalesDelivery(soId: string, scheduledDate: string, driver: string, userId: string): { success: boolean, message?: string } {
    let result: any = false;
    result = runMockTransaction((txDb): any => {
      const so = txDb.getById<SalesOrder>('sales_orders', soId);
      if (!so) throw new Error('SO tidak ditemukan');

      const reservations = txDb.query<InventoryReservation>('inventory_reservations', (r: any) => r.sales_order_id === soId && r.status === 'Active');
      if (reservations.length === 0) throw new Error('Tidak ada reservasi aktif untuk dikirim');

      const count = txDb.getAll('sales_deliveries').length + 1;
      const doNum = `DO-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(count).padStart(3,'0')}`;

      const delivery = txDb.insert<SalesDelivery>('sales_deliveries', {
        delivery_number: doNum,
        sales_order_id: so.id,
        project_id: so.project_id,
        customer_name: so.customer_name,
        customer_phone: so.customer_phone,
        customer_address: so.customer_address,
        scheduled_date: scheduledDate,
        driver,
        status: 'Scheduled',
        finance_status: 'Invoice Eligible',
        total_hpp: 0});

      for (const res of reservations) {
        txDb.insert<any>('sales_delivery_items', {
          sales_delivery_id: delivery.id,
          sales_order_id: so.id,
          inventory_item_id: res.item_id,
          qty_order: res.quantity,
          qty_reserved: res.quantity,
          qty_picked: 0,
          qty_delivered: 0,
          qty_returned: 0,
          unit: 'Pcs', // mock unit
          unit_hpp: 0
        });
      }

      txDb.update('sales_orders', soId, { status: 'Ready to Deliver' });
      this.logAudit(txDb, 'SalesDelivery', delivery.id, 'Create', 'Delivery Order dibuat', userId);
    });

    return result ? { success: true } : { success: false, message: 'Gagal membuat DO' };
  },

  pickAndLoadDelivery(doId: string, itemsPicked: { itemId: string, qty: number }[], userId: string): { success: boolean, message?: string } {
    let result: any = false;
    result = runMockTransaction((txDb): any => {
      const delivery = txDb.getById<SalesDelivery>('sales_deliveries', doId);
      if (!delivery) throw new Error('DO tidak ditemukan');
      if (delivery.status !== 'Scheduled' && delivery.status !== 'Picking') throw new Error('Status tidak valid');

      const doItems = txDb.query<any>('sales_delivery_items', (i: any) => i.sales_delivery_id === doId);
      let allPicked = true;

      for (const input of itemsPicked) {
        const item = doItems.find(i => i.inventory_item_id === input.itemId);
        if (!item) throw new Error(`Item ${input.itemId} tidak ada di DO ini`);
        if (input.qty > item.qty_reserved) throw new Error(`Qty picked melebihi reserved untuk item ${input.itemId}`);
        
        txDb.update('sales_delivery_items', item.id, { qty_picked: input.qty});
        if (input.qty < item.qty_reserved) allPicked = false;
      }

      txDb.update('sales_deliveries', doId, {
        status: allPicked ? 'Loaded' : 'Picking',
        picked_at: new Date().toISOString(),
        picked_by: userId,
        loaded_at: allPicked ? new Date().toISOString() : undefined,
        loaded_by: allPicked ? userId : undefined
      });
      
      this.logAudit(txDb, 'SalesDelivery', doId, 'Pick/Load', `Barang di-pick/load. Status: ${allPicked ? 'Loaded' : 'Picking'}`, userId);
    });

    return result ? { success: true } : { success: false, message: 'Gagal pick/load' };
  },

  dispatchDelivery(doId: string, userId: string): { success: boolean, message?: string } {
    let result: any = false;
    result = runMockTransaction((txDb): any => {
      const delivery = txDb.getById<SalesDelivery>('sales_deliveries', doId);
      if (!delivery) throw new Error('DO tidak ditemukan');
      if (delivery.status !== 'Loaded') throw new Error('DO belum Loaded');
      if (delivery.dispatch_transaction_id) throw new Error('DO sudah didispatch');

      const so = txDb.getById<SalesOrder>('sales_orders', delivery.sales_order_id);
      if (!so) throw new Error('SO tidak ditemukan');

      const doItems = txDb.query<any>('sales_delivery_items', (i: any) => i.sales_delivery_id === doId);
      const txId = generateId();
      let totalHpp = 0;

      for (const item of doItems) {
        if (item.qty_picked <= 0) continue;

        // Verify physical stock
        const physicalStock = this.getPhysicalStock(txDb, item.inventory_item_id);
        if (physicalStock < item.qty_picked) throw new Error(`Physical stock tidak cukup untuk didispatch! Item ID: ${item.inventory_item_id}`);

        // Fulfill reservation
        const activeRes = txDb.query<InventoryReservation>('inventory_reservations', (r: any) => r.sales_order_id === so.id && r.item_id === item.inventory_item_id && r.status === 'Active');
        let remainingToFulfill = item.qty_picked;
        for (const res of activeRes) {
          if (remainingToFulfill <= 0) break;
          const fulfillQty = Math.min(res.quantity, remainingToFulfill);
          if (fulfillQty === res.quantity) {
            txDb.update('inventory_reservations', res.id, { status: 'Fulfilled', fulfilled_at: new Date().toISOString()});
          } else {
            // Partial fulfill - split reservation (simplify for now: just update status, or adjust qty)
            // Real system would split it. For mock, let's just mark fulfilled.
            txDb.update('inventory_reservations', res.id, { status: 'Fulfilled', fulfilled_at: new Date().toISOString(), quantity: fulfillQty });
          }
          remainingToFulfill -= fulfillQty;
        }

        const avgCost = costingService.getItemAverageCost(item.inventory_item_id) || 0;
        const itemHpp = avgCost * item.qty_picked;
        totalHpp += itemHpp;

        txDb.insert<InventoryMovement>('inventory_movements', {
          transaction_id: txId,
          project_id: delivery.project_id,
          item_id: item.inventory_item_id,
          movement_type: 'Sales Delivery',
          direction: 'OUT',
          quantity: item.qty_picked,
          unit_cost: avgCost,
          total_cost: itemHpp,
          stock_before: physicalStock,
          stock_after: physicalStock - item.qty_picked,
          reference_type: 'SalesDelivery',
          reference_id: delivery.id,
          reference_number: delivery.delivery_number,
          notes: 'Dispatch Delivery',
          
          created_by: userId
        });

        txDb.update('sales_delivery_items', item.id, { unit_hpp: avgCost });
      }

      txDb.update('sales_deliveries', doId, {
        status: 'In Transit',
        total_hpp: totalHpp,
        dispatched_at: new Date().toISOString(),
        dispatched_by: userId,
        dispatch_transaction_id: txId
      });

      // Update SO margins
      const updatedTotalHpp = (so.total_hpp || 0) + totalHpp;
      const totalOrder = (so.unit_price * so.qty) - (so.discount || 0); // Simplified total
      const grossMargin = totalOrder - updatedTotalHpp;
      const grossMarginPct = totalOrder > 0 ? (grossMargin / totalOrder) * 100 : 0;

      txDb.update('sales_orders', so.id, {
        total_hpp: updatedTotalHpp,
        gross_margin: grossMargin,
        gross_margin_percentage: grossMarginPct
      });

      this.logAudit(txDb, 'SalesDelivery', doId, 'Dispatch', `Barang dikirim (OUT). HPP: ${totalHpp}`, userId);
    });

    return result ? { success: true } : { success: false, message: 'Gagal dispatch delivery' };
  },

  reverseDeliveryDispatch(doId: string, reason: string, userId: string): { success: boolean, message?: string } {
    if (reason.length < 10) return { success: false, message: 'Alasan minimal 10 karakter' };

    let result: any = false;
    result = runMockTransaction((txDb): any => {
      const delivery = txDb.getById<SalesDelivery>('sales_deliveries', doId);
      if (!delivery) throw new Error('DO tidak ditemukan');
      if (delivery.status !== 'In Transit') throw new Error('Hanya DO In Transit yang bisa direverse');
      if (delivery.reversal_transaction_id) throw new Error('DO sudah pernah direverse');

      const so = txDb.getById<SalesOrder>('sales_orders', delivery.sales_order_id);
      
      const movements = txDb.query<InventoryMovement>('inventory_movements', (m: any) => m.reference_id === doId && m.reference_type === 'SalesDelivery' && m.direction === 'OUT');
      const txId = generateId();

      for (const move of movements) {
        const physicalStock = this.getPhysicalStock(txDb, move.item_id);
        
        txDb.insert<InventoryMovement>('inventory_movements', {
          transaction_id: txId,
          project_id: delivery.project_id,
          item_id: move.item_id,
          movement_type: 'Reversal Sales Delivery',
          direction: 'IN',
          quantity: move.quantity,
          unit_cost: move.unit_cost,
          total_cost: move.total_cost,
          stock_before: physicalStock,
          stock_after: physicalStock + move.quantity,
          reference_type: 'SalesDelivery',
          reference_id: delivery.id,
          reference_number: delivery.delivery_number,
          reversal_of_movement_id: move.id,
          notes: `Reversal Dispatch: ${reason}`,
          
          created_by: userId});

        // Re-activate reservation if SO not cancelled
        if (so && so.status !== 'Cancelled') {
          txDb.insert<InventoryReservation>('inventory_reservations', {
            project_id: delivery.project_id,
            sales_order_id: delivery.sales_order_id,
            item_id: move.item_id,
            quantity: move.quantity,
            status: 'Active',
            reserved_at: new Date().toISOString(),
            reserved_by: userId,
            notes: 'Re-activated from Reversal'
          });
        }
      }

      txDb.update('sales_deliveries', doId, {
        status: 'Cancelled', // Or Loaded based on choice, but we'll cancel it for safety
        reversal_transaction_id: txId,
        reversed_at: new Date().toISOString(),
        reversed_by: userId,
        reversal_reason: reason
      });

      if (so) {
        // Rollback HPP
        const newTotalHpp = (so.total_hpp || 0) - delivery.total_hpp;
        const totalOrder = (so.unit_price * so.qty) - (so.discount || 0);
        const grossMargin = totalOrder - newTotalHpp;
        const grossMarginPct = totalOrder > 0 ? (grossMargin / totalOrder) * 100 : 0;

        txDb.update('sales_orders', so.id, {
          total_hpp: newTotalHpp,
          gross_margin: grossMargin,
          gross_margin_percentage: grossMarginPct,
          status: 'Confirmed' // Revert to confirmed so they can re-reserve or re-deliver
        });
      }

      this.logAudit(txDb, 'SalesDelivery', doId, 'Reverse', `Reversal Dispatch: ${reason}`, userId);
    });

    return result ? { success: true } : { success: false, message: 'Gagal reverse' };
  },

  confirmDeliveryReceipt(doId: string, itemsReceived: { itemId: string, received: number, rejected: number, condition: string }[], userId: string): { success: boolean, message?: string } {
    let result: any = false;
    result = runMockTransaction((txDb): any => {
      const delivery = txDb.getById<SalesDelivery>('sales_deliveries', doId);
      if (!delivery) throw new Error('DO tidak ditemukan');
      if (delivery.status !== 'In Transit') throw new Error('Hanya DO In Transit yang bisa diterima');

      const doItems = txDb.query<any>('sales_delivery_items', (i: any) => i.sales_delivery_id === doId);
      let allFull = true;

      for (const input of itemsReceived) {
        const item = doItems.find(i => i.inventory_item_id === input.itemId);
        if (!item) throw new Error(`Item ${input.itemId} tidak ada di DO ini`);
        if (input.received + input.rejected > item.qty_picked) throw new Error('Qty total melebihi qty picked');

        txDb.update('sales_delivery_items', item.id, { 
          qty_delivered: input.received,
          qty_returned: input.rejected,
          condition_notes: input.condition});

        if (input.received < item.qty_picked) allFull = false;

        // Process Return if any rejected
        if (input.rejected > 0) {
          const retId = generateId();
          const isRusak = ['Rusak', 'Ayam Mati'].includes(input.condition);
          const decision = isRusak ? 'Write-off' : 'Masuk stok kembali';

          txDb.insert<any>('return_deliveries', {
            id: retId,
            return_number: `RET-${delivery.delivery_number}-${item.inventory_item_id}`,
            sales_delivery_id: doId,
            item_id: item.inventory_item_id,
            qty_returned: input.rejected,
            reason: input.condition,
            condition: input.condition as any,
            decision: decision,
            return_date: new Date().toISOString(),
            pic: userId,
            
          });

          // Process Return Movement
          const physicalStock = this.getPhysicalStock(txDb, item.inventory_item_id);
          const moveType = isRusak ? (input.condition === 'Ayam Mati' ? 'Ayam Mati dalam Distribusi' : 'Barang Rusak dalam Distribusi') : 'Sales Return';
          // // const direction = isRusak ? 'OUT' : 'IN'; // Kerugian = OUT (technically it's already OUT during dispatch. So if it's broken, it doesn't return to inventory. Wait!
          // Actually, during dispatch it was OUT. If it returns and is good, we IN it.
          // If it returns and is broken, it stays OUT physically from the warehouse.
          // But we want to record the loss specifically. The easiest is to IN it as Return, then immediately OUT it as Rusak. Or just do nothing to stock and create a loss record.
          // The prompt says: "Jika rusak/mati: Jangan masuk stok tersedia. Buat movement: Barang Rusak. Catat nilai kerugian."
          // So if we just do an IN then an OUT, it perfectly audits it. Or just don't IN it, just leave it OUT.
          // Let's do IN (Sales Return) then OUT (Barang Rusak) for perfect audit trail.
          
          const txId = generateId();
          // 1. IN (Return)
          txDb.insert<InventoryMovement>('inventory_movements', {
            transaction_id: txId,
            project_id: delivery.project_id,
            item_id: item.inventory_item_id,
            movement_type: 'Sales Return',
            direction: 'IN',
            quantity: input.rejected,
            unit_cost: item.unit_hpp,
            total_cost: item.unit_hpp * input.rejected,
            stock_before: physicalStock,
            stock_after: physicalStock + input.rejected,
            reference_type: 'ReturnDelivery',
            reference_id: retId,
            reference_number: `RET-${delivery.delivery_number}`,
            notes: `Retur dari DO ${delivery.delivery_number}`,
            
            created_by: userId
          });

          // 2. OUT (Kerugian) jika rusak
          if (isRusak) {
            txDb.insert<InventoryMovement>('inventory_movements', {
              transaction_id: txId,
              project_id: delivery.project_id,
              item_id: item.inventory_item_id,
              movement_type: moveType as any,
              direction: 'OUT',
              quantity: input.rejected,
              unit_cost: item.unit_hpp,
              total_cost: item.unit_hpp * input.rejected,
              stock_before: physicalStock + input.rejected,
              stock_after: physicalStock, // goes back to original
              reference_type: 'ReturnDelivery',
              reference_id: retId,
              reference_number: `RET-${delivery.delivery_number}`,
              notes: `Barang rusak/mati saat distribusi DO ${delivery.delivery_number}`,
              
              created_by: userId
            });
          }
        }
      }

      txDb.update('sales_deliveries', doId, {
        status: allFull ? 'Delivered' : 'Partially Delivered',
        delivered_at: new Date().toISOString(),
        received_by_customer: 'Customer'
      });

      // Update SO status if all delivered
      const so = txDb.getById<SalesOrder>('sales_orders', delivery.sales_order_id);
      if (so) {
        txDb.update('sales_orders', so.id, { status: allFull ? 'Delivered' : 'Partially Delivered' });
      }

      this.logAudit(txDb, 'SalesDelivery', doId, 'Delivered', `Diterima customer. Status: ${allFull ? 'Delivered' : 'Partially Delivered'}`, userId);
    });

    return result ? { success: true } : { success: false, message: 'Gagal konfirmasi penerimaan' };
  }
};
