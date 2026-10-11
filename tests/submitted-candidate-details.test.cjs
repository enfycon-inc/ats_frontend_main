const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const pay = { exports: {} };
new Function('exports', 'require', ts.transpileModule(fs.readFileSync('lib/submission-compensation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(pay.exports, require);
const mod = { exports: {} };
new Function('exports', 'require', ts.transpileModule(fs.readFileSync('components/submissions/submitted-candidate-details.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)(mod.exports, name => name === '@/lib/submission-compensation' ? pay.exports : name === '@/lib/candidate-submission-input' ? { formatCandidateAmount: value => value.replace(/\B(?=(\d{3})+(?!\d))/g, ',') } : name === '@/components/ui/avatar' ? { Avatar: ({ children }) => React.createElement('div', null, children), AvatarFallback: ({ children }) => React.createElement('span', null, children), AvatarImage: props => React.createElement('img', props) } : require(name));
const render = submission => renderToStaticMarkup(React.createElement(mod.exports.SubmittedCandidateDetails, { submission }));
test('full-time details preserve zeros, compensation units and submitter identity', () => {
  const html = render({ jobType: 'Full-time', candidateFirstName: 'Alex', candidateLastName: 'Morgan', candidateExperience: 0, candidateRelevantExperience: 0, candidateNoticePeriod: 0, candidateCurrentCtc: '0', candidateExpectedCtc: '12', candidateCtcCurrency: 'INR', candidateCtcTerm: 'LPA', candidatePreferredLocations: ['Pune', 'Delhi'], recruiterName: 'Riya Sharma', recruiterEmail: 'riya@example.com', recruiterAvatar: '/avatar.png', recruiterComment: 'Available tomorrow' });
  for (const value of ['0 years', 'Immediate', '0 / INR / LPA', '12 / INR / LPA', 'Pune, Delhi', 'Riya Sharma', 'riya@example.com', '/avatar.png', 'Available tomorrow']) assert.ok(html.includes(value), value);
  assert.ok(!html.includes('Submitted rate'));
});
test('contractual card shows monthly pay and source without exposing bill rate', () => {
  const html = render({ jobType: 'Contractual', expectedCompensationAmount: '60000', compensationCurrency: 'INR', compensationPeriod: 'MONTH', compensationInputUnit: 'MONTH', sourceCategory: 'Market', sourceChannel: 'LinkedIn', availabilityToStart: 'Immediate', submittedRate: '1500' });
  assert.ok(html.includes('60,000 / INR / MONTH'));
  assert.ok(!html.includes('Current CTC'));
  assert.ok(html.includes('Not provided'));
  assert.ok(html.includes('Email not provided'));
  assert.ok(!html.includes('0 years'));
});

test('new LPA snapshots display familiar lakh values and optional pay does not borrow legacy CTC', () => {
 const html = render({ jobType: 'Full Time', currentCompensationAmount: '1200000', expectedCompensationAmount: '1500000', compensationCurrency: 'INR', compensationInputUnit: 'LPA', compensationPeriod: 'YEAR' });
 assert.ok(html.includes('12 / INR / LPA'));
 assert.equal(pay.exports.displaySubmissionCompensation({ compensationInputUnit: 'MONTH', currentCompensationAmount: null, candidateCurrentCtc: '12' }, false).amount, null);
});
