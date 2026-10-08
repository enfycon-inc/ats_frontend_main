"use client";

import { SubmissionHistory } from "@/components/submissions/submission-history";
import { ReviewWorkspace } from "@/components/submissions/review-workspace";
import { stageRemarkSuggestions } from "@/lib/stage-remarks";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, Filter, Loader2, RefreshCw, Search, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { TrackerBucket, TrackerResponse, TrackerSubmission, TrackerUpdate } from "@/lib/submission-contract";
import { ACTION_LABELS, canUpdateOutcome, needsOutcomeReason, currentRound, formatInterview, interviewInstant, localInterviewParts, primaryAction, stage, validTimezone, ROUNDS, type TrackerAction } from "@/lib/submission-tracker";

const FILTERS: { key: TrackerBucket; label: string }[] = [
  { key: "all", label: "All" }, { key: "review", label: "Needs review" },
  { key: "interviews", label: "Interviews" }, { key: "offers", label: "Offers" }, { key: "closed", label: "Closed" },
];
const PRIMARY = "bg-[#1a4fa0] text-white hover:bg-[#154181]";
const OUTLINE = "border-[#1a4fa0]/40 text-[#1a4fa0] hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950";
const SELECT = "h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500";
const TONES = {
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  blue: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  green: "bg-[#008000] text-white",
  red: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};
