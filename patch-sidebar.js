const fs = require('fs');

let f = 'lib/role-permissions.ts';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
  /\/\/ â”€â”€ Specific Removals for Account Manager â”€â”€/,
  `// â”€â”€ Specific Removals for Recruiter â”€â”€
      const isRecruiter = !isGlobalOrBranchAdmin && !isAccountManager;
      if (isRecruiter) {
        if (child.href === "/job-posting/active") return false;
      }

      // â”€â”€ Specific Removals for Account Manager â”€â”€`
);

fs.writeFileSync(f, c);
console.log('Fixed role-permissions.ts');
