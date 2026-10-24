const fs = require('node:fs');
const path = require('node:path');
for (const [backend, frontend] of [['jobs/job-capabilities.ts', 'job-capabilities.ts'], ['auth/job-access-grants.ts', 'job-access-grants.ts']]) {
  const source = fs.readFileSync(path.resolve(__dirname, '../../ats_backend/src', backend), 'utf8').replace(/\r\n/g, '\n');
  const target = path.resolve(__dirname, '../lib', frontend);
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== source) throw new Error(`Job access contract out of sync: ${frontend}`);
  } else fs.writeFileSync(target, source);
}
