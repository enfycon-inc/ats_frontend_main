const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  new Function('exports', 'require', code)(module.exports, name => {
    assert.ok(name in imports, `Unexpected import ${name}`);
    return imports[name];
  });
  return module.exports;
}
const entry = load('lib/login-entry.ts', {});
function page(file, session) {
  return load(file, {
    '@/auth': { auth: async () => { if (session instanceof Error) throw session; return session; } },
    'next/navigation': { redirect: target => { throw new Error(`redirect:${target}`); } },
    '@/lib/login-entry': entry,
    '@/components/auth/login-page-content': { default: 'login-content' },
    'react/jsx-runtime': { jsx: type => ({ type }) },
  }).default;
}

test('authenticated root redirects before rendering login', async () => {
  await assert.rejects(page('app/page.tsx', { user: { tenantDomain: 'enfycon' } })(), /redirect:\/dashboard/);
});
test('anonymous, expired, and unreadable sessions go to login at root', async () => {
  for (const session of [null, {}, { user: {}, error: 'RefreshAccessTokenError' }, new Error('unavailable')]) {
    await assert.rejects(page('app/page.tsx', session)(), /redirect:\/auth\/login/);
  }
});
test('direct login redirects usable sessions before mounting the form', async () => {
  await assert.rejects(page('app/auth/login/page.tsx', { user: {} })({ searchParams: Promise.resolve({}) }), /redirect:\/dashboard/);
});
test('anonymous and failed sessions can render login', async () => {
  for (const session of [null, { user: {}, error: 'RefreshAccessTokenError' }, new Error('unavailable')]) {
    assert.equal((await page('app/auth/login/page.tsx', session)({ searchParams: Promise.resolve({}) })).type, 'login-content');
  }
});
test('SSO transfer, expiry, and error flows preserve login processing despite existing cookies', async () => {
  for (const params of [{ handoff: 'true' }, { token: 'transfer' }, { expired: 'true' }, { error: 'AccessDenied' }, { handoff: ['true'] }]) {
    assert.equal((await page('app/auth/login/page.tsx', { user: {} })({ searchParams: Promise.resolve(params) })).type, 'login-content');
  }
});
test('unrelated query parameters do not override authenticated entry routing', async () => {
  await assert.rejects(page('app/auth/login/page.tsx', { user: {} })({ searchParams: Promise.resolve({ callbackUrl: 'https://evil.example', expired: 'false' }) }), /redirect:\/dashboard/);
});
