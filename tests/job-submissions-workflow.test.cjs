const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function modules(overrides = {}) {
  const cache = {};
  function load(file) {
    const resolved = path.resolve(file);
    if (cache[resolved]) return cache[resolved].exports;
    const value = cache[resolved] = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    new Function('exports', 'require', code)(value.exports, name => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name === '@/lib/utils') return { cn: (...values) => values.filter(Boolean).join(' ') };
      if (name.startsWith('@/') || name.startsWith('./')) {
        const base = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(resolved), name);
        return load([base + '.ts', base + '.tsx'].find(fs.existsSync));
      }
      return require(name);
    });
    return value.exports;
  }
  return load;
}
const load = modules();
const tracker = load('lib/submission-tracker.ts');
const { StageBadge, Pipeline } = load('components/submissions/submission-stage.tsx');
const base = { id: 'submission', candidateId: 'candidate', candidateName: 'Sample Candidate', finalStatus: 'SUBMITTED', l1Status: 'SCHEDULED', l1Date: '2026-10-30T12:25:00Z', l2Status: 'PENDING', l3Status: 'PENDING', timezone: 'Asia/Kolkata' };

test('shared job/tracker status renders the scheduled round and the interview timezone', () => {
  const html = renderToStaticMarkup(React.createElement(StageBadge, { submission: base }));
  assert.match(html, /L1 scheduled/);
  assert.match(html, /30 Oct/);
  assert.match(html, /05:55/);
  assert.doesNotMatch(html, /Submitted to Client/);
  const pipeline = renderToStaticMarkup(React.createElement(Pipeline, { submission: base }));
  assert.match(pipeline, /Pipeline: L1 scheduled/);
  assert.match(pipeline, /Internal review/);
});
test('job board uses tracker buckets for cancellation, later rounds and closed outcomes', () => {
  assert.equal(tracker.submissionBucket({ ...base, finalStatus: 'PENDING_APPROVAL' }), 'review');
  assert.equal(tracker.submissionBucket({ ...base, l1Status: 'PENDING', l1Date: null }), 'review');
  for (const l1Status of ['SCHEDULED', 'AWAITING_FEEDBACK', 'CLEARED', 'REJECTED', 'CANCELLED']) {
    assert.equal(tracker.submissionBucket({ ...base, l1Status, l1Date: null }), 'interviews');
  }
  assert.equal(tracker.submissionBucket({ ...base, l1Status: 'PENDING' }), 'interviews');
  for (const finalStatus of ['SELECTED', 'OFFER']) assert.equal(tracker.submissionBucket({ ...base, finalStatus }), 'offers');
  for (const finalStatus of ['JOIN', 'REJECTED', 'NOT_SELECTED', 'WITHDRAWN']) assert.equal(tracker.submissionBucket({ ...base, finalStatus }), 'closed');
});
test('shared status distinguishes internal rejection from L2 rejection', () => {
  const internal = renderToStaticMarkup(React.createElement(StageBadge, { submission: { ...base, finalStatus: 'REJECTED', l1Status: 'PENDING', rejectionFromStatus: 'PENDING_APPROVAL' } }));
  const later = renderToStaticMarkup(React.createElement(StageBadge, { submission: { ...base, finalStatus: 'REJECTED', l1Status: 'CLEARED', l2Status: 'REJECTED', rejectionFromStatus: 'SUBMITTED' } }));
  assert.match(internal, /Internal review rejected/);
  assert.match(later, /L2 rejected/);
  assert.doesNotMatch(later, /Internal review rejected/);
});
function renderJob(submission = {}, options = {}, menuOpen = false) {
  const response = { data: [{ ...base, resume: { available: true, canDownload: true, filename: 'CV.docx' }, ...submission }], page: 1, limit: 20, total: 41, totalPages: 3, counts: { all: 41, review: 10, interviews: 20, offers: 5, closed: 6 } };
  const menu = props => React.createElement(React.Fragment, null, props.children);
  const testLoad = modules({
    swr: { __esModule: true, default: () => ({ data: response, mutate() {}, isValidating: false }) },
    'next/link': { __esModule: true, default: props => React.createElement('a', props) },
    '@/lib/ats-api': { atsApi: {} },
    '@/components/ui/button': { Button: ({ asChild, variant, size, ...props }) => React.createElement('button', props) },
    ...(menuOpen ? { '@/components/ui/dropdown-menu': {
      DropdownMenu: menu, DropdownMenuTrigger: menu, DropdownMenuContent: menu,
      DropdownMenuItem: ({ children }) => React.createElement('div', { role: 'menuitem' }, children),
    } } : {}),
    './update-submission-dialog': {}, './review-workspace': {},
  });
  const { JobSubmissions } = testLoad('components/submissions/job-submissions.tsx');
  return renderToStaticMarkup(React.createElement(JobSubmissions, { jobId: 'job', jobType: 'Full Time', market: 'IN', initialResponse: response, onSaved() {}, ...options }));
}
test('job table preserves server totals, pagination and status with a closed three-dot menu', () => {
  const html = renderJob();
  assert.match(html, /Candidate submissions \(41\)/);
  assert.match(html, /Page 1 of 3/);
  assert.match(html, /L1 scheduled/);
  assert.match(html, /aria-label="Actions for Sample Candidate"/);
  assert.match(html, /aria-haspopup="menu"/);
  assert.doesNotMatch(html, /Edit status|View details|Download resume|Submitted to Client/);
});
test('summary hides stage filters while the dedicated pipeline retains them', () => {
  assert.doesNotMatch(renderJob({}, { showStageFilters: false }), /aria-label="Submission stage"/);
  assert.match(renderJob({}, { showStageFilters: true, showBoard: true }), /aria-label="Submission stage"/);
  assert.match(renderJob({}, { showStageFilters: false }), /Page 1 of 3/);
});
test('expected full-time CTC and recruiter email replace the empty submitted-rate cell', () => {
  const html = renderJob({ submittedRate: null, expectedCompensationAmount: '1500000', compensationInputUnit: 'LPA', compensationPeriod: 'YEAR', compensationCurrency: 'INR', recruiterName: 'Riya Sharma', recruiterEmail: 'riya@example.com' });
  assert.match(html, /Expected CTC/);
  assert.match(html, /INR 15 LPA/);
  assert.match(html, /Riya Sharma/);
  assert.match(html, /riya@example.com/);
  assert.doesNotMatch(html, /Submitted rate/);
});
test('contract table shows monthly expectation instead of a separately recorded submitted rate', () => {
  const html = renderJob({ submittedRate: '99999', expectedCompensationAmount: '60000', compensationInputUnit: 'MONTH', compensationPeriod: 'MONTH', compensationCurrency: 'INR' }, { jobType: 'Contractual' });
  assert.match(html, /Expected monthly pay/);
  assert.match(html, /INR 60,000 \/ month/);
  assert.doesNotMatch(html, /99999|Expected CTC/);
});
test('international full-time expectations retain their recorded currency and annual unit', () => {
  const html = renderJob({ expectedCompensationAmount: '90000', compensationInputUnit: 'YEAR', compensationPeriod: 'YEAR', compensationCurrency: 'EUR' }, { market: 'US' });
  assert.match(html, /Expected annual compensation/);
  assert.match(html, /EUR 90,000 \/ year/);
  assert.doesNotMatch(html, /USD|INR|LPA/);
});
test('legacy annual CTC is not displayed as monthly contract pay', () => {
  const html = renderJob({ candidateExpectedCtc: '12', candidateCtcCurrency: 'INR', candidateCtcTerm: 'LPA' }, { jobType: 'Contractual' });
  assert.match(html, /Not recorded/);
  assert.match(html, /Annual amount on file/);
  assert.doesNotMatch(html, /INR 12/);
});
test('missing expectations do not borrow rate or legacy amounts from a new compensation snapshot', () => {
  const html = renderJob({ expectedCompensationAmount: null, compensationInputUnit: 'MONTH', submittedRate: '99999', candidateExpectedCtc: '88888' }, { jobType: 'Contractual' });
  assert.match(html, /Not recorded/);
  assert.match(html, /Email not provided/);
  assert.doesNotMatch(html, /99999|88888/);
});
test('the action menu retains view/download access and does not grant edit access by role name', () => {
  const readOnly = renderJob({ systemRole: 'TENANT_ADMIN' }, {}, true);
  assert.match(readOnly, /View details/);
  assert.match(readOnly, /Download resume/);
  assert.doesNotMatch(readOnly, /Edit status/);
  const permitted = renderJob({ capabilities: { schedule: true, results: {} }, resume: { available: true, canDownload: false } }, {}, true);
  assert.match(permitted, /Edit status/);
  assert.doesNotMatch(permitted, /Download resume/);
});
test('compensation formatting preserves zero/decimals and never guesses missing periods or currencies', () => {
  const { expectedSubmissionCompensation, expectedCompensationLabel } = load('lib/submission-compensation.ts');
  assert.equal(expectedSubmissionCompensation({ compensationInputUnit: 'LPA', expectedCompensationAmount: '0', compensationCurrency: 'INR' }).value, 'INR 0 LPA');
  assert.equal(expectedSubmissionCompensation({ compensationInputUnit: 'LPA', expectedCompensationAmount: '1250000.00', compensationCurrency: 'INR' }).value, 'INR 12.5 LPA');
  assert.deepEqual(expectedSubmissionCompensation({ candidateExpectedCtc: '90000', candidateCtcCurrency: 'USD' }), { value: 'Not recorded', note: 'Compensation period unavailable' });
  assert.deepEqual(expectedSubmissionCompensation({ expectedCompensationAmount: '90000.50', compensationInputUnit: 'YEAR', compensationPeriod: 'YEAR' }), { value: '90,000.5 / year', note: 'Currency not recorded' });
  assert.equal(expectedCompensationLabel(undefined, 'IN'), 'Expected compensation');
  assert.equal(expectedCompensationLabel('Unknown', 'IN'), 'Expected compensation');
});
