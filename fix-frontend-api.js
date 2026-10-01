const fs = require('fs');
let api = fs.readFileSync('lib/ats-api.ts', 'utf8');

api = api.replace(/defaultTimezone\?: string;\n/g, '');
api = api.replace(/defaultShift\?: string;\n/g, '');
api = api.replace(/defaultStartTime\?: string;\n/g, '');
api = api.replace(/defaultEndTime\?: string;\n/g, '');

fs.writeFileSync('lib/ats-api.ts', api);
console.log("Updated API frontend code");
