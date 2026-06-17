import { useState, useEffect, useCallback } from 'react';
import { getDataProvider } from '../providers';

export function useItems() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const repo = getDataProvider().getItemRepository();
      const result = await repo.listItems();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    data,
    loading,
    error,
    refetch: fetchItems
  };
}
