const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

test('Save publishes the server file URL instead of the temporary base64 preview', async () => {
  const file = path.join(__dirname, '../app/(dashboard)/company/page.tsx');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'handleSaveCompanyProfile') handler = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  const code = ts.transpileModule(`const run = ${handler.getText(source)};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const stored = { name: 'Example', site_title: 'Example recruitment', logo_url: '/public/image/logos/company/saved.png' };
  let formLogo;
  let branding;
  const dependencies = {
    companyName: stored.name, siteTitle: stored.site_title, logoUrl: 'data:image/png;base64,preview',
    atsApi: { auth: { updateMySettings: async input => {
      assert.equal(input.logoUrl, 'data:image/png;base64,preview');
      return stored;
    } } },
    setSavingCompanyProfile() {}, setLogoUrl: value => { formLogo = value; },
    updateBranding: value => { branding = value; },
    toast: { success() {}, error: message => assert.fail(message) },
  };
  await new Function(...Object.keys(dependencies), code + '\nreturn run;')(...Object.values(dependencies))();
  assert.equal(formLogo, stored.logo_url);
  assert.equal(branding.logoUrl, stored.logo_url);
});
