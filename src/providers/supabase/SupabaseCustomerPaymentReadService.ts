import { supabase } from '../../lib/supabase';
import type { CustomerPaymentReadService } from '../interfaces/CustomerPaymentReadService';
import { handleSupabaseError } from './utils';

export class SupabaseCustomerPaymentReadService implements CustomerPaymentReadService {
  async getPayableInvoices(): Promise<any[]> {
    const { data, error } = await supabase
      .from('customer_invoices')
      .select(`
        *,
        customer:customers(*)
      `)
      .in('status', ['Posted', 'Partially Paid', 'Open'])
      .order('due_date', { ascending: true });

    if (error) handleSupabaseError(error);
    return data || [];
  }

  async getPaymentWithDetails(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('customer_payments')
      .select(`
        *,
        customer:customers(*),
        cash_bank:cash_bank_accounts(*),
        allocations:customer_payment_allocations(
          *,
          invoice:customer_invoices(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      handleSupabaseError(error);
    }
    return data;
  }
}
