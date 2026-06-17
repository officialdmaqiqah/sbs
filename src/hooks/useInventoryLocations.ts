import { useState, useEffect, useCallback } from 'react';
import { getDataProvider } from '../providers';

export function useInventoryLocations() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const repo = getDataProvider().getInventoryLocationRepository();
      const result = await repo.listLocations();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return {
    data,
    loading,
    error,
    refetch: fetchLocations
  };
}
