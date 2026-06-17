import type { PurchaseOrder } from '../../types';

export interface PurchaseOrderRepository {
  listPurchaseOrders(filters?: Record<string, any>): Promise<PurchaseOrder[]>;
  getPurchaseOrderById(id: string): Promise<PurchaseOrder | null>;
  createPurchaseOrder(input: Partial<PurchaseOrder>): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: string, input: Partial<PurchaseOrder>): Promise<PurchaseOrder>;
}
