const fs = require('fs');

let sales = fs.readFileSync('src/pages/Sales.tsx', 'utf-8');
sales = sales.replace(/order_type: e\.target\.value as any, \/\/ item_id: ''\}\)/g, "order_type: e.target.value as any, item_id: ''})");
sales = sales.replace(/setForm\(\{\.\.\.form, \/\/ item_id: e\.target\.value\}\)/g, "setForm({...form, item_id: e.target.value})");
sales = sales.replace(/size="[a-zA-Z]+"/g, ""); // Remove size completely in case Modal complains
fs.writeFileSync('src/pages/Sales.tsx', sales);

let bills = fs.readFileSync('src/pages/SupplierBills.tsx', 'utf-8');
bills = bills.replace(/<Modal isOpen=\{isNewModalOpen\} onClose=\{\(\) => setIsNewModalOpen\(false\)\} title="Create Supplier Bill" size="2xl">/g, '<Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="Create Supplier Bill">');
bills = bills.replace(/<Modal isOpen=\{isDetailModalOpen\} onClose=\{\(\) => setIsDetailModalOpen\(false\)\} title="Bill Details" size="2xl">/g, '<Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Bill Details">');
fs.writeFileSync('src/pages/SupplierBills.tsx', bills);
