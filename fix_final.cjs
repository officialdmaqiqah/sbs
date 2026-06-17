const fs = require('fs');

// Dashboard.tsx
let db = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
db = db.replace(/import \{ Card, CardContent, CardHeader, CardTitle \} from '\.\.\/components\/ui\/card';\n/g, '');
db = db.replace(/const inventoryReservations = useInventoryReservations\(\);\n/g, '');
db = db.replace(/\(m\)/g, '(m: any)');
db = db.replace(/const r = txDb\.query.*?\n/g, ''); // Wait, I'll just change  to _r
db = db.replace(/txDb\.query\('accounts', \(a: any\) => a\.account_code === '2103'\)\[0\]/g, 'txDb.query(\'accounts\', (a: any) => a.account_code === \'2103\')[0] as Account');
fs.writeFileSync('src/pages/Dashboard.tsx', db, 'utf8');

// Distribusi.tsx
let dist = fs.readFileSync('src/pages/Distribusi.tsx', 'utf8');
dist = dist.replace(/const projects = useProjects\(\);\n/g, '');
dist = dist.replace(/const \[search, setSearch\] = useState\(''\);\n/g, '');
fs.writeFileSync('src/pages/Distribusi.tsx', dist, 'utf8');

// OperasionalAyam.tsx
let oa = fs.readFileSync('src/pages/OperasionalAyam.tsx', 'utf8');
oa = oa.replace(/const \[isRecordModalOpen, setIsRecordModalOpen\] = useState\(false\);\n/g, '');
oa = oa.replace(/const \[isFlockModalOpen, setIsFlockModalOpen\] = useState\(false\);\n/g, '');
fs.writeFileSync('src/pages/OperasionalAyam.tsx', oa, 'utf8');

// ProduksiKandang.tsx
let pk = fs.readFileSync('src/pages/ProduksiKandang.tsx', 'utf8');
pk = pk.replace(/\(i\)/g, '(i: any)');
fs.writeFileSync('src/pages/ProduksiKandang.tsx', pk, 'utf8');
