import { useState, useCallback } from 'react';
import { getDataProvider } from '../providers';
import type { SupplierBill } from '../types';
import type { BillEligibleReceipt } from '../providers/interfaces/SupplierBillReadService';
import type { CreateSupplierBillFromReceiptInput } from '../providers/interfaces/SupplierBillRepository';
import { useAuth } from '../contexts/AuthContext';

export function useSupplierBills() {
  const { user, profile } = useAuth();
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [billEligibleReceipts, setBillEligibleReceipts] = useState<BillEligibleReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = useCallback(async (filters?: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const provider = getDataProvider();
      const repo = provider.getSupplierBillRepository();
      const data = await repo.listSupplierBills(filters);
      setBills(data);
    } catch (err: any) {
      console.error('Failed to fetch bills:', err);
      setError(err.message || 'Failed to fetch supplier bills');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchBillEligibleReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = getDataProvider();
      const readService = provider.getSupplierBillReadService();
      const data = await readService.listBillEligibleReceipts();
      setBillEligibleReceipts(data);
    } catch (err: any) {
      console.error('Failed to fetch bill eligible receipts:', err);
      setError(err.message || 'Failed to fetch bill eligible receipts');
    } finally {
      setLoading(false);
    }
  }, []);

  const createBillFromReceipt = async (input: Omit<CreateSupplierBillFromReceiptInput, 'organization_id' | 'transaction_id'>) => {
    if (!user || !profile?.organization_id) throw new Error('Organization ID not found');
    
    setLoading(true);
    setError(null);
    try {
      const provider = getDataProvider();
      const repo = provider.getSupplierBillRepository();
      const result = await repo.createSupplierBillFromReceipt({
        ...input,
        organization_id: profile.organization_id,
        transaction_id: crypto.randomUUID()
      });
      await fetchBills();
      await fetchBillEligibleReceipts();
      return result;
    } catch (err: any) {
      console.error('Failed to create bill from receipt:', err);
      setError(err.message || 'Failed to create bill');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getBillLines = async (billId: string) => {
    try {
      const provider = getDataProvider();
      const readService = provider.getSupplierBillReadService();
      return await readService.listSupplierBillLines(billId);
    } catch (err: any) {
      console.error('Failed to fetch bill lines:', err);
      throw err;
    }
  };

  return {
    bills,
    billEligibleReceipts,
    loading,
    error,
    fetchBills,
    fetchBillEligibleReceipts,
    createBillFromReceipt,
    getBillLines
  };
}
