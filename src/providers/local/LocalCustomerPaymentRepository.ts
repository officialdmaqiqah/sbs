import type { CustomerPaymentRepository } from '../interfaces/CustomerPaymentRepository';
import type { CustomerPayment } from '../../types';

export class LocalCustomerPaymentRepository implements CustomerPaymentRepository {
  private repoPayments: any;
  private repoAllocations: any;
  private repoInvoices: any;

  constructor(repoPayments: any, repoAllocations: any, repoInvoices: any) {
    this.repoPayments = repoPayments;
    this.repoAllocations = repoAllocations;
    this.repoInvoices = repoInvoices;
  }

  async getPaymentById(id: string): Promise<CustomerPayment | null> {
    const list = await this.repoPayments.list();
    return list.find((x: any) => x.id === id) || null;
  }

  async listPayments(filters?: Record<string, any>): Promise<CustomerPayment[]> {
    const list = await this.repoPayments.list();
    if (!filters) return list;
    
    return list.filter((item: any) => {
      for (const key in filters) {
        if (item[key] !== filters[key]) return false;
      }
      return true;
    });
  }

  async createPayment(input: any): Promise<CustomerPayment> {
    // Mimic the RPC atomic behavior
    const paymentData = {
      id: crypto.randomUUID(),
      organization_id: input.organization_id,
      customer_id: input.customer_id || input.customer_name,
      cash_bank_id: input.cash_bank_account_id,
      payment_number: input.payment_number,
      payment_date: input.payment_date,
      total_amount: input.amount,
      allocated_amount: input.amount,
      unallocated_amount: 0,
      status: 'Posted',
      transaction_id: crypto.randomUUID(),
      notes: input.notes,
      created_by: input.created_by,
      created_at: new Date().toISOString()
    };
    const newPayment = await this.repoPayments.create(paymentData);

    const allocationData = {
      id: crypto.randomUUID(),
      payment_id: newPayment.id,
      invoice_id: input.customer_invoice_id,
      amount: input.amount,
      created_at: new Date().toISOString()
    };
    await this.repoAllocations.create(allocationData);

    // Update Invoice status
    const invoices = await this.repoInvoices.list();
    const invoice = invoices.find((i: any) => i.id === input.customer_invoice_id);
    if (invoice) {
      const newPaid = (invoice.paid_amount || 0) + input.amount;
      const newStatus = newPaid >= invoice.total_amount ? 'Paid' : 'Partially Paid';
      await this.repoInvoices.update(invoice.id, {
        paid_amount: newPaid,
        status: newStatus,
        updated_at: new Date().toISOString()
      });
    }

    return newPayment;
  }
}
