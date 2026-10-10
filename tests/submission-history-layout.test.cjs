const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const response = { data: [
  { id: 'latest', kind: 'UPDATE', createdAt: '2026-10-10T17:28:00Z', actorName: null, details: { changes: { finalStatus: { before: 'SUBMITTED', after: 'REJECTED' }, l1Status: { before: 'PENDING', after: 'REJECTED' }, l2Status: { before: null, after: 'PENDING' }, l1Remarks: { before: 'private old remark', after: 'Candidate not responding' }, reviewFeedback: { before: null, after: 'Candidate not responding' } }, assessment: { score: 31 } } },
  { id: 'oldest', kind: 'CREATED', createdAt: '2026-10-09T11:46:00Z', actorName: 'Recruiter', details: { snapshot: { finalStatus: 'PENDING_APPROVAL' } } },
], totalPages: 2, page: 1 };
function render(layout) {
  const module = { exports: {} };
  let state = 0;
  const values = [layout, response, 1, '', 0];
  const react = { ...React, useState: () => [values[state++], () => {}], useEffect: () => {} };
  const code = ts.transpileModule(fs.readFileSync('components/submissions/submission-history.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('exports', 'require', code)(module.exports, name => {
    if (name === 'react') return react;
    if (name === '@/lib/ats-api') return { atsApi: {} };
    if (name === '@/lib/submission-tracker') return { validTimezone: () => 'UTC', formatInterview: text => text };
    if (name === '@/components/ui/button') return { Button: props => React.createElement('button', props) };
    if (name === './decision-assessment') return { DecisionAssessment: () => React.createElement('div', null, 'Assessment at decision') };
    return require(name);
  });
  return renderToStaticMarkup(React.createElement(module.exports.SubmissionHistory, { submission: {} }));
}
test('all timeline views preserve event details and omit prior values', () => {
  for (const layout of ['A', 'B', 'C']) {
    const html = render(layout);
    for (const text of ['Candidate not responding', 'Not recorded', 'Assessment at decision', 'Pending', 'Timeline layout']) {
      assert.ok(html.toLowerCase().includes(text.toLowerCase()), `${layout}: ${text}`);
    }
    assert.ok(!html.includes('Previously'));
    assert.ok(!html.includes('private old remark'));
    assert.ok(html.includes('Page 1 of 2'));
    assert.ok(html.includes(`value="${layout}" selected`));
  }
});
test('journey scrolls horizontally and expandable view opens only newest event', () => {
  assert.ok(render('B').includes('overflow-x-auto'));
  assert.ok(render('B').includes('Oldest to newest'));
  assert.ok(render('A').includes('Newest first'));
  assert.equal((render('C').match(/<details open/g) || []).length, 1);
  assert.equal((render('C').match(/<details/g) || []).length, 2);
});
test('outcomes and identical remarks appear once while distinct stage statuses remain', () => {
  for (const layout of ['A', 'B', 'C']) {
    const html = render(layout);
    assert.equal((html.match(/>Rejected</g) || []).length, 1);
    assert.equal((html.match(/Candidate not responding/g) || []).length, 1);
    assert.ok(html.includes('L1, L2 decision'));
    assert.ok(html.includes('L2 Status'));
    assert.ok(html.includes('>PENDING<'));
    assert.ok(!html.includes('Outcome:'));
  }
});
