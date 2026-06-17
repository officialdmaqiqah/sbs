import { useState, useCallback, useEffect } from 'react';
import { getDataProvider } from '../providers';
import type { SupplierPayment } from '../types';
import type { CreateSupplierPaymentInput } from '../providers/interfaces/SupplierPaymentRepository';
import type { PayableSupplierBill } from '../providers/interfaces/SupplierPaymentReadService';

export function usePayableSupplierBills(filters?: { supplier_id?: string }) {
  const [data, setData] = useState<PayableSupplierBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const provider = getDataProvider().getSupplierPaymentReadService();
      const result = await provider.listPayableSupplierBills(filters);
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching payable bills:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [filters?.supplier_id]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return { data, loading, error, refetch: fetchBills };
}

export function useSupplierPayments(filters?: { status?: string; supplier_id?: string }) {
  const [data, setData] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const provider = getDataProvider().getSupplierPaymentRepository();
      const result = await provider.listSupplierPayments(filters);
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching supplier payments:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.supplier_id]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return { data, loading, error, refetch: fetchPayments };
}

export function useCreateSupplierPayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPayment = async (input: CreateSupplierPaymentInput) => {
    try {
      setLoading(true);
      setError(null);
      const provider = getDataProvider().getSupplierPaymentRepository();
      const result = await provider.createSupplierPayment(input);
      return result;
    } catch (err: any) {
      console.error('Error creating supplier payment:', err);
      setError(err as Error);
      
      // Friendly errors based on Supabase RPC output
      if (err.message?.includes('Pembayaran melebihi sisa tagihan')) {
        throw new Error('Pembayaran melebihi sisa tagihan.');
      }
      if (err.message?.includes('Kas/Bank wajib dipilih')) {
        throw new Error('Kas/Bank wajib dipilih.');
      }
      if (err.message?.includes('Nomor pembayaran sudah digunakan')) {
        throw new Error('Nomor pembayaran sudah digunakan.');
      }
      if (err.message?.includes('Pembayaran ini sudah pernah diproses')) {
        throw new Error('Pembayaran ini sudah pernah diproses.');
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createPayment, loading, error };
}

export function useReverseSupplierPayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reversePayment = async (id: string, reason: string) => {
    try {
      setLoading(true);
      setError(null);
      const provider = getDataProvider().getSupplierPaymentRepository();
      await provider.reverseSupplierPayment(id, reason);
    } catch (err: any) {
      console.error('Error reversing supplier payment:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { reversePayment, loading, error };
}
