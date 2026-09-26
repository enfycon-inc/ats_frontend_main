import sys

c = open('app/(dashboard)/utility/users/page.tsx', 'r', encoding='utf-8').read()
lines = c.split('\n')

for i in range(len(lines)):
    if 'const handleEditAdminRoleChange = (sysKey: string) => {' in lines[i]:
        # Inject logs right after
        inject = """
                  console.log("handleEditAdminRoleChange called with:", sysKey);
                  console.log("Current editForm.roles:", editForm.roles);
                  console.log("rolesList items (isSystem=true):", rolesList.filter(x => x.isSystem));
"""
        lines.insert(i + 1, inject)
        break

for i in range(len(lines)):
    if 'if (sr) nextRoles.push(sr.id || sr.name);' in lines[i]:
        inject2 = 'console.log("Found sr to push:", sr);'
        lines.insert(i, inject2)

open('app/(dashboard)/utility/users/page.tsx', 'w', encoding='utf-8').write('\n'.join(lines))
