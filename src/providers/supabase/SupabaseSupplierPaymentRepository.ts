import { supabase } from '../../lib/supabase';
import type { SupplierPayment } from '../../types';
import type { CreateSupplierPaymentInput, SupplierPaymentRepository } from '../interfaces/SupplierPaymentRepository';

export class SupabaseSupplierPaymentRepository implements SupplierPaymentRepository {
  async listSupplierPayments(filters?: { status?: string; supplier_id?: string; }): Promise<SupplierPayment[]> {
    let query = supabase.from('supplier_payments').select(`
      *,
      supplier:suppliers(name)
    `).order('payment_date', { ascending: false });
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data.map(d => ({
      ...d,
      supplier_name: d.supplier?.name
    }));
  }

  async getSupplierPaymentById(id: string): Promise<SupplierPayment | null> {
    const { data, error } = await supabase.from('supplier_payments')
      .select(`
        *,
        supplier:suppliers(name)
      `)
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return {
      ...data,
      supplier_name: data.supplier?.name
    };
  }

  async createSupplierPayment(input: CreateSupplierPaymentInput): Promise<{ supplier_payment_id: string; payment_number: string; bill_status: string; outstanding_amount: number; journal_entry_id: string; }> {
    const { data, error } = await supabase.rpc('pay_supplier_bill', {
      p_organization_id: input.organization_id,
      p_supplier_bill_id: input.supplier_bill_id,
      p_cash_bank_account_id: input.cash_bank_account_id,
      p_payment_number: input.payment_number,
      p_payment_date: input.payment_date,
      p_amount: input.amount,
      p_reference: input.reference || null,
      p_notes: input.notes || null,
      p_transaction_id: input.transaction_id || null
    });

    if (error) throw error;
    return data;
  }

  async reverseSupplierPayment(id: string, reason: string): Promise<boolean> {
    console.log('Reversing payment', id, reason);
    throw new Error('Not implemented for Phase 3C yet');
  }
}
