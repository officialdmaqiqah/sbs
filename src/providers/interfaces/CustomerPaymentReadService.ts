export interface CustomerPaymentReadService {
  getPayableInvoices(): Promise<any[]>;
  getPaymentWithDetails(id: string): Promise<any | null>;
}
