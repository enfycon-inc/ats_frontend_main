const fs = require('fs');
const file = 'c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/utility/branches/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const canEditBranch = userPermissions\.includes\('branch:edit'\) \|\| userPermissions\.includes\('branch_admin:manage'\) \|\| userPermissions\.includes\('tenant:settings'\);/,
  \const canEditBranchFunc = (branchId: string) => {
    if (userPermissions.includes('tenant:settings') || userPermissions.includes('tenant:manage') || overrideRole === 'SUPER_ADMIN' || overrideRole === 'ADMIN' || overrideRole === 'TENANT_ADMIN') return true;
    if (userPermissions.includes('branch:edit') || userPermissions.includes('branch_admin:manage')) {
      return sessionUser?.branchId === branchId;
    }
    return false;
  };\n  const canEditBranch = userPermissions.includes('branch:edit') || userPermissions.includes('branch_admin:manage') || userPermissions.includes('tenant:settings');\
);

// We need to replace canEditBranch usages with canEditBranchFunc(b.id) or rem.branchId
content = content.replace(/\{canEditBranch \?/g, '{canEditBranchFunc(b.id) ?');
content = content.replace(/\{canEditBranch \&\&/g, '{canEditBranchFunc(b.id) &&');

// For remarks modal (which might use rem.branchId)
content = content.replace(/\{\(rem\.branchId \? canEditBranch : isGlobalAdmin\) \&\&/g, '{(rem.branchId ? canEditBranchFunc(rem.branchId) : isGlobalAdmin) &&');

fs.writeFileSync(file, content, 'utf8');
