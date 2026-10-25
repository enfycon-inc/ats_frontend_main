import type { RoundKey, TrackerSubmission } from './submission-contract';
import { ROUND_STATUS_LABELS, OUTCOME_LABELS, type InterviewRoundStatus, type SubmissionOutcome } from './submission-contract';
import type { SubmissionStageTone } from './status-colors';

// Labels describe workflow states, never candidate/client/role relationships.
export const ROUNDS: { key: RoundKey; label: string }[] = [
  { key: 'l1', label: 'L1' },
  { key: 'l2', label: 'L2' },
  { key: 'l3', label: 'L3' },
];
export type TrackerAction = 'rounds' | 'review' | 'schedule' | 'result' | 'reject' | 'outcome' | 'notes' | 'rate';
export function canMaintainSubmission(sub: TrackerSubmission): boolean {
  const caps = sub.capabilities;
  return Boolean(caps && (caps.review || caps.schedule || caps.outcome || Object.values(caps.results).some(Boolean)));
}

export function submissionBucket(sub: TrackerSubmission): 'review' | 'interviews' | 'offers' | 'closed' {
  if (['SELECTED', 'OFFER'].includes(sub.finalStatus)) return 'offers';
  if (['REJECTED', 'NOT_SELECTED', 'WITHDRAWN', 'JOIN'].includes(sub.finalStatus)) return 'closed';
  const started = ROUNDS.some(({ key }) => ['SCHEDULED', 'AWAITING_FEEDBACK', 'CLEARED', 'REJECTED', 'CANCELLED'].includes(sub[`${key}Status`] || '') || Boolean(sub[`${key}Date`]));
  return sub.finalStatus === 'SUBMITTED' && started ? 'interviews' : 'review';
}
export const ACTION_LABELS: Record<TrackerAction, string> = {
  rounds: 'Update submission', review: 'Review submission', schedule: 'Schedule interview', result: 'Record result',
  reject: 'Reject at current stage', outcome: 'Update status', notes: 'Edit notes', rate: 'Edit rate',
};
export function canUpdateOutcome(sub: TrackerSubmission) {
  return Boolean(sub.capabilities?.outcome && sub.finalStatus !== 'PENDING_APPROVAL');
}
export function needsOutcomeReason(sub: TrackerSubmission, outcome: string) {
  return (outcome === 'OFFER' && sub.l3Status !== 'CLEARED') ||
    (outcome === 'JOIN' && (sub.finalStatus !== 'OFFER' || sub.l3Status !== 'CLEARED'));
}
export function currentRound(sub: TrackerSubmission) {
  if (sub.currentRoundKey !== undefined) return ROUNDS.find(round => round.key === sub.currentRoundKey) ?? null;
  return ROUNDS.find(round => sub[`${round.key}Status`] !== 'CLEARED') ?? null;
}
export function canRecordResult(sub: TrackerSubmission) {
  const round = currentRound(sub);
  return Boolean(sub.finalStatus === 'SUBMITTED' && round && ['SCHEDULED', 'AWAITING_FEEDBACK'].includes(sub[`${round.key}Status`] || '') && sub[`${round.key}Date`] && Number.isFinite(new Date(sub[`${round.key}Date`]!).getTime()) && sub.capabilities?.results[round.key]);
}
export function canRejectRound(sub: TrackerSubmission) {
  const round = currentRound(sub);
  return Boolean(sub.finalStatus === 'SUBMITTED' && round && [null, 'PENDING', 'SCHEDULED', 'AWAITING_FEEDBACK'].includes(sub[`${round.key}Status`]) && sub.capabilities?.results[round.key]);
}
export function rejectionStage(sub: TrackerSubmission): string | null {
  if (!['REJECTED', 'NOT_SELECTED'].includes(sub.finalStatus)) return null;
  const rejected = ROUNDS.find(round => sub[`${round.key}Status`] === 'REJECTED');
  if (rejected) return rejected.key;
  return sub.finalStatus === 'NOT_SELECTED' ? null : sub.rejectionFromStatus === 'PENDING_APPROVAL' ? 'review' : 'final';
}
export function stage(sub: TrackerSubmission): { label: string; tone: SubmissionStageTone } {
  if (sub.finalStatus === 'PENDING_APPROVAL') return { label: 'Needs internal review', tone: 'amber' };
  if (sub.finalStatus === 'REJECTED') {
    const rejected = rejectionStage(sub);
    const round = currentRound(sub);
    const label = rejected === 'review' ? 'Internal review rejected'
      : rejected !== 'final' ? `${rejected?.toUpperCase()} rejected`
      : sub.rejectionFromStatus === 'SUBMITTED' && round && !sub[`${round.key}Date`] ? `Rejected before ${round.label}` : 'Rejected';
    return { label, tone: 'red' };
  }
  if (sub.finalStatus === 'JOIN') return { label: 'Joined', tone: 'green' };
  if (sub.finalStatus === 'OFFER') return { label: 'Offer issued', tone: 'green' };
  if (['SELECTED', 'NOT_SELECTED', 'WITHDRAWN'].includes(sub.finalStatus)) {
    const rejected = rejectionStage(sub);
    return { label: rejected ? `${rejected.toUpperCase()} rejected` : OUTCOME_LABELS[sub.finalStatus as SubmissionOutcome], tone: rejected ? 'red' : sub.finalStatus === 'SELECTED' ? 'green' : 'neutral' };
  }
  if (sub.finalStatus !== 'SUBMITTED') return { label: sub.finalStatus.replaceAll('_', ' '), tone: 'neutral' };
  const round = currentRound(sub);
  if (!round) return { label: 'Final round cleared', tone: 'green' };
  const status = sub[`${round.key}Status`];
  const label = round.label;
  if (status === 'REJECTED') return { label: `${label} rejected`, tone: 'red' };
  const roundTone: Record<(typeof ROUNDS)[number]['key'], SubmissionStageTone> = { l1: 'blue', l2: 'violet', l3: 'teal' };
  return { label: `${label} ${(ROUND_STATUS_LABELS[status as InterviewRoundStatus] || 'Pending').toLowerCase()}`, tone: status === 'CANCELLED' ? 'neutral' : roundTone[round.key] };
}
export function statusDate(sub: TrackerSubmission): { value: string; label: string } | null {
  const rejected = rejectionStage(sub);
  const round = rejected && rejected !== 'review' && rejected !== 'final'
    ? ROUNDS.find(item => item.key === rejected)
    : currentRound(sub) || (sub.finalStatus === 'SUBMITTED' ? ROUNDS[2] : null);
  if (sub.finalStatus === 'SUBMITTED' && round && ['SCHEDULED', 'AWAITING_FEEDBACK'].includes(sub[`${round.key}Status`] || '')) {
    const value = sub[`${round.key}Date`];
    return value ? { value, label: sub[`${round.key}Status`] === 'SCHEDULED' ? 'Scheduled interview' : 'Interview' } : null;
  }
  const field = round && (sub.finalStatus === 'SUBMITTED' || rejected === round.key) ? `${round.key}Status` as const : 'finalStatus';
  if (sub.finalStatus === 'PENDING_APPROVAL' || (sub.finalStatus === 'SUBMITTED' && (!round || !sub[`${round.key}Status`] || sub[`${round.key}Status`] === 'PENDING'))) return null;
  const value = sub.statusRecordedDates?.[field];
  return value ? { value, label: 'Updated' } : null;
}
export function primaryAction(sub: TrackerSubmission): TrackerAction | null {
  const caps = sub.capabilities;
  if (!caps) return null;
  if (sub.finalStatus === 'PENDING_APPROVAL') return caps.review ? 'review' : null;
  if (['REJECTED', 'JOIN', 'NOT_SELECTED', 'WITHDRAWN'].includes(sub.finalStatus)) return null;
  if (['OFFER', 'SELECTED'].includes(sub.finalStatus)) return caps.outcome ? 'outcome' : null;
  if (sub.finalStatus !== 'SUBMITTED') return null;
  const round = currentRound(sub);
  if (!round) return caps.outcome ? 'outcome' : null;
  if (sub[`${round.key}Status`] === 'REJECTED') return null;
  if (['SCHEDULED', 'AWAITING_FEEDBACK'].includes(sub[`${round.key}Status`] || '')) return canRecordResult(sub) ? 'result' : null;
  return caps.schedule ? 'schedule' : null;
}
export function validTimezone(value?: string | null): string {
  if (value) {
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return value; } catch { /* Use the device timezone when the job has none. */ }
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
export function formatInterview(date: string | null, timezone: string): string {
  if (!date || !Number.isFinite(new Date(date).getTime())) return 'Not scheduled';
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: timezone, timeZoneName: 'short' }).format(new Date(date));
}
export function localInterviewParts(date: string | null, timezone: string) {
  if (!date) return { date: '', time: '' };
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(date));
  const get = (type: string) => parts.find(part => part.type === type)?.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}
export function interviewInstant(date: string, time: string, timezone: string): string {
  const desired = `${date}T${time}`;
  const wallTime = Date.parse(`${desired}:00Z`);
  if (!Number.isFinite(wallTime)) throw new Error('Choose a valid interview date and time.');
  // Resolve the timezone offset using Intl, then check for DST gaps and folds.
  const candidates = new Set<number>();
  for (const delta of [-36, 0, 36]) {
    const probe = wallTime + delta * 3600000;
    const parts = localInterviewParts(new Date(probe).toISOString(), timezone);
    const offset = Date.parse(`${parts.date}T${parts.time}:00Z`) - probe;
    const instant = wallTime - offset;
    const resolved = localInterviewParts(new Date(instant).toISOString(), timezone);
    if (`${resolved.date}T${resolved.time}` === desired) candidates.add(instant);
  }
  if (candidates.size !== 1) throw new Error('This time is ambiguous or unavailable due to daylight saving. Choose another time.');
  return new Date([...candidates][0]).toISOString();
}
