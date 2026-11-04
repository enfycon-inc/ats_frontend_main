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
    if (id.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
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
    swr: { __esModule: true, default: key => ({ data: key?.[0]?.startsWith('employee-performance') ? {performanceCities:(data.analytics?.cities||[]).map(city=>({city:city.city,total:city.staff,rows:city.employees.map(row=>({...row,postedJobs:row.jobs,activeJobs:row.jobs,closedJobs:0,assigned:row.jobs,rejected:0})),summary:{postedJobs:city.jobs,activeJobs:city.jobs,closedJobs:0,joined:city.joined}}))} : data, isLoading: false, isValidating: false, mutate: () => {} }) },
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
  };
  const View = load('app/(dashboard)/dashboard/components/delivery-head-dashboard-view.tsx', mocks).default;
  return renderToStaticMarkup(React.createElement(View));
}
module.exports = { load, fixture, renderDashboard };
function cityAnalytics(cities = ['BBSR']) {
  const employee = city => ({ id: city, name: `${city} staff`, email: `${city.toLowerCase()}@example.com`, city, jobs: 2, submissions: 4, offers: 1, joined: 0, canRecruit: true, canPost: true });
  return { timezone: 'Asia/Kolkata', from: null, to: null, jobCounts: { total: 4, statuses: { ACTIVE: 2, CLOSED: 1, HOLD: 1 }, priorities: { HOT: 2 }, types: { 'Full-Time': 4 } }, rounds: { l1: { PENDING: 2, CLEARED: 1 }, l2: { REJECTED: 1 }, l3: {} }, final: { SELECTED: 1, OFFER: 1, JOIN: 1 }, review: 2, totalSubmissions: 8, offersReceived: 3, undatedOffers: 1, websiteApplications: 2, unattributed: 0, availableCities: cities, cities: cities.map(city => ({ city, staff: 1, jobs: 2, submissions: 4, offers: 1, joined: 0, employees: [employee(city)], leaders: [employee(city)], page: 1 })), submissionIds: [], submissionTotal: 0, offeredDates: {}, groups: [] };
}
test('city dashboard exposes every approved round label and full-width single-city layout', () => {
  const html = renderDashboard(fixture({ analytics: cityAnalytics() }));
  for (const label of ['Pending', 'Scheduled', 'Awaiting result', 'Cleared', 'Rejected', 'Selected', 'Offer', 'Joined', 'Bhubaneswar', 'bbsr@example.com']) assert.ok(html.includes(label), label);
  assert.ok(html.includes('data-city-layout="single"'));
  assert.ok(!html.includes('Closed unsuccessful'));
  assert.ok(html.includes('Interview pipeline'));
  assert.ok(html.includes('View all account managers'));
  assert.ok(!html.includes('Offers received'));
  assert.ok(html.includes('/job-posting/active?'));
  assert.ok(html.includes('status=CLOSED'));
  assert.ok(html.includes('data-outcome="SELECTED"'));
  assert.ok(html.includes('data-outcome="OFFER"'));
  assert.ok(html.includes('data-outcome="JOIN"'));
  assert.ok(!html.includes('Per-employee output'));
  assert.ok(!html.includes('Employee view'));
  assert.ok(!html.includes('Search employee name or email'));
  assert.ok(!html.includes('STATUS MATRIX'));
  assert.ok(html.includes('aria-label="Round outcomes"'));
  assert.ok(!html.includes('id="delivery-submissions"'));
  assert.ok(!html.includes('>Dates<'));
});
test('city dashboard supports multiple cities without repeating staff across cities', () => {
  const html = renderDashboard(fixture({ analytics: cityAnalytics(['BBSR', 'VIZAG']) }));
  assert.ok(html.includes('data-city-layout="grid"'));
  assert.ok(html.includes('bbsr@example.com'));
  assert.ok(html.includes('vizag@example.com'));
});
test('large city selections render a comparison table and permission-limited staff stays hidden', () => {
  const html = renderDashboard(fixture({ analytics: cityAnalytics(['BBSR', 'VIZAG', 'PUNE', 'BENGALURU', 'HYDERABAD']) }));
  assert.ok(html.includes('Account Managers'));
  assert.ok(html.includes('HYDERABAD'));
  const restricted = renderDashboard(fixture({ analytics: { ...cityAnalytics(), cities: null, availableCities: [] } }));
  assert.ok(!restricted.includes('bbsr@example.com'));
  assert.ok(!restricted.includes('Employee city'));
});
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
