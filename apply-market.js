const fs = require('fs');

function patchForm(file, defaultMarket) {
  let c = fs.readFileSync(file, 'utf8');
  const marketCode = `market: selectedUnitObj?.market || "${defaultMarket}",`;
  
  if (c.includes('market: "IN",')) {
    c = c.replace(/market: "IN",/g, marketCode);
  } else if (c.includes('market: "US",')) {
    c = c.replace(/market: "US",/g, marketCode);
  } else if (c.includes('status: initialJobStatus,')) {
    c = c.replace(/status: initialJobStatus,/g, `status: initialJobStatus,\n          ${marketCode}`);
  }
  
  fs.writeFileSync(file, c);
  console.log(`Patched ${file}`);
}

patchForm('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'IN');
patchForm('app/(dashboard)/job-posting/new/UsStaffingForm.tsx', 'US');
patchForm('app/(dashboard)/job-posting/new/GlobalStandardForm.tsx', 'GLOBAL');
