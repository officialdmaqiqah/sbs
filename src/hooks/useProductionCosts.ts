import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useProductionCosts(productionId?: string) {
  const { profile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCosts = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('production_costs')
        .select('*, cash_bank:cash_bank_accounts(id, bank_name, account_name)')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });
      
      if (productionId) {
        query = query.eq('production_id', productionId);
      }

      const { data: res, error: err } = await query;
      if (err) throw err;
      setData(res || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data biaya produksi');
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, productionId]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  const addCost = async (payload: any, sourceType: string) => {
    if (!profile?.organization_id) throw new Error('No organization');
    try {
      const dbPayload = {
        ...payload,
        organization_id: profile.organization_id
      };

      const { data: newCost, error: err } = await supabase
        .from('production_costs')
        .insert(dbPayload)
        .select()
        .single();
      
      if (err) throw err;
      
      // Also insert into cash_bank_mutations OUT
      const mutationPayload = {
        organization_id: profile.organization_id,
        project_id: payload.project_id,
        mutation_date: payload.cost_date,
        mutation_type: 'OUT',
        from_cash_bank_id: payload.cash_bank_id,
        amount: payload.amount,
        notes: `Biaya Produksi (${payload.cost_type}): ${payload.notes || ''}`,
        reference_type: 'PRODUCTION_COST',
        reference_id: newCost.id,
        source_module: sourceType === 'CAGE' ? 'CAGE_PRODUCTION' : 'FEED_MIXING'
      };

      const { error: mutErr } = await supabase.from('cash_bank_mutations').insert(mutationPayload);
      if (mutErr) throw mutErr;

      await fetchCosts();
      return newCost;
    } catch (err: any) {
      throw err;
    }
  };

  return { 
    data, loading, error, refetch: fetchCosts, addCost 
  };
}
