const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/job-posting/components/job-posting-dashboard.tsx', 'utf8');
const idx = c.indexOf('My Jobs');
// Find all occurrences of "My Jobs" in client-side filter logic
let pos = 0;
let count = 0;
while ((pos = c.indexOf('My Jobs', pos)) !== -1 && count < 20) {
  const snippet = c.substring(pos - 20, pos + 200).replace(/\n/g, ' | ');
  console.log(`[${pos}] ...${snippet}...`);
  console.log('---');
  pos++;
  count++;
}
