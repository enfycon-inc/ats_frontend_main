const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, deps = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'exports', js)(name => { assert.ok(name in deps, name); return deps[name]; }, exports);
  return exports;
}
const formLogic = load('lib/user-review-form.ts');
const user = { id: 'request', kind: 'user', fullName: 'Test User', email: 'user@example.test', requestedRole: 'Recruiter',
  requestedRoleId: 'role', requestVersion: 'current-version', branchId: 'branch', businessUnitId: 'unit' };
function mount(mutate) {
  const slots = []; let cursor = 0; let effects = []; const calls = []; let closed = 0; let changed = 0;
  const state = initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
    return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; };
  const jsx = (type, props) => ({ type, props });
  const component = load('components/users/pending-user-review.tsx', {
    react: { useState: state, useRef: initial => { const i = cursor++; return slots[i] ||= { current: initial }; }, useEffect: fn => effects.push(fn) },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    swr: { __esModule: true, default: key => ({ data: key?.[0] === 'pending-user-review-options'
      ? { branches: [{ id: 'branch' }], units: [{ id: 'unit' }], roles: [{ id: 'role', name: 'Recruiter', branchId: 'branch', businessUnitId: 'unit', permissions: [] }] }
      : { ...user, roleId: 'role' } }) },
    'react-hot-toast': { __esModule: true, default: { success() {}, error() {} } },
    '@/lib/ats-api': { atsApi: { auth: {
      approveUser: async (...args) => { calls.push(['approve', ...args]); return mutate?.(); },
      rejectUser: async (...args) => { calls.push(['reject', ...args]); return mutate?.(); },
    } } },
    '@/lib/pod-lead-role-policy': { isAutomaticPodLeadRole: () => false },
    './role-request-review-modal': { RoleRequestReviewModal: 'review-modal' },
    '@/lib/user-review-form': formLogic,
  }).PendingUserReview;
  const render = () => { cursor = 0; effects = []; const node = component({ user, scope: 'tenant:unit', profile: {},
    permissions: ['user:manage', 'tenant:manage'], onClose: () => closed++, onChanged: () => changed++ }); effects.forEach(fn => fn()); return node; };
  render();
  return { render, calls, counts: () => ({ closed, changed }) };
}
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  return node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
}
const modal = node => nodes(node).find(n => n.type === 'review-modal');
const tick = () => new Promise(resolve => setImmediate(resolve));

test('Review opens in place; cancel is read-only; approval sends version and prevents double submission', async () => {
  let finish;
  const flow = mount(() => new Promise(resolve => { finish = resolve; }));
  const review = modal(flow.render());
  assert.ok(review);
  assert.equal(flow.calls.length, 0);
  review.props.onApprove(); review.props.onApprove();
  assert.equal(flow.calls.length, 1);
  assert.equal(flow.calls[0][2].expectedRequestVersion, user.requestVersion);
  assert.deepEqual(flow.calls[0][2].roleIds, ['role']);
  finish({}); await tick();
  assert.deepEqual(flow.counts(), { closed: 1, changed: 1 });
  const cancel = mount(); modal(cancel.render()).props.onClose();
  assert.equal(cancel.calls.length, 0);
});
test('rejection requires confirmation and sends the current request version', async () => {
  const flow = mount(); modal(flow.render()).props.onReject();
  assert.equal(flow.calls.length, 0);
  const confirmation = flow.render();
  assert.ok(nodes(confirmation).some(n => n.props?.role === 'alertdialog'));
  nodes(confirmation).find(n => n.type === 'button' && n.props.children === 'Reject Request').props.onClick();
  await tick();
  assert.deepEqual(flow.calls, [['reject', user.id, user.requestVersion]]);
  assert.deepEqual(flow.counts(), { closed: 1, changed: 1 });
});
test('a stale decision keeps the review open with its error and does not refresh as success', async () => {
  const flow = mount(() => { throw new Error('This request has changed. Refresh to review it again.'); });
  modal(flow.render()).props.onApprove(); await tick();
  assert.match(modal(flow.render()).props.error, /request has changed/);
  assert.deepEqual(flow.counts(), { closed: 0, changed: 0 });
});
