const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const pairs = [
  // Entries retain their original indices for existing script mapping.
  ['notifications/notification-preferences.ts', 'lib/notification-preferences.ts'],
  ['auth/tenant-branding-contract.ts', 'lib/tenant-branding-contract.ts'],
  ['auth/sign-in-policy.ts', 'lib/sign-in-policy.ts'],
  ['jobs/job-capabilities.ts', 'lib/job-capabilities.ts'],
  ['auth/job-access-grants.ts', 'lib/job-access-grants.ts'],
  ['auth/job-assignment-policy.ts', 'lib/job-assignment-policy.ts'],
  ['recruiter-submissions/submission-auto-approval.ts', 'lib/submission-auto-approval.ts'],
];
const scripts = ['sync-notification-preferences.cjs', 'sync-tenant-branding.cjs', 'sync-sign-in-policy.cjs', 'sync-job-access.cjs', 'sync-submission-auto-approval.cjs'];
function fixture(t, backend = false) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ats-contract-validation-'));
  t.after(() => {
    if (path.dirname(temp) !== path.resolve(os.tmpdir()) || !path.basename(temp).startsWith('ats-contract-validation-')) throw new Error('Unexpected cleanup path');
    fs.rmSync(temp, { recursive: true, force: true });
  });
  const frontend = path.join(temp, 'frontend');
  const root = path.resolve(__dirname, '..');
  for (const file of ['contracts.manifest.json', ...pairs.map(([, target]) => target), ...['contract-validation.cjs', ...scripts].map(name => `scripts/${name}`)]) {
    const target = path.join(frontend, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, file), target);
  }
  if (backend) for (const [source, target] of pairs) {
    const destination = path.join(temp, 'ats_backend/src', source);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(frontend, target), destination);
  }
  return { frontend, temp, run: (script, ...args) => spawnSync(process.execPath, [path.join(frontend, 'scripts', script), ...args], { encoding: 'utf8' }) };
}
test('all build checks succeed inside a frontend-only context', t => {
  const f = fixture(t);
  for (const script of scripts) assert.equal(f.run(script, '--check').status, 0);
});
test('each contract fails standalone validation when modified', t => {
  const f = fixture(t);
  pairs.forEach(([, target], i) => {
    const file = path.join(f.frontend, target), original = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, original + '// changed\n');
    const result = f.run(scripts[i === 6 ? 4 : Math.min(i, 3)], '--check');
    assert.notEqual(result.status, 0); assert.match(result.stderr, /checksum mismatch/);
    fs.writeFileSync(file, original);
  });
});
test('canonical checks require the backend instead of skipping absent sources', t => {
  const f = fixture(t);
  for (const script of scripts) {
    const result = f.run(script, '--check-backend');
    assert.notEqual(result.status, 0); assert.match(result.stderr, /Canonical backend contract missing/);
  }
});
test('canonical validation detects drift and synchronization updates its checksum', t => {
  const f = fixture(t, true);
  for (const script of scripts) assert.equal(f.run(script, '--check-backend').status, 0);
  fs.appendFileSync(path.join(f.temp, 'ats_backend/src/auth/sign-in-policy.ts'), '// new canonical policy\n');
  const changed = f.run(scripts[2], '--check-backend');
  assert.notEqual(changed.status, 0); assert.match(changed.stderr, /Canonical backend contract differs/);
  assert.equal(f.run(scripts[2]).status, 0);
  assert.equal(f.run(scripts[2], '--check').status, 0);
  assert.equal(f.run(scripts[2], '--check-backend').status, 0);
});
test('line endings do not cause cross-platform false failures', t => {
  const f = fixture(t, true);
  for (const [source, target] of pairs) {
    for (const file of [path.join(f.frontend, target), path.join(f.temp, 'ats_backend/src', source)]) fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\r?\n/g, '\r\n'));
  }
  for (const script of scripts) assert.equal(f.run(script, '--check-backend').status, 0);
});
test('incomplete manifest fails closed', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.frontend, 'contracts.manifest.json'), JSON.stringify({ version: 1, files: {} }));
  const result = f.run(scripts[0], '--check');
  assert.notEqual(result.status, 0); assert.match(result.stderr, /Invalid contract manifest/);
});
