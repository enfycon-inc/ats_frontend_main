const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const source = fs.readFileSync(path.join(__dirname, '../components/ui/job-assignment-modal.tsx'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const box = ({ children }) => React.createElement('div', null, children);
const moduleValue = { exports: {} };
const imports = {
  react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
  '@/components/ui/dialog': Object.fromEntries(['Dialog','DialogContent','DialogHeader','DialogTitle','DialogFooter'].map(key => [key, box])),
  '@/components/ui/button': { Button: ({ children, disabled }) => React.createElement('button', { disabled }, children) },
  '@/components/ui/input': { Input: props => React.createElement('input', props) },
  '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
  'lucide-react': Object.fromEntries(['Search','Users','ShieldAlert','User','Check','X','Building2'].map(key => [key, () => null])),
};
new Function('exports', 'require', code)(moduleValue.exports, name => imports[name]);
function dialog(overrides = {}) {
  return renderToStaticMarkup(React.createElement(moduleValue.exports.JobAssignmentModal, {
    isOpen: true, onClose() {}, onApply() {}, assignmentType: 'pod', selectedPodId: null,
    selectedRecruiterIds: [], podsList: [], recruitersList: [], canAssignPods: true, canAssignRecruiters: true,
    activeBranch: { allowPods: true, allowNone: true, allowUnassigned: false }, ...overrides,
  }));
}
test('unit enabling pods and direct assignment shows both tabs even without pods', () => {
  const html = dialog();
  assert.match(html, /Recruitment Pods/);
  assert.match(html, /Individual Recruiters/);
  assert.match(html, /No pods available/);
  assert.doesNotMatch(html, /Assign Later/);
  assert.match(html, /disabled=""[^>]*>Apply Assignment/);
});
test('active role permissions independently control each channel', () => {
  const html = dialog({ canAssignPods: false, assignmentType: 'recruiters' });
  assert.doesNotMatch(html, /Recruitment Pods/);
  assert.match(html, /Individual Recruiters/);
  assert.doesNotMatch(dialog({ canAssignRecruiters: false }), /Individual Recruiters/);
});
test('optional assignment can be cleared without a third tab', () => {
  const html = dialog({ activeBranch: { allowPods: true, allowNone: true, allowUnassigned: true } });
  assert.match(html, /Clear Assignment/);
  assert.doesNotMatch(html, /disabled=""[^>]*>Apply Assignment/);
  assert.doesNotMatch(html, /Assign Later/);
});
test('recruiters have a select all checkbox rather than a pool option', () => {
  const html = dialog({ assignmentType: 'recruiters', recruitersList: [{ id: 'one', fullName: 'Recruiter' }] });
  assert.match(html, /type="checkbox"/);
  assert.match(html, /Select All/);
  assert.doesNotMatch(html, /Unit Pool|All Unit Recruiters/);
});
test('disabled unit channels stay hidden even if records exist', () => {
  const html = dialog({ activeBranch: { allowPods: false, allowNone: false, allowUnassigned: true }, podsList: [{ id: 'pod' }] });
  assert.doesNotMatch(html, /Recruitment Pods|Individual Recruiters/);
});
test('a selected pod satisfies mandatory assignment', () => {
  const html = dialog({ selectedPodId: 'pod', podsList: [{ id: 'pod', name: 'Unit Pod' }] });
  assert.doesNotMatch(html, /disabled=""[^>]*>Apply Assignment/);
});
