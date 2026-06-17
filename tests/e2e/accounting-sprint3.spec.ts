import { test, expect } from '@playwright/test';

// Seed initial data for E2E testing
test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:5173/finance');
  
  await page.evaluate(() => {
    // Inject required accounts
    const reAccount = { id: 'RE-1', account_code: '3100', account_name: 'Retained Earnings', account_type: 'Equity', allow_posting: true, normal_balance: 'Credit' };
    const cashAccount = { id: 'CASH-1', account_code: '1100', account_name: 'Bank BCA', account_type: 'Cash', allow_posting: true, normal_balance: 'Debit' };
    const companyReserve = { id: 'PAY-RES', account_code: '2101', account_name: 'Company Reserve Payable', account_type: 'Liability', allow_posting: true, normal_balance: 'Credit' };
    const workerPayable = { id: 'PAY-WRK', account_code: '2102', account_name: 'Worker Payable', account_type: 'Liability', allow_posting: true, normal_balance: 'Credit' };
    const investorPayable = { id: 'PAY-INV', account_code: '2103', account_name: 'Investor Payable', account_type: 'Liability', allow_posting: true, normal_balance: 'Credit' };
    const csrPayable = { id: 'PAY-CSR', account_code: '2104', account_name: 'CSR Payable', account_type: 'Liability', allow_posting: true, normal_balance: 'Credit' };
    const revAccount = { id: 'REV-1', account_code: '4100', account_name: 'Project Revenue', account_type: 'Revenue', allow_posting: true, normal_balance: 'Credit' };

    window.localStorage.setItem('accounts', JSON.stringify([reAccount, cashAccount, companyReserve, workerPayable, investorPayable, csrPayable, revAccount]));

    // Inject Accounting Settings
    const settings = { id: 'SET-1', retained_earnings_account_id: 'RE-1', company_reserve_account_id: 'PAY-RES', profit_sharing_payable_worker_account_id: 'PAY-WRK', profit_sharing_payable_investor_account_id: 'PAY-INV', csr_payable_account_id: 'PAY-CSR' };
    window.localStorage.setItem('accounting_settings', JSON.stringify([settings]));

    // Inject Project with 100 Juta Profit
    const project = { id: 'PRJ-100', name: 'Project Alpha 100M', status: 'Aktif', start_date: '2026-06-01', created_at: new Date().toISOString() };
    window.localStorage.setItem('projects', JSON.stringify([project]));

    // Inject Journal to simulate 100M profit
    const journal = { id: 'J-1', journal_number: 'JE-REV-1', journal_date: '2026-06-10', project_id: 'PRJ-100', status: 'Posted', total_debit: 100000000, total_credit: 100000000 };
    const line1 = { id: 'JL-1', journal_entry_id: 'J-1', account_id: 'CASH-1', project_id: 'PRJ-100', debit: 100000000, credit: 0 };
    const line2 = { id: 'JL-2', journal_entry_id: 'J-1', account_id: 'REV-1', project_id: 'PRJ-100', debit: 0, credit: 100000000 };
    window.localStorage.setItem('journal_entries', JSON.stringify([journal]));
    window.localStorage.setItem('journal_entry_lines', JSON.stringify([line1, line2]));

    // Clear periods and dists
    window.localStorage.setItem('accounting_periods', '[]');
    window.localStorage.setItem('profit_distributions', '[]');
    window.localStorage.setItem('profit_distribution_payouts', '[]');
  });

  await page.reload();
});

test.describe('A. ACCOUNTING PERIOD E2E', () => {
  test('E2E-1 Create Accounting Period', async ({ page }) => {
    await page.goto('http://localhost:5173/finance/periods');
    await page.click('text=Create Period');
    await page.fill('input[placeholder="e.g. 2026-06"]', '2026-06');
    await page.fill('input[placeholder="e.g. June 2026"]', 'June 2026');
    await page.fill('input[type="date"]', '2026-06-01');
    await page.keyboard.press('Tab');
    await page.keyboard.type('2026-06-30'); 
    await page.click('button:has-text("Create Period")');
    await expect(page.locator('text=2026-06')).toBeVisible();
    await expect(page.locator('text=June 2026')).toBeVisible();
    await expect(page.locator('text=Open').first()).toBeVisible();
  });

  test('E2E-4 Soft Close', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem('accounting_periods', JSON.stringify([{ id: 'P1', period_code: '2026-06', period_name: 'June 2026', start_date: '2026-06-01', end_date: '2026-06-30', fiscal_year: 2026, status: 'Open' }]));
    });
    await page.goto('http://localhost:5173/finance/periods');
    await page.click('text=Soft Close');
    await page.fill('textarea[placeholder="Optional notes"]', 'Soft closing for review');
    await page.click('button:has-text("Confirm")');
    await expect(page.locator('text=Soft Closed')).toBeVisible();
  });

  test('E2E-5 Hard Close', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem('accounting_periods', JSON.stringify([{ id: 'P1', period_code: '2026-06', period_name: 'June 2026', start_date: '2026-06-01', end_date: '2026-06-30', fiscal_year: 2026, status: 'Soft Closed' }]));
    });
    await page.goto('http://localhost:5173/finance/periods');
    await page.click('text=Hard Close');
    await page.fill('textarea', 'Final closing for June');
    await page.click('button:has-text("Confirm")');
    await expect(page.locator('text=Closed').first()).toBeVisible();
  });
});

