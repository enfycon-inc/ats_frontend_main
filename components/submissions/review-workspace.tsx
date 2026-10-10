"use client";

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, Loader2, Maximize2, Minimize2, Home, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { atsApi } from '@/lib/ats-api';
import type { CandidateAssessment, TrackerSubmission, TrackerUpdate } from '@/lib/submission-contract';
import { stageRemarkSuggestions } from '@/lib/stage-remarks';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { usePageHeader } from '@/components/layout/page-header-context';
import { useSidebar } from '@/components/ui/sidebar';
import { ReviewSplit } from './review-split';
import { RequirementsComparison } from './requirements-comparison';

type Template = { id: number; stage: string; remarkText: string; remarkType?: string };


function ReviewJobDescription({ content }: { content: string }) {
  if (!content.trim()) return <p className="mt-3 text-xs">No job description provided.</p>;
  const inline = (text: string) => text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part);
  return <div className="mt-3 min-w-0 max-w-full space-y-2 whitespace-normal [overflow-wrap:anywhere] text-xs leading-relaxed">{content.split(/\r?\n/).map((line, index) => { const heading = line.match(/^\s*#{1,6}\s+(.+)$/); const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.+)$/); if (heading) return <h3 key={index} className="pt-2 text-[13px] leading-5 font-semibold">{inline(heading[1])}</h3>; if (bullet) return <div key={index} className="flex min-w-0 gap-2"><span aria-hidden className="shrink-0">•</span><span className="min-w-0">{inline(bullet[1])}</span></div>; return line.trim() ? <p key={index}>{inline(line)}</p> : null; })}</div>;
}

export function ReviewWorkspace({ submissionId, onClose, onSaved }: {
  submissionId: string; onClose: () => void; onSaved: (submission: TrackerSubmission) => void;
}) {
  const { setHidden } = usePageHeader();
  useEffect(() => { setHidden(true); return () => setHidden(false); }, [setHidden]);
  const sidebar = useSidebar();
  const initialSidebar = useRef(sidebar.open);
  const sidebarSetter = useRef(sidebar.setOpen);
  useEffect(() => {
    const setOpen = sidebarSetter.current;
    const wasOpen = initialSidebar.current;
    setOpen(false);
    return () => setOpen(wasOpen);
  }, []);
  const workspace = useRef<HTMLElement>(null);
  const [expandedResume, setExpandedResume] = useState(false);
  const [panel, setPanel] = useState<'screening' | 'resume'>('screening');
  const [submission, setSubmission] = useState<TrackerSubmission | null>(null);
  const [assessment, setAssessment] = useState<CandidateAssessment | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [notes, setNotes] = useState('');
  const [checks, setChecks] = useState<NonNullable<TrackerUpdate['reviewOverrides']>>({});
  const [resume, setResume] = useState<{ url: string; pdf: boolean; extension: string } | null>(null);
  const [resumeError, setResumeError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [decision, setDecision] = useState<'SUBMITTED' | 'REJECTED' | null>(null);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const request = useRef<{ id: string; content: string } | null>(null);
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    void atsApi.submissions.assessment(submissionId).then(async response => {
      if (!active) return;
      const fresh = response.submission;
      setAssessment(response.assessment);
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
      } catch (cause) { if (active) setResumeError(cause instanceof Error && cause.message.includes('No CV') ? 'No resume is on file for this candidate.' : 'Unable to load the resume. Retry or check your candidate access.'); }
    }).catch(() => { if (active) setLoadError('Unable to load the submission. Retry to check your access and the latest state.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [submissionId, revision]);
  useEffect(() => {
    const element = workspace.current;
    if (!element) return;
    const container = element.closest<HTMLElement>('[data-slot="sidebar-inset"]');
    const previousOverflow = container?.style.overflowY;
    const previousScroll = container?.scrollTop;
    if (container) { container.scrollTop = 0; container.style.overflowY = 'hidden'; }
    const size = () => {
      const bottom = window.visualViewport ? window.visualViewport.height + window.visualViewport.offsetTop : window.innerHeight;
      element.style.height = `${Math.max(0, bottom - element.getBoundingClientRect().top - 8)}px`;
    };
    size();
    const observer = new ResizeObserver(size);
    if (element.parentElement) observer.observe(element.parentElement);
    window.addEventListener('resize', size);
    window.visualViewport?.addEventListener('resize', size);
    return () => {
      observer.disconnect(); window.removeEventListener('resize', size); window.visualViewport?.removeEventListener('resize', size);
      if (container) { container.style.overflowY = previousOverflow || ''; container.scrollTop = previousScroll || 0; }
    };
  }, [submission?.id]);
  const retry = () => { setSubmission(null); setAssessment(null); setResume(null); setResumeError(''); setLoadError(''); setError(''); setRevision(r => r + 1); };
  const permitted = submission?.capabilities?.review && submission.finalStatus === 'PENDING_APPROVAL';
  const criteria = assessment?.criteria || [];
  async function save(decision: 'SUBMITTED' | 'REJECTED') {
    if (!submission || !assessment || !permitted || lock.current) return;
    if (decision === 'REJECTED' && !notes.trim()) { setError('Add a reason for rejecting this submission.'); return; }
    lock.current = true; setSaving(true); setError('');
    const reviewed = criteria.filter(row => checks[row.key]).map(row => `${row.requirement}: ${checks[row.key]}`);
    const feedback = [notes.trim(), reviewed.length ? `Reviewer criteria checks:\n${reviewed.join('\n')}` : ''].filter(Boolean).join('\n\n') || null;
    const content = JSON.stringify({ decision, feedback, assessmentVersion: assessment.version, checks });
    if (request.current?.content !== content) request.current = { id: crypto.randomUUID(), content };
    try {
      const saved = await atsApi.submissions.update(submission.id, { finalStatus: decision, reviewFeedback: feedback, expectedUpdatedAt: submission.updatedAt, requestId: request.current.id, assessmentVersion: assessment.version, reviewOverrides: checks });
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
  return <main ref={workspace} className="flex h-[calc(100dvh-94px)] min-h-0 min-w-0 flex-col gap-2 overflow-hidden relative text-foreground">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-2"><div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="sm" disabled={saving} className="shrink-0 text-xs -ml-2" onClick={onClose}><ArrowLeft className="h-4 w-4" />Back to submissions</Button><div className="min-w-0 border-l border-border pl-3"><div className="flex flex-wrap items-center gap-2"><h1 className="text-sm font-bold">{submission.candidateName || 'Name unavailable'}</h1><span className="rounded-md bg-amber-50 px-2 py-1 text-[10.5px] text-amber-800">{permitted ? 'Needs internal review' : 'Review unavailable'}</span></div><p className="mt-0.5 text-xs text-muted-foreground">{[submission.jobCode, submission.jobTitle, submission.clientName].filter(Boolean).join(' · ')}</p></div></div><nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[10.5px] text-muted-foreground"><Link href="/dashboard" aria-label="Home"><Home className="h-3.5 w-3.5" /></Link><ChevronRight aria-hidden className="h-3 w-3" /><span>Recruitment</span><ChevronRight aria-hidden className="h-3 w-3" /><button type="button" disabled={saving} onClick={onClose} className="hover:underline">All Submissions</button><ChevronRight aria-hidden className="h-3 w-3" /><span aria-current="page" className="font-semibold text-foreground">Review submission</span></nav></header>
    <div className={`shrink-0 gap-2 lg:hidden ${expandedResume ? 'hidden' : 'flex'}`} aria-label="Review panels"><Button variant={panel === 'screening' ? 'default' : 'outline'} aria-pressed={panel === 'screening'} className="text-xs" onClick={() => setPanel('screening')}>Screening</Button><Button variant={panel === 'resume' ? 'default' : 'outline'} aria-pressed={panel === 'resume'} className="text-xs" onClick={() => setPanel('resume')}>Resume</Button></div><ReviewSplit expanded={expandedResume} left={<>
      <div aria-label="Screening details" tabIndex={0} className={`min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain space-y-4 pr-1 pb-20 ${expandedResume ? 'hidden' : `lg:block ${panel === 'screening' ? '' : 'hidden'}`}`}><dl aria-label="Candidate summary" className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-3">{facts.map(([label, value]) => <div key={label}><dt className="text-[10.5px] text-muted-foreground">{label}</dt><dd className="mt-0.5 text-xs font-semibold">{value}</dd></div>)}</dl><section className="rounded-xl border border-border bg-card min-w-0 p-3"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-sm font-bold">Job requirements</h2><span className="text-[10.5px] text-muted-foreground">{submission.jobCode}</span></div><p className="mt-3 text-sm font-semibold">{submission.jobTitle}</p><details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-[#1a4fa0] dark:text-blue-300">Job description</summary><ReviewJobDescription content={submission.jobDescription || ''} /></details>
        {assessment && <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4"><div className="flex flex-wrap gap-6"><div><p className="text-xs text-muted-foreground">Match score</p><p className="mt-1 text-xl font-bold">{assessment.score == null ? 'Insufficient evidence' : `${assessment.score}%`}</p></div><div><p className="text-xs text-muted-foreground">Evidence coverage</p><p className="mt-1 text-lg font-bold">{assessment.coverage}%</p></div><div><p className="text-xs text-muted-foreground">Needs attention</p><p className="mt-1 text-lg font-bold">{criteria.filter(row => !['EVIDENCE_FOUND', 'MEETS'].includes(row.finding)).length}</p></div></div><details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold">How this score is calculated</summary><ul className="mt-2 space-y-1">{assessment.breakdown.map(part => <li key={part.label}>{part.label}: {part.score == null ? 'Unknown — excluded' : `${part.score}%`} · weight {part.weight}</li>)}</ul><p className="mt-2">Unknown factors are excluded and remaining weights are normalized. Coverage shows how much of the configured assessment could be scored.</p>{assessment.limitations.map(text => <p key={text} className="mt-1 text-muted-foreground">{text}</p>)}<p className="mt-2 text-muted-foreground">{assessment.engine} · Calculated {new Date(assessment.calculatedAt).toLocaleString()}</p></details></div>}
        </section><RequirementsComparison submission={submission} assessment={assessment} />
        <section className="rounded-xl border border-border bg-card p-5"><h2 className="text-sm font-bold">Recruiter notes</h2><p className="mt-2 whitespace-pre-wrap text-xs">{submission.recruiterComment || 'No recruiter notes provided.'}</p></section>
      </div></>} right={<>
      <section aria-label="Resume viewer" className={`min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card ${expandedResume || panel === 'resume' ? 'flex' : 'hidden lg:flex'}`}><div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-1.5"><h2 className="text-xs font-bold">Resume</h2><div className="flex items-center gap-2"><Button variant="ghost" size="sm" className="h-7 text-xs" aria-pressed={expandedResume} onClick={() => setExpandedResume(value => !value)}>{expandedResume ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}{expandedResume ? 'Split view' : 'Expand resume'}</Button>{resume && <Button variant="outline" className="h-7 text-xs" asChild><a href={resume.url} download={`${submission.candidateName || submission.candidateId}-resume${resume.extension}`}><Download className="h-3.5 w-3.5" />Download</a></Button>}</div></div>{resumeError ? <div role="alert" className="p-6 text-xs">{resumeError}<Button variant="outline" className="mt-3 block text-xs" onClick={retry} disabled={saving}>Retry</Button></div> : !resume ? <p role="status" className="p-8 text-xs">Loading resume…</p> : resume.pdf ? <iframe title="Candidate resume preview" src={`${resume.url}#toolbar=0&navpanes=0&view=FitH`} className="min-h-0 w-full flex-1 border-0" /> : <div className="p-8 text-xs">This file format cannot be previewed here. Download the original resume to review it.</div>}</section>
    </>} />
    {permitted ? <div aria-label="Review decision" className="absolute bottom-3 right-3 z-20 flex gap-2 rounded-lg border border-border bg-background p-2 shadow-lg"><Button variant="outline" disabled={saving} className="h-8 border-red-500 text-xs text-red-700" onClick={() => { setError(''); setDecision('REJECTED'); }}>Reject</Button><Button disabled={saving} className="h-8 bg-[#1a4fa0] text-xs text-white hover:bg-[#154181]" onClick={() => { setError(''); setDecision('SUBMITTED'); }}>Approve submission</Button></div> : <p role="alert" className="shrink-0 text-xs">This submission is no longer pending review, or your review permission is unavailable.</p>}
    <Dialog open={decision !== null} onOpenChange={open => { if (!open && !saving) setDecision(null); }}><DialogContent className="sm:max-w-[480px]" onEscapeKeyDown={event => { if (saving) event.preventDefault(); }} onInteractOutside={event => { if (saving) event.preventDefault(); }}><DialogHeader><DialogTitle className="text-sm">{decision === 'REJECTED' ? 'Reject submission' : 'Approve submission'}</DialogTitle><DialogDescription className="text-xs">{submission.candidateName} · {submission.jobTitle}. Your decision and remarks are recorded in the timeline.</DialogDescription></DialogHeader><div className="space-y-2"><label htmlFor="review-notes" className="text-xs font-semibold">Remarks {decision === 'REJECTED' ? '(required)' : '(optional)'}</label><Textarea id="review-notes" maxLength={4000} rows={3} value={notes} disabled={saving} onChange={event => setNotes(event.target.value)} placeholder="Type remarks to see suggestions…" className="text-xs" />{notes.trim() && <div aria-label="Remark suggestions" className="max-h-40 space-y-1 overflow-y-auto">{stageRemarkSuggestions(templates, 'review').filter(template => template.remarkText.toLowerCase().includes(notes.trim().toLowerCase()) && template.remarkText.trim().toLowerCase() !== notes.trim().toLowerCase()).slice(0, 5).map(template => <button key={template.id} type="button" disabled={saving} className="block w-full rounded border border-border px-3 py-2 text-left text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-blue-500" onClick={() => setNotes(template.remarkText)}>{template.remarkText}</button>)}</div>}{error && <div role="alert" className="text-xs text-red-700">{error}<Button variant="outline" className="ml-2 text-xs" disabled={saving} onClick={() => { setDecision(null); retry(); }}>Reload latest submission</Button></div>}</div><DialogFooter><Button variant="outline" disabled={saving} className="text-xs" onClick={() => setDecision(null)}>Cancel</Button><Button disabled={saving || !permitted || (decision === 'REJECTED' && !notes.trim())} className={decision === 'REJECTED' ? 'bg-red-600 text-xs text-white hover:bg-red-700' : 'bg-[#1a4fa0] text-xs text-white hover:bg-[#154181]'} onClick={() => { if (decision) void save(decision); }}>{saving && <Loader2 className="h-3 w-3 animate-spin" />}{decision === 'REJECTED' ? 'Confirm rejection' : 'Confirm approval'}</Button></DialogFooter></DialogContent></Dialog>
  </main>;
}
