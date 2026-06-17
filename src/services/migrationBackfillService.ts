import { db, runMockTransaction } from './db';
import { accountingService } from './accountingService';
import { accountingAutoJournal } from './accountingAutoJournal';
import { arApService } from './arApService';
import type { ReturnDelivery, 
  ProjectInvestment, PurchaseOrder, SalesOrder, SalesDelivery, 
  StockOpname, ProductionOrder, FeedProductionOrder, DailyChickenRecord 
} from '../types';

export const migrationBackfillService = {

  runFullBackfill() {
    return runMockTransaction(async (txDb) => {
      let count = 0;

      // Ensure seeds
      accountingService.seedDefaultChartOfAccounts();
      
      const settings = accountingService.getSettings();
      if (!settings) {
        // Create default settings if not exists
        const retained = db.query<any>('accounts', a => a.account_code === '3201')[0];
        const workerPay = db.query<any>('accounts', a => a.account_code === '2301')[0];
        const invPay = db.query<any>('accounts', a => a.account_code === '2302')[0];
        const csrPay = db.query<any>('accounts', a => a.account_code === '2303')[0];
        const compRes = db.query<any>('accounts', a => a.account_code === '2304')[0];
        
        accountingService.createSettings({
          company_name: 'SBS', currency: 'IDR', fiscal_year_start: '2023-01-01', accounting_basis: 'Accrual', inventory_costing: 'Moving Average',
          retained_earnings_account_id: retained?.id, profit_sharing_payable_worker_account_id: workerPay?.id,
          profit_sharing_payable_investor_account_id: invPay?.id, csr_payable_account_id: csrPay?.id, company_reserve_account_id: compRes?.id
        });
      }

      // Seed mapping
      const { accountingMappingService } = await import('./accountingMappingService');
      accountingMappingService.seedDefaultMappings();

      const bankAcc = db.query<any>('accounts', a => a.account_code === '1102')[0];
      const cashBankId = bankAcc ? bankAcc.id : '';

      // 1. Investor Capitals
      const invs = txDb.getAll('project_investments') as ProjectInvestment[];
      invs.forEach(inv => {
        try { accountingAutoJournal.recordInvestorCapital(txDb, inv.id, cashBankId); count++; } catch (e) {}
      });

      // 2. PO Receipts (Assume all PO with status selesai have receipt ID = PO ID for mock)
      const pos = txDb.query('purchase_orders', (p: any) => p.status === 'Selesai' || p.status === 'Diterima') as PurchaseOrder[];
      pos.forEach(po => {
        try { accountingAutoJournal.recordPurchaseReceipt(txDb, po.id, po.id, po.total_amount, cashBankId); count++; } catch (e) {}
      });

      // 3. Stock Opnames
      const sos = txDb.query('stock_opnames', (s: any) => s.status === 'Approved') as StockOpname[];
      sos.forEach(so => {
        try { accountingAutoJournal.recordStockOpname(txDb, so.id); count++; } catch (e) {}
      });

      // 4. Daily Chicken Records
      const dcr = txDb.query('daily_chicken_records', (d: any) => d.status === 'Posted') as DailyChickenRecord[];
      dcr.forEach(d => {
        try { accountingAutoJournal.recordDailyChickenRecord(txDb, d.id); count++; } catch (e) {}
      });

      // 5. Productions
      const kandang = txDb.query('production_orders', (p: any) => p.status === 'Selesai') as ProductionOrder[];
      kandang.forEach(k => {
        try { accountingAutoJournal.recordProductionCompletion(txDb, k.id, 'Kandang'); count++; } catch (e) {}
      });

      const pakan = txDb.query('feed_production_orders', (p: any) => p.status === 'Selesai') as FeedProductionOrder[];
      pakan.forEach(p => {
        try { accountingAutoJournal.recordProductionCompletion(txDb, p.id, 'Pakan'); count++; } catch (e) {}
      });

      // 6. Sales
      const sales = txDb.query('sales_orders', (s: any) => s.status === 'Completed' || s.status === 'Delivered') as SalesOrder[];
      sales.forEach(s => {
        const deliveries = txDb.query('sales_deliveries', (d: any) => d.sales_order_id === s.id) as SalesDelivery[];
        deliveries.forEach(d => {
          if (d.status === 'Delivered') {
            try { 
              const revenue = s.qty * s.unit_price; // simplified
              accountingAutoJournal.recordSalesDelivery(txDb, s.id, d.id, s.total_hpp || 0, revenue); count++; 
              // Create Invoice
              arApService.createCustomerInvoice({
                customer_id: s.customer_name,
                sales_order_id: s.id,
                sales_delivery_id: d.id,
                notes: `INV-${s.order_number}`,
                project_id: s.project_id,
                invoice_date: new Date().toISOString().split('T')[0],
                due_date: new Date().toISOString().split('T')[0],
                subtotal: revenue,
                tax: 0,
                discount: s.discount || 0,
                total_amount: revenue - (s.discount || 0)
              }, 'Admin');
            } catch (e) {}
          }
        });
      });

      // 7. Returns
      const returns = txDb.getAll<ReturnDelivery>('return_deliveries');
      returns.forEach(r => {
        try { accountingAutoJournal.recordReturnDelivery(txDb, r.id); count++; } catch (e) {}
      });

      // 8. Profit Distributions
      const dists = txDb.query('profit_distributions', (p: any) => p.status === 'Posted');
      dists.forEach(p => {
        try { accountingAutoJournal.recordProfitDistribution(txDb, p.id); count++; } catch (e) {}
      });

      return { success: true, journalsGenerated: count };
    });
  }
};
