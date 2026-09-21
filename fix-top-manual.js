
const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "components/layout/app-sidebar.tsx");
let lines = fs.readFileSync(p, "utf8").split("\n");
// Find "use client" and "import { Skeleton }"
lines = lines.filter(l => !l.includes("\"use client\"") && !l.includes("import { Skeleton }"));
lines.unshift("import { Skeleton } from \"@/components/ui/skeleton\";");
lines.unshift("\"use client\";");
fs.writeFileSync(p, lines.join("\n"));
console.log("Fixed top manually");

