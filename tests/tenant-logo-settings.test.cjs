const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, imports) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('exports', 'require', code)(exports, name => name in imports ? imports[name] : require(name));
  return exports;
}
const native = type => ({ variant, size, afterForm, ...props }) => React.createElement(type, props);
const errors = [];
const general = load('components/company/tabs/general-tab.tsx', {
  'react-hot-toast': { __esModule: true, default: { error: message => errors.push(message) } },
  '@/components/shared/company-logo-image': { CompanyLogoImage: ({ onDimensions, ...props }) => React.createElement('img', props) },
  'lucide-react': new Proxy({}, { get: () => native('span') }),
  '@/components/ui/card': { Card: native('section'), CardContent: native('div'), CardHeader: native('header'), CardTitle: native('h2'), CardDescription: native('p') },
  '@/components/ui/button': { Button: native('button') },
  '@/components/ui/input': { Input: native('input') },
  '@/components/ui/label': { Label: native('label') },
  '@/components/ui/badge': { Badge: native('span') },
});
const base = {
  companyName: 'Example Recruitment', siteTitle: 'Recruitment workspace', logoUrl: '/site.webp', loginLogoUrl: '/login.webp',
  subdomain: 'example', originalSubdomain: 'example', base: 'example.com', isSuperAdmin: false,
  setCompanyName() {}, setSiteTitle() {}, setLogoUrl() {}, setLoginLogoUrl() {}, handleSaveCompanyProfile() {}, handleSaveSubdomain() {}, setSubdomain() {},
};

test('settings render separate upload, removal and preview controls with the reduced limit', () => {
  const html = renderToStaticMarkup(React.createElement(general.GeneralTab, base));
  assert.match(html, /Site Logo/);
  assert.match(html, /Login Page Logo/);
  assert.match(html, /src="\/site.webp"/);
  assert.match(html, /src="\/login.webp"/);
  assert.match(html, /aria-label="Change site logo"/);
  assert.match(html, /aria-label="Remove login page logo"/);
  assert.match(html, /Maximum 200 KB/);
  assert.doesNotMatch(html, /2 MB/);
  assert.match(html, /sm:grid-cols-2/);
});

test('all login layouts use only the separate login image and honor explicit removal', () => {
  const contract = load('lib/sign-in-policy.ts', {});
  const tenant = '737f666b-916a-4e9c-91bd-b2bd37e475d1';
  const site = `/public/image/logos/${tenant}/${'a'.repeat(64)}.webp`;
  const login = `/public/image/logos/${tenant}/${'b'.repeat(64)}.webp`;
  let policy;
  const component = load('components/auth/login-page-content.tsx', {
    react: { ...React, useState: () => [true, () => {}], useEffect: () => {} },
    './recruitment-illustration': { RecruitmentIllustration: native('svg') },
    'next/link': native('a'),
    '@/components/auth/login-form': { __esModule: true, default: native('form') },
    '@/lib/app-brand': { APP_BRAND: { name: 'Example ATS', website: 'https://example.com' } },
    '@/lib/ats-api': { getApiBase: () => 'https://api.example.com' },
    '@/hooks/use-sign-in-policy': { useSignInPolicy: () => ({ data: policy }) },
    './login-page-skeleton': { __esModule: true, default: native('div') },
    './login-page.module.css': { __esModule: true, default: { page: 'page' } },
  }).default;
  for (const variant of contract.LOGIN_DESIGN_VARIANTS) {
    policy = { loginDesignVariant: variant, name: 'Example', logoUrl: site, loginLogoUrl: login };
    let html = renderToStaticMarkup(React.createElement(component, { initialWorkspace: true }));
    assert.ok(html.includes(login), variant);
    assert.ok(!html.includes(site), variant);
    policy.loginLogoUrl = '';
    html = renderToStaticMarkup(React.createElement(component, { initialWorkspace: true }));
    assert.ok(!html.includes(site) && !html.includes(login), `${variant}: removed`);
  }
});

if (process.env.LOGO_PREVIEW_OUTPUT) {
  (async () => {
    const html = renderToStaticMarkup(React.createElement(general.GeneralTab, { ...base, logoUrl: '', loginLogoUrl: '' }));
    const candidates = [...html.matchAll(/class="([^"]*)"/g)].flatMap(match => match[1].split(/\s+/));
    const { compile } = require('@tailwindcss/node');
    const compiler = await compile('@import "tailwindcss";', { base: path.join(__dirname, '..'), onDependency() {} });
    const css = compiler.build(candidates);
    fs.writeFileSync(process.env.LOGO_PREVIEW_OUTPUT, `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css} body{font-family:Arial,sans-serif;background:#f8fafc;padding:24px}button{cursor:pointer;border:1px solid #e2e8f0;border-radius:6px;padding:6px 12px}input:not([type=file]){border:1px solid #cbd5e1;border-radius:6px;padding:8px;width:100%}section>header,section>div{padding:20px}</style><h1 style="font-size:20px;font-weight:700;margin-bottom:20px">Tenant Settings — Implementation preview</h1>${html}`);
  })().catch(error => { console.error(error); process.exitCode = 1; });
}

test('upload and remove affect only their selected logo and oversized input is rejected', async () => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://workspace.example.com' });
  global.window = dom.window; global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.FileReader = class {
    readAsDataURL() { this.result = 'data:image/png;base64,example'; this.onload(); }
  };
  const calls = [];
  const { createRoot } = require('react-dom/client');
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(React.createElement(general.GeneralTab, {
      ...base, setLogoUrl: value => calls.push(['site', value]), setLoginLogoUrl: value => calls.push(['login', value]),
    })));
    const login = document.querySelector('input[aria-label="Choose login page logo"]');
    Object.defineProperty(login, 'files', { configurable: true, value: [new dom.window.File(['image'], 'logo.png', { type: 'image/png' })] });
    await React.act(async () => login.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
    assert.deepEqual(calls, [['login', 'data:image/png;base64,example']]);
    await React.act(async () => document.querySelector('button[aria-label="Remove login page logo"]').click());
    assert.deepEqual(calls[1], ['login', '']);
    const site = document.querySelector('input[aria-label="Choose site logo"]');
    Object.defineProperty(site, 'files', { value: [new dom.window.File([new Uint8Array(200 * 1024 + 1)], 'large.png', { type: 'image/png' })] });
    await React.act(async () => site.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
    assert.equal(calls.length, 2);
    assert.match(errors.at(-1), /200 KB/);
  } finally {
    await React.act(async () => root.unmount());
    dom.window.close();
    delete global.FileReader;
  }
});
