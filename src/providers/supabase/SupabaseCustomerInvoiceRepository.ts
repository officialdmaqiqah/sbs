import { supabase } from '../../lib/supabase';
import type { CustomerInvoiceRepository } from '../interfaces/CustomerInvoiceRepository';
import type { CustomerInvoice } from '../../types';
import { handleSupabaseError } from './utils';

export class SupabaseCustomerInvoiceRepository implements CustomerInvoiceRepository {
  async getInvoiceById(id: string): Promise<CustomerInvoice | null> {
    const { data, error } = await supabase.from('customer_invoices').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      handleSupabaseError(error);
    }
    return {
      ...data,
      outstanding_amount: Number(data.total_amount) - Number(data.paid_amount)
    };
  }

  async listInvoices(filters?: Record<string, any>): Promise<CustomerInvoice[]> {
    let query = supabase.from('customer_invoices').select('*').order('created_at', { ascending: false });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) query = query.eq(key, value);
      });
    }
    
    const { data, error } = await query;
    if (error) handleSupabaseError(error);
    
    return (data || []).map((inv: any) => ({
      ...inv,
      outstanding_amount: Number(inv.total_amount) - Number(inv.paid_amount)
    }));
  }

  async createInvoice(data: any): Promise<CustomerInvoice> {
    const { data: newInvoice, error } = await supabase.from('customer_invoices').insert([data]).select().single();
    if (error) handleSupabaseError(error);
    return {
      ...newInvoice,
      outstanding_amount: Number(newInvoice.total_amount) - Number(newInvoice.paid_amount)
    };
  }

  async updateInvoice(id: string, data: any): Promise<CustomerInvoice> {
    const { data: updated, error } = await supabase.from('customer_invoices').update(data).eq('id', id).select().single();
    if (error) handleSupabaseError(error);
    return {
      ...updated,
      outstanding_amount: Number(updated.total_amount) - Number(updated.paid_amount)
    };
  }
}
