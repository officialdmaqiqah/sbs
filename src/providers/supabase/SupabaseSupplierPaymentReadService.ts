import { supabase } from '../../lib/supabase';
import type { PayableSupplierBill, SupplierPaymentAllocation, SupplierPaymentReadService } from '../interfaces/SupplierPaymentReadService';

export class SupabaseSupplierPaymentReadService implements SupplierPaymentReadService {
  async listPayableSupplierBills(filters?: { supplier_id?: string; }): Promise<PayableSupplierBill[]> {
    let query = supabase.from('supplier_bills')
      .select(`
        id,
        bill_number,
        supplier_id,
        supplier:suppliers(name),
        bill_date,
        due_date,
        total_amount,
        outstanding_amount,
        status
      `)
      .in('status', ['Open', 'Posted', 'Partially Paid'])
      .gt('outstanding_amount', 0)
      .order('due_date', { ascending: true });
      
    if (filters?.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id);
    }

    const { data, error } = await query as any;
    if (error) throw error;

    return data.map((d: any) => ({
      ...d,
      supplier_name: d.supplier?.name
    })) as any;
  }

  async getSupplierBillOutstanding(billId: string): Promise<number> {
    const { data, error } = await supabase.from('supplier_bills')
      .select('outstanding_amount')
      .eq('id', billId)
      .single();
      
    if (error) throw error;
    return data.outstanding_amount;
  }

  async listSupplierPaymentAllocations(paymentId: string): Promise<SupplierPaymentAllocation[]> {
    const { data, error } = await supabase.from('supplier_payment_allocations')
      .select('*')
      .eq('payment_id', paymentId);
      
    if (error) throw error;
    return data;
  }

  async getSupplierAPSummary(filters?: { as_of_date?: string; }): Promise<{ total_payable: number; total_overdue: number; }> {
    // Basic implementation
    const { data, error } = await supabase.from('supplier_bills')
      .select('outstanding_amount, due_date')
      .in('status', ['Open', 'Posted', 'Partially Paid'])
      .gt('outstanding_amount', 0);
      
    if (error) throw error;
    
    let total_payable = 0;
    let total_overdue = 0;
    
    const now = filters?.as_of_date ? new Date(filters.as_of_date) : new Date();
    
    data.forEach(d => {
      total_payable += Number(d.outstanding_amount);
      if (new Date(d.due_date) < now) {
        total_overdue += Number(d.outstanding_amount);
      }
    });
    
    return { total_payable, total_overdue };
  }
}
