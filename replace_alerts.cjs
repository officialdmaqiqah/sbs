const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('alert(')) {
      let modified = false;
      
      // Ensure toast is imported
      if (!content.includes("import toast from 'react-hot-toast'")) {
        const importRegex = /(import .* from '.*';\n)/g;
        const lastImportMatch = [...content.matchAll(importRegex)].pop();
        if (lastImportMatch) {
            const insertIndex = lastImportMatch.index + lastImportMatch[0].length;
            content = content.slice(0, insertIndex) + "import toast from 'react-hot-toast';\n" + content.slice(insertIndex);
        } else {
            content = "import toast from 'react-hot-toast';\n" + content;
        }
      }

      // Replace alert with toast.success or toast.error
      content = content.replace(/alert\(([^)]+)\)/g, (match, p1) => {
        modified = true;
        const lowerStr = p1.toLowerCase();
        if (lowerStr.includes('success') || lowerStr.includes('berhasil') || lowerStr.includes('berhasil!')) {
          return `toast.success(${p1})`;
        } else if (lowerStr.includes('error') || lowerStr.includes('gagal') || lowerStr.includes('kurang') || lowerStr.includes('tidak valid') || lowerStr.includes('belum aktif') || lowerStr.includes('harus') || lowerStr.includes('silakan') || lowerStr.includes('cannot') || lowerStr.includes('tidak dapat')) {
          return `toast.error(${p1})`;
        } else {
          return `toast.error(${p1})`; // Default to error since most alert(...) with dynamic msgs are errors
        }
      });
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
      }
    }
  }
});