function StageBadge({ submission }: { submission: TrackerSubmission }) {
  const state = stage(submission);
  const Icon = state.tone === "green" ? CheckCircle2 : state.tone === "red" ? XCircle : state.tone === "blue" ? CalendarDays : Clock3;
  return <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10.5px] font-semibold whitespace-nowrap", TONES[state.tone])}><Icon className="h-3.5 w-3.5" />{state.label}</span>;
}
function Pipeline({ submission }: { submission: TrackerSubmission }) {
  const state = stage(submission);
  const reviewComplete = submission.finalStatus !== "PENDING_APPROVAL";
  const terminal = ["JOIN", "OFFER"].includes(submission.finalStatus);
  const current = currentRound(submission)?.key;
  const stages = [{ key: "review", label: "Internal review", complete: reviewComplete }, ...ROUNDS.map(round => ({ key: round.key, label: round.label, complete: terminal || submission[`${round.key}Status`] === "CLEARED" })) , { key: "final", label: "Final", complete: terminal }];
  const activeKey = submission.finalStatus === "PENDING_APPROVAL" ? "review" : current || "final";
  return <div className="min-w-[300px] max-w-[470px]" aria-label={`Pipeline: ${state.label}`}><div className="flex items-start">{stages.map((item, index) => { const active = item.key === activeKey && !item.complete; const showStatus = active || (item.key === "final" && state.tone === "green"); const tone = state.tone === "red" && active ? "border-red-500 bg-red-50 text-red-700" : item.complete ? "border-[#008000] bg-[#008000]" : active ? "border-[#1a4fa0] bg-[#1a4fa0] shadow-[0_0_0_5px_rgba(26,79,160,0.16)] animate-pulse" : "border-slate-300 bg-white"; return <div key={item.key} className="flex min-w-0 flex-1 items-start"><div className="flex min-w-0 flex-1 flex-col items-center gap-1"><span className={cn("flex h-5 w-5 items-center justify-center rounded-full border-2", tone)} aria-hidden="true">{item.complete && <Check className="h-3 w-3 text-white" strokeWidth={3} />}</span><span className={cn("text-center text-[10px] leading-tight", active ? "font-semibold text-[#1a4fa0]" : "text-muted-foreground")}>{item.label}</span>{showStatus && <span className={cn("mt-1 whitespace-nowrap rounded-md px-2 py-1 text-[10.5px] font-semibold", TONES[state.tone])}>{state.label}</span>}</div>{index < stages.length - 1 && <span className={cn("mt-2.5 h-px flex-1", item.complete ? "bg-[#008000]" : "bg-slate-200")} />}</div>; })}</div></div>;
}
async function downloadResume(sub: TrackerSubmission) {
  try {
    const blob = await atsApi.candidates.fetchResumeBlob(sub.candidateId);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const extension = blob.type === "application/pdf" ? ".pdf" : blob.type === "application/msword" ? ".doc" : blob.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? ".docx" : "";
    link.download = `${sub.candidateName || sub.candidateId}-resume${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { toast.error("Unable to download the resume. Please try again."); }
}

interface RemarkTemplate { id: number; stage: string; remarkText: string; remarkType?: string }
function UpdateDialog({ submission, action, onClose, onSaved }: {
  submission: TrackerSubmission; action: TrackerAction; onClose: () => void; onSaved: (sub: TrackerSubmission) => void;
}) {
  const [current, setCurrent] = useState<TrackerSubmission | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const requestId = useRef<string | null>(null);
  const [bypassReason, setBypassReason] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timezone, setTimezone] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState("CLEARED");
  const [outcome, setOutcome] = useState("OFFER");
  const [rate, setRate] = useState("");
  const [templates, setTemplates] = useState<RemarkTemplate[]>([]);
  const [resumeLoading, setResumeLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setCurrent(null); setLoadError(""); setError("");
      return atsApi.submissions.get(submission.id);
    }).then(async fresh => {
      if (cancelled || !fresh) return;
      const round = currentRound(fresh);
      const zone = validTimezone(fresh.timezone);
      const parts = localInterviewParts(round ? fresh[`${round.key}Date`] : null, zone);
      setCurrent(fresh); setTimezone(zone); setDate(parts.date); setTime(parts.time);
      setMeetingLink(fresh.meetingLink || "");
      setInterviewer(round ? fresh[`${round.key}Interviewer`] || "" : "");
      setNotes(action === "notes" ? fresh.recruiterComment || "" : action === "review" ? fresh.reviewFeedback || "" : action === "outcome" ? fresh.remarks || "" : round ? fresh[`${round.key}Remarks`] || "" : "");
      setRate(fresh.submittedRate || "");
      setOutcome(fresh.finalStatus === "OFFER" ? "JOIN" : "OFFER");
      setTemplates([]);
      try {
        const data = await atsApi.submissions.getCustomRemarks(fresh.branchId || undefined);
        if (!cancelled) setTemplates(data);
      } catch { /* Free text remains available if optional templates cannot load. */ }
    }).catch(() => { if (!cancelled) setLoadError("Unable to load this submission. Please retry."); });
    return () => { cancelled = true; };
  }, [submission.id, action, revision]);

  const round = current ? currentRound(current) : null;
  const permitted = current && (action === "schedule" && round && current.finalStatus === "SUBMITTED" && current.capabilities?.schedule ? true : action === "outcome" ? canUpdateOutcome(current) : action === "notes" ? current.capabilities?.notes : action === "rate" ? current.capabilities?.rate : primaryAction(current) === action);
  const templateStage = action === "review" ? "review" : action === "outcome" ? "final" : round?.key;
  const suggestions = stageRemarkSuggestions(templates, templateStage);

  async function save(reviewDecision?: "SUBMITTED" | "REJECTED") {
    if (!current || !permitted || saveLock.current) return;
    saveLock.current = true; setSaving(true); setError("");
    try {
      requestId.current ??= crypto.randomUUID();
      const payload: TrackerUpdate = { expectedUpdatedAt: current.updatedAt, requestId: requestId.current };
      if (action === "review") {
        if (!reviewDecision) throw new Error("Choose approve or reject.");
        if (reviewDecision === "REJECTED" && !notes.trim()) throw new Error("Add a reason for rejecting the submission.");
        payload.finalStatus = reviewDecision; payload.reviewFeedback = notes.trim() || null;
      } else if (action === "schedule" && round) {
        payload[`${round.key}Status`] = "SCHEDULED";
        payload[`${round.key}Date`] = interviewInstant(date, time, timezone);
        payload[`${round.key}Remarks`] = notes.trim() || null;
        payload[`${round.key}Interviewer`] = interviewer.trim() || null;
        payload.meetingLink = meetingLink.trim() || null;
      } else if (action === "result" && round) {
        if (result === "REJECTED" && !notes.trim()) throw new Error("Add feedback for the rejected interview.");
        payload[`${round.key}Status`] = result; payload[`${round.key}Remarks`] = notes.trim() || null;
      } else if (action === "outcome") {
        if (needsOutcomeReason(current, outcome) && !bypassReason.trim()) throw new Error("Add a reason for bypassing remaining hiring steps.");
        payload.finalStatus = outcome; payload.remarks = notes.trim() || null;
        payload.bypassReason = bypassReason.trim();
      } else if (action === "notes") {
        if ((notes.trim() || null) === (current.recruiterComment || null)) { onClose(); return; }
        payload.recruiterComment = notes.trim() || null;
      } else if (action === "rate") {
        if (rate === current.submittedRate) { onClose(); return; }
        payload.submittedRate = rate;
      }
      if (payload.meetingLink && !/^https?:\/\//i.test(payload.meetingLink)) throw new Error("Enter a valid HTTP or HTTPS meeting link.");
      const saved = await atsApi.submissions.update(current.id, payload);
      toast.success(action === "review" ? reviewDecision === "SUBMITTED" ? "Submission approved." : "Submission rejected." : "Submission updated.");
      onSaved(saved);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save. Please try again."); }
    finally { saveLock.current = false; setSaving(false); }
  }
  const saveLabel = action === "schedule" ? "Save interview" : action === "result" ? "Save result" : action === "outcome" ? "Save status" : action === "rate" ? "Save rate" : "Save notes";
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent className="sm:max-w-[440px] max-h-[90dvh] overflow-y-auto rounded-xl p-0 gap-0" onInteractOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (saving) event.preventDefault(); }}>
      <DialogHeader className="px-6 pt-6 pb-4 text-left">
        <DialogTitle className="text-lg font-bold">{ACTION_LABELS[action]}</DialogTitle>
        <DialogDescription className="text-xs pt-2">
          <span className="block font-semibold text-[#1a4fa0] dark:text-blue-300">{current?.candidateName || submission.candidateName || "Name unavailable"}</span>
          <span className="block mt-1">{[current?.jobTitle || submission.jobTitle, current?.clientName || submission.clientName].filter(Boolean).join(" · ") || "Job details unavailable"}</span>
        </DialogDescription>
      </DialogHeader>
      {loadError ? <div role="alert" className="px-6 pb-6 text-xs text-red-700">{loadError}<Button variant="outline" className="ml-2 text-xs" onClick={() => setRevision(r => r + 1)}>Retry</Button></div> : !current ? <div role="status" className="p-8 text-center text-xs text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading submission…</div> : !permitted ? <div className="px-6 pb-6 text-xs" role="alert">This action is no longer available. The submission or your permissions may have changed.</div> :
      <form onSubmit={event => { event.preventDefault(); if (action !== "review") void save(); }}>
        <fieldset disabled={saving} className="space-y-4 px-6 pb-6">
          {(action === "schedule" || action === "result") && round && <div className="space-y-1.5"><Label htmlFor="update-round" className="text-xs">Round</Label><Input id="update-round" readOnly value={round.label} className="text-xs h-9" /></div>}
          {action === "schedule" && <>
            <div className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="interview-date" className="text-xs">Date</Label><Input id="interview-date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="text-xs h-9" /></div>
              <div className="space-y-1.5"><Label htmlFor="interview-time" className="text-xs">Time</Label><Input id="interview-time" type="time" value={time} onChange={e => setTime(e.target.value)} required className="text-xs h-9" /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="interview-timezone" className="text-xs">Timezone</Label><Input id="interview-timezone" readOnly value={timezone} className="text-xs h-9" /><p className="text-[10.5px] text-muted-foreground">{current.timezone ? "Timezone from this job." : "Using your device timezone; this job has no timezone configured."}</p></div>
            <div className="space-y-1.5"><Label htmlFor="meeting-link" className="text-xs">Meeting link (optional)</Label><Input id="meeting-link" type="url" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="Add meeting link" className="text-xs h-9" /></div>
          </>}
          {action === "review" && <div className="flex items-center justify-between rounded-md border border-border p-3"><span className="text-xs">Review candidate resume</span><Button type="button" variant="outline" size="sm" className="text-xs" disabled={resumeLoading} onClick={async () => { setResumeLoading(true); await downloadResume(current); setResumeLoading(false); }}><Download className="h-3.5 w-3.5" />Resume</Button></div>}
          {action === "result" && <div className="space-y-1.5"><Label htmlFor="interview-result" className="text-xs">Result</Label><select id="interview-result" className={SELECT} value={result} onChange={e => setResult(e.target.value)}><option value="CLEARED">Cleared</option><option value="REJECTED">Rejected</option></select></div>}
          {action === "outcome" && <><div className="space-y-1.5"><Label htmlFor="submission-outcome" className="text-xs">Status</Label><select id="submission-outcome" className={SELECT} value={outcome} onChange={e => setOutcome(e.target.value)}>{current.finalStatus !== "OFFER" && <option value="OFFER">Offer issued</option>}<option value="JOIN">Joined</option><option value="REJECTED">Rejected</option></select></div>{needsOutcomeReason(current, outcome) && <div className="space-y-1.5"><Label htmlFor="bypass-reason" className="text-xs">Remarks</Label><Textarea id="bypass-reason" value={bypassReason} onChange={e => setBypassReason(e.target.value)} maxLength={4000} required rows={2} className="text-xs" placeholder="Add remarks…" /><p className="text-xs text-muted-foreground">These remarks will be recorded in the history.</p></div>}</>}
          {action === "rate" ? <div className="space-y-1.5"><Label htmlFor="submission-rate" className="text-xs">Submitted rate {[current.submittedRateCurrency, current.submittedRateTerm].filter(Boolean).join(" / ")}</Label><Input id="submission-rate" type="number" min="0" max="99999999.99" step="0.01" required value={rate} onChange={e => setRate(e.target.value)} className="text-xs h-9" /></div> : <div className="space-y-1.5">
            <Label htmlFor="submission-notes" className="text-xs">{action === "result" ? "Feedback" : "Notes (optional)"}</Label>
            {suggestions.length > 0 && <select aria-label="Use a configured remark" className={SELECT} value="" onChange={e => setNotes(e.target.value)}><option value="" disabled>Use a configured remark…</option>{suggestions.map(t => <option key={t.id} value={t.remarkText}>{t.remarkText}</option>)}</select>}
            <Textarea id="submission-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="text-xs min-h-[76px]" placeholder="Add relevant notes…" />
          </div>}
          {error && <div role="alert" className="rounded-md bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">{error}<button type="button" className="block mt-2 underline" onClick={() => setRevision(r => r + 1)}>Reload latest submission</button></div>}
        </fieldset>
        <DialogFooter className="border-t border-border px-6 py-4 flex-row">
          <Button type="button" variant="outline" disabled={saving} className="text-xs" onClick={onClose}>Cancel</Button>
          {action === "review" ? <><Button type="button" variant="destructive" disabled={saving} className="text-xs" onClick={() => void save("REJECTED")}>Reject</Button><Button type="button" disabled={saving} className={cn("text-xs", PRIMARY)} onClick={() => void save("SUBMITTED")}>{saving && <Loader2 className="h-3 w-3 animate-spin" />}Approve</Button></> : <Button type="submit" disabled={saving} className={cn("text-xs", PRIMARY)}>{saving && <Loader2 className="h-3 w-3 animate-spin" />}{saveLabel}</Button>}
        </DialogFooter>
      </form>}
    </DialogContent>
  </Dialog>;
}

function SubmissionDetails({ submission, onAction }: { submission: TrackerSubmission; onAction: (action: TrackerAction) => void }) {
  const action = primaryAction(submission);
  const detail = [
    ["Job code", submission.jobCode], ["Client", submission.clientName], ["End client", submission.endClientName],
    ["Recruiter", submission.recruiterName], ["Account manager", submission.accountManagerName],
    ["Email", submission.candidateEmail], ["Phone", submission.candidatePhone], ["Location", submission.candidateCurrentLocation],
    ["Submitted rate", submission.submittedRate != null ? [submission.submittedRate, submission.submittedRateCurrency, submission.submittedRateTerm].filter(Boolean).join(" ") : null],
  ];
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold tracking-tight">{submission.candidateName || "Name unavailable"}</h1><p className="mt-1 text-xs text-muted-foreground">{[submission.jobTitle, submission.clientName].filter(Boolean).join(" · ") || "Job details unavailable"}</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" className="text-xs" onClick={() => void downloadResume(submission)}><Download className="h-3.5 w-3.5" />Resume</Button>{submission.capabilities?.notes && <Button variant="outline" className="text-xs" onClick={() => onAction("notes")}>Edit notes</Button>}{submission.capabilities?.rate && <Button variant="outline" className="text-xs" onClick={() => onAction("rate")}>Edit rate</Button>}{submission.finalStatus === "SUBMITTED" && currentRound(submission) && submission[`${currentRound(submission)!.key}Status`] === "SCHEDULED" && submission.capabilities?.schedule && <Button variant="outline" className="text-xs" onClick={() => onAction("schedule")}>Reschedule interview</Button>}{action !== "outcome" && canUpdateOutcome(submission) && <Button variant="outline" className="text-xs" onClick={() => onAction("outcome")}>Update status</Button>}{action && <Button className={cn("text-xs", PRIMARY)} onClick={() => onAction(action)}>{ACTION_LABELS[action]}</Button>}</div>
    </div>
    <div className="rounded-xl border border-border bg-card p-5"><StageBadge submission={submission} /><dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{detail.map(([label, value]) => <div key={label}><dt className="text-[11px] text-muted-foreground">{label}</dt><dd className="mt-1 text-xs break-words">{value || "—"}</dd></div>)}</dl></div>
    <SubmissionHistory submission={submission} />
  </div>;
}

export default function SubmissionsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const view = params.get("view") || "all";
  const submissionId = params.get("submission");
  const { status: workspaceStatus, selection, profile } = useDashboardContext();
  const [bucket, setBucket] = useState<TrackerBucket>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<TrackerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState<TrackerSubmission | null>(null);
  const [editor, setEditor] = useState<{ submission: TrackerSubmission; action: TrackerAction } | null>(null);
  const [collapsedJobs, setCollapsedJobs] = useState<Record<string, boolean>>({});
  const [groupByJob, setGroupByJob] = useState(false);
  const [jobFilter, setJobFilter] = useState<{ id: string; label: string; previousPage: number } | null>(null);
  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    const refresh = () => { setEditor(null); setRevision(r => r + 1); };
    window.addEventListener("app:refresh", refresh); window.addEventListener("branchChanged", refresh);
    return () => { window.removeEventListener("app:refresh", refresh); window.removeEventListener("branchChanged", refresh); };
  }, []);
  useEffect(() => {
    if (workspaceStatus !== "ready") return;
    let cancelled = false;
    const load = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true); setError(""); setDetail(null); setResponse(null);
      if (startDate && endDate && startDate > endDate) { setError("The end date must be on or after the start date."); setLoading(false); return; }
      try {
        if (submissionId) {
          const data = await atsApi.submissions.get(submissionId);
          if (!cancelled) setDetail(data);
        } else {
          const data = await atsApi.submissions.list({ view, bucket, jobId: jobFilter?.id, search: debouncedSearch, startDate, endDate, page, limit: 10 });
          if (!cancelled) {
            if (page > Math.max(1, data.totalPages)) { setPage(Math.max(1, data.totalPages)); return; }
            setResponse(data);
          }
        }
      } catch { if (!cancelled) setError("Unable to load submissions. Please try again."); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [view, submissionId, bucket, jobFilter?.id, debouncedSearch, startDate, endDate, page, revision, workspaceStatus, selection.active.id, profile?.branchId]);
  const detailHref = useCallback((id: string) => { const query = new URLSearchParams(params.toString()); query.set("submission", id); return `/utility/submissions?${query}`; }, [params]);
  function backToTracker() { const query = new URLSearchParams(params.toString()); query.delete("submission"); router.push(`/utility/submissions?${query}`); }
  if (workspaceStatus === "error") return <div role="alert" className="text-sm text-red-700">Unable to load workspace access. Refresh the page to retry.</div>;
  if (editor?.action === "review" && workspaceStatus === "ready") return <ReviewWorkspace key={editor.submission.id} submissionId={editor.submission.id} onClose={() => setEditor(null)} onSaved={saved => { setEditor(null); setDetail(saved); setRevision(r => r + 1); }} />;
  return <main className="space-y-5 min-w-0 text-foreground">
    {submissionId ? <Button variant="ghost" size="sm" className="text-xs -ml-2" onClick={backToTracker}><ArrowLeft className="h-3.5 w-3.5" />Back to submissions</Button> : <div><h1 className="text-xl font-bold tracking-tight">{view === "my" ? "My submissions" : view === "pod" ? "Pod submissions" : "Submissions"}</h1><p className="mt-1 text-xs text-muted-foreground">Track progress. Take the next action.</p></div>}
    {!submissionId && <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs" aria-label="Submission tracker">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
        <div role="group" aria-label="Submission stage" className="flex flex-wrap gap-0">{FILTERS.map(filter => <button type="button" aria-pressed={bucket === filter.key} key={filter.key} onClick={() => { setBucket(filter.key); setPage(1); }} className={cn("flex items-center gap-2 border border-border px-3 py-2 text-xs font-medium first:rounded-l-md last:rounded-r-md focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-blue-500 -ml-px first:ml-0", bucket === filter.key ? "border-blue-300 bg-blue-50 text-[#1a4fa0] dark:bg-blue-950 dark:text-blue-200" : "hover:bg-muted")}>
          {filter.label}<span className={cn("rounded-full px-1.5 py-0.5 text-[10.5px] min-w-5 text-center", bucket === filter.key ? PRIMARY : "bg-muted text-muted-foreground")}>{response?.counts?.[filter.key] ?? "—"}</span>
        </button>)}</div>
        <div className="flex flex-1 sm:flex-none items-center gap-2"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" aria-label="Search candidate, job code or client" placeholder="Search candidate, job code or client…" value={search} onChange={e => setSearch(e.target.value)} className="h-9 pl-9 text-xs sm:w-[240px]" /></div><Button variant="outline" className={cn("h-9 text-xs", OUTLINE)} aria-expanded={showFilters} onClick={() => setShowFilters(v => !v)}><Filter className="h-3.5 w-3.5" />More filters</Button><Button variant="ghost" size="icon" aria-label="Refresh submissions" disabled={loading} onClick={() => setRevision(r => r + 1)}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></Button></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2 text-xs">
        <div>{jobFilter && <button type="button" className="rounded-md bg-blue-50 px-3 py-1.5 text-[#1a4fa0] dark:bg-blue-950 dark:text-blue-200" aria-label={`Remove job filter ${jobFilter.label}`} onClick={() => { setPage(jobFilter.previousPage); setJobFilter(null); }}>Job: {jobFilter.label} <span aria-hidden="true" className="ml-2">×</span></button>}</div>
        <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" role="switch" checked={groupByJob} onChange={event => setGroupByJob(event.target.checked)} className="accent-[#1a4fa0]" />Group by job</label>
      </div>
      {showFilters && <div className="flex flex-wrap items-end gap-3 border-t border-border bg-muted/30 px-5 py-4"><div className="space-y-1"><Label htmlFor="from-date" className="text-xs">Submitted from</Label><Input id="from-date" type="date" className="h-9 text-xs" value={startDate} max={endDate || undefined} onChange={e => { setStartDate(e.target.value); setPage(1); }} /></div><div className="space-y-1"><Label htmlFor="to-date" className="text-xs">Submitted to</Label><Input id="to-date" type="date" className="h-9 text-xs" value={endDate} min={startDate || undefined} onChange={e => { setEndDate(e.target.value); setPage(1); }} /></div><Button variant="ghost" className="text-xs" onClick={() => { setStartDate(""); setEndDate(""); setSearch(""); setPage(1); }}>Clear filters</Button></div>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-xs"><thead className="border-y border-border bg-muted/40"><tr>{(groupByJob ? ["Candidate", "Pipeline", "Next round", "Action"] : ["Job code", "Job title", "Client / End client", "Candidate", "Pipeline", "Next round", "Action"]).map(label => <th scope="col" key={label} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground last:w-[185px]">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {loading || workspaceStatus !== "ready" ? <tr><td colSpan={groupByJob ? 4 : 7} className="py-16 text-center text-muted-foreground" role="status"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />Loading submissions…</td></tr> : error ? <tr><td colSpan={groupByJob ? 4 : 7} className="py-12 text-center" role="alert">{error}<Button variant="outline" className="ml-3 text-xs" onClick={() => setRevision(r => r + 1)}>Retry</Button></td></tr> : !response?.data.length ? <tr><td colSpan={groupByJob ? 4 : 7} className="py-16 text-center text-muted-foreground">No submissions match these filters.</td></tr> : !groupByJob ? response.data.map(sub => {
              const action = primaryAction(sub); const round = currentRound(sub);
              const count = sub.matchingJobSubmissionCount ?? 1;
              return <tr key={sub.id} className="hover:bg-muted/25">
                <td className="px-4 py-3"><p className="whitespace-nowrap font-semibold text-[#1a4fa0]">{sub.jobCode || "Code unavailable"}</p><div className="mt-1 flex flex-wrap gap-1">{sub.jobUrgency && <span className="rounded bg-muted px-1.5 py-0.5 text-[10.5px]">{sub.jobUrgency}</span>}{sub.jobIsCoSourced && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10.5px] text-blue-800">Co-sourced</span>}</div><button type="button" className="mt-1 text-[10.5px] text-[#1a4fa0] underline" onClick={() => { setJobFilter({ id: sub.jobId, label: sub.jobCode || sub.jobTitle || "Selected job", previousPage: jobFilter?.previousPage ?? page }); setPage(1); }}>{count} {count === 1 ? "submission" : "submissions"}</button></td>
                <td className="px-4 py-3">{sub.jobTitle || "Title unavailable"}</td>
                <td className="px-4 py-3"><p>{sub.clientName || "Client unavailable"}</p><p className="mt-1 text-[10.5px] text-muted-foreground">End client: {sub.endClientName || "Not provided"}</p></td>
                <td className="px-4 py-3"><Link href={detailHref(sub.id)} className="font-semibold text-[#1a4fa0] hover:underline">{sub.candidateName || "Name unavailable"}</Link></td>
                <td className="px-4 py-3"><Pipeline submission={sub} /></td>
                <td className="px-4 py-3 text-muted-foreground">{sub.finalStatus === "PENDING_APPROVAL" ? "Awaiting review" : ["JOIN", "REJECTED", "OFFER"].includes(sub.finalStatus) || !round ? "—" : <><p className="font-semibold">{round.label}</p><p className="mt-1 text-[10.5px]">{formatInterview(sub[`${round.key}Date`], validTimezone(sub.timezone))}</p></>}</td>
                <td className="px-4 py-3">{action ? <Button variant={action === "schedule" ? "default" : "outline"} className={cn("h-9 w-full text-xs", action === "schedule" ? PRIMARY : OUTLINE)} onClick={() => setEditor({ submission: sub, action })}>{ACTION_LABELS[action]}</Button> : <Button variant="outline" className={cn("h-9 w-full text-xs", OUTLINE)} asChild><Link href={detailHref(sub.id)}>View details</Link></Button>}</td>
              </tr>;
            }) : Array.from(new Set(response.data.map(sub => sub.jobId))).map(jobId => {
              const submissions = response.data.filter(sub => sub.jobId === jobId);
              const job = submissions[0];
              return <Fragment key={jobId}><tr className="bg-blue-50/70 dark:bg-blue-950/40"><td colSpan={4} className="px-5 py-3"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-x-3 gap-y-2"><button type="button" className="font-semibold text-[#1a4fa0] dark:text-blue-200" aria-expanded={!collapsedJobs[jobId]} onClick={() => setCollapsedJobs(previous => ({ ...previous, [jobId]: !previous[jobId] }))}>{collapsedJobs[jobId] ? "▸" : "▾"} {job.jobCode || "Code unavailable"}</button><span className="font-semibold text-[#1a4fa0] dark:text-blue-200">{job.jobTitle || "Title unavailable"}</span><span className="text-[10.5px]">Client: {job.clientName || "Not provided"}</span><span className="text-[10.5px]">End client: {job.endClientName || "Not provided"}</span>{job.jobUrgency && <span className="rounded bg-amber-100 px-2 py-1 text-[10.5px] text-amber-900">{job.jobUrgency}</span>}{job.jobIsCoSourced && <span className="rounded bg-violet-100 px-2 py-1 text-[10.5px] text-violet-800">Co-sourced</span>}</div><span className="text-[10.5px] text-muted-foreground">{job.matchingJobSubmissionCount ?? submissions.length} matching submissions{submissions.length < (job.matchingJobSubmissionCount ?? submissions.length) && ` · ${submissions.length} on this page`}</span></div></td></tr>{!collapsedJobs[jobId] && submissions.map(sub => {
              const action = primaryAction(sub); const round = currentRound(sub);
              const closed = ["PENDING_APPROVAL", "REJECTED", "OFFER", "JOIN"].includes(sub.finalStatus);
              return <tr key={sub.id} className="hover:bg-muted/25 transition-colors">
                <td className="px-5 py-3"><Link href={detailHref(sub.id)} className="font-semibold text-[#1a4fa0] hover:underline dark:text-blue-300">{sub.candidateName || "Name unavailable"}</Link>{sub.candidateEmail && <p className="mt-1 text-[10.5px] text-muted-foreground">{sub.candidateEmail}</p>}{sub.candidatePhone && <p className="mt-1 text-[10.5px] text-muted-foreground">{sub.candidatePhone}</p>}</td>
                <td className="px-5 py-3"><Pipeline submission={sub} /></td>
                <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">{sub.finalStatus === "PENDING_APPROVAL" ? "Awaiting review" : closed || !round ? "—" : <><p className="font-semibold">{round.label}</p><p className="mt-1 text-[10.5px]">{formatInterview(sub[`${round.key}Date`], validTimezone(sub.timezone))}</p></>}</td>
                <td className="px-5 py-3">{action ? <Button variant={action === "schedule" ? "default" : "outline"} className={cn("h-9 w-full text-xs", action === "schedule" ? PRIMARY : OUTLINE)} onClick={() => setEditor({ submission: sub, action })}>{ACTION_LABELS[action]}</Button> : <Button variant="outline" className={cn("h-9 w-full text-xs", OUTLINE)} asChild><Link href={detailHref(sub.id)}>View details</Link></Button>}</td>
              </tr>;
            })}</Fragment>;
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-xs text-muted-foreground">
        <p>{response ? `Showing ${response.total ? (response.page - 1) * response.limit + 1 : 0}–${Math.min(response.page * response.limit, response.total)} of ${response.total}` : "Loading records…"}</p>
        <nav aria-label="Submission pages" className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous page" disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>{response && Array.from({ length: Math.min(5, response.totalPages) }, (_, i) => Math.max(1, Math.min(page - 2, response.totalPages - 4)) + i).map(p => <Button key={p} variant={p === page ? "default" : "outline"} className={cn("h-8 min-w-8 px-2 text-xs", p === page && PRIMARY)} aria-label={`Page ${p}`} aria-current={p === page ? "page" : undefined} disabled={loading} onClick={() => setPage(p)}>{p}</Button>)}<Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next page" disabled={loading || !response || page >= response.totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button></nav>
      </div>
    </section>}
    {submissionId && (loading ? <div role="status" className="p-12 text-center text-xs">Loading submission…</div> : error ? <div role="alert" className="text-xs">{error}<Button variant="outline" className="ml-3 text-xs" onClick={() => setRevision(r => r + 1)}>Retry</Button></div> : detail && <SubmissionDetails submission={detail} onAction={action => setEditor({ submission: detail, action })} />)}
    {editor && <UpdateDialog key={`${editor.submission.id}-${editor.action}`} submission={editor.submission} action={editor.action} onClose={() => setEditor(null)} onSaved={saved => { setEditor(null); setDetail(saved); setRevision(r => r + 1); }} />}
  </main>;
}
