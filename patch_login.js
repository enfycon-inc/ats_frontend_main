const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/auth/login/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('import { atsApi } from "@/lib/ats-api";')) {
  content = content.replace(
    'import { Building2 } from "lucide-react";',
    'import { Building2 } from "lucide-react";\nimport { atsApi } from "@/lib/ats-api";\nimport { CompanyLogoImage } from "@/components/shared/company-logo-image";'
  );
}

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

const regexUseEffect = /const \[mounted, setMounted\] = React\.useState\(false\);\n  const \[isSubdomain, setIsSubdomain\] = React\.useState\(false\);\n\n  React\.useEffect\(\(\) => \{\n    setMounted\(true\);\n    if \(typeof window !== "undefined"\) \{\n      setIsSubdomain\(checkIsSubdomain\(window\.location\.hostname\)\);\n    \}\n  \}, \[\]\);/g;

content = content.replace(regexUseEffect, replacementUseEffect.trim());

const replacementLogoDesktop = `
            <Link href="/" className="inline-block transition-transform hover:scale-105">
              {tenantBranding?.logoUrl ? (
                <CompanyLogoImage src={tenantBranding.logoUrl} alt={tenantBranding.siteTitle || "Company Logo"} className="h-10 w-auto max-w-[200px]" />
              ) : (
                <EnfyconLogo variant="light" width={190} height={42} />
              )}
            </Link>
`;

content = content.replace(
  /<Link href="\/" className="inline-block transition-transform hover:scale-105">\s*<EnfyconLogo variant="light" width=\{190\} height=\{42\} \/>\s*<\/Link>/g,
  replacementLogoDesktop.trim()
);

const replacementLogoMobile = `
                {tenantBranding?.logoUrl ? (
                  <CompanyLogoImage src={tenantBranding.logoUrl} alt={tenantBranding.siteTitle || "Company Logo"} className="h-10 w-auto max-w-[180px]" />
                ) : (
                  <EnfyconLogo variant="light" width={180} height={40} />
                )}
`;

content = content.replace(
  /<EnfyconLogo variant="light" width=\{180\} height=\{40\} \/>/g,
  replacementLogoMobile.trim()
);

const replacementCopyright = `
  return <>Copyright © {currentYear} {tenantBranding?.name || "Enfycon Inc."} All Rights Reserved.</>;
`;

content = content.replace(
  /return <>Copyright \u00A9 \{currentYear\} Enfycon Inc\. All Rights Reserved\.<\/>;/g,
  replacementCopyright.trim()
);

const replacementCopyrightFn = `
function Copyright({ tenantBranding }: { tenantBranding?: any }) {
  const currentYear = new Date().getFullYear();
  return <>Copyright © {currentYear} {tenantBranding?.name || "Enfycon Inc."} All Rights Reserved.</>;
}
`;

content = content.replace(
  /function Copyright\(\) \{\n  const currentYear = new Date\(\)\.getFullYear\(\);\n  return <>Copyright [^<]+<\/>;\n\}/g,
  replacementCopyrightFn.trim()
);

content = content.replace(/<Copyright \/>/g, '<Copyright tenantBranding={tenantBranding} />');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched login page');
