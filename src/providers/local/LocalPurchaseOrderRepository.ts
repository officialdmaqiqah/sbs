import type { PurchaseOrderRepository } from '../interfaces/PurchaseOrderRepository';
import type { PurchaseOrder } from '../../types';
import { db } from '../../services/db';

export class LocalPurchaseOrderRepository implements PurchaseOrderRepository {
  async listPurchaseOrders(filters?: Record<string, any>): Promise<PurchaseOrder[]> {
    let pos = (db as any).getAll('purchase_orders');
    if (filters?.status) {
      pos = pos.filter((po: any) => po.status === filters.status);
    }
    return pos;
  }

  async getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
    const po = (db as any).getById('purchase_orders', id);
    if (!po) return null;
    const items = (db as any).getAll('purchase_order_items').filter((i: any) => i.po_id === id);
    return { ...po, items };
  }

  async createPurchaseOrder(input: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const { items, ...poData } = input as any;
    
    const poNumber = poData.po_number || `PO-${Date.now()}`;
    
    const po = (db as any).insert('purchase_orders', {
      project_id: poData.project_id,
      supplier_id: poData.supplier_id,
      po_number: poNumber,
      date: poData.date || new Date().toISOString().split('T')[0],
      status: poData.status || 'Draft',
      total_amount: poData.total_amount || 0,
      notes: poData.notes || '',
      ...poData
    });

    if (items && items.length > 0) {
      for (const item of items) {
        (db as any).insert('purchase_order_items', {
          po_id: po.id,
          item_id: item.item_id,
          quantity: item.qty_ordered || item.quantity,
          unit_price: item.unit_price || 0,
          total_price: item.subtotal || 0,
          received_quantity: 0
        });
      }
    }
    return po;
  }

  async updatePurchaseOrder(id: string, input: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return (db as any).update('purchase_orders', id, input);
  }
}
