const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, imports = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  new Function('exports', 'require', ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText)(exports, name => name in imports ? imports[name] : require(name));
  return exports;
}
const navigation = load('constants/navigation.ts');
const policy = load('lib/role-permissions.ts', { '@/constants/navigation': navigation });
const profile = { id: 'member', systemRole: 'RECRUITER', permissions: ['job:view', 'candidate:view', 'submission:create', 'submission:view', 'pod:view', 'job:view_pod_jobs'] };
function links(value) {
  return policy.getFilteredPrimaryNav(undefined, [], value).flatMap(item => (item.children || []).map(child => child.href));
}
test('disabled or unresolved pods hide every pod-only link while keeping personal navigation', () => {
  for (const features of [undefined, { podsEnabled: false }]) {
    const value = { ...profile, features };
    const hrefs = links(value);
    assert.ok(!hrefs.includes('/job-posting/pod-jobs'));
    assert.ok(!hrefs.includes('/utility/submissions?view=pod'));
    assert.ok(!policy.getFilteredMoreNav(undefined, [], value).some(item => item.id === 'pod-management'));
    assert.ok(hrefs.includes('/job-posting/my-jobs'));
    assert.ok(!hrefs.includes('/job-posting/all'));
    assert.ok(hrefs.includes('/utility/submissions?view=my'));
  }
});
test('enabled pods still require granular permissions, not merely a role label', () => {
  const value = { ...profile, features: { podsEnabled: true } };
  assert.ok(links(value).includes('/job-posting/all'));
  assert.ok(links(value).includes('/job-posting/pod-jobs'));
  assert.ok(links(value).includes('/utility/submissions?view=pod'));
  assert.ok(policy.getFilteredMoreNav(undefined, [], value).some(item => item.id === 'pod-management'));
  assert.ok(!links({ ...value, permissions: ['job:view', 'submission:view'] }).includes('/job-posting/pod-jobs'));
  assert.ok(!links({ ...value, permissions: ['job:view', 'submission:view'] }).includes('/utility/submissions?view=pod'));
});

test('disabled pods retain All Jobs for broader capabilities and ignore role labels', () => {
  const value = { ...profile, features: { podsEnabled: false } };
  for (const permission of ['tenant:manage', 'tenant:settings', 'branch_admin:manage', 'unit_admin:manage', 'job:create', 'job:override_assignment', 'job:view_all', 'job:view_all_branches']) {
    assert.ok(links({ ...value, permissions: [...profile.permissions, permission] }).includes('/job-posting/all'), permission);
  }
  assert.ok(!links({ ...value, systemRole: 'TENANT_ADMIN' }).includes('/job-posting/all'));
  assert.ok(links({ ...value, systemRole: 'CUSTOM_SOURCER' }).includes('/job-posting/my-jobs'));
});
test('direct pod-only URLs do not mount their child page when disabled or loading', () => {
  let state;
  let mounted = 0;
  const { PodFeatureGate } = load('components/shared/pod-feature-gate.tsx', { '@/hooks/use-staff-profile': { useStaffProfile: () => state } });
  function Child() { mounted++; return React.createElement('span', null, 'Pod data'); }
  for (const value of [{ loading: true }, { data: { features: { podsEnabled: false } } }, { error: new Error('offline') }]) {
    state = value;
    renderToStaticMarkup(React.createElement(PodFeatureGate, null, React.createElement(Child)));
    assert.equal(mounted, 0);
  }
  state = { data: { features: { podsEnabled: true } } };
  assert.match(renderToStaticMarkup(React.createElement(PodFeatureGate, null, React.createElement(Child))), /Pod data/);
  assert.equal(mounted, 1);
});
const native = type => props => React.createElement(type, props);
const { JobContextMenu } = load('app/(dashboard)/job-posting/components/data-table/job-context-menu.tsx', {
  'lucide-react': new Proxy({}, { get: () => native('span') }), '@iconify/react': { Icon: native('span') },
});
function menu(capabilities, status = 'Active') {
  return renderToStaticMarkup(React.createElement(JobContextMenu, {
    x: 0, y: 0, job: { id: 'job', jobStatus: status, capabilities, isPubliclyPublished: true },
    hasSubmitCandidatePermission: true, hasEditPermission: true,
  }));
}
test('assigned recruiter menus show sourcing without editing or website controls', () => {
  const html = menu({ submitCandidate: true, findMatches: true });
  assert.match(html, /Submit Candidate/); assert.match(html, /Find AI Matches/);
  assert.doesNotMatch(html, /Edit Job|Publish to website|Unpublish from website/);
});
test('closed job state never invents unauthorized actions', () => {
  const html = menu({ submitCandidate: false, findMatches: false, edit: false, managePublication: false }, 'Closed');
  assert.doesNotMatch(html, /Find AI Matches|Edit Job|Publish to website|Unpublish from website|Submit Candidate/);
});
test('editing does not imply publication; explicit administrator capability controls website actions', () => {
  assert.doesNotMatch(menu({ edit: true, managePublication: false }), /Unpublish from website/);
  assert.match(menu({ edit: true, managePublication: true }), /Unpublish from website/);
});
test('capability and default-grant contracts match their canonical backend sources', () => {
  for (const [backend, frontend] of [['jobs/job-capabilities.ts', 'job-capabilities.ts'], ['auth/job-access-grants.ts', 'job-access-grants.ts']]) {
    const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    assert.equal(read(path.join(__dirname, '../../ats_backend/src', backend)), read(path.join(__dirname, '../lib', frontend)));
  }
});
