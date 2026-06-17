import { db, runMockTransaction } from './db';
import type { 
  JournalEntry, JournalEntryLine, Account, AccountingSetting, 
  AccountingPeriod,  
} from '../types';

export const accountingService = {
  getSettings(): AccountingSetting | undefined {
    const settings = db.getAll<AccountingSetting>('accounting_settings');
    return settings[0];
  },

  createSettings(settings: Omit<AccountingSetting, 'id'>) {
    const existingSettings = db.getAll('accounting_settings');
    existingSettings.forEach((s: any) => db.delete('accounting_settings', s.id));
    return db.insert('accounting_settings', settings as any);
  },

  getAccounts(): Account[] {
    return db.getAll<Account>('accounts').sort((a, b) => a.account_code.localeCompare(b.account_code));
  },

  createAccount(account: Omit<Account, 'id' | 'created_at' | 'created_by'>, createdBy: string = 'system'): Account {
    const existing = db.query<Account>('accounts', a => a.account_code === account.account_code);
    if (existing.length > 0) throw new Error('Account code must be unique');

    if (account.parent_account_id) {
      const parent = db.getById<Account>('accounts', account.parent_account_id);
      if (!parent) throw new Error('Parent account not found');
      if (parent.allow_posting) throw new Error('Parent account cannot accept posting');
      if (parent.account_type !== account.account_type) throw new Error('Account type must match parent account type');
    }

    const inserted = db.insert('accounts', {
      ...account,
      created_at: new Date().toISOString(),
      created_by: createdBy
    } as any);

    return inserted as Account;
  },

  updateAccount(id: string, updates: Partial<Omit<Account, 'id' | 'created_at' | 'created_by'>>, updatedBy: string = 'system'): Account {
    if (updatedBy) {} // satisfy unused parameter rule
    const acc = db.getById<Account>('accounts', id);
    if (!acc) throw new Error('Account not found');

    if (updates.account_code && updates.account_code !== acc.account_code) {
      const existing = db.query<Account>('accounts', a => a.account_code === updates.account_code);
      if (existing.length > 0) throw new Error('Account code must be unique');
    }

    const isUsed = this.isAccountUsedInJournal(id);
    if (isUsed) {
      if (updates.account_code && updates.account_code !== acc.account_code) throw new Error('Cannot change account code of used account');
      if (updates.account_type && updates.account_type !== acc.account_type) throw new Error('Cannot change account type of used account');
    }

    if (updates.parent_account_id) {
      const parent = db.getById<Account>('accounts', updates.parent_account_id);
      if (!parent) throw new Error('Parent account not found');
      if (parent.allow_posting) throw new Error('Parent account cannot accept posting');
      const targetType = updates.account_type || acc.account_type;
      if (parent.account_type !== targetType) throw new Error('Account type must match parent account type');
    }

    const updated = db.update('accounts', id, updates as any);
    return updated as Account;
  },

  seedDefaultChartOfAccounts() {
    const existing = db.getAll<Account>('accounts');
    if (existing.length > 0) return;

    const defaultAccounts: Partial<Account>[] = [
      // ASET
      { account_code: '1100', account_name: 'Kas dan Setara Kas', account_type: 'Asset', normal_balance: 'Debit', allow_posting: false, project_required: false },
      { account_code: '1101', account_name: 'Kas Kecil', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1100' },
      { account_code: '1102', account_name: 'Bank Operasional', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1100' },
      { account_code: '1200', account_name: 'Piutang', account_type: 'Asset', normal_balance: 'Debit', allow_posting: false, project_required: false },
      { account_code: '1201', account_name: 'Piutang Usaha', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '1200' },
      { account_code: '1202', account_name: 'Piutang Karyawan', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1200' },
      { account_code: '1203', account_name: 'Piutang Lain-lain', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1200' },
      { account_code: '1300', account_name: 'Persediaan', account_type: 'Asset', normal_balance: 'Debit', allow_posting: false, project_required: false },
      { account_code: '1301', account_name: 'Persediaan Ayam', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1300' },
      { account_code: '1302', account_name: 'Persediaan Bahan Kandang', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1300' },
      { account_code: '1303', account_name: 'Persediaan Kandang Jadi', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1300' },
      { account_code: '1304', account_name: 'Persediaan Bahan Pakan', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1300' },
      { account_code: '1305', account_name: 'Persediaan Pakan Jadi', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1300' },
      { account_code: '1306', account_name: 'Persediaan Telur', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1300' },
      { account_code: '1307', account_name: 'Persediaan Vitamin dan Obat', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1300' },
      { account_code: '1308', account_name: 'Persediaan Barang Karantina', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1300' },
      { account_code: '1400', account_name: 'Aset Tetap', account_type: 'Asset', normal_balance: 'Debit', allow_posting: false, project_required: false },
      { account_code: '1401', account_name: 'Peralatan Produksi', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1400' },
      { account_code: '1402', account_name: 'Kendaraan', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1400' },
      { account_code: '1403', account_name: 'Peralatan Kantor', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '1400' },
      { account_code: '1491', account_name: 'Akumulasi Penyusutan Peralatan', account_type: 'Asset', normal_balance: 'Credit', allow_posting: true, project_required: false, parent_account_id: '1400' },
      { account_code: '1492', account_name: 'Akumulasi Penyusutan Kendaraan', account_type: 'Asset', normal_balance: 'Credit', allow_posting: true, project_required: false, parent_account_id: '1400' },

      // KEWAJIBAN
      { account_code: '2100', account_name: 'Hutang Usaha', account_type: 'Liability', normal_balance: 'Credit', allow_posting: false, project_required: false },
      { account_code: '2101', account_name: 'Hutang Supplier', account_type: 'Liability', normal_balance: 'Credit', allow_posting: true, project_required: false, parent_account_id: '2100' },
      { account_code: '2102', account_name: 'Hutang Biaya', account_type: 'Liability', normal_balance: 'Credit', allow_posting: true, project_required: false, parent_account_id: '2100' },
      { account_code: '2200', account_name: 'Kewajiban Pelanggan', account_type: 'Liability', normal_balance: 'Credit', allow_posting: false, project_required: false },
      { account_code: '2201', account_name: 'Uang Muka / DP Customer', account_type: 'Liability', normal_balance: 'Credit', allow_posting: true, project_required: true, parent_account_id: '2200' },
      { account_code: '2202', account_name: 'Hutang Refund Customer', account_type: 'Liability', normal_balance: 'Credit', allow_posting: true, project_required: true, parent_account_id: '2200' },
      { account_code: '2300', account_name: 'Kewajiban Distribusi Profit', account_type: 'Liability', normal_balance: 'Credit', allow_posting: false, project_required: false },
      { account_code: '2301', account_name: 'Hutang Bagi Hasil Pekerja', account_type: 'Liability', normal_balance: 'Credit', allow_posting: true, project_required: true, parent_account_id: '2300' },
      { account_code: '2302', account_name: 'Hutang Bagi Hasil Investor', account_type: 'Liability', normal_balance: 'Credit', allow_posting: true, project_required: true, parent_account_id: '2300' },
      { account_code: '2303', account_name: 'Hutang CSR', account_type: 'Liability', normal_balance: 'Credit', allow_posting: true, project_required: true, parent_account_id: '2300' },
      { account_code: '2304', account_name: 'Hutang Kas Perusahaan', account_type: 'Liability', normal_balance: 'Credit', allow_posting: true, project_required: true, parent_account_id: '2300' },

      // EKUITAS
      { account_code: '3100', account_name: 'Modal', account_type: 'Equity', normal_balance: 'Credit', allow_posting: false, project_required: false },
      { account_code: '3101', account_name: 'Modal Investor Project', account_type: 'Equity', normal_balance: 'Credit', allow_posting: true, project_required: true, parent_account_id: '3100' },
      { account_code: '3102', account_name: 'Tambahan Modal', account_type: 'Equity', normal_balance: 'Credit', allow_posting: true, project_required: true, parent_account_id: '3100' },
      { account_code: '3201', account_name: 'Saldo Laba', account_type: 'Equity', normal_balance: 'Credit', allow_posting: true, project_required: false },
      { account_code: '3202', account_name: 'Laba Rugi Berjalan', account_type: 'Equity', normal_balance: 'Credit', allow_posting: true, project_required: false },

      // PENDAPATAN
      { account_code: '4100', account_name: 'Pendapatan Penjualan', account_type: 'Revenue', normal_balance: 'Credit', allow_posting: false, project_required: true },
      { account_code: '4101', account_name: 'Penjualan Paket Usaha', account_type: 'Revenue', normal_balance: 'Credit', allow_posting: true, project_required: true, parent_account_id: '4100' },
      { account_code: '4102', account_name: 'Penjualan Ayam', account_type: 'Revenue', normal_balance: 'Credit', allow_posting: true, project_required: true, parent_account_id: '4100' },
      { account_code: '4103', account_name: 'Penjualan Kandang', account_type: 'Revenue', normal_balance: 'Credit', allow_posting: true, project_required: true, parent_account_id: '4100' },
      { account_code: '4104', account_name: 'Penjualan Pakan', account_type: 'Revenue', normal_balance: 'Credit', allow_posting: true, project_required: true, parent_account_id: '4100' },
      { account_code: '4105', account_name: 'Penjualan Telur', account_type: 'Revenue', normal_balance: 'Credit', allow_posting: true, project_required: true, parent_account_id: '4100' },
      { account_code: '4106', account_name: 'Pendapatan Produk Lain', account_type: 'Revenue', normal_balance: 'Credit', allow_posting: true, project_required: true, parent_account_id: '4100' },
      { account_code: '4190', account_name: 'Retur dan Potongan Penjualan', account_type: 'Revenue', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '4100' },
      { account_code: '4901', account_name: 'Keuntungan Penyesuaian Persediaan', account_type: 'Revenue', normal_balance: 'Credit', allow_posting: true, project_required: false },

      // HPP
      { account_code: '5100', account_name: 'Harga Pokok Penjualan', account_type: 'Cost of Goods Sold', normal_balance: 'Debit', allow_posting: false, project_required: true },
      { account_code: '5101', account_name: 'HPP Paket Usaha', account_type: 'Cost of Goods Sold', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '5100' },
      { account_code: '5102', account_name: 'HPP Ayam', account_type: 'Cost of Goods Sold', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '5100' },
      { account_code: '5103', account_name: 'HPP Kandang', account_type: 'Cost of Goods Sold', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '5100' },
      { account_code: '5104', account_name: 'HPP Pakan', account_type: 'Cost of Goods Sold', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '5100' },
      { account_code: '5105', account_name: 'HPP Telur', account_type: 'Cost of Goods Sold', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '5100' },
      { account_code: '5106', account_name: 'HPP Produk Lain', account_type: 'Cost of Goods Sold', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '5100' },
      { account_code: '5107', account_name: 'HPP Telur Dalam Proses', account_type: 'Cost of Goods Sold', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '5100' },

      // BEBAN
      { account_code: '6100', account_name: 'Beban Produksi', account_type: 'Expense', normal_balance: 'Debit', allow_posting: false, project_required: true },
      { account_code: '6101', account_name: 'Beban Tenaga Kerja Produksi', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '6100' },
      { account_code: '6102', account_name: 'Beban Overhead Produksi', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '6100' },
      { account_code: '6103', account_name: 'Beban Listrik dan Air Produksi', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '6100' },
      { account_code: '6200', account_name: 'Beban Distribusi', account_type: 'Expense', normal_balance: 'Debit', allow_posting: false, project_required: true },
      { account_code: '6201', account_name: 'Beban Pengiriman', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '6200' },
      { account_code: '6202', account_name: 'Beban Kendaraan', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '6200' },
      { account_code: '6203', account_name: 'Kerugian Barang Distribusi', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '6200' },
      { account_code: '6300', account_name: 'Beban Marketing', account_type: 'Expense', normal_balance: 'Debit', allow_posting: false, project_required: false },
      { account_code: '6301', account_name: 'Beban Promosi', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '6300' },
      { account_code: '6302', account_name: 'Komisi Reseller', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '6300' },
      { account_code: '6303', account_name: 'Beban Iklan', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '6300' },
      { account_code: '6400', account_name: 'Beban Operasional', account_type: 'Expense', normal_balance: 'Debit', allow_posting: false, project_required: false },
      { account_code: '6401', account_name: 'Gaji dan Honor', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '6400' },
      { account_code: '6402', account_name: 'Beban Administrasi', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '6400' },
      { account_code: '6403', account_name: 'Beban Konsumsi', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '6400' },
      { account_code: '6404', account_name: 'Beban Telekomunikasi', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '6400' },
      { account_code: '6405', account_name: 'Beban Sewa', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '6400' },
      { account_code: '6406', account_name: 'Beban Penyusutan', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: false, parent_account_id: '6400' },
      { account_code: '6500', account_name: 'Kerugian Persediaan', account_type: 'Expense', normal_balance: 'Debit', allow_posting: false, project_required: true },
      { account_code: '6501', account_name: 'Kerugian Ayam Mati', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '6500' },
      { account_code: '6502', account_name: 'Kerugian Ayam Hilang', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '6500' },
      { account_code: '6503', account_name: 'Kerugian Telur Rusak', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '6500' },
      { account_code: '6504', account_name: 'Kerugian Stock Opname', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '6500' },
      { account_code: '6505', account_name: 'Kerugian Retur dan Write-off', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: true, parent_account_id: '6500' },
      { account_code: '6900', account_name: 'Beban Lain-lain', account_type: 'Expense', normal_balance: 'Debit', allow_posting: true, project_required: false }
    ];

    // Insert parents first
    const parents = defaultAccounts.filter(a => !a.parent_account_id);
    const parentMap: Record<string, string> = {};
    
    parents.forEach(p => {
      const inserted = db.insert('accounts', { ...p, is_active: true, created_at: new Date().toISOString() } as any);
      parentMap[p.account_code!] = (inserted as any).id;
    });

    // Insert children
    const children = defaultAccounts.filter(a => a.parent_account_id);
    children.forEach(c => {
      const parentDbId = parentMap[c.parent_account_id!];
      db.insert('accounts', { ...c, parent_account_id: parentDbId, is_active: true, created_at: new Date().toISOString() } as any);
    });
  },

  getJournalBySource(sourceType: string, sourceId: string) {
    const entries = db.query<JournalEntry>('journal_entries', j => j.source_type === sourceType && j.source_id === sourceId);
    // Only return active journals (not reversed or cancelled)
    return entries.filter(j => j.status === 'Posted' || j.status === 'Draft')[0]; // assuming 1 active journal per source
  },

  ensureJournalNotDuplicated(sourceType: string, sourceId: string, txDb: any = db) {
    if (!sourceType || !sourceId) return true;
    const existing = txDb.query('journal_entries', (j: any) => 
      j.source_type === sourceType && 
      j.source_id === sourceId && 
      j.status !== 'Reversed'
    );
    return existing.length === 0;
  },

  validateJournalPeriod(dateStr: string): { valid: boolean; error?: string } {
    const periodStr = dateStr.substring(0, 7); // YYYY-MM
    const periods = db.getAll<AccountingPeriod>('accounting_periods');
    const period = periods.find(p => p.period_name === periodStr);
    
    if (!period) return { valid: true }; // If period not created, we allow it or we could block it. Let's allow for MVP without period gating strictness unless closed.
    if (period.status === 'Closed') return { valid: false, error: `Period ${periodStr} is closed.` };
    
    const settings = this.getSettings();
    if (settings?.lock_date && new Date(dateStr) < new Date(settings.lock_date)) {
      return { valid: false, error: `Date ${dateStr} is before the lock date.` };
    }
    
    return { valid: true };
  },

  validateJournal(lines: Partial<JournalEntryLine>[]): { valid: boolean; error?: string } {
    if (lines.length < 2) return { valid: false, error: 'Journal must have at least 2 lines.' };
    
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      if (line.debit && line.debit < 0) return { valid: false, error: 'Line debit cannot be negative.' };
      if (line.credit && line.credit < 0) return { valid: false, error: 'Line credit cannot be negative.' };
      if (line.debit && line.credit && line.debit > 0 && line.credit > 0) return { valid: false, error: 'A line can only be debit or credit, not both.' };
      
      totalDebit += line.debit || 0;
      totalCredit += line.credit || 0;

      // Check account posting
      const acc = db.getById<Account>('accounts', line.account_id!);
      if (!acc) return { valid: false, error: `Account ${line.account_id} not found.` };
      if (!acc.allow_posting) return { valid: false, error: `Account ${acc.account_code} does not allow posting (parent account).` };
      if (!acc.is_active) return { valid: false, error: `Account ${acc.account_code} is inactive.` };
      if (acc.project_required && !line.project_id) return { valid: false, error: `Account ${acc.account_code} requires a project_id.` };
    }

    if (Math.abs(totalDebit - totalCredit) > 1) { // 1 rp tolerance
      return { valid: false, error: `Journal is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}.` };
    }

    return { valid: true };
  },

  createDraftJournal(
    header: Omit<JournalEntry, 'id' | 'status' | 'created_at' | 'total_debit' | 'total_credit'>, 
    lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[],
    txDb: any = db
  ) {
    if (!this.ensureJournalNotDuplicated(header.source_type || '', header.source_id || '', txDb)) {
      return { success: false, message: 'Active journal already exists for this source.' };
    }

    const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

    const insertedHeader = txDb.insert('journal_entries', {
      ...header,
      status: 'Draft',
      total_debit: totalDebit,
      total_credit: totalCredit,
      created_at: new Date().toISOString()
    } as any);

    lines.forEach(l => {
      txDb.insert('journal_entry_lines', {
        ...l,
        journal_entry_id: insertedHeader.id
      } as any);
    });

    return { success: true, journalId: insertedHeader.id };
  },

  postJournal(journalId: string, postedBy: string, txDb: any = db) {
    const journal = txDb.getById('journal_entries', journalId) as JournalEntry;
    if (!journal) throw new Error('Journal not found');
    if (journal.status !== 'Draft') throw new Error('Only Draft journal can be posted.');

    const periodCheck = this.validateJournalPeriod(journal.journal_date);
    if (!periodCheck.valid) throw new Error(periodCheck.error);

    const lines = txDb.query('journal_entry_lines', (l: any) => l.journal_entry_id === journalId) as JournalEntryLine[];
    console.log("Journal lines for validation:", lines); const validation = this.validateJournal(lines);
    if (!validation.valid) throw new Error(validation.error);

    // Immutable update
    txDb.update('journal_entries', journalId, {
      status: 'Posted',
      posted_at: new Date().toISOString(),
      posted_by: postedBy
    });

    return { success: true };
  },

  reverseJournal(journalId: string, reversedBy: string, reason?: string, providedTxDb?: any): string {
    if (reason) {} // satisfy unused parameter rule
    const doReverse = (txDb: any) => {
      const original = txDb.getById('journal_entries', journalId) as JournalEntry;
      if (!original) throw new Error('Journal not found');
      if (original.status !== 'Posted') throw new Error('Only Posted journals can be reversed');


      const periodCheck = this.validateJournalPeriod(new Date().toISOString().split('T')[0]); // Reversal date is today
      if (!periodCheck.valid) throw new Error(`Reversal period error: ${periodCheck.error}`);

      const lines = txDb.query('journal_entry_lines', (l: any) => l.journal_entry_id === journalId) as JournalEntryLine[];

      // Create reversing journal
      const revHeader = txDb.insert('journal_entries', {
        journal_number: `REV-${original.journal_number}`,
        journal_date: new Date().toISOString().split('T')[0],
        project_id: original.project_id,
        source_type: 'Manual', // Reversal is treated as manual or system depending on need, let's keep it simple
        description: `Reversal of ${original.journal_number}`,
        status: 'Posted',
        posted_at: new Date().toISOString(),
        posted_by: reversedBy
      } as any);

      const revLines = lines.map(l => ({
        journal_entry_id: revHeader.id,
        account_id: l.account_id,
        project_id: l.project_id,
        description: `Reversal of ${l.description}`,
        debit: l.credit, // swap debit <-> credit
        credit: l.debit,
        customer_id: l.customer_id,
        supplier_id: l.supplier_id,
        investor_id: l.investor_id,
        item_id: l.item_id,
        due_date: l.due_date,
        reference: l.reference
      }));

      revLines.forEach(l => txDb.insert('journal_entry_lines', l as any));

      txDb.update('journal_entries', journalId, { is_reversed: true });
      return (revHeader as any).id;
    };
    
    if (providedTxDb) {
      return doReverse(providedTxDb);
    } else {
      return runMockTransaction(doReverse);
    }
  },

  isAccountUsedInJournal(accountId: string): boolean {
    const lines = db.query<JournalEntryLine>('journal_entry_lines', l => l.account_id === accountId);
    return lines.length > 0;
  },

  getAccountUsageCount(accountId: string): number {
    const lines = db.query<JournalEntryLine>('journal_entry_lines', l => l.account_id === accountId);
    const uniqueJournals = new Set(lines.map(l => l.journal_entry_id));
    return uniqueJournals.size;
  },

  getLastAccountUsageDate(accountId: string): string | null {
    const lines = db.query<JournalEntryLine>('journal_entry_lines', l => l.account_id === accountId);
    if (lines.length === 0) return null;
    const journals = lines.map(l => db.getById<JournalEntry>('journal_entries', l.journal_entry_id!)).filter(j => !!j);
    if (journals.length === 0) return null;
    // Sort by date descending
    journals.sort((a, b) => new Date(b!.journal_date).getTime() - new Date(a!.journal_date).getTime());
    return journals[0]!.journal_date;
  }
};
