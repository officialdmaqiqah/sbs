import { useState, useEffect, useCallback } from 'react';
import { getDataProvider } from '../providers';

export function useProjects() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const repo = getDataProvider().getProjectRepository();
      const result = await repo.listProjects();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    data,
    loading,
    error,
    refetch: fetchProjects
  };
}
