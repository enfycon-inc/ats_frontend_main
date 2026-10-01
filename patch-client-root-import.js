const fs = require('fs');
let c = fs.readFileSync('app/client-root.tsx', 'utf8');
c = 'import { syncAssignedOffice } from "@/lib/assigned-office";\n' + c;
fs.writeFileSync('app/client-root.tsx', c);
