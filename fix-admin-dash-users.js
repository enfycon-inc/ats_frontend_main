
const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "app/(dashboard)/dashboard/components/admin-dashboard-view.tsx");
let content = fs.readFileSync(p, "utf8");

content = content.replace("atsApi.auth.fetchUsers()", "atsApi.auth.listUsers()");

fs.writeFileSync(p, content);
console.log("Fixed method name");

