const fs = require('fs');

// accountingAutoJournal.ts
let aj = fs.readFileSync('src/services/accountingAutoJournal.ts', 'utf-8');

// fix imports
aj = aj.replace(/SalesOrderItem, /g, '');
// fix unused totalDebit/totalCredit (lines 62-63 approx)
aj = aj.replace(/let totalDebit = 0;/g, '// let totalDebit = 0;');
aj = aj.replace(/let totalCredit = 0;/g, '// let totalCredit = 0;');

// fix Untyped function calls txDb.query<SalesOrderItem>
aj = aj.replace(/txDb\.query<SalesOrderItem>\(/g, 'txDb.query(');

// fix unused args totalCost, yieldQty
aj = aj.replace(/, totalCost: number, yieldQty: number/g, '');

// fix ProductionOrder result_item_id
aj = aj.replace(/resultItemId = order\.result_item_id; \/\/ assuming this exists or we map to Kandang Jadi/g, 
  "const kandangItem = txDb.query('items', (i: any) => i.category === 'Kandang Jadi')[0];\n      resultItemId = kandangItem ? kandangItem.id : null;");

// fix FeedProductionOrder feed_recipe_id
aj = aj.replace(/order\.feed_recipe_id/g, "order.recipe_id");

fs.writeFileSync('src/services/accountingAutoJournal.ts', aj);
console.log("Fixed accountingAutoJournal.ts");
