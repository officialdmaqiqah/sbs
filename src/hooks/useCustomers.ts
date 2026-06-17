import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useCustomers() {
  const { profile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('name');
      
      if (err) throw err;
      setData(res || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data pelanggan');
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const addCustomer = async (payload: { name: string; phone?: string; address?: string; notes?: string }) => {
    if (!profile?.organization_id) throw new Error('No organization');
    const dbPayload = {
      ...payload,
      code: `CUST-${Math.floor(Math.random()*10000)}`,
      organization_id: profile.organization_id
    };
    const { data: res, error } = await supabase.from('customers').insert(dbPayload).select().single();
    if (error) throw error;
    await fetchCustomers();
    return res;
  };

  return { data, loading, error, refetch: fetchCustomers, addCustomer };
}
