import { runMockTransaction, generateId } from './db';
import type { StockOpname, StockOpnameItem } from '../types';

export const stockOpnameService = {
  getCurrentStock(txDb: any, itemId: string): number {
    const itemMovements = txDb.query('inventory_movements', (m: any) => m.item_id === itemId);
    return itemMovements.reduce((sum: number, m: any) => m.direction === 'IN' ? sum + m.quantity : sum - m.quantity, 0);
  },

  logAudit(txDb: any, entity_type: string, entity_id: string, action: string, notes: string, created_by: string) {
    txDb.insert('audit_logs', {
      entity_type,
      entity_id,
      action,
      notes,
      
      created_by
    });
  },

  submitStockOpname(id: string, userId: string): { success: boolean, message?: string } {
    let result: any = false;
    try {
      result = runMockTransaction((txDb): any => {
        const so = txDb.getById<StockOpname>('stock_opnames', id);
        if (!so) throw new Error('Stock Opname tidak ditemukan');
        if (so.status !== 'Draft' && so.status !== 'In Progress') throw new Error(`Status tidak valid untuk disubmit: ${so.status}`);

        const items = txDb.query<any>('stock_opname_items', (i: any) => i.opname_id === id);
        if (items.length === 0) throw new Error('Tidak ada item untuk diopname');

        items.forEach((item: StockOpnameItem) => {
          if (item.difference !== 0 && (!item.reason || item.reason.trim() === '')) {
            throw new Error('Alasan wajib diisi jika ada selisih');
          }});

        txDb.update('stock_opnames', id, {
          status: 'Submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: userId
        });

        this.logAudit(txDb, 'StockOpname', id, 'Submit', 'Disubmit untuk direview', userId);
      });
    } catch (e: any) {
      return { success: false, message: e.message };
    }
    return result ? { success: true } : { success: false, message: 'Transaksi digagalkan oleh sistem' };
  },

  approveStockOpname(id: string, userId: string): { success: boolean, message?: string } {
    let result: any = false;
    try {
      result = runMockTransaction((txDb): any => {
        const so = txDb.getById<StockOpname>('stock_opnames', id);
        if (!so) throw new Error('Stock Opname tidak ditemukan');
        if (so.status !== 'Submitted') throw new Error(`Status tidak valid untuk diapprove: ${so.status}`);

        txDb.update('stock_opnames', id, {
          status: 'Approved',
          approved_at: new Date().toISOString(),
          approved_by: userId});

        this.logAudit(txDb, 'StockOpname', id, 'Approve', 'Disetujui', userId);
      });
    } catch (e: any) {
      return { success: false, message: e.message };
    }
    return result ? { success: true } : { success: false, message: 'Transaksi digagalkan oleh sistem' };
  },

  rejectStockOpname(id: string, reason: string, userId: string): { success: boolean, message?: string } {
    if (!reason) return { success: false, message: 'Alasan penolakan wajib diisi' };
    
    let result: any = false;
    try {
      result = runMockTransaction((txDb): any => {
        const so = txDb.getById<StockOpname>('stock_opnames', id);
        if (!so) throw new Error('Stock Opname tidak ditemukan');
        if (so.status !== 'Submitted') throw new Error(`Status tidak valid untuk ditolak: ${so.status}`);

        txDb.update('stock_opnames', id, {
          status: 'Draft', // return to draft
          rejected_at: new Date().toISOString(),
          rejected_by: userId,
          rejection_reason: reason
        });

        this.logAudit(txDb, 'StockOpname', id, 'Reject', `Ditolak: ${reason}`, userId);
      });
    } catch (e: any) {
      return { success: false, message: e.message };
    }
    return result ? { success: true } : { success: false, message: 'Transaksi digagalkan oleh sistem' };
  },

  postStockOpname(id: string, overrideConcurrency: boolean, overrideNotes: string, userId: string): { success: boolean, message?: string, requireOverride?: boolean } {
    const state = { requireOverride: false, errorMessage: '' };

    let result: any = false;
    try {
      result = runMockTransaction((txDb): any => {
        const so = txDb.getById<StockOpname>('stock_opnames', id);
        if (!so) throw new Error('Stock Opname tidak ditemukan');
        if (so.status !== 'Approved') throw new Error(`Hanya SO Approved yang bisa diposting. Status: ${so.status}`);
        if (so.posted_at || so.posting_transaction_id) throw new Error('Stock Opname ini sudah pernah diposting.');

        const items = txDb.query<any>('stock_opname_items', (i: any) => i.opname_id === id);
        if (items.length === 0) throw new Error('Tidak ada item');

        // Check Concurrency
        for (const item of items) {
          const currentStock = this.getCurrentStock(txDb, item.item_id);
          if (currentStock !== item.system_stock_snapshot) {
            if (!overrideConcurrency) {
              state.requireOverride = true;
              state.errorMessage = `Terdapat transaksi stok setelah stock opname dimulai untuk item ID ${item.item_id}. Snap: ${item.system_stock_snapshot}, Cur: ${currentStock}`;
              throw new Error(state.errorMessage);
            }
          }
        }

        const txId = generateId();
        const today = new Date().toISOString();

        for (const item of items) {
          if (item.difference !== 0) {
            const currentStock = this.getCurrentStock(txDb, item.item_id);
            // Stock after always becomes physical_stock (the truth) if override happens, it forces current to physical
            const adjustmentQty = Math.abs(item.physical_stock - currentStock); // recalculate difference based on current
            
            if (adjustmentQty === 0) continue; // Concurrency override might make it 0

            const isSurplus = item.physical_stock > currentStock;
            const direction = isSurplus ? 'IN' : 'OUT';
            const moveType = isSurplus ? 'Stock Opname Surplus' : 'Stock Opname Shortage';

            txDb.insert<any>('inventory_movements', {
              transaction_id: txId,
              project_id: so.project_id,
              item_id: item.item_id,
              movement_type: moveType as any,
              direction: direction,
              quantity: adjustmentQty,
              unit_cost: item.avg_cost,
              total_cost: adjustmentQty * item.avg_cost,
              stock_before: currentStock,
              stock_after: item.physical_stock,
              reference_type: 'StockOpname',
              reference_id: so.id,
              reference_number: so.document_number,
              notes: `Adjustment Stock Opname. Snapshot: ${item.system_stock_snapshot}, Physical: ${item.physical_stock}. ${overrideConcurrency ? ' (OVERRIDE)' : ''}`,
              
              created_by: userId});
          }
        }

        txDb.update('stock_opnames', id, {
          status: 'Posted',
          posted_at: today,
          posted_by: userId,
          posting_transaction_id: txId,
          notes: so.notes + (overrideConcurrency ? `\n[OVERRIDE POSTING]: ${overrideNotes}` : '')
        });

        this.logAudit(txDb, 'StockOpname', id, 'Post', `Diposting ke Inventory${overrideConcurrency ? ' dg OVERRIDE' : ''}`, userId);
      });
    } catch (e: any) {
      // Unreachable mostly because runMockTransaction catches inside
    }
    
    if (!result) {
      if (state.requireOverride) {
        return { success: false, message: state.errorMessage, requireOverride: true };
      }
      return { success: false, message: 'Transaksi digagalkan oleh sistem' };
    }
    
    return { success: true };
  },

  reverseStockAdjustment(id: string, reason: string, userId: string): { success: boolean, message?: string } {
    if (reason.length < 10) return { success: false, message: 'Alasan minimal 10 karakter' };

    let result: any = false;
    try {
      result = runMockTransaction((txDb): any => {
        const so = txDb.getById<StockOpname>('stock_opnames', id);
        if (!so) throw new Error('Stock Opname tidak ditemukan');
        if (so.status !== 'Posted') throw new Error('Hanya SO Posted yang bisa direverse');
        if (so.reversed_at || so.reversal_transaction_id) throw new Error('SO ini sudah pernah direverse');

        const originalMovements = txDb.query<any>('inventory_movements', (m: any) => m.reference_id === id && m.reference_type === 'StockOpname');
        
        const txId = generateId();
        const today = new Date().toISOString();

        for (const move of originalMovements) {
          const currentStock = this.getCurrentStock(txDb, move.item_id);
          const isSurplus = move.movement_type === 'Stock Opname Surplus';
          // Reversing a surplus means we OUT the qty
          // Reversing a shortage means we IN the qty
          const revDirection = isSurplus ? 'OUT' : 'IN';

          if (revDirection === 'OUT' && currentStock < move.quantity) {
             throw new Error(`Stok item ${move.item_id} tidak cukup untuk reverse surplus. Tersedia: ${currentStock}, Butuh: ${move.quantity}`);
          }

          const newStock = revDirection === 'IN' ? currentStock + move.quantity : currentStock - move.quantity;

          txDb.insert<any>('inventory_movements', {
            transaction_id: txId,
            project_id: so.project_id,
            item_id: move.item_id,
            movement_type: 'Reversal Stock Opname' as any,
            direction: revDirection,
            quantity: move.quantity,
            unit_cost: move.unit_cost,
            total_cost: move.total_cost,
            stock_before: currentStock,
            stock_after: newStock,
            reference_type: 'StockOpname',
            reference_id: so.id,
            reference_number: so.document_number,
            reversal_of_movement_id: move.id,
            notes: `Reversal dari Stock Opname ${so.document_number}`,
            
            created_by: userId});
        }

        txDb.update('stock_opnames', id, {
          status: 'Reversed',
          reversed_at: today,
          reversed_by: userId,
          reversal_transaction_id: txId,
          reversal_reason: reason
        });

        this.logAudit(txDb, 'StockOpname', id, 'Reverse', `Direverse: ${reason}`, userId);
      });
    } catch (e: any) {
      return { success: false, message: e.message };
    }
    
    return result ? { success: true } : { success: false, message: 'Transaksi digagalkan' };
  }
};
