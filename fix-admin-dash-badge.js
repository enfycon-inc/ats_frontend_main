
const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "app/(dashboard)/dashboard/components/admin-dashboard-view.tsx");
let content = fs.readFileSync(p, "utf8");

content = content.replace(
  "import { Button } from \"@/components/ui/button\";",
  "import { Button } from \"@/components/ui/button\";\nimport { Badge } from \"@/components/ui/badge\";"
);

fs.writeFileSync(p, content);
console.log("Fixed badge import");

