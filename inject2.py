import sys

c = open('app/(dashboard)/utility/users/page.tsx', 'r', encoding='utf-8').read()

if 'console.log("DEBUG: addForm.roles", addForm.roles)' not in c:
    c = c.replace(
        'const addFormAdminRole = (() => {',
        'const addFormAdminRole = (() => {\n                  console.log("DEBUG: addForm.roles", addForm.roles);\n                  console.log("DEBUG: rolesList", rolesList);'
    )
    
if 'console.log("DEBUG: editForm.roles", editForm.roles)' not in c:
    c = c.replace(
        'const editFormAdminRole = (() => {',
        'const editFormAdminRole = (() => {\n                  console.log("DEBUG: editForm.roles", editForm.roles);\n                  console.log("DEBUG: rolesList length", rolesList.length);'
    )

open('app/(dashboard)/utility/users/page.tsx', 'w', encoding='utf-8').write(c)
