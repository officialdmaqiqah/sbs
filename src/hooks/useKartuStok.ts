import { useState, useEffect, useCallback } from 'react';
import { getDataProvider } from '../providers';

export function useKartuStok(itemId: string, projectId?: string, locationId?: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKartuStok = useCallback(async () => {
    if (!itemId) return;
    
    setLoading(true);
    setError(null);
    try {
      const repo = getDataProvider().getInventoryMovementRepository();
      const result = await repo.listKartuStok(itemId, projectId, locationId);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat kartu stok');
    } finally {
      setLoading(false);
    }
  }, [itemId, projectId, locationId]);

  useEffect(() => {
    fetchKartuStok();
  }, [fetchKartuStok]);

  return {
    data,
    loading,
    error,
    refetch: fetchKartuStok
  };
}
