
const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "app/(dashboard)/dashboard/components/admin-dashboard-view.tsx");
let content = fs.readFileSync(p, "utf8");

// Remove the network request for tenant-profile
content = content.replace(/\/\/ Attempt to fetch tenant profile to get seat limit\n\s*atsApi\.fetch\(\"\/api\/auth\/tenant-profile\"\)\.then\(res => \{\n\s*if \(\!cancelled && res && res\.seatLimit\) setSeatLimit\(res\.seatLimit\);\n\s*\}\)\.catch\(\(\) => \{\}\);\n/, "");

// Replace the seatLimit state usage with profile.userLimit
content = content.replace(/const \[seatLimit, setSeatLimit\] = useState<number \| string>\(\"Unlimited\"\);/, "const seatLimit = profile?.userLimit || \"Unlimited\";");

// Replace active branches logic to reduce flickering
content = content.replace(/\{branches\.length \|\| branchMetrics\.length\}/, "{branches.length > 0 ? branches.length : (branchMetrics.length || \"-\")}");

fs.writeFileSync(p, content);
console.log("Fixed dashboard bugs");