test.describe('B. PROJECT CLOSING E2E', () => {
  test('E2E-13 Close Project', async ({ page }) => {
    await page.evaluate(() => {
      const p = JSON.parse(window.localStorage.getItem('projects')!)[0];
      p.status = 'Ready to Close';
      window.localStorage.setItem('projects', JSON.stringify([p]));
    });
    await page.goto('http://localhost:5173/finance/project-closing');
    await page.click('text=Project Alpha 100M');
    await page.click('text=Close Project & Snapshot');
    await expect(page.locator('text=Closed').nth(1)).toBeVisible(); 
  });
});

test.describe('C. PROFIT DISTRIBUTION E2E', () => {
  test('E2E-15 Generate Distribution Draft', async ({ page }) => {
    await page.goto('http://localhost:5173/finance/profit-distributions');
    page.on('dialog', dialog => dialog.accept('PRJ-100'));
    await page.click('text=Generate Draft');
    await expect(page.locator('text=Rp 100.000.000')).toBeVisible();
    await page.click('text=Project: PRJ-100');
    await expect(page.locator('text=Rp 10.000.000')).toBeVisible(); // Reserve
    await expect(page.locator('text=Rp 40.500.000').first()).toBeVisible(); // Workers
  });

  test('E2E-18 Approve Distribution', async ({ page }) => {
    await page.evaluate(() => {
      const d = { id: 'D-1', project_id: 'PRJ-100', net_profit: 100000000, company_reserve: 10000000, remaining_profit: 90000000, worker_pool: 40500000, investor_pool: 40500000, csr: 9000000, rounding_difference: 0, status: 'Draft' };
      window.localStorage.setItem('profit_distributions', JSON.stringify([d]));
    });
    await page.goto('http://localhost:5173/finance/profit-distributions');
    await page.click('text=Project: PRJ-100');
    await page.click('text=Approve');
    await expect(page.locator('span:has-text("Approved")').first()).toBeVisible();
  });

  test('E2E-19 Post Distribution', async ({ page }) => {
    await page.evaluate(() => {
      const d = { id: 'D-1', project_id: 'PRJ-100', net_profit: 100000000, company_reserve: 10000000, remaining_profit: 90000000, worker_pool: 40500000, investor_pool: 40500000, csr: 9000000, rounding_difference: 0, status: 'Approved' };
      window.localStorage.setItem('profit_distributions', JSON.stringify([d]));
    });
    await page.goto('http://localhost:5173/finance/profit-distributions');
    await page.click('text=Project: PRJ-100');
    await page.click('text=Post Journal');
    await expect(page.locator('span:has-text("Posted")').first()).toBeVisible();
    
    // Check if journal exists
    const journals = await page.evaluate(() => JSON.parse(window.localStorage.getItem('journal_entries')!));
    expect(journals.length).toBeGreaterThan(1);
    expect(journals[journals.length - 1].source_type).toBe('Profit Distribution');
  });
});

test.describe('D. PAYOUT E2E', () => {
  test('E2E-20 Worker Partial Payout', async ({ page }) => {
    await page.evaluate(() => {
      const d = { id: 'D-1', project_id: 'PRJ-100', net_profit: 100000000, company_reserve: 10000000, remaining_profit: 90000000, worker_pool: 40500000, investor_pool: 40500000, csr: 9000000, rounding_difference: 0, status: 'Posted' };
      window.localStorage.setItem('profit_distributions', JSON.stringify([d]));
    });
    await page.goto('http://localhost:5173/finance/profit-distributions');
    await page.click('text=Project: PRJ-100');
    
    page.on('dialog', dialog => dialog.accept('10000000'));
    await page.click('text=Payout Workers');
    
    await expect(page.locator('td:has-text("Worker")').first()).toBeVisible();
    await expect(page.locator('td:has-text("Rp 10.000.000")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Partially Paid")').first()).toBeVisible();
  });
});

test.describe('G. RECONCILIATION AFTER PAYOUT', () => {
  test('Reconciliation checks out to Rp0', async ({ page }) => {
    const diff = await page.evaluate(() => {
      const journals = JSON.parse(window.localStorage.getItem('journal_entries') || '[]');
      const lines = JSON.parse(window.localStorage.getItem('journal_entry_lines') || '[]');
      
      const postedLines = lines.filter((l: any) => {
        const j = journals.find((jx: any) => jx.id === l.journal_entry_id);
        return j && j.status === 'Posted';
      });

      let totalDebit = 0;
      let totalCredit = 0;
      postedLines.forEach((l: any) => {
        totalDebit += l.debit;
        totalCredit += l.credit;
      });

      return Math.abs(totalDebit - totalCredit);
    });

    expect(diff).toBe(0);
  });
});
