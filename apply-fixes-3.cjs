const fs = require('fs');

const filesToFix = ['src/pages/SupplierPayments.tsx', 'src/pages/SupplierRefunds.tsx', 'src/pages/TrialBalance.tsx'];

for (const file of filesToFix) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    
    // Remove imports
    content = content.replace(/import \{ Button \} from '\.\.\/components\/ui\/button';\n/g, '');
    content = content.replace(/import \{ Input \} from '\.\.\/components\/ui\/input';\n/g, '');
    content = content.replace(/import \{ Label \} from '\.\.\/components\/ui\/label';\n/g, '');
    content = content.replace(/import \{ Card, CardContent \} from '\.\.\/components\/ui\/card';\n/g, '');
    content = content.replace(/import React, \{ useState, useEffect \} from 'react';\n/g, "import { useState, useEffect } from 'react';\n");
    content = content.replace(/import React, \{ useState, useMemo \} from 'react';\n/g, "import { useState, useMemo } from 'react';\n");
    
    // Fix components
    content = content.replace(/<Button/g, '<button');
    content = content.replace(/<\/Button>/g, '</button>');
    content = content.replace(/<Input/g, '<input');
    content = content.replace(/<Label/g, '<label');
    content = content.replace(/<\/Label>/g, '</label>');
    content = content.replace(/<Card>/g, '<div className="bg-white rounded-lg shadow">');
    content = content.replace(/<Card /g, '<div className="bg-white rounded-lg shadow" ');
    content = content.replace(/<\/Card>/g, '</div>');
    content = content.replace(/<CardContent>/g, '<div className="p-6">');
    content = content.replace(/<CardContent /g, '<div className="p-6" ');
    content = content.replace(/<\/CardContent>/g, '</div>');
    
    // Fix typings: (e) => to (e: any) =>
    content = content.replace(/\(e\) =>/g, '(e: any) =>');
    
    // Fix SupplierPayments specific error
    content = content.replace(/p\.status === 'Fully Applied'/g, 'p.status === \\'Posted\\'');
    
    fs.writeFileSync(file, content);
  }
}
