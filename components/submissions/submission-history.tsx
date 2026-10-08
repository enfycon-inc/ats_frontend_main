"use client";
import { useEffect, useState } from 'react';
import { atsApi } from '@/lib/ats-api';
import type { SubmissionHistoryEvent, SubmissionHistoryResponse, TrackerSubmission } from '@/lib/submission-contract';
import { formatInterview, validTimezone } from '@/lib/submission-tracker';
import { Button } from '@/components/ui/button';

function label(field: string) {
  if (/^l[123]Date$/.test(field)) return `${field.slice(0, 2).toUpperCase()} interview time`;
  return field.replace(/^l([123])/, 'L$1 ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
}
function title(event: SubmissionHistoryEvent) {
  if (event.kind === 'BASELINE') return 'Existing state captured — earlier updates unavailable';
  if (event.kind === 'CREATED') return 'Submission created';
  const changes = event.details.changes || {};
  if (changes.finalStatus) return `Outcome: ${changes.finalStatus.after === 'JOIN' ? 'Joined' : changes.finalStatus.after?.replaceAll('_', ' ')}`;
  const stages = ['l1', 'l2', 'l3'].filter(stage => Object.keys(changes).some(field => field.startsWith(stage)));
  return stages.length ? `${stages.map(stage => stage.toUpperCase()).join(', ')} updated` : 'Submission updated';
}
export function SubmissionHistory({ submission }: { submission: TrackerSubmission }) {
  const [response, setResponse] = useState<SubmissionHistoryResponse | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setResponse(null); setError('');
      return atsApi.submissions.history(submission.id, page);
    }).then(data => { if (active && data) setResponse(data); })
      .catch(() => { if (active) setError('Unable to load submission history.'); });
    return () => { active = false; };
  }, [submission.id, submission.updatedAt, page, revision]);
  const zone = validTimezone(submission.timezone);
  const value = (field: string, text: string | null) => !text ? '—' : field.endsWith('Date') ? formatInterview(text, zone) : text;
  return <section className="rounded-xl border border-border bg-card p-5" aria-label="Submission history">
    <h2 className="text-sm font-bold">Submission timeline</h2>
    {error ? <div role="alert" className="mt-4 text-xs">{error}<Button variant="outline" className="ml-2 text-xs" onClick={() => setRevision(r => r + 1)}>Retry</Button></div> : !response ? <p role="status" className="mt-4 text-xs text-muted-foreground">Loading history…</p> : <>
      <ol className="mt-5 ml-2 space-y-6 border-l border-border">{response.data.map(event => <li key={event.id} className="relative pl-5">
        <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-blue-500" />
        <p className="text-xs font-semibold">{title(event)}</p>
        <p className="mt-1 text-xs text-muted-foreground">Recorded {formatInterview(event.createdAt, zone)}{event.actorName ? ` · ${event.actorName}` : ''}</p>
        {Object.entries(event.details.changes || {}).map(([field, change]) => <div key={field} className="mt-2 text-xs whitespace-pre-wrap"><span className="font-semibold">{label(field)}: </span>{value(field, change.after)}<p className="mt-1 text-muted-foreground">Previously: {value(field, change.before)}</p></div>)}
        {event.details.snapshot && <dl className="mt-2 space-y-1">{Object.entries(event.details.snapshot).filter(([, text]) => text != null).map(([field, text]) => <div key={field} className="text-xs whitespace-pre-wrap"><dt className="inline font-semibold">{label(field)}: </dt><dd className="inline">{value(field, text)}</dd></div>)}</dl>}
        {event.details.bypassReason && <p className="mt-2 text-xs whitespace-pre-wrap"><span className="font-semibold">Bypass reason: </span>{event.details.bypassReason}</p>}
      </li>)}</ol>
      {response.totalPages > 1 && <div className="mt-5 flex items-center justify-between text-xs"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {response.page} of {response.totalPages}</span><Button variant="outline" disabled={page >= response.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button></div>}
    </>}
  </section>;
}
