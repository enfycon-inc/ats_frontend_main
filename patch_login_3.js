const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/auth/login/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /function Copyright\(\) \{\n  const currentYear = new Date\(\)\.getFullYear\(\);\n  return <>Copyright [^\n]*\n\}/,
  `function Copyright({ tenantBranding }: { tenantBranding?: any }) {\n  const currentYear = new Date().getFullYear();\n  return <>Copyright © {currentYear} {tenantBranding?.name || "Enfycon Inc."} All Rights Reserved.</>;\n}`
);

fs.writeFileSync(filePath, content, 'utf8');
