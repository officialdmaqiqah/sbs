import fs from 'fs';
import path from 'path';

const SRC_DIR = './src/pages';
const FILES_TO_UPDATE = [
  'CashBankList.tsx',
  'CashBankTransactions.tsx',
  'CustomerDP.tsx',
  'CustomerInvoices.tsx',
  'CustomerPayments.tsx',
  'CustomerRefunds.tsx',
  'InitialSetup.tsx',
  'Products.tsx',
  'ProjectDetail.tsx',
  'Purchase.tsx',
  'RacikPakan.tsx',
  'Sales.tsx',
  'SalesOrders.tsx',
  'SupplierPayments.tsx',
  'ProductionDetail.tsx',
  'DistributionDetail.tsx'
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Add import if missing
  if (!content.includes('CurrencyInput')) {
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLastImport) + "\nimport { CurrencyInput } from '../components/ui/CurrencyInput';" + content.slice(endOfLastImport);
    }
  }

  // A very brute-force way to do it line by line:
  let lines = content.split('\n');
  let updatedLines = lines.map(line => {
    if (line.includes('<input') && line.includes('type="number"')) {
      // Check if it's a currency line
      if (
        line.includes('amount') || 
        line.includes('price') || 
        line.includes('cost') || 
        line.includes('nominal') || 
        line.includes('payment') || 
        line.includes('discount')
      ) {
        // Change <input to <CurrencyInput
        let nl = line.replace('<input', '<CurrencyInput');
        // Remove type="number"
        nl = nl.replace('type="number"', '');
        // Replace Number(e.target.value) with val
        nl = nl.replace(/e\.target\.value/g, 'val');
        nl = nl.replace(/Number\(val\)/g, 'val');
        // Fix onChange parameter
        nl = nl.replace(/onChange=\{e =>/g, 'onChange={(val) =>');
        nl = nl.replace(/onChange=\{\(e\) =>/g, 'onChange={(val) =>');
        // If it was onChange={e => setAmount(Number(e.target.value))} it is now onChange={(val) => setAmount(val)}
        return nl;
      }
    }
    return line;
  });

  let newContent = updatedLines.join('\n');
  if (newContent !== original) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

FILES_TO_UPDATE.forEach(file => {
  const filePath = path.join(SRC_DIR, file);
  if (fs.existsSync(filePath)) {
    processFile(filePath);
  }
});
