const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function client(respond, stale = false) {
  const storage = new Map(stale ? [['ats_refresh_token', 'old-refresh'], ['ats_current_user', '{"id":"previous-user"}']] : []);
  const browser = { location: { hostname: 'workspace.example.test', protocol: 'https:', pathname: '/auth/login', href: '' }, dispatchEvent() {} };
  const calls = [];
  const localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/ats-api.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText + '\nexports.testRequest = apiFetch;';
  const module = {exports:{}};
  const imports = {
    '@/utils/subdomain-helper': { getTenantIdentifier: () => 'workspace', getBaseDomain: () => 'example.test' },
    './dashboard-preference': { getSavedDashboardRole: () => null },
  };
  new Function('exports', 'require', 'window', 'localStorage', 'navigator', 'fetch', 'CustomEvent', code)(
    module.exports, name => { assert.ok(name in imports, `Unexpected import ${name}`); return imports[name]; },
    browser, localStorage, {}, async (url, options) => { calls.push({url,options}); return respond(url, options); }, class CustomEvent {},
  );
  return { api:module.exports.atsApi, request:module.exports.testRequest, storage, browser, calls };
}
for (const developer of [false, true]) {
  const label = developer ? 'developer' : 'normal';
  const endpoint = developer ? '/api/auth/developer-login' : '/api/auth/login';
  test(`${label} rejected anonymous login preserves the authentication error without session recovery`, async () => {
    const message = 'Developer sign-in is unavailable or credentials are invalid.';
    const app = client(async url => new Response(JSON.stringify(url === '/api/auth/session' ? {} : {message}), {status:url === '/api/auth/session' ? 200 : 401}));
    await assert.rejects(app.api.auth.login('user@example.test','invalid',false,developer), {message});
    assert.deepEqual(app.calls.map(call => call.url), [`https://api.example.test${endpoint}`]);
    assert.equal(app.browser.location.href, '');
  });
  test(`${label} login ignores stale session renewal credentials`, async () => {
    const app = client(async () => new Response(JSON.stringify({message:'Invalid email or password.'}), {status:401}), true);
    const previousAccess = `header.${Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.signature`;
    app.storage.set('ats_access_token',previousAccess);
    await assert.rejects(app.api.auth.login('user@example.test','invalid',false,developer), {message:'Invalid email or password.'});
    assert.equal(app.calls.length, 1);
    assert.equal(app.storage.get('ats_refresh_token'), 'old-refresh');
    assert.equal(app.storage.get('ats_current_user'), '{"id":"previous-user"}');
    assert.equal(app.storage.get('ats_access_token'),previousAccess);
    assert.equal(app.calls[0].options.headers.Authorization,undefined);
    assert.equal(app.browser.location.href, '');
  });
  test(`${label} successful login establishes the returned credentials`, async () => {
    const data = {accessToken:'new-access',refreshToken:'new-refresh',expiresIn:300,user:{id:'user',tenantId:'tenant'}};
    const app = client(async () => new Response(JSON.stringify(data)), true);
    assert.deepEqual(await app.api.auth.login('user@example.test','valid',false,developer), data);
    assert.equal(app.calls.length,1);
    assert.equal(app.calls[0].url,`https://api.example.test${endpoint}`);
    assert.equal(app.storage.get('ats_access_token'),'new-access');
    assert.equal(app.storage.get('ats_refresh_token'),'new-refresh');
  });
}
test('developer login preserves service errors and does not attempt refresh during an outage', async () => {
  const app = client(async () => new Response(JSON.stringify({message:'Sign-in is temporarily unavailable.'}), {status:503}), true);
  await assert.rejects(app.api.auth.login('user@example.test','valid',false,true), {message:'Sign-in is temporarily unavailable.'});
  assert.equal(app.calls.length,1);
  assert.equal(app.storage.get('ats_refresh_token'),'old-refresh');
});
test('protected requests still clear rejected sessions and redirect to login', async () => {
  const app = client(async url => new Response(JSON.stringify(url === '/api/auth/session' ? {} : {message:'Unauthorized'}), {status:url === '/api/auth/session' ? 200 : 401}));
  app.browser.location.pathname='/dashboard';
  await assert.rejects(app.api.auth.me(), {message:'Your session has expired. Please sign in again.'});
  assert.equal(app.browser.location.href,'/auth/login?expired=true');
  assert.ok(app.calls.some(call => call.url === '/api/auth/session'));
});
test('credential login classification accepts query strings but requires exact POST endpoints', async () => {
  const respond = async url => new Response(JSON.stringify(url === '/api/auth/session' ? {} : {message:'Denied'}), {status:url === '/api/auth/session' ? 200 : 401});
  const publicLogin = client(respond);
  await assert.rejects(publicLogin.request('/api/auth/developer-login?source=login',{method:'POST'}),{message:'Denied'});
  assert.equal(publicLogin.calls.length,1);
  for (const [pathname,method] of [['/api/auth/developer-login/audit','POST'],['/api/auth/login-sessions','POST'],['/api/auth/developer-login','GET']]) {
    const protectedRequest = client(respond);
    protectedRequest.browser.location.pathname='/dashboard';
    await assert.rejects(protectedRequest.request(pathname,{method}),{message:'Your session has expired. Please sign in again.'});
    assert.equal(protectedRequest.browser.location.href,'/auth/login?expired=true');
  }
});
test('developer login network failures do not attempt recovery using a previous session', async () => {
  const app = client(async () => { throw new TypeError('fetch failed'); },true);
  await assert.rejects(app.api.auth.login('user@example.test','valid',false,true),/Unable to reach the backend service/);
  assert.equal(app.calls.length,1);
  assert.equal(app.storage.get('ats_refresh_token'),'old-refresh');
});
