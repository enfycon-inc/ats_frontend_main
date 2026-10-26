/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function render(automaticInternalReview) {
  const event = { id: 'created', kind: 'CREATED', createdAt: '2026-10-26T08:00:00Z', actorName: 'Staff',
    details: { automaticInternalReview, snapshot: { finalStatus: automaticInternalReview ? 'SUBMITTED' : 'PENDING_APPROVAL' } } };
  let state = 0;
  const values = [{ data: [event], page: 1, totalPages: 1 }, 1, '', 0, { created: true }];
  const react = { ...React, useState: () => [values[state++], () => {}], useEffect: () => {} };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('components/submissions/submission-history.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('exports', 'require', code)(module.exports, name => {
    if (name === 'react') return react;
    if (name === '@/lib/ats-api') return { atsApi: {} };
    if (name === '@/lib/submission-tracker') return { validTimezone: () => 'UTC' };
    if (name === '@/lib/submission-contract') return { ROUND_STATUS_LABELS: {}, OUTCOME_LABELS: {} };
    if (name === '@/lib/submission-compensation') return { compensationLabel: value => String(value), formatRecordedCompensation: value => String(value) };
    if (name === '@/components/ui/button') return { Button: ({ children }) => React.createElement('button', null, children) };
    if (name === '@/components/ui/avatar') return { Avatar: ({ children }) => React.createElement('span', null, children), AvatarImage: () => null, AvatarFallback: ({ children }) => React.createElement('span', null, children) };
    if (name === './decision-assessment') return { DecisionAssessment: () => null };
    return require(name);
  });
  return renderToStaticMarkup(React.createElement(module.exports.SubmissionHistory, { submission: { id: 'submission' } }));
}

test('history identifies automatic approval and the role used without claiming manual review', () => {
  const html = render({ mode: 'AUTO_PERMISSION', permission: 'submission:auto_approve_internal_review', activeRoleId: 'role', activeRoleName: 'Account Manager' });
  assert.match(html, /internal review automatically approved/);
  assert.match(html, /Account Manager/);
  assert.match(html, /candidate entered L1 pending/);
  assert.match(html, /No manual review decision was recorded/);
});

test('ordinary submissions do not gain an automatic approval label', () => {
  const html = render(undefined);
  assert.match(html, /Submission created/);
  assert.doesNotMatch(html, /automatically approved/);
});
