const fs = require('fs');

// 1. cashBankService.ts
let cb = fs.readFileSync('src/services/cashBankService.ts', 'utf-8');
cb = cb.replace(/description: tx\.description\s*\n\s*\};/g, "description: tx.description,\n        created_by: 'System'\n      };");
fs.writeFileSync('src/services/cashBankService.ts', cb);

// 2. accountingAutoJournal.ts
let aj = fs.readFileSync('src/services/accountingAutoJournal.ts', 'utf-8');
// Fix JournalEntry Line created_by errors (lines arrays)
aj = aj.replace(/created_by: 'System', /g, '');
// Fix header objects missing created_by
aj = aj.replace(/description: (.*?)\s*\n\s*\};/g, "description: $1,\n        created_by: 'System'\n      };");
fs.writeFileSync('src/services/accountingAutoJournal.ts', aj);

// 3. accountingService.ts
let as = fs.readFileSync('src/services/accountingService.ts', 'utf-8');
// Remove MockDB import
as = as.replace(/import { db, runMockTransaction, MockDB } from '\.\/db';/, "import { db, runMockTransaction } from './db';");
as = as.replace(/import type { MockDB } from '\.\/db';/, "");
as = as.replace(/providedTxDb\?: MockDB/g, "providedTxDb?: any");
as = as.replace(/providedTxDb: MockDB/g, "providedTxDb: any");
fs.writeFileSync('src/services/accountingService.ts', as);

// 4. db.ts 
let dbt = fs.readFileSync('src/services/db.ts', 'utf-8');
dbt = dbt.replace(/export class MockDB/g, 'class MockDB');
dbt = dbt.replace(/class MockDB/g, 'export class MockDB'); // export it!
fs.writeFileSync('src/services/db.ts', dbt);

console.log('Fixes applied');
