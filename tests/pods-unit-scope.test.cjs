const test = require('node:test');
const assert = require('node:assert/strict');

function checkIsTenantAdmin(user) {
  if (!user) return false;
  const sysRole = (user.systemRole || '').toUpperCase();
  const roles = Array.isArray(user.roles) ? user.roles.map(r => r.toUpperCase()) : [];
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return (
    roles.includes('TENANT_ADMIN') ||
    roles.includes('SUPER_ADMIN') ||
    sysRole === 'TENANT_ADMIN' ||
    sysRole === 'SUPER_ADMIN' ||
    perms.includes('tenant:settings') ||
    perms.includes('tenant:manage') ||
    perms.includes('platform:manage')
  );
}

function checkIsUnitScoped(user) {
  if (!user || checkIsTenantAdmin(user)) return false;
  const sysRole = (user.systemRole || '').toUpperCase();
  const roles = Array.isArray(user.roles) ? user.roles.map(r => r.toUpperCase()) : [];
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return (
    roles.includes('UNIT_ADMIN') ||
    roles.includes('DELIVERY_HEAD') ||
    sysRole === 'UNIT_ADMIN' ||
    sysRole === 'DELIVERY_HEAD' ||
    perms.includes('unit_admin:manage')
  );
}

test('Delivery Head and Unit Admin are strictly unit-scoped while Tenant Admin is not', () => {
  const deliveryHead = { roles: ['DELIVERY_HEAD'], systemRole: 'DELIVERY_HEAD', businessUnitId: 'bu-1' };
  const unitAdmin = { roles: ['UNIT_ADMIN'], systemRole: 'UNIT_ADMIN', businessUnitId: 'bu-1' };
  const tenantAdmin = { roles: ['TENANT_ADMIN'], systemRole: 'TENANT_ADMIN' };
  const customUnitAdmin = { permissions: ['unit_admin:manage'], roles: ['CUSTOM_ROLE'], businessUnitId: 'bu-1' };

  assert.equal(checkIsUnitScoped(deliveryHead), true);
  assert.equal(checkIsUnitScoped(unitAdmin), true);
  assert.equal(checkIsUnitScoped(customUnitAdmin), true);
  assert.equal(checkIsUnitScoped(tenantAdmin), false);
});

test('Recruiter filtering logic excludes non-recruiters and users already assigned to another pod', () => {
  const users = [
    { id: '1', fullName: 'Eligible Recruiter', roleName: 'Recruiter', systemRole: 'RECRUITER', podId: null },
    { id: '2', fullName: 'Busy Recruiter', roleName: 'Recruiter', systemRole: 'RECRUITER', podId: 'pod-other' },
    { id: '3', fullName: 'Account Manager', roleName: 'Account Manager', systemRole: 'ACCOUNT_MANAGER', podId: null },
    { id: '4', fullName: 'Delivery Head', roleName: 'Delivery Head', systemRole: 'DELIVERY_HEAD', podId: null },
  ];

  // Candidates for a new pod should only be unassigned recruiters
  const available = users.filter(u => {
    const isExcluded = ['DELIVERY_HEAD', 'ACCOUNT_MANAGER', 'TENANT_ADMIN', 'BRANCH_ADMIN'].includes(u.systemRole);
    return !isExcluded && u.systemRole === 'RECRUITER' && !u.podId;
  });

  assert.equal(available.length, 1);
  assert.equal(available[0].fullName, 'Eligible Recruiter');
});
