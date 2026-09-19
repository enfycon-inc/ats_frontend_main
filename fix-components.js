
const fs = require("fs");
const path = require("path");

const adminFile = path.join(__dirname, "app/(dashboard)/dashboard/components/admin-dashboard-view.tsx");
const amFile = path.join(__dirname, "app/(dashboard)/dashboard/components/account-manager-dashboard-view.tsx");

let adminContent = fs.readFileSync(adminFile, "utf8");
let amContent = fs.readFileSync(amFile, "utf8");

const fnStart = adminContent.indexOf("function DashboardJobStatusSelect");
if (fnStart !== -1) {
  const componentStr = adminContent.substring(fnStart);
  adminContent = adminContent.substring(0, fnStart).trim();
  fs.writeFileSync(adminFile, adminContent + "\n");
  fs.writeFileSync(amFile, amContent.trim() + "\n\n" + componentStr);
  console.log("Moved DashboardJobStatusSelect successfully.");
} else {
  console.log("Could not find function");
}

