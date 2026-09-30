const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/layout/navbar-logo.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'className="h-[34px] w-full max-w-[240px] min-w-0',
  'className="h-[34px] w-auto max-w-[240px] min-w-0'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched navbar-logo.tsx');
