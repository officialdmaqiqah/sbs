const fs = require('fs');

const pages = [
  { path: '/finance', file: 'FinanceOverview.tsx' },
  { path: '/finance/cash-bank', file: 'CashBankList.tsx' },
  { path: '/finance/cash-transactions', file: 'CashBankTransactions.tsx' },
  { path: '/finance/ar/invoices', file: 'CustomerInvoices.tsx' },
  { path: '/finance/ar/payments', file: 'CustomerPayments.tsx' },
  { path: '/finance/ar/customer-dp', file: 'CustomerDP.tsx' },
  { path: '/finance/ar/aging', file: 'ARAging.tsx' },
  { path: '/finance/ap/bills', file: 'SupplierBills.tsx' },
  { path: '/finance/ap/payments', file: 'SupplierPayments.tsx' },
  { path: '/finance/ap/aging', file: 'APAging.tsx' },
  { path: '/finance/refunds/customer', file: 'CustomerRefunds.tsx' },
  { path: '/finance/refunds/supplier', file: 'SupplierRefunds.tsx' },
  { path: '/finance/journals', file: 'JournalRegister.tsx' },
  { path: '/finance/gl', file: 'GeneralLedger.tsx' },
  { path: '/finance/tb', file: 'TrialBalance.tsx' },
  { path: '/finance/coa', file: 'ChartOfAccounts.tsx' },
  { path: '/finance/mapping', file: 'AccountingMapping.tsx' }
];

let report = `# Finance Integration Audit Report\n\n`;

for (const page of pages) {
  const filePath = `src/pages/${page.file}`;
  report += `## ${page.path}\n`;
  report += `- **Component:** \`${page.file}\`\n`;
  
  if (!fs.existsSync(filePath)) {
    report += `- **Status:** Broken (File Missing)\n`;
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Detect status
  let status = 'Real';
  if (content.includes('Under Construction') || content.includes('Coming soon') || content.includes('Not Implemented')) {
    status = 'Placeholder';
  } else if (content.length < 2000) {
    status = 'Partial';
  }
  
  // Detect services
  const services = [];
  if (content.includes('cashBankService')) services.push('cashBankService');
  if (content.includes('arApService')) services.push('arApService');
  if (content.includes('accountingService')) services.push('accountingService');
  if (content.includes('useFinance')) services.push('useFinance (hooks)');
  if (content.includes('db.')) services.push('db (direct)');
  
  // Detect actions
  const actions = [];
  if (content.includes('handleCreate') || content.includes('onSubmit') || content.includes('create')) actions.push('Create');
  if (content.includes('handleUpdate') || content.includes('onUpdate') || content.includes('update')) actions.push('Update');
  if (content.includes('handleDelete') || content.includes('onDelete') || content.includes('delete')) actions.push('Delete');
  if (content.includes('handlePost') || content.includes('onPost')) actions.push('Post');
  
  // Detect empty handlers
  const emptyHandlers = (content.match(/onClick=\{?\(\) => \{\}\}?/g) || []).length;
  
  report += `- **Status:** ${status}\n`;
  report += `- **Services:** ${services.join(', ') || 'None'}\n`;
  report += `- **Actions:** ${actions.join(', ') || 'Read-only'}\n`;
  if (emptyHandlers > 0) {
    report += `- **Empty Handlers (To Fix):** ${emptyHandlers} found\n`;
  }
  report += `\n`;
}

fs.writeFileSync('C:/Users/USER/.gemini/antigravity/brain/dbaf9e09-643a-49ad-bf44-099e39ec8dc7/FINANCE_INTEGRATION_AUDIT_REPORT.md', report);
console.log("Report generated.");
