const fs = require('fs');
let data = fs.readFileSync('lib/ats-api.ts', 'utf8');

const regex = /getTenantAuthPolicy: async \(tenantIdOrSubdomain: string\).*?\},/s;

const newMethod = `getTenantAuthPolicy: async (tenantIdOrSubdomain: string) => {
      return apiFetch(\`/api/auth/tenant-auth-policy?subdomain=\${encodeURIComponent(tenantIdOrSubdomain)}\`);
    },
    checkEmailAvailability: async (email: string) => {
      return apiFetch(\`/api/auth/check-email?email=\${encodeURIComponent(email)}\`);
    },`;

data = data.replace(regex, newMethod);
fs.writeFileSync('lib/ats-api.ts', data);
