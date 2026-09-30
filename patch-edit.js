const fs = require('fs');

let c = fs.readFileSync('app/(dashboard)/job-posting/[id]/edit/page.tsx', 'utf8');
c = c.replace(/workStartTime\?: string;\r?\n/g, '');
c = c.replace(/workEndTime\?: string;\r?\n/g, '');
c = c.replace(/workingDays\?: string\[\];\r?\n/g, '');
c = c.replace(/workStartTime: jobData\.workStartTime,\r?\n/g, '');
c = c.replace(/workEndTime: jobData\.workEndTime,\r?\n/g, '');
c = c.replace(/workingDays: jobData\.workingDays,\r?\n/g, '');
fs.writeFileSync('app/(dashboard)/job-posting/[id]/edit/page.tsx', c);
console.log('Fixed edit/page.tsx');
