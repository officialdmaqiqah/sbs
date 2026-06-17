const fs = require('fs');

// CashBankList.tsx
let cb = fs.readFileSync('src/pages/CashBankList.tsx', 'utf8');
cb = cb.replace(/acc => \[/g, '(acc: any) => [');
cb = cb.replace(/rows\.map\(r =>/g, 'rows.map((r: any) =>');
cb = cb.replace(/filteredAccounts\.map\(acc => \(/g, 'filteredAccounts.map((acc: any) => (');
fs.writeFileSync('src/pages/CashBankList.tsx', cb, 'utf8');

// ChartOfAccounts.tsx
let coa = fs.readFileSync('src/pages/ChartOfAccounts.tsx', 'utf8');
coa = coa.replace("import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';\n", "");
fs.writeFileSync('src/pages/ChartOfAccounts.tsx', coa, 'utf8');

// CashBankTransactions.tsx
let cbt = fs.readFileSync('src/pages/CashBankTransactions.tsx', 'utf8');
cbt = cbt.replace(/projects\.map\(p =>/g, 'projects.map((p: any) =>');
fs.writeFileSync('src/pages/CashBankTransactions.tsx', cbt, 'utf8');

// Dashboard.tsx
let db = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
db = db.replace(/import \{.*?\} from '\.\.\/components\/ui\/card';\n/g, '');
db = db.replace(/const inventoryReservations =.*?;\n/g, '');
db = db.replace(/movements\.map\(m =>/g, 'movements.map((m: any) =>');
db = db.replace(/const r = txDb\.query.*?;\n/g, ''); // Fix unused 'r' if it's there
fs.writeFileSync('src/pages/Dashboard.tsx', db, 'utf8');

// Distribusi.tsx
let dist = fs.readFileSync('src/pages/Distribusi.tsx', 'utf8');
dist = dist.replace(/, InventoryReservation/g, '');
dist = dist.replace(/, PackageSearch/g, '');
dist = dist.replace(/const projects =.*?;\n/g, '');
dist = dist.replace(/const \[search, setSearch\] = useState\(''\);\n/g, '');
fs.writeFileSync('src/pages/Distribusi.tsx', dist, 'utf8');

// OperasionalAyam.tsx
let oa = fs.readFileSync('src/pages/OperasionalAyam.tsx', 'utf8');
oa = oa.replace(/setIsRecordModalOpen\(false\)/g, '');
oa = oa.replace(/setIsFlockModalOpen\(false\)/g, '');
fs.writeFileSync('src/pages/OperasionalAyam.tsx', oa, 'utf8');

// ProduksiKandang.tsx
let pk = fs.readFileSync('src/pages/ProduksiKandang.tsx', 'utf8');
pk = pk.replace(/, Product/g, '');
pk = pk.replace(/m\.type/g, 'm.movement_type'); // InventoryMovement uses movement_type
pk = pk.replace(/\(i\)/g, '(i: any)');
fs.writeFileSync('src/pages/ProduksiKandang.tsx', pk, 'utf8');

// SupplierRefunds.tsx
let sr = fs.readFileSync('src/pages/SupplierRefunds.tsx', 'utf8');
sr = sr.replace(/, useMemo/g, '');
fs.writeFileSync('src/pages/SupplierRefunds.tsx', sr, 'utf8');
