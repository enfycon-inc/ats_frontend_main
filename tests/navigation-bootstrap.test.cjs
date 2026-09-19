const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/navigation-bootstrap.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function loader(fetch) {
  const module = { exports: {} };
  new Function('module', 'exports', 'fetch', code)(module, module.exports, fetch);
  return module.exports.loadNavigationBootstrap;
}
test('server navigation includes live profile and role definitions with authenticated uncached requests', async () => {
  const calls = [];
  const load = loader(async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => url.endsWith('/me') ? { id: 'member' } : [{ id: 'role' }] };
  });
  assert.deepEqual(await load('https://api.example.test/', 'session-token'), {
    profile: { id: 'member' }, roles: [{ id: 'role' }], overrideRole: null,
  });
  assert.equal(calls.length, 2);
  for (const { options } of calls) {
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers.Authorization, 'Bearer session-token');
    assert.ok(options.signal);
  }
});
test('failed bootstrap does not serialize partial or unauthenticated navigation', async () => {
  const load = loader(async () => ({ ok: false }));
  assert.equal(await load('https://api.example.test', 'token'), null);
  const noToken = loader(() => assert.fail('Missing credentials must not start a request'));
  assert.equal(await noToken('https://api.example.test', ''), null);
});

test('assigned role metadata from the profile does not depend on the branch-filtered role catalog', async () => {
  const profile = { id: 'admin', permissions: ['tenant:settings'], assignedRoles: [
    { id: 'tenant-admin-id', name: 'Workspace Owner', systemRole: 'ADMIN' },
  ] };
  const load = loader(async url => {
    if (!url.endsWith('/me')) throw new Error('Role catalog unavailable');
    return { ok: true, json: async () => profile };
  });
  assert.deepEqual(await load('https://api.example.test', 'token'), {
    profile, roles: profile.assignedRoles, overrideRole: null,
  });
});
