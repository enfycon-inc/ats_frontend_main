const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/auth/login/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /function Copyright\(\{ tenantBranding \}: \{ tenantBranding\?: any \}\) \{[\s\S]*?const Login = \(\) => \{/;

const replacement = `function Copyright({ tenantBranding }: { tenantBranding?: any }) {
  const currentYear = new Date().getFullYear();
  return <>Copyright &copy; {currentYear} {tenantBranding?.name || "Enfycon Inc."} All Rights Reserved.</>;
}

const Login = () => {`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully fixed the syntax error!");
} else {
  console.log("Syntax error block not found.");
}
