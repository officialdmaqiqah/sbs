import type { PurchaseReadService } from '../interfaces/PurchaseReadService';
import type { PurchaseOrder } from '../../types';
import { supabase } from '../../lib/supabase';

export class SupabasePurchaseReadService implements PurchaseReadService {
  async listReceivablePurchaseOrders(): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase.from('purchase_orders').select(`
      *,
      supplier:suppliers(name),
      project:projects(name),
      items:purchase_order_items(*)
    `)
    .in('status', ['Approved', 'Ordered', 'Partially Received', 'Draft']) // Adjust based on actual status enums, Draft just in case.
    .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as any;
  }

  async getPurchaseOrderReceiptStatus(poId: string): Promise<any> {
    const { data, error } = await supabase.from('purchase_order_items').select(`
      *
    `).eq('po_id', poId);
    
    if (error) throw error;
    return data;
  }

  async listReceiptItems(receiptId: string): Promise<any[]> {
    const { data, error } = await supabase.from('purchase_receipt_items').select(`
      *,
      item:items(name, code, unit),
      po_item:purchase_order_items(unit_price)
    `).eq('receipt_id', receiptId);
    
    if (error) throw error;
    return data;
  }
}
