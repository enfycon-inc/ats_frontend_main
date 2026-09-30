const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/company/tabs/general-tab.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'className="h-[34px] w-full max-w-[240px]"',
  'className="h-[34px] w-auto max-w-[240px]"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched general-tab.tsx');
