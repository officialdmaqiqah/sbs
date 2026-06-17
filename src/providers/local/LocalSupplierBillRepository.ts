import type { SupplierBillRepository, CreateSupplierBillFromReceiptInput } from '../interfaces/SupplierBillRepository';
import type { SupplierBill } from '../../types';
import { db } from '../../services/db';

export class LocalSupplierBillRepository implements SupplierBillRepository {
  async getSupplierBillById(id: string): Promise<SupplierBill | null> {
    return db.getById('supplier_bills', id) as SupplierBill | null;
  }

  async listSupplierBills(filters?: Record<string, any>): Promise<SupplierBill[]> {
    return db.query('supplier_bills', (bill: any) => {
      if (!filters) return true;
      return Object.entries(filters).every(([key, value]) => bill[key] === value);
    }) as SupplierBill[];
  }

  async createSupplierBillFromReceipt(input: CreateSupplierBillFromReceiptInput): Promise<SupplierBill> {
    const receipt: any = db.getById('purchase_receipts', input.purchase_receipt_id);
    if (!receipt) throw new Error('Receipt tidak ditemukan');
    if (receipt.finance_status !== 'Bill Eligible') throw new Error('Receipt ini belum siap ditagihkan atau sudah ditagihkan');

    // Cek duplikat
    const existingBills = db.query('supplier_bills', (b: any) => b.purchase_receipt_id === input.purchase_receipt_id);
    if (existingBills.length > 0) throw new Error('Receipt ini sudah dibuatkan tagihan');

    // Hitung total dari receipt items
    const items = db.query('purchase_receipt_items', (i: any) => i.receipt_id === input.purchase_receipt_id);
    let totalAmount = 0;
    
    // Create bill lines based on receipt items
    const billLines = [];
    for (const item of items as any[]) {
      const poItem: any = db.getById('purchase_order_items', item.po_item_id);
      const unitCost = poItem?.unit_price || 0;
      const totalLine = item.quantity * unitCost;
      totalAmount += totalLine;

      billLines.push({
        item_id: item.item_id,
        quantity: item.quantity,
        unit_cost: unitCost,
        total_price: totalLine
      });
    }

    const newBill: Omit<SupplierBill, 'id'> = {
      organization_id: input.organization_id,
      bill_number: input.bill_number,
      supplier_id: input.supplier_id,
      project_id: input.project_id || '',
      purchase_receipt_id: input.purchase_receipt_id,
      bill_date: input.bill_date,
      due_date: input.due_date,
      total_amount: totalAmount,
      paid_amount: 0,
      outstanding_amount: totalAmount,
      status: 'Draft',
      notes: input.notes || undefined,
      created_by: input.created_by,
      created_at: new Date().toISOString()
    };

    const savedBill = db.insert('supplier_bills', newBill) as SupplierBill;

    for (const line of billLines) {
      db.insert('supplier_bill_lines', {
        bill_id: savedBill.id,
        ...line
      });
    }

    db.update('purchase_receipts', input.purchase_receipt_id, {
      finance_status: 'Billed'
    });

    return savedBill;
  }
}
