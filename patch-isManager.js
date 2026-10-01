const fs = require('fs');
const file = 'app/(dashboard)/settings/branch/page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /const isManager = selectedBranch\.managerId === user\.id;/,
  'const isManager = selectedBranch.managers?.some((m: any) => m.id === user.id);'
);

fs.writeFileSync(file, c);
