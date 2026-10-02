const fs = require('fs');
const file = 'lib/role-permissions.ts';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  'const isManagerRole = resolveActiveSystemRole(input, roles, profile) === "TENANT_ADMIN" || \n                              resolveActiveSystemRole(input, roles, profile) === "BRANCH_ADMIN" || \n                              resolveActiveSystemRole(input, roles, profile) === "UNIT_ADMIN";',
  'const isManagerRole = resolveActiveSystemRole(input, roles, profile) === "TENANT_ADMIN" || \n                              resolveActiveSystemRole(input, roles, profile) === "BRANCH_ADMIN" || \n                              resolveActiveSystemRole(input, roles, profile) === "DELIVERY_HEAD" || \n                              resolveActiveSystemRole(input, roles, profile) === "UNIT_ADMIN";'
);

fs.writeFileSync(file, c);
console.log('Fixed Delivery Head Sidebar');
