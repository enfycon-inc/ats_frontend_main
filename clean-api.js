const fs = require('fs');

let f = fs.readFileSync('lib/ats-api.ts', 'utf8');

f = f.replace(/clientName:\s*string;\s*\n/g, '');
f = f.replace(/endClientName:\s*string;\s*\n/g, '');
f = f.replace(/businessUnit:\s*string\s*\|\s*null;\s*\n/g, '');
f = f.replace(/assignedTo:\s*string;\s*\n/g, '');
f = f.replace(/workingDays\?:\s*string\[\];\s*\n/g, '');
f = f.replace(/workStartTime\?:\s*string;\s*\n/g, '');
f = f.replace(/workEndTime\?:\s*string;\s*\n/g, '');

fs.writeFileSync('lib/ats-api.ts', f);
console.log('✅ Cleaned lib/ats-api.ts');
