"use client";

import { Fragment, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronDown, FileText, Pencil, XCircle } from 'lucide-react';
import { atsApi } from '@/lib/ats-api';
import type { SubmissionHistoryEvent, SubmissionHistoryResponse, TrackerSubmission } from '@/lib/submission-contract';
import { ROUND_STATUS_LABELS, OUTCOME_LABELS, type InterviewRoundStatus, type SubmissionOutcome } from '@/lib/submission-contract';
import { validTimezone } from '@/lib/submission-tracker';
import { Button } from '@/components/ui/button';
import { DecisionAssessment } from './decision-assessment';

function statusLabel(value: string) {
  return ROUND_STATUS_LABELS[value as InterviewRoundStatus] || OUTCOME_LABELS[value as SubmissionOutcome] ||
    ({ PENDING_APPROVAL: 'Awaiting internal approval', REJECTED: 'Rejected' } as Record<string, string>)[value] ||
    value.replaceAll('_', ' ').toLowerCase().replace(/^./, character => character.toUpperCase());
}
function label(field: string) {
  const labels: Record<string, string> = { finalStatus: 'Final status', podLeadRemarks: 'Internal review remarks', reviewFeedback: 'Review feedback', recruiterComment: 'Recruiter notes', submittedRateAmount: 'Submitted rate', currentCompensationAmount: 'Current compensation', expectedCompensationAmount: 'Expected compensation' };
  return labels[field] || field.replace(/^l([123])/, 'L$1 ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, character => character.toUpperCase());
}
function dateParts(value: string, zone: string) {
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return { date: 'Date unavailable', time: '' };
  return {
    date: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: zone }).format(instant),
    time: new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: zone }).format(instant).toUpperCase(),
  };
}
function formatValue(field: string, value: string | null, zone: string) {
  if (value == null || value === '') return 'Not recorded';
  if (/Date$|At$/.test(field)) { const parts = dateParts(value, zone); return `${parts.date}${parts.time ? ', ' + parts.time : ''}`; }
  if (/Status$/.test(field)) return statusLabel(value);
  return value;
}
function activity(event: SubmissionHistoryEvent) {
  if (event.kind === 'BASELINE') return 'Existing record captured';
  if (event.kind === 'CREATED') return 'Submission created';
  const changes = event.details.changes || {};
  const names: string[] = [];
  if (changes.finalStatus) names.push(changes.finalStatus.before === 'PENDING_APPROVAL' && changes.finalStatus.after === 'SUBMITTED' ? 'Submission approved' : statusLabel(changes.finalStatus.after || '') || 'Final status updated');
  for (const key of ['l1', 'l2', 'l3']) {
    const status = changes[`${key}Status`];
    const date = changes[`${key}Date`];
    if (status) names.push(`${key.toUpperCase()} ${status.after === 'SCHEDULED' || status.after === 'CANCELLED' ? 'interview ' : ''}${statusLabel(status.after || 'PENDING').toLowerCase()}`);
    else if (date) names.push(`${key.toUpperCase()} interview ${date.after == null ? 'appointment removed' : date.before ? 'rescheduled' : 'scheduled'}`);
    else if (Object.keys(changes).some(field => field.startsWith(key))) names.push(`${key.toUpperCase()} details updated`);
  }
  if (event.details.correctionReason) return names.length ? `${names.join(' · ')} (correction)` : 'Submission corrected';
  return names.join(' · ') || 'Submission details updated';
}
function presentation(event: SubmissionHistoryEvent) {
  const values = Object.entries(event.details.changes || {}).filter(([field]) => field.endsWith('Status')).map(([, change]) => change.after);
  if (event.details.correctionReason) return { Icon: Pencil, color: 'text-amber-600 dark:text-amber-400' };
  if (values.some(value => ['REJECTED', 'NOT_SELECTED', 'WITHDRAWN'].includes(value || ''))) return { Icon: XCircle, color: 'text-red-600 dark:text-red-400' };
  if (values.some(value => ['CLEARED', 'SELECTED', 'OFFER', 'JOIN', 'SUBMITTED'].includes(value || ''))) return { Icon: CheckCircle2, color: 'text-green-700 dark:text-green-400' };
  if (Object.keys(event.details.changes || {}).some(field => /^l[123](Date|Status)$/.test(field))) return { Icon: CalendarDays, color: 'text-[#1a4fa0] dark:text-blue-300' };
  return { Icon: FileText, color: 'text-muted-foreground' };
}
function EventDetails({ event, zone }: { event: SubmissionHistoryEvent; zone: string }) {
  const changes = Object.entries(event.details.changes || {});
  const snapshot = Object.entries(event.details.snapshot || {}).filter(([, value]) => value != null);
  return <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
    {event.kind === 'BASELINE' && <p className="text-xs text-muted-foreground">Earlier updates are unavailable. This captures the existing record, not when its decisions were made.</p>}
    {changes.length > 0 && <table className="w-full table-fixed text-xs"><caption className="sr-only">All changes recorded in this save</caption><thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground"><th className="w-1/4 pb-2 font-semibold">Field</th><th className="pb-2 font-semibold">Previous</th><th className="pb-2 font-semibold">New value</th></tr></thead><tbody>{changes.map(([field, change]) => <tr key={field} className="border-t border-border"><th scope="row" className="py-2 pr-3 text-left align-top font-medium [overflow-wrap:anywhere]">{label(field)}</th><td className="whitespace-pre-wrap py-2 pr-3 align-top text-muted-foreground [overflow-wrap:anywhere]">{formatValue(field, change.before, zone)}</td><td className="whitespace-pre-wrap py-2 align-top [overflow-wrap:anywhere]">{formatValue(field, change.after, zone)}</td></tr>)}</tbody></table>}
    {snapshot.length > 0 && <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{snapshot.map(([field, value]) => <div key={field} className="min-w-0 text-xs"><dt className="text-[10.5px] text-muted-foreground">{label(field)}</dt><dd className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{formatValue(field, value, zone)}</dd></div>)}</dl>}
    {event.details.bypassReason && <p className="whitespace-pre-wrap text-xs [overflow-wrap:anywhere]"><strong>Reason: </strong>{event.details.bypassReason}</p>}
    {event.details.correctionReason && <p className="whitespace-pre-wrap text-xs [overflow-wrap:anywhere]"><strong>Correction reason: </strong>{event.details.correctionReason}</p>}
    {event.details.resetFollowingRounds && <p className="text-xs text-muted-foreground">Later rounds were reset. Their previous values remain recorded above.</p>}
    {event.details.assessment && <DecisionAssessment assessment={event.details.assessment} overrides={event.details.reviewOverrides} />}
    {!changes.length && !snapshot.length && !event.details.assessment && <p className="text-xs text-muted-foreground">No additional field details were recorded.</p>}
  </div>;
}
export function SubmissionHistory({ submission }: { submission: TrackerSubmission }) {
  const [response, setResponse] = useState<SubmissionHistoryResponse | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setResponse(null); setError('');
      return atsApi.submissions.history(submission.id, page, 'desc');
    }).then(data => { if (active && data) setResponse(data); })
      .catch(() => { if (active) setError('Unable to load submission history.'); });
    return () => { active = false; };
  }, [submission.id, submission.updatedAt, page, revision]);
  const zone = validTimezone(submission.timezone);
  return <section className="overflow-hidden rounded-xl border border-border bg-card" aria-label="Submission history">
    <div className="border-b border-border px-5 py-4"><h2 className="text-sm font-bold">Submission history</h2><p className="mt-1 text-[10.5px] text-muted-foreground">Newest first · All times in {zone}</p></div>
    {error ? <div role="alert" className="p-5 text-xs">{error}<Button variant="outline" className="ml-2 text-xs" onClick={() => setRevision(r => r + 1)}>Retry</Button></div> : !response ? <p role="status" className="p-5 text-xs text-muted-foreground">Loading history…</p> : <>
      {!response.data.length ? <p className="p-5 text-xs text-muted-foreground">No history recorded.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[520px] table-fixed text-xs"><caption className="sr-only">Submission audit history, newest first. Expand a row to view all recorded changes.</caption><colgroup><col className="w-36 sm:w-44" /><col /><col className="w-28 sm:w-40" /><col className="w-12" /></colgroup><thead className="bg-muted/40"><tr className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground"><th scope="col" className="px-5 py-3">When</th><th scope="col" className="px-3 py-3">Activity</th><th scope="col" className="px-3 py-3">Changed by</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead><tbody>{response.data.map(event => {
        const {date, time} = dateParts(event.createdAt, zone);
        const {Icon, color} = presentation(event);
        const changes = event.details.changes || {};
        const statusChange = Object.entries(changes).find(([field]) => field.endsWith('Status'));
        const dateChange = Object.entries(changes).find(([field]) => /^l[123]Date$/.test(field));
        const summary = statusChange ? `${formatValue(statusChange[0], statusChange[1].before, zone)} → ${formatValue(statusChange[0], statusChange[1].after, zone)}` : dateChange ? `${dateChange[1].before ? 'From ' + formatValue(dateChange[0], dateChange[1].before, zone) + ' → ' : 'Interview: '}${formatValue(dateChange[0], dateChange[1].after, zone)}` : event.details.correctionReason || event.details.bypassReason;
        const open = Boolean(expanded[event.id]);
        const detailsId = `submission-history-${submission.id}-${event.id}`;
        return <Fragment key={event.id}><tr className="border-t border-border hover:bg-muted/20"><td className="px-5 py-4 align-top"><time dateTime={event.createdAt}><span className="block font-medium">{date}</span><span className="mt-1 block whitespace-nowrap tabular-nums text-muted-foreground">{time}</span></time></td><td className="px-3 py-4 align-top"><div className="flex items-start gap-2"><Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} /><div className="min-w-0"><p className="font-semibold [overflow-wrap:anywhere]">{activity(event)}</p>{summary && <p className="mt-1 text-[10.5px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">{summary}</p>}</div></div></td><td className="px-3 py-4 align-top [overflow-wrap:anywhere]">{event.actorName || 'Not recorded'}</td><td className="px-2 py-3 align-top"><Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-expanded={open} aria-controls={open ? detailsId : undefined} aria-label={`${open ? 'Hide' : 'Show'} details: ${activity(event)} at ${date}, ${time}`} onClick={() => setExpanded(previous => ({...previous, [event.id]: !open}))}><ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} /></Button></td></tr>{open && <tr id={detailsId}><td colSpan={4} className="px-5 pb-4"><EventDetails event={event} zone={zone} /></td></tr>}</Fragment>;
      })}</tbody></table></div>}
      {response.totalPages > 1 && <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs"><Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {response.page} of {response.totalPages}</span><Button type="button" variant="outline" disabled={page >= response.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button></div>}
    </>}
  </section>;
}
