const fs = require('fs');
const filePath = 'lib/role-permissions.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace `user?.roles?.includes` with `profile?.roles?.includes`
content = content.replace(/user\?\.roles\?\.includes\("SUPER_ADMIN"\)/g, 'profile?.roles?.includes("SUPER_ADMIN")');

fs.writeFileSync(filePath, content);
console.log("Fixed user undefined in role-permissions.ts");
