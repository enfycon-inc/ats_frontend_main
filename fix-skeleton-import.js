
const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "components/layout/app-sidebar.tsx");
let c = fs.readFileSync(p, "utf8");
c = "import { Skeleton } from \"@/components/ui/skeleton\";\n" + c;
fs.writeFileSync(p, c);
console.log("Added import");

