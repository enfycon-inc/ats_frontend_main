const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function client(respond, permissions) {
  const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
  const storage = new Map([
    ['ats_access_token', token],
    ['ats_current_user', JSON.stringify({ permissions })],
  ]);
  const calls = [];
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/ats-api.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const imports = {
    '@/utils/subdomain-helper': { getTenantIdentifier: () => 'workspace', getBaseDomain: () => 'example.test' },
    './dashboard-preference': { getSavedDashboardRole: () => '12345678-1234-1234-1234-123456789abc' },
  };
  new Function('exports', 'require', 'window', 'localStorage', 'fetch', code)(
    module.exports, name => { assert.ok(name in imports, name); return imports[name]; },
    { location: { hostname: 'workspace.example.test', protocol: 'https:' } },
    { getItem: key => storage.get(key) || null },
    async (url, options) => { calls.push({ url, options }); return respond(); },
  );
  return { download: module.exports.atsApi.candidates.fetchResumeBlob, calls, token };
}

for (const permissions of [['candidate:download_resume'], ['candidate:view', 'submission:internal_screening'], []]) {
  test(`server decides candidate download access for ${JSON.stringify(permissions)}`, async () => {
    const app = client(() => new Response('original-bytes', { headers: { 'Content-Type': 'application/pdf' } }), permissions);
    const blob = await app.download('candidate-id');
    assert.equal(await blob.text(), 'original-bytes');
    assert.equal(blob.type, 'application/pdf');
    assert.equal(app.calls.length, 1);
    assert.match(app.calls[0].url, /\/api\/candidates\/candidate-id\/resume$/);
    assert.equal(app.calls[0].options.headers.Authorization, `Bearer ${app.token}`);
    assert.ok(Object.values(app.calls[0].options.headers).includes('12345678-1234-1234-1234-123456789abc'));
  });
}

for (const [status, message] of [[401, /session has expired/], [403, /do not have access/], [404, /No original resume/], [503, /temporarily unavailable/], [500, /Please retry later/]]) {
  test(`download ${status} produces a safe actionable error`, async () => {
    const app = client(() => new Response('private server details', { status }), ['submission:internal_screening']);
    await assert.rejects(app.download('candidate-id'), message);
    assert.equal(app.calls.length, 1);
  });
}

test('network failure offers a connection retry', async () => {
  const app = client(() => { throw new TypeError('Failed to fetch'); }, []);
  await assert.rejects(app.download('candidate-id'), /Check your connection/);
});

