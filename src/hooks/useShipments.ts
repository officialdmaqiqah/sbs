import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useShipments(projectId?: string) {
  const { profile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShipments = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('delivery_orders')
        .select(`
          *,
          sales_order:sales_orders(
            id, so_number, customer:customers(id, name, address),
            items:sales_order_items(id, quantity, product:items(id, name, category, item_type))
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
      setError(err.message || 'Gagal memuat data pengiriman');
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, projectId]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const createShipment = async (payload: any) => {
    if (!profile?.organization_id) throw new Error('No organization');
    try {
      const dbPayload = {
        ...payload,
        organization_id: profile.organization_id,
        do_number: `DO-${new Date().getTime()}`,
        status: 'Dijadwalkan'
      };

      const { data: newShipment, error: err } = await supabase
        .from('delivery_orders')
        .insert(dbPayload)
        .select()
        .single();
      
      if (err) throw err;
      
      // Update sales order status
      await supabase.from('sales_orders').update({ status: 'Proses Kirim' }).eq('id', payload.so_id);
      
      await fetchShipments();
      return newShipment;
    } catch (err: any) {
      throw err;
    }
  };

  const updateShipmentStatus = async (id: string, status: string, additionalData?: any) => {
    try {
      const payload = { status, ...additionalData };
      const { error } = await supabase.from('delivery_orders').update(payload).eq('id', id);
      if (error) throw error;
      await fetchShipments();
    } catch (err: any) {
      throw err;
    }
  };

  return { 
    data, loading, error, refetch: fetchShipments, 
    createShipment, updateShipmentStatus 
  };
}
