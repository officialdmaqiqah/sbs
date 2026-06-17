import type { SalesDeliveryReadService } from '../../repositories/interfaces';
import { db } from '../../services/db';

export class LocalSalesDeliveryReadService implements SalesDeliveryReadService {
  async getDeliverableSalesOrders(): Promise<any[]> {
    const sos = (db as any).getAll('sales_orders').filter((so: any) => {
      return so.status === 'Confirmed' || so.status === 'Partially Delivered';
    });

    return sos.map((so: any) => {
      const items = (db as any).getAll('sales_order_items').filter((i: any) => i.so_id === so.id);
      const customer = (db as any).getById('customers', so.customer_id);
      const project = (db as any).getById('projects', so.project_id);
      return {
        ...so,
        customer_name: customer?.name,
        project_name: project?.name,
        items
      };
    });
  }

  async getSalesDeliveryWithDetails(id: string): Promise<any | null> {
    const delivery = (db as any).getById('sales_deliveries', id);
    if (!delivery) return null;

    const so = (db as any).getById('sales_orders', delivery.sales_order_id);
    const customer = so ? (db as any).getById('customers', so.customer_id) : null;
    const project = (db as any).getById('projects', delivery.project_id);

    const items = (db as any).getAll('sales_delivery_items').filter((i: any) => i.sales_delivery_id === id).map((item: any) => {
        const inventoryItem = (db as any).getById('items', item.item_id);
        const soItem = (db as any).getById('sales_order_items', item.so_item_id);
        const product = soItem ? (db as any).getById('products', soItem.product_id) : null;
        return {
           ...item,
           inventory_item_name: inventoryItem?.name,
           product_name: product?.name
        };
    });

    return {
      ...delivery,
      customer_name: customer?.name,
      project_name: project?.name,
      so_number: so?.so_number,
      items
    };
  }
}
