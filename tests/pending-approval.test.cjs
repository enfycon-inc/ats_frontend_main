const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');

function mount() {
  const hooks = [], effects = [], socketListeners = new Map(), windowListeners = new Map(), timers = new Map(), redirects = [];
  let cursor = 0, timerId = 0, calls = 0;
  let profile = { isApproved: false, requestedRole: 'Delivery Head' };
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], v => { hooks[i] = typeof v === 'function' ? v(hooks[i]) : v; }]; },
    useCallback(fn, deps) { const i = cursor++; if (!same(hooks[i]?.deps, deps)) hooks[i] = { deps, fn }; return hooks[i].fn; },
    useMemo(fn) { cursor++; return fn(); },
    useEffect(fn, deps) { const i = cursor++; if (!same(hooks[i]?.deps, deps)) effects.push(() => { hooks[i]?.cleanup?.(); hooks[i] = { deps, cleanup: fn() }; }); },
  };
  const socket = { on: (name, fn) => socketListeners.set(name, fn), off: (name, fn) => { if (socketListeners.get(name) === fn) socketListeners.delete(name); } };
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react: { ...react, default: react }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/contexts/SocketContext': { useSocket: () => ({ socket }) },
    '@/lib/ats-api': { atsApi: { auth: { me: async () => { calls++; return profile; }, listRoles: async () => [] }, branches: { list: async () => [] }, businessUnits: { list: async () => [] } } },
  };
  const browser = { location: { replace: value => redirects.push(value) }, addEventListener: (name, fn) => windowListeners.set(name, fn), removeEventListener: name => windowListeners.delete(name) };
  const document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/auth/pending-approval-view.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('exports', 'require', 'window', 'document', 'setTimeout', 'clearTimeout', 'setInterval', code)(module.exports, name => imports[name] || new Proxy({}, { get: (_, key) => key }), browser, document,
    (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id; }, id => timers.delete(id), () => { throw new Error('Recurring polling must not be installed'); });
  const render = () => { cursor = 0; const tree = module.exports.default({ initialRequestedRole: 'Delivery Head' }); while (effects.length) effects.shift()(); return tree; };
  render();
  return {
    render, redirects, timers, socketListeners, windowListeners,
    get calls() { return calls; },
    approve() { profile = { isApproved: true, isActive: true, requestedRole: null, assignedRoles: [{ name: 'Recruiter' }] }; },
    async emit(event) { await socketListeners.get(event)?.(); },
    async settle() { await new Promise(resolve => setImmediate(resolve)); return render(); },
    unmount() { hooks.forEach(h => h?.cleanup?.()); },
  };
}

test('approval signal confirms the profile, shows actual assigned role, and redirects after the notice', async () => {
  const app = mount();
  await app.settle();
  assert.equal(app.calls, 1);
  app.approve();
  await app.emit('account_approved');
  const tree = await app.settle();
  assert.match(JSON.stringify(tree), /Delivery Head/);
  assert.match(JSON.stringify(tree), /Recruiter/);
  assert.deepEqual(app.redirects, []);
  const notice = [...app.timers.values()].find(t => t.delay === 5000);
  assert.ok(notice);
  notice.fn();
  assert.deepEqual(app.redirects, ['/dashboard']);
});

test('reconnect discovers a missed approval without recurring polling and cleanup removes listeners', async () => {
  const app = mount();
  await app.settle();
  app.approve();
  await app.emit('connect');
  assert.match(JSON.stringify(await app.settle()), /Your account is approved/);
  app.unmount();
  assert.equal(app.socketListeners.size, 0);
  assert.equal(app.windowListeners.size, 0);
  assert.equal(app.timers.size, 0);
});

test('a notification alone never approves or redirects an unapproved account', async () => {
  const app = mount();
  await app.settle();
  await app.emit('account_approved');
  assert.match(JSON.stringify(await app.settle()), /Hang Tight/);
  assert.equal(app.timers.size, 0);
  assert.deepEqual(app.redirects, []);
});
