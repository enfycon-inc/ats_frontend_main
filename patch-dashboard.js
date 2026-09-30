const fs = require('fs');

let f = 'app/(dashboard)/job-posting/components/job-posting-dashboard.tsx';
let c = fs.readFileSync(f, 'utf8');

// I want to remove the entire recruiter scoping block.
// It starts with `// â”€â”€ Recruiter scoping (frontend safety net) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€`
// and ends before `// Account Manager scoping handled entirely by backend`

const regex = /\/\/ ── Recruiter scoping \(frontend safety net\)[\s\S]*?\/\/ Account Manager scoping handled entirely by backend/m;
if (regex.test(c)) {
  c = c.replace(regex, '// Account Manager scoping handled entirely by backend');
  fs.writeFileSync(f, c);
  console.log('Fixed job-posting-dashboard.tsx (removed frontend safety net)');
} else {
  console.log('Regex did not match.');
}
