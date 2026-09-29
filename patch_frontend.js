const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/(dashboard)/job-posting/components/job-posting-dashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /\/\/ \u2500\u2500 Account Manager scoping \(frontend safety net\) \u2500+[\s\S]*?\/\/ \u2500{20,}/;
if (regex.test(content)) {
  content = content.replace(regex, `// Account Manager scoping handled entirely by backend API jobs.service.ts
        // Frontend safety net removed to allow unit-wide job visibility.`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched job-posting-dashboard.tsx');
} else {
  console.log('Target string not found');
}
