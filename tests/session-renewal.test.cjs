const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { execFileSync } = require('node:child_process');

function load(file, imports, globals = {}) {
  const source = process.env.SESSION_BASELINE === '1' && file === 'auth.ts' ? execFileSync('git', ['show', `HEAD:${file}`], { cwd: path.join(__dirname, '..'), encoding: 'utf8' }) : fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('exports', 'require', ...Object.keys(globals), code)(module.exports, name => {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
    return imports[name];
  }, ...Object.values(globals));
  return module.exports;
}

function auth(activeRole = null, activeProfile = {}) {
  let config, now = 1000000, calls = 0, failure = 0;
  const fetch = async url => {
    calls++;
    if (failure) return new Response('{}', { status: failure });
    if (String(url).endsWith('/api/auth/me')) return new Response(JSON.stringify(activeProfile));
    return new Response(JSON.stringify({ accessToken: `access-${calls}`, refreshToken: `refresh-${calls}`, expiresIn: 300 }));
  };
  const provider = options => options;
  load('auth.ts', {
    'next-auth': options => { config = options; return {}; },
    'next-auth/providers/credentials': provider, 'next-auth/providers/github': provider,
    'next-auth/providers/google': provider, 'next-auth/providers/keycloak': provider,
    zod: {}, './lib/zod': {}, 'next/headers': { cookies: async () => ({ get: () => activeRole ? { value: activeRole } : undefined }) }, './lib/sso-error': {}, './utils/subdomain-helper': {},
    './lib/dashboard-preference': { dashboardPreferenceCookie: () => activeRole ? 'role-cookie' : null },
  }, { fetch, Date: { now: () => now }, console: { log() {}, warn() {}, error() {} } });
  return { config, advance: ms => { now += ms; }, fail: status => { failure = status; }, get calls() { return calls; } };
}

async function login(app) {
  const user = await app.config.providers[0].authorize({ token: 'initial', refreshToken: 'refresh-initial', expiresIn: '300', userJson: JSON.stringify({ id: 'user', email: 'user@example.test' }) });
  return app.config.callbacks.jwt({ token: {}, user });
}

test('password handoff retains refresh credentials and the real five-minute expiry', async () => {
  const app = auth(), token = await login(app);
  assert.equal(token.refreshToken, 'refresh-initial');
  assert.equal(token.accessTokenExpiry, 1300000);
});

test('simulates ten hours of renewal without waiting; idle and absolute limits remain authoritative', async () => {
  const app = auth(); let token = await login(app);
  for (let minutes = 2; minutes < 600; minutes += 2) {
    app.advance(120000);
    token = await app.config.callbacks.jwt({ token });
    assert.equal(token.error, undefined);
  }
  assert.equal(app.calls, 149);
  app.advance(120000); app.fail(401);
  token = await app.config.callbacks.jwt({ token });
  assert.equal(token.error, 'RefreshAccessTokenError');
  const idle = auth(); let idleToken = await login(idle);
  idle.advance(31 * 60000); idle.fail(401);
  idleToken = await idle.config.callbacks.jwt({ token: idleToken });
  assert.equal(idleToken.error, 'RefreshAccessTokenError');
});

test('temporary renewal outage preserves credentials and recovers after access expiry', async () => {
  const app = auth(); let token = await login(app);
  app.advance(6 * 60000); app.fail(503);
  token = await app.config.callbacks.jwt({ token });
  assert.equal(token.error, 'SessionRenewalUnavailable');
  assert.equal(token.refreshToken, 'refresh-initial');
  app.fail(0);
  token = await app.config.callbacks.jwt({ token });
  assert.equal(token.error, undefined);
  assert.equal(token.refreshToken, 'refresh-2');
});

