const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(global, 'localStorage', { value: dom.window.localStorage, configurable: true });
Object.defineProperty(global, 'sessionStorage', { value: dom.window.sessionStorage, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const { act } = React;
function load(relative, mocks = {}, cache = new Map()) {
  if (cache.has(relative)) return cache.get(relative);
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/') || id.startsWith('.')) {
      const root = path.join(__dirname, '..');
      const base = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(root, path.dirname(relative), id);
      const source = [base + '.ts', base + '.tsx'].find(file => fs.existsSync(file));
      if (source) return load(path.relative(root, source), mocks, cache);
    }
    return require(id);
  }, mod, mod.exports);
  cache.set(relative, mod.exports);
  return mod.exports;
}
let fixtureId = 0;
async function render(count, permissions = ['user:manage', 'job:view', 'submission:view', 'client:view'], failExpansion = false) {
  const calls = [];
  const rows = Array.from({ length: count }, (_, i) => ({ id: String(i), name: `Manager ${String(i).padStart(3, '0')}`, email: `manager${i}@example.test`, avatar: null, postedJobs: 3, activeJobs: 2, closedJobs: 1, positions: 5, submissions: 5, review: 1, l1: 1, l2: 1, l3: 0, offers: 1, joined: 1, closed: 0 }));
  const Component = load('app/(dashboard)/dashboard/components/account-manager-comparison.tsx', {
    '@/contexts/DashboardContext': { useDashboardContext: () => ({ profile: { id: `actor-${++fixtureId}`, tenantId: 'tenant', branchId: 'branch', businessUnitId: 'unit', permissions }, selection: { active: { id: 'role' } } }) },
    '@/lib/ats-api': { atsApi: { businessUnits: { accountManagerDashboard: async filters => {
      calls.push(filters);
      if (failExpansion && filters.offset > 0) throw new Error('Dashboard changed');
      const matching = rows.filter(row => (row.name + row.email).toLowerCase().includes((filters.search || '').toLowerCase()) && (!filters.accountManagerId || row.id === filters.accountManagerId));
      const offset = filters.offset || 0;
      const limit = filters.limit || 10;
      return { unit: { name: 'IT', branchName: 'Office' }, rows: matching.slice(offset, offset + limit), total: matching.length, offset,
        charts: permissions.includes('submission:view') && offset === 0 ? { closures: matching.slice(0, 5).map(row => ({ id: row.id, name: row.name, count: row.joined })), pipeline: matching.slice(0, 5), weekly: [{ from: '2026-10-01T00:00:00.000Z', to: '2026-10-08T00:00:00.000Z', count: matching.length }], weeklyScope: filters.from ? 'selected-period' : 'last-12-weeks', undatedClosures: 0 } : null,
        nextOffset: offset + limit < matching.length ? offset + limit : null, snapshot: 'snapshot', updatedAt: new Date(0).toISOString(),
        summary: { postedJobs: matching.length * 3, activeJobs: matching.length * 2, joined: matching.length, unassignedJobs: 0 },
        managers: rows.map(row => ({ id: row.id, name: row.name })), undatedOutcomes: 0, undatedPostedJobs: 0,
        options: { clients: [], markets: ['INDIA', 'US'], employmentTypes: ['Full Time', 'Contract'] } };
    } } } },
    '@/components/ui/button': { Button: props => React.createElement('button', props) },
    '@/components/ui/input': { Input: props => React.createElement('input', props) },
    '@/components/ui/skeleton': { Skeleton: props => React.createElement('div', props) },
    '@/components/shared/user-identity': { UserIdentity: ({ user }) => React.createElement('span', null, user.fullName, ' ', user.email) },
    '@/components/shared/column-drawer': { __esModule: true, default: () => null },
    'next/link': { __esModule: true, default: ({ children, onClick, ...props }) => React.createElement('a', { ...props, onClick: event => { event.preventDefault(); onClick?.(event); } }, children) },
    'lucide-react': { ChevronDown: () => null, ChevronUp: () => null, RefreshCw: () => null, ChevronsUpDown: () => null, Columns3: () => null },
  }).default;
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(React.createElement(Component)); });
  await settle();
  return { container, calls, close: async () => { await act(async () => root.unmount()); container.remove(); } };
}
async function settle(ms = 30) { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); }
const button = (container, text) => [...container.querySelectorAll('button')].find(el => el.textContent.includes(text));
const rowCount = container => container.querySelectorAll('tbody th[scope="row"]').length;

