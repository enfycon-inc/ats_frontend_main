const fs = require('fs');

function removeFallback(file) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/market: selectedUnitObj\?\.market \|\| "IN",/g, 'market: selectedUnitObj?.market,');
  c = c.replace(/market: selectedUnitObj\?\.market \|\| "US",/g, 'market: selectedUnitObj?.market,');
  c = c.replace(/market: selectedUnitObj\?\.market \|\| "GLOBAL",/g, 'market: selectedUnitObj?.market,');
  fs.writeFileSync(file, c);
  console.log(`Removed fallback from ${file}`);
}

removeFallback('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx');
removeFallback('app/(dashboard)/job-posting/new/UsStaffingForm.tsx');
removeFallback('app/(dashboard)/job-posting/new/GlobalStandardForm.tsx');
