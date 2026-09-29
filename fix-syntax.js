const fs = require('fs');
const path = require('path');

function fixSyntaxErrors(dir) {
  const files = fs.readdirSync(dir);
  let patchedCount = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      patchedCount += fixSyntaxErrors(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      const originalContent = content;

      // Fix businessUnitRef
      content = content.replace(/\(job as any\)\.businessUnit \|\| 'N\/A'Ref/g, '(job as any).businessUnitRef');
      // Fix businessUnitId
      content = content.replace(/\(job as any\)\.businessUnit \|\| 'N\/A'Id/g, '(job as any).businessUnitId');
      
      // Fix chained method calls on 'N/A'
      content = content.replace(/\(job as any\)\.assignedTo \|\| 'N\/A'\?\./g, '((job as any).assignedTo || "N/A")?.');
      content = content.replace(/\(job as any\)\.assignedTo \|\| 'N\/A'\./g, '((job as any).assignedTo || "N/A").');
      
      content = content.replace(/\(job as any\)\.businessUnit \|\| 'N\/A'\?\./g, '((job as any).businessUnit || "N/A")?.');
      content = content.replace(/\(job as any\)\.businessUnit \|\| 'N\/A'\./g, '((job as any).businessUnit || "N/A").');

      // Fix logical chaining without parens that looks sketchy (e.g. `!job.assignedTo || 'N/A'.toUpperCase()`)
      content = content.replace(/!\(job as any\)\.assignedTo \|\| 'N\/A'/g, '!((job as any).assignedTo || "N/A")');
      
      // Fix specific N/A || Direct issue
      content = content.replace(/\|\| 'N\/A' \|\| "Direct"/g, '|| "Direct"');
      content = content.replace(/\|\| 'N\/A' \|\| 'Direct'/g, '|| "Direct"');

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`Patched syntax errors in ${fullPath}`);
        patchedCount++;
      }
    }
  }
  return patchedCount;
}

const dir = path.join(__dirname, 'app');
console.log(`Starting syntax fix in ${dir}`);
const total = fixSyntaxErrors(dir);
console.log(`Fixed ${total} files.`);
