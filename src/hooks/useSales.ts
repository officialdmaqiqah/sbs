import { useState, useEffect } from 'react';
import { getDataProvider } from '../providers';

export function useSalesOrders(filters?: Record<string, any>) {
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSalesOrders = async () => {
    try {
      setLoading(true);
      const data = await getDataProvider().getSalesOrderRepository().listSalesOrders(filters);
      setSalesOrders(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesOrders();
  }, [JSON.stringify(filters)]);

  return { salesOrders, loading, error, refetch: fetchSalesOrders };
}

export function useDeliverableSalesOrders() {
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await getDataProvider().getSalesDeliveryReadService().getDeliverableSalesOrders();
      setSalesOrders(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return { salesOrders, loading, error, refetch: fetchOrders };
}

export function useSalesDeliveries(filters?: Record<string, any>) {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const data = await getDataProvider().getSalesDeliveryRepository().listSalesDeliveries(filters);
      setDeliveries(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [JSON.stringify(filters)]);

  return { deliveries, loading, error, refetch: fetchDeliveries };
}

export function useCreateSalesDelivery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDelivery = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      return await getDataProvider().getSalesDeliveryRepository().createSalesDelivery(data);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createDelivery, loading, error };
}

export function useSalesDeliveryDetail(id: string | null) {
  const [delivery, setDelivery] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getDataProvider().getSalesDeliveryReadService().getSalesDeliveryWithDetails(id);
      setDelivery(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  return { delivery, loading, error, refetch: fetchDetail };
}
