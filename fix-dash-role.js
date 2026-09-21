
const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "lib/dashboard-role.ts");
let c = fs.readFileSync(p, "utf8");

const oldCode = `const active = selected || primary || options[0] || {`;
const newCode = `  
  const fallback = options.find(r => {
    const sys = resolveActiveSystemRole(r.systemRole || r.replacesSystemRole || r.name, roles, profile);
    return sys === "SUPER_ADMIN" || sys === "ADMIN" || sys === "TENANT_ADMIN";
  }) || options[0];

  const active = selected || primary || fallback || {`;

c = c.replace(oldCode, newCode);

fs.writeFileSync(p, c);
console.log("Fixed dashboard role fallback");

