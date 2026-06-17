import type { PurchaseReceiptRepository } from '../interfaces/PurchaseReceiptRepository';
import { supabase } from '../../lib/supabase'; // Used for transaction_id

export class SupabasePurchaseReceiptRepository implements PurchaseReceiptRepository {
  async listPurchaseReceipts(filters?: Record<string, any>): Promise<any[]> {
    let query = supabase.from('purchase_receipts').select(`
      *,
      po:purchase_orders(po_number),
      location:inventory_locations(name)
    `).order('created_at', { ascending: false });
    
    if (filters?.finance_status) {
      query = query.eq('finance_status', filters.finance_status);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getPurchaseReceiptById(id: string): Promise<any | null> {
    const { data, error } = await supabase.from('purchase_receipts').select(`
      *,
      items:purchase_receipt_items(*, po_item:purchase_order_items(*, item:items(*)))
    `).eq('id', id).maybeSingle();
    
    if (error) throw error;
    return data;
  }

  async createPurchaseReceiptDraft(): Promise<any> {
    throw new Error('Method not implemented for Supabase mode (Draft receipts are not supported yet).');
  }

  async postPurchaseReceipt(input: any): Promise<any> {
    // Input should match what receive_purchase_order RPC expects
    /*
      p_organization_id UUID,
      p_purchase_order_id UUID,
      p_receipt_number VARCHAR,
      p_receipt_date DATE,
      p_warehouse_location_id UUID,
      p_project_id UUID,
      p_supplier_id UUID,
      p_items JSONB,
      p_reference VARCHAR
      p_notes TEXT
      p_transaction_id UUID
    */
    
    const transaction_id = input.transaction_id || crypto.randomUUID();
    
    const { data, error } = await supabase.rpc('receive_purchase_order', {
      p_organization_id: input.organization_id,
      p_purchase_order_id: input.po_id,
      p_receipt_number: input.receipt_number,
      p_receipt_date: input.receipt_date,
      p_warehouse_location_id: input.location_id,
      p_project_id: input.project_id,
      p_supplier_id: input.supplier_id,
      p_items: input.items, // Ensure this maps correctly
      p_reference: input.reference || null,
      p_notes: input.notes || null,
      p_transaction_id: transaction_id
    });
    
    if (error) throw error;
    return data;
  }
}
