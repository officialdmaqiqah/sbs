import type { SalesOrderRepository } from '../../repositories/interfaces';

import { db } from '../../services/db';

export class LocalSalesOrderRepository implements SalesOrderRepository {
  async listSalesOrders(filters?: Record<string, any>): Promise<any[]> {
    let sos = (db as any).getAll('sales_orders');
    if (filters?.status) {
      sos = sos.filter((so: any) => so.status === filters.status);
    }
    return sos.map((so: any) => {
      const items = (db as any).getAll('sales_order_items').filter((i: any) => i.so_id === so.id);
      return { ...so, items };
    });
  }

  async getSalesOrderById(id: string): Promise<any | null> {
    const so = (db as any).getById('sales_orders', id);
    if (!so) return null;
    const items = (db as any).getAll('sales_order_items').filter((i: any) => i.so_id === id);
    return { ...so, items };
  }

  async createSalesOrder(input: any): Promise<any> {
    const { items, ...soData } = input;
    
    const soNumber = soData.so_number || `SO-${Date.now()}`;
    
    const so = (db as any).insert('sales_orders', {
      ...soData,
      so_number: soNumber,
      so_date: soData.so_date || new Date().toISOString().split('T')[0],
      status: soData.status || 'Draft',
    });

    if (items && items.length > 0) {
      for (const item of items) {
        (db as any).insert('sales_order_items', {
          so_id: so.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
          delivered_quantity: 0
        });
      }
    }
    return so;
  }

  async updateSalesOrderStatus(id: string, status: string): Promise<any> {
    return (db as any).update('sales_orders', id, { status });
  }
}
