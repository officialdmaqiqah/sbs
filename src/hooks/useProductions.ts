import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useProductions(type: 'CAGE' | 'FEED', projectId?: string) {
  const { profile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProductions = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('production_orders')
        .select(`
          *,
          items:production_order_items(id, type, quantity, item:items(id, name, unit))
        `)
        .eq('organization_id', profile.organization_id)
        .eq('type', type)
        .order('created_at', { ascending: false });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: res, error: err } = await query;
      if (err) throw err;
      setData(res || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data produksi');
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, type, projectId]);

  useEffect(() => {
    fetchProductions();
  }, [fetchProductions]);

  const createProduction = async (payload: any, items: any[]) => {
    if (!profile?.organization_id) throw new Error('No organization');
    try {
      const dbPayload = {
        ...payload,
        organization_id: profile.organization_id,
        production_number: `PRD-${new Date().getTime()}`,
        type,
        status: 'Draft'
      };

      const { data: newProd, error: err } = await supabase
        .from('production_orders')
        .insert(dbPayload)
        .select()
        .single();
      
      if (err) throw err;
      
      // Insert items
      const itemPayloads = items.map(i => ({
        production_order_id: newProd.id,
        item_id: i.item_id,
        type: i.type,
        quantity: i.quantity
      }));

      const { error: itemErr } = await supabase.from('production_order_items').insert(itemPayloads);
      if (itemErr) throw itemErr;

      await fetchProductions();
      return newProd;
    } catch (err: any) {
      throw err;
    }
  };

  const processProduction = async (id: string, projectId: string, items: any[]) => {
    if (!profile?.organization_id) throw new Error('No organization');
    try {
      // Create movements
      const transactionId = crypto.randomUUID();
      
      const movements = items.map(i => ({
        organization_id: profile.organization_id,
        project_id: projectId,
        item_id: i.item_id,
        movement_type: i.type === 'INPUT' ? 'OUT' : 'IN',
        quantity: i.quantity,
        reference_type: 'PRODUCTION_ORDER',
        reference_id: id,
        source_module: type === 'CAGE' ? 'CAGE_PRODUCTION' : 'FEED_MIXING',
        transaction_id: transactionId,
        notes: `Produksi ${type} (${i.type})`,
        created_by: profile.id
      }));

      const { error: moveErr } = await supabase.from('inventory_movements').insert(movements);
      if (moveErr) throw moveErr;

      // Update status
      const { error: updateErr } = await supabase
        .from('production_orders')
        .update({ 
          status: 'Diproses', 
          processed_at: new Date().toISOString(),
          transaction_id: transactionId 
        })
        .eq('id', id);
        
      if (updateErr) throw updateErr;

      await fetchProductions();
    } catch (err: any) {
      throw err;
    }
  };

  return { 
    data, loading, error, refetch: fetchProductions, 
    createProduction, processProduction 
  };
}
