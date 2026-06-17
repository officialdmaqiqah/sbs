import type { SalesDeliveryRepository } from '../../repositories/interfaces';
import { supabase } from '../../lib/supabase';

export class SupabaseSalesDeliveryRepository implements SalesDeliveryRepository {
  async listSalesDeliveries(filters?: Record<string, any>): Promise<any[]> {
    let query = supabase.from('sales_deliveries').select(`
      *,
      items:sales_delivery_items(*)
    `);

    if (filters?.sales_order_id) {
      query = query.eq('sales_order_id', filters.sales_order_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getSalesDeliveryById(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('sales_deliveries')
      .select(`
        *,
        items:sales_delivery_items(*)
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async createSalesDelivery(data: any): Promise<any> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Build RPC payload — RPC deliver_sales_order accepts JSONB
    const payload = {
      sales_order_id: data.sales_order_id,
      project_id: data.project_id,
      location_id: data.location_id,
      delivery_number: data.delivery_number || `DO-${Date.now()}`,
      delivery_date: data.delivery_date || new Date().toISOString().split('T')[0],
      driver: data.driver || null,
      vehicle_number: data.vehicle_number || null,
      customer_name: data.customer_name || null,
      customer_address: data.customer_address || null,
      notes: data.notes || null,
      items: data.items || [],
      created_by: user.user.id
    };

    const { data: rpcData, error } = await supabase.rpc('deliver_sales_order', {
      p_payload: payload
    });

    if (error) {
      const errMsg = error.message;
      if (errMsg.includes('Insufficient stock')) {
         throw new Error('Insufficient stock for one or more items');
      }
      if (errMsg.includes('Delivery number already exists')) {
         throw new Error('Delivery number already exists');
      }
      if (errMsg.includes('Cannot deliver more than ordered')) {
         throw new Error('Cannot deliver more than ordered quantity');
      }
      if (errMsg.includes('not deliverable') || errMsg.includes('is not deliverable')) {
         throw new Error('Sales order is not deliverable');
      }
      if (errMsg.includes('Access denied')) {
         throw new Error('Access denied: You do not have permission to perform this action');
      }
      throw error;
    }

    // RPC returns { sales_delivery_id, delivery_number, ... }
    const deliveryId = rpcData?.sales_delivery_id || rpcData?.id;
    if (!deliveryId) throw new Error('RPC did not return delivery ID');

    return this.getSalesDeliveryById(deliveryId);
  }
}
