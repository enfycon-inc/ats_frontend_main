const fs = require('fs');

const file1 = 'app/(dashboard)/management/units/new/page.tsx';
let c1 = fs.readFileSync(file1, 'utf8');
c1 = c1.replace(/market: seg\.code,/, "market: seg.code,\n        code: seg.code, // Auto-select unit code");
fs.writeFileSync(file1, c1);

const file2 = 'app/(dashboard)/management/units/[id]/edit/page.tsx';
let c2 = fs.readFileSync(file2, 'utf8');
c2 = c2.replace(/market: seg\.code,/, "market: seg.code,\n        code: seg.code, // Auto-select unit code");
fs.writeFileSync(file2, c2);

console.log("Updated both files");
