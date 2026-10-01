const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const file = path.join(__dirname, '../components/auth/login-form.tsx');
const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate) {
  let result;
  function visit(node) {
    if (!result && predicate(node)) result = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(result, 'Production callback or loading condition exists');
  return result;
}
function callback(name, dependencies) {
  const node = find(n => ts.isVariableDeclaration(n) && n.name.getText(source) === name);
  const code = ts.transpileModule(`const run = ${node.initializer.getText(source)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return new Function(...Object.keys(dependencies), code + '\nreturn run;')(...Object.values(dependencies));
}
function setup({ superAdmin = false, crossDomain = false, rejected = false, navigationThrows = false } = {}) {
  const state = { navigating: false, destination: null, error: null };
  const location = { protocol: 'http:' };
  Object.defineProperty(location, 'href', { set(value) {
    if (navigationThrows) throw new Error('Navigation failed');
    state.destination = value;
  } });
  const navigateToDashboard = callback('navigateToDashboard', {
    setIsNavigating: value => { state.navigating = value; }, window: { location },
  });
  const navigateAfterLogin = callback('navigateAfterLogin', {
    fetch: async () => ({ ok: true, json: async () => ({ user: { id: 'test-user' } }) }),
    navigateToDashboard, setTimeout,
  });
  let completion;
  const onSubmit = callback('onSubmit', {
    startTransition: action => { completion = action(); },
    atsApi: { auth: { login: async () => ({ accessToken: 'test-only', user: {
      roles: superAdmin ? ['SUPER_ADMIN'] : [], tenantDomain: superAdmin ? '' : 'workspace',
    } }) } },
    signIn: async () => rejected ? { error: 'Rejected' } : { ok: true },
    toast: { success() {}, error(message) { state.error = message; } },
    getCurrentSubdomain: () => crossDomain || superAdmin ? '' : 'workspace',
    getBaseDomain: () => 'localhost:3000', window: { location }, document: { cookie: '' },
    searchParams: { get: () => null }, navigateAfterLogin, navigateToDashboard,
  });
  return { state, run: async () => { onSubmit({ email: 'test@example.test', password: 'test-only' }); await completion; } };
}
function overlayVisible(navigating) {
  const node = find(n => ts.isIfStatement(n) && n.expression.getText(source).includes('isAuthorizingSso || isPending'));
  // The transition has finished, but the destination document has not loaded.
  return new Function('isAuthorizingSso', 'isPending', 'isNavigating', `return ${node.expression.getText(source)};`)(false, false, navigating);
}

for (const [name, options, destination] of [
  ['tenant login', {}, '/dashboard'],
  ['platform login', { superAdmin: true }, '/dashboard'],
  ['cross-domain handoff', { crossDomain: true }, 'http://workspace.localhost:3000/auth/login'],
]) {
  test(`${name} keeps its overlay after sign-in completes and before navigation commits`, async () => {
    const { state, run } = setup(options);
    await run();
    assert.equal(state.destination, destination);
    assert.equal(overlayVisible(state.navigating), true);
  });
}
test('rejected sign-in leaves the form available', async () => {
  const { state, run } = setup({ rejected: true });
  await run();
  assert.equal(state.destination, null);
  assert.equal(overlayVisible(state.navigating), false);
  assert.ok(state.error);
});
test('navigation failure restores the form and reports the error', async () => {
  const { state, run } = setup({ navigationThrows: true });
  await run();
  assert.equal(overlayVisible(state.navigating), false);
  assert.equal(state.error, 'Navigation failed');
});
