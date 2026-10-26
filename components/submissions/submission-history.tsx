"use client";

import { Fragment, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronDown, FileText, Pencil, XCircle } from 'lucide-react';
import { atsApi } from '@/lib/ats-api';
import type { SubmissionHistoryEvent, SubmissionHistoryResponse, TrackerSubmission } from '@/lib/submission-contract';
import { ROUND_STATUS_LABELS, OUTCOME_LABELS, type InterviewRoundStatus, type SubmissionOutcome } from '@/lib/submission-contract';
import { validTimezone } from '@/lib/submission-tracker';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DecisionAssessment } from './decision-assessment';
import { compensationLabel, formatRecordedCompensation } from '@/lib/submission-compensation';

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
function isCalendarColorField(field: string) {
  return /^l[123]Color$/.test(field);
}
function activity(event: SubmissionHistoryEvent) {
  if (event.kind === 'BASELINE') return 'Existing record captured';
  if (event.kind === 'CREATED') return event.details.automaticInternalReview ? 'Submission created · internal review automatically approved' : 'Submission created';
  const changes = event.details.changes || {};
  const names: string[] = [];
  if (changes.finalStatus) names.push(changes.finalStatus.before === 'PENDING_APPROVAL' && changes.finalStatus.after === 'SUBMITTED' ? 'Submission approved' : statusLabel(changes.finalStatus.after || '') || 'Final status updated');
  for (const key of ['l1', 'l2', 'l3']) {
    const status = changes[`${key}Status`];
    const date = changes[`${key}Date`];
    if (date?.before && date.after && date.before !== date.after) names.push(`${key.toUpperCase()} interview rescheduled`);
    else if (status) names.push(`${key.toUpperCase()} ${status.after === 'SCHEDULED' || status.after === 'CANCELLED' ? 'interview ' : ''}${statusLabel(status.after || 'PENDING').toLowerCase()}`);
    else if (date) names.push(`${key.toUpperCase()} interview ${date.after == null ? 'appointment removed' : date.before ? 'rescheduled' : 'scheduled'}`);
    else if (Object.keys(changes).some(field => field.startsWith(key))) names.push(`${key.toUpperCase()} details updated`);
  }
  if (event.details.correctionReason) return names.length ? `${names.join(' · ')} (correction)` : 'Submission corrected';
  return names.join(' · ') || 'Submission details updated';
}
function presentation(event: SubmissionHistoryEvent) {
  if (event.details.automaticInternalReview) return { Icon: CheckCircle2, color: 'text-green-700 dark:text-green-400' };
  const values = Object.entries(event.details.changes || {}).filter(([field]) => field.endsWith('Status')).map(([, change]) => change.after);
  if (event.details.correctionReason) return { Icon: Pencil, color: 'text-amber-600 dark:text-amber-400' };
  if (values.includes('OFFER')) return { Icon: FileText, color: 'text-green-700 dark:text-green-400' };
  if (Object.entries(event.details.changes || {}).some(([field, change]) => /^l[123]Date$/.test(field) && change.before && change.after)) return { Icon: CalendarDays, color: 'text-amber-600 dark:text-amber-400' };
  if (values.some(value => ['REJECTED', 'NOT_SELECTED', 'WITHDRAWN'].includes(value || ''))) return { Icon: XCircle, color: 'text-red-600 dark:text-red-400' };
  if (values.some(value => ['CLEARED', 'SELECTED', 'OFFER', 'JOIN', 'SUBMITTED'].includes(value || ''))) return { Icon: CheckCircle2, color: 'text-green-700 dark:text-green-400' };
  if (Object.keys(event.details.changes || {}).some(field => /^l[123](Date|Status)$/.test(field))) return { Icon: CalendarDays, color: 'text-[#1a4fa0] dark:text-blue-300' };
  return { Icon: FileText, color: 'text-muted-foreground' };
}
const compensationMetadata = new Set(['compensationCurrency', 'compensationPeriod', 'compensationInputUnit']);
const compensationAmounts = new Set(['currentCompensationAmount', 'expectedCompensationAmount']);
function EventDetails({ event, zone, jobType }: { event: SubmissionHistoryEvent; zone: string; jobType?: string | null }) {
  const snapshotValues = event.details.snapshot || {};
  const contextValue = (field: string, side: 'before' | 'after') => {
    const change = event.details.changes?.[field];
    return change ? change[side] : snapshotValues[field];
  };
  const fieldLabel = (field: string) => compensationAmounts.has(field)
    ? compensationLabel(field === 'expectedCompensationAmount', jobType, contextValue('compensationPeriod', 'after')) : label(field);
  const fieldValue = (field: string, value: string | null, side: 'before' | 'after' = 'after') => compensationAmounts.has(field)
    ? formatRecordedCompensation(value, contextValue('compensationCurrency', side), contextValue('compensationPeriod', side))
    : formatValue(field, value, zone);
  const changes = Object.entries(event.details.changes || {}).filter(([field]) => !isCalendarColorField(field) && !compensationMetadata.has(field));
  const snapshot = Object.entries(event.details.snapshot || {}).filter(([field, value]) => !isCalendarColorField(field) && !compensationMetadata.has(field) && value != null);
  return <div className="space-y-3 rounded-lg bg-blue-50/70 px-5 py-4 dark:bg-blue-950/30">
    {event.details.automaticInternalReview && <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs dark:bg-blue-950/30">Internal review was automatically approved at submission using {event.details.automaticInternalReview.activeRoleName || 'the active role'} permissions. The candidate entered L1 pending. No manual review decision was recorded.</p>}
    {event.kind === 'BASELINE' && <p className="text-xs text-muted-foreground">Earlier updates are unavailable. This captures the existing record, not when its decisions were made.</p>}
    {changes.length > 0 && <dl className="space-y-3">{changes.filter(([field, change]) => !(/remarks|feedback/i.test(field) && change.after && [event.details.bypassReason, event.details.correctionReason].includes(change.after))).map(([field, change]) => <div key={field} className="grid grid-cols-[100px_1fr] gap-4 text-xs sm:grid-cols-[120px_1fr]"><dt className="font-semibold text-slate-600 dark:text-slate-300">{/Status$/.test(field) && changes.filter(([name]) => /Status$/.test(name)).length === 1 ? 'Status' : fieldLabel(field)}</dt><dd className="whitespace-pre-wrap [overflow-wrap:anywhere]"><span className="text-muted-foreground">{fieldValue(field, change.before, 'before')}</span><span aria-label="changed to"> → </span>{fieldValue(field, change.after)}</dd></div>)}</dl>}
    {snapshot.length > 0 && <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{snapshot.map(([field, value]) => <div key={field} className="min-w-0 text-xs"><dt className="text-[10.5px] text-muted-foreground">{fieldLabel(field)}</dt><dd className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{fieldValue(field, value)}</dd></div>)}</dl>}
    {event.details.bypassReason && <div className="grid grid-cols-[100px_1fr] gap-4 text-xs sm:grid-cols-[120px_1fr]"><span className="font-semibold text-slate-600 dark:text-slate-300">Reason</span><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{event.details.bypassReason}</p></div>}
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
    }).then(data => { if (active && data) { setResponse(data); setExpanded(data.data[0] ? {[data.data[0].id]: true} : {}); } })
      .catch(() => { if (active) setError('Unable to load submission history.'); });
    return () => { active = false; };
  }, [submission.id, submission.updatedAt, page, revision]);
  const zone = validTimezone(submission.timezone);
  return <section className="w-full overflow-hidden rounded-xl border border-border bg-card" aria-label="Submission history">
    <div className="border-b border-border px-5 py-4"><h2 className="text-lg font-bold">Submission history</h2><p className="mt-1 text-sm text-muted-foreground">{submission.candidateName || 'Candidate'} · {submission.jobTitle || submission.jobCode || 'Submission'}</p><p className="mt-1 text-[10.5px] text-muted-foreground">Newest first · All times in {zone}</p></div>
    {error ? <div role="alert" className="p-5 text-xs">{error}<Button variant="outline" className="ml-2 text-xs" onClick={() => setRevision(r => r + 1)}>Retry</Button></div> : !response ? <p role="status" className="p-5 text-xs text-muted-foreground">Loading history…</p> : <>
      {!response.data.length ? <p className="p-5 text-xs text-muted-foreground">No history recorded.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] table-fixed text-sm"><caption className="sr-only">Submission audit history, newest first. Expand a row to view all recorded changes.</caption><colgroup><col className="w-36 sm:w-44" /><col className="w-64 sm:w-[560px]" /><col className="w-56 sm:w-64" /><col /></colgroup><thead className="bg-muted/40"><tr className="text-left text-xs normal-case text-muted-foreground"><th scope="col" className="px-5 py-3">When ({zone})</th><th scope="col" className="px-3 py-3">Activity</th><th scope="col" className="px-3 py-3">Changed by</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead><tbody>{response.data.map(event => {
        const {date, time} = dateParts(event.createdAt, zone);
        const {Icon, color} = presentation(event);
        const changes = event.details.changes || {};
        const dateChange = Object.entries(changes).find(([field]) => /^l[123]Date$/.test(field));
        // Before/after values belong in expanded audit details only.
        const summary = dateChange?.[1].after ? `Interview: ${formatValue(dateChange[0], dateChange[1].after, zone)}` : null;
        const open = Boolean(expanded[event.id]);
        const detailsId = `submission-history-${submission.id}-${event.id}`;
        return <Fragment key={event.id}><tr className="border-t border-border hover:bg-muted/20"><td className="px-5 py-4 align-top"><time dateTime={event.createdAt}><span className="block font-medium">{date}</span><span className="mt-1 block whitespace-nowrap tabular-nums text-muted-foreground">{time}</span></time></td><td className="px-3 py-4 align-top"><div className="flex items-start gap-2"><Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} /><div className="min-w-0"><p className="font-semibold [overflow-wrap:anywhere]">{activity(event)}</p>{summary && <p className="mt-1 text-[10.5px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">{summary}</p>}</div></div></td><td className="px-3 py-4 align-top [overflow-wrap:anywhere]">{<div className="flex items-start gap-2.5"><Avatar className="h-8 w-8"><AvatarImage src={event.actorAvatar || undefined} alt="" /><AvatarFallback className="bg-blue-50 text-[10.5px] font-semibold text-[#1a4fa0] dark:bg-blue-950 dark:text-blue-200">{event.actorName?.split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join('').toUpperCase() || '?'}</AvatarFallback></Avatar><div className="min-w-0"><p className="font-medium">{event.actorName || 'Name not recorded'}</p><p className="mt-1 text-[10.5px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">{event.actorEmail || 'Email not recorded'}</p></div></div>}</td><td className="px-2 py-3 text-right align-top"><Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-expanded={open} aria-controls={open ? detailsId : undefined} aria-label={`${open ? 'Hide' : 'Show'} details: ${activity(event)} at ${date}, ${time}`} onClick={() => setExpanded(previous => ({...previous, [event.id]: !open}))}><ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} /></Button></td></tr>{open && <tr id={detailsId}><td colSpan={4} className="px-5 pb-4"><EventDetails event={event} zone={zone} jobType={submission.jobType} /></td></tr>}</Fragment>;
      })}</tbody></table></div>}
      {response.totalPages > 1 && <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs"><Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {response.page} of {response.totalPages}</span><Button type="button" variant="outline" disabled={page >= response.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button></div>}
    </>}
  </section>;
}
