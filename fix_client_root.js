const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/client-root.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Remove handleStorageChange logic for overrideRole
const storageLogic = /const handleStorageChange = \(\) => \{\s*setOverrideRole\(localStorage\.getItem\("override_role"\)\);\s*\};\s*window\.addEventListener\("storage", handleStorageChange\);\s*window\.addEventListener\("overrideRoleChanged", handleStorageChange\);\s*return \(\) => \{\s*window\.removeEventListener\("storage", handleStorageChange\);\s*window\.removeEventListener\("overrideRoleChanged", handleStorageChange\);\s*\};/g;
content = content.replace(storageLogic, "");

// Replace isSuperAdmin entirely
const isSuperAdminRegex = /const isSuperAdmin = useMemo\(\(\) => \{[\s\S]*?\}, \[session, overrideRole\]\);/g;
const safeIsSuperAdmin = `const isSuperAdmin = useMemo(() => {
    if (!session || !(session as any).user) return false;
    const roles = (session as any).user.roles || [];
    const systemRole = (session as any).user.systemRole;
    return roles.includes("SUPER_ADMIN") || systemRole === "SUPER_ADMIN";
  }, [session]);`;

content = content.replace(isSuperAdminRegex, safeIsSuperAdmin);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully fixed client-root.tsx');
