import type { PurchaseOrderRepository } from '../interfaces/PurchaseOrderRepository';
import type { PurchaseOrder } from '../../types';
import { supabase } from '../../lib/supabase';

export class SupabasePurchaseOrderRepository implements PurchaseOrderRepository {
  async listPurchaseOrders(filters?: Record<string, any>): Promise<PurchaseOrder[]> {
    let query = supabase.from('purchase_orders').select(`
      *,
      supplier:suppliers(name),
      project:projects(name)
    `).order('created_at', { ascending: false });
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data as any;
  }

  async getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
    const { data, error } = await supabase.from('purchase_orders').select(`
      *,
      supplier:suppliers(name),
      project:projects(name),
      items:purchase_order_items(*)
    `).eq('id', id).maybeSingle();
    
    if (error) throw error;
    return data as any;
  }

  async createPurchaseOrder(input: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const { items, ...poData } = input as any;
    
    // We are simulating a transactional insert since we might not have an RPC for PO Creation yet.
    // In a real scenario, this would also be an RPC. For Phase 3A, the focus is on the Receipt slice.
    const { data: po, error: poError } = await supabase.from('purchase_orders').insert({
      organization_id: poData.organization_id,
      project_id: poData.project_id,
      supplier_id: poData.supplier_id,
      po_number: poData.po_number || `PO-${Date.now()}`,
      po_date: poData.date || new Date().toISOString().split('T')[0],
      status: poData.status || 'Draft',
      total_amount: poData.total_amount || 0,
      notes: poData.notes || ''
    }).select().single();
    
    if (poError) throw poError;
    
    if (items && items.length > 0) {
      const itemsToInsert = items.map((i: any) => ({
        po_id: po.id,
        item_id: i.item_id,
        quantity: i.qty_ordered || i.quantity,
        unit_price: i.unit_price || 0,
        total_price: i.subtotal || 0,
        received_quantity: 0
      }));
      const { error: itemsError } = await supabase.from('purchase_order_items').insert(itemsToInsert);
      if (itemsError) {
        // Rollback attempt
        await supabase.from('purchase_orders').delete().eq('id', po.id);
        throw itemsError;
      }
    }
    
    return po as any;
  }

  async updatePurchaseOrder(id: string, input: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const payload = { ...input } as any;
    if (payload.date) {
      payload.po_date = payload.date;
      delete payload.date;
    }
    const { data, error } = await supabase.from('purchase_orders').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data as any;
  }
}
