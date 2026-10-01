const fs = require('fs');
let c = fs.readFileSync('app/client-root.tsx', 'utf8');
c = c.replace('import { useLayoutEffect } from "react";\n', '');
fs.writeFileSync('app/client-root.tsx', c);
