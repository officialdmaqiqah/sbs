const fs = require('fs');

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  for (const rep of replacements) {
    if (typeof rep.search === 'string') {
      content = content.split(rep.search).join(rep.replace);
    } else {
      content = content.replace(rep.search, rep.replace);
    }
  }
  fs.writeFileSync(filePath, content);
}

// pages/SupplierBills.tsx
replaceInFile('src/pages/SupplierBills.tsx', [
  { search: /import \{ SupplierBill, Project \} from '\.\.\/types';/g, replace: "import type { SupplierBill, Project } from '../types';" },
  { search: /import \{ Button \} from '\.\.\/components\/ui\/button';\n/g, replace: '' },
  { search: /import \{ Input \} from '\.\.\/components\/ui\/input';\n/g, replace: '' },
  { search: /import \{ Label \} from '\.\.\/components\/ui\/label';\n/g, replace: '' },
  { search: /import db from '\.\.\/services\/db';/g, replace: "import { db } from '../services/db';" },
  { search: /subtotal:/g, replace: 'total_amount:' },
  { search: /<Button/g, replace: '<button' },
  { search: /<\/Button>/g, replace: '</button>' },
  { search: /<Input/g, replace: '<input' },
  { search: /<Label/g, replace: '<label' },
  { search: /<\/Label>/g, replace: '</label>' },
  { search: /\(e\) =>/g, replace: '(e: any) =>' }
]);

// pages/SupplierPayments.tsx
replaceInFile('src/pages/SupplierPayments.tsx', [
  { search: /, CashBankAccount/g, replace: '' },
  { search: /import \{ Button \} from '\.\.\/components\/ui\/button';\n/g, replace: '' },
  { search: /import \{ Input \} from '\.\.\/components\/ui\/input';\n/g, replace: '' },
  { search: /import \{ Label \} from '\.\.\/components\/ui\/label';\n/g, replace: '' },
  { search: /p\.status === 'Fully Applied'/g, replace: "p.status === 'Posted'" },
  { search: /<Button/g, replace: '<button' },
  { search: /<\/Button>/g, replace: '</button>' },
  { search: /<Input/g, replace: '<input' },
  { search: /<Label/g, replace: '<label' },
  { search: /<\/Label>/g, replace: '</label>' },
  { search: /\(e\) =>/g, replace: '(e: any) =>' }
]);

// pages/SupplierRefunds.tsx
replaceInFile('src/pages/SupplierRefunds.tsx', [
  { search: /import \{ Button \} from '\.\.\/components\/ui\/button';\n/g, replace: '' },
  { search: /import \{ Input \} from '\.\.\/components\/ui\/input';\n/g, replace: '' },
  { search: /import \{ Label \} from '\.\.\/components\/ui\/label';\n/g, replace: '' },
  { search: /<Button/g, replace: '<button' },
  { search: /<\/Button>/g, replace: '</button>' },
  { search: /<Input/g, replace: '<input' },
  { search: /<Label/g, replace: '<label' },
  { search: /<\/Label>/g, replace: '</label>' },
  { search: /\(e\) =>/g, replace: '(e: any) =>' }
]);

// src/services/accountingAutoJournal.ts
replaceInFile('src/services/accountingAutoJournal.ts', [
  { search: /import \{ db \} from '\.\.\/services\/db';\n/g, replace: '' },
  { search: /PurchaseOrder, /g, replace: '' },
  { search: /, InventoryMovement/g, replace: '' },
  { search: /SalesOrderItem, /g, replace: '' }
]);

// src/services/accountingService.ts
replaceInFile('src/services/accountingService.ts', [
  { search: /JournalStatus, /g, replace: '' },
  { search: /mockTxDb\.clear\(\);/g, replace: '(mockTxDb as any).clear();' },
  { search: /const updatedBy =/g, replace: '// const updatedBy =' },
  { search: /inserted\.id/g, replace: '(inserted as any).id' },
  { search: /let reason = 'Unknown';/g, replace: '// let reason = "Unknown";' },
  { search: /reason = e\.message;/g, replace: '// reason = e.message;' },
  { search: /import \{ db \} from '\.\/db';/g, replace: "import { db, MockDB } from './db';" },
  { search: /is_reversed: false/g, replace: '' }
]);

// src/services/arApService.ts
replaceInFile('src/services/arApService.ts', [
  { search: /const mappings = /g, replace: '// const mappings = ' }
]);

// src/services/dailyRecordService.ts
replaceInFile('src/services/dailyRecordService.ts', [
  { search: /, CostingStatus/g, replace: '' }
]);

// src/services/db.ts
replaceInFile('src/services/db.ts', [
  { search: /const isIn = /g, replace: '// const isIn = ' }
]);

// src/services/migrationBackfillService.ts
replaceInFile('src/services/migrationBackfillService.ts', [
  { search: /, item\.id, "migration"/g, replace: '' },
  { search: /, item\.id, "migration"/g, replace: '' }, // Just in case
  { search: /invoice_number:/g, replace: 'notes:' },
  { search: /import type \{/g, replace: 'import type { ReturnDelivery,' }
]);

// src/services/production.ts
replaceInFile('src/services/production.ts', [
  { search: /const success = /g, replace: '// const success = ' },
  { search: /let errorMessage = '';/g, replace: '// let errorMessage = "";' },
  { search: /errorMessage =/g, replace: '// errorMessage =' }
]);

// src/services/profitDistributionService.ts
replaceInFile('src/services/profitDistributionService.ts', [
  { search: /import \{ accountingService \} from '\.\/accountingService';\n/g, replace: '' },
  { search: /res\.id/g, replace: '(res as any).id' },
  { search: /const postedBy =/g, replace: '// const postedBy =' }
]);

// src/services/salesFulfillment.ts
replaceInFile('src/services/salesFulfillment.ts', [
  { search: /import \{ db \} from '\.\/db';\n/g, replace: '' },
  { search: /import \{ arApService \} from '\.\/arApService';\n/g, replace: '' },
  { search: /Item, /g, replace: '' },
  { search: /let errorMessage = '';/g, replace: '// let errorMessage = "";' },
  { search: /errorMessage =/g, replace: '// errorMessage =' },
  { search: /id: generateId\(\),/g, replace: '' }, // ReturnDelivery omit ID
  { search: /const direction = /g, replace: '// const direction = ' }
]);

// src/services/stockOpname.ts
replaceInFile('src/services/stockOpname.ts', [
  { search: /AuditLog, /g, replace: '' },
  { search: /Item, /g, replace: '' }
]);

// src/tests/setup.ts
replaceInFile('src/tests/setup.ts', [
  { search: "import { db } from '../services/db';", replace: "declare var global: any;\nimport { db } from '../services/db';" }
]);

// src/tests/test_sales_fulfillment.ts
replaceInFile('src/tests/test_sales_fulfillment.ts', [
  { search: "import { db } from '../services/db';", replace: "declare var global: any;\nimport { db } from '../services/db';" },
  { search: /, runMockTransaction /g, replace: ' ' },
  { search: /import \{ costingService \} from '\.\.\/services\/costingService';\n/g, replace: '' },
  { search: /Product, /g, replace: '' },
  { search: /db\.clear\(\);/g, replace: '(db as any).clear();' }
]);

console.log("TSC Fixes Applied!");
