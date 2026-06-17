import { useState } from 'react';
import { getDataProvider } from '../providers';

export function usePostInventoryTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const postTransaction = async (input: {
    projectId: string | null;
    locationId: string;
    itemId: string;
    date?: string;
    movementDate?: string;
    direction: 'IN' | 'OUT';
    quantity: number;
    unitCost?: number;
    referenceType?: string;
    referenceId?: string;
    referenceNumber?: string;
    reference?: string;
    notes?: string;
    transactionId?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const service = getDataProvider().getInventoryCommandService();
      const result = await service.postInventoryTransaction(input);
      return result;
    } catch (err: any) {
      const msg = err.message || 'Gagal memproses transaksi stok';
      setError(msg);
      throw err; // throw to let UI handle (e.g., show toast)
    } finally {
      setLoading(false);
    }
  };

  return {
    postTransaction,
    loading,
    error
  };
}
