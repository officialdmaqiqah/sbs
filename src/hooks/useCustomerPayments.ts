import { useState, useEffect } from 'react';
import { getDataProvider } from '../providers';
import type { CustomerInvoice, CustomerPayment } from '../types';

export function useCustomerPayments() {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const provider = getDataProvider();
      
      const payableInvoices = await provider.getCustomerPaymentReadService().getPayableInvoices();
      setInvoices(payableInvoices);

      const allPayments = await provider.getCustomerPaymentRepository().listPayments();
      setPayments(allPayments);
    } catch (error) {
      console.error('Failed to load AR data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createPayment = async (data: any) => {
    const provider = getDataProvider();
    await provider.getCustomerPaymentRepository().createPayment(data);
    await loadData();
  };

  return {
    invoices,
    payments,
    loading,
    refresh: loadData,
    createPayment
  };
}
