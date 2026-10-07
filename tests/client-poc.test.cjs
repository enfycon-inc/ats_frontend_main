const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports });
  return exports;
}
const { resolveClientPoc } = load('lib/client-poc.ts');
test('primary contact wins across both ownership groups without mixing legacy fields', () => {
  const primary = { name: 'Primary', isPrimary: true, email: 'primary@example.com' };
  const selected = resolveClientPoc({ contact_number: 'legacy-phone' }, {
    myContacts: [{ name: 'Mine' }], otherContacts: [primary],
  });
  assert.equal(selected, primary);
  assert.equal(selected.phone, undefined);
});
test('no primary uses the first authorized contact', () => {
  const contact = { name: 'Mine' };
  assert.equal(resolveClientPoc({}, { myContacts: [contact], otherContacts: [{ name: 'Other' }] }), contact);
});
test('empty or failed contact lookup preserves legacy POC details', () => {
  for (const contacts of [null, {}, { myContacts: [], otherContacts: [] }]) {
    const selected = resolveClientPoc({ client_lead: 'Legacy', email_id: 'legacy@example.com' }, contacts);
    assert.equal(selected.name, 'Legacy');
    assert.equal(selected.email, 'legacy@example.com');
  }
  assert.equal(resolveClientPoc({}).name, undefined);
});
const { getRouteBreadcrumbInfo } = load('lib/route-breadcrumb-map.ts');
test('client detail and edit labels do not expose route UUIDs while links still resolve', () => {
  const id = '2939c7e1-fcf2-4cfe-8348-e4544e9f34c4';
  for (const suffix of ['', '/edit']) {
    const info = getRouteBreadcrumbInfo(`/clients/${id}${suffix}`, new URLSearchParams());
    assert.ok(!info.pageTitle.includes(id));
    assert.ok(info.breadcrumbs.every(crumb => !crumb.label.includes(id)));
    assert.equal(info.backHref, suffix ? `/clients/${id}` : '/clients');
  }
});
