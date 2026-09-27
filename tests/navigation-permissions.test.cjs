const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(relative) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative + '.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  const localRequire = name => name.startsWith('@/') ? load(name.slice(2)) : {};
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
  return module.exports;
}

const { getActiveRolePermissions, getFilteredPrimaryNav, getFilteredMoreNav, isRoleAdmin } = load('lib/role-permissions');
const ids = items => items.map(item => item.id);
const children = (items, id) => items.find(item => item.id === id)?.children?.map(item => item.href) || [];

test('an admin omitted from the branch catalog retains navigation from the live profile', () => {
  const profile = { roleId: 'tenant-admin-id', systemRole: 'TENANT_ADMIN', permissions: ['job:view', 'client:view', 'user:manage', 'tenant:settings'] };
  assert.deepEqual(getActiveRolePermissions(profile.roleId, [], profile), profile.permissions);
  assert.ok(ids(getFilteredPrimaryNav(profile.roleId, [], profile)).includes('clients'));
  assert.ok(children(getFilteredPrimaryNav(profile.roleId, [], profile), 'branch-units').includes('/management/branch'));
  const more = ids(getFilteredMoreNav(profile.roleId, [], profile));
  for (const id of ['user-management', 'role-management', 'dictionaries']) assert.ok(more.includes(id), id);
});

test('renaming an inherited role never grants or hides capabilities', () => {
  const profile = { permissions: ['job:view', 'client:view', 'user:manage'] };
  const role = { id: 'branch-role', name: 'Recruiting Partner', systemRole: 'ACCOUNT_MANAGER', permissions: ['candidate:view'] };
  const before = getFilteredMoreNav(role.id, [role], profile);
  const after = getFilteredMoreNav(role.id, [{ ...role, name: 'Office Director', systemRole: 'TENANT_ADMIN' }], profile);
  assert.deepEqual(after, before);
  assert.ok(ids(before).includes('user-management'));
  assert.ok(!ids(getFilteredPrimaryNav(role.id, [role], profile)).includes('applicants'));
});

test('an explicit empty live permission set revokes role defaults and stale catalog grants', () => {
  const roles = [{ id: 'admin', name: 'TENANT_ADMIN', systemRole: 'TENANT_ADMIN', permissions: ['job:view', 'user:manage'] }];
  const profile = { permissions: [] };
  assert.deepEqual(getActiveRolePermissions('admin', roles, profile), []);
  assert.deepEqual(ids(getFilteredPrimaryNav('admin', roles, profile)), ['dashboard']);
  assert.ok(!ids(getFilteredMoreNav('admin', roles, profile)).includes('user-management'));
  assert.deepEqual(children(getFilteredMoreNav('admin', roles, profile), 'settings'), ['/utility/settings-notifications']);
});

test('unknown role IDs and system names cannot fabricate a recruiter permission set', () => {
  for (const role of ['missing-role-id', 'RECRUITER', 'TENANT_ADMIN', 'SUPER_ADMIN']) {
    assert.deepEqual(getActiveRolePermissions(role, []), [], role);
    assert.deepEqual(ids(getFilteredPrimaryNav(role, [])), ['dashboard'], role);
  }
});

test('changing dashboard perspective preserves the authoritative assigned-role permission union', () => {
  const roles = [
    { id: 'recruiting', name: 'Recruiting', permissions: ['candidate:view'] },
    { id: 'accounts', name: 'Accounts', permissions: ['client:view', 'user:manage'] },
  ];
  const profile = { assignedRoleIds: ['recruiting', 'accounts'], permissions: ['candidate:view', 'client:view', 'user:manage'] };
  for (const perspective of ['recruiting', 'accounts']) {
    assert.deepEqual(getActiveRolePermissions(perspective, roles, profile), profile.permissions);
    assert.ok(ids(getFilteredPrimaryNav(perspective, roles, profile)).includes('clients'));
    assert.ok(ids(getFilteredMoreNav(perspective, roles, profile)).includes('user-management'));
  }
});

test('catalog fallback unions only assigned explicit permissions and preserves exact empty roles', () => {
  const roles = [
    { id: 'one', name: 'First', permissions: ['job:view', 'candidate:view'] },
    { id: 'two', name: 'Second', permissions: ['candidate:view', 'client:view'] },
    { id: 'empty', name: 'TENANT_ADMIN', permissions: [] },
  ];
  assert.deepEqual(getActiveRolePermissions('one', roles, { assignedRoleIds: ['one', 'two'] }), ['job:view', 'candidate:view', 'client:view']);
  assert.deepEqual(getActiveRolePermissions('empty', roles), []);
});

test('revoked child actions and administrative capabilities disappear despite an admin archetype', () => {
  const profile = { permissions: ['candidate:view', 'job:view', 'report:view'] };
  const primary = getFilteredPrimaryNav('TENANT_ADMIN', [], profile);
  assert.ok(ids(primary).includes('reports'));
  assert.ok(!children(primary, 'applicants').includes('/applicants/new'));
  assert.ok(!children(primary, 'applicants').includes('/applicants/bulk'));
  assert.ok(!children(primary, 'applicants').includes('/applicants/pipeline'));
  assert.ok(!children(primary, 'job-posting').includes('/job-posting/boards'));
  assert.ok(!ids(getFilteredMoreNav('TENANT_ADMIN', [], profile)).includes('role-management'));
  assert.equal(isRoleAdmin('TENANT_ADMIN', [], profile), false);
});

test('branch administration links to its settings without granting the tenant branch directory', () => {
  const profile = { permissions: ['branch_admin:manage'] };
  const more = getFilteredMoreNav('Branch Admin', [], profile);
  assert.ok(!ids(more).includes('branch-management'));
  assert.ok(children(more, 'settings').includes('/settings/branch'));
});

test('platform navigation requires the backend platform capability, not a role label', () => {
  assert.ok(!ids(getFilteredPrimaryNav('SUPER_ADMIN', [], { permissions: [] })).includes('tenant-management'));
  assert.ok(ids(getFilteredPrimaryNav('custom-platform-id', [], { permissions: ['platform:manage'] })).includes('tenant-management'));
  assert.equal(isRoleAdmin('custom-platform-id', [], { permissions: ['platform:manage'] }), true);
});
