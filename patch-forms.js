const fs = require('fs');
let file = 'app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx';
let c = fs.readFileSync(file, 'utf8');
c = c.replace(/status: initialJobStatus,/, 'status: initialJobStatus,\n          market: "IN",');
fs.writeFileSync(file, c);
console.log('Patched IndiaStaffingForm.tsx');

file = 'app/(dashboard)/job-posting/new/UsStaffingForm.tsx';
c = fs.readFileSync(file, 'utf8');
c = c.replace(/status: initialJobStatus,/, 'status: initialJobStatus,\n          market: "US",');
fs.writeFileSync(file, c);
console.log('Patched UsStaffingForm.tsx');
