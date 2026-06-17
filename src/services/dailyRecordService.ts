import { db, runMockTransaction, generateId } from './db.ts';
import type { 
  DailyChickenRecord, DailyFeedRecord, DailyEggRecord, Flock, 
  Item, InventoryMovement
} from '../types';

interface PostRecordResult {
  success: boolean;
  message?: string;
  transactionId?: string;
}

export const dailyRecordService = {

  createDraftRecord(data: Partial<DailyChickenRecord>, feedData: Partial<DailyFeedRecord>[], eggData: Partial<DailyEggRecord>[], user: string): PostRecordResult {
    try {
      const existing = db.getAll<DailyChickenRecord>('daily_chicken_records')
        .find(r => r.flock_id === data.flock_id && r.date === data.date && !['Cancelled', 'Reversed'].includes(r.status));
      if (existing) {
        return { success: false, message: `Sudah ada record untuk flock ini di tanggal ${data.date}.` };
      }

      let newRecordId = '';
      const success = runMockTransaction((txDb): any => {
        const count = txDb.getAll<DailyChickenRecord>('daily_chicken_records').length + 1;
        const newRecord = txDb.insert<DailyChickenRecord>('daily_chicken_records', {
          ...(data as any),
          record_number: `DCR-${data.date?.replace(/-/g, '')}-${String(count).padStart(3, '0')}`,
          status: 'Draft',
          costing_status: 'Incomplete'
        });
        newRecordId = newRecord.id;

        feedData.forEach(f => {
          txDb.insert<DailyFeedRecord>('daily_feed_records', {
            ...f as any,
            daily_record_id: newRecordId
          });
        });

        eggData.forEach(e => {
          txDb.insert<DailyEggRecord>('daily_egg_records', {
            ...e as any,
            daily_record_id: newRecordId
          });
        });

        txDb.insert('audit_logs', {
          reference_id: newRecordId,
          type: 'DailyChickenRecord',
          action: 'Created Draft',
          user,
          notes: `Draft DCR created.`
        });
      });

      return success ? { success: true, transactionId: newRecordId } : { success: false, message: 'Gagal menyimpan draft record.' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  updateRecordStatus(recordId: string, newStatus: 'Submitted' | 'Approved' | 'Rejected', user: string): PostRecordResult {
    const record = db.getById<DailyChickenRecord>('daily_chicken_records', recordId);
    if (!record) return { success: false, message: 'Record tidak ditemukan.' };

    if (newStatus === 'Submitted' && record.status !== 'Draft') return { success: false, message: 'Hanya record Draft yang bisa disubmit.' };
    if ((newStatus === 'Approved' || newStatus === 'Rejected') && record.status !== 'Submitted') return { success: false, message: 'Hanya record Submitted yang bisa di-approve/reject.' };

    const success = runMockTransaction((txDb): any => {
      txDb.update('daily_chicken_records', recordId, { status: newStatus });
      txDb.insert('audit_logs', {
        reference_id: recordId,
        type: 'DailyChickenRecord',
        action: newStatus,
        user,
        notes: `Status updated to ${newStatus}`
      });
    });

    return success ? { success: true } : { success: false, message: 'Gagal update status.' };
  },

  postDailyRecord(recordId: string, user: string): PostRecordResult {
    let transactionId = '';

    const success = runMockTransaction((txDb): any => {
      const record = txDb.getById<DailyChickenRecord>('daily_chicken_records', recordId);
      if (!record) throw new Error('Record tidak ditemukan.');
      if (record.status !== 'Approved') throw new Error('Hanya record Approved yang bisa di-posting.');
      if (record.posting_transaction_id) throw new Error('Record sudah di-posting.');

      const flock = txDb.getById<Flock>('flocks', record.flock_id);
      if (!flock) throw new Error('Flock tidak valid.');

      transactionId = generateId();
      let hasCostingIncomplete = false;

      // 1. Process Feed Consumption
      const feeds = txDb.query<DailyFeedRecord>('daily_feed_records', f => f.daily_record_id === record.id);
      let totalFeedCost = 0;
      
      feeds.forEach(f => {
        if (f.qty_consumed > 0) {
          const item = txDb.getById<Item>('items', f.feed_item_id);
          if (!item) throw new Error(`Item pakan ${f.feed_item_id} tidak ditemukan.`);
          
          // Check stock
          const invMovements = txDb.query<InventoryMovement>('inventory_movements', m => m.item_id === item.id);
          const currentStock = invMovements.reduce((acc, m) => m.direction === 'IN' ? acc + m.quantity : acc - m.quantity, 0);
          if (currentStock < f.qty_consumed) {
            throw new Error(`Stok pakan ${item.name} tidak cukup (Tersedia: ${currentStock}, Dibutuhkan: ${f.qty_consumed}).`);
          }

          const avgCost = item.avg_cost || 0;
          if (avgCost === 0) hasCostingIncomplete = true;
          const cost = avgCost * f.qty_consumed;
          totalFeedCost += cost;

          txDb.update('daily_feed_records', f.id, { avg_cost: avgCost });

          txDb.insert('inventory_movements', {
            transaction_id: transactionId,
            project_id: record.project_id,
            item_id: item.id,
            movement_type: 'Konsumsi Pakan Harian',
            direction: 'OUT',
            quantity: f.qty_consumed,
            unit_cost: avgCost,
            total_cost: cost,
            stock_before: currentStock,
            stock_after: currentStock - f.qty_consumed,
            notes: `DCR: ${record.record_number}`
          });
        }
      });

      // 2. Process Egg Production
      const eggs = txDb.query<DailyEggRecord>('daily_egg_records', e => e.daily_record_id === record.id);
      let totalQtyGood = 0;
      let totalQtyProduced = 0;
      let totalQtyDamaged = 0;

      eggs.forEach(e => {
        totalQtyProduced += e.qty_total;
        totalQtyGood += e.qty_good;
        totalQtyDamaged += (e.qty_cracked + e.qty_broken);

        if (e.qty_good > 0) {
          const item = txDb.getById<Item>('items', e.inventory_item_id);
          if (!item) throw new Error(`Item telur ${e.inventory_item_id} tidak ditemukan.`);

          const invMovements = txDb.query<InventoryMovement>('inventory_movements', m => m.item_id === item.id);
          const currentStock = invMovements.reduce((acc, m) => m.direction === 'IN' ? acc + m.quantity : acc - m.quantity, 0);
          
          txDb.insert('inventory_movements', {
            transaction_id: transactionId,
            project_id: record.project_id,
            item_id: item.id,
            movement_type: 'Produksi Telur Harian',
            direction: 'IN',
            quantity: e.qty_good,
            unit_cost: 0, // Cost assigned later or average
            total_cost: 0,
            stock_before: currentStock,
            stock_after: currentStock + e.qty_good,
            notes: `DCR: ${record.record_number}`
          });
        }
      });

      // 3. Process Chicken Mortality/Out
      const invMovementsPop = txDb.query<InventoryMovement>('inventory_movements', m => m.item_id === flock.inventory_item_id);
      let currentPopStock = invMovementsPop.reduce((acc, m) => m.direction === 'IN' ? acc + m.quantity : acc - m.quantity, 0);
      const popItem = txDb.getById<Item>('items', flock.inventory_item_id);
      const popAvgCost = popItem?.avg_cost || 0;

      if (record.chicken_in > 0) {
        txDb.insert('inventory_movements', {
          transaction_id: transactionId,
          project_id: record.project_id,
          item_id: flock.inventory_item_id,
          movement_type: 'Ayam Masuk',
          direction: 'IN',
          quantity: record.chicken_in,
          unit_cost: popAvgCost,
          total_cost: popAvgCost * record.chicken_in,
          stock_before: currentPopStock,
          stock_after: currentPopStock + record.chicken_in,
          notes: `DCR: ${record.record_number}`
        });
        currentPopStock += record.chicken_in;
      }

      const totalOut = record.chicken_dead + record.chicken_missing + record.chicken_culled + record.chicken_out;
      if (totalOut > currentPopStock) {
        throw new Error(`Stok ayam tidak cukup untuk mutasi keluar (Tersedia: ${currentPopStock}, Mutasi Keluar: ${totalOut}).`);
      }

      if (record.chicken_dead > 0) {
        txDb.insert('inventory_movements', {
          transaction_id: transactionId,
          project_id: record.project_id,
          item_id: flock.inventory_item_id,
          movement_type: 'Ayam Mati',
          direction: 'OUT',
          quantity: record.chicken_dead,
          unit_cost: popAvgCost,
          total_cost: popAvgCost * record.chicken_dead,
          stock_before: currentPopStock,
          stock_after: currentPopStock - record.chicken_dead,
          notes: `DCR: ${record.record_number}`
        });
        currentPopStock -= record.chicken_dead;
      }

      if (record.chicken_missing > 0) {
        txDb.insert('inventory_movements', {
          transaction_id: transactionId,
          project_id: record.project_id,
          item_id: flock.inventory_item_id,
          movement_type: 'Ayam Hilang',
          direction: 'OUT',
          quantity: record.chicken_missing,
          unit_cost: popAvgCost,
          total_cost: popAvgCost * record.chicken_missing,
          stock_before: currentPopStock,
          stock_after: currentPopStock - record.chicken_missing,
          notes: `DCR: ${record.record_number}`
        });
        currentPopStock -= record.chicken_missing;
      }

      if (record.chicken_culled > 0) {
        txDb.insert('inventory_movements', {
          transaction_id: transactionId,
          project_id: record.project_id,
          item_id: flock.inventory_item_id,
          movement_type: 'Ayam Afkir',
          direction: 'OUT',
          quantity: record.chicken_culled,
          unit_cost: popAvgCost,
          total_cost: popAvgCost * record.chicken_culled,
          stock_before: currentPopStock,
          stock_after: currentPopStock - record.chicken_culled,
          notes: `DCR: ${record.record_number}`
        });
        currentPopStock -= record.chicken_culled;
      }

      // chicken_out (Operasional Keluar, e.g. manual adjustments, not delivery)
      if (record.chicken_out > 0) {
        txDb.insert('inventory_movements', {
          transaction_id: transactionId,
          project_id: record.project_id,
          item_id: flock.inventory_item_id,
          movement_type: 'Ayam Keluar',
          direction: 'OUT',
          quantity: record.chicken_out,
          unit_cost: popAvgCost,
          total_cost: popAvgCost * record.chicken_out,
          stock_before: currentPopStock,
          stock_after: currentPopStock - record.chicken_out,
          notes: `DCR: ${record.record_number} (Operasional / Bukan DO)`
        });
        currentPopStock -= record.chicken_out;
      }

      // 4. Update Costing and KPI
      const totalDailyCost = totalFeedCost + (record.total_vitamin_cost || 0) + (record.total_labor_cost || 0) + (record.total_utility_cost || 0) + (record.total_other_cost || 0);
      const costPerEgg = totalQtyGood > 0 ? (totalDailyCost / totalQtyGood) : 0;
      const hdp = flock.initial_population > 0 ? (totalQtyProduced / record.start_population) * 100 : 0;
      const fcr = totalQtyProduced > 0 ? (feeds.reduce((sum, f) => sum + f.qty_consumed, 0) / (totalQtyProduced * 0.06)) : 0; // Assume 1 egg ~ 60g for simple FCR if qty_produced is in Butir. Real FCR uses Kg. We just save a mock ratio or skip.
      const mortalityRate = flock.initial_population > 0 ? (record.chicken_dead / flock.initial_population) * 100 : 0;

      txDb.update('daily_chicken_records', recordId, {
        status: 'Posted',
        posted_at: new Date().toISOString(),
        posted_by: user,
        posting_transaction_id: transactionId,
        total_feed_cost: totalFeedCost,
        total_daily_cost: totalDailyCost,
        cost_per_egg: costPerEgg,
        hdp: hdp,
        fcr: fcr, // just a placeholder formula
        mortality_rate: mortalityRate,
        costing_status: hasCostingIncomplete ? 'Incomplete' : 'Valid'
      });

      txDb.insert('audit_logs', {
        reference_id: recordId,
        type: 'DailyChickenRecord',
        action: 'Posted',
        user,
        notes: `DCR Posted successfully.`
      });
    });

    if (success) {
      return { success: true, transactionId };
    } else {
      return { success: false, message: 'Gagal melakukan posting. Rollback dilakukan.' };
    }
  },

  reverseDailyRecord(recordId: string, reason: string, user: string): PostRecordResult {
    if (!reason || reason.length < 10) return { success: false, message: 'Alasan reversal minimal 10 karakter.' };

    let reversalTxId = '';
    const success = runMockTransaction((txDb): any => {
      const record = txDb.getById<DailyChickenRecord>('daily_chicken_records', recordId);
      if (!record) throw new Error('Record tidak ditemukan.');
      if (record.status !== 'Posted') throw new Error('Hanya record Posted yang bisa di-reverse.');
      if (record.reversal_transaction_id) throw new Error('Record sudah direverse.');

      reversalTxId = generateId();

      // Find all movements generated by posting_transaction_id
      const movements = txDb.query<InventoryMovement>('inventory_movements', m => m.transaction_id === record.posting_transaction_id);
      
      // Reverse them chronologically backwards or just invert direction
      for (const m of movements) {
        const item = txDb.getById<Item>('items', m.item_id);
        if (!item) continue;
        
        const currentInv = txDb.query<InventoryMovement>('inventory_movements', im => im.item_id === item.id);
        const currentStock = currentInv.reduce((acc, cur) => cur.direction === 'IN' ? acc + cur.quantity : acc - cur.quantity, 0);
        
        const reverseDirection = m.direction === 'IN' ? 'OUT' : 'IN';
        
        // If reversing an IN movement (meaning we take stock out), check if we have enough stock
        if (reverseDirection === 'OUT' && currentStock < m.quantity) {
          throw new Error(`Stok item ${item.name} tidak cukup untuk direverse (Tersedia: ${currentStock}, Butuh ditarik: ${m.quantity}).`);
        }

        txDb.insert('inventory_movements', {
          transaction_id: reversalTxId,
          project_id: m.project_id,
          item_id: m.item_id,
          movement_type: 'Reversal ' + m.movement_type,
          direction: reverseDirection,
          quantity: m.quantity,
          unit_cost: m.unit_cost,
          total_cost: m.total_cost,
          stock_before: currentStock,
          stock_after: reverseDirection === 'IN' ? currentStock + m.quantity : currentStock - m.quantity,
          notes: `Reversal DCR: ${record.record_number}. Alasan: ${reason}`
        });
      }

      txDb.update('daily_chicken_records', recordId, {
        status: 'Reversed',
        reversed_at: new Date().toISOString(),
        reversed_by: user,
        reversal_reason: reason,
        reversal_transaction_id: reversalTxId
      });

      txDb.insert('audit_logs', {
        reference_id: recordId,
        type: 'DailyChickenRecord',
        action: 'Reversed',
        user,
        notes: `Reversal reason: ${reason}`
      });
    });

    if (success) {
      return { success: true, transactionId: reversalTxId };
    } else {
      return { success: false, message: 'Gagal melakukan reversal. Rollback dilakukan.' };
    }
  }

};
