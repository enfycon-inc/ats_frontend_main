const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/job-posting/components/job-posting-dashboard.tsx', 'utf8');

// Fix: replace createdById with createdBy (the actual field name in Job interface)
const old = 'job.createdById === currentUser?.id';
const newStr = 'job.createdBy === currentUser?.id'; // createdBy stores UUID string from backend

if (c.includes(old)) {
  c = c.replace(old, newStr);
  console.log('✅ Fixed createdById → createdBy');
} else {
  console.log('⚠️  createdById not found - may already be fixed');
}

fs.writeFileSync('app/(dashboard)/job-posting/components/job-posting-dashboard.tsx', c);

// Verify the fix looks right
const idx = c.indexOf('viewName === "My Jobs"');
console.log('\nFinal My Jobs block:');
console.log(c.substring(idx, idx + 600));
