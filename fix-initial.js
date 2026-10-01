const fs = require('fs');

const file1 = 'app/(dashboard)/management/units/new/page.tsx';
let c1 = fs.readFileSync(file1, 'utf8');

c1 = c1.replace(/market: first\.code,/, "market: first.code,\n              code: prev.code || first.code, // Auto-populate initially");
fs.writeFileSync(file1, c1);

const file2 = 'app/(dashboard)/management/units/[id]/edit/page.tsx';
let c2 = fs.readFileSync(file2, 'utf8');
c2 = c2.replace(/market: first\.code,/, "market: first.code,\n              code: prev.code || first.code, // Auto-populate initially");
fs.writeFileSync(file2, c2);

console.log("Fixed initial load population!");
