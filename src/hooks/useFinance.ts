import { useState, useEffect, useCallback } from 'react'; 
import { db } from '../services/db';
import { cashBankService } from '../services/cashBankService';
import { arApService } from '../services/arApService';
import { getDataProvider } from '../providers';
import type { 
  CustomerInvoice, CustomerPayment, CustomerDP, 
  SupplierPayment, CustomerRefund, SupplierRefund, 
  CashBankAccount
} from '../types';

function useGenericDataFetch<T>(fetchFn: () => T[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const result = fetchFn();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}


export function useCashBankAccounts() {
  const fetchFn = useCallback(async () => {
    const isSupabase = localStorage.getItem('VITE_DATA_PROVIDER') === 'supabase' || import.meta.env.VITE_DATA_PROVIDER === 'supabase';
    if (isSupabase) {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase.from('cash_bank_accounts').select('*');
      if (error) throw error;
      return data;
    }
    return db.query('cash_bank_accounts', () => true) as CashBankAccount[];
  }, []);
  
  const [data, setData] = useState<CashBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useCashTransactions() {
  const fetchFn = useCallback(() => cashBankService.getCashTransactions(), []);
  return useGenericDataFetch(fetchFn);
}

export function useCustomerInvoices() {
  const fetchFn = useCallback(async () => {
    const provider = getDataProvider();
    return provider.getCustomerInvoiceRepository().listInvoices();
  }, []);
  
  const [data, setData] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, loading, error, refetch: fetchData };
}

export function useCustomerPayments() {
  const fetchFn = useCallback(async () => {
    const provider = getDataProvider();
    return provider.getCustomerPaymentRepository().listPayments();
  }, []);

  const [data, setData] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, loading, error, refetch: fetchData };
}

export function useCustomerDP() {
  const fetchFn = useCallback(() => db.query('customer_dps', () => true) as CustomerDP[], []);
  return useGenericDataFetch(fetchFn);
}


export function useSupplierAdvances() {
  const fetchFn = useCallback(() => db.query('supplier_payments', (p: any) => p.unapplied_amount > 0) as SupplierPayment[], []);
  return useGenericDataFetch(fetchFn);
}

export function useCustomerRefunds() {
  const fetchFn = useCallback(() => db.query('customer_refunds', () => true) as CustomerRefund[], []);
  return useGenericDataFetch(fetchFn);
}

export function useSupplierRefunds() {
  const fetchFn = useCallback(() => db.query('supplier_refunds', () => true) as SupplierRefund[], []);
  return useGenericDataFetch(fetchFn);
}

export function useARAging(asOfDate?: string) {
  const fetchFn = useCallback(() => {
    const today = asOfDate || new Date().toISOString().split('T')[0];
    return arApService.getARAging(today);
  }, [asOfDate]);
  return useGenericDataFetch(fetchFn);
}

export function useAPAging(asOfDate?: string) {
  const fetchFn = useCallback(() => {
    const today = asOfDate || new Date().toISOString().split('T')[0];
    return arApService.getAPAging(today);
  }, [asOfDate]);
  return useGenericDataFetch(fetchFn);
}

export function useAccounts() {
  const fetchFn = useCallback(() => db.query('accounts', () => true), []);
  return useGenericDataFetch(fetchFn);
}

export function useAccountLedger(accountId: string) {
  const fetchFn = useCallback(() => {
    const lines = db.query('journal_entry_lines', (l: any) => l.account_id === accountId);
    const entries = db.query('journal_entries', (e: any) => e.status === 'Posted');
    const postedIds = new Set(entries.map((e: any) => e.id));
    const postedLines = lines.filter((l: any) => postedIds.has(l.journal_entry_id));
    return postedLines.map((l: any) => {
      const entry = entries.find((e: any) => e.id === l.journal_entry_id);
      return { 
        ...l, 
        journal_date: entry?.journal_date, 
        journal_number: entry?.journal_number, 
        description: entry?.description, 
        reference: entry?.reference, 
        source_document: entry?.source_document, 
        source_document_id: entry?.source_document_id,
        created_at: entry?.created_at
      };
    }).sort((a: any, b: any) => {
      const dateA = new Date(a.journal_date || 0).getTime();
      const dateB = new Date(b.journal_date || 0).getTime();
      if (dateA !== dateB) return dateA - dateB;
      
      const numA = a.journal_number || '';
      const numB = b.journal_number || '';
      if (numA !== numB) return numA.localeCompare(numB);
      
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });
  }, [accountId]);
  return useGenericDataFetch(fetchFn);
}
