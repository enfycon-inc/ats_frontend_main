const fs = require('fs');
const file = 'c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/utility/users/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /branchId: primaryBranchId \|\| undefined,\s*roles: selectedRoles,/g,
  'branchId: primaryBranchId || undefined,\n            assignedRoleIds: getSelectedMemberRoleIds(addForm, rolesList),'
);

fs.writeFileSync(file, content, 'utf8');
