const fs = require('fs');

// Dashboard.tsx
let db = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
db = db.replace(/const r = txDb\.query.*?\n/g, ''); 
fs.writeFileSync('src/pages/Dashboard.tsx', db, 'utf8');

// OperasionalAyam.tsx
let oa = fs.readFileSync('src/pages/OperasionalAyam.tsx', 'utf8');
oa = oa.replace(/const \[isRecordModalOpen, setIsRecordModalOpen\] = useState\(false\);\n/g, '');
oa = oa.replace(/const \[isFlockModalOpen, setIsFlockModalOpen\] = useState\(false\);\n/g, '');
fs.writeFileSync('src/pages/OperasionalAyam.tsx', oa, 'utf8');

// ProduksiKandang.tsx
let pk = fs.readFileSync('src/pages/ProduksiKandang.tsx', 'utf8');
pk = pk.replace(/\(i\)/g, '(i: any)');
fs.writeFileSync('src/pages/ProduksiKandang.tsx', pk, 'utf8');
