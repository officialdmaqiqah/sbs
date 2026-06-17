import { db, runMockTransaction } from './db';
import type { CashBankAccount, CashTransaction, Account, JournalEntryLine } from '../types';
import { accountingService } from './accountingService';

export const cashBankService = {
  getCashBankAccounts(): CashBankAccount[] {
    return db.getAll<CashBankAccount>('cash_bank_accounts').sort((a, b) => a.account_name.localeCompare(b.account_name));
  },

  createCashBankAccount(data: Omit<CashBankAccount, 'id' | 'created_at' | 'created_by'>, createdBy: string): CashBankAccount {
    // Validations
    const glAcc = db.getById<Account>('accounts', data.gl_account_id);
    if (!glAcc) throw new Error('GL Account not found');
    if (glAcc.account_type !== 'Asset') throw new Error('GL Account must be of type Asset');
    if (!glAcc.allow_posting) throw new Error('GL Account must allow posting');

    const existingAccounts = this.getCashBankAccounts();
    if (existingAccounts.some(a => a.account_code === data.account_code)) throw new Error('Account code must be unique');
    if (existingAccounts.some(a => a.gl_account_id === data.gl_account_id && a.active)) throw new Error('GL Account is already linked to an active Cash/Bank account');

    const inserted = db.insert('cash_bank_accounts', {
      ...data,
      created_at: new Date().toISOString(),
      created_by: createdBy
    } as any);

    return inserted as CashBankAccount;
  },

  updateCashBankAccount(id: string, updates: Partial<Omit<CashBankAccount, 'id' | 'created_at' | 'created_by'>>) {
    const acc = db.getById<CashBankAccount>('cash_bank_accounts', id);
    if (!acc) throw new Error('Account not found');

    if (updates.account_code && updates.account_code !== acc.account_code) {
      const existing = this.getCashBankAccounts();
      if (existing.some(a => a.account_code === updates.account_code)) throw new Error('Account code must be unique');
    }

    if (updates.gl_account_id && updates.gl_account_id !== acc.gl_account_id) {
      const glAcc = db.getById<Account>('accounts', updates.gl_account_id);
      if (!glAcc || glAcc.account_type !== 'Asset' || !glAcc.allow_posting) throw new Error('Invalid GL Account');
      const isUsed = this.getCashBankAccounts().some(a => a.gl_account_id === updates.gl_account_id && a.active && a.id !== id);
      if (isUsed) throw new Error('GL Account is already linked to another active Cash/Bank account');
    }

    // Opening balance cannot be updated through this method
    if ('opening_balance' in updates) throw new Error('Opening balance must be modified through Opening Balance Journal');

    return db.update('cash_bank_accounts', id, updates as any);
  },

  toggleCashBankAccountActive(id: string) {
    const acc = db.getById<CashBankAccount>('cash_bank_accounts', id);
    if (!acc) throw new Error('Account not found');
    db.update('cash_bank_accounts', id, { active: !acc.active });
  },

  postOpeningBalance(accountId: string, amount: number, date: string, postedBy: string) {
    return runMockTransaction((txDb): any => {
      const acc = txDb.getById('cash_bank_accounts', accountId) as CashBankAccount;
      if (!acc) throw new Error('Cash/Bank account not found');
      if (!acc.active) throw new Error('Cannot post opening balance to inactive account');
      
      // Prevent multiple opening balances for the same account
      const existingTx = txDb.query('cash_transactions', (tx: any) => tx.cash_bank_account_id === accountId && tx.description === 'Opening Balance');
      if (existingTx.length > 0) throw new Error('Opening balance already exists for this account');

      // Check Opening Balance Equity account (3199)
      let equityAcc = txDb.query('accounts', (a: any) => a.account_code === '3199')[0] as Account;
      if (!equityAcc) {
        // Create it if not exists
        const equityParent = txDb.query('accounts', (a: any) => a.account_code === '3100')[0] as Account; // Modal
        equityAcc = txDb.insert('accounts', {
          account_code: '3199',
          account_name: 'Opening Balance Equity',
          account_type: 'Equity',
          normal_balance: 'Credit',
          allow_posting: true,
          project_required: false,
          parent_account_id: equityParent?.id,
          is_active: true,
          created_at: new Date().toISOString(),
          created_by: 'System'
        } as any) as Account;
      }

      // Record transaction
      const tx = txDb.insert('cash_transactions', {
        transaction_number: `OB-${acc.account_code}`,
        transaction_type: 'Receipt',
        transaction_date: date,
        cash_bank_account_id: acc.id,
        counter_account_id: equityAcc.id,
        amount: amount,
        description: 'Opening Balance',
        status: 'Posted',
        created_at: new Date().toISOString(),
        created_by: postedBy
      } as any) as CashTransaction;

      // Journal
      const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [];
      if (amount >= 0) {
        lines.push({ account_id: acc.gl_account_id, description: `Opening Balance ${acc.account_name}`, debit: amount, credit: 0 });
        lines.push({ account_id: equityAcc.id, description: `Opening Balance Equity`, debit: 0, credit: amount });
      } else {
        lines.push({ account_id: equityAcc.id, description: `Opening Balance Equity`, debit: Math.abs(amount), credit: 0 });
        lines.push({ account_id: acc.gl_account_id, description: `Opening Balance ${acc.account_name}`, debit: 0, credit: Math.abs(amount) });
      }

      const header = {
        journal_number: `JRN-OB-${acc.account_code}`,
        journal_date: date,
        source_type: 'Opening Balance',
        source_id: tx.id,
        description: `Opening Balance ${acc.account_name}`,
        created_by: postedBy
      };

      console.log("OB lines before draft:", lines); const draft = accountingService.createDraftJournal(header, lines, txDb);
      if (!draft.success) throw new Error(draft.message);
      
      accountingService.postJournal(draft.journalId!, postedBy, txDb);
      txDb.update('cash_transactions', tx.id, { journal_entry_id: draft.journalId! });
      
      // Update opening balance on account object just for reference (actual balance is from GL)
      txDb.update('cash_bank_accounts', acc.id, { opening_balance: amount, opening_balance_date: date });

      return tx.id;
    });
  },

  getCashTransactions(): CashTransaction[] {
    return db.getAll<CashTransaction>('cash_transactions').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  createCashTransaction(data: Omit<CashTransaction, 'id' | 'status' | 'journal_entry_id' | 'created_at' | 'created_by' | 'transaction_number'>, createdBy: string) {
    if (data.amount <= 0) throw new Error('Amount must be positive');
    
    // Check master
    const cb = db.getById<CashBankAccount>('cash_bank_accounts', data.cash_bank_account_id);
    if (!cb || !cb.active) throw new Error('Invalid or inactive Cash/Bank account');

    if (data.transaction_type === 'Transfer') {
      if (!data.destination_bank_account_id) throw new Error('Destination account required for transfer');
      if (data.cash_bank_account_id === data.destination_bank_account_id) throw new Error('Source and destination cannot be the same');
      const dest = db.getById<CashBankAccount>('cash_bank_accounts', data.destination_bank_account_id);
      if (!dest || !dest.active) throw new Error('Invalid destination account');
    } else {
      if (!data.counter_account_id) throw new Error('Counter account required');
      if (data.counter_account_id === cb.gl_account_id) throw new Error('Counter account cannot be the same as Cash/Bank GL account');
      const counterAcc = db.getById<Account>('accounts', data.counter_account_id);
      if (!counterAcc || !counterAcc.allow_posting) throw new Error('Counter account invalid or does not allow posting');
      if (counterAcc.project_required && !data.project_id) throw new Error('Project is required for this counter account');
    }

    const txNumber = `CASH-${new Date().getTime().toString().slice(-6)}`;

    return db.insert('cash_transactions', {
      ...data,
      transaction_number: txNumber,
      status: 'Draft',
      created_at: new Date().toISOString(),
      created_by: createdBy
    } as any) as CashTransaction;
  },

  postCashTransaction(txId: string, postedBy: string) {
    return runMockTransaction((txDb): any => {
      const tx = txDb.getById('cash_transactions', txId) as CashTransaction;
      if (!tx || tx.status !== 'Draft') throw new Error('Invalid transaction or not in Draft status');

      const cb = txDb.getById('cash_bank_accounts', tx.cash_bank_account_id) as CashBankAccount;

      const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] = [];

      if (tx.transaction_type === 'Receipt') {
        lines.push({ account_id: cb.gl_account_id, debit: tx.amount, credit: 0, description: tx.description, project_id: tx.project_id, customer_id: tx.customer_id, supplier_id: tx.supplier_id, reference: tx.reference });
        lines.push({ account_id: tx.counter_account_id!, debit: 0, credit: tx.amount, description: tx.description, project_id: tx.project_id, customer_id: tx.customer_id, supplier_id: tx.supplier_id, reference: tx.reference });
      } else if (tx.transaction_type === 'Payment') {
        lines.push({ account_id: tx.counter_account_id!, debit: tx.amount, credit: 0, description: tx.description, project_id: tx.project_id, customer_id: tx.customer_id, supplier_id: tx.supplier_id, reference: tx.reference });
        lines.push({ account_id: cb.gl_account_id, debit: 0, credit: tx.amount, description: tx.description, project_id: tx.project_id, customer_id: tx.customer_id, supplier_id: tx.supplier_id, reference: tx.reference });
      } else if (tx.transaction_type === 'Transfer') {
        const dest = txDb.getById('cash_bank_accounts', tx.destination_bank_account_id!) as CashBankAccount;
        lines.push({ account_id: dest.gl_account_id, debit: tx.amount, credit: 0, description: `Transfer from ${cb.account_name} to ${dest.account_name}: ${tx.description}` });
        lines.push({ account_id: cb.gl_account_id, debit: 0, credit: tx.amount, description: `Transfer from ${cb.account_name} to ${dest.account_name}: ${tx.description}` });
      }

      const header = {
        journal_number: `JRN-${tx.transaction_number}`,
        journal_date: tx.transaction_date,
        project_id: tx.project_id,
        source_type: 'Cash Transaction',
        source_id: tx.id,
        description: tx.description,
        created_by: postedBy
      };

      console.log("OB lines before draft:", lines); const draft = accountingService.createDraftJournal(header, lines, txDb);
      if (!draft.success) throw new Error(draft.message);

      accountingService.postJournal(draft.journalId!, postedBy, txDb);
      txDb.update('cash_transactions', tx.id, { status: 'Posted', journal_entry_id: draft.journalId! });

      return tx.id;
    });
  },

  reverseCashTransaction(txId: string, reversedBy: string, reason: string) {
    return runMockTransaction((txDb): any => {
      const tx = txDb.getById('cash_transactions', txId) as CashTransaction;
      if (!tx || tx.status !== 'Posted' || !tx.journal_entry_id) throw new Error('Transaction cannot be reversed');

      accountingService.reverseJournal(tx.journal_entry_id, reversedBy, reason, txDb);
      txDb.update('cash_transactions', txId, { status: 'Reversed' });
      return true;
    });
  }
};
