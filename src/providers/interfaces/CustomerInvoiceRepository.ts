export interface CustomerInvoiceRepository {
  listInvoices(filters?: Record<string, any>): Promise<any[]>;
  getInvoiceById(id: string): Promise<any | null>;
  createInvoice(data: any): Promise<any>;
  updateInvoice(id: string, data: any): Promise<any>;
  // updateInvoiceStatus handled inside updateInvoice or a specific method if needed
}
