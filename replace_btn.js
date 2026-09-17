const fs = require('fs');
const file = 'c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/utility/branches/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\{canEditBranch \?/g, '{canEditBranchFunc(b.id) ?');
content = content.replace(/\{canEditBranch \&\&/g, '{canEditBranchFunc(b.id) &&');
content = content.replace(/\{\(rem\.branchId \? canEditBranch : isGlobalAdmin\) \&\&/g, '{(rem.branchId ? canEditBranchFunc(rem.branchId) : isGlobalAdmin) &&');
fs.writeFileSync(file, content, 'utf8');
