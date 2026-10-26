/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('lib/submission-review-navigation.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS },
}).outputText;
const mod = { exports: {} };
new Function('exports', compiled)(mod.exports);
const { submissionReviewHref, closeSubmissionReviewHref } = mod.exports;

test('review URL preserves tracker filters and returns to the tracker on close', () => {
  const href = submissionReviewHref('view=all&bucket=review&page=2', 'submission-123', true);
  assert.equal(href, '/utility/submissions?view=all&bucket=review&page=2&submission=submission-123&review=1&reviewReturn=tracker');
  assert.equal(closeSubmissionReviewHref(new URL(href, 'https://ats.example').searchParams), '/utility/submissions?view=all&bucket=review&page=2');
});

test('direct review links remain addressable and close back to submission details', () => {
  const href = submissionReviewHref('view=my&submission=old-id', 'submission-123');
  assert.equal(href, '/utility/submissions?view=my&submission=submission-123&review=1');
  assert.equal(closeSubmissionReviewHref(new URL(href, 'https://ats.example').searchParams), '/utility/submissions?view=my&submission=submission-123');
});

test('closing a standalone review URL omits an empty query string', () => {
  assert.equal(closeSubmissionReviewHref('submission=submission-123&review=1'), '/utility/submissions?submission=submission-123');
});
