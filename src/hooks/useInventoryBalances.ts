import { useState, useEffect, useCallback } from 'react';
import { getDataProvider } from '../providers';

export function useInventoryBalances(filters?: { projectId?: string; locationId?: string; itemId?: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const repo = getDataProvider().getInventoryBalanceRepository();
      // map camelCase filters to snake_case if necessary, or let provider handle it.
      // We pass it directly, so let's map it safely here.
      const mappedFilters: any = {};
      if (filters?.projectId) mappedFilters.project_id = filters.projectId;
      if (filters?.locationId) mappedFilters.location_id = filters.locationId;
      if (filters?.itemId) mappedFilters.item_id = filters.itemId;

      const result = await repo.listBalances(Object.keys(mappedFilters).length > 0 ? mappedFilters : undefined);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat saldo stok');
    } finally {
      setLoading(false);
    }
  }, [filters?.projectId, filters?.locationId, filters?.itemId]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    data,
    loading,
    error,
    refetch: fetchBalances
  };
}
