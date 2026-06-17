export interface BillEligibleReceipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  po_id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  project_id: string;
  project_name: string;
  total_amount: number;
  finance_status: string;
}

export interface SupplierBillReadService {
  listBillEligibleReceipts(filters?: Record<string, any>): Promise<BillEligibleReceipt[]>;
  getSupplierBillOutstanding(billId: string): Promise<number>;
  listSupplierBillLines(billId: string): Promise<any[]>;
}
