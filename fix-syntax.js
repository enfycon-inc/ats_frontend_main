const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/job-posting/components/job-posting-dashboard.tsx', 'utf8');

c = c.replace(/\s*\{ id:  label: "Pods & Recruiters" \},?\r?\n/g, '\n');
c = c.replace(/\{ id:  label: "Pods & Recruiters" \},/g, '');

fs.writeFileSync('app/(dashboard)/job-posting/components/job-posting-dashboard.tsx', c);
console.log('Fixed syntax error in job-posting-dashboard.tsx');
