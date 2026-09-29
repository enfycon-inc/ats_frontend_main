const fs = require('fs');

const navFile = 'constants/navigation.ts';
let code = fs.readFileSync(navFile, 'utf8');
code = code.replace(/\{ label: "My Jobs", href: "\/job-posting\?filter=direct" \}/g, '{ label: "My Jobs", href: "/job-posting?filter=my" }');
fs.writeFileSync(navFile, code);

const file = 'app/(dashboard)/job-posting/components/job-posting-dashboard.tsx';
let code2 = fs.readFileSync(file, 'utf8');
code2 = code2.replace(/if \(filterParam === "direct"\) return "My Jobs";/g, 'if (filterParam === "direct" || filterParam === "my") return "My Jobs";');
fs.writeFileSync(file, code2);

console.log('Fixed navigation filter for My Jobs.');
