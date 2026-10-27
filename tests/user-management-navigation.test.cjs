const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const file = path.join(__dirname, '../lib/user-management-navigation.ts');
const exportsObject = {};
new Function('exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(exportsObject);
const { USER_PAGE_LINKS, canOpenUserPage } = exportsObject;
test('each agreed navigation link resolves to its own page and preserves its label', () => {
  assert.deepEqual(USER_PAGE_LINKS.map(page => page.label), ['Create Users', 'Active Users', 'Pending Users', 'Blocked Users', 'Users Activity']);
  for (const page of USER_PAGE_LINKS) {
    assert.ok(fs.existsSync(path.join(__dirname, '../app/(dashboard)', page.href, 'page.tsx')));
  }
  assert.equal(new Set(USER_PAGE_LINKS.map(page => page.href)).size, 5);
});
test('presence-only staff can open activity without inheriting directory or creation access', () => {
  const permissions = ['user:presence:view'];
  assert.equal(canOpenUserPage('activity', permissions), true);
  for (const key of ['create', 'active', 'blocked', 'pending']) assert.equal(canOpenUserPage(key, permissions), false);
});
test('user management does not silently grant telemetry access', () => {
  assert.equal(canOpenUserPage('create', ['user:manage']), true);
  assert.equal(canOpenUserPage('activity', ['user:manage']), false);
  for (const page of USER_PAGE_LINKS) assert.equal(canOpenUserPage(page.key, []), false);
});
