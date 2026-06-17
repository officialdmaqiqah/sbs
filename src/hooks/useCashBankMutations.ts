import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { environment } from '../config/environment';

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
      if (environment.dataProvider !== 'supabase') {
        // Fallback for mock db if needed, or just set empty
        setData([]);
        setLoading(false);
        return;
      }

      const { data: mutations, error } = await supabase
        .from('cash_bank_mutations')
        .select('*')
        .order('mutation_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(mutations || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching mutations');
    } finally {
      setLoading(false);
    }
  }, []);

  const createMutation = async (mutation: Omit<CashBankMutation, 'id' | 'created_at'>) => {
    try {
      if (environment.dataProvider !== 'supabase') {
        throw new Error("Cannot create mutation in local mock DB");
      }
      
      // Fallback dummy organization if not provided
      const finalMutation = {
        ...mutation,
        organization_id: mutation.organization_id || '00000000-0000-0000-0000-000000000000'
      };
      
      const { data, error } = await supabase
        .from('cash_bank_mutations')
        .insert([finalMutation])
        .select()
        .single();
        
      if (error) throw error;
      await fetchData();
      return { success: true, data };
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
  }, [data]);

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
