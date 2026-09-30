const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/client-root.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Remove override_role state and initialization
content = content.replace(/const \[overrideRole, setOverrideRole\] = useState<string \| null>\(null\);\n/, '');
content = content.replace(/const override = localStorage\.getItem\("override_role"\);\n\s*setOverrideRole\(override\);\n/, '');

// Fix isSuperAdmin check to ONLY use session roles
const isSuperAdminRegex = /const isSuperAdmin = useMemo\(\(\) => \{\n\s*if \(overrideRole === "SUPER_ADMIN"\) return true;\n\s*return session\?\.user\?\.roles\?\.includes\("SUPER_ADMIN"\) \|\| false;\n\s*\}, \[session, overrideRole\]\);/;
const safeIsSuperAdmin = `const isSuperAdmin = useMemo(() => {
    return session?.user?.roles?.includes("SUPER_ADMIN") || false;
  }, [session]);`;
content = content.replace(isSuperAdminRegex, safeIsSuperAdmin);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched client-root.tsx');
