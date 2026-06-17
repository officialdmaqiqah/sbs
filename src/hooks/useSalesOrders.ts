import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useSalesOrders(projectId?: string) {
  const { profile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(id, name, phone),
          items:sales_order_items(
            id, product_id, quantity, unit_price, total_price,
            product:items(id, name, category)
          )
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: res, error: err } = await query;
      if (err) throw err;
      setData(res || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data order penjualan');
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, projectId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const createOrder = async (order: any, items: any[]) => {
    if (!profile?.organization_id) throw new Error('No organization');
    try {
      const dbOrder = {
        organization_id: profile.organization_id,
        project_id: order.project_id,
        customer_id: order.customer_id,
        so_number: `SO-${new Date().getTime()}`,
        so_date: order.so_date,
        status: order.status || 'Draft',
        total_amount: order.total_amount,
        notes: order.notes,
        payment_method: order.payment_method || 'Tunai',
        payment_status: order.payment_status || 'Belum Lunas'
      };

      const { data: newOrder, error: err1 } = await supabase
        .from('sales_orders')
        .insert(dbOrder)
        .select()
        .single();
      
      if (err1) throw err1;

      const dbItems = items.map(item => ({
        so_id: newOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));

      const { error: err2 } = await supabase.from('sales_order_items').insert(dbItems);
      if (err2) throw err2;

      await fetchOrders();
      return newOrder;
    } catch (err: any) {
      throw err;
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('sales_orders').update({ status }).eq('id', id);
    if (error) throw error;
    await fetchOrders();
  };

  const markStockProcessed = async (id: string) => {
    const { error } = await supabase.from('sales_orders').update({ 
      stock_processed_at: new Date().toISOString()
    }).eq('id', id);
    if (error) throw error;
    await fetchOrders();
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase.from('sales_orders').update({ 
      payment_status: 'Lunas' 
    }).eq('id', id);
    if (error) throw error;
    await fetchOrders();
  };

  return { 
    data, loading, error, refetch: fetchOrders, 
    createOrder, updateOrderStatus, markStockProcessed, markPaid 
  };
}
