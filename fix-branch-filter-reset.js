
const fs = require("fs");
const path = require("path");

const dataTablePath = path.join(__dirname, "app/(dashboard)/job-posting/components/data-table.tsx");
let content = fs.readFileSync(dataTablePath, "utf8");

content = content.replace("setSelectedCreator(\"All\");", "setSelectedBranch(\"All\");\n    setSelectedCreator(\"All\");");

fs.writeFileSync(dataTablePath, content);
console.log("Fixed filter reset");

