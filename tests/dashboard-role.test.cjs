const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file) {
  const source = fs.readFileSync(path.join(__dirname, '../lib', file + '.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  const localRequire = name => name.startsWith('./') ? load(name.slice(2)) : {};
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
  return module.exports;
}
const { getDashboardRoleSelection: select } = load('dashboard-role');
const { saveDashboardRole, getSavedDashboardRole, dashboardPreferenceCookie } = load('dashboard-preference');
const roles = [
  { id: 'recruiter', name: 'Recruiter', systemRole: 'RECRUITER' },
  { id: 'admin', name: 'Branch Admin', systemRole: 'BRANCH_ADMIN' },
  { id: 'bdm', name: 'BDM', systemRole: 'ACCOUNT_MANAGER' },
];
const profile = { roleId: 'admin', assignedRoleIds: ['recruiter', 'admin', 'bdm'], roleName: 'Branch Admin', systemRole: 'RECRUITER' };

test('saved preference survives session cleanup and is isolated by account and workspace', () => {
  const data = new Map();
  global.window = {};
  global.localStorage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  try {
    const user = { ...profile, id: 'a', tenantId: 'one', roleId: 'recruiter' };
    assert.equal(select(user, roles).active.id, 'recruiter');
    saveDashboardRole(user, 'bdm');
    localStorage.removeItem('override_role');
    localStorage.removeItem('ats_current_user');
    assert.equal(select(user, roles).active.id, 'bdm');
    assert.equal(getSavedDashboardRole({ id: 'b', tenantId: 'one' }), null);
    assert.equal(getSavedDashboardRole({ id: 'a', tenantId: 'two' }), null);
    assert.equal(select({ ...user, assignedRoleIds: ['recruiter'] }, roles).active.id, 'recruiter');
  } finally { delete global.window; delete global.localStorage; }
});

test('first login uses the selected role ID for both label and dashboard, irrespective of array order or stale systemRole', () => {
  const result = select(profile, roles);
  assert.equal(result.active.name, 'Branch Admin');
  assert.equal(result.systemRole, 'BRANCH_ADMIN');
});
test('switching uses the exact assigned ID and preserves the custom display name', () => {
  const result = select(profile, roles, 'bdm');
  assert.equal(result.active.name, 'BDM');
  assert.equal(result.systemRole, 'ACCOUNT_MANAGER');
});
test('revoked or foreign saved overrides fall back to the current primary', () => {
  assert.equal(select(profile, [...roles, { id: 'foreign', name: 'Other Admin', systemRole: 'ADMIN' }], 'foreign').active.id, 'admin');
});
test('legacy saved role names still resolve only within assigned roles', () => {
  assert.equal(select(profile, roles, 'Recruiter').systemRole, 'RECRUITER');
});
test('duplicate display names are distinguished by ID', () => {
  const custom = [...roles, { id: 'custom', name: 'BDM', systemRole: 'DELIVERY_HEAD' }];
  const result = select({ ...profile, assignedRoleIds: [...profile.assignedRoleIds, 'custom'] }, custom, 'custom');
  assert.equal(result.systemRole, 'DELIVERY_HEAD');
});

test('the configured primary survives omission from the branch management catalog', () => {
  const user = { roleId: 'owner', assignedRoleIds: ['owner', 'recruiter'], roleName: 'Workspace Owner', systemRole: 'ADMIN' };
  const result = select(user, [roles[0]], null, false);
  assert.equal(result.active.id, 'owner');
  assert.equal(result.systemRole, 'ADMIN');
});

test('sidebar hydration uses the server-selected role despite different browser storage', () => {
  global.window = {};
  global.localStorage = { getItem: () => 'recruiter' };
  try {
    const user = { ...profile, id: 'user', tenantId: 'tenant' };
    assert.equal(select(user, roles, 'bdm', false).active.id, 'bdm');
  } finally { delete global.window; delete global.localStorage; }
});

test('saved dashboard choices are available to secure server rendering under the same scoped cookie', () => {
  global.window = { location: { protocol: 'https:' } };
  global.document = { cookie: '' };
  global.localStorage = { setItem() {}, removeItem() {} };
  try {
    const user = { id: 'member', tenantId: 'workspace' };
    saveDashboardRole(user, 'role-id');
    assert.equal(document.cookie, `${dashboardPreferenceCookie(user)}=role-id; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
    saveDashboardRole(user, null);
    assert.match(document.cookie, /Max-Age=0/);
  } finally { delete global.window; delete global.document; delete global.localStorage; }
});
