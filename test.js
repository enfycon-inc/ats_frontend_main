const rolesList = [
  { id: '1c20', name: 'Admin', isSystem: true, systemRole: 'ADMIN' },
  { id: '59ce', name: 'Branch Admin', isSystem: true, systemRole: 'BRANCH_ADMIN' },
  { id: '852f', name: 'Unit Admin', isSystem: true, systemRole: 'UNIT_ADMIN' }
];

let editForm = {
  roles: []
};

const handleEditAdminRoleChange = (sysKey) => {
  let nextRoles = editForm.roles.filter(r => {
    const sr = rolesList.find(rl => rl.name === r || rl.id === r);
    return !sr?.isSystem;
  });
  if (sysKey !== "NONE") {
    const sr = rolesList.find(rl => {
       const rSysKey = rl.systemRole || rl.system_role;
       if (sysKey === "ADMIN") {
          return rSysKey === "ADMIN" || rSysKey === "TENANT_ADMIN" || rSysKey === "SUPER_ADMIN" || rl.name === "Tenant Admin" || rl.name === "Super Admin" || rl.name === "Admin";
       }
       if (sysKey === "BRANCH_ADMIN") {
          return rSysKey === "BRANCH_ADMIN" || rSysKey === "BRANCHADMIN" || rl.name === "Branch Admin";
       }
       if (sysKey === "UNIT_ADMIN") {
          return rSysKey === "UNIT_ADMIN" || rSysKey === "UNITADMIN" || rl.name === "Branch Unit Admin" || rl.name === "Unit Admin";
       }
       return rSysKey === sysKey;
    });
    if (sr) nextRoles.push(sr.id || sr.name);
  }
  
  editForm = {
    ...editForm,
    roles: nextRoles,
  };
};

// Simulate click
handleEditAdminRoleChange("ADMIN");
console.log("editForm.roles after click:", editForm.roles);

// Simulate the derived state computation
const editFormAdminRole = (() => {
  const admin = editForm.roles.find(r => {
    const sr = rolesList.find(rl => rl.name === r || rl.id === r);
    return sr?.isSystem;
  });
  if (!admin) return "NONE";
  const matchedRole = rolesList.find(rl => rl.name === admin || rl.id === admin);
  const sysKey = matchedRole?.systemRole || matchedRole?.system_role;
  if (sysKey === "ADMIN" || sysKey === "TENANT_ADMIN" || sysKey === "SUPER_ADMIN" || sysKey === "TENANTADMIN" || sysKey === "SUPERADMIN") return "ADMIN";
  if (sysKey === "BRANCH_ADMIN" || sysKey === "BRANCHADMIN") return "BRANCH_ADMIN";
  if (sysKey === "UNIT_ADMIN" || sysKey === "UNITADMIN") return "UNIT_ADMIN";
  return "NONE";
})();

console.log("editFormAdminRole:", editFormAdminRole);
console.log("isChecked:", editFormAdminRole === "ADMIN");

