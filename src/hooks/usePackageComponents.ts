import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function usePackageComponents(packageId?: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('package_components').select('*');
      if (packageId) {
        query = query.eq('package_id', packageId);
      }
      const { data: res, error: err } = await query;
      if (err) throw err;
      setData(res || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat komponen paket');
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const saveComponents = async (pkgId: string, components: any[]) => {
    try {
      // Delete existing
      await supabase.from('package_components').delete().eq('package_id', pkgId);
      
      // Insert new
      if (components && components.length > 0) {
        const payload = components.map(c => ({
          package_id: pkgId,
          item_id: c.item_id,
          quantity: c.quantity_per_package || c.quantity || 0,
          component_type: c.component_type || 'Lainnya',
          required: c.required ?? true
        }));
        const { error } = await supabase.from('package_components').insert(payload);
        if (error) throw error;
      }
      
      await fetchComponents();
    } catch (err: any) {
      throw err;
    }
  };

  return { data, loading, error, refetch: fetchComponents, saveComponents };
}
