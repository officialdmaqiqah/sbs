import type { SalesOrderRepository } from '../../repositories/interfaces';
import { supabase } from '../../lib/supabase';

export class SupabaseSalesOrderRepository implements SalesOrderRepository {
  async listSalesOrders(filters?: Record<string, any>): Promise<any[]> {
    let query = supabase.from('sales_orders').select(`
      *,
      items:sales_order_items(*)
    `);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(this._normalize);
  }

  async getSalesOrderById(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        items:sales_order_items(*)
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this._normalize(data) : null;
  }

  async createSalesOrder(input: any): Promise<any> {
    const { items, ...rest } = input;

    // Map from provider-facing fields to DB columns
    const soRecord: Record<string, any> = {
      organization_id: rest.organization_id,
      project_id: rest.project_id,
      customer_id: rest.customer_id || null,
      // Convenience text fields (added in Phase 4A migration)
      customer_name: rest.customer_name || null,
      customer_phone: rest.customer_phone || null,
      customer_address: rest.customer_address || null,
      order_number: rest.order_number || null,
      order_date: rest.order_date || null,
      // DB native fields
      so_number: rest.so_number || rest.order_number || `SO-${Date.now()}`,
      so_date: rest.so_date || (rest.order_date ? new Date(rest.order_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      status: rest.status || 'Draft',
      total_amount: rest.total_amount || 0,
      notes: rest.notes || null,
    };

    const { data: so, error } = await supabase
      .from('sales_orders')
      .insert(soRecord)
      .select()
      .single();

    if (error) throw error;

    if (items && items.length > 0) {
      const soItems = items.map((item: any) => ({
        so_id: so.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        delivered_quantity: 0
      }));

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(soItems);
        
      if (itemsError) throw itemsError;
    }

    return this.getSalesOrderById(so.id);
  }

  async updateSalesOrderStatus(id: string, status: string): Promise<any> {
    const { data, error } = await supabase
      .from('sales_orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Normalize DB row to provider-facing shape
  private _normalize(row: any): any {
    return {
      ...row,
      // Expose items with consistent naming
      items: (row.items || []).map((item: any) => ({
        ...item,
        // so_id → sales_order_id alias for provider consumers
        sales_order_id: item.so_id,
      }))
    };
  }
}
