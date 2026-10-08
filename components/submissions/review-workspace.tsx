"use client";

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { atsApi } from '@/lib/ats-api';
import type { TrackerSubmission } from '@/lib/submission-contract';
import { stageRemarkSuggestions } from '@/lib/stage-remarks';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSidebar } from '@/components/ui/sidebar';

type Template = { id: number; stage: string; remarkText: string; remarkType?: string };
const selectClass = 'h-9 w-full rounded-md border border-input bg-background px-2 text-xs';

export function ReviewWorkspace({ submissionId, onClose, onSaved }: {
  submissionId: string; onClose: () => void; onSaved: (submission: TrackerSubmission) => void;
}) {
  const sidebar = useSidebar();
  const initialSidebar = useRef(sidebar.open);
  const sidebarSetter = useRef(sidebar.setOpen);
  useEffect(() => {
    const setOpen = sidebarSetter.current;
    const wasOpen = initialSidebar.current;
    setOpen(false);
    return () => setOpen(wasOpen);
  }, []);
  const [submission, setSubmission] = useState<TrackerSubmission | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [notes, setNotes] = useState('');
  const [checks, setChecks] = useState<Record<string, string>>({});
  const [resume, setResume] = useState<{ url: string; pdf: boolean; extension: string } | null>(null);
  const [resumeError, setResumeError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const request = useRef<{ id: string; content: string } | null>(null);
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    void atsApi.submissions.get(submissionId).then(async fresh => {
      if (!active) return;
      const document = new DOMParser().parseFromString(fresh.jobDescription || '', 'text/html');
      document.querySelectorAll('script, style, iframe, object').forEach(node => node.remove());
      document.querySelectorAll('p, div, li, h1, h2, h3, h4, br').forEach(node => node.append('\n'));
      setSubmission({ ...fresh, jobDescription: document.body.textContent || null }); setLoadError(''); setNotes(fresh.reviewFeedback || ''); setChecks({});
      void atsApi.submissions.getCustomRemarks(fresh.branchId || undefined).then(data => { if (active) setTemplates(data); }).catch(() => { if (active) setTemplates([]); });
      try {
        const blob = await atsApi.candidates.fetchResumeBlob(fresh.candidateId);
        if (!active) return;
        const pdf = blob.type.split(';')[0] === 'application/pdf';
        objectUrl = URL.createObjectURL(blob);
        setResume({ url: objectUrl, pdf, extension: pdf ? '.pdf' : blob.type.includes('wordprocessingml') ? '.docx' : blob.type === 'application/msword' ? '.doc' : '' });
        setResumeError('');
      } catch (cause) { if (active) setResumeError(cause instanceof Error && cause.message.includes('No CV') ? 'No résumé is on file for this candidate.' : 'Unable to load the résumé. Retry or check your candidate access.'); }
    }).catch(() => { if (active) setLoadError('Unable to load the submission. Retry to check your access and the latest state.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [submissionId, revision]);
  const retry = () => { setSubmission(null); setResume(null); setResumeError(''); setLoadError(''); setError(''); setRevision(r => r + 1); };
  const permitted = submission?.capabilities?.review && submission.finalStatus === 'PENDING_APPROVAL';
  const required = [...new Set(submission?.jobSkillsRequired || [])];
  const criteria = submission ? [
    ...required.map(skill => ({ key: `skill:${skill}`, requirement: skill, evidence: (submission.candidateSkills || []).some(candidate => candidate.trim().toLowerCase() === skill.trim().toLowerCase()) ? 'Listed in candidate profile — verify résumé' : 'Not listed in profile — verify résumé' })),
    ...(submission.jobExperienceMin != null || submission.jobExperienceMax != null ? [{ key: 'experience', requirement: `Experience: ${submission.jobExperienceMin ?? '—'}–${submission.jobExperienceMax ?? '—'} years`, evidence: submission.candidateExperience != null ? `${submission.candidateExperience} years in profile` : 'Experience not provided' }] : []),
    ...(submission.jobLocation || submission.jobWorkMode ? [{ key: 'location', requirement: [submission.jobWorkMode, submission.jobLocation].filter(Boolean).join(' · '), evidence: submission.candidateCurrentLocation || 'Candidate location not provided' }] : []),
    ...(submission.jobDegree ? [{ key: 'degree', requirement: `Education: ${submission.jobDegree}`, evidence: 'Verify résumé' }] : []),
    ...(submission.jobNoticePeriod ? [{ key: 'notice', requirement: `Notice: ${submission.jobNoticePeriod}`, evidence: submission.candidateNoticePeriod != null ? `${submission.candidateNoticePeriod} days in profile` : 'Notice period not provided' }] : []),
  ] : [];
  async function save(decision: 'SUBMITTED' | 'REJECTED') {
    if (!submission || !permitted || lock.current) return;
    if (decision === 'REJECTED' && !notes.trim()) { setError('Add a reason for rejecting this submission.'); return; }
    lock.current = true; setSaving(true); setError('');
    const reviewed = criteria.filter(row => checks[row.key]).map(row => `${row.requirement}: ${checks[row.key]}`);
    const feedback = [notes.trim(), reviewed.length ? `Reviewer criteria checks:\n${reviewed.join('\n')}` : ''].filter(Boolean).join('\n\n') || null;
    const content = JSON.stringify({ decision, feedback });
    if (request.current?.content !== content) request.current = { id: crypto.randomUUID(), content };
    try {
      const saved = await atsApi.submissions.update(submission.id, { finalStatus: decision, reviewFeedback: feedback, expectedUpdatedAt: submission.updatedAt, requestId: request.current.id });
      toast.success(decision === 'SUBMITTED' ? 'Submission approved.' : 'Submission rejected.'); onSaved(saved);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save the review.'); }
    finally { lock.current = false; setSaving(false); }
  }
  if (!submission) return <main className="space-y-4"><Button variant="ghost" className="text-xs" onClick={onClose}><ArrowLeft className="h-4 w-4" />Back to submissions</Button>{loadError ? <div role="alert" className="text-xs">{loadError}<Button variant="outline" onClick={retry}>Retry</Button></div> : <p role="status" className="p-12 text-center text-xs">Loading review workspace…</p>}</main>;
  const facts = [
    ['Experience', submission.candidateExperience != null ? `${submission.candidateExperience} years` : 'Not provided'],
    ['Location', submission.candidateCurrentLocation || 'Not provided'],
    ['Notice period', submission.candidateNoticePeriod != null ? `${submission.candidateNoticePeriod} days` : 'Not provided'],
    ['Submitted rate', submission.submittedRate != null ? [submission.submittedRate, submission.submittedRateCurrency, submission.submittedRateTerm].filter(Boolean).join(' / ') : 'Not provided'],
    ['Submitted by', submission.recruiterName || 'Not provided'],
  ];
  return <main className="space-y-5 min-w-0 text-foreground">
    <Button variant="ghost" disabled={saving} className="text-xs -ml-2" onClick={onClose}><ArrowLeft className="h-4 w-4" />Back to submissions</Button>
    <header><h1 className="text-xl font-bold tracking-tight">Review submission</h1><div className="mt-3 flex flex-wrap items-center gap-3"><h2 className="text-lg font-bold">{submission.candidateName || 'Name unavailable'}</h2><span className="rounded-md bg-amber-50 px-2 py-1 text-[10.5px] text-amber-800">{permitted ? 'Needs internal review' : 'Review unavailable'}</span></div><p className="mt-1 text-xs text-muted-foreground">{[submission.jobTitle, submission.clientName].filter(Boolean).join(' · ')}</p></header>
    <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-5 lg:grid-cols-5">{facts.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-xs font-semibold">{value}</dd></div>)}</dl>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="space-y-4"><section className="rounded-xl border border-border bg-card p-5"><div className="flex justify-between gap-3"><h2 className="text-sm font-bold">Job requirements</h2><span className="text-[10.5px] text-muted-foreground">{submission.jobCode}</span></div><p className="mt-3 text-sm font-semibold">{submission.jobTitle}</p><details open className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-[#1a4fa0] dark:text-blue-300">Job description</summary><div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed">{submission.jobDescription || 'No job description provided.'}</div></details>
        <h3 className="mt-5 text-sm font-bold">Required criteria</h3><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-muted/40"><tr>{['Requirement', 'Candidate evidence', 'Reviewer check'].map(text => <th key={text} className="p-2 text-[10.5px] font-bold uppercase text-muted-foreground">{text}</th>)}</tr></thead><tbody>{criteria.map(row => <tr key={row.key} className="border-t border-border"><td className="p-2">{row.requirement}</td><td className="p-2 text-muted-foreground">{row.evidence}</td><td className="p-2"><select aria-label={`Reviewer check: ${row.requirement}`} className={selectClass} disabled={saving || !permitted} value={checks[row.key] || ''} onChange={event => setChecks(previous => ({ ...previous, [row.key]: event.target.value }))}><option value="">Unchecked</option><option>Meets</option><option>Does not meet</option><option>Needs clarification</option></select></td></tr>)}</tbody></table>{!criteria.length && <p className="py-3 text-xs text-muted-foreground">No structured requirements provided. Review the job description.</p>}</div><p className="mt-3 text-[10.5px] text-muted-foreground">Profile evidence is not verified. Your checks are saved with the review remarks.</p>{!!submission.jobSecondarySkills?.length && <p className="mt-4 text-xs"><strong>Additional skills: </strong>{submission.jobSecondarySkills.join(', ')}</p>}</section>
        <section className="rounded-xl border border-border bg-card p-5"><h2 className="text-sm font-bold">Recruiter notes</h2><p className="mt-2 whitespace-pre-wrap text-xs">{submission.recruiterComment || 'No recruiter notes provided.'}</p><p className="mt-3 text-xs"><strong>Candidate skills: </strong>{submission.candidateSkills?.join(', ') || 'Not provided'}</p></section>
      </div>
      <section className="overflow-hidden rounded-xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border p-4"><h2 className="text-sm font-bold">Résumé</h2>{resume && <Button variant="outline" className="text-xs" asChild><a href={resume.url} download={`${submission.candidateName || submission.candidateId}-resume${resume.extension}`}><Download className="h-3.5 w-3.5" />Download</a></Button>}</div>{resumeError ? <div role="alert" className="p-6 text-xs">{resumeError}<Button variant="outline" className="mt-3 block text-xs" onClick={retry} disabled={saving}>Retry</Button></div> : !resume ? <p role="status" className="p-8 text-xs">Loading résumé…</p> : resume.pdf ? <iframe title="Candidate résumé preview" src={resume.url} className="h-[65vh] min-h-[480px] w-full border-0" /> : <div className="p-8 text-xs">This file format cannot be previewed here. Download the original résumé to review it.</div>}</section>
    </div>
    <section aria-label="Review decision" className="sticky bottom-0 z-20 rounded-xl border border-border bg-card p-4 shadow-sm">
      {!permitted ? <p role="alert" className="text-xs">This submission is no longer pending review, or your review permission is unavailable.</p> : <><div className="flex flex-col gap-3 xl:flex-row xl:items-end"><div className="space-y-2 xl:w-1/3"><label htmlFor="review-template" className="text-xs font-semibold">Internal Review Remarks</label><select id="review-template" className={selectClass} disabled={saving} value="" onChange={event => setNotes(event.target.value)}><option value="">Choose a configured remark</option>{stageRemarkSuggestions(templates, 'review').map(template => <option key={template.id} value={template.remarkText}>{template.remarkText}</option>)}</select></div><div className="flex-1"><label htmlFor="review-notes" className="sr-only">Review notes</label><Textarea id="review-notes" maxLength={4000} rows={2} value={notes} disabled={saving} onChange={event => setNotes(event.target.value)} placeholder="Add review notes…" className="text-xs" /></div><div className="flex gap-2"><Button variant="outline" disabled={saving} className="text-xs" onClick={onClose}>Back</Button><Button variant="outline" disabled={saving} className="border-red-500 text-xs text-red-700" onClick={() => void save('REJECTED')}>Reject</Button><Button disabled={saving} className="bg-[#1a4fa0] text-xs text-white hover:bg-[#154181]" onClick={() => void save('SUBMITTED')}>{saving && <Loader2 className="h-3 w-3 animate-spin" />}Approve submission</Button></div></div><p className="mt-2 text-[10.5px] text-muted-foreground">Your decision and remarks are recorded in the timeline.</p></>}
      {error && <div role="alert" className="mt-3 text-xs text-red-700">{error}<Button variant="outline" className="ml-2 text-xs" disabled={saving} onClick={retry}>Reload latest submission</Button></div>}
    </section>
  </main>;
}
