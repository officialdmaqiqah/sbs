import { db } from '../../services/db';
import type { SupplierBillReadService, BillEligibleReceipt } from '../interfaces/SupplierBillReadService';

export class LocalSupplierBillReadService implements SupplierBillReadService {
  async listBillEligibleReceipts(_filters?: Record<string, any>): Promise<BillEligibleReceipt[]> {
    // 1. Ambil purchase_receipts yang finance_status = 'Bill Eligible'
    const receipts = db.query('purchase_receipts', (r: any) => r.finance_status === 'Bill Eligible');

    return receipts.map((r: any) => {
      // 2. Ambil PO terkait untuk mendapatkan po_number, supplier_id, project_id
      const po: any = db.getById('purchase_orders', r.po_id);
      
      const supplier: any = po?.supplier_id ? db.getById('suppliers', po.supplier_id) : null;
      const project: any = po?.project_id ? db.getById('projects', po.project_id) : null;

      // 3. Ambil receipt items dan hitung total amount
      const items = db.query('purchase_receipt_items', (i: any) => i.receipt_id === r.id);
      let totalAmount = 0;
      for (const item of items as any[]) {
        const poItem: any = db.getById('purchase_order_items', item.po_item_id);
        if (poItem?.unit_price) {
          totalAmount += item.quantity * poItem.unit_price;
        }
      }

      return {
        id: r.id,
        receipt_number: r.receipt_number,
        receipt_date: r.receipt_date,
        po_id: r.po_id,
        po_number: po?.po_number || '-',
        supplier_id: po?.supplier_id || '',
        supplier_name: supplier?.name || '-',
        project_id: po?.project_id || '',
        project_name: project?.name || '-',
        total_amount: totalAmount,
        finance_status: r.finance_status
      };
    });
  }

  async getSupplierBillOutstanding(billId: string): Promise<number> {
    const bill: any = db.getById('supplier_bills', billId);
    return bill?.outstanding_amount || 0;
  }

  async listSupplierBillLines(billId: string): Promise<any[]> {
    const lines = db.query('supplier_bill_lines', (l: any) => l.bill_id === billId);
    return lines.map((l: any) => {
      const item: any = l.item_id ? db.getById('items', l.item_id) : null;
      return {
        ...l,
        items: item ? { name: item.name, code: item.code } : null
      };
    });
  }
}
