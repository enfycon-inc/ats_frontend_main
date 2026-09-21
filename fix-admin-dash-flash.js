
const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "app/(dashboard)/dashboard/components/admin-dashboard-view.tsx");
let content = fs.readFileSync(p, "utf8");

content = content.replace(
  "const [branches, setBranches] = useState<any[]>([]);",
  "const [branches, setBranches] = useState<any[]>([]);\n  const [isLoadingBranches, setIsLoadingBranches] = useState(true);"
);

content = content.replace(
  "setBranches(Array.isArray(b) ? b : []);",
  "setBranches(Array.isArray(b) ? b : []);\n        setIsLoadingBranches(false);"
);

content = content.replace(
  "{branches.length > 0 ? branches.length : (branchMetrics.length || \"-\")}",
  "{isLoadingBranches ? \"--\" : branches.length}"
);

fs.writeFileSync(p, content);
console.log("Fixed branch flashing");

