const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const value = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/pod-team-selection.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(value.exports);
const { changePodLead, podMembersWithoutLead } = value.exports;
const users = [{ id: 'lead', fullName: 'Aarav Sharma', email: 'aarav@example.com' }, { id: 'a', fullName: 'Aditi Patel', email: 'aditi@example.com' }, { id: 'b', fullName: 'Rohan Das', email: 'rohan@example.com' }];
test('lead is separate from member options and case-insensitive name/email search', () => {
  assert.deepEqual(podMembersWithoutLead(users, 'lead').map(user => user.id), ['a', 'b']);
  assert.deepEqual(podMembersWithoutLead(users, 'lead', ' ADITI ').map(user => user.id), ['a']);
  assert.deepEqual(podMembersWithoutLead(users, 'lead', 'ROHAN@').map(user => user.id), ['b']);
  assert.deepEqual(podMembersWithoutLead(users, 'lead', 'missing'), []);
  assert.deepEqual(podMembersWithoutLead(users, 'lead', 'aarav'), []);
});
test('assigning a member as lead keeps exactly one internal relation', () => {
  assert.deepEqual(changePodLead(['a', 'b'], '', 'a'), ['b', 'a']);
  assert.deepEqual(changePodLead(['lead', 'a', 'b'], 'lead', 'a'), ['b', 'a']);
});
test('removing or replacing lead preserves unrelated selections', () => {
  assert.deepEqual(changePodLead(['lead', 'a'], 'lead', ''), ['a']);
  assert.deepEqual(changePodLead(['lead', 'a'], 'lead', 'b'), ['a', 'b']);
  assert.deepEqual(changePodLead([], '', ''), []);
});
