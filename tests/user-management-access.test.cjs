const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function evaluate(source, context) {
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  return new Function(...Object.keys(context), code)(...Object.values(context));
}
function load(file, imports = {}) {
  const exports = {};
  evaluate(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { exports, require: name => {
    assert.ok(name in imports, `Unexpected import ${name}`); return imports[name];
  } });
  return exports;
}
const policy = load('lib/user-management-policy.ts');
const rolePermissions = load('lib/role-permissions.ts', { '@/constants/navigation': {}, '../constants/navigation': {} });
const page = fs.readFileSync(path.join(__dirname, '../app/(dashboard)/utility/users/page.tsx'), 'utf8');
const permissionsSection = page.slice(page.indexOf('  const sessionPerms:'), page.indexOf('  // The branches'));
const rowSection = page.slice(page.indexOf('  const isUnitAdmin ='), page.indexOf('  const getDomainSuffix'));
const common = ['user:manage', 'unit_admin:manage', 'job:approve'];
const roles = [
  { id: 'unit-role', name: 'Unit Admin', systemRole: 'UNIT_ADMIN', permissions: common },
  { id: 'delivery-role', name: 'Delivery Head', systemRole: 'DELIVERY_HEAD', permissions: common },
];
const profile = { id: 'actor', tenantId: 'tenant', branchId: 'branch', businessUnitId: 'unit', systemRole: 'UNIT_ADMIN', permissions: common, assignedRoles: roles };
const peer = { id: 'peer', branchId: 'branch', businessUnitId: 'unit', permissions: common, assignedRoles: [roles[1]] };
function pagePolicy(selection, currentProfile = profile, currentUser = profile) {
  return evaluate(permissionsSection + rowSection + '\nreturn {canManageUser, canEditUserRoles, actionsForUser, isUnitAdmin, isDeliveryHead};', {
    profile: currentProfile, currentUser, overrideRole: selection, rolesList: roles,
    useMemo: callback => callback(), ...rolePermissions, ...policy,
  });
}
test('role switching preserves Unit Admin controls despite job approval permission', () => {
  const unit = pagePolicy('unit-role');
  assert.equal(unit.isUnitAdmin, true);
  assert.equal(unit.isDeliveryHead, false);
  assert.equal(unit.canManageUser(peer), true);
  assert.equal(unit.canEditUserRoles(peer), false);
});
test('Delivery Head peers and multi-role staff have scoped actions without administrative assignment access', () => {
  const delivery = pagePolicy('delivery-role');
  assert.equal(delivery.isDeliveryHead, true);
  assert.equal(delivery.canManageUser(peer), true);
  assert.equal(delivery.canEditUserRoles(peer), false);
  assert.equal(delivery.actionsForUser(peer).resetPassword, true);
  assert.equal(delivery.actionsForUser(peer).deleteUser, false);
  assert.equal(delivery.canManageUser({ ...peer, assignedRoles: [...roles] }), true);
});
test('Unit Admin may assign Unit Admin access but neither role may edit out-of-scope members', () => {
  assert.equal(pagePolicy('unit-role').canEditUserRoles({ ...peer, assignedRoles: [roles[0]] }), true);
  for (const selection of ['unit-role', 'delivery-role']) {
    const state = pagePolicy(selection);
    for (const target of [
      { ...peer, businessUnitId: 'other' }, { ...peer, branchId: 'other' },
      { ...peer, tenantId: 'other' }, { ...peer, permissions: ['tenant:settings'] },
      { ...peer, permissions: ['branch_admin:manage'] },
    ]) assert.equal(state.canManageUser(target), false);
  }
});
test('an empty active-role permission set does not inherit a previously selected administrator role', () => {
  const emptyRole = { id: 'empty', systemRole: 'RECRUITER', permissions: [] };
  const empty = { ...profile, assignedRoles: [...roles, emptyRole] };
  assert.equal(pagePolicy('empty', empty, profile).canManageUser(peer), false);
  assert.equal(pagePolicy(null, { ...profile, permissions: [] }, profile).canManageUser(peer), false);
});
test('editing a peer profile sends only changed profile fields, preserving protected assignments', async () => {
  const handler = page.slice(page.indexOf('  const handleUpdateMember ='), page.indexOf('  const [sendingResetLink'));
  const writes = [];
  const selectedUser = { ...peer, assignedRoleIds: ['delivery-role'], roleId: 'delivery-role', city: 'PUNE' };
  const context = {
    selectedUser, editForm: { roles: ['delivery-role'], businessUnitId: 'unit', city: 'BBSR' },
    editRolesCatalog: roles, hasAdministrativeRole: () => false,
    getMemberRoleAssignment: () => ({ assignedRoleIds: ['delivery-role'], branchId: 'branch', businessUnitId: 'unit' }),
    isAutomaticPodLeadRole: () => false, canEditUserRoles: () => false,
    atsApi: { auth: { updateUserDetail: async (...args) => writes.push(args) } },
    setSubmitting() {}, setUsers() {}, setIsEditModalOpen() {}, setSelectedUser() {}, loadData: async () => {},
    toast: { success() {}, error(message) { throw new Error(message); } },
  };
  const update = evaluate(handler + '\nreturn handleUpdateMember;', context);
  await update({ preventDefault() {} });
  assert.deepEqual(writes, [['peer', { city: 'BBSR' }]]);
});
test('the shared frontend policy matches the canonical backend policy', { skip: !fs.existsSync(path.join(__dirname, '../../ats_backend/src/auth/user-management-policy.ts')) }, () => {
  const canonical = fs.readFileSync(path.join(__dirname, '../../ats_backend/src/auth/user-management-policy.ts'), 'utf8').replace(/\r\n/g, '\n');
  const generated = fs.readFileSync(path.join(__dirname, '../lib/user-management-policy.ts'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(generated, '// Generated by scripts/sync-user-management-policy.cjs. Do not edit directly.\n' + canonical);
});
