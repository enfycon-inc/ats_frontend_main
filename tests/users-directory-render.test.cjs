const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function render(permissions, telemetryEnabled = true, view = 'active', extra = {}) {
  const item = { id: 'member', kind: 'user', fullName: 'Test Member', email: 'member@example.test',
    city: 'BBSR', assignedRoles: ['Recruiter'], branchName: 'Branch A', businessUnitName: 'Unit A',
    isActive: true, isApproved: true, presence: 'active', lastSeenAt: null, allowedActions: {}, ...extra };
  const page = { items: [item], total: 1, pageSize: 25, filters: { cities: ['BBSR', 'VIZAG'], roles: ['Recruiter'] },
    counts: { active: 1, pending: 0, blocked: 0 }, telemetryEnabled };
  let requestKey;
  const passthrough = ({ children }) => React.createElement('div', null, children);
  const dependencies = {
    react: React,
    'next/navigation': { usePathname: () => '/utility/users/active', useRouter: () => ({}),
      useSearchParams: () => new URLSearchParams('city=BBSR&role=Recruiter') },
    swr: { __esModule: true, default: key => { requestKey = key; return { data: page, mutate: () => {} }; } },
    'react-hot-toast': { __esModule: true, default: {} },
    './use-management-profile': { useManagementProfile: () => ({ permissions, scope: 'tenant:branch:unit', data: {} }) },
    './users-navigation': { UsersNavigation: () => null, canOpenUserPage: () => true },
    './user-page-skeleton': { UserPageSkeleton: () => null },
    '@/lib/ats-api': { atsApi: {} }, '@/lib/user-management-api': { userManagementApi: {} },
    '@/lib/pod-lead-role-policy': { isAutomaticPodLeadRole: () => false },
    '@/components/shared/enterprise-grid': { enterpriseGrid: {} },
  };
  const exportsObject = {};
  const source = fs.readFileSync(path.join(__dirname, '../components/users/users-directory.tsx'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const load = name => dependencies[name] || (name === 'react/jsx-runtime' ? require(name) :
    new Proxy({}, { get: (_, key) => key === '__esModule' ? true : passthrough }));
  new Function('require', 'exports', js)(load, exportsObject);
  return { html: renderToStaticMarkup(React.createElement(exportsObject.UsersDirectory, { view })),
    key: () => requestKey };
}

test('directory renders aligned cells, combined branch/unit, selection and server filters', () => {
  const result = render(['user:view', 'user:presence:view']);
  const table = result.html.match(/<table[\s\S]*?<\/table>/)[0];
  assert.equal((table.match(/<th\b/g) || []).length, 9);
  assert.equal((table.match(/<td\b/g) || []).length, 9);
  assert.match(table, /Branch A<\/span><span[^>]*>Unit A/);
  assert.match(table, /Select all users on this page/);
  assert.match(table, /Select Test Member/);
  assert.match(table, /Online status/);
  assert.match(table, />Online<\/span>/);
  assert.match(result.html, /value="VIZAG"/); // Full scoped options, beyond the returned row.
  assert.match(result.key()[2], /city=BBSR/);
  assert.match(result.key()[2], /role=Recruiter/);
});

test('directory hides presence without permission and reports unavailable telemetry', () => {
  const unauthorized = render(['user:view']);
  const table = unauthorized.html.match(/<table[\s\S]*?<\/table>/)[0];
  assert.doesNotMatch(table, /Online status|>Online<\/span>/);
  assert.equal((table.match(/<th\b/g) || []).length, (table.match(/<td\b/g) || []).length);
  assert.match(render(['user:view', 'user:presence:view'], false).html, /Live activity is currently unavailable/);
});

test('pending members get one Review action with no approval/rejection links or navigation', () => {
  const row = { isApproved: false, requestedRole: 'Recruiter', allowedActions: { review: true } };
  const html = render(['user:manage'], true, 'pending', row).html;
  assert.match(html, />Review</);
  assert.doesNotMatch(html, /Review &amp; Approve Request|Reject Registration|requestId=/);
  assert.doesNotMatch(render(['user:manage'], true, 'pending', { ...row, kind: 'invitation' }).html, />Review</);
  assert.doesNotMatch(render(['user:view'], true, 'pending', { ...row, allowedActions: { review: false } }).html, />Review</);
});
