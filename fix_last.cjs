const fs = require('fs');

// ChartOfAccounts.tsx
let coa = fs.readFileSync('src/pages/ChartOfAccounts.tsx', 'utf8');
coa = coa.replace(/import \{ Card, CardContent, CardHeader, CardTitle \} from '\.\.\/components\/ui\/card';/, '');
fs.writeFileSync('src/pages/ChartOfAccounts.tsx', coa, 'utf8');

// CustomerDP.tsx
let dp = fs.readFileSync('src/pages/CustomerDP.tsx', 'utf8');
dp = dp.replace(/arApService\.createCustomerDP\(/g, 'arApService.receiveCustomerDP(');
fs.writeFileSync('src/pages/CustomerDP.tsx', dp, 'utf8');

// CustomerInvoices.tsx
let ci = fs.readFileSync('src/pages/CustomerInvoices.tsx', 'utf8');
ci = ci.replace(/, CustomerDP/g, '');
fs.writeFileSync('src/pages/CustomerInvoices.tsx', ci, 'utf8');

// CustomerPayments.tsx
let cp = fs.readFileSync('src/pages/CustomerPayments.tsx', 'utf8');
cp = cp.replace(/, CustomerInvoice/g, '');
cp = cp.replace(/, CashBankAccount/g, '');
fs.writeFileSync('src/pages/CustomerPayments.tsx', cp, 'utf8');

// Dashboard.tsx
let db = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
db = db.replace(/import \{ Card, CardContent, CardHeader, CardTitle \} from '\.\.\/components\/ui\/card';/, '');
db = db.replace(/const inventoryReservations = useInventoryReservations\(\);\n/g, '');
fs.writeFileSync('src/pages/Dashboard.tsx', db, 'utf8');

// Distribusi.tsx
let dist = fs.readFileSync('src/pages/Distribusi.tsx', 'utf8');
dist = dist.replace(/const projects = useProjects\(\);\n/g, '');
dist = dist.replace(/const \[search, setSearch\] = useState\(''\);\n/g, '');
fs.writeFileSync('src/pages/Distribusi.tsx', dist, 'utf8');

// OperasionalAyam.tsx (variables actually used for modals but since there's no modals in the UI, they're unused. wait, I restored them manually but they are unused! Let's just remove them)
let oa = fs.readFileSync('src/pages/OperasionalAyam.tsx', 'utf8');
oa = oa.replace(/const \[isRecordModalOpen, setIsRecordModalOpen\] = useState\(false\);\n/g, '');
oa = oa.replace(/const \[isFlockModalOpen, setIsFlockModalOpen\] = useState\(false\);\n/g, '');
fs.writeFileSync('src/pages/OperasionalAyam.tsx', oa, 'utf8');

// ProduksiKandang.tsx
let pk = fs.readFileSync('src/pages/ProduksiKandang.tsx', 'utf8');
pk = pk.replace(/, Product/g, '');
pk = pk.replace(/\(i\)/g, '(i: any)');
fs.writeFileSync('src/pages/ProduksiKandang.tsx', pk, 'utf8');
