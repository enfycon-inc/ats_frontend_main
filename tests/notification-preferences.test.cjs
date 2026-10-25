const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, imports = {}) {
  const exports = {};
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText)(exports, name => name in imports ? imports[name] : require(name));
  return exports;
}
const contract = load('lib/notification-preferences.ts');
const tick = () => new Promise(resolve => setImmediate(resolve));
function provider() {
  let cursor = 0, slots = [], effects = [], user = { id: 'one', tenantId: 'tenant', email: 'one@example.com' };
  let saved = { ...contract.DEFAULT_NOTIFICATION_PREFERENCES, soundPreset: 'GENTLE_BELL', eligibleEmails: ['roleChanges'] };
  let list = [], failure = false;
  const handlers = new Map(), emitted = [], sounds = [], requests = [], keys = [];
  const window = new EventTarget(); window.dispatchEvent = event => { emitted.push(event.detail); return true; };
  const hooks = { ...React,
    useState(initial) { const at = cursor++; if (!(at in slots)) slots[at] = typeof initial === 'function' ? initial() : initial; return [slots[at], value => { slots[at] = typeof value === 'function' ? value(slots[at]) : value; }]; },
    useRef(initial) { const at = cursor++; return slots[at] ||= { current: initial }; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn, deps) { const at = cursor++; const old = slots[at]; if (!old || deps.some((dep, i) => dep !== old.deps[i])) { effects.push(() => { old?.cleanup?.(); slots[at] = { deps, cleanup: fn() }; }); } },
  };
  const socket = { on: (key, fn) => handlers.set(key, fn), off: (key, fn) => { if (handlers.get(key) === fn) handlers.delete(key); } };
  const api = { fetch: async (url, options) => {
    requests.push({ url, options });
    if (failure) throw new Error('Save rejected');
    if (options?.method === 'PUT') { saved = { ...saved, ...JSON.parse(options.body) }; return saved; }
    return { data: list, unreadCount: list.filter(item => !item.isRead).length };
  } };
  const { NotificationProvider } = load('contexts/NotificationContext.tsx', {
    react: hooks, 'next-auth/react': { useSession: () => ({ data: { user }, status: 'authenticated' }) },
    swr: { __esModule: true, default: key => { keys.push(key); return { data: saved, mutate: async value => { saved = value; } }; } },
    './SocketContext': { useSocket: () => ({ socket, isConnected: true }) },
    '@/lib/audio-synthesizer': { playPresetSound: (...args) => sounds.push(args) },
    '@/lib/ats-api': { atsApi: api }, '@/lib/notification-preferences': contract,
    'react-hot-toast': { __esModule: true, default: { error() {} } },
  });
  function render() {
    global.window = window;
    global.CustomEvent ||= class extends Event { constructor(type, options) { super(type); this.detail = options.detail; } };
    cursor = 0; const result = NotificationProvider({ children: null });
    const pending = effects; effects = []; pending.forEach(fn => fn());
    return result.props.value;
  }
  return { render, handlers, emitted, sounds, requests, keys,
    setSaved: value => { saved = { ...saved, ...value }; }, setFailure: value => { failure = value; },
    setList: value => { list = value; }, changeAccount: () => { user = { id: 'two', tenantId: 'another-tenant', email: 'two@example.com' }; },
  };
}
test('uses saved sound, deduplicates events and honors category suppression', async () => {
  const f = provider(); f.render(); await tick();
  const job = { id: 'job-event', type: 'JOB_CREATED', isRead: false };
  f.handlers.get('notification')(job); f.handlers.get('notification')(job);
  assert.equal(f.render().unreadCount, 1); assert.equal(f.sounds.length, 1);
  assert.equal(f.sounds[0][0], 'GENTLE_BELL');
  f.setSaved({ reviewAlerts: false }); f.render();
  f.handlers.get('notification')({ id: 'review-event', type: 'ROLE_REQUEST', isRead: false });
  assert.equal(f.sounds.length, 1); assert.equal(f.emitted.length, 1);
  assert.equal(f.render().unreadCount, 2); // retained in history
});
test('private signal fetches verified records and applies sound/popups only once', async () => {
  const f = provider(); f.render(); await tick();
  f.setList([{ id: 'private', type: 'ROLE_REQUEST', isRead: false }]);
  f.handlers.get('notifications_changed')(); await tick();
  f.handlers.get('notifications_changed')(); await tick();
  assert.equal(f.sounds.length, 1); assert.equal(f.emitted.length, 1);
});
test('failed saves propagate without changing saved preferences', async () => {
  const f = provider(); let context = f.render(); await tick(); f.setFailure(true);
  await assert.rejects(context.updateSettings({ soundEnabled: false }), /Save rejected/);
  context = f.render(); assert.equal(context.settings.soundEnabled, true);
});
test('changing accounts resets notifications and changes the settings cache key', async () => {
  const f = provider(); f.render(); await tick();
  f.handlers.get('notification')({ id: 'one', type: 'JOB_CREATED', isRead: false });
  f.changeAccount(); f.setSaved({ soundEnabled: false }); f.render(); await tick();
  const context = f.render(); assert.equal(context.unreadCount, 0); assert.equal(context.settings.soundEnabled, false);
  assert.ok(f.keys.some(key => key[1] === 'one:tenant'));
  assert.ok(f.keys.some(key => key[1] === 'two:another-tenant'));
});
test('settings UI shows eligible emails only and no onboarding opt-out', () => {
  const native = type => props => React.createElement(type, props, props.children);
  const { default: Page } = load('app/(dashboard)/utility/settings-notifications/page.tsx', {
    react: { ...React, useState: value => [value, () => {}], useEffect() {} },
    '@/components/layout/dashboard-breadcrumb': { __esModule: true, default: () => null },
    '@/contexts/NotificationContext': { useNotifications: () => ({ settings: { ...contract.DEFAULT_NOTIFICATION_PREFERENCES, eligibleEmails: ['roleChanges'] }, updateSettings() {} }) },
    '@/lib/notification-preferences': contract,
    '@/lib/audio-synthesizer': { SOUND_OPTIONS: [], playPresetSound() {} },
    '@/components/ui/switch': { Switch: native('button') }, '@/components/ui/button': { Button: native('button') },
    'react-hot-toast': { __esModule: true, default: {} },
  });
  const html = renderToStaticMarkup(React.createElement(Page));
  assert.match(html, /Changes to my role assignments/);
  assert.doesNotMatch(html, /Role requests to review|Role approved/);
  assert.match(html, /Registration acknowledgment/);
  assert.doesNotMatch(html, /aria-label="Registration/);
});
