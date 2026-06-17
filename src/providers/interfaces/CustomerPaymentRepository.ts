export interface CustomerPaymentRepository {
  listPayments(filters?: Record<string, any>): Promise<any[]>;
  getPaymentById(id: string): Promise<any | null>;
  createPayment(data: any): Promise<any>;
}
