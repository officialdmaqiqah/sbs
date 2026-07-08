import fs from 'fs';
import path from 'path';

const files = [
  'src/pages/Products.tsx',
  'src/pages/ProjectDetail.tsx',
  'src/pages/Purchase.tsx',
  'src/pages/Sales.tsx',
  'src/pages/SupplierPayments.tsx',
  'src/pages/InitialSetup.tsx'
];

for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Fix InitialSetup.tsx
  if (file.includes('InitialSetup.tsx')) {
    content = content.replace(/<CurrencyInput\s+name="nominal"/, '<input type="number" name="nominal"');
  }

  // Fix value type issues for CurrencyInput: value={some.value} -> value={some.value || ""}
  // Only for CurrencyInput components
  content = content.replace(/(<CurrencyInput[^>]*?value=\{)([^}]+)(\}[^>]*?>)/g, (match, p1, p2, p3) => {
    // If it already has || "" or is exactly "", skip
    if (p2.includes('|| ""') || p2.trim() === '""' || p2.trim() === "''") {
      return match;
    }
    // Also if p2 is just a number like 0
    if (!isNaN(p2.trim())) return match;
    
    // Check if it's String(something) or Number(something) and might return NaN, but || "" is safe enough
    return `${p1}${p2} || ""${p3}`;
  });

  // Fix SupplierPayments string assignment error
  if (file.includes('SupplierPayments.tsx')) {
    // SupplierPayments.tsx(189,175): error TS2322: Type 'string' is not assignable to type 'number | ""'.
    // SupplierPayments.tsx(189,244): error TS2322: Type 'number' is not assignable to type 'string'.
    // Let's replace value={val} with value={Number(val)} if needed, or onChange to store number.
    // In SupplierPayments:
    content = content.replace(/value=\{item\.amount\}/g, 'value={Number(item.amount) || ""}');
    content = content.replace(/amount:\s*val/g, 'amount: val.toString()'); // If amount is string in state
  }
  
  // Fix ProjectDetail string assignment error
  if (file.includes('ProjectDetail.tsx')) {
    content = content.replace(/value=\{amount\}/g, 'value={Number(amount) || ""}');
    content = content.replace(/setAmount\(val\)/g, 'setAmount(val.toString())'); // If amount is string in state
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Fixed ${file}`);
}
