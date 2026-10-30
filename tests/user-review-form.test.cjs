const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const moduleExports = {};
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/user-review-form.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(moduleExports);
const { initialReviewForm, approvalDecision, reviewRoles } = moduleExports;
const roles = [
  { id: 'role-one', name: 'Recruiter', branchId: 'branch', businessUnitId: 'unit' },
  { id: 'role-two', name: 'Account Manager', branchId: 'branch', businessUnitId: 'unit' },
  { id: 'foreign', name: 'Recruiter', branchId: 'other', businessUnitId: 'other' },
  { id: 'unit-admin', name: 'Branch Unit Admin', systemRole: 'UNIT_ADMIN' },
];
const user = { id: 'request', fullName: 'Test User', email: 'user@example.test', requestedRole: 'Recruiter',
  requestedRoleId: 'role-one', requestVersion: 'current-version', branchId: 'branch', businessUnitId: 'unit' };

test('review initializes the requested role by identity and preserves the requested office', () => {
  const form = initialReviewForm(user, roles);
  assert.equal(form.roleId, 'role-one');
  assert.equal(form.branchId, 'branch');
  assert.equal(form.businessUnitId, 'unit');
  assert.deepEqual(reviewRoles(roles, form).map(r => r.id), ['role-one', 'role-two']);
});
test('approval sends the current version and derives primary role from current selections', () => {
  const form = { ...initialReviewForm(user, roles), roles: ['Account Manager'], roleId: 'role-one' };
  const decision = approvalDecision(form, roles, user.requestVersion);
  assert.equal(decision.expectedRequestVersion, 'current-version');
  assert.equal(decision.roleId, 'role-two');
  assert.deepEqual(decision.roleIds, ['role-two']);
});
test('approval supports multiple permitted roles and rejects empty or foreign role selections', () => {
  const form = initialReviewForm(user, roles);
  assert.deepEqual(approvalDecision({ ...form, roles: ['Recruiter', 'Account Manager'] }, roles).roleIds, ['role-one', 'role-two']);
  assert.throws(() => approvalDecision({ ...form, roles: [] }, roles), /available role/);
  assert.throws(() => approvalDecision({ ...form, roles: ['foreign'] }, roles), /available role/);
  assert.throws(() => approvalDecision({ ...form, businessUnitId: '' }, roles), /branch unit/);
  assert.throws(() => approvalDecision({ ...form, branchId: '' }, roles), /office branch/);
});
test('administrative category resolves a configured role instead of sending a sentinel ID', () => {
  const form = { ...initialReviewForm(user, roles), roleCategory: 'UNIT_ADMIN', roleId: 'UNIT_ADMIN' };
  assert.equal(approvalDecision(form, roles).roleId, 'unit-admin');
  assert.throws(() => approvalDecision(form, []), /available role/);
});
