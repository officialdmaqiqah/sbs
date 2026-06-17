import { db } from '../../services/db';
import type { PayableSupplierBill, SupplierPaymentAllocation, SupplierPaymentReadService } from '../interfaces/SupplierPaymentReadService';

export class LocalSupplierPaymentReadService implements SupplierPaymentReadService {
  async listPayableSupplierBills(filters?: { supplier_id?: string; }): Promise<PayableSupplierBill[]> {
    let bills = db.query('supplier_bills', (b: any) => 
      (b.status === 'Open' || b.status === 'Partially Paid') && b.outstanding_amount > 0
    );
    
    if (filters?.supplier_id) {
      bills = bills.filter((b: any) => b.supplier_id === filters.supplier_id);
    }
    
    // Sort by due_date ascending
    bills.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    return bills.map((b: any) => {
      const supplier = db.getById('suppliers', b.supplier_id) as any;
      return {
        ...b,
        supplier_name: supplier?.name
      };
    });
  }

  async getSupplierBillOutstanding(billId: string): Promise<number> {
    const bill = db.getById('supplier_bills', billId) as any;
    if (!bill) throw new Error('Bill not found');
    return bill.outstanding_amount;
  }

  async listSupplierPaymentAllocations(paymentId: string): Promise<SupplierPaymentAllocation[]> {
    return db.query('payment_allocations', (a: any) => a.payment_id === paymentId).map((a: any) => ({
      id: a.id,
      payment_id: a.payment_id,
      bill_id: a.supplier_bill_id, // map DB schema
      amount: a.allocated_amount
    }));
  }

  async getSupplierAPSummary(filters?: { as_of_date?: string; }): Promise<{ total_payable: number; total_overdue: number; }> {
    const bills = db.query('supplier_bills', (b: any) => 
      (b.status === 'Open' || b.status === 'Partially Paid') && b.outstanding_amount > 0
    );
    
    let total_payable = 0;
    let total_overdue = 0;
    
    const now = filters?.as_of_date ? new Date(filters.as_of_date) : new Date();
    
    bills.forEach((d: any) => {
      total_payable += Number(d.outstanding_amount);
      if (new Date(d.due_date) < now) {
        total_overdue += Number(d.outstanding_amount);
      }
    });
    
    return { total_payable, total_overdue };
  }
}
