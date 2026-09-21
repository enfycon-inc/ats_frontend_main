
const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "components/layout/app-sidebar.tsx");
let c = fs.readFileSync(p, "utf8");
c = c.replace("import { Skeleton } from \"@/components/ui/skeleton\";\r\n\"use client\";\r\n", "\"use client\";\nimport { Skeleton } from \"@/components/ui/skeleton\";\n");
c = c.replace("import { Skeleton } from \"@/components/ui/skeleton\";\n\"use client\";\n", "\"use client\";\nimport { Skeleton } from \"@/components/ui/skeleton\";\n");
fs.writeFileSync(p, c);
console.log("Fixed top");