test('top ten expands all remaining pages and collapses; summaries cover all managers', async () => {
  const view = await render(24);
  try {
    assert.equal(rowCount(view.container), 10);
    assert.match(view.container.textContent, /Showing 10 of 24/);
    assert.match(view.container.textContent, /Total posted72/);
    await act(async () => button(view.container, 'Show all').click()); await settle();
    assert.equal(rowCount(view.container), 24);
    assert.equal(view.calls[1].offset, 10); assert.equal(view.calls[1].limit, 100); assert.equal(view.calls[1].snapshot, 'snapshot');
    await act(async () => button(view.container, 'Show top 10').click());
    assert.equal(rowCount(view.container), 10);
  } finally { await view.close(); }
});

test('ten or fewer and empty rosters do not show expansion', async () => {
  for (const count of [0, 10]) {
    const view = await render(count);
    try { assert.equal(rowCount(view.container), count); assert.equal(button(view.container, 'Show all'), undefined); }
    finally { await view.close(); }
  }
});

test('filter changes reset expansion and preserve selected filter in requests', async () => {
  const view = await render(24);
  try {
    await act(async () => button(view.container, 'Show all').click()); await settle();
    const manager = view.container.querySelector('[aria-label="Account manager"]');
    await act(async () => { manager.value = '2'; manager.dispatchEvent(new window.Event('change', { bubbles: true })); }); await settle();
    assert.equal(rowCount(view.container), 1);
    assert.equal(view.calls.at(-1).accountManagerId, '2'); assert.equal(view.calls.at(-1).offset, 0);
  } finally { await view.close(); }
});

test('search remains focused and filters results after debounce', async () => {
  const view = await render(24);
  try {
    const input = view.container.querySelector('input'); input.focus();
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Manager 023');
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await settle(350); await settle();
    assert.equal(document.activeElement, input);
    assert.equal(rowCount(view.container), 1); assert.equal(view.calls.at(-1).search, 'Manager 023');
  } finally { await view.close(); }
});

test('sort changes reset expansion and send the selected sort', async () => {
  const view = await render(24);
  try {
    await act(async () => button(view.container, 'Show all').click()); await settle();
    const sort = [...view.container.querySelectorAll('thead button')].find(element => element.textContent === 'Active');
    await act(async () => sort.click()); await settle();
    assert.equal(rowCount(view.container), 10); assert.equal(view.calls.at(-1).sort, 'activeJobs');
    assert.equal(view.calls.at(-1).direction, 'desc');
    await act(async () => [...view.container.querySelectorAll('thead button')].find(element => element.textContent === 'Active').click()); await settle();
    assert.equal(view.calls.at(-1).direction, 'asc');
  } finally { await view.close(); }
});

test('failed expansion keeps the initial rows and provides a recovery action', async () => {
  const view = await render(24, ['user:manage', 'job:view', 'submission:view'], true);
  try {
    await act(async () => button(view.container, 'Show all').click()); await settle();
    assert.equal(rowCount(view.container), 10);
    assert.match(view.container.querySelector('[role="alert"]').textContent, /data may have changed/i);
    assert.ok(button(view.container, 'Reload comparison'));
  } finally { await view.close(); }
});

test('large expansion continues until all pages load and limits rendered rows', async () => {
  const view = await render(225);
  try {
    await act(async () => button(view.container, 'Show all').click());
    for (let i = 0; i < 4; i++) await settle();
    assert.match(view.container.textContent, /Showing 225 of 225/);
    assert.ok(rowCount(view.container) <= 30);
    assert.deepEqual(view.calls.map(call => call.offset), [0, 10, 110, 210]);
  } finally { await view.close(); }
});

test('roster permission gates comparison requests', async () => {
  const view = await render(24, []);
  try { assert.equal(view.calls.length, 0); assert.match(view.container.textContent, /permission is required/); }
  finally { await view.close(); }
});

test('dashboard child routes have correct titles and breadcrumbs', () => {
  const { getRouteBreadcrumbInfo } = load('lib/route-breadcrumb-map.ts');
  for (const [path, label] of [['/dashboard/overview', 'Overview'], ['/dashboard/account-managers', 'Account Managers']]) {
    const info = getRouteBreadcrumbInfo(path);
    assert.equal(info.pageTitle, 'Delivery Dashboard'); assert.equal(info.breadcrumbs.at(-1).label, label); assert.equal(info.showBackButton, false);
  }
});

