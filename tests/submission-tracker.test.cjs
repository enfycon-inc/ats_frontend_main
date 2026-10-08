const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('lib/submission-tracker.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS },
}).outputText)(mod.exports);
const { stage, primaryAction, canRejectRound, canRecordResult, rejectionStage, canUpdateOutcome, needsOutcomeReason, interviewInstant, localInterviewParts } = mod.exports;
const base = {
  finalStatus: 'SUBMITTED', l1Status: 'PENDING', l2Status: null, l3Status: null,
  capabilities: { review: false, schedule: false, results: { l1: false, l2: false, l3: false }, outcome: false },
};
test('rejection identifies internal review, pre-interview and interview decisions without remark inference', () => {
  const rejected = { ...base, finalStatus: 'REJECTED' };
  assert.equal(rejectionStage({ ...rejected, rejectionFromStatus: 'PENDING_APPROVAL' }), 'review');
  assert.equal(stage({ ...rejected, rejectionFromStatus: 'PENDING_APPROVAL' }).label, 'Internal review rejected');
  assert.equal(rejectionStage({ ...rejected, rejectionFromStatus: 'SUBMITTED' }), 'final');
  assert.equal(stage({ ...rejected, rejectionFromStatus: 'SUBMITTED' }).label, 'Rejected before L1');
  assert.equal(rejectionStage({ ...rejected, l1Status: 'REJECTED' }), 'l1');
  assert.equal(stage({ ...rejected, l1Status: 'CLEARED', l2Status: 'REJECTED' }).label, 'L2 rejected');
  assert.equal(stage({ ...rejected, reviewFeedback: 'approved' }).label, 'Rejected');
});
test('results require a persisted scheduled interview and active round permission', () => {
  const sub = { ...base, capabilities: { ...base.capabilities, results: { l1: true, l2: false, l3: false } } };
  assert.equal(canRecordResult(sub), false);
  assert.equal(primaryAction(sub), null);
  const scheduled = { ...sub, l1Status: 'SCHEDULED', l1Date: '2026-10-09T05:30:00Z' };
  assert.equal(canRecordResult(scheduled), true);
  assert.equal(primaryAction(scheduled), 'result');
  assert.equal(canRecordResult({ ...scheduled, l1Date: null }), false);
  assert.equal(canRecordResult({ ...scheduled, l1Date: 'invalid' }), false);
  assert.equal(canRecordResult({ ...sub, finalStatus: 'PENDING_APPROVAL' }), false);
  assert.equal(canRecordResult({ ...sub, finalStatus: 'REJECTED' }), false);
  assert.equal(canRecordResult({ ...sub, l1Status: 'CLEARED' }), false);
});
test('internal review is distinct from screening and blocks interview actions', () => {
  const sub = { ...base, finalStatus: 'PENDING_APPROVAL', capabilities: { ...base.capabilities, schedule: true } };
  assert.equal(stage(sub).label, 'Needs internal review');
  assert.equal(primaryAction(sub), null);
  sub.capabilities.review = true;
  assert.equal(primaryAction(sub), 'review');
});
test('current pending rounds can be rejected without exposing selected results', () => {
  for (const round of ['l1', 'l2', 'l3']) {
    const sub = { ...base, l1Status: round === 'l1' ? 'PENDING' : 'CLEARED', l2Status: round === 'l3' ? 'CLEARED' : 'PENDING', capabilities: { ...base.capabilities, results: { l1: true, l2: true, l3: true } } };
    assert.equal(canRejectRound(sub), true);
    assert.equal(canRecordResult(sub), false);
    assert.equal(canRejectRound({ ...sub, finalStatus: 'REJECTED' }), false);
    assert.equal(canRejectRound({ ...sub, finalStatus: 'PENDING_APPROVAL' }), false);
    assert.equal(canRejectRound({ ...sub, capabilities: base.capabilities }), false);
  }
});
test('a scheduler can schedule but cannot record an interview result', () => {
  const sub = { ...base, capabilities: { ...base.capabilities, schedule: true } };
  assert.equal(primaryAction(sub), 'schedule');
  assert.equal(primaryAction({ ...sub, l1Status: 'SCHEDULED' }), null);
});
test('each result requires the permission for the active round', () => {
  const caps = { ...base.capabilities, results: { l1: true, l2: false, l3: false } };
  assert.equal(primaryAction({ ...base, l1Status: 'SCHEDULED', l1Date: '2026-10-09T05:30:00Z', capabilities: caps }), 'result');
  assert.equal(primaryAction({ ...base, l1Status: 'CLEARED', l2Status: 'SCHEDULED', capabilities: caps }), null);
});
test('final round clearance is not an issued offer', () => {
  const sub = { ...base, l1Status: 'CLEARED', l2Status: 'CLEARED', l3Status: 'CLEARED', capabilities: { ...base.capabilities, outcome: true } };
  assert.equal(stage(sub).label, 'Final round cleared');
  assert.equal(primaryAction(sub), 'outcome');
  assert.equal(stage({ ...sub, finalStatus: 'OFFER' }).label, 'Offer issued');
});
test('closed, unknown and permissionless records never expose mutation actions', () => {
  for (const finalStatus of ['REJECTED', 'JOIN', 'LEGACY_UNKNOWN']) assert.equal(primaryAction({ ...base, finalStatus }), null);
  assert.equal(primaryAction({ ...base, capabilities: undefined }), null);
});
test('job timezone produces correct UTC timestamps rather than browser-local guesses', () => {
  assert.equal(interviewInstant('2026-10-09', '11:00', 'Asia/Kolkata'), '2026-10-09T05:30:00.000Z');
  assert.equal(interviewInstant('2026-10-09', '11:00', 'America/New_York'), '2026-10-09T15:00:00.000Z');
  assert.deepEqual(localInterviewParts('2026-10-09T05:30:00.000Z', 'Asia/Kolkata'), { date: '2026-10-09', time: '11:00' });
});
test('daylight-saving gaps and duplicated times cannot silently schedule the wrong instant', () => {
  assert.throws(() => interviewInstant('2026-03-08', '02:30', 'America/New_York'), /daylight saving/);
  assert.throws(() => interviewInstant('2026-11-01', '01:30', 'America/New_York'), /daylight saving/);
});

test('outcome updates are available independently from the current interview', () => {
  const sub = { ...base, capabilities: { ...base.capabilities, outcome: true, schedule: true } };
  assert.equal(primaryAction(sub), 'schedule');
  assert.equal(canUpdateOutcome(sub), true);
  assert.equal(needsOutcomeReason(sub, 'JOIN'), true);
  assert.equal(canUpdateOutcome({ ...sub, finalStatus: 'PENDING_APPROVAL' }), false);
  assert.equal(canUpdateOutcome({ ...sub, finalStatus: 'JOIN' }), false);
  assert.equal(canUpdateOutcome({ ...sub, capabilities: { ...sub.capabilities, outcome: false } }), false);
  assert.equal(needsOutcomeReason({ ...sub, finalStatus: 'OFFER', l3Status: 'CLEARED' }, 'JOIN'), false);
});