function api(respond, activeRole = null) {
  const storage = new Map([['ats_refresh_token', 'valid-refresh']]);
  const browser = { location: { hostname: 'tenant.example.test', protocol: 'https:', pathname: '/dashboard', href: '' } };
  const localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const exports = load('lib/ats-api.ts', { '@/utils/subdomain-helper': { getBaseDomain: () => 'example.test', getTenantIdentifier: () => 'tenant' }, './dashboard-preference': { getSavedDashboardRole: () => activeRole } }, {
    window: browser, localStorage, navigator: {}, fetch: respond, console: { error() {}, warn() {} },
  });
  return { api: exports.atsApi, storage, browser, activeRoleHeaders: exports.activeRoleHeaders };
}

test('session consumers receive only the switched role permissions', async () => {
  const app = auth('11111111-1111-4111-8111-111111111111', {
    permissions: ['unit_admin:manage'], roles: ['UNIT_ADMIN'], systemRole: 'UNIT_ADMIN', businessUnitId: 'unit',
  });
  const token = await login(app);
  token.permissions = ['tenant:settings'];
  token.roles = ['TENANT_ADMIN'];
  const session = await app.config.callbacks.session({ session: { user: {} }, token });
  assert.deepEqual(session.user.permissions, ['unit_admin:manage']);
  assert.deepEqual(session.user.roles, ['UNIT_ADMIN']);
  assert.equal(session.user.businessUnitId, 'unit');
});

test('failed selected-role verification does not restore primary administrator access', async () => {
  const app = auth('11111111-1111-4111-8111-111111111111');
  const token = await login(app);
  token.permissions = ['tenant:settings'];
  token.roles = ['TENANT_ADMIN'];
  app.fail(403);
  const session = await app.config.callbacks.session({ session: { user: {} }, token });
  assert.deepEqual(session.user.permissions, []);
  assert.deepEqual(session.user.roles, []);
});

test('API requests use the exact selected role ID and do not forward legacy role names', () => {
  const roleId = '11111111-1111-4111-8111-111111111111';
  assert.deepEqual(api(async () => {}, roleId).activeRoleHeaders(), { 'x-active-role-id': roleId });
  assert.deepEqual(api(async () => {}, 'Tenant Admin').activeRoleHeaders(), {});
});

test('concurrent API calls share one refresh; outage settles all callers and keeps credentials', async () => {
  let calls = 0;
  const app = api(async () => { calls++; await new Promise(resolve => setImmediate(resolve)); return new Response('{}', { status: 503 }); });
  const results = await Promise.allSettled([app.api.auth.me(), app.api.auth.me(), app.api.auth.me()]);
  assert.equal(calls, 1);
  assert.ok(results.every(r => r.status === 'rejected'));
  assert.equal(app.storage.get('ats_refresh_token'), 'valid-refresh');
  assert.equal(app.browser.location.href, '');
});

test('expired NextAuth access during outage does not redirect to login', async () => {
  const app = api(async url => {
    assert.equal(url, '/api/auth/session');
    return new Response(JSON.stringify({ error: 'SessionRenewalUnavailable', user: { accessToken: 'expired' } }));
  });
  app.storage.delete('ats_refresh_token');
  await assert.rejects(app.api.auth.me(), /temporarily unavailable/);
  assert.equal(app.browser.location.href, '');
});

test('session endpoint failures keep the user on the page instead of treating them as logged out', async () => {
  for (const status of [503, 'network']) {
    const app = api(async () => {
      if (status === 'network') throw new Error('Network unavailable');
      return new Response('{}', { status });
    });
    app.storage.delete('ats_refresh_token');
    await assert.rejects(app.api.auth.me(), /temporarily unavailable/);
    assert.equal(app.browser.location.href, '');
  }
});

