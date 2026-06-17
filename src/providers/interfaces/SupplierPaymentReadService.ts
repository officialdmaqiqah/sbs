export interface PayableSupplierBill {
  id: string;
  bill_number: string;
  supplier_id: string;
  supplier_name: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  outstanding_amount: number;
  status: string;
}

export interface SupplierPaymentAllocation {
  id: string;
  payment_id: string;
  bill_id: string;
  amount: number;
}

export interface SupplierPaymentReadService {
  listPayableSupplierBills(filters?: { supplier_id?: string }): Promise<PayableSupplierBill[]>;
  getSupplierBillOutstanding(billId: string): Promise<number>;
  listSupplierPaymentAllocations(paymentId: string): Promise<SupplierPaymentAllocation[]>;
  getSupplierAPSummary(filters?: { as_of_date?: string }): Promise<{
    total_payable: number;
    total_overdue: number;
  }>;
}
