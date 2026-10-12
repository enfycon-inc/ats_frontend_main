const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function mount({ permission = true, fail = false, pending = false } = {}) {
  const hooks = []; let cursor = 0; const calls = [], updates = [];
  let resolveSend;
  const react = { useState(value) { const index = cursor++; if (!(index in hooks)) hooks[index] = value; return [hooks[index], value => { hooks[index] = value; }]; }, useRef(value) { const index = cursor++; return hooks[index] ||= { current: value }; }, useEffect() {}, useMemo(fn) { return fn(); } };
  const jsx = (type, props) => ({ type, props });
  const source = fs.readFileSync(path.join(__dirname, '../app/(dashboard)/dashboard/components/account-manager-dashboard-view.tsx'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const status = require('./status-fixture.cjs');
  new Function('exports', 'require', code)(module.exports, name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === '@/lib/job-status-contract') return status;
    if (name === '@/lib/ats-api') return { atsApi: { jobs: { changeStatus: (...args) => { calls.push(args); if (fail) return Promise.reject(new Error('Job changed')); return new Promise(resolve => { resolveSend = resolve; }); } } } };
    if (name === 'next/dynamic') return () => 'Chart';
    if (name === 'react-hot-toast') return { success() {} };
    if (name === '@/lib/utils') return { cn: (...args) => args.join(' ') };
    return new Proxy({}, { get: (_, key) => String(key) });
  });
  const job = { id: 'job-one', jobCode: 'JOB-001', jobStatus: pending ? 'Pending Approval' : 'Active' };
  function render() { cursor = 0; return module.exports.default({ profile: { permissions: permission ? ['job:view','job:edit'] : ['job:view'] }, jobs: [job], activeJobs: [job], highPriorityJobs: [], onUpdateJob: async (...args) => { updates.push(args); } }); }
  function find(tree, predicate) { if (!tree || typeof tree !== 'object') return null; if (predicate(tree)) return tree; for (const value of Object.values(tree.props || {})) { for (const child of Array.isArray(value) ? value.flat(Infinity) : [value]) { const found = find(child, predicate); if (found) return found; } } return null; }
  return { render, calls, updates, resolve: () => resolveSend({ status: 'On Hold' }), modal: () => find(render(), n => n.type === 'JobStatusModal'), badge: () => find(render(), n => typeof n.type === 'function' && n.type.name === 'DashboardJobStatusBadge') };
}

test('opening and cancelling do not save; confirmation saves once and updates only after acceptance', async () => {
  const view = mount(); view.badge().props.onClick(); assert.equal(view.calls.length, 0);
  view.modal().props.onClose(); assert.equal(view.calls.length, 0); assert.equal(view.modal().props.job, null);
  view.badge().props.onClick(); view.modal().props.onStatusValueChange('On Hold');
  const saving = view.modal().props.onConfirm(); await view.modal().props.onConfirm();
  assert.equal(view.calls.length, 1); assert.equal(view.updates.length, 0);
  assert.deepEqual(view.calls[0], ['job-one', { status: 'On Hold', expectedStatus: 'Active' }]);
  view.resolve(); await saving;
  assert.deepEqual(view.updates[0], ['job-one', { jobStatus: 'On Hold', _alreadySaved: true }]);
  assert.equal(view.modal().props.job, null);
});
test('failure keeps the modal open and leaves the displayed status unchanged', async () => {
  const view = mount({ fail: true }); view.badge().props.onClick(); view.modal().props.onStatusValueChange('On Hold'); await view.modal().props.onConfirm();
  assert.equal(view.modal().props.error, 'Job changed'); assert.ok(view.modal().props.job); assert.equal(view.updates.length, 0);
});
test('read-only and pending jobs cannot open the editor', () => {
  for (const options of [{ permission: false }, { pending: true }]) { const view = mount(options); assert.equal(view.badge().props.disabled, true); view.badge().props.onClick(); assert.equal(view.modal().props.job, null); }
});
