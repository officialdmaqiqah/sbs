import { db, generateId, runMockTransaction } from './db';
import type { ProfitDistribution, ProfitDistributionPayout, JournalEntry, JournalEntryLine, AccountingSetting } from '../types';
import { projectClosingService } from './projectClosingService';

export const profitDistributionService = {
  getDistributions(): ProfitDistribution[] {
    return db.getAll<ProfitDistribution>('profit_distributions').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getPayouts(distributionId: string): ProfitDistributionPayout[] {
    return db.getAll<ProfitDistributionPayout>('profit_distribution_payouts').filter(p => p.profit_distribution_id === distributionId);
  },

  generateDraftDistribution(projectId: string, userId: string): ProfitDistribution {
    const pl = projectClosingService.getProjectPL(projectId);
    const netProfit = pl.net_project_profit;

    if (netProfit <= 0) {
      const dist: ProfitDistribution = {
        id: generateId(),
        project_id: projectId,
        net_profit: netProfit,
        company_reserve: 0,
        remaining_profit: 0,
        worker_pool: 0,
        investor_pool: 0,
        csr: 0,
        rounding_difference: 0,
        status: 'No Distribution',
        created_at: new Date().toISOString(),
        created_by: userId
      };
      db.insert('profit_distributions', dist);
      return dist;
    }

    const companyReserve = Math.round(netProfit * 0.10);
    const remainingProfit = netProfit - companyReserve;
    const workerPool = Math.round(remainingProfit * 0.45);
    const investorPool = Math.round(remainingProfit * 0.45);
    const csr = Math.round(remainingProfit * 0.10);

    const calculatedTotal = companyReserve + workerPool + investorPool + csr;
    const roundingDifference = netProfit - calculatedTotal;

    // Add rounding diff to company reserve
    const finalCompanyReserve = companyReserve + roundingDifference;

    const dist: ProfitDistribution = {
      id: generateId(),
      project_id: projectId,
      net_profit: netProfit,
      company_reserve: finalCompanyReserve,
      remaining_profit: remainingProfit,
      worker_pool: workerPool,
      investor_pool: investorPool,
      csr: csr,
      rounding_difference: roundingDifference,
      status: 'Draft',
      created_at: new Date().toISOString(),
      created_by: userId
    };

    db.insert('profit_distributions', dist);
    
    db.insert('audit_logs', {
      id: generateId(), action: 'GENERATE_DRAFT_DISTRIBUTION', entity_type: 'profit_distributions', entity_id: dist.id, user: userId, timestamp: new Date().toISOString(), details: `Generated draft for project ${projectId} with net profit ${netProfit}`
    });

    return dist;
  },

  approveDistribution(distId: string, userId: string): ProfitDistribution {
    const dist = this.getDistributions().find(d => d.id === distId);
    if (!dist) throw new Error("Distribution not found");
    if (dist.status !== 'Draft' && dist.status !== 'Reviewed') throw new Error("Invalid status for approval");

    dist.status = 'Approved';
    db.update('profit_distributions', dist.id, dist);

    db.insert('audit_logs', {
      id: generateId(), action: 'APPROVE_DISTRIBUTION', entity_type: 'profit_distributions', entity_id: dist.id, user: userId, timestamp: new Date().toISOString()
    });

    return dist;
  },

  postDistribution(distId: string, userId: string): ProfitDistribution {
    return runMockTransaction(txDb => {
      const dist = txDb.getAll<ProfitDistribution>('profit_distributions').find(d => d.id === distId);
      if (!dist) throw new Error("Distribution not found");
      if (dist.status !== 'Approved') throw new Error("Only Approved distributions can be posted");

      const settings = txDb.getAll<AccountingSetting>('accounting_settings')[0];
      if (!settings || !settings.retained_earnings_account_id) throw new Error("Accounting settings or Retained Earnings account missing");

      const reAccount = settings.retained_earnings_account_id;
      const workerPayable = settings.profit_sharing_payable_worker_account_id || reAccount; // fallback
      const investorPayable = settings.profit_sharing_payable_investor_account_id || reAccount;
      const csrPayable = settings.csr_payable_account_id || reAccount;
      const companyReservePayable = settings.company_reserve_account_id || reAccount;

      // Create Journal
      const journal: JournalEntry = {
        id: generateId(),
        journal_number: `JE-DIST-${Date.now().toString().slice(-6)}`,
        journal_date: new Date().toISOString().split('T')[0],
        project_id: dist.project_id,
        source_type: 'Profit Distribution',
        source_id: dist.id,
        description: `Profit Distribution Posting for Project ${dist.project_id}`,
        status: 'Posted',
        total_debit: dist.net_profit,
        total_credit: dist.net_profit,
        posted_at: new Date().toISOString(),
        posted_by: userId,
        created_at: new Date().toISOString(),
        created_by: userId
      };

      txDb.insert('journal_entries', journal);

      // Debit RE / Laba Project
      txDb.insert('journal_entry_lines', {
        id: generateId(), journal_entry_id: journal.id, account_id: reAccount, project_id: dist.project_id, description: 'Net Project Profit distributed', debit: dist.net_profit, credit: 0
      } as JournalEntryLine);

      // Credit Payables
      if (dist.company_reserve > 0) {
        txDb.insert('journal_entry_lines', { id: generateId(), journal_entry_id: journal.id, account_id: companyReservePayable, project_id: dist.project_id, description: 'Company Reserve Allocation', debit: 0, credit: dist.company_reserve } as JournalEntryLine);
      }
      if (dist.worker_pool > 0) {
        txDb.insert('journal_entry_lines', { id: generateId(), journal_entry_id: journal.id, account_id: workerPayable, project_id: dist.project_id, description: 'Worker Pool Allocation', debit: 0, credit: dist.worker_pool } as JournalEntryLine);
      }
      if (dist.investor_pool > 0) {
        txDb.insert('journal_entry_lines', { id: generateId(), journal_entry_id: journal.id, account_id: investorPayable, project_id: dist.project_id, description: 'Investor Pool Allocation', debit: 0, credit: dist.investor_pool } as JournalEntryLine);
      }
      if (dist.csr > 0) {
        txDb.insert('journal_entry_lines', { id: generateId(), journal_entry_id: journal.id, account_id: csrPayable, project_id: dist.project_id, description: 'CSR Allocation', debit: 0, credit: dist.csr } as JournalEntryLine);
      }

      dist.status = 'Posted';
      dist.journal_entry_id = journal.id;
      dist.posted_at = new Date().toISOString();
      dist.posted_by = userId;

      txDb.update('profit_distributions', dist.id, dist);

      return dist;
    });
  },

  createPayout(data: Omit<ProfitDistributionPayout, 'id' | 'created_at' | 'status' | 'payout_number'>, _userId: string): ProfitDistributionPayout {
    const payout: ProfitDistributionPayout = {
      ...data,
      id: generateId(),
      payout_number: `PAY-DIST-${Date.now().toString().slice(-6)}`,
      status: 'Draft',
      created_at: new Date().toISOString()
    };
    db.insert('profit_distribution_payouts', payout);
    return payout;
  },

  postPayout(payoutId: string, userId: string): ProfitDistributionPayout {
    return runMockTransaction(txDb => {
      const payout = txDb.getAll<ProfitDistributionPayout>('profit_distribution_payouts').find(p => p.id === payoutId);
      if (!payout) throw new Error("Payout not found");
      if (payout.status !== 'Draft' && payout.status !== 'Approved') throw new Error("Invalid status for posting");

      const dist = txDb.getAll<ProfitDistribution>('profit_distributions').find(d => d.id === payout.profit_distribution_id);
      if (!dist) throw new Error("Distribution not found");

      // Journal
      const journal: JournalEntry = {
        id: generateId(),
        journal_number: `JE-PAY-${Date.now().toString().slice(-6)}`,
        journal_date: payout.payment_date,
        project_id: dist.project_id,
        source_type: 'Profit Payout',
        source_id: payout.id,
        description: `Payout for ${payout.recipient_type} ${payout.recipient_name_snapshot || ''}`,
        status: 'Posted',
        total_debit: payout.amount,
        total_credit: payout.amount,
        posted_at: new Date().toISOString(),
        posted_by: userId,
        created_at: new Date().toISOString(),
        created_by: userId
      };

      txDb.insert('journal_entries', journal);

      // Debit Payable
      txDb.insert('journal_entry_lines', {
        id: generateId(), journal_entry_id: journal.id, account_id: payout.payable_account_id, project_id: dist.project_id, description: 'Payout decrease payable', debit: payout.amount, credit: 0
      } as JournalEntryLine);

      // Credit Cash/Bank (Need to fetch GL account for cash bank, assume cash_bank_account_id is GL ID for now, or we lookup. We will mock lookup for MVP)
      txDb.insert('journal_entry_lines', {
        id: generateId(), journal_entry_id: journal.id, account_id: payout.cash_bank_account_id, project_id: dist.project_id, description: 'Payout cash out', debit: 0, credit: payout.amount
      } as JournalEntryLine);

      payout.status = 'Posted';
      payout.journal_entry_id = journal.id;
      payout.posted_at = new Date().toISOString();
      payout.posted_by = userId;

      txDb.update('profit_distribution_payouts', payout.id, payout);

      // Update distribution status to Partially Paid or Paid
      const allPayouts = txDb.getAll<ProfitDistributionPayout>('profit_distribution_payouts').filter(p => p.profit_distribution_id === dist.id && p.status === 'Posted');
      const totalPaid = allPayouts.reduce((sum, p) => sum + p.amount, 0);
      
      if (totalPaid >= dist.net_profit) {
        dist.status = 'Paid';
      } else {
        dist.status = 'Partially Paid';
      }
      txDb.update('profit_distributions', dist.id, dist);

      return payout;
    });
  },

  reversePayout(payoutId: string, userId: string, reason: string): ProfitDistributionPayout {
    if (!reason || reason.length < 20) throw new Error("Reversal reason must be at least 20 characters");
    return runMockTransaction(txDb => {
      const payout = txDb.getAll<ProfitDistributionPayout>('profit_distribution_payouts').find(p => p.id === payoutId);
      if (!payout) throw new Error("Payout not found");
      if (payout.status !== 'Posted') throw new Error("Only Posted payouts can be reversed");

      const dist = txDb.getAll<ProfitDistribution>('profit_distributions').find(d => d.id === payout.profit_distribution_id);
      if (!dist) throw new Error("Distribution not found");

      if (payout.journal_entry_id) {
        const journal = txDb.getAll<JournalEntry>('journal_entries').find(j => j.id === payout.journal_entry_id);
        if (journal) {
          journal.status = 'Reversed';
          txDb.update('journal_entries', journal.id, journal);
        }
      }

      payout.status = 'Reversed';
      txDb.update('profit_distribution_payouts', payout.id, payout);

      txDb.insert('audit_logs', {
        id: generateId(), action: 'REVERSE_PAYOUT', entity_type: 'profit_distribution_payouts', entity_id: payout.id, user: userId, timestamp: new Date().toISOString(), details: `Reason: ${reason}`
      });

      // Recalculate distribution status
      const allPayouts = txDb.getAll<ProfitDistributionPayout>('profit_distribution_payouts').filter(p => p.profit_distribution_id === dist.id && p.status === 'Posted');
      const totalPaid = allPayouts.reduce((sum, p) => sum + p.amount, 0);
      
      if (totalPaid === 0) {
        dist.status = 'Posted';
      } else if (totalPaid >= dist.net_profit) {
        dist.status = 'Paid';
      } else {
        dist.status = 'Partially Paid';
      }
      txDb.update('profit_distributions', dist.id, dist);

      return payout;
    });
  }
};