test('workspace handoff encrypts credentials, rejects other workspaces, and consumes its cookie', async () => {
  const jwt = await import('next-auth/jwt');
  const env = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = 'test-secret-that-is-long-enough-for-encryption';
  const cookies = new Map(); let issued;
  class Reply extends Response {
    constructor(body, options) { super(body, options); this.cookies = { set: (name, value, options) => { issued = { name, value, options }; cookies.set(name, value); } }; }
    static json(data, options = {}) { return new Reply(JSON.stringify(data), options); }
  }
  const helpers = { getBaseDomain: () => 'example.test', getCurrentSubdomain: host => host.split('.')[0] };
  const routes = load('app/api/auth/handoff/route.ts', {
    'next/server': { NextResponse: Reply }, 'next-auth/jwt': jwt,
    '@/lib/ats-api': { getApiBase: () => 'https://api.example.test' }, '@/utils/subdomain-helper': helpers,
  }, { fetch: async url => new Response(JSON.stringify(url.endsWith('/refresh')
    ? { accessToken: 'renewed-access', refreshToken: 'rotated-refresh', expiresIn: 300 }
    : { id: 'user', tenantDomain: 'workspace' })) });
  const request = (host, body) => ({ headers: new Headers({ host, origin: `https://${host}` }), nextUrl: new URL(`https://${host}/api/auth/handoff`), json: async () => body, cookies: { get: name => ({ value: cookies.get(name) }) } });
  try {
    const result = await routes.POST(request('example.test', { accessToken: 'access', refreshToken: 'private-refresh', destination: 'workspace' }));
    assert.equal(result.status, 200);
    assert.equal(issued.options.httpOnly, true);
    assert.equal(issued.options.maxAge, 30);
    assert.ok(!issued.value.includes('private-refresh'));
    const decoded = await jwt.decode({ secret: process.env.AUTH_SECRET, salt: issued.name, token: issued.value });
    assert.equal(decoded.refreshToken, 'private-refresh');
    assert.equal((await routes.GET(request('other.example.test'))).status, 401);
    const completed = await routes.GET(request('workspace.example.test'));
    assert.equal(completed.status, 200);
    assert.equal((await completed.json()).refreshToken, 'rotated-refresh');
    assert.equal(issued.options.maxAge, 0);
    assert.equal((await routes.GET(request('workspace.example.test'))).status, 401);
    assert.equal((await routes.POST(request('example.test', { accessToken: 'access', refreshToken: 'private', destination: 'other' }))).status, 403);
  } finally { if (env === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = env; }
});

test('full role catalog preserves explicit ALL scope over the active branch', async () => {
  let sent;
  const app = api(async (url, options) => { sent = options.headers; return new Response('[]'); });
  app.storage.set('ats_token', 'valid-token');
  app.storage.set('active_branch_id', 'branch-id');
  await app.api.auth.listRoles('ALL', true);
  assert.equal(sent['x-branch-id'], 'ALL');
});

test('job staffing uses the scoped jobs endpoint and exact active role without requesting user management', async () => {
  const calls = [];
  const role = '11111111-1111-4111-8111-111111111111';
  const staff = [{ id: 'recruiter-id', fullName: 'Recruiter', canRecruit: true, canReview: false }];
  const app = api(async (url, options) => {
    calls.push({ url: String(url), headers: options.headers });
    return new Response(JSON.stringify(staff));
  }, role);
  app.storage.set('ats_token', 'valid-token');
  app.storage.set('ats_access_token', `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`);
  app.storage.set('ats_current_user', JSON.stringify({ id: 'user', tenantId: 'tenant', permissions: ['job:assign_recruiter'] }));
  assert.deepEqual(await app.api.jobs.staffingOptions({ branchId: 'branch-id', businessUnitId: 'unit-id' }), staff);
  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/api/jobs/staffing-options');
  assert.equal(url.searchParams.get('branchId'), 'branch-id');
  assert.equal(url.searchParams.get('businessUnitId'), 'unit-id');
  assert.equal(calls[0].headers['x-active-role-id'], role);
  calls.length = 0;
  const scope = { branchId: 'branch-id', businessUnitId: 'unit-id' };
  await Promise.all([app.api.jobs.staffingOptions(scope), app.api.jobs.staffingOptions(scope)]);
  assert.equal(calls.length, 1, 'Concurrent staffing lookups share one request');
  await app.api.jobs.staffingOptions(scope);
  assert.equal(calls.length, 2, 'Completed staffing results are refreshed to respect changed assignments');
});
