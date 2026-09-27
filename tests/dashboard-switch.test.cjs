const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Exercise production callbacks without needing a signed-in browser session.
function callback(file, matches, dependencies) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let selected;
  function visit(node) {
    if (!selected && matches(node)) selected = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(selected, 'Production callback exists');
  const expression = ts.isVariableDeclaration(selected) ? selected.initializer : selected.arguments[0];
  const js = ts.transpileModule(`const run = ${expression.getText(source)};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return new Function(...Object.keys(dependencies), js + '\nreturn run;')(...Object.values(dependencies));
}

test('role switching updates subscribers and navigates without reloading the document', () => {
  const saved = new Map();
  const events = [];
  const routes = [];
  const states = [];
  const location = {};
  Object.defineProperty(location, 'href', { set() { assert.fail('A role switch must not reload the document'); } });
  const run = callback('components/layout/navbar-right.tsx', node => ts.isVariableDeclaration(node) && node.name.getText() === 'handleSwitchRole', {
    window: { location, dispatchEvent: event => events.push(event.type) },
    localStorage: { setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) },
    router: { push: route => routes.push(route) },
    setOverrideRole: value => states.push(value),
    currentUser: { id: 'user', tenantId: 'tenant' },
    saveDashboardRole: (profile, role) => { assert.equal(profile.id, 'user'); },
    setOpen: value => assert.equal(value, false),
    Event, CustomEvent,
  });
  run('assigned-role-id');
  assert.equal(saved.get('override_role'), 'assigned-role-id');
  assert.deepEqual(routes, ['/dashboard']);
  assert.ok(events.includes('overrideRoleChanged'));
  run(null);
  assert.equal(saved.has('override_role'), false);
  assert.deepEqual(states, ['assigned-role-id', null]);
});

for (const file of ['app-sidebar.tsx', 'top-navbar.tsx']) {
  test(`${file} does not publish an incomplete navigation profile while roles are loading`, async () => {
    let resolveRoles;
    const commits = [];
    const profile = { roleId: 'assigned-role-id' };
    const run = callback(`components/layout/${file}`, node => ts.isCallExpression(node) && node.expression.getText() === 'useEffect', {
      initialNavigation: null,
      setIsLoadingProfile: () => {},
      localStorage: { setItem: () => {} },
      atsApi: { auth: { me: () => Promise.resolve(profile), listRoles: () => new Promise(resolve => { resolveRoles = resolve; }) } },
      setLiveProfile: value => commits.push(['profile', value]),
      setAvailableRoles: value => commits.push(['roles', value]),
    });
    const cleanup = run();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(commits, []);
    resolveRoles([{ id: 'assigned-role-id' }]);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(commits.length, 2);
    assert.deepEqual(commits[1], ['profile', profile]);
    cleanup();
  });
}

test('a server-populated sidebar keeps its data and does not start another initial fetch', () => {
  const run = callback('components/layout/app-sidebar.tsx', node => ts.isCallExpression(node) && node.expression.getText() === 'useEffect', {
    initialNavigation: { profile: { id: 'user' }, roles: [{ id: 'primary' }], overrideRole: 'primary' },
    atsApi: { auth: { me: () => assert.fail('Unexpected profile refetch'), listRoles: () => assert.fail('Unexpected roles refetch') } },
    setLiveProfile: () => assert.fail('Must preserve the initial profile'),
    setAvailableRoles: () => assert.fail('Must preserve initial role definitions'),
  });
  run();
});
