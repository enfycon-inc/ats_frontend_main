const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { execFileSync } = require('node:child_process');
const source = process.env.ROLE_BASELINE ? execFileSync('git', ['show', 'HEAD:lib/member-role-selection.ts'], { encoding: 'utf8' }) : fs.readFileSync('lib/member-role-selection.ts', 'utf8');
const mod = { exports: {} };
new Function('exports', ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports);
const { hasAdministrativeRole, toggleAdministrativeRole, getSelectedMemberRoleIds } = mod.exports;
const roles = [
  { id: 'tenant', name: 'Tenant Admin', isSystem: true, systemRole: 'TENANT_ADMIN' },
  { id: 'branch', name: 'Branch Admin', isSystem: true, systemRole: 'BRANCH_ADMIN' },
  { id: 'unit', name: 'Unit Admin', isSystem: true, systemRole: 'UNIT_ADMIN' },
  { id: 'pod', name: 'Pod Lead', isSystem: true, systemRole: 'POD_LEAD' },
  { id: 'staff', name: 'Recruiter', branchId: 'location' },
];
test('all three assigned administrative roles are independently checked', () => {
  for (const key of ['TENANT_ADMIN', 'BRANCH_ADMIN', 'UNIT_ADMIN']) assert.equal(hasAdministrativeRole(['tenant', 'branch', 'unit'], roles, key), true);
});
test('removing hidden tenant admin preserves other administrators and staff through save', () => {
  const available = roles.filter(r => r.id !== 'tenant');
  const selected = toggleAdministrativeRole(['tenant', 'branch', 'unit', 'pod', 'staff'], roles, available, 'TENANT_ADMIN');
  assert.deepEqual(getSelectedMemberRoleIds({ branchId: 'location', roles: selected }, roles), ['branch', 'unit', 'pod', 'staff']);
});
test('adding unit admin preserves tenant admin and staff', () => {
  assert.deepEqual(toggleAdministrativeRole(['tenant', 'staff'], roles, roles, 'UNIT_ADMIN'), ['tenant', 'staff', 'unit']);
});
test('an unavailable role cannot be added using assigned metadata', () => {
  assert.throws(() => toggleAdministrativeRole(['staff'], roles, roles.filter(r => r.id !== 'tenant'), 'TENANT_ADMIN'), /current access scope/);
});