test('manager grid has revised column order, identities, filters adjacent to table and no selection boxes', async () => {
  const view = await render(10, ['user:manage', 'job:view', 'submission:view', 'submission:internal_screening']);
  try {
    assert.deepEqual([...view.container.querySelectorAll('thead button')].map(node => node.textContent), ['Account manager', 'Total posted', 'Active', 'Closed', 'Positions', 'Submissions received', 'Pending internal review', 'L1', 'L2', 'L3', 'Offers', 'Closures']);
    assert.equal(view.container.querySelectorAll('input[type="checkbox"]').length, 0);
    assert.match(view.container.querySelector('tbody').textContent, /manager0@example.test/);
    const filters = view.container.querySelector('[aria-label="Account manager filters"]');
    assert.ok(filters.nextElementSibling.querySelector('table'));
    const period = view.container.querySelector('[aria-label="Time period"]');
    await act(async () => { period.value = 'lastMonth'; period.dispatchEvent(new window.Event('change', { bubbles: true })); }); await settle();
    assert.ok(Date.parse(view.calls.at(-1).from) < Date.parse(view.calls.at(-1).to));
    await act(async () => button(view.container, 'Reset').click()); await settle();
    assert.equal(period.value, 'all'); assert.match(view.container.querySelector('section > p').textContent, /All time/);
  } finally { await view.close(); }
});

test('period boundaries, invalid dates and column preferences are validated', () => {
  const helpers = load('lib/account-manager-presentation.ts');
  const now = new Date(2026, 0, 15);
  const prior = helpers.managerPeriod('lastMonth', now);
  assert.equal(new Date(prior.from).getFullYear(), 2025); assert.equal(new Date(prior.to).getMonth(), 0);
  assert.throws(() => helpers.customManagerPeriod('2026-02-30', '2026-03-01'));
  assert.throws(() => helpers.customManagerPeriod('2026-10-20', '2026-10-01'));
  assert.throws(() => helpers.customManagerPeriod('2024-01-01', '2026-01-01'));
  const available = helpers.availableManagerColumns(['job:view']);
  assert.deepEqual(helpers.normalizeManagerColumns(['joined', 'activeJobs', 'activeJobs'], available), ['name', 'activeJobs']);
});

test('shared column drawer applies visibility and discards unapplied changes on reopen', async () => {
  const Drawer = load('components/shared/column-drawer.tsx', {
    '@/components/ui/button': { Button: ({ children, onClick }) => React.createElement('button', { onClick }, children) },
    'lucide-react': Object.fromEntries(['X', 'Search', 'Check', 'ChevronUp', 'ChevronDown', 'GripVertical'].map(name => [name, () => null])),
  }).default;
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  let applied;
  const props = { isOpen: true, onClose() {}, allColumns: [{ id: 'name', label: 'Account manager' }, { id: 'activeJobs', label: 'Active' }], selectedColumns: ['name', 'activeJobs'], onApply: columns => { applied = columns; } };
  try {
    await act(async () => root.render(React.createElement(Drawer, props)));
    await act(async () => container.querySelectorAll('input[type="checkbox"]')[1].click());
    await act(async () => button(container, 'Apply Changes').click());
    assert.deepEqual(applied, ['name']);
    await act(async () => root.render(React.createElement(Drawer, { ...props, isOpen: false })));
    await act(async () => root.render(React.createElement(Drawer, props)));
    assert.equal(container.querySelectorAll('input[type="checkbox"]')[1].checked, true);
  } finally { await act(async () => root.unmount()); container.remove(); }
});

test('shared user identity renders name, email, readable text and initials when photo is absent', () => {
  const { renderToStaticMarkup } = require('react-dom/server');
  const { UserIdentity } = load('components/shared/user-identity.tsx', {
    '@/components/ui/avatar': { Avatar: ({ children, ...props }) => React.createElement('div', props, children), AvatarFallback: ({ children }) => React.createElement('span', null, children), AvatarImage: () => null },
  });
  const html = renderToStaticMarkup(React.createElement(UserIdentity, { size: 'table', user: { fullName: 'Priya Shah', email: 'priya@example.test' } }));
  assert.match(html, /Priya Shah/); assert.match(html, /priya@example.test/); assert.match(html, />PS</); assert.match(html, /text-sm/);
});

