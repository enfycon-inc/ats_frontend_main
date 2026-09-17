const fs = require('fs');
const file = 'c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/utility/users/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('getSelectedMemberRoleIds')) {
  content = content.replace(/import { getTenantIdentifier } from "@\/utils\/subdomain-helper";/, 'import { getTenantIdentifier } from "@/utils/subdomain-helper";\nimport { getSelectedMemberRoleIds } from "@/lib/member-role-selection";');
}

// Fix handleUpdateMember
content = content.replace(/const finalRoles = Array\.isArray\(editForm\.roles\) \? editForm\.roles : \[\];/, 'const finalRoles = getSelectedMemberRoleIds(editForm, rolesList);');

// Fix handleCreateMember
content = content.replace(/const selectedRoles = Array\.isArray\(addForm\.roles\) \? addForm\.roles : \[\];/, 'const selectedRoles = getSelectedMemberRoleIds(addForm, rolesList);');

fs.writeFileSync(file, content, 'utf8');
