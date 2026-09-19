
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "app/(dashboard)/dashboard/page.tsx");
const content = fs.readFileSync(filePath, "utf8");

const importMatch = content.match(/^.*?(?=\n\s*export default function DashboardPage)/ms);
const imports = importMatch ? importMatch[0] : "";

const functions = [
  "GlobalAdminDashboardView",
  "BranchAdminDashboardView",
  "AdminDashboardView",
  "AccountManagerDashboardView",
  "PodLeadDashboardView",
  "DeliveryHeadDashboardView",
  "RecruiterDashboardView"
];

const outDir = path.join(__dirname, "app/(dashboard)/dashboard/components");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let newPageImports = [];
let newPageContent = content.substring(0, content.indexOf("function GlobalAdminDashboardView"));

for (let i = 0; i < functions.length; i++) {
  const currentFn = functions[i];
  const startIdx = content.indexOf(`function ${currentFn}`);
  if (startIdx === -1) continue;
  
  let endIdx = -1;
  if (i < functions.length - 1) {
    const nextFn = functions[i + 1];
    endIdx = content.indexOf(`function ${nextFn}`);
  }
  
  // Find the preceding comment block (like // --- ADMIN DASHBOARD ---)
  let actualStart = startIdx;
  const snippetBefore = content.substring(0, startIdx);
  const lastDoubleSlash = snippetBefore.lastIndexOf("//");
  if (lastDoubleSlash !== -1 && startIdx - lastDoubleSlash < 200) {
    actualStart = lastDoubleSlash;
  }
  
  const componentBody = endIdx === -1 ? content.substring(actualStart) : content.substring(actualStart, endIdx);
  
  const fileContent = imports + "\n\n" + `export default ${componentBody}`;
  
  const fileName = currentFn.replace(/([A-Z])/g, "-$1").toLowerCase().substring(1) + ".tsx";
  fs.writeFileSync(path.join(outDir, fileName), fileContent);
  
  newPageImports.push(`import ${currentFn} from "./components/${fileName.replace(".tsx", "")}";`);
}

// Write the updated page.tsx
const finalPageContent = imports + "\n" + newPageImports.join("\n") + "\n\n" + newPageContent.substring(imports.length).trim();
fs.writeFileSync(filePath, finalPageContent);

console.log("Successfully split the components!");

