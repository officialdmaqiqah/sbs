export interface SalesOrderRepository {
  listSalesOrders(filters?: any): Promise<any[]>;
  getSalesOrderById(id: string): Promise<any | null>;
  createSalesOrder(input: any): Promise<any>;
  updateSalesOrderStatus(id: string, status: string): Promise<void>;
  listDeliveries(filters?: any): Promise<any[]>;
  createDelivery(input: any): Promise<any>;
}
