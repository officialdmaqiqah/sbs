const fs = require('fs');
let c = fs.readFileSync('src/services/accountingAutoJournal.ts', 'utf-8'); 
c = c.replace(/source_id: (.*?),\n\s*description: (.*?)\n\s*\};/g, "source_id: $1,\n        description: $2,\n        created_by: 'System'\n      };");
fs.writeFileSync('src/services/accountingAutoJournal.ts', c);
