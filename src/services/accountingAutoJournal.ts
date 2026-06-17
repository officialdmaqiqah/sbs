// db is not used directly
import { accountingService } from './accountingService';
import { accountingMappingService } from './accountingMappingService';
import type { 
  ProjectInvestment, 
  ProductionOrder, FeedProductionOrder, StockOpname, 
  DailyChickenRecord, DailyFeedRecord, DailyEggRecord, 
  SalesOrder, SalesDelivery, ReturnDelivery, JournalEntryLine, Item, SalesDeliveryItem,  
} from '../types';

export const accountingAutoJournal = {

  recordInvestorCapital(txDb: any, investmentId: string, cashBankAccountId: string) {
    const inv = txDb.getById('project_investments', investmentId) as ProjectInvestment;
    if (!inv) throw new Error('Investment not found');

    const capitalAccount = accountingMappingService.getMapping('Event', 'Investor Capital');
    if (!capitalAccount) throw new Error('Mapping for Investor Capital not found');

    const header = {
      journal_number: `JRN-INV-${inv.id.substring(0, 5)}`,
      journal_date: new Date().toISOString().split('T')[0],
      project_id: inv.project_id,
      source_type: 'Investor Capital',
      source_id: inv.id,
        description: `Penerimaan modal investor ${inv.investor_id}`,
        created_by: 'System'
      };

    const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [
      {
        account_id: cashBankAccountId,
        project_id: inv.project_id,
        description: 'Penerimaan Kas Modal',
        debit: inv.amount,
        credit: 0,
        investor_id: inv.investor_id
      },
      {
        account_id: capitalAccount,
        project_id: inv.project_id,
        description: 'Modal Investor',
        debit: 0,
        credit: inv.amount,
        investor_id: inv.investor_id
      }
    ];

    const draft = accountingService.createDraftJournal(header, lines);
    if (!draft.success) throw new Error(draft.message);
    accountingService.postJournal(draft.journalId!, 'System', txDb);
  },

  recordStockOpname(txDb: any, opnameId: string) {
    const so = txDb.getById('stock_opnames', opnameId) as StockOpname;
    if (!so || so.status !== 'Approved') return;

    const items = txDb.query('stock_opname_items', (i: any) => i.stock_opname_id === opnameId);
    
    // Check if journal exists
    if (!accountingService.ensureJournalNotDuplicated('Stock Opname', opnameId)) return;

    // let totalDebit = 0;
    // let totalCredit = 0;
    const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [];

    const shortageAcc = accountingMappingService.getMapping('Event', 'Stock Opname Shortage');
    const surplusAcc = accountingMappingService.getMapping('Event', 'Stock Opname Surplus');

    if (!shortageAcc || !surplusAcc) throw new Error('Missing Stock Opname accounting mappings');

    for (const item of items) {
      if (item.difference === 0) continue;
      
      const invItem = txDb.getById('items', item.item_id) as Item;
      const invAcc = accountingMappingService.getMapping('Inventory Category', invItem.category);
      if (!invAcc) throw new Error(`Missing Inventory mapping for category: ${invItem.category}`);

      const diffVal = Math.abs(item.difference) * (invItem.avg_cost || 0);

      if (item.difference < 0) {
        // Shortage: Debit Kerugian, Credit Persediaan
        lines.push({ account_id: shortageAcc, project_id: so.project_id, description: `Shortage SO ${invItem.name}`, debit: diffVal, credit: 0, item_id: invItem.id });
        lines.push({ account_id: invAcc, project_id: so.project_id, description: `Shortage SO ${invItem.name}`, debit: 0, credit: diffVal, item_id: invItem.id });
      } else {
        // Surplus: Debit Persediaan, Credit Keuntungan
        lines.push({ account_id: invAcc, project_id: so.project_id, description: `Surplus SO ${invItem.name}`, debit: diffVal, credit: 0, item_id: invItem.id });
        lines.push({ account_id: surplusAcc, project_id: so.project_id, description: `Surplus SO ${invItem.name}`, debit: 0, credit: diffVal, item_id: invItem.id });
      }
    }

    if (lines.length > 0) {
      const header = {
        journal_number: `JRN-SO-${so.id.substring(0, 5)}`,
        journal_date: so.date,
        project_id: so.project_id,
        source_type: 'Stock Opname',
        source_id: so.id,
        description: `Penyesuaian Stok Opname`
      , created_by: 'System' };
      const draft = accountingService.createDraftJournal(header, lines);
      if (draft.success) accountingService.postJournal(draft.journalId!, 'System', txDb);
    }
  },

  recordDailyChickenRecord(txDb: any, recordId: string) {
    const rec = txDb.getById('daily_chicken_records', recordId) as DailyChickenRecord;
    if (!rec || rec.status !== 'Posted') return;
    if (!accountingService.ensureJournalNotDuplicated('Daily Record', recordId)) return;

    const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [];
    const projId = rec.project_id;

    // 1. Ayam Mati
    if (rec.chicken_dead > 0) {
      const accMati = accountingMappingService.getMapping('Event', 'Ayam Mati');
      const invAyam = accountingMappingService.getMapping('Inventory Category', 'Ayam');
      const flock = txDb.getById('flocks', rec.flock_id);
      const itemAyam = txDb.getById('items', flock.inventory_item_id) as Item;
      
      if (!accMati || !invAyam) throw new Error('Missing Ayam mapping');
      
      const val = rec.chicken_dead * (itemAyam.avg_cost || 0);
      lines.push({ account_id: accMati, project_id: projId, description: `Ayam Mati`, debit: val, credit: 0 });
      lines.push({ account_id: invAyam, project_id: projId, description: `Ayam Mati`, debit: 0, credit: val });
    }

    // 2. Ayam Hilang
    if (rec.chicken_missing > 0) {
      const accHilang = accountingMappingService.getMapping('Event', 'Ayam Hilang');
      const invAyam = accountingMappingService.getMapping('Inventory Category', 'Ayam');
      const flock = txDb.getById('flocks', rec.flock_id);
      const itemAyam = txDb.getById('items', flock.inventory_item_id) as Item;
      
      if (!accHilang || !invAyam) throw new Error('Missing Ayam mapping');
      
      const val = rec.chicken_missing * (itemAyam.avg_cost || 0);
      lines.push({ account_id: accHilang, project_id: projId, description: `Ayam Hilang`, debit: val, credit: 0 });
      lines.push({ account_id: invAyam, project_id: projId, description: `Ayam Hilang`, debit: 0, credit: val });
    }

    // 3. Pakan & Produksi Telur
    const feeds = txDb.query('daily_feed_records', (f: any) => f.daily_record_id === recordId) as DailyFeedRecord[];
    const eggs = txDb.query('daily_egg_records', (e: any) => e.daily_record_id === recordId) as DailyEggRecord[];
    
    let totalBiayaPakan = 0;
    feeds.forEach(f => {
      const val = f.qty_consumed * (f.avg_cost || 0);
      totalBiayaPakan += val;
      const invPakan = accountingMappingService.getMapping('Inventory Category', 'Pakan Jadi');
      const hppTelurDP = accountingMappingService.getMapping('Event', 'Biaya Produksi Telur');
      if (!invPakan || !hppTelurDP) throw new Error('Missing Pakan/HPP Telur mapping');
      
      lines.push({ account_id: hppTelurDP, project_id: projId, description: `Konsumsi Pakan`, debit: val, credit: 0 });
      lines.push({ account_id: invPakan, project_id: projId, description: `Konsumsi Pakan`, debit: 0, credit: val });
    });

    let totalTelurMasuk = 0;
    eggs.forEach(e => {
      if (e.qty_good > 0) {
        totalTelurMasuk += e.qty_good;
      }
    });

    if (totalTelurMasuk > 0 && totalBiayaPakan > 0) {
      // Transfer cost from HPP Telur DP to Persediaan Telur
      const invTelur = accountingMappingService.getMapping('Inventory Category', 'Telur');
      const hppTelurDP = accountingMappingService.getMapping('Event', 'Biaya Produksi Telur');
      if (!invTelur || !hppTelurDP) throw new Error('Missing Telur mapping');

      lines.push({ account_id: invTelur, project_id: projId, description: `Produksi Telur`, debit: totalBiayaPakan, credit: 0 });
      lines.push({ account_id: hppTelurDP, project_id: projId, description: `Produksi Telur`, debit: 0, credit: totalBiayaPakan });
    }

    if (lines.length > 0) {
      const header = {
        journal_number: `JRN-DR-${rec.id.substring(0, 5)}`,
        journal_date: rec.date,
        project_id: projId,
        source_type: 'Daily Record',
        source_id: rec.id,
        description: `Operasional Harian Ayam`
      , created_by: 'System' };
      const draft = accountingService.createDraftJournal(header, lines);
      if (draft.success) accountingService.postJournal(draft.journalId!, 'System', txDb);
    }
  },

  recordPurchaseReceipt(txDb: any, purchaseOrderId: string, receiptId: string, amount: number, cashBankAccountId?: string) {
    if (!accountingService.ensureJournalNotDuplicated('Purchase Receipt', receiptId)) return;
    
    const po = txDb.getById('purchase_orders', purchaseOrderId);
    if (!po) return;

    const hutangAcc = accountingMappingService.getMapping('Event', 'Hutang Supplier');
    const creditAcc = cashBankAccountId || hutangAcc;
    const items = txDb.query('purchase_order_items', (i: any) => i.purchase_order_id === purchaseOrderId);
    
    const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [];
    
    if (items.length > 0) {
      const invItem = txDb.getById('items', items[0].item_id) as Item;
      const invMapAcc = accountingMappingService.getMapping('Inventory Category', invItem.category);
      if (invMapAcc && creditAcc) {
        lines.push({ account_id: invMapAcc, project_id: po.project_id, description: `Penerimaan Barang PO ${po.po_number}`, debit: amount, credit: 0, supplier_id: po.supplier_id });
        lines.push({ account_id: creditAcc, project_id: po.project_id, description: `Pembayaran/Hutang PO ${po.po_number}`, debit: 0, credit: amount, supplier_id: po.supplier_id });
      }
    }

    if (lines.length > 0) {
      const header = {
        journal_number: `JRN-PO-${receiptId.substring(0, 5)}`,
        journal_date: new Date().toISOString().split('T')[0],
        project_id: po.project_id,
        source_type: 'Purchase Receipt',
        source_id: receiptId,
        description: `Penerimaan PO ${po.po_number}`,
        created_by: 'System'
      };
      const draft = accountingService.createDraftJournal(header, lines);
      if (draft.success) accountingService.postJournal(draft.journalId!, 'System', txDb);
    }
  },

  recordSalesDelivery(txDb: any, salesOrderId: string, deliveryId: string, hppAmount: number, revenueAmount: number) {
    if (!accountingService.ensureJournalNotDuplicated('Sales Delivery', deliveryId)) return;
    const so = txDb.getById('sales_orders', salesOrderId) as SalesOrder;
    if (!so) return;

    const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [];
    const projId = so.project_id;

    // 1. Revenue Recognition
    const piutangAcc = accountingMappingService.getMapping('Event', 'Piutang Usaha');
    const revenueAcc = accountingMappingService.getMapping('Product Revenue', so.order_type === 'Paket' ? 'Paket' : 'Ayam'); 
    
    if (piutangAcc && revenueAcc) {
      lines.push({ account_id: piutangAcc, project_id: projId, description: `Piutang SO ${so.order_number}`, debit: revenueAmount, credit: 0, customer_id: so.customer_name });
      lines.push({ account_id: revenueAcc, project_id: projId, description: `Pendapatan SO ${so.order_number}`, debit: 0, credit: revenueAmount, customer_id: so.customer_name });
    }

    // 2. COGS (HPP) Recognition
    const invAcc = accountingMappingService.getMapping('Product COGS Inventory', so.order_type === 'Paket' ? 'Paket' : 'Ayam');
    const cogsAcc = accountingMappingService.getMapping('Product COGS', so.order_type === 'Paket' ? 'Paket' : 'Ayam');

    if (invAcc && cogsAcc && hppAmount > 0) {
      lines.push({ account_id: cogsAcc, project_id: projId, description: `HPP Pengiriman SO ${so.order_number}`, debit: hppAmount, credit: 0, item_id: so.order_type });
      lines.push({ account_id: invAcc, project_id: projId, description: `Persediaan Keluar SO ${so.order_number}`, debit: 0, credit: hppAmount, item_id: so.order_type });
    }

    if (lines.length > 0) {
      const header = {
        journal_number: `JRN-DO-${deliveryId.substring(0, 5)}`,
        journal_date: new Date().toISOString().split('T')[0],
        project_id: projId,
        source_type: 'Sales Delivery',
        source_id: deliveryId,
        description: `Pengiriman Penjualan SO ${so.order_number}`,
        created_by: 'System'
      };
      const draft = accountingService.createDraftJournal(header, lines);
      if (draft.success) accountingService.postJournal(draft.journalId!, 'System', txDb);
    }
  },

  recordReturnDelivery(txDb: any, returnId: string) {
    if (!accountingService.ensureJournalNotDuplicated('Return Delivery', returnId)) return;
    const ret = txDb.getById('return_deliveries', returnId) as ReturnDelivery;
    if (!ret) return;

    const doItem = txDb.getById('sales_delivery_items', ret.item_id) as SalesDeliveryItem;
    if (!doItem) return;

    const delivery = txDb.getById('sales_deliveries', doItem.sales_delivery_id) as SalesDelivery;
    if (!delivery) return;

    const so = txDb.getById('sales_orders', delivery.sales_order_id) as SalesOrder;
    if (!so) return;

    const soItems = txDb.query('sales_order_items', (i: any) => i.sales_order_id === so.id && i.item_id === doItem.inventory_item_id);
    const soItem = soItems[0];
    if (!soItem) return;

    const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [];
    const projId = delivery.project_id;
    const qty = ret.qty_returned;

    const hppAmount = qty * doItem.unit_hpp;
    const revenueAmount = qty * (soItem.unit_price - soItem.discount_amount);

    const productCat = so.order_type === 'Paket' ? 'Paket' : 'Ayam';

    // 1. Revenue Reversal
    const returnAcc = accountingMappingService.getMapping('Product Return', productCat) || accountingMappingService.getMapping('Event', 'Retur dan Potongan Penjualan');
    const piutangAcc = accountingMappingService.getMapping('Event', 'Piutang Usaha');
    const hutangRefund = accountingMappingService.getMapping('Event', 'Hutang Refund Customer');

    const refundCreditAcc = hutangRefund || piutangAcc;

    if (returnAcc && refundCreditAcc) {
      lines.push({ account_id: returnAcc, project_id: projId, description: `Retur Penjualan SO ${so.order_number}`, debit: revenueAmount, credit: 0, customer_id: delivery.customer_name });
      lines.push({ account_id: refundCreditAcc, project_id: projId, description: `Refund/Piutang Retur SO ${so.order_number}`, debit: 0, credit: revenueAmount, customer_id: delivery.customer_name });
    }

    // 2. Inventory / COGS Reversal based on decision
    const cogsAcc = accountingMappingService.getMapping('Product COGS', productCat);
    
    if (cogsAcc && hppAmount > 0) {
      if (ret.decision === 'Masuk stok kembali') {
        const invAcc = accountingMappingService.getMapping('Product COGS Inventory', productCat);
        if (invAcc) {
          lines.push({ account_id: invAcc, project_id: projId, description: `Persediaan Masuk (Retur) SO ${so.order_number}`, debit: hppAmount, credit: 0, item_id: doItem.inventory_item_id });
          lines.push({ account_id: cogsAcc, project_id: projId, description: `Pembalikan HPP SO ${so.order_number}`, debit: 0, credit: hppAmount, item_id: doItem.inventory_item_id });
        }
      } else if (ret.decision === 'Karantina') {
        const karantinaAcc = accountingMappingService.getMapping('Inventory Category', 'Karantina') || accountingMappingService.getMapping('Event', 'Persediaan Barang Karantina');
        if (karantinaAcc) {
          lines.push({ account_id: karantinaAcc, project_id: projId, description: `Persediaan Karantina (Retur) SO ${so.order_number}`, debit: hppAmount, credit: 0, item_id: doItem.inventory_item_id });
          lines.push({ account_id: cogsAcc, project_id: projId, description: `Pembalikan HPP SO ${so.order_number}`, debit: 0, credit: hppAmount, item_id: doItem.inventory_item_id });
        }
      } else if (ret.decision === 'Write-off') {
        const writeOffAcc = accountingMappingService.getMapping('Event', 'Kerugian Retur dan Write-off');
        if (writeOffAcc) {
          lines.push({ account_id: writeOffAcc, project_id: projId, description: `Kerugian Retur/Write-off SO ${so.order_number}`, debit: hppAmount, credit: 0, item_id: doItem.inventory_item_id });
          lines.push({ account_id: cogsAcc, project_id: projId, description: `Pembalikan HPP SO ${so.order_number}`, debit: 0, credit: hppAmount, item_id: doItem.inventory_item_id });
        }
      }
    }

    if (lines.length > 0) {
      const header = {
        journal_number: `JRN-RET-${ret.return_number}`,
        journal_date: new Date().toISOString().split('T')[0],
        project_id: projId,
        source_type: 'Return Delivery',
        source_id: ret.id,
        description: `Retur Penjualan DO ${delivery.delivery_number} (${ret.decision})`,
        created_by: 'System'
      };
      const draft = accountingService.createDraftJournal(header, lines);
      if (draft.success) accountingService.postJournal(draft.journalId!, 'System', txDb);
    }
  },

  recordProductionCompletion(txDb: any, orderId: string, type: 'Kandang' | 'Pakan') {
    if (!accountingService.ensureJournalNotDuplicated('Production', orderId)) return;
    
    let order, items, resultItemId;
    const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [];
    
    if (type === 'Kandang') {
      order = txDb.getById('production_orders', orderId) as ProductionOrder;
      if (!order) return;
      items = txDb.query('production_order_items', (i: any) => i.production_order_id === orderId);
      const kandangItem = txDb.query('items', (i: any) => i.category === 'Kandang Jadi')[0];
      resultItemId = kandangItem ? kandangItem.id : null;
    } else {
      order = txDb.getById('feed_production_orders', orderId) as FeedProductionOrder;
      if (!order) return;
      items = txDb.query('feed_production_order_items', (i: any) => i.feed_production_order_id === orderId);
      const recipe = txDb.getById('feed_recipes', order.recipe_id);
      resultItemId = recipe.result_item_id;
    }

    const projId = order.project_id;
    const resultItem = txDb.getById('items', resultItemId) as Item;
    const invResultAcc = accountingMappingService.getMapping('Inventory Category', resultItem?.category || (type === 'Kandang' ? 'Kandang Jadi' : 'Pakan Jadi'));
    
    if (!invResultAcc) return;

    // Credit all raw materials
    let materialsCost = 0;
    items.forEach((item: any) => {
      const rm = txDb.getById('items', item.item_id) as Item;
      const rmAcc = accountingMappingService.getMapping('Inventory Category', rm.category);
      if (rmAcc) {
        const cost = item.total_cost || (item.actual_qty * (rm.avg_cost || 0));
        materialsCost += cost;
        lines.push({ account_id: rmAcc, project_id: projId, description: `Bahan Produksi ${rm.name}`, debit: 0, credit: cost, item_id: rm.id });
      }
    });

    // Debit finished goods
    lines.push({ account_id: invResultAcc, project_id: projId, description: `Hasil Produksi ${resultItem?.name || type}`, debit: materialsCost, credit: 0, item_id: resultItemId });

    if (lines.length > 0) {
      const header = {
        journal_number: `JRN-PRD-${orderId.substring(0, 5)}`,
        journal_date: new Date().toISOString().split('T')[0], // typically should use order date, but using today for MVP
        project_id: projId,
        source_type: 'Production',
        source_id: orderId,
        description: `Penyelesaian Produksi ${type}`,
        created_by: 'System'
      };
      const draft = accountingService.createDraftJournal(header, lines);
      if (draft.success) accountingService.postJournal(draft.journalId!, 'System', txDb);
    }
  },

  recordProfitDistribution(txDb: any, distributionId: string) {
    if (!accountingService.ensureJournalNotDuplicated('Profit Distribution', distributionId)) return;
    const dist = txDb.getById('profit_distributions', distributionId) as any;
    if (!dist) return;

    const retainedEarningsAcc = accountingMappingService.getMapping('Profit Distribution', 'Retained Earnings');
    const reserveAcc = accountingMappingService.getMapping('Profit Distribution', 'Company Reserve Payable');
    const workerAcc = accountingMappingService.getMapping('Profit Distribution', 'Worker Profit Payable');
    const investorAcc = accountingMappingService.getMapping('Profit Distribution', 'Investor Profit Payable');
    const csrAcc = accountingMappingService.getMapping('Profit Distribution', 'CSR Payable');

    if (!retainedEarningsAcc || !reserveAcc || !workerAcc || !investorAcc || !csrAcc) return;

    const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [
      { account_id: retainedEarningsAcc, project_id: dist.project_id, description: 'Laba Project Dialokasikan', debit: dist.net_profit, credit: 0 },
      { account_id: reserveAcc, project_id: dist.project_id, description: 'Alokasi Kas Perusahaan', debit: 0, credit: dist.company_reserve },
      { account_id: workerAcc, project_id: dist.project_id, description: 'Hutang Bagi Hasil Pekerja', debit: 0, credit: dist.worker_pool },
      { account_id: investorAcc, project_id: dist.project_id, description: 'Hutang Bagi Hasil Investor', debit: 0, credit: dist.investor_pool },
      { account_id: csrAcc, project_id: dist.project_id, description: 'Hutang CSR', debit: 0, credit: dist.csr }
    ];

    const header = {
      journal_number: `JRN-DIST-${dist.id.substring(0, 5)}`,
      journal_date: new Date().toISOString().split('T')[0],
      project_id: dist.project_id,
      source_type: 'Profit Distribution',
      source_id: dist.id,
      description: `Profit Distribution Project`
    , created_by: 'System' };

    const draft = accountingService.createDraftJournal(header, lines);
    if (draft.success) accountingService.postJournal(draft.journalId!, 'System', txDb);
  }

};
