import type { PurchaseReceiptRepository } from '../interfaces/PurchaseReceiptRepository';
import { db, runMockTransaction, generateId } from '../../services/db';

export class LocalPurchaseReceiptRepository implements PurchaseReceiptRepository {
  async listPurchaseReceipts(filters?: Record<string, any>): Promise<any[]> {
    let receipts = (db as any).getAll('purchase_receipts');
    if (filters?.finance_status) {
      receipts = receipts.filter((r: any) => r.finance_status === filters.finance_status);
    }
    
    // Join location and po number
    return receipts.map((r: any) => ({
      ...r,
      po: (db as any).getById('purchase_orders', r.po_id) || {},
      location: (db as any).getById('inventory_locations', r.location_id) || {}
    }));
  }

  async getPurchaseReceiptById(id: string): Promise<any | null> {
    const receipt = (db as any).getById('purchase_receipts', id);
    if (!receipt) return null;
    
    const items = (db as any).getAll('purchase_receipt_items').filter((i: any) => i.receipt_id === id).map((i: any) => {
      const poItem = (db as any).getById('purchase_order_items', i.po_item_id) || {};
      const item = (db as any).getById('items', i.item_id) || {};
      return { ...i, po_item: { ...poItem, item } };
    });
    
    return { ...receipt, items };
  }

  async createPurchaseReceiptDraft(): Promise<any> {
    throw new Error('Not implemented');
  }

  async postPurchaseReceipt(input: any): Promise<any> {
    return runMockTransaction((txDb) => {
      const transaction_id = generateId();
      
      const receipt = (txDb as any).insert('purchase_receipts', {
        organization_id: input.organization_id,
        po_id: input.po_id,
        location_id: input.location_id,
        receipt_number: input.receipt_number,
        receipt_date: input.receipt_date,
        status: 'Posted',
        finance_status: 'Bill Eligible',
        transaction_id,
        notes: input.notes
      });
      
      let allFullyReceived = true;
      let anyReceived = false;
      const poItems = (txDb as any).getAll('purchase_order_items').filter((i: any) => i.po_id === input.po_id);
      
      for (const itemInput of input.items) {
        if (itemInput.quantity_received <= 0) throw new Error('Quantity must be greater than 0');
        
        const poItem = poItems.find((i: any) => i.id === itemInput.po_item_id);
        if (!poItem) throw new Error('PO Item not found');
        
        const newReceived = (poItem.received_quantity || 0) + itemInput.quantity_received;
        if (newReceived > poItem.quantity) throw new Error('Jumlah terima melebihi sisa PO');
        
        (txDb as any).insert('purchase_receipt_items', {
          receipt_id: (receipt as any).id,
          po_item_id: itemInput.po_item_id,
          item_id: itemInput.item_id,
          quantity: itemInput.quantity_received
        });
        
        // Update PO Item
        (txDb as any).update('purchase_order_items', (poItem as any).id, { received_quantity: newReceived });
        
        // Create Inventory Movement
        const balances = (txDb as any).getAll('inventory_balances');
        let balance = balances.find((b: any) => b.item_id === itemInput.item_id && b.location_id === input.location_id);
        let stock_before = 0;
        if (balance) {
          stock_before = balance.physical_quantity;
          (txDb as any).update('inventory_balances', balance.id, { physical_quantity: stock_before + itemInput.quantity_received });
        } else {
          balance = (txDb as any).insert('inventory_balances', {
            organization_id: input.organization_id,
            project_id: input.project_id,
            location_id: input.location_id,
            item_id: itemInput.item_id,
            physical_quantity: itemInput.quantity_received,
            reserved_quantity: 0
          });
        }
        
        (txDb as any).insert('inventory_movements', {
          organization_id: input.organization_id,
          project_id: input.project_id,
          location_id: input.location_id,
          item_id: itemInput.item_id,
          movement_date: input.receipt_date,
          movement_type: 'Purchase Receipt',
          reference_type: 'Purchase Receipt',
          reference_id: (receipt as any).id,
          reference_number: input.receipt_number,
          direction: 'IN',
          quantity: itemInput.quantity_received,
          unit_cost: itemInput.unit_cost,
          stock_before,
          stock_after: stock_before + itemInput.quantity_received,
          transaction_id
        });
      }
      
      const updatedPoItems = (txDb as any).getAll('purchase_order_items').filter((i: any) => i.po_id === input.po_id);
      for (const pi of updatedPoItems) {
        if ((pi as any).received_quantity < (pi as any).quantity) allFullyReceived = false;
        if ((pi as any).received_quantity > 0) anyReceived = true;
      }
      
      let poStatus = 'Ordered';
      if (allFullyReceived) poStatus = 'Fully Received';
      else if (anyReceived) poStatus = 'Partially Received';
      
      (txDb as any).update('purchase_orders', input.po_id, { status: poStatus });
      
      return receipt;
    });
  }
}
