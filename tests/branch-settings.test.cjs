const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadSettings(dependencies) {
  const file = path.join(__dirname, '../app/(dashboard)/settings/branch/page.tsx');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let loader;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'loadBranchesAndHierarchy') loader = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  const code = ts.transpileModule(`const run = ${loader.getText(source)};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return new Function(...Object.keys(dependencies), code + '\nreturn run;')(...Object.values(dependencies));
}

test('branch settings loads only the live assigned branch and opens its settings directly', async () => {
  const branch = { id: 'home', name: 'Home Office' };
  let opened;
  const run = loadSettings({
    atsApi: {
      auth: { me: async () => ({ branchId: 'home', permissions: ['branch_admin:manage'] }), listRoles: async () => [] },
      branches: {
        get: async id => { assert.equal(id, 'home'); return branch; },
        list: () => assert.fail('Must not fetch the branch directory'),
        getHierarchy: () => assert.fail('Must not fetch other branch staff and pods'),
      },
    },
    setLiveProfile() {}, setLoading() {}, setBranches() {}, setHierarchyData() {}, setTenantRoles() {},
    setFormError: message => assert.fail(message),
    openEditModal: async value => { opened = value; },
  });
  await run();
  assert.equal(opened, branch);
});
