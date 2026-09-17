const fs = require('fs');
const file = 'c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/utility/users/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix handleCreateMember sync
content = content.replace(
  /roles: selectedRoles,/,
  'assignedRoleIds: getSelectedMemberRoleIds(addForm, rolesList),'
);

fs.writeFileSync(file, content, 'utf8');
