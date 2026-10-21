const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(__dirname, '../../ats_backend/src/auth/sign-in-policy.ts');
const destination = path.resolve(__dirname, '../lib/sign-in-policy.ts');
const contents = fs.readFileSync(source, 'utf8');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(destination, 'utf8') !== contents) throw new Error('Sign-in policy contract is out of sync');
} else fs.writeFileSync(destination, contents);
