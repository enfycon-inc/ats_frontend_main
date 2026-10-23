"use client";

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { atsApi } from '@/lib/ats-api';
import type { TrackerBucket, TrackerResponse, TrackerSubmission } from '@/lib/submission-contract';
import { submissionBucket, canMaintainSubmission } from '@/lib/submission-tracker';
import { Button } from '@/components/ui/button';
import { Pipeline, StageBadge } from './submission-stage';
import { ResumeDownloadButton } from './resume-download';
import { ReviewWorkspace } from './review-workspace';
import { UpdateSubmissionDialog } from './update-submission-dialog';

const buckets: Array<{ key: TrackerBucket; label: string }> = [
  { key: 'all', label: 'All' }, { key: 'review', label: 'Needs review' },
  { key: 'interviews', label: 'Interviews' }, { key: 'offers', label: 'Offers' }, { key: 'closed', label: 'Closed' },
];

export function JobSubmissions({ jobId, initialResponse, onSaved, showBoard = false }: {
  jobId: string; initialResponse: TrackerResponse; onSaved: () => void; showBoard?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [bucket, setBucket] = useState<TrackerBucket>('all');
  const [board, setBoard] = useState(false);
  const [editor, setEditor] = useState<TrackerSubmission | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const initial = page === 1 && bucket === 'all' ? initialResponse : undefined;
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ['job-submissions', jobId, page, bucket],
    () => atsApi.submissions.list({ jobId, page, bucket, limit: 20 }),
    { fallbackData: initial, revalidateOnMount: !initial, onSuccess: response => {
      if (page > Math.max(1, response.totalPages)) setPage(Math.max(1, response.totalPages));
    } },
  );
  const href = (sub: TrackerSubmission) => `/utility/submissions?submission=${encodeURIComponent(sub.id)}`;
  const saved = () => { setEditor(null); setReview(null); void mutate(); onSaved(); };
  function actions(sub: TrackerSubmission) {
    return <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="outline" className="h-8 text-xs" asChild><Link href={href(sub)}>View details</Link></Button>
      {canMaintainSubmission(sub) && <Button variant="outline" className="h-8 text-xs" onClick={() => setEditor(sub)}>Edit status</Button>}
      <ResumeDownloadButton submission={sub} />
    </div>;
  }
  if (review) return <ReviewWorkspace submissionId={review} onClose={() => setReview(null)} onSaved={saved} />;
  return <section aria-label="Job candidate submissions" className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-sm font-bold">Candidate submissions ({data?.counts.all ?? initialResponse.total})</h2>
      {showBoard && <div className="flex gap-2"><Button variant={board ? 'outline' : 'secondary'} className="h-8 text-xs" aria-pressed={!board} onClick={() => setBoard(false)}>Table</Button><Button variant={board ? 'secondary' : 'outline'} className="h-8 text-xs" aria-pressed={board} onClick={() => setBoard(true)}>Board</Button></div>}
    </div>
    <div role="group" aria-label="Submission stage" className="flex flex-wrap gap-2">{buckets.map(item => <Button key={item.key} variant={bucket === item.key ? 'secondary' : 'outline'} className="h-8 text-xs" aria-pressed={bucket === item.key} onClick={() => { setBucket(item.key); setPage(1); }}>{item.label} · {data?.counts[item.key] ?? initialResponse.counts[item.key]}</Button>)}</div>
    {error ? <div role="alert" className="text-xs">Unable to load candidate submissions. <Button variant="outline" className="text-xs" onClick={() => void mutate()}>Retry</Button></div>
      : isLoading || !data ? <p role="status" className="py-6 text-xs">Loading submissions…</p>
      : <>
        {board ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">{buckets.filter(item => item.key !== 'all' && (bucket === 'all' || bucket === item.key)).map(item => {
          const rows = data.data.filter(sub => submissionBucket(sub) === item.key);
          return <section key={item.key} aria-label={item.label} className="rounded-xl border border-border bg-card p-3"><h3 className="mb-3 text-sm font-bold">{item.label} · {data.counts[item.key]}</h3>
            <div className="space-y-3">{rows.map(sub => <article key={sub.id} className="space-y-3 rounded-lg border border-border p-3"><Link href={href(sub)} className="text-xs font-semibold text-[#1a4fa0] hover:underline">{sub.candidateName || 'Name unavailable'}</Link><StageBadge submission={sub} /><Pipeline submission={sub} />{actions(sub)}</article>)}{!rows.length && <p className="text-xs text-muted-foreground">No candidates in this stage on this page.</p>}</div>
          </section>;
        })}</div>
          : <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full text-left text-xs"><thead className="border-b border-border bg-muted/40 text-[10.5px] uppercase text-muted-foreground"><tr>{['Candidate', 'Recruiter', 'Submitted rate', 'Pipeline', 'Current status', 'Actions'].map(label => <th key={label} className="px-4 py-3 font-bold">{label}</th>)}</tr></thead><tbody>{data.data.map(sub => <tr key={sub.id} className="border-b border-border last:border-0"><td className="px-4 py-4"><Link href={href(sub)} className="font-semibold text-[#1a4fa0] hover:underline">{sub.candidateName || 'Name unavailable'}</Link><p className="mt-1 text-muted-foreground">{sub.candidateEmail || '—'}</p><p className="mt-1 text-muted-foreground">{sub.candidatePhone || '—'}</p></td><td className="px-4 py-4">{sub.recruiterName || '—'}</td><td className="px-4 py-4">{sub.submittedRate != null ? [sub.submittedRate, sub.submittedRateCurrency, sub.submittedRateTerm].filter(Boolean).join(' ') : '—'}</td><td className="min-w-[260px] px-4 py-4"><Pipeline submission={sub} /></td><td className="min-w-[160px] px-4 py-4"><StageBadge submission={sub} /></td><td className="min-w-[180px] px-4 py-4">{actions(sub)}</td></tr>)}{!data.data.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No submissions in this stage.</td></tr>}</tbody></table></div>}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><p>{data.total ? `${(data.page - 1) * data.limit + 1}–${Math.min(data.page * data.limit, data.total)} of ${data.total}` : '0 submissions'}</p><nav aria-label="Candidate submission pages" className="flex items-center gap-2"><Button variant="outline" className="h-8 text-xs" disabled={page <= 1 || isValidating} onClick={() => setPage(value => value - 1)}>Previous</Button><span>Page {data.page} of {Math.max(1, data.totalPages)}</span><Button variant="outline" className="h-8 text-xs" disabled={page >= data.totalPages || isValidating} onClick={() => setPage(value => value + 1)}>Next</Button></nav></div>
      </>}
    {editor && <UpdateSubmissionDialog submission={editor} href={href(editor)} onClose={() => setEditor(null)} onSaved={saved} onReview={() => { setReview(editor.id); setEditor(null); }} />}
  </section>;
}
