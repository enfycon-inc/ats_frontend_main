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
test('job table renders server totals, pagination, shared status and scoped actions', () => {
  const response = { data: [{ ...base, resume: { available: true, canDownload: true, filename: 'CV.docx' } }], page: 1, limit: 20, total: 41, totalPages: 3, counts: { all: 41, review: 10, interviews: 20, offers: 5, closed: 6 } };
  const testLoad = modules({
    swr: { __esModule: true, default: () => ({ data: response, mutate() {}, isValidating: false }) },
    'next/link': { __esModule: true, default: props => React.createElement('a', props) },
    '@/lib/ats-api': { atsApi: {} },
    '@/components/ui/button': { Button: ({ asChild, variant, ...props }) => React.createElement('button', props) },
    '@/components/ui/dropdown-menu': { DropdownMenuItem: props => React.createElement('div', props) },
    './update-submission-dialog': {}, './review-workspace': {},
  });
  const { JobSubmissions } = testLoad('components/submissions/job-submissions.tsx');
  const html = renderToStaticMarkup(React.createElement(JobSubmissions, { jobId: 'job', initialResponse: response, onSaved() {} }));
  assert.match(html, /Candidate submissions \(41\)/);
  assert.match(html, /Page 1 of 3/);
  assert.match(html, /L1 scheduled/);
  assert.match(html, /Download resume/);
  assert.match(html, /View details/);
  assert.doesNotMatch(html, /Edit status|Submitted to Client/);
});
