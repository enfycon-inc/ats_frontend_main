const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../contexts/tenant-branding.tsx'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;

// Run the real provider and its effects with a small deterministic hook runtime.
// Network replies are controlled so save-versus-load ordering can be exercised.
function mountProvider({ initialBranding, me }) {
  const hooks = [];
  const document = { title: '' };
  let cursor = 0;
  let effects = [];
  let dirty = true;
  let output;
  let profileCalls = 0;
  const sameDeps = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
  const react = {
    createContext: value => ({ Provider: Symbol('Provider'), value }),
    useContext: context => context.value,
    useState(initial) {
      const index = cursor++;
      if (!hooks[index]) {
        const slot = { value: typeof initial === 'function' ? initial() : initial };
        slot.set = next => {
          const value = typeof next === 'function' ? next(slot.value) : next;
          if (!Object.is(slot.value, value)) { slot.value = value; dirty = true; }
        };
        hooks[index] = slot;
      }
      return [hooks[index].value, hooks[index].set];
    },
    useRef(initial) {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { current: initial };
      return hooks[index];
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!hooks[index] || !sameDeps(hooks[index].deps, deps)) hooks[index] = { callback, deps };
      return hooks[index].callback;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!hooks[index] || !sameDeps(hooks[index].deps, deps)) {
        const previous = hooks[index];
        const slot = { deps };
        hooks[index] = slot;
        effects.push(() => {
          previous?.cleanup?.();
          slot.cleanup = effect();
        });
      }
    },
  };
  const modules = {
    react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'next/navigation': { usePathname: () => '/company' },
    // There may be no hydrated NextAuth session while the normal API client
    // can still authenticate with local storage or recover its session token.
    'next-auth/react': { useSession: () => ({ data: null }) },
    '@/lib/ats-api': {
      atsApi: { auth: { me: () => { profileCalls++; return me(); } } },
      getApiBase: () => 'https://api.example.test',
    },
  };
  const module = { exports: {} };
  const localRequire = name => {
    assert.ok(Object.hasOwn(modules, name), `Unexpected provider dependency: ${name}`);
    return modules[name];
  };
  new Function('require', 'module', 'exports', 'document', compiled)(localRequire, module, module.exports, document);

  function render() {
    let renders = 0;
    while (dirty) {
      assert.ok(++renders < 20, 'Provider should settle without a render loop');
      cursor = 0;
      effects = [];
      dirty = false;
      output = module.exports.TenantBrandingProvider({ initialBranding, children: null });
      for (const effect of effects) effect();
    }
  }
  render();
  return {
    get branding() { return output.props.value.branding; },
    get title() { return document.title; },
    get calls() { return profileCalls; },
    updateBranding(value) { output.props.value.updateBranding(value); render(); },
    async settle() { await new Promise(resolve => setImmediate(resolve)); render(); },
    unmount() { for (const hook of hooks) hook?.cleanup?.(); },
  };
}

const saved = { name: 'Deb Technology', siteTitle: 'Deb workspace', logoUrl: 'data:image/png;base64,c2F2ZWQ=' };

test('refresh restores saved header branding and title without server bootstrap or hydrated session', async () => {
  const provider = mountProvider({ me: async () => ({ tenant: saved }) });
  try {
    await provider.settle();
    assert.equal(provider.calls, 1, 'Branding must load through the authenticated API client');
    assert.deepEqual(provider.branding, saved);
    assert.equal(provider.title, saved.siteTitle);
  } finally { provider.unmount(); }
});

test('partial server branding does not block a fresh profile containing the saved logo and title', async () => {
  const provider = mountProvider({ initialBranding: { name: saved.name }, me: async () => ({ tenant: saved }) });
  try {
    await provider.settle();
    assert.equal(provider.calls, 1);
    assert.deepEqual(provider.branding, saved);
    assert.equal(provider.title, saved.siteTitle);
  } finally { provider.unmount(); }
});

test('a profile request started before Save cannot overwrite the newly saved branding', async () => {
  let finishProfile;
  const provider = mountProvider({ me: () => new Promise(resolve => { finishProfile = resolve; }) });
  try {
    assert.equal(provider.calls, 1, 'Mount must start loading the persisted profile');
    provider.updateBranding(saved);
    finishProfile({ tenant: { name: 'Old company', siteTitle: 'Old title', logoUrl: '/old-logo.png' } });
    await provider.settle();
    assert.deepEqual(provider.branding, saved);
    assert.equal(provider.title, saved.siteTitle);
    assert.equal(provider.calls, 1, 'Saving should not restart the initial profile request');
  } finally { provider.unmount(); }
});
