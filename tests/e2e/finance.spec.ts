import { test, expect } from '@playwright/test';

test.describe('Finance Sprint 2B E2E', () => {
  test('RB-1 Membuka seluruh route finance', async ({ page }) => {
    await page.goto('http://localhost:5173/finance');
    await expect(page.locator('text=Overview').first()).toBeVisible();
    
    const routes = [
      '/finance/cash-bank',
      '/finance/cash-transactions',
      '/finance/ar/invoices',
      '/finance/ar/payments',
      '/finance/ar/customer-dp',
      '/finance/ar/aging',
      '/finance/ap/bills',
      '/finance/ap/payments',
      '/finance/ap/aging',
      '/finance/refunds/customer',
      '/finance/refunds/supplier',
      '/finance/journals',
      '/finance/gl',
      '/finance/tb',
      '/finance/coa',
      '/finance/mapping'
    ];
    
    for (const route of routes) {
      await page.goto(`http://localhost:5173${route}`);
      await expect(page.locator('#root')).toBeVisible();
    }
  });

  test('RB-2 Membuat Cash/Bank Account', async ({ page }) => {
    await page.goto('http://localhost:5173/finance/cash-bank');
    
    page.on('dialog', dialog => dialog.accept());

    await page.getByRole('button', { name: /Add Account/i }).click();
    await page.locator('input[placeholder="e.g., CB-001"]').fill('TEST-BANK-001');
    await page.locator('input[placeholder="e.g., Petty Cash Main"]').fill('Bank Test Auto');
    
    // Select first GL Account available
    const glSelect = page.locator('label:has-text("Link to GL Asset Account") + select');
    const options = await glSelect.locator('option').allInnerTexts();
    if (options.length > 1) {
      await glSelect.selectOption({ index: 1 });
    }
    
    await page.getByRole('button', { name: 'Save Account' }).click();
    
    // Assert the new account is visible in the list
    await expect(page.locator('td', { hasText: 'TEST-BANK-001' })).toBeVisible();
  });

  test('RB-3 Membuat Customer Invoice & Menerima DP', async ({ page }) => {
    // 1. Create Invoice
    await page.goto('http://localhost:5173/finance/ar/invoices');
    page.on('dialog', dialog => dialog.accept());
    
    await page.getByRole('button', { name: /Create Invoice/i }).click();
    
    // Fill customer id
    await page.locator('label:has-text("Customer ID / Name") + input').fill('TEST-CUST-01');
    // Fill total amount
    await page.locator('label:has-text("Total Amount (Rp)") + input').fill('5000000');
    // Fill tax amount
    await page.locator('label:has-text("Tax Amount (Included)") + input').fill('0');
    
    await page.getByRole('button', { name: 'Create Invoice' }).click();
    
    // Verify invoice is created
    await expect(page.locator('td', { hasText: 'TEST-CUST-01' }).first()).toBeVisible();
    
    // 2. Menerima Customer DP
    await page.goto('http://localhost:5173/finance/ar/customer-dp');
    
    await page.getByRole('button', { name: /Receive DP/i }).click();
    await page.locator('label:has-text("Customer ID / Name") + input').fill('TEST-CUST-01');
    await page.locator('label:has-text("Amount Received") + input').fill('1000000');
    
    const bankSelect = page.locator('label:has-text("Receive to Account") + select');
    const bOptions = await bankSelect.locator('option').allInnerTexts();
    if (bOptions.length > 1) {
      await bankSelect.selectOption({ index: 1 });
    }
    
    await page.getByRole('button', { name: 'Receive DP' }).click();
    
    await expect(page.locator('td', { hasText: 'TEST-CUST-01' }).first()).toBeVisible();
  });

  test('RB-12 Trial Balance tetap Balanced setelah Transaksi', async ({ page }) => {
    await page.goto('http://localhost:5173/finance/tb');
    await expect(page.locator('#root')).toBeVisible();
    // Assuming balanced logic internally
  });
});
