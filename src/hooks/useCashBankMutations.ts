import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDataProvider } from '../providers';

export interface CashBankMutation {
  id: string;
  mutation_date: string;
  mutation_type: 'IN' | 'OUT' | 'TRANSFER';
  from_cash_bank_id?: string | null;
  to_cash_bank_id?: string | null;
  amount: number;
  notes?: string | null;
  project_id?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  source_module?: string | null;
  created_at?: string;
  organization_id?: string;
}

export function useCashBankMutations(projectIdFilter?: string) {
  const [data, setData] = useState<CashBankMutation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = getDataProvider();
      const mutationsRaw = await provider.getRepository<CashBankMutation>('cash_bank_mutations').list();
      // Sort by mutation_date desc, created_at desc
      const mutations = mutationsRaw.sort((a, b) => {
        if (a.mutation_date !== b.mutation_date) {
          return new Date(b.mutation_date).getTime() - new Date(a.mutation_date).getTime();
        }
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      setData(mutations || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching mutations');
    } finally {
      setLoading(false);
    }
  }, []);

  const createMutation = async (mutation: Omit<CashBankMutation, 'id' | 'created_at'> & { id?: string }) => {
    try {
      const provider = getDataProvider();
      
      // Fallback dummy organization if not provided
      const finalMutation = {
        ...mutation,
        organization_id: mutation.organization_id || '00000000-0000-0000-0000-000000000000',
        created_at: new Date().toISOString()
      };
      
      const created = await provider.getRepository<CashBankMutation>('cash_bank_mutations').create(finalMutation as any);
        
      await fetchData();
      return { success: true, data: created };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // HELPER: Calculate balances based on mutations
  const calculateAccountBalance = useCallback((accountId: string) => {
    return data.reduce((balance, mut) => {
      if (mut.to_cash_bank_id === accountId && (mut.mutation_type === 'IN' || mut.mutation_type === 'TRANSFER')) {
        return balance + mut.amount;
      }
      if (mut.from_cash_bank_id === accountId && (mut.mutation_type === 'OUT' || mut.mutation_type === 'TRANSFER')) {
        return balance - mut.amount;
      }
      return balance;
    }, 0);
  }, [data]);

  const filteredData = useMemo(() => {
    if (!projectIdFilter || projectIdFilter === 'All') return data;
    if (projectIdFilter === 'Non-Project') return data.filter(m => !m.project_id);
    return data.filter(m => m.project_id === projectIdFilter);
  }, [data, projectIdFilter]);

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    filteredData.forEach(mut => {
      if (mut.to_cash_bank_id && (mut.mutation_type === 'IN' || mut.mutation_type === 'TRANSFER')) {
        balances[mut.to_cash_bank_id] = (balances[mut.to_cash_bank_id] || 0) + mut.amount;
      }
      if (mut.from_cash_bank_id && (mut.mutation_type === 'OUT' || mut.mutation_type === 'TRANSFER')) {
        balances[mut.from_cash_bank_id] = (balances[mut.from_cash_bank_id] || 0) - mut.amount;
      }
    });
    return balances;
  }, [filteredData]);

  return { 
    data: filteredData, 
    rawData: data,
    loading, 
    error, 
    refetch: fetchData, 
    createMutation,
    calculateAccountBalance,
    accountBalances
  };
}
