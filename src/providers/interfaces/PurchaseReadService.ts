import type { PurchaseOrder } from '../../types';

export interface PurchaseReadService {
  listReceivablePurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrderReceiptStatus(poId: string): Promise<any>;
  listReceiptItems(receiptId: string): Promise<any[]>;
}
