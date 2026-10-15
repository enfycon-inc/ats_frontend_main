const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
function load(relative, mocks = {}, cache = new Map()) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} }; cache.set(filename, mod);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  function localRequire(id) {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(path.dirname(filename), id);
      const file = [base, base + '.ts', base + '.tsx', path.join(base, 'index.tsx')].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (file) return load(path.relative(root, file), mocks, cache);
    }
    return require(id);
  }
  new Function('require', 'module', 'exports', output)(localRequire, mod, mod.exports);
  return mod.exports;
}
const presentation = load('lib/delivery-dashboard-presentation.ts');
const pipeline = { total: 20, review: 0, l1: 8, l2: 5, l3: 2, final: 3, closed: 2, decision: 1, selected: 0, offers: 1, joined: 1, scheduled: 2, rounds: Object.fromEntries(['l1', 'l2', 'l3'].map(round => [round, { pending: 1, scheduled: 1, feedback: 0, cancelled: 0 }])) };
function fixture(overrides = {}) {
  return { unit: { id: 'unit', name: 'India Staffing', branchName: 'Kolkata' }, activeJobs: 4, submissionRequired: 50, pipeline, jobs: [], pendingUsers: [], pendingUserTotal: 0, pendingUserPage: 1, pods: [], submissions: [], submissionTotal: 0, submissionPage: 1, stage: 'all', interviews: [], ...overrides };
}
function renderDashboard(data, permissions = ['submission:internal_screening', 'job:create', 'candidate:view', 'user:manage']) {
  const mocks = {
    '@/contexts/DashboardContext': { useDashboardContext: () => ({ profile: { id: 'actor', tenantId: 'tenant', branchId: 'branch', businessUnitId: 'unit', permissions }, selection: { active: { id: 'role' } } }) },
    '@/lib/ats-api': { atsApi: {} },
    '@/components/submissions/review-workspace': { ReviewWorkspace: () => null },
    swr: { __esModule: true, default: () => ({ data, isLoading: false, isValidating: false, mutate: () => {} }) },
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
  };
  const View = load('app/(dashboard)/dashboard/components/delivery-head-dashboard-view.tsx', mocks).default;
  return renderToStaticMarkup(React.createElement(View));
}
module.exports = { load, fixture, renderDashboard };
test('zero approvals hide approval controls and default to all submissions', () => {
  const html = renderDashboard(fixture());
  assert.doesNotMatch(html, /Awaiting approval|awaits approval|Review submissions|Internal review/);
  assert.match(html, /All submissions/); assert.match(html, /Current stage distribution/);
});
test('positive approvals show the exact count and review actions', () => {
  const html = renderDashboard(fixture({ pipeline: { ...pipeline, review: 3, total: 23 } }));
  assert.match(html, /3 submissions await/); assert.match(html, /Review submissions/); assert.match(html, /Awaiting approval 3/);
});
test('without screening permission, approval controls stay hidden', () => {
  const html = renderDashboard(fixture({ pipeline: { ...pipeline, review: 3, total: 23 } }), ['job:view']);
  assert.doesNotMatch(html, /Awaiting approval|Review submissions|Internal review/); assert.match(html, /Other submissions/);
});
test('last-review selection recovers; unavailable counts are not treated as zero', () => {
  assert.equal(presentation.visibleDeliveryStage('review', pipeline, true), 'all');
  assert.equal(presentation.visibleDeliveryStage('review', { ...pipeline, review: 1 }, true), 'review');
  assert.equal(presentation.visibleDeliveryStage('review', undefined, true), 'review');
  assert.equal(presentation.visibleDeliveryStage('review', null, false), 'all');
  assert.equal(presentation.hasPendingDeliveryReview(undefined, true), false);
});
test('labels remain exactly L1, L2, L3 and Final', () => {
  assert.deepEqual(['l1', 'l2', 'l3', 'final'].map(stage => presentation.deliveryStageLabels[stage]), ['L1', 'L2', 'L3', 'Final']);
  assert.doesNotMatch(renderDashboard(fixture()), /Technical|Manager\)|Screening\)|Final \(HR/);
});
test('empty and restricted dashboards have no invalid percentages or unauthorized sections', () => {
  assert.equal(presentation.stageShare(0, 0), 0);
  const html = renderDashboard(fixture({ pipeline: { ...pipeline, total: 0, l1: 0, l2: 0, l3: 0, final: 0, closed: 0 } }));
  assert.match(html, /No submissions yet/); assert.doesNotMatch(html, /NaN|Infinity/);
  assert.doesNotMatch(renderDashboard(fixture({ pipeline: null, pendingUsers: null, pods: null, activeJobs: null, interviews: null }), []), /Current stage distribution|Review submissions|Pending user requests/);
});
test('old stage rows stay hidden while the selected stage loads', () => {
  const html = renderDashboard(fixture({ stage: 'l2', submissions: [{ id: 'old', candidateName: 'STALE PERSON', jobTitle: 'Old Job', finalStatus: 'SUBMITTED', updatedAt: '' }] }));
  assert.doesNotMatch(html, /STALE PERSON|Old Job/); assert.match(html, /Loading submissions/);
});

test('total submissions show done against required across unit jobs', () => {
  const html = renderDashboard(fixture({ submissionRequired: 50 }));
  assert.match(html, /40% of required submissions/);
  assert.doesNotMatch(html, /100% of submissions/);
  assert.equal(presentation.submissionCoverage(20, 50), 40);
  assert.equal(presentation.submissionCoverage(0, 0), null);
  assert.equal(presentation.submissionCoverage(20, null), null);
  assert.equal(presentation.submissionCoverage(60, 50), 120);
  assert.match(renderDashboard(fixture({ submissionRequired: 0 })), /No submission target/);
});

test('pending user requests replace account controls and stay beneath the interview list', () => {
  const html = renderDashboard(fixture({ pendingUsers: [{ id: 'pending-user', fullName: 'Pending Person', email: 'pending@example.test', requestedRole: 'Recruiter' }], pendingUserTotal: 1 }));
  assert.match(html, /Pending user requests/);
  assert.match(html, /requestId=pending-user/);
  assert.doesNotMatch(html, /Deactivate|Activate|Unit user management/);
  assert.match(html, /Next 10 interviews/);
  assert.ok(html.indexOf('Upcoming interviews') < html.indexOf('Pending user requests'));
  assert.match(html, /space-y-3[^>]*data-delivery-schedule-column/);
  assert.doesNotMatch(renderDashboard(fixture()), /Pending user requests/);
});
