import type { RoundKey, TrackerSubmission } from './submission-contract';

// Labels describe workflow states, never candidate/client/role relationships.
export const ROUNDS: { key: RoundKey; label: string }[] = [
  { key: 'l1', label: 'L1' },
  { key: 'l2', label: 'L2' },
  { key: 'l3', label: 'L3' },
];
export type TrackerAction = 'review' | 'schedule' | 'result' | 'outcome' | 'notes' | 'rate';
export const ACTION_LABELS: Record<TrackerAction, string> = {
  review: 'Review submission', schedule: 'Schedule interview', result: 'Record result',
  outcome: 'Update outcome', notes: 'Edit notes', rate: 'Edit rate',
};
export function currentRound(sub: TrackerSubmission) {
  if (sub.currentRoundKey !== undefined) return ROUNDS.find(round => round.key === sub.currentRoundKey) ?? null;
  return ROUNDS.find(round => sub[`${round.key}Status`] !== 'CLEARED') ?? null;
}
export function stage(sub: TrackerSubmission): { label: string; tone: 'amber' | 'blue' | 'green' | 'red' | 'neutral' } {
  if (sub.finalStatus === 'PENDING_APPROVAL') return { label: 'Needs internal review', tone: 'amber' };
  if (sub.finalStatus === 'REJECTED') return { label: 'Rejected', tone: 'red' };
  if (sub.finalStatus === 'JOIN') return { label: 'Joined', tone: 'green' };
  if (sub.finalStatus === 'OFFER') return { label: 'Offer issued', tone: 'green' };
  if (sub.finalStatus !== 'SUBMITTED') return { label: sub.finalStatus.replaceAll('_', ' '), tone: 'neutral' };
  const round = currentRound(sub);
  if (!round) return { label: 'Final round cleared', tone: 'green' };
  const status = sub[`${round.key}Status`];
  const label = round.label;
  if (status === 'REJECTED') return { label: `${label} rejected`, tone: 'red' };
  return { label: `${label} ${status === 'SCHEDULED' ? 'scheduled' : 'pending'}`, tone: status === 'SCHEDULED' ? 'blue' : 'amber' };
}
export function primaryAction(sub: TrackerSubmission): TrackerAction | null {
  const caps = sub.capabilities;
  if (!caps) return null;
  if (sub.finalStatus === 'PENDING_APPROVAL') return caps.review ? 'review' : null;
  if (['REJECTED', 'JOIN'].includes(sub.finalStatus)) return null;
  if (sub.finalStatus === 'OFFER') return caps.outcome ? 'outcome' : null;
  if (sub.finalStatus !== 'SUBMITTED') return null;
  const round = currentRound(sub);
  if (!round) return caps.outcome ? 'outcome' : null;
  if (sub[`${round.key}Status`] === 'REJECTED') return null;
  if (sub[`${round.key}Status`] === 'SCHEDULED') return caps.results[round.key] ? 'result' : null;
  return caps.schedule || caps.results[round.key] ? 'schedule' : null;
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
