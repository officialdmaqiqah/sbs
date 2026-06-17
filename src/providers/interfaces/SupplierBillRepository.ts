import type { SupplierBill } from '../../types';

export interface CreateSupplierBillFromReceiptInput {
  organization_id: string;
  transaction_id: string;
  purchase_receipt_id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  supplier_id: string;
  project_id?: string;
  notes?: string;
  created_by: string;
}

export interface SupplierBillRepository {
  listSupplierBills(filters?: Record<string, any>): Promise<SupplierBill[]>;
  getSupplierBillById(id: string): Promise<SupplierBill | null>;
  createSupplierBillFromReceipt(input: CreateSupplierBillFromReceiptInput): Promise<any>;
}
