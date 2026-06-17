import type { PurchaseReadService } from '../interfaces/PurchaseReadService';
import type { PurchaseOrder } from '../../types';
import { db } from '../../services/db';

export class LocalPurchaseReadService implements PurchaseReadService {
  async listReceivablePurchaseOrders(): Promise<PurchaseOrder[]> {
    const pos = (db as any).getAll('purchase_orders');
    return pos.filter((po: any) => ['Approved', 'Ordered', 'Partially Received', 'Draft'].includes(po.status));
  }

  async getPurchaseOrderReceiptStatus(poId: string): Promise<any> {
    return (db as any).getAll('purchase_order_items').filter((i: any) => i.po_id === poId);
  }

  async listReceiptItems(receiptId: string): Promise<any[]> {
    const items = (db as any).getAll('purchase_receipt_items').filter((i: any) => i.receipt_id === receiptId);
    return items.map((i: any) => ({
      ...i,
      item: (db as any).getById('items', i.item_id) || {},
      po_item: (db as any).getById('purchase_order_items', i.po_item_id) || {}
    }));
  }
}
