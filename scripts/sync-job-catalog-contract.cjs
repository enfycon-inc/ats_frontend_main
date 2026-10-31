const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(__dirname, '../../ats_backend/src/jobs/job-catalog.contract.ts');
const target = path.resolve(__dirname, '../lib/job-catalog-contract.ts');
const content = '// Generated from ats_backend/src/jobs/job-catalog.contract.ts.\n' + fs.readFileSync(source, 'utf8');
if (process.argv.includes('--check')) { if (fs.readFileSync(target, 'utf8') !== content) { console.error('Job catalog contract is out of date.'); process.exitCode = 1; } }
else fs.writeFileSync(target, content);
