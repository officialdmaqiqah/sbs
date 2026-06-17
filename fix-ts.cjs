const fs = require('fs');
const path = require('path');

const fixTypes = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Fix created_at in inventory_movements
  content = content.replace(/created_at:\s*new Date\(\).toISOString\(\),?/g, '');
  content = content.replace(/created_at:\s*[^,}]+,?/g, (match, offset, str) => {
    // Only remove if inside insert<InventoryMovement> or similar
    // Actually just remove created_at: ... if it's inside txDb.insert
    return '';
  });
  // Actually, a safer regex for created_at:
  content = content.replace(/created_at:\s*[^,}]+(,|(?=\s*\}))/g, '');

  // Fix runMockTransaction returning void by making it return true at the end
  content = content.replace(/runMockTransaction\(\(txDb\) => \{([\s\S]*?)\}\);/g, (match, p1) => {
    if (!p1.includes('return ')) {
      return `runMockTransaction((txDb) => {${p1}  return true;\n});`;
    }
    return match;
  });

  fs.writeFileSync(filePath, content, 'utf-8');
};

const files = [
  'src/services/feedProduction.ts',
  'src/services/production.ts',
  'src/services/salesFulfillment.ts',
  'src/services/stockOpname.ts',
  'src/services/profitDistributionService.ts'
];

files.forEach(f => {
  const p = path.join(__dirname, f);
  if (fs.existsSync(p)) {
    fixTypes(p);
  }
});
console.log('Done');
