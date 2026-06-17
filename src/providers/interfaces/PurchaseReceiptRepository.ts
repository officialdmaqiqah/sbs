export interface PurchaseReceiptRepository {
  listPurchaseReceipts(filters?: Record<string, any>): Promise<any[]>;
  getPurchaseReceiptById(id: string): Promise<any | null>;
  createPurchaseReceiptDraft(input: any): Promise<any>;
  postPurchaseReceipt(input: any): Promise<any>;
}
