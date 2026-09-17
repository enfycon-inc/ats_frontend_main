const fs = require('fs');
const file = 'c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/utility/users/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix edit modal checkbox
content = content.replace(/const isChecked = editForm\.roles\.includes\(r\.id\);([\s\S]*?)let nextRoles = editForm\.roles\.filter\(\(x\) => x !== r\.id\);\s*if \(checked\) nextRoles\.push\(r\.id\);/g, 'const isChecked = editForm.roles.some((x) => x.toLowerCase() === r.id.toLowerCase() || x.toLowerCase() === r.name.toLowerCase());'+''+'let nextRoles = editForm.roles.filter((x) => x.toLowerCase() !== r.id.toLowerCase() && x.toLowerCase() !== r.name.toLowerCase());\n                                if (checked) nextRoles.push(r.name);');

// Fix add modal checkbox
content = content.replace(/const isChecked = addForm\.roles\.includes\(r\.id\);([\s\S]*?)let nextRoles = addForm\.roles\.filter\(\(x\) => x !== r\.id\);\s*if \(checked\) nextRoles\.push\(r\.id\);/g, 'const isChecked = addForm.roles.some((x) => x.toLowerCase() === r.id.toLowerCase() || x.toLowerCase() === r.name.toLowerCase());'+''+'let nextRoles = addForm.roles.filter((x) => x.toLowerCase() !== r.id.toLowerCase() && x.toLowerCase() !== r.name.toLowerCase());\n                                if (checked) nextRoles.push(r.name);');

fs.writeFileSync(file, content, 'utf8');
