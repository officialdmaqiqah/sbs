import { arApService } from '../../services/arApService';
import { db } from '../../services/db';
import type { SupplierPayment } from '../../types';
import type { CreateSupplierPaymentInput, SupplierPaymentRepository } from '../interfaces/SupplierPaymentRepository';

export class LocalSupplierPaymentRepository implements SupplierPaymentRepository {
  async listSupplierPayments(filters?: { status?: string; supplier_id?: string; }): Promise<SupplierPayment[]> {
    let payments = arApService.getSupplierPayments();
    if (filters?.status) payments = payments.filter(p => p.status === filters.status);
    if (filters?.supplier_id) payments = payments.filter(p => p.supplier_id === filters.supplier_id);
    
    return payments.map(p => {
      const supplier = db.getById('suppliers', p.supplier_id) as any;
      return { ...p, supplier_name: supplier?.name } as any;
    });
  }

  async getSupplierPaymentById(id: string): Promise<SupplierPayment | null> {
    const payment = db.getById('supplier_payments', id) as SupplierPayment | undefined;
    if (!payment) return null;
    const supplier = db.getById('suppliers', payment.supplier_id) as any;
    return { ...payment, supplier_name: supplier?.name } as any;
  }

  async createSupplierPayment(input: CreateSupplierPaymentInput): Promise<{ supplier_payment_id: string; payment_number: string; bill_status: string; outstanding_amount: number; journal_entry_id: string; }> {
    const bill = db.getById('supplier_bills', input.supplier_bill_id) as any;
    if (!bill) throw new Error('Bill not found');

    const payment = arApService.receiveSupplierPayment({
      organization_id: input.organization_id,
      supplier_id: bill.supplier_id,
      cash_bank_account_id: input.cash_bank_account_id,
      payment_date: input.payment_date,
      total_amount: input.amount,
      allocated_amount: input.amount,
      transaction_id: input.transaction_id,
      notes: input.notes,
      reference: input.reference,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any, [{ supplier_bill_id: input.supplier_bill_id, amount: input.amount }], 'local-user');

    const updatedBill = db.getById('supplier_bills', input.supplier_bill_id) as any;

    return {
      supplier_payment_id: payment.id,
      payment_number: payment.payment_number,
      bill_status: updatedBill.status,
      outstanding_amount: updatedBill.outstanding_amount,
      journal_entry_id: payment.journal_entry_id || ''
    };
  }

  async reverseSupplierPayment(id: string, reason: string): Promise<boolean> {
    arApService.reverseSupplierPayment(id, 'local-user', reason);
    return true;
  }
}
