const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/job-posting/components/job-posting-dashboard.tsx', 'utf8');

const old = 'job.createdBy === currentUser?.id ||';
const replace = 'job.createdBy === currentUser?.id ||\n            job.accountManagerId === currentUser?.id ||';

if (c.includes(old)) {
  c = c.replace(old, replace);
  fs.writeFileSync('app/(dashboard)/job-posting/components/job-posting-dashboard.tsx', c);
  console.log('✅ Added job.accountManagerId === currentUser?.id to My Jobs filter');
} else {
  console.log('⚠️ Could not find target line');
}
