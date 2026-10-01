const fs = require('fs');
let c = fs.readFileSync('app/client-root.tsx', 'utf8');

c = c.replace('import { syncAssignedOffice } from "@/lib/assigned-office";\n', '');
c = c.replace('"use client";', '"use client";\nimport { syncAssignedOffice } from "@/lib/assigned-office";');

fs.writeFileSync('app/client-root.tsx', c);
