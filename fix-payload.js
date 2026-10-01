const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/settings/branch/page.tsx', 'utf8');

c = c.replace(/name: unitFormData\.name\.trim\(\),\n        branchId: unitFormData\.branchId,/,
  "name: unitFormData.name.trim(),\n        code: unitFormData.code || unitFormData.market || 'GEN',\n        branchId: unitFormData.branchId,");

c = c.replace(/name: editUnitFormData\.name\.trim\(\),\n        market: editUnitFormData\.market,/,
  "name: editUnitFormData.name.trim(),\n        code: editUnitFormData.code || editUnitFormData.market || 'GEN',\n        market: editUnitFormData.market,");

fs.writeFileSync('app/(dashboard)/settings/branch/page.tsx', c);
console.log("Added code to payload in settings page");
