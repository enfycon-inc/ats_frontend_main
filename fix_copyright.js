const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/auth/login/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the Copyright function and replace it entirely
const regex = /function Copyright\(\) \{[\s\S]*?\}/;
const replacement = `function Copyright({ tenantBranding }: { tenantBranding?: any }) {
  const currentYear = new Date().getFullYear();
  return <>Copyright &copy; {currentYear} {tenantBranding?.name || "Enfycon Inc."} All Rights Reserved.</>;
}`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully fixed Copyright function");
} else {
  console.log("Failed to find Copyright function");
}
