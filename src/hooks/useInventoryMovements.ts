import { useState, useEffect, useCallback } from 'react';
import { getDataProvider } from '../providers';

export function useInventoryMovements(filters?: { projectId?: string; locationId?: string; itemId?: string; direction?: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const repo = getDataProvider().getInventoryMovementRepository();
      
      const mappedFilters: any = {};
      if (filters?.projectId) mappedFilters.project_id = filters.projectId;
      if (filters?.locationId) mappedFilters.location_id = filters.locationId;
      if (filters?.itemId) mappedFilters.item_id = filters.itemId;
      if (filters?.direction) mappedFilters.direction = filters.direction;

      const result = await repo.listMovements(Object.keys(mappedFilters).length > 0 ? mappedFilters : undefined);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat pergerakan stok');
    } finally {
      setLoading(false);
    }
  }, [filters?.projectId, filters?.locationId, filters?.itemId, filters?.direction]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  return {
    data,
    loading,
    error,
    refetch: fetchMovements
  };
}
