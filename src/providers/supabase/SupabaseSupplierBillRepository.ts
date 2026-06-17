import { supabase } from '../../lib/supabase';
import type { SupplierBillRepository, CreateSupplierBillFromReceiptInput } from '../interfaces/SupplierBillRepository';
import type { SupplierBill } from '../../types';
import { handleSupabaseError } from './utils';

export class SupabaseSupplierBillRepository implements SupplierBillRepository {
  async getSupplierBillById(id: string): Promise<SupplierBill | null> {
    const { data, error } = await supabase.from('supplier_bills').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      handleSupabaseError(error);
    }
    return data;
  }

  async listSupplierBills(filters?: Record<string, any>): Promise<SupplierBill[]> {
    let query = supabase.from('supplier_bills').select('*').order('created_at', { ascending: false });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) query = query.eq(key, value);
      });
    }
    
    const { data, error } = await query;
    if (error) handleSupabaseError(error);
    
    return data || [];
  }

  async createSupplierBillFromReceipt(input: CreateSupplierBillFromReceiptInput): Promise<SupplierBill> {
    const payload = {
      p_organization_id: input.organization_id,
      p_transaction_id: input.transaction_id,
      p_purchase_receipt_id: input.purchase_receipt_id,
      p_bill_number: input.bill_number,
      p_bill_date: input.bill_date,
      p_due_date: input.due_date,
      p_supplier_id: input.supplier_id,
      p_project_id: input.project_id,
      p_notes: input.notes || null,
      p_created_by: input.created_by
    };

    const { data, error } = await supabase.rpc('create_supplier_bill_from_receipt', payload);

    if (error) handleSupabaseError(error);

    if (!data) {
      throw new Error('Gagal membuat tagihan: tidak ada data yang dikembalikan');
    }

    const newBillId = (data as any).supplier_bill_id;
    const newBill = await this.getSupplierBillById(newBillId);
    if (!newBill) throw new Error('Tagihan berhasil dibuat tetapi tidak dapat dimuat ulang');

    return newBill;
  }
}
