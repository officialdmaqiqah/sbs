import { supabase } from '../../lib/supabase';
import type { SupplierBillReadService, BillEligibleReceipt } from '../interfaces/SupplierBillReadService';
import { handleSupabaseError } from './utils';

export class SupabaseSupplierBillReadService implements SupplierBillReadService {
  async listBillEligibleReceipts(_filters?: Record<string, any>): Promise<BillEligibleReceipt[]> {
    let query = supabase
      .from('purchase_receipts')
      .select(`
        id,
        receipt_number,
        receipt_date,
        po_id,
        finance_status,
        purchase_orders (
          po_number,
          supplier_id,
          project_id,
          suppliers ( name ),
          projects ( name )
        ),
        purchase_receipt_items (
          quantity,
          po_item_id,
          purchase_order_items ( unit_price )
        )
      `)
      .eq('finance_status', 'Bill Eligible');

    const { data, error } = await query;
    if (error) handleSupabaseError(error);

    return (data || []).map((row: any) => {
      let totalAmount = 0;
      for (const item of (row.purchase_receipt_items || [])) {
        if (item.purchase_order_items?.unit_price) {
          totalAmount += item.quantity * item.purchase_order_items.unit_price;
        }
      }

      return {
        id: row.id,
        receipt_number: row.receipt_number,
        receipt_date: row.receipt_date,
        po_id: row.po_id,
        po_number: row.purchase_orders?.po_number || '-',
        supplier_id: row.purchase_orders?.supplier_id || '',
        supplier_name: row.purchase_orders?.suppliers?.name || '-',
        project_id: row.purchase_orders?.project_id || '',
        project_name: row.purchase_orders?.projects?.name || '-',
        total_amount: totalAmount,
        finance_status: row.finance_status
      };
    });
  }

  async getSupplierBillOutstanding(billId: string): Promise<number> {
    const { data, error } = await supabase.from('supplier_bills').select('outstanding_amount').eq('id', billId).single();
    if (error) {
      if (error.code === 'PGRST116') return 0;
      handleSupabaseError(error);
    }
    return data?.outstanding_amount || 0;
  }

  async listSupplierBillLines(billId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('supplier_bill_lines')
      .select(`
        *,
        items ( name, code )
      `)
      .eq('bill_id', billId);
    
    if (error) handleSupabaseError(error);
    return data || [];
  }
}
