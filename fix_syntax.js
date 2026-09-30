const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/auth/login/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /function Copyright\(\{ tenantBranding \}: \{ tenantBranding\?: any \}\) \{\n  const currentYear = new Date\(\)\.getFullYear\(\);\n  return <>Copyright &copy; \{currentYear\} \{tenantBranding\?\.name \|\| "Enfycon Inc\."\} All Rights Reserved\.<\/>;\n\} \{tenantBranding\?\.name \|\| "Enfycon Inc\."\} All Rights Reserved\.<\/>;\n\}/;

const replacement = `function Copyright({ tenantBranding }: { tenantBranding?: any }) {
  const currentYear = new Date().getFullYear();
  return <>Copyright &copy; {currentYear} {tenantBranding?.name || "Enfycon Inc."} All Rights Reserved.</>;
}`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully fixed the syntax error!");
} else {
  console.log("Syntax error block not found.");
}
