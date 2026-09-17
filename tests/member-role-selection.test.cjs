const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../lib/member-role-selection.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleResult = { exports: {} };
new Function('module', 'exports', compiled)(moduleResult, moduleResult.exports);
const { getSelectedMemberRoleIds } = moduleResult.exports;
const roles = [
  { id: 'admin-home', name: 'Branch Admin', branchId: 'home' },
  { id: 'admin-other', name: 'Branch Admin', branchId: 'other' },
  { id: 'head-home', name: 'Delivery Head', branchId: 'home' },
  { id: 'bdm-home', name: 'BDM', branchId: 'home' },
];

test('saving BDM after unchecking admin and delivery head sends only the selected role', () => {
  const form = { branchId: 'home', roles: ['Branch Admin', 'Delivery Head', 'BDM'], branchRoles: { home: ['bdm-home'] } };
  assert.deepEqual(getSelectedMemberRoleIds(form, roles), ['bdm-home']);
});
test('clearing all checkboxes does not fall back to old roles', () => {
  assert.deepEqual(getSelectedMemberRoleIds({ branchId: 'home', roles: ['Branch Admin'], branchRoles: { home: [] } }, roles), []);
});
test('legacy names resolve only to this branch, not every same-named role', () => {
  assert.deepEqual(getSelectedMemberRoleIds({ branchId: 'home', roles: ['Branch Admin'] }, roles), ['admin-home']);
});
test('another branch role cannot be selected by ID', () => {
  assert.throws(() => getSelectedMemberRoleIds({ branchId: 'home', roles: ['admin-other'] }, roles), /reselect/);
});
