const fs = require('fs');
let data = fs.readFileSync('components/auth/login-form.tsx', 'utf8');

if (!data.includes('getTenantIdentifier')) {
  data = data.replace('import React', 'import { getTenantIdentifier } from "@/utils/subdomain-helper";\nimport React');
}

data = data.replace('const hasSocial = showGoogle || showMicrosoft;', 'const isGlobalPortal = !getTenantIdentifier();\n  const hasSocial = (showGoogle || showMicrosoft) && !isGlobalPortal;');

fs.writeFileSync('components/auth/login-form.tsx', data);
