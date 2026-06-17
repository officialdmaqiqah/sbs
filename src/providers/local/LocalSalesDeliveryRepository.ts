import type { SalesDeliveryRepository } from '../../repositories/interfaces';
import { db } from '../../services/db';

export class LocalSalesDeliveryRepository implements SalesDeliveryRepository {
  async listSalesDeliveries(filters?: Record<string, any>): Promise<any[]> {
    let deliveries = (db as any).getAll('sales_deliveries');
    if (filters?.sales_order_id) {
      deliveries = deliveries.filter((d: any) => d.sales_order_id === filters.sales_order_id);
    }
    return deliveries;
  }

  async getSalesDeliveryById(id: string): Promise<any | null> {
    const delivery = (db as any).getById('sales_deliveries', id);
    if (!delivery) return null;
    const items = (db as any).getAll('sales_delivery_items').filter((i: any) => i.sales_delivery_id === id);
    return { ...delivery, items };
  }

  async createSalesDelivery(input: any): Promise<any> {
    const { items, ...data } = input;
    
    const deliveryNumber = data.delivery_number || `DO-${Date.now()}`;
    const transactionId = crypto.randomUUID();

    const delivery = (db as any).insert('sales_deliveries', {
      ...data,
      delivery_number: deliveryNumber,
      status: data.status || 'Delivered',
      finance_status: data.finance_status || 'Invoice Eligible',
      transaction_id: transactionId,
      dispatch_transaction_id: transactionId
    });

    if (items && items.length > 0) {
      for (const item of items) {
        (db as any).insert('sales_delivery_items', {
          sales_delivery_id: delivery.id,
          so_item_id: item.sales_order_item_id,
          item_id: item.inventory_item_id,
          quantity_delivered: item.quantity_delivered,
          hpp_snapshot: item.unit_hpp || 0
        });

        // deduct stock
        const currentBalances = (db as any).getAll('inventory_balances').filter((b: any) => b.item_id === item.inventory_item_id && b.location_id === data.location_id);
        if (currentBalances.length > 0) {
          const bal = currentBalances[0];
          (db as any).update('inventory_balances', bal.id, {
             current_stock: bal.current_stock - item.quantity_delivered
          });
        }

        // update so item
        const soItem = (db as any).getById('sales_order_items', item.sales_order_item_id);
        if (soItem) {
           (db as any).update('sales_order_items', soItem.id, {
              delivered_quantity: (soItem.delivered_quantity || 0) + item.quantity_delivered
           });
        }
      }
    }

    // Update SO status
    const soItems = (db as any).getAll('sales_order_items').filter((i: any) => i.so_id === data.sales_order_id);
    const totalOrdered = soItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
    const totalDelivered = soItems.reduce((acc: number, item: any) => acc + (item.delivered_quantity || 0), 0);
    
    let newStatus = 'Confirmed';
    if (totalDelivered >= totalOrdered && totalOrdered > 0) {
      newStatus = 'Delivered';
    } else if (totalDelivered > 0) {
      newStatus = 'Partially Delivered';
    }

    (db as any).update('sales_orders', data.sales_order_id, { status: newStatus });

    return { ...delivery, items };
  }
}
