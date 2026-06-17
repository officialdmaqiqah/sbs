const fs = require('fs');
const path = require('path');

const unfixTypes = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Undo the bad runMockTransaction replacement
  // We look for `return true;\n});` that was incorrectly placed.
  // Actually, we can just replace `\n            return true;\n});` or `\n  return true;\n});` with `});`
  // But wait, what if I just restore `created_at: new Date().toISOString(),`?
  // Let's just fix the bad syntax first.
  content = content.replace(/\s*return true;\n\}\);/g, '});');

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
    unfixTypes(p);
  }
});
console.log('Unfixed syntax');
