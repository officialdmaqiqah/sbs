import type { SupplierPayment } from '../../types';

export interface CreateSupplierPaymentInput {
  organization_id: string;
  supplier_bill_id: string;
  cash_bank_account_id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  reference?: string;
  notes?: string;
  transaction_id?: string;
}

export interface SupplierPaymentRepository {
  listSupplierPayments(filters?: { status?: string, supplier_id?: string }): Promise<SupplierPayment[]>;
  getSupplierPaymentById(id: string): Promise<SupplierPayment | null>;
  createSupplierPayment(input: CreateSupplierPaymentInput): Promise<{
    supplier_payment_id: string;
    payment_number: string;
    bill_status: string;
    outstanding_amount: number;
    journal_entry_id: string;
  }>;
  reverseSupplierPayment(id: string, reason: string): Promise<boolean>;
}
