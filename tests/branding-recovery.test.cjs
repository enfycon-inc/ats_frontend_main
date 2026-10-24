const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://workspace.example.com' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const swr = require('swr');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function load(file, imports = {}) {
  const exports = {};
  const source = process.env.BRANDING_BASELINE === '1' && ['contexts/tenant-branding.tsx', 'components/shared/company-logo-image.tsx'].includes(file)
    ? require('node:child_process').execFileSync('git', ['show', `HEAD:${file}`], { cwd: path.join(__dirname, '..'), encoding: 'utf8' })
    : fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('exports', 'require', code)(exports, name => name in imports ? imports[name] : require(name));
  return exports;
}
const bounds = load('lib/logo-bounds.ts');
const { CompanyLogoImage } = load('components/shared/company-logo-image.tsx', { '@/lib/logo-bounds': bounds });
dom.window.HTMLCanvasElement.prototype.getContext = () => null;

async function mount(element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return { container, root, async close() { await act(async () => root.unmount()); container.remove(); } };
}

test('logo remains visible before measuring and recovers after a temporary image failure', async () => {
  const view = await mount(React.createElement(CompanyLogoImage, { src: '/logo.png', alt: 'Example Logo' }));
  try {
    let image = view.container.querySelector('img');
    assert.ok(image);
    assert.notEqual(image.style.visibility, 'hidden');
    await act(async () => image.dispatchEvent(new window.Event('error')));
    assert.match(view.container.textContent, /Example Logo/);
    assert.equal(view.container.querySelector('img'), null, 'wait before retrying instead of immediately reloading');
    await act(async () => wait(1600));
    image = view.container.querySelector('img');
    assert.match(image.getAttribute('src'), /logoRetry=1/);
    Object.defineProperties(image, { naturalWidth: { value: 480 }, naturalHeight: { value: 96 } });
    await act(async () => image.dispatchEvent(new window.Event('load')));
    assert.ok(view.container.querySelector('svg image'));
  } finally { await view.close(); }
});

test('logo replacement resets the loading failure and keeps explicit dimensions', async () => {
  const view = await mount(React.createElement(CompanyLogoImage, { src: '/first.png', alt: 'Logo', className: 'h-[34px] w-[240px]' }));
  try {
    await act(async () => view.container.querySelector('img').dispatchEvent(new window.Event('error')));
    await act(async () => view.root.render(React.createElement(CompanyLogoImage, { src: '/second.png', alt: 'Logo', className: 'h-[34px] w-[240px]' })));
    const image = view.container.querySelector('img');
    assert.equal(image.getAttribute('src'), '/second.png');
    assert.match(image.className, /w-\[240px\]/);
  } finally { await view.close(); }
});

function provider(api, session = { user: { id: 'member' } }) {
  let options;
  const exports = load('contexts/tenant-branding.tsx', {
    '@/lib/ats-api': { atsApi: { auth: { me: api } } },
    'next/navigation': { usePathname: () => '/dashboard' },
    'next-auth/react': { useSession: () => ({ data: session }) },
    '@/utils/subdomain-helper': { getTenantIdentifier: () => 'workspace' },
    swr: { __esModule: true, default: (key, fetcher, config) => {
      options = config;
      return swr.default(key, fetcher, { ...config, errorRetryInterval: 10, dedupingInterval: 0, focusThrottleInterval: 0 });
    } },
  });
  let current;
  function Consumer() { current = exports.useTenantBranding(); return React.createElement('span', null, current.branding.logoUrl || 'pending'); }
  const cache = new Map();
  const element = initialBranding => React.createElement(swr.SWRConfig, { value: { provider: () => cache } },
    React.createElement(exports.TenantBrandingProvider, { initialBranding }, React.createElement(Consumer)));
  return { element, get current() { return current; }, get options() { return options; } };
}

test('branding request retries after outage and preserves loaded branding on subsequent failures', async () => {
  let calls = 0;
  let unavailable = false;
  const context = provider(async () => {
    calls++;
    if (calls === 1 || unavailable) throw new Error('temporary outage');
    return { tenant: { logoUrl: '/saved.webp', name: 'Example' } };
  });
  const view = await mount(context.element());
  try {
    for (let i = 0; i < 30 && !context.current.brandingReady; i++) await act(async () => wait(20));
    assert.ok(calls >= 2);
    assert.equal(context.current.branding.logoUrl, '/saved.webp');
    assert.equal(context.options.errorRetryCount, 3);
    assert.equal(context.options.revalidateOnReconnect, true);
    unavailable = true;
    await act(async () => { window.dispatchEvent(new window.Event('focus')); await wait(30); });
    assert.equal(context.current.branding.logoUrl, '/saved.webp');
  } finally { await view.close(); }
});

test('a delayed profile response cannot overwrite a newly saved logo', async () => {
  let resolve;
  const context = provider(() => new Promise(done => { resolve = done; }));
  const view = await mount(context.element({ logoUrl: '/original.webp' }));
  try {
    await act(async () => context.current.updateBranding({ logoUrl: '/new.webp' }));
    await act(async () => { resolve({ tenant: { logoUrl: '/old.webp' } }); await wait(10); });
    assert.equal(context.current.branding.logoUrl, '/new.webp');
  } finally { await view.close(); }
});

test('a cached complete image is measured without waiting for a load event', async () => {
  const proto = dom.window.HTMLImageElement.prototype;
  const descriptors = Object.fromEntries(['complete', 'naturalWidth', 'naturalHeight'].map(key => [key, Object.getOwnPropertyDescriptor(proto, key)]));
  Object.defineProperties(proto, { complete: { configurable: true, get: () => true }, naturalWidth: { configurable: true, get: () => 480 }, naturalHeight: { configurable: true, get: () => 96 } });
  let view;
  try {
    view = await mount(React.createElement(CompanyLogoImage, { src: '/cached.webp', alt: 'Cached Logo' }));
    assert.ok(view.container.querySelector('svg image'));
  } finally {
    if (view) await view.close();
    Object.defineProperties(proto, descriptors);
  }
});

test('partial profile replies preserve the known logo', async () => {
  const context = provider(async () => ({ tenant: { name: 'Updated company', logoUrl: undefined } }));
  const view = await mount(context.element({ logoUrl: '/known.webp' }));
  try {
    await act(async () => wait(20));
    assert.equal(context.current.branding.logoUrl, '/known.webp');
    assert.equal(context.current.branding.name, 'Updated company');
  } finally { await view.close(); }
});
