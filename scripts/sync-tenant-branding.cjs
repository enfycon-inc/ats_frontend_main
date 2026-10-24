const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(__dirname, '../../ats_backend/src/auth/tenant-branding-contract.ts');
const destination = path.resolve(__dirname, '../lib/tenant-branding-contract.ts');
const contents = fs.readFileSync(source, 'utf8');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(destination, 'utf8') !== contents) throw new Error('Tenant branding contract is out of sync');
} else fs.writeFileSync(destination, contents);
