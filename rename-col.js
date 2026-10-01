const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/settings/branch/page.tsx', 'utf8');

c = c.replace(/BRANCH HEAD/g, 'BRANCH ADMIN');
c = c.replace(/Branch Head/g, 'Branch Admin');
c = c.replace(/Branch Heads/g, 'Branch Admins');
c = c.replace(/branch head/gi, 'branch admin');

fs.writeFileSync('app/(dashboard)/settings/branch/page.tsx', c);
console.log("Renamed Branch Head to Branch Admin in frontend");
