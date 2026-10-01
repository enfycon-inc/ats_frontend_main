const fs = require('fs');
const file = 'app/(dashboard)/job-posting/components/job-posting-dashboard.tsx';
let c = fs.readFileSync(file, 'utf8');

const regex = /\/\/ Filter by current market shift[\s\S]*?let jobsToDisplay = shiftJobs\.length > 0 \? shiftJobs : mapped;/;
const newCode = `let jobsToDisplay = mapped; // Frontend market filtering removed to allow cross-market delegations and prevent hiding valid jobs`;

if (c.match(regex)) {
  c = c.replace(regex, newCode);
  fs.writeFileSync(file, c);
  console.log('Successfully patched job-posting-dashboard.tsx');
} else {
  console.log('Regex not found!');
}
