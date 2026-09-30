const fs = require('fs');
let data = fs.readFileSync('lib/ats-api.ts', 'utf8');

const regex = /async getTenantAuthPolicy\(subdomain\?: string\): Promise<any> \{[\s\S]*?\},/;

const newMethod = `async getTenantAuthPolicy(subdomain?: string): Promise<any> {
      const sub = subdomain || getTenantIdentifier();
      const query = sub ? \`?subdomain=\${encodeURIComponent(sub)}\` : '';
      return apiFetch<any>(\`/api/auth/tenant-auth-policy\${query}\`);
    },
    async checkEmailAvailability(email: string): Promise<any> {
      return apiFetch<any>(\`/api/auth/check-email?email=\${encodeURIComponent(email)}\`);
    },`;

data = data.replace(regex, newMethod);
fs.writeFileSync('lib/ats-api.ts', data);