test('manager charts and identity links open the dedicated route without filtering the comparison', async () => {
  const view = await render(24);
  try {
    for (const title of ['Closures by manager', 'Weekly closures', 'Current pipeline by manager']) assert.ok(view.container.querySelector(`section[aria-label="${title}"]`));
    const charts = view.container.querySelector('[aria-label="Account manager charts"]');
    assert.ok(charts.compareDocumentPosition(view.container.querySelector('table')) & window.Node.DOCUMENT_POSITION_FOLLOWING);
    const leader = charts.querySelector('a[aria-label*="closures. Open performance."]');
    const before = view.calls.length;
    await act(async () => leader.click()); await settle();
    assert.equal(leader.getAttribute('href'), '/dashboard/account-managers/0');
    assert.equal(view.calls.length, before); assert.equal(rowCount(view.container), 10);
    assert.equal(view.container.querySelector('tbody th a').getAttribute('href'), '/dashboard/account-managers/0');
  } finally { await view.close(); }
});

test('weekly chart identifies undated joins and restricted review is absent from the pipeline legend', () => {
  const { renderToStaticMarkup } = require('react-dom/server');
  const Charts = load('app/(dashboard)/dashboard/components/account-manager-charts.tsx', { '@/components/ui/skeleton': { Skeleton: () => null } }).default;
  const html = renderToStaticMarkup(React.createElement(Charts, { charts: { closures: [], pipeline: [{ id: 'a', name: 'Manager', review: null, l1: 0, l2: 0, l3: 0, offers: 0 }], weekly: [], weeklyScope: 'last-12-weeks', undatedClosures: 2 }, loading: false, failed: false, selectedPeriod: false, onSelectManager() {} }));
  assert.match(html, /2 closures have no recorded join date/);
  assert.doesNotMatch(html, />Review</);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test('manager detail links carry period only and parent context restores within its identity scope', () => {
  const navigation = load('lib/manager-detail-navigation.ts');
  const id = '00000000-0000-0000-0000-000000000100';
  const filters = { accountManagerId: id, search: 'Priya', sort: 'joined', direction: 'desc', from: '2026-10-01T00:00:00.000Z', to: '2026-11-01T00:00:00.000Z' };
  const url = new URL(navigation.managerDetailHref(id, filters), 'http://localhost');
  assert.equal(url.pathname, `/dashboard/account-managers/${id}`); assert.equal(url.searchParams.get('from'), filters.from); assert.equal(url.searchParams.get('search'), null);
  navigation.saveManagerComparisonState('user:tenant:unit', { filters, search: 'Priya', period: 'month', startDate: '', endDate: '', expanded: true, scrollTop: 240 });
  assert.equal(navigation.readManagerComparisonState('user:tenant:unit').expanded, true);
  assert.equal(navigation.readManagerComparisonState('another:user:unit'), null);
  const { getRouteBreadcrumbInfo } = load('lib/route-breadcrumb-map.ts');
  assert.equal(getRouteBreadcrumbInfo(url.pathname).pageTitle, 'Account Manager Performance');
});

async function renderManagerDetail(query = 'from=2020-01-01T00%3A00%3A00.000Z&to=2020-02-01T00%3A00%3A00.000Z') {
  const requests = [];
  const id = '00000000-0000-0000-0000-000000000100';
  const weeks = [{ from: '2020-01-01T00:00:00.000Z', to: '2020-01-08T00:00:00.000Z', count: 2 }];
  const client = (clientId, name, addedByManager) => ({ id: clientId, name, addedByManager, addedAt: '2020-01-03T00:00:00.000Z', status: 'Active', postedJobs: 1, activeJobs: 1, closedJobs: 0, positions: 2, submissions: 2, review: 1, offers: 1, joined: 1 });
  const Detail = load('app/(dashboard)/dashboard/components/manager-performance-page.tsx', {
    '@/contexts/DashboardContext': { useDashboardContext: () => ({ profile: { id: 'detail-viewer', tenantId: 'tenant', branchId: 'branch', businessUnitId: 'unit', permissions: ['unit_admin:manage', 'user:manage', 'job:view', 'client:view', 'submission:view', 'submission:internal_screening'] }, selection: { active: { id: 'role' } } }) },
    'next/navigation': { useSearchParams: () => new URLSearchParams(query) },
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', { ...props, onClick: event => event.preventDefault() }, children) },
    '@/components/shared/user-identity': { UserAvatar: ({ user }) => React.createElement('span', null, (user.name || '').slice(0, 2)) },
    '@/components/ui/button': { Button: ({ children, ...props }) => React.createElement('button', props, children) },
    '@/components/ui/input': { Input: props => React.createElement('input', props) },
    '@/components/ui/skeleton': { Skeleton: () => null },
    '@/lib/ats-api': { atsApi: { businessUnits: { accountManagerDetail() {} } } },
    swr: { __esModule: true, default: key => {
      const filters = key[2]; requests.push(filters);
      return { data: { manager: { id, name: 'Priya Shah', email: 'priya@example.test', avatar: null, postedJobs: 12, activeJobs: 7, positions: 17, submissions: 45, offers: 4, joined: 2 },
        unit: { name: 'Staffing', branchName: 'Office' }, weekly: { submissions: weeks, closures: weeks, clientsAdded: weeks }, weeklyScope: 'selected-period',
        pipeline: { id, name: 'Priya Shah', review: 1, l1: 2, l2: 1, l3: 0, offers: 1 }, attention: { uncoveredJobs: 1, pendingReview: 1 },
        jobs: { rows: [{ id: 'job', title: 'Backend Engineer', code: 'JOB-1', status: 'Active', positions: 2, submissions: 2, review: 1, joined: 1, clientId: 'portfolio', clientName: 'Portfolio Client' }], total: 1, page: 1, limit: 20 },
        clients: { rows: [filters.clientMode === 'portfolio' ? client('portfolio', 'Portfolio Client', false) : client('added', 'Creator Client', true)], total: 1, page: 1, limit: 20, added: 1, portfolio: 1, closures: [{ id: 'added', name: 'Creator Client', count: 1 }] },
        options: { clients: [{ id: 'added', name: 'Creator Client' }], employmentTypes: ['Full Time', 'Contract'] }, undatedOutcomes: 0, undatedPostedJobs: 0 }, mutate() {}, isLoading: false };
    } },
  }).default;
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(React.createElement(Detail, { managerId: id })));
  return { container, requests, close: async () => { await act(async () => root.unmount()); container.remove(); } };
}

test('dedicated manager page has personal trends and job detail instead of a single-row team comparison', async () => {
  const view = await renderManagerDetail();
  try {
    assert.match(view.container.textContent, /Priya Shah/); assert.match(view.container.textContent, /priya@example.test/);
    for (const chart of ['Weekly submissions', 'Weekly closures', 'Current pipeline']) assert.ok(view.container.querySelector(`section[aria-label="${chart}"]`));
    assert.doesNotMatch(view.container.textContent, /Closures by manager|Top 1 of 1/);
    assert.equal(view.container.querySelector('a').getAttribute('href'), '/dashboard/account-managers');
    assert.equal(view.requests[0].from, '2020-01-01T00:00:00.000Z');
    assert.ok(view.container.querySelector('table[aria-label="Manager job performance"]'));
    assert.equal(view.container.querySelectorAll('input[type="checkbox"]').length, 0);
  } finally { await view.close(); }
});

test('client performance separates clients added by manager from delivery portfolio and offers the requested charts', async () => {
  const view = await renderManagerDetail();
  try {
    await act(async () => button(view.container, 'Client Performance').click());
    assert.ok(view.container.querySelector('section[aria-label="Clients added over time"]'));
    assert.ok(view.container.querySelector('section[aria-label="Closures by client"]'));
    const table = view.container.querySelector('table[aria-label="Client performance added by manager"]');
    assert.match(table.textContent, /Creator Client/); assert.doesNotMatch(table.textContent, /Portfolio Client/);
    const attribution = view.container.querySelector('[aria-label="Client attribution"]');
    await act(async () => { attribution.value = 'portfolio'; attribution.dispatchEvent(new window.Event('change', { bubbles: true })); });
    assert.equal(view.requests.at(-1).clientMode, 'portfolio');
    assert.match(view.container.querySelector('table').textContent, /Portfolio Client/);
  } finally { await view.close(); }
});

test('invalid URL date text does not crash the manager detail renderer', async () => {
  const view = await renderManagerDetail('from=invalid&to=invalid');
  try { assert.ok(view.container.querySelector('[aria-label="Individual account manager performance"]')); }
  finally { await view.close(); }
});
