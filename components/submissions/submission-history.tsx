"use client";
import { useEffect, useState } from 'react';
import { atsApi } from '@/lib/ats-api';
import type { SubmissionHistoryEvent, SubmissionHistoryResponse, TrackerSubmission } from '@/lib/submission-contract';
import { formatInterview, validTimezone } from '@/lib/submission-tracker';
import { Button } from '@/components/ui/button';
import { DecisionAssessment } from './decision-assessment';

function label(field: string) {
  if (field === 'podLeadRemarks') return 'Internal Review Remarks';
  if (/^l[123]Date$/.test(field)) return `${field.slice(0, 2).toUpperCase()} interview time`;
  return field.replace(/^l([123])/, 'L$1 ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
}
function title(event: SubmissionHistoryEvent) {
  if (event.kind === 'BASELINE') return 'Existing state captured — earlier updates unavailable';
  if (event.kind === 'CREATED') return 'Submission created';
  const changes = event.details.changes || {};
  const stages = ['l1', 'l2', 'l3'].filter(stage => Object.keys(changes).some(field => field.startsWith(stage)));
  return stages.length ? `${stages.map(stage => stage.toUpperCase()).join(', ')} decision` : changes.finalStatus ? 'Submission decision' : 'Submission updated';
}
function eventStatus(event: SubmissionHistoryEvent) {
  const changes = event.details.changes || {};
  return changes.finalStatus?.after || changes.l3Status?.after || changes.l2Status?.after || changes.l1Status?.after || event.details.snapshot?.finalStatus;
}
function eventTone(event: SubmissionHistoryEvent) {
  const status = eventStatus(event);
  return status?.includes('REJECT') ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200' : ['JOIN', 'SELECTED', 'APPROVED'].includes(status || '') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200';
}
function EventDetails({ event, zone, showAssessment = true }: { event: SubmissionHistoryEvent; zone: string; showAssessment?: boolean }) {
  const fields = Object.entries(event.details.changes || {}).map(([field, change]) => [field, change.after] as const);
  const snapshots = Object.entries(event.details.snapshot || {}).filter(([, text]) => text != null);
  const seenRemarks = new Set<string>();
  const visible = [...fields, ...snapshots].filter(([field, text]) => {
    if (/Status$/.test(field) && text === eventStatus(event)) return false;
    if (/remarks|feedback/i.test(field) && text?.trim()) {
      const normalized = text.trim().toLowerCase();
      if (seenRemarks.has(normalized)) return false;
      seenRemarks.add(normalized);
    }
    return true;
  });
  return <div className="min-w-0 flex-1">
    <dl className="flex flex-wrap gap-x-6 gap-y-3 text-xs">{visible.map(([field, text]) => <div key={field} className="min-w-0 max-w-full"><dt className="mb-1 text-[10.5px] text-muted-foreground">{label(field)}</dt><dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{!text ? '—' : field.endsWith('Date') ? formatInterview(text, zone) : /Status$/.test(field) ? text.replaceAll('_', ' ') : text}</dd></div>)}</dl>
    {event.details.bypassReason && <p className="mt-3 whitespace-pre-wrap text-xs"><span className="font-semibold">Bypass reason: </span>{event.details.bypassReason}</p>}
    {showAssessment && event.details.assessment && <DecisionAssessment assessment={event.details.assessment} overrides={event.details.reviewOverrides} />}
  </div>;
}
function EventHeading({ event }: { event: SubmissionHistoryEvent }) {
  const status = eventStatus(event);
  return <span className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
    <span className="font-semibold">{title(event)}</span>
    {status && <span className={`rounded-md px-2 py-1 text-[10.5px] font-semibold ${eventTone(event)}`}>{status.replaceAll('_', ' ').toLowerCase().replace(/^./, character => character.toUpperCase())}</span>}
  </span>;
}
function EventRow({ event, zone, journey = false, compact = false }: { event: SubmissionHistoryEvent; zone: string; journey?: boolean; compact?: boolean }) {
  return <><div className={`flex min-w-0 gap-4 ${journey ? 'flex-col' : 'flex-col lg:flex-row lg:items-start'}`}>
    <time dateTime={event.createdAt} className={`shrink-0 text-xs font-medium text-muted-foreground ${journey ? '' : 'lg:w-40 lg:border-r lg:border-border lg:pr-4'}`}>{formatInterview(event.createdAt, zone)}</time>
    <div className="min-w-0 flex-1"><div className={`flex gap-5 ${journey ? 'flex-col' : 'flex-col lg:flex-row'}`}><div className={journey ? '' : 'shrink-0 lg:w-56'}><EventHeading event={event} /></div>{!compact && <EventDetails event={event} zone={zone} showAssessment={false} />}</div></div>
    <div className={`shrink-0 text-[10.5px] text-muted-foreground ${journey ? '' : 'lg:w-32 lg:border-l lg:border-border lg:pl-4'}`}><span className="block">By</span><span className="mt-1 block font-medium text-foreground">{event.actorName || 'Not recorded'}</span></div>
  </div>{!compact && event.details.assessment && <div className={journey ? '' : 'lg:ml-44'}><DecisionAssessment assessment={event.details.assessment} overrides={event.details.reviewOverrides} /></div>}</>;
}
export function SubmissionHistory({ submission }: { submission: TrackerSubmission }) {
  const [layout, setLayout] = useState<'A' | 'B' | 'C'>('A');
  const [response, setResponse] = useState<SubmissionHistoryResponse | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setResponse(null); setError('');
      return atsApi.submissions.history(submission.id, page, layout === 'B' ? 'asc' : 'desc');
    }).then(data => { if (active && data) setResponse(data); })
      .catch(() => { if (active) setError('Unable to load submission history.'); });
    return () => { active = false; };
  }, [submission.id, submission.updatedAt, page, revision, layout]);
  const zone = validTimezone(submission.timezone);
  return <section className="rounded-xl border border-border bg-card p-5" aria-label="Submission history">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-bold">Submission timeline</h2><p className="mt-1 text-[10.5px] text-muted-foreground">{layout === 'B' ? 'Oldest to newest' : 'Newest first'}</p></div><label className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">View</span><select aria-label="Timeline layout" value={layout} onChange={event => { setLayout(event.target.value as 'A' | 'B' | 'C'); setPage(1); }} className="rounded-md border border-border bg-background px-3 py-2 text-xs"><option value="A">A · Compact rows</option><option value="B">B · Horizontal journey</option><option value="C">C · Expandable history</option></select></label></div>
    {error ? <div role="alert" className="mt-4 text-xs">{error}<Button variant="outline" className="ml-2 text-xs" onClick={() => setRevision(r => r + 1)}>Retry</Button></div> : !response ? <p role="status" className="mt-4 text-xs text-muted-foreground">Loading history…</p> : <>
      {!response.data.length && <p className="mt-4 text-xs text-muted-foreground">No history recorded.</p>}
      <ol className={layout === 'B' ? 'mt-5 flex snap-x gap-4 overflow-x-auto pb-3' : 'mt-5 ml-2 flex flex-col gap-3 border-l border-border pl-6'}>{response.data.map((event, index) => <li key={`${layout}-${event.id}`} className={layout === 'B' ? 'relative w-[min(85vw,24rem)] shrink-0 snap-start rounded-xl border border-border bg-card p-4' : 'relative rounded-xl border border-border bg-card p-4'}>
        <span aria-hidden="true" className={`absolute grid h-5 w-5 place-items-center rounded-full ring-4 ring-card ${layout === 'B' ? '-left-2 top-5' : '-left-[35px] top-5'} ${eventTone(event)}`}><span className="h-2.5 w-2.5 rounded-full bg-current" /></span>
        {layout === 'C' ? <details open={index === 0}><summary className="cursor-pointer"><span className="inline-block w-[calc(100%-1rem)] align-middle"><EventRow event={event} zone={zone} compact /></span></summary><div className="mt-4 border-t border-border pt-3 lg:ml-44"><EventDetails event={event} zone={zone} /></div></details> : <EventRow event={event} zone={zone} journey={layout === 'B'} />}
      </li>)}</ol>
      {response.totalPages > 1 && <div className="mt-5 flex items-center justify-between text-xs"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {response.page} of {response.totalPages}</span><Button variant="outline" disabled={page >= response.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button></div>}
    </>}
  </section>;
}
