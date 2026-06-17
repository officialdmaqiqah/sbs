const storage = new Map<string, string>();
(global as any).localStorage = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  get length() { return storage.size; },
  key: (index: number) => Array.from(storage.keys())[index] || null
};

import { db } from './src/services/db.ts';
import { accountingService } from './src/services/accountingService.ts';
import { profitDistributionService } from './src/services/profitDistributionService.ts';
import type { 
  Project, Investor, ProjectInvestment, ProjectWorkerAllocation, 
  ProfitDistribution, ProfitDistributionWorkerLine, ProfitDistributionInvestorLine 
} from './src/types';
import * as fs from 'fs';

let passed = 0;
let failed = 0;
const results: any[] = [];

function assertTest(name: string, condition: boolean, message?: string) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
    results.push({ name, status: 'PASS' });
  } else {
    console.error(`[FAIL] ${name} ${message ? '- ' + message : ''}`);
    failed++;
    results.push({ name, status: 'FAIL', message });
  }
}

async function runTests() {
  console.log("Starting Profit Distribution Dynamic Tests...\n");
  
  // Setup
  storage.clear();
  accountingService.seedDefaultChartOfAccounts();
  const retained = db.query<any>('accounts', a => a.account_code === '3201')[0];
  const workerPay = db.query<any>('accounts', a => a.account_code === '2301')[0];
  const invPay = db.query<any>('accounts', a => a.account_code === '2302')[0];
  const csrPay = db.query<any>('accounts', a => a.account_code === '2303')[0];
  const compRes = db.query<any>('accounts', a => a.account_code === '2304')[0];
  
  accountingService.createSettings({
    company_name: 'SBS', currency: 'IDR', fiscal_year_start: '2023-01-01', accounting_basis: 'Accrual', inventory_costing: 'Moving Average',
    retained_earnings_account_id: retained.id, profit_sharing_payable_worker_account_id: workerPay.id,
    profit_sharing_payable_investor_account_id: invPay.id, csr_payable_account_id: csrPay.id, company_reserve_account_id: compRes.id
  });

  const revAcc = db.query<any>('accounts', a => a.account_code === '4101')[0];

  // Helper to generate profit
  const genProfit = (projId: string, amount: number) => {
    accountingService.createDraftJournal({
      journal_number: 'JRN-TEST',
      journal_date: '2023-01-01',
      project_id: projId,
      source_type: 'Manual',
      description: 'Test Profit'
    }, [
      { account_id: workerPay.id, debit: amount, credit: 0, project_id: projId, description: '' }, // fake asset
      { account_id: revAcc.id, debit: 0, credit: amount, project_id: projId, description: '' }
    ]);
    const d = db.query<any>('journal_entries', j => j.project_id === projId)[0];
    accountingService.postJournal(d.id, 'admin');
  }

  // ---------------------------------------------------------
  // SCENARIO 1: Project dengan 3 pekerja (100% OK)
  // ---------------------------------------------------------
  let p1 = db.insert<Project>('projects', { name: 'P1', status: 'Aktif' } as any);
  db.insert('project_worker_allocations', { project_id: p1.id, worker_id: 'W1', role_name: 'CEO', allocation_percentage: 50, status: 'Active' } as any);
  db.insert('project_worker_allocations', { project_id: p1.id, worker_id: 'W2', role_name: 'OP1', allocation_percentage: 25, status: 'Active' } as any);
  db.insert('project_worker_allocations', { project_id: p1.id, worker_id: 'W3', role_name: 'OP2', allocation_percentage: 25, status: 'Active' } as any);
  
  genProfit(p1.id, 1000000);
  try {
    const dId = profitDistributionService.createProfitDistributionDraft(p1.id);
    assertTest('1. Project dengan 3 pekerja (alokasi pas 100%) bisa draft', !!dId);
  } catch (e: any) {
    assertTest('1. Project dengan 3 pekerja (alokasi pas 100%) bisa draft', false, e.message);
  }

  // ---------------------------------------------------------
  // SCENARIO 2: Project dengan 6 pekerja
  // ---------------------------------------------------------
  let p2 = db.insert<Project>('projects', { name: 'P2', status: 'Aktif' } as any);
  [30, 14, 14, 14, 14, 14].forEach((pct, i) => {
    db.insert('project_worker_allocations', { project_id: p2.id, worker_id: `W${i}`, role_name: 'Staff', allocation_percentage: pct, status: 'Active' } as any);
  });
  genProfit(p2.id, 1000000);
  try {
    const dId = profitDistributionService.createProfitDistributionDraft(p2.id);
    assertTest('2. Project dengan 6 pekerja (alokasi pas 100%) bisa draft', !!dId);
  } catch (e: any) {
    assertTest('2. Project dengan 6 pekerja (alokasi pas 100%) bisa draft', false, e.message);
  }

  // ---------------------------------------------------------
  // SCENARIO 3: Project dengan 10 pekerja
  // ---------------------------------------------------------
  let p3 = db.insert<Project>('projects', { name: 'P3', status: 'Aktif' } as any);
  for(let i=0; i<10; i++) {
    db.insert('project_worker_allocations', { project_id: p3.id, worker_id: `W${i}`, role_name: 'Staff', allocation_percentage: 10, status: 'Active' } as any);
  }
  genProfit(p3.id, 1000000);
  try {
    const dId = profitDistributionService.createProfitDistributionDraft(p3.id);
    assertTest('3. Project dengan 10 pekerja (alokasi pas 100%) bisa draft', !!dId);
  } catch (e: any) {
    assertTest('3. Project dengan 10 pekerja (alokasi pas 100%) bisa draft', false, e.message);
  }

  // ---------------------------------------------------------
  // SCENARIO 4: Total alokasi pekerja 90% ditolak
  // ---------------------------------------------------------
  let p4 = db.insert<Project>('projects', { name: 'P4', status: 'Aktif' } as any);
  db.insert('project_worker_allocations', { project_id: p4.id, worker_id: 'W1', allocation_percentage: 90, status: 'Active' } as any);
  genProfit(p4.id, 1000000);
  try {
    profitDistributionService.createProfitDistributionDraft(p4.id);
    assertTest('4. Total alokasi pekerja 90% ditolak', false, 'Seharusnya gagal karena bukan 100%');
  } catch (e: any) {
    assertTest('4. Total alokasi pekerja 90% ditolak', e.message.includes('100%'));
  }

  // ---------------------------------------------------------
  // SCENARIO 5: Total alokasi pekerja 110% ditolak
  // ---------------------------------------------------------
  db.insert('project_worker_allocations', { project_id: p4.id, worker_id: 'W2', allocation_percentage: 20, status: 'Active' } as any); // total 110%
  try {
    profitDistributionService.createProfitDistributionDraft(p4.id);
    assertTest('5. Total alokasi pekerja 110% ditolak', false, 'Seharusnya gagal');
  } catch (e: any) {
    assertTest('5. Total alokasi pekerja 110% ditolak', e.message.includes('100%'));
  }

  // ---------------------------------------------------------
  // SCENARIO 6 & 7: Tambah & Nonaktifkan pekerja sebelum close
  // ---------------------------------------------------------
  let p6 = db.insert<Project>('projects', { name: 'P6', status: 'Aktif' } as any);
  let wId1 = db.insert('project_worker_allocations', { project_id: p6.id, worker_id: 'W1', allocation_percentage: 50, status: 'Active' } as any).id;
  let wId2 = db.insert('project_worker_allocations', { project_id: p6.id, worker_id: 'W2', allocation_percentage: 50, status: 'Active' } as any).id;
  
  // Nonaktifkan W2, tambah W3 dengan 50%
  db.update('project_worker_allocations', wId2, { status: 'Inactive' });
  db.insert('project_worker_allocations', { project_id: p6.id, worker_id: 'W3', allocation_percentage: 50, status: 'Active' } as any);
  
  genProfit(p6.id, 1000000);
  try {
    const dId = profitDistributionService.createProfitDistributionDraft(p6.id);
    const wLines = db.query<any>('profit_distribution_worker_lines', l => l.profit_distribution_id === dId);
    assertTest('6&7. Tambah/Nonaktifkan pekerja sebelum close (distribusi mengabaikan inactive)', 
      wLines.length === 2 && wLines.some(l => l.worker_id === 'W1') && wLines.some(l => l.worker_id === 'W3'));
  } catch(e: any) {
    assertTest('6&7. Tambah/Nonaktifkan pekerja sebelum close', false, e.message);
  }

  // ---------------------------------------------------------
  // SCENARIO 8, 9, 10: Investor baru, setor bertahap, pending diabaikan
  // ---------------------------------------------------------
  let p8 = db.insert<Project>('projects', { name: 'P8', status: 'Aktif' } as any);
  db.insert('project_worker_allocations', { project_id: p8.id, worker_id: 'W1', allocation_percentage: 100, status: 'Active' } as any);
  
  // Inv 1: Confirmed 10jt
  db.insert('project_investments', { project_id: p8.id, investor_id: 'I1', amount: 10000000, status: 'Confirmed' } as any);
  // Inv 2: Confirmed 5jt (bertahap pertama)
  db.insert('project_investments', { project_id: p8.id, investor_id: 'I2', amount: 5000000, status: 'Confirmed' } as any);
  // Inv 2: Confirmed 5jt (bertahap kedua)
  db.insert('project_investments', { project_id: p8.id, investor_id: 'I2', amount: 5000000, status: 'Confirmed' } as any);
  // Inv 3: Pending 20jt (diabaikan)
  db.insert('project_investments', { project_id: p8.id, investor_id: 'I3', amount: 20000000, status: 'Pending' } as any);

  genProfit(p8.id, 1000000);
  try {
    const dId = profitDistributionService.createProfitDistributionDraft(p8.id);
    const iLines = db.query<any>('profit_distribution_investor_lines', l => l.profit_distribution_id === dId);
    
    const i1 = iLines.find(l => l.investor_id === 'I1');
    const i2 = iLines.find(l => l.investor_id === 'I2');
    const i3 = iLines.find(l => l.investor_id === 'I3');
    
    assertTest('8&9&10. Investor bertahap diakumulasi, pending diabaikan (I1=50%, I2=50%, I3=null)', 
      iLines.length === 2 && 
      i1.percentage_snapshot === 50 && 
      i2.percentage_snapshot === 50 && 
      !i3);
  } catch (e: any) {
    assertTest('8&9&10. Investor bertahap & pending', false, e.message);
  }

  // ---------------------------------------------------------
  // SCENARIO 11: Snapshot tidak berubah setelah master anggota diedit
  // ---------------------------------------------------------
  let dId8 = db.query<any>('profit_distributions', d => d.project_id === p8.id)[0].id;
  const oldLineId = db.query<any>('profit_distribution_worker_lines', l => l.profit_distribution_id === dId8)[0].id;
  
  // Ubah alokasi master pekerja W1 jadi 50%
  const wId8 = db.query<any>('project_worker_allocations', w => w.project_id === p8.id)[0].id;
  db.update('project_worker_allocations', wId8, { allocation_percentage: 50 });

  const freshLine = db.getById<any>('profit_distribution_worker_lines', oldLineId);
  assertTest('11. Snapshot (worker line) persentasenya tetap 100% walau master diedit jadi 50%', freshLine?.percentage_snapshot === 100);

  // ---------------------------------------------------------
  // SCENARIO 12: Project Closed menolak perubahan
  // ---------------------------------------------------------
  db.update('projects', p8.id, { status: 'Tutup Buku' });
  try {
    profitDistributionService.createProfitDistributionDraft(p8.id);
    assertTest('12. Project Closed menolak perubahan', false, 'Seharusnya gagal karena tutup buku');
  } catch (e: any) {
    assertTest('12. Project Closed menolak draft baru', e.message.includes('Closed'));
  }

  // ---------------------------------------------------------
  // SCENARIO 13: Profit distribution tetap balance
  // ---------------------------------------------------------
  try {
    profitDistributionService.postProfitDistribution(dId8, 'admin');
    const jrn = db.query<any>('journal_entries', j => j.source_id === dId8)[0];
    const lines = db.query<any>('journal_entry_lines', l => l.journal_entry_id === jrn.id);
    const debit = lines.reduce((s,l)=>s+l.debit, 0);
    const credit = lines.reduce((s,l)=>s+l.credit, 0);
    assertTest('13. Profit distribution Posted balance', debit > 0 && debit === credit);
  } catch (e: any) {
    assertTest('13. Profit distribution Posted balance', false, e.message);
  }

  console.log(`\nResults: ${passed} PASS, ${failed} FAIL`);

  // Write report
  let md = `# Profit Distribution Dynamic Test Report\n\n`;
  md += `**Total Tests:** 13\n`;
  md += `**Passed:** ${passed}\n`;
  md += `**Failed:** ${failed}\n\n`;
  md += `| Test | Status | Message |\n|---|---|---|\n`;
  results.forEach(r => {
    md += `| ${r.name} | ${r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${r.message || '-'} |\n`;
  });

  fs.writeFileSync('PROFIT_DISTRIBUTION_TEST_REPORT.md', md);
  console.log('\nReport written to PROFIT_DISTRIBUTION_TEST_REPORT.md');
}

runTests();
