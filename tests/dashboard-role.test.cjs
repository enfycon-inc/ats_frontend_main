const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file) {
  const source = fs.readFileSync(path.join(__dirname, '../lib', file + '.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  const localRequire = name => name === './role-permissions' ? load('role-permissions') : {};
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
  return module.exports;
}
const { getDashboardRoleSelection: select } = load('dashboard-role');
const roles = [
  { id: 'recruiter', name: 'Recruiter', systemRole: 'RECRUITER' },
  { id: 'admin', name: 'Branch Admin', systemRole: 'BRANCH_ADMIN' },
  { id: 'bdm', name: 'BDM', systemRole: 'ACCOUNT_MANAGER' },
];
const profile = { roleId: 'admin', assignedRoleIds: ['recruiter', 'admin', 'bdm'], roleName: 'Branch Admin', systemRole: 'RECRUITER' };

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
