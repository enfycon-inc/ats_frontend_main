const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const input = props => React.createElement('input', { placeholder: props.placeholder, value: props.value || '', disabled: props.disabled, readOnly: true });
function load(path) {
  const mod = { exports: {} };
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)(mod.exports, name => {
    if (name === './candidate-source-fields') return load('components/candidates/candidate-source-fields.tsx');
    if (name === './candidate-form') return load('components/candidates/candidate-form.tsx');
    if (name === '@/lib/candidate-submission-input') return { candidatePhoneSchema: { safeParse: () => ({ success: true }) }, formatCandidateAmount: value => value };
    if (name === '@/components/ui/label') return { Label: ({ children }) => React.createElement('label', null, children) };
    if (name.startsWith('@/components/')) return { Input: input, PhoneInput: input, TagInput: input, CityAutocomplete: input };
    return require(name);
  });
  return mod.exports;
}
const { CandidateForm } = load('components/candidates/candidate-form.tsx');
const { ContractCandidateSubmissionForm } = load('components/candidates/contract-candidate-submission-form.tsx');
const props = { formData: { firstName: '', lastName: '', email: '', phone: '', totalExperienceYears: '', relevantExperienceYears: '', currentLocation: '', preferredLocations: '', source: 'Market', sourceChannel: 'LinkedIn', sourceDetail: '', skills: '', currentCompany: '', currentCtc: '60000', expectedCtc: '75000', noticePeriodDays: '15', availabilityToStart: '' }, setFormData() {}, recruiterComment: '', setRecruiterComment() {}, job: { market: 'IN' } };

test('contract wrapper renders monthly pay, one source selector, availability radios and remarks', () => {
  const html = renderToStaticMarkup(React.createElement(ContractCandidateSubmissionForm, props));
  for (const text of ['Current Pay (per month, optional)', 'Expected Pay (per month)', 'Availability to Start', 'Immediate', 'Enter days', 'Remarks', '60000', '75000']) assert.ok(html.includes(text), text);
  assert.equal((html.match(/id="candidate-source"/g) || []).length, 1);
  assert.equal((html.match(/type="radio"/g) || []).length, 2);
  assert.ok(!html.includes('Current CTC'));
  assert.ok(!html.includes('Recruiter Notes'));
});

test('full-time form retains LPA and notice period with the shared source section', () => {
  const html = renderToStaticMarkup(React.createElement(CandidateForm, { ...props, isContractual: false }));
  for (const text of ['Current CTC (LPA)', 'Expected CTC (LPA)', 'Notice Period', 'Remarks']) assert.ok(html.includes(text), text);
  assert.equal((html.match(/id="candidate-source"/g) || []).length, 1);
  assert.ok(!html.includes('Current Pay'));
});

test('Immediate disables the days field', () => {
  const html = renderToStaticMarkup(React.createElement(ContractCandidateSubmissionForm, { ...props, formData: { ...props.formData, noticePeriodDays: '0' } }));
  assert.match(html, /placeholder="Number of days"[^>]*disabled/);
});
