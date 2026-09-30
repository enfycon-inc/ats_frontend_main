const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/auth/login/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regexUseEffect = /const \[mounted, setMounted\] = React\.useState\(false\);[\s\S]*?\}, \[\]\);/g;

const replacementUseEffect = `
  const [mounted, setMounted] = React.useState(false);
  const [isSubdomain, setIsSubdomain] = React.useState(false);
  const [tenantBranding, setTenantBranding] = React.useState<any>(null);

  React.useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const isSub = checkIsSubdomain(hostname);
      setIsSubdomain(isSub);
      
      if (isSub) {
        atsApi.auth.getTenantAuthPolicy(hostname).then(policy => {
          if (policy?.siteTitle || policy?.logoUrl) {
            setTenantBranding({
              name: policy.name,
              siteTitle: policy.siteTitle,
              logoUrl: policy.logoUrl,
            });
            if (policy.siteTitle) {
              document.title = policy.siteTitle;
            }
          }
        }).catch(() => {});
      }
    }
  }, []);
`;

content = content.replace(regexUseEffect, replacementUseEffect.trim());

// And fix the Copyright function which failed to get the parameter!
content = content.replace(
  /function Copyright\(\) \{\n  const currentYear = new Date\(\)\.getFullYear\(\);\n  return <>Copyright Â© \{currentYear\} \{tenantBranding\?\.name \|\| "Enfycon Inc\."\} All Rights Reserved\.<\/>;\n\}/g,
  `function Copyright({ tenantBranding }: { tenantBranding?: any }) {
  const currentYear = new Date().getFullYear();
  return <>Copyright © {currentYear} {tenantBranding?.name || "Enfycon Inc."} All Rights Reserved.</>;
}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched login page 2');
