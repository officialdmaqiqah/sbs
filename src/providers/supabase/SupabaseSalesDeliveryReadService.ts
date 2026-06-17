import type { SalesDeliveryReadService } from '../../repositories/interfaces';
import { supabase } from '../../lib/supabase';

export class SupabaseSalesDeliveryReadService implements SalesDeliveryReadService {
  async getDeliverableSalesOrders(): Promise<any[]> {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customers (
          name
        ),
        projects (
          name
        ),
        items:sales_order_items(*)
      `)
      .in('status', ['Confirmed', 'Partially Delivered'])
      .order('so_date', { ascending: false });

    if (error) throw error;

    return data?.map(so => ({
      ...so,
      customer_name: so.customers?.name,
      project_name: so.projects?.name,
      customers: undefined,
      projects: undefined
    })) || [];
  }

  async getSalesDeliveryWithDetails(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('sales_deliveries')
      .select(`
        *,
        sales_orders (
          so_number,
          customers (
            name
          )
        ),
        projects (
          name
        ),
        items:sales_delivery_items(
          *,
          items:item_id (
             name
          ),
          sales_order_items:so_item_id (
             products (
                name
             )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    const mappedItems = data.items?.map((item: any) => ({
      ...item,
      inventory_item_name: item.items?.name,
      product_name: item.sales_order_items?.products?.name,
      items: undefined,
      sales_order_items: undefined
    }));

    return {
      ...data,
      so_number: data.sales_orders?.so_number,
      customer_name: data.sales_orders?.customers?.name,
      project_name: data.projects?.name,
      items: mappedItems,
      sales_orders: undefined,
      projects: undefined
    };
  }
}
