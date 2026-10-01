const fs = require('fs');
let api = fs.readFileSync('lib/ats-api.ts', 'utf8');

api = api.replace(
  `name?: string;
        branchId?: string;
        code?: string;
        allowAll?: boolean;`,
  `name?: string;
        branchId?: string;
        code?: string;
        market?: string;
        currency?: string;
        marketSegmentId?: string | null;
        allowAll?: boolean;`
);

fs.writeFileSync('lib/ats-api.ts', api);
console.log("Updated businessUnits update in lib/ats-api.ts");
