const fs = require('fs');

function fixFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  for (const rep of replacements) {
    content = content.replace(rep.search, rep.replace);
  }
  fs.writeFileSync(filePath, content);
}

// Fix SupplierPayments.tsx
fixFile('src/pages/SupplierPayments.tsx', [
  { search: /import \{ Button \} from '\.\.\/components\/ui\/button';\n/g, replace: '' },
  { search: /import \{ Input \} from '\.\.\/components\/ui\/input';\n/g, replace: '' },
  { search: /import \{ Label \} from '\.\.\/components\/ui\/label';\n/g, replace: '' },
  { search: /import \{ SupplierPayment, SupplierBill, CashBankAccount \} from '\.\.\/types';/g, replace: "import type { SupplierPayment, CashBankAccount } from '../types';" },
  { search: /<Button/g, replace: '<button' },
  { search: /<\/Button>/g, replace: '</button>' },
  { search: /<Input/g, replace: '<input' },
  { search: /<Label/g, replace: '<label' },
  { search: /<\/Label>/g, replace: '</label>' },
  { search: /\(e\) =>/g, replace: '(e: any) =>' },
  { search: /p\.status === 'Fully Applied'/g, replace: "p.status === 'Posted'" },
]);

// Fix SupplierRefunds.tsx
fixFile('src/pages/SupplierRefunds.tsx', [
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

// Fix TrialBalance.tsx
fixFile('src/pages/TrialBalance.tsx', [
  { search: /import React, \{ useState, useEffect \} from 'react';\n/g, replace: "import { useState, useEffect } from 'react';\n" },
  { search: /import \{ Card, CardContent \} from '\.\.\/components\/ui\/card';\n/g, replace: '' },
  { search: /<Card>/g, replace: '<div className="bg-white rounded-lg shadow">' },
  { search: /<Card /g, replace: '<div className="bg-white rounded-lg shadow" ' },
  { search: /<\/Card>/g, replace: '</div>' },
  { search: /<CardContent>/g, replace: '<div className="p-6">' },
  { search: /<CardContent /g, replace: '<div className="p-6" ' },
  { search: /<\/CardContent>/g, replace: '</div>' }
]);

// Fix SupplierBills.tsx (Remove lines references and implicit any)
let bills = fs.existsSync('src/pages/SupplierBills.tsx') ? fs.readFileSync('src/pages/SupplierBills.tsx', 'utf-8') : '';
bills = bills.replace(/<h3 className="font-semibold text-slate-900 mt-6 mb-2">Bill Lines<\/h3>[\s\S]*?<\/table>/m, '<div><p className="text-sm text-slate-500 italic mt-4">Detail item merujuk pada Purchase Receipt origin.</p></div>');
bills = bills.replace(/<Button/g, '<button').replace(/<\/Button>/g, '</button>').replace(/<Input/g, '<input').replace(/<Label/g, '<label').replace(/<\/Label>/g, '</label>');
bills = bills.replace(/\(e\) =>/g, '(e: any) =>');
// project_name error
bills = bills.replace(/b\.project_name/g, "b.project_id"); // Temporary fix, SupplierBill doesn't have project_name
fs.writeFileSync('src/pages/SupplierBills.tsx', bills);

console.log("Fixes applied.");
