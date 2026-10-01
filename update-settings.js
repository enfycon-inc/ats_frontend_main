const fs = require('fs');

const file = 'app/(dashboard)/settings/branch/page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/market: ms \? ms\.code : "INDIA",/g, 'market: ms ? ms.code : "INDIA",\n                        code: ms ? ms.code : "", // Auto-populate unit code');

fs.writeFileSync(file, c);
console.log("Updated settings branch page");
