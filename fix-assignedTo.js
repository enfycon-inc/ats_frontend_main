const fs = require('fs');
let f = 'app/(dashboard)/job-posting/[id]/page.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(/\{job\?\.assignedTo \|\| "Pod \/ Recruiter"\}/g, '{job?.podName || job?.recruiter || "Unassigned"}');

fs.writeFileSync(f, c);
console.log('Fixed assignedTo in page.tsx');
