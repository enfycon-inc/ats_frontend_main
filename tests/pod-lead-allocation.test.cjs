const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const base = '../app/(dashboard)/job-posting/components/data-table/';
const read = file => fs.readFileSync(require('node:path').join(__dirname, base, file), 'utf8');

test('assignment action is independent of editing and requires assignment capability', () => {
  const compiled = ts.transpileModule(read('job-context-menu.tsx'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const value = { exports: {} };
  const imports = { react: React, 'react/jsx-runtime': require('react/jsx-runtime'), 'lucide-react': new Proxy({}, { get: () => () => null }), '@iconify/react': { Icon: () => null } };
  new Function('exports', 'require', compiled)(value.exports, name => imports[name]);
  const render = (edit, assign) => renderToStaticMarkup(React.createElement(value.exports.JobContextMenu, { job: {}, hasEditPermission: edit, canAssignRecruiters: assign }));
  assert.match(render(false, true), /Assign Recruiters \/ Pods/);
  assert.doesNotMatch(render(false, true), /Edit Job/);
  assert.doesNotMatch(render(true, false), /Assign Recruiters \/ Pods/);
});

test('unit direct-routing restriction does not block actual lead allocation inside an assigned pod', () => {
  const body = read('job-assign-modal.tsx').match(/const branchAllowsDirectStaff = useMemo\(\(\) => \{([\s\S]*?)\n  \}, \[/)[1];
  const allowed = new Function('userPerms', 'currentUser', 'job', 'podsList', 'targetUnit', 'targetBranch', body);
  const policy = { allowDirect: false, allowDirectStaff: false };
  const pods = [{ id: 'pod', podHeadId: 'lead' }];
  const perms = ['job:assign_recruiter'];
  assert.equal(allowed(perms, { id: 'lead' }, { podIds: ['other', 'pod'] }, pods, policy, null), true);
  assert.equal(allowed(perms, { id: 'am' }, { podIds: ['pod'] }, pods, policy, null), false);
  assert.equal(allowed([], { id: 'lead' }, { podIds: ['pod'] }, pods, policy, null), false);
  assert.equal(allowed(perms, { id: 'lead' }, { podIds: ['other'] }, pods, policy, null), false);
  assert.equal(allowed(perms, { id: 'lead' }, { podIds: ['pod'] }, [], policy, null), false);
});
