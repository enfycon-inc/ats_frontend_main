const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function loadNotifier(calls) {
  const mod = { exports: {} };
  const toast = { success: message => calls.push(['success', message]), error: message => calls.push(['error', message]) };
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync('lib/email-notification.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports, name => {
    assert.equal(name, 'react-hot-toast'); return { default: toast };
  });
  return mod.exports;
}
test('saved account emits exactly one result for accepted, disabled, missing and failed email outcomes', () => {
  for (const status of ['accepted', 'disabled', undefined, 'failed']) {
    const calls = [];
    loadNotifier(calls).notifyAccountSaved(status ? { emailNotification: { status } } : {}, 'Member created.');
    assert.equal(calls.length, 1);
    assert.match(calls[0][1], /Member created\./);
    assert.equal(calls[0][0], status === 'failed' ? 'error' : 'success');
    if (status === 'failed') assert.match(calls[0][1], /email could not be sent/);
  }
});
test('email provider warning is retained in the single action result', () => {
  const calls = [];
  loadNotifier(calls).notifyAccountSaved({ emailNotification: { status: 'failed', message: 'Provider unavailable.' } }, 'Workspace activated.');
  assert.deepEqual(calls, [['error', 'Workspace activated. Provider unavailable.']]);
});
test('separate actions each produce their own result', () => {
  const calls = []; const notifier = loadNotifier(calls);
  notifier.notifyAccountSaved({}, 'Member created.'); notifier.notifyAccountSaved({}, 'Member created.');
  assert.equal(calls.length, 2);
});
test('automatic job refresh stays silent while explicit refresh owns its confirmation', () => {
  const dashboard = fs.readFileSync('app/(dashboard)/job-posting/components/job-posting-dashboard.tsx', 'utf8');
  const table = fs.readFileSync('app/(dashboard)/job-posting/components/data-table.tsx', 'utf8');
  assert.doesNotMatch(dashboard, /toast.success\("Jobs list reloaded/);
  assert.match(table, /onClick=\{\(\) => \{ onRefresh\(\); toast.success\("Jobs list reloaded/);
  for (const status of ['APPROVED', 'REJECTED']) assert.match(table, new RegExp('approvalStatus: "' + status + '"[\\s\\S]{0,120}_alreadySaved: true'));
});
