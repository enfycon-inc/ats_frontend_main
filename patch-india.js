const fs = require('fs');
const file = 'app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/client:\s*zod\.string\(\)\.optional\(\),/, 'client: zod.string().min(1, "Client is required"),');
c = c.replace(/endClientName:\s*zod\.string\(\)\.min\(1,\s*"End Client is required"\),/, 'endClientName: zod.string().optional(),');

fs.writeFileSync(file, c);
console.log('Done.');
