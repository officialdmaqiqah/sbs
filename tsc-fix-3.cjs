const fs = require('fs');
let bills = fs.readFileSync('src/pages/SupplierBills.tsx', 'utf-8');

bills = bills.replace(/\/\/ lines: \[\n          \{ item_id: 'MANUAL', description: 'Manual Bill Line', quantity: 1, unit_price: formData\.total_amount - formData\.tax_amount, total_price: formData\.total_amount - formData\.tax_amount \}\n        \]/g, "");

fs.writeFileSync('src/pages/SupplierBills.tsx', bills);
console.log("Fixed SupplierBills.tsx syntax error");
