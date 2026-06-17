import { supabase } from '../../lib/supabase';
import type { CustomerPaymentRepository } from '../interfaces/CustomerPaymentRepository';
import type { CustomerPayment } from '../../types';
import { handleSupabaseError } from './utils';

export class SupabaseCustomerPaymentRepository implements CustomerPaymentRepository {
  async getPaymentById(id: string): Promise<CustomerPayment | null> {
    const { data, error } = await supabase.from('customer_payments').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      handleSupabaseError(error);
    }
    return data ? {
      ...data,
      amount: data.total_amount,
      cash_bank_account_id: data.cash_bank_id
    } : null;
  }

  async listPayments(filters?: Record<string, any>): Promise<CustomerPayment[]> {
    let query = supabase.from('customer_payments').select('*').order('created_at', { ascending: false });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) query = query.eq(key, value);
      });
    }
    
    const { data, error } = await query;
    if (error) handleSupabaseError(error);
    
    return (data || []).map((pay: any) => ({
      ...pay,
      amount: pay.total_amount,
      cash_bank_account_id: pay.cash_bank_id
    }));
  }

  async createPayment(input: any): Promise<CustomerPayment> {
    const payload = {
      p_organization_id: input.organization_id,
      p_transaction_id: input.transaction_id,
      p_customer_invoice_id: input.customer_invoice_id,
      p_cash_bank_account_id: input.cash_bank_account_id,
      p_payment_number: input.payment_number,
      p_payment_date: input.payment_date,
      p_amount: input.amount,
      p_reference: input.reference || null,
      p_notes: input.notes || null,
      p_created_by: input.created_by
    };

    const { data, error } = await supabase.rpc('pay_customer_invoice_v3', payload);

    if (error) handleSupabaseError(error);

    const result = data as any;
    console.log('RPC raw data:', data);
    console.log('RPC raw error:', error);
    if (!result || !result.success) {
      throw new Error(result?.message || 'Gagal memproses pembayaran piutang');
    }

    const newPaymentId = result.payment_id;
    const newPayment = await this.getPaymentById(newPaymentId);
    if (!newPayment) throw new Error('Pembayaran berhasil diproses tetapi gagal memuat data');

    return newPayment;
  }
}
