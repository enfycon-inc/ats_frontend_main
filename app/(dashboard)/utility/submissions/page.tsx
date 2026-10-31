"use client";
import useSWR from 'swr';
import SubmissionFilterBar from '@/components/submissions/submission-filter-bar';
import { localFilterAccess, readSubmissionFilters, submissionFilterQuery, submissionTabs } from '@/lib/submission-filters';
import { InterviewRoundStatus, type RoundKey, type TrackerListFilters } from '@/lib/submission-contract';
import { UserIdentity } from '@/components/shared/user-identity';
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { PodFeatureGate } from "@/components/shared/pod-feature-gate";

import { StageBadge, Pipeline } from "@/components/submissions/submission-stage";
import { ResumeDownloadButton } from "@/components/submissions/resume-download";
import { SubmissionActions } from "@/components/submissions/submission-actions";
import { useTrackerColumns, TRACKER_COLUMN_WIDTHS, type TrackerColumn } from "@/components/submissions/tracker-columns";
import { UpdateSubmissionDialog } from "@/components/submissions/update-submission-dialog";
import { SubmissionHistory } from "@/components/submissions/submission-history";
import { compensationLabel, formatClientTerms, submissionCompensationValue } from "@/lib/submission-compensation";
import { ReviewWorkspace } from "@/components/submissions/review-workspace";
import { stageRemarkSuggestions } from "@/lib/stage-remarks";
import { USER_CITY_OPTIONS } from "@/lib/user-city-contract";
import { closeSubmissionReviewHref, submissionReviewHref } from "@/lib/submission-review-navigation";

import { Suspense, Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, Loader2, RefreshCw, Mail, Phone, MapPin, BriefcaseBusiness, Building2, ExternalLink } from "lucide-react";
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
import { ACTION_LABELS, canRejectRound, canRecordResult, canUpdateOutcome, needsOutcomeReason, currentRound, interviewInstant, localInterviewParts, primaryAction, validTimezone, type TrackerAction } from "@/lib/submission-tracker";

const FILTERS = submissionTabs;
function submissionOrdinal(value: number): string {
  const remainder = value % 100;
  const suffix = remainder >= 11 && remainder <= 13 ? 'th' : value % 10 === 1 ? 'st' : value % 10 === 2 ? 'nd' : value % 10 === 3 ? 'rd' : 'th';
  return `${value}${suffix}`;
}

function jobTypeBadgeClass(jobType?: string | null): string {
  switch (jobType?.trim().toLowerCase()) {
    case 'full time': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200';
    case 'part time': return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200';
    case 'contract': return 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200';
    case 'c2h':
    case 'contract to hire':
    case 'contract-to-hire': return 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200';
    case 'freelance': return 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  }
}

const PRIMARY = "bg-[#1a4fa0] text-white hover:bg-[#154181]";
const SELECT = "h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500";
function TableDate({ value, timezone }: { value?: string | null; timezone?: string | null }) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return <span>—</span>;
  const instant = new Date(value);
  const zone = validTimezone(timezone);
  const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: zone }).format(instant);
  const time = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: zone, timeZoneName: 'short' }).format(instant);
  return <time dateTime={value} title={zone} className="block"><span className="block">{date}</span><span className="mt-1 block text-xs text-muted-foreground">{time}</span></time>;
}
type PersonKind = "candidate" | "recruiter" | "account-manager";
type ProfileTarget = { kind: PersonKind; submission: TrackerSubmission };
interface PersonProfileData {
  fullName?:string;full_name?:string;email?:string;phone?:string;avatar?:string;profilePicture?:string;profile_picture?:string;designation?:string;jobTitle?:string;city?:string;state?:string;businessUnitName?:string;podName?:string;currentCompany?:string;experienceYears?:number|string;noticePeriodDays?:number;skills?:string[];assignedRoles?:{name:string}[];
  parsedJson?:{experience?:{detected_roles?:string[]};ats_normalized?:{designations?:Array<string|{raw?:string;canonical?:string}>}};
}
function PersonProfileDialog({ target, onClose }: { target: ProfileTarget; onClose: () => void }) {
  const [profile, setProfile] = useState<PersonProfileData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const request = target.kind === "candidate"
      ? atsApi.candidates.get(target.submission.candidateId)
      : atsApi.submissions.getPersonProfile(target.submission.id, target.kind);
    void request.then(value => { if (!cancelled) setProfile(value as PersonProfileData); })
      .catch(() => { if (!cancelled) setError("Unable to load this profile. Please try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [target]);
  const candidate = target.kind === "candidate";
  const fullName = profile?.fullName || profile?.full_name || target.submission.candidateName || target.submission.recruiterName || target.submission.accountManagerName || "Profile";
  const email = profile?.email || (candidate ? target.submission.candidateEmail : target.kind === "recruiter" ? target.submission.recruiterEmail : target.submission.accountManagerEmail);
  const avatar = profile?.avatar || profile?.profilePicture || profile?.profile_picture || null;
  const parsed = profile?.parsedJson || {};
  const roles: string[] = candidate
    ? [...new Set([...(Array.isArray(parsed?.experience?.detected_roles) ? parsed.experience.detected_roles : []), ...(Array.isArray(parsed?.ats_normalized?.designations) ? parsed.ats_normalized.designations.map((item: string | {raw?:string;canonical?:string}) => typeof item === "string" ? item : item?.raw || item?.canonical) : [])].filter((value):value is string=>Boolean(value)))]
    : (profile?.assignedRoles || []).map((role: {name:string}) => role.name).filter(Boolean);
  const designation = candidate ? profile?.jobTitle || target.submission.candidateDesignation : profile?.designation;
  const location = candidate
    ? [profile?.city, profile?.state].filter(Boolean).join(", ")
    : USER_CITY_OPTIONS.find(city => city.value === profile?.city)?.label || profile?.city;
  const skills: string[] = candidate && Array.isArray(profile?.skills) ? profile.skills : [];
  const candidateHref = candidate ? `/applicants/${encodeURIComponent(target.submission.candidateId)}` : null;
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="sm:max-w-[620px] max-h-[88dvh] overflow-y-auto rounded-xl p-0 gap-0">
      <DialogHeader className="border-b border-border px-6 py-5 text-left">
        <DialogTitle className="text-lg font-bold">{candidate ? "Candidate profile" : "User profile"}</DialogTitle>
        <DialogDescription>{candidate ? "Candidate details for this submission" : "Team member details for this submission"}</DialogDescription>
      </DialogHeader>
      {loading ? <PageLoadingSkeleton variant="table" /> : <div className="space-y-6 px-6 py-6">
        {error && <div role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}
        <div className="flex items-center gap-4">
          {avatar ? <img src={avatar} alt="" className="h-16 w-16 rounded-full border border-border object-cover" /> : <div aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-semibold text-[#1a4fa0]">{fullName.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase()}</div>}
          <div className="min-w-0"><h2 className="text-xl font-semibold">{fullName}</h2><p className="mt-1 text-sm text-muted-foreground">{designation || (candidate ? "Designation not provided" : "Designation not provided")}</p></div>
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><dt className="text-xs text-muted-foreground">Email</dt><dd className="mt-1 break-all text-sm">{email || "Not provided"}</dd></div></div>
          <div className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">Phone</dt><dd className="mt-1 text-sm">{profile?.phone || (candidate ? target.submission.candidatePhone : "Not provided") || "Not provided"}</dd></div></div>
          <div className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">{candidate ? "Location" : "City"}</dt><dd className="mt-1 text-sm">{location || "Not provided"}</dd></div></div>
          {!candidate && <div className="flex gap-3"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">Business unit</dt><dd className="mt-1 text-sm">{profile?.businessUnitName || "Not provided"}</dd></div></div>}
          {candidate && <div className="flex gap-3"><BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">Experience</dt><dd className="mt-1 text-sm">{Number(profile?.experienceYears || 0)} years</dd></div></div>}
          {candidate && <div className="flex gap-3"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">Current company</dt><dd className="mt-1 text-sm">{profile?.currentCompany || "Not provided"}</dd></div></div>}
          {candidate && <div className="flex gap-3"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">Notice period</dt><dd className="mt-1 text-sm">{profile?.noticePeriodDays != null ? `${profile.noticePeriodDays} days` : "Not provided"}</dd></div></div>}
        </dl>
        <div className={candidate ? undefined : "grid grid-cols-1 gap-6 sm:grid-cols-2"}>
          <div><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{candidate ? "Roles" : "Assigned roles"}</h3>{roles.length ? <div className="mt-2 flex flex-wrap gap-2">{roles.map(role => <span key={role} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#1a4fa0]">{role}</span>)}</div> : <p className="mt-2 text-sm text-muted-foreground">{candidate ? "No roles listed in the profile" : "No assigned roles listed"}</p>}</div>
          {!candidate && <div><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team</h3><p className="mt-2 text-sm">{profile?.podName || ""}</p></div>}
        </div>
        {candidate && <div><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills</h3>{skills.length ? <div className="mt-2 flex flex-wrap gap-2">{skills.slice(0, 16).map(skill => <span key={skill} className="rounded-full border border-border px-3 py-1 text-xs">{skill}</span>)}</div> : <p className="mt-2 text-sm text-muted-foreground">No skills listed</p>}</div>}
        {candidateHref && <div className="border-t border-border pt-4"><Link href={candidateHref} className="inline-flex items-center gap-2 text-sm font-medium text-[#1a4fa0] hover:underline">Open full candidate profile <ExternalLink className="h-4 w-4" /></Link></div>}
      </div>}
    </DialogContent>
  </Dialog>;
}
function CandidateCell({ submission: sub, onOpen }: { submission: TrackerSubmission; onOpen: () => void }) {
  return <><button type="button" onClick={onOpen} className="text-left font-semibold text-[#1a4fa0] hover:underline dark:text-blue-300">{sub.candidateName || "Name unavailable"}</button>{[sub.candidateEmail || "Email unavailable", sub.candidatePhone || "Mobile unavailable", sub.candidateCurrentLocation || "Location unavailable"].map((text, i) => <p key={i} className="mt-1 break-words text-xs text-muted-foreground">{text}</p>)}</>;
}
interface RemarkTemplate { id: number; stage: string; remarkText: string; remarkType?: string }
function UpdateDialog({ submission, action: initialAction, onClose, onSaved }: {
  submission: TrackerSubmission; action: TrackerAction; onClose: () => void; onSaved: (sub: TrackerSubmission) => void;
}) {
  const [action] = useState<TrackerAction>(initialAction);
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

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      requestId.current = null;
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
  const permitted = current && (action === "schedule" && round && current.finalStatus === "SUBMITTED" && (current.capabilities?.schedule || current.capabilities?.results[round.key]) ? true : action === "reject" ? canRejectRound(current) : action === "result" ? canRecordResult(current) : action === "outcome" ? canUpdateOutcome(current) : action === "notes" ? current.capabilities?.notes : action === "rate" ? current.capabilities?.rate : primaryAction(current) === action);
  const templateStage = action === "review" ? "review" : action === "outcome" ? "final" : round?.key;
  const suggestions = notes.trim() ? stageRemarkSuggestions(templates, templateStage).filter(template => template.remarkText.toLowerCase().includes(notes.trim().toLowerCase()) && template.remarkText.trim().toLowerCase() !== notes.trim().toLowerCase()).slice(0, 5) : [];

  const bypassSuggestions = bypassReason.trim() ? stageRemarkSuggestions(templates, "final").filter(template => template.remarkText.toLowerCase().includes(bypassReason.trim().toLowerCase()) && template.remarkText.trim().toLowerCase() !== bypassReason.trim().toLowerCase()).slice(0, 5) : [];

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
      } else if (action === "reject" && round) {
        if (!notes.trim()) throw new Error("Add remarks for the stage rejection.");
        payload[`${round.key}Status`] = "REJECTED";
        payload[`${round.key}Remarks`] = notes.trim();
      } else if (action === "result" && round) {
        if (result === "REJECTED" && !notes.trim()) throw new Error("Add feedback for the rejected interview.");
        payload[`${round.key}Status`] = result as TrackerUpdate['l1Status']; payload[`${round.key}Remarks`] = notes.trim() || null;
      } else if (action === "outcome") {
        if (needsOutcomeReason(current, outcome) && !bypassReason.trim()) throw new Error("Add a reason for bypassing remaining hiring steps.");
        if (outcome === "REJECTED" && !notes.trim()) throw new Error("Add remarks for the rejection.");
        payload.finalStatus = outcome as TrackerUpdate['finalStatus']; payload.remarks = notes.trim() || null;
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
  const saveLabel = action === "reject" ? "Reject Candidate" : action === "schedule" ? "Save interview" : action === "result" ? "Save result" : action === "outcome" ? "Save status" : action === "rate" ? "Save rate" : "Save notes";
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent className="sm:max-w-[440px] max-h-[90dvh] overflow-y-auto rounded-xl p-0 gap-0" onInteractOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (saving) event.preventDefault(); }}>
      <DialogHeader className="px-6 pt-6 pb-4 text-left">
        <DialogTitle className="text-lg font-bold">{action === "reject" ? "Reject Candidate" : ACTION_LABELS[action] || "Update submission"}</DialogTitle>
        <DialogDescription className="text-xs pt-2">
          <span className="block font-semibold text-[#1a4fa0] dark:text-blue-300">{current?.candidateName || submission.candidateName || "Name unavailable"}</span>
          <span className="block mt-1">{[current?.jobTitle || submission.jobTitle, current?.clientName || submission.clientName].filter(Boolean).join(" · ") || "Job details unavailable"}</span>
        </DialogDescription>
      </DialogHeader>
      {loadError ? <div role="alert" className="px-6 pb-6 text-xs text-red-700">{loadError}<Button variant="outline" className="ml-2 text-xs" onClick={() => setRevision(r => r + 1)}>Retry</Button></div> : !current ? <PageLoadingSkeleton variant="table" /> : !permitted ? <div className="px-6 pb-6 text-xs" role="alert">This action is no longer available. The submission or your permissions may have changed.</div> :
      <form onSubmit={event => { event.preventDefault(); if (action !== "review") void save(); }}>
        <fieldset disabled={saving} className="space-y-4 px-6 pb-6">
          {(action === "schedule" || action === "result" || action === "reject") && round && <div className="space-y-1.5"><Label htmlFor="update-round" className="text-xs">Round</Label><Input id="update-round" readOnly value={round.label} className="text-xs h-9" /></div>}
          {action === "schedule" && <>
            <div className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="interview-date" className="text-xs">Date</Label><Input id="interview-date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="text-xs h-9" /></div>
              <div className="space-y-1.5"><Label htmlFor="interview-time" className="text-xs">Time</Label><Input id="interview-time" type="time" value={time} onChange={e => setTime(e.target.value)} required className="text-xs h-9" /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="interview-timezone" className="text-xs">Timezone</Label><Input id="interview-timezone" readOnly value={timezone} className="text-xs h-9" /><p className="text-xs text-muted-foreground">{current.timezone ? "Timezone from this job." : "Using your device timezone; this job has no timezone configured."}</p></div>
            <div className="space-y-1.5"><Label htmlFor="meeting-link" className="text-xs">Meeting link (optional)</Label><Input id="meeting-link" type="url" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="Add meeting link" className="text-xs h-9" /></div>
          </>}
          {action === "result" && <div className="space-y-1.5"><Label htmlFor="interview-result" className="text-xs">Result</Label><select id="interview-result" className={SELECT} value={result} onChange={e => setResult(e.target.value)}><option value="CLEARED">Selected</option><option value="REJECTED">Rejected</option></select></div>}
          {action === "outcome" && <><div className="space-y-1.5"><Label htmlFor="submission-outcome" className="text-xs">Status</Label><select id="submission-outcome" className={SELECT} value={outcome} onChange={e => setOutcome(e.target.value)}>{current.finalStatus !== "OFFER" && <option value="OFFER">Offer issued</option>}<option value="JOIN">Joined</option><option value="REJECTED">Rejected</option></select></div>{needsOutcomeReason(current, outcome) && <div className="space-y-1.5"><Label htmlFor="bypass-reason" className="text-xs">Remarks</Label><Textarea id="bypass-reason" value={bypassReason} onChange={e => setBypassReason(e.target.value)} maxLength={4000} required rows={2} className="text-xs" placeholder="Type remarks to see suggestions…" />{bypassSuggestions.length > 0 && <div aria-label="Final remark suggestions" className="max-h-40 space-y-1 overflow-y-auto">{bypassSuggestions.map(template => <button key={template.id} type="button" disabled={saving} className="block w-full rounded border border-border px-3 py-2 text-left text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-blue-500" onClick={() => setBypassReason(template.remarkText)}>{template.remarkText}</button>)}</div>}<p className="text-xs text-muted-foreground">These remarks will be recorded in the history.</p></div>}</>}
          <div className="space-y-1.5">
            <Label htmlFor="submission-notes" className="text-xs">{action === "outcome" || action === "reject" ? "Remarks" : action === "result" ? "Feedback" : "Notes (optional)"}</Label>

            <Textarea id="submission-notes" value={notes} onChange={e => setNotes(e.target.value)} required={action === "reject"} rows={3} className="text-xs min-h-[76px]" placeholder="Type remarks to see suggestions…" />
            {suggestions.length > 0 && <div aria-label="Remark suggestions" className="max-h-40 space-y-1 overflow-y-auto">{suggestions.map(template => <button key={template.id} type="button" disabled={saving} className="block w-full rounded border border-border px-3 py-2 text-left text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-blue-500" onClick={() => setNotes(template.remarkText)}>{template.remarkText}</button>)}</div>}
          </div>
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

function SubmissionDetails({ submission, onReview }: { submission: TrackerSubmission; onReview: () => void }) {
  const detail = [
    ["Job code", submission.jobCode], ["Client", submission.clientName], ["End client", submission.endClientName],
    ["Recruiter", submission.recruiterName], ["Account manager", submission.accountManagerName],
    ["Email", submission.candidateEmail], ["Phone", submission.candidatePhone], ["Location", submission.candidateCurrentLocation],
    [compensationLabel(false, submission.jobType, submission.compensationPeriod), submissionCompensationValue(submission, false)],
    [compensationLabel(true, submission.jobType, submission.compensationPeriod), submissionCompensationValue(submission, true)],
  ];
  return <div className="space-y-5">
    {submission.keepExistingSubmissionsOpen && submission.jobStatus?.toLowerCase() === "closed" && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:bg-blue-950 dark:text-blue-200">Closed to new submissions. Existing candidates remain in progress.</p>}
    {submission.workflowPaused && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">Job closed - workflow paused. Activate the job to edit submission status. Recorded outcomes and interview history are preserved.</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold tracking-tight">{submission.candidateName || "Name unavailable"}</h2><p className="mt-1 text-xs text-muted-foreground">{[submission.jobTitle, submission.clientName].filter(Boolean).join(" · ") || "Job details unavailable"}</p></div>
      <ResumeDownloadButton submission={submission} />
    </div>
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col items-center gap-1.5">
        <StageBadge submission={submission} />
        {submission.capabilities?.review && submission.finalStatus === "PENDING_APPROVAL" && <button
          type="button"
          aria-label={`Review submission for ${submission.candidateName || "candidate"}`}
          onClick={onReview}
          className="inline-flex min-h-6 items-center justify-center gap-1 rounded px-2 text-xs font-medium text-[#1a4fa0] hover:underline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300"
        >Review submission <span aria-hidden="true">→</span></button>}
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{detail.map(([label, value]) => <div key={label}><dt className="text-[11px] text-muted-foreground">{label}</dt><dd className="mt-1 text-xs break-words">{value || "—"}</dd></div>)}</dl>
    </div>
    <SubmissionHistory submission={submission} />
  </div>;
}

function SubmissionsPageContent() {
  const {profile,selection}=useDashboardContext();
  const params=useSearchParams();
  const scope=[profile?.id,profile?.tenantId,profile?.branchId,profile?.businessUnitId,selection.active.id,[...(profile?.permissions??[])].sort().join(','),params.get('submission')??''].join(':');
  return <FilteredSubmissionsPage key={scope} scope={scope}/>;
}
function FilteredSubmissionsPage({scope}:{scope:string}) {
  const router = useRouter();
  const params = useSearchParams();
  const { status: workspaceStatus, profile } = useDashboardContext();
  const access=localFilterAccess(profile?.permissions??[]);
  const permissions: string[]=profile?.permissions??[];
  const canViewClientBillRate=permissions.some(permission=>['job:bill_rate:view','*','platform:manage'].includes(permission));
  const canViewClientCommission=permissions.some(permission=>['placement:view','*','platform:manage'].includes(permission));
  const canViewClientTerms=canViewClientBillRate||canViewClientCommission;
  const [filters,setFilters]=useState<TrackerListFilters>(()=>({...readSubmissionFilters(new URLSearchParams(params.toString())),view:params.get('view')||(access.portfolio?'my':'all')}));
  const bucket=filters.bucket??'all';
  function changeFilters(patch:Partial<TrackerListFilters>,reset=false){setFilters(f=>{if(reset)return {view:f.view,bucket:'all',page:1};const next={...f,...patch,page:patch.page??1};if(patch.bucket==='closures'&&f.bucket!=='closures'&&patch.dateBasis===undefined)next.dateBasis='joined';if(next.bucket!=='closures'&&next.dateBasis==='joined')next.dateBasis='submitted';return next;});}
  function setBucket(value:TrackerBucket){changeFilters({bucket:value,stage:undefined,stageStatus:undefined,queue:undefined,workflow:undefined,...(value==='review'||filters.roundStatus!=='CLEARED'?{round:undefined,roundStatus:undefined}:{}),dateBasis:value==='closures'?'joined':'submitted'});}
  const page=filters.page??1;
  const setPage=(value:number|((current:number)=>number))=>setFilters(f=>({...f,page:typeof value==='function'?value(f.page??1):value}));
  const submissionId = params.get("submission");
  const reviewRequested = Boolean(submissionId && params.get("review") === "1");
  const [search,setSearch]=useState(filters.search??'');
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState<TrackerSubmission | null>(null);
  const [editor, setEditor] = useState<{ submission: TrackerSubmission; action: TrackerAction } | null>(null);
  const [profileTarget, setProfileTarget] = useState<ProfileTarget | null>(null);
  const [collapsedJobs, setCollapsedJobs] = useState<Record<string, boolean>>({});
  const [groupByJob, setGroupByJob] = useState(params.get("groupByJob")==="1");
  const { columns, sort, headers } = useTrackerColumns(profile ? `submission-columns:v1:${profile.tenantId}:${profile.id}` : null, groupByJob, 'Account manager', {key:(params.get('sortBy')||'submitted') as import('@/lib/submission-contract').TrackerSortKey,direction:params.get('sortDirection')==='asc'?'asc':'desc'}, bucket==='closures'?'Joined at':'Submission date',canViewClientTerms,access.portfolio);
  const quickRoundOptions: RoundKey[] = ['l1', 'l2', 'l3'];
  const quickRoundStatuses = [InterviewRoundStatus.PENDING, InterviewRoundStatus.SCHEDULED, InterviewRoundStatus.AWAITING_FEEDBACK];
  function toggleQuickRound(round: RoundKey) {
    changeFilters({ round: filters.round === round ? undefined : round, roundStatus: filters.round === round ? undefined : filters.roundStatus, bucket: 'all' });
  }
  function toggleQuickRoundStatus(roundStatus: InterviewRoundStatus) {
    changeFilters({ roundStatus: filters.roundStatus === roundStatus ? undefined : roundStatus, bucket: 'all' });
  }
  useEffect(()=>{if(search===(filters.search??''))return;const t=setTimeout(()=>changeFilters({search}),300);return()=>clearTimeout(t);},[search,filters.search]);
  useEffect(()=>{const refresh=()=>{setEditor(null);setRevision(r=>r+1);};window.addEventListener('app:refresh',refresh);window.addEventListener('branchChanged',refresh);return()=>{window.removeEventListener('app:refresh',refresh);window.removeEventListener('branchChanged',refresh);};},[]);
  useEffect(()=>{if(submissionId)return;const next=submissionFilterQuery(new URLSearchParams(params.toString()),filters);next.set('sortBy',sort.key);next.set('sortDirection',sort.direction);if(groupByJob)next.set('groupByJob','1');else next.delete('groupByJob');if(next.toString()!==params.toString())window.history.replaceState(null,'',`/utility/submissions?${next}`);},[filters,sort,groupByJob,submissionId,params]);
  const invalidDates=Boolean(filters.startDate&&filters.endDate&&filters.startDate>filters.endDate);
  const list=useSWR<TrackerResponse>(workspaceStatus==='ready'&&!submissionId&&!invalidDates?['submission-tracker',scope,revision,filters,sort]:null,()=>atsApi.submissions.list({...filters,sortBy:sort.key,sortDirection:sort.direction,limit:filters.limit??20}),{revalidateOnFocus:false,shouldRetryOnError:false,onSuccess:result=>{if(page>Math.max(1,result.totalPages))setPage(Math.max(1,result.totalPages));}});
  const record=useSWR<TrackerSubmission>(workspaceStatus==='ready'&&submissionId?['submission-record',scope,submissionId,revision]:null,()=>atsApi.submissions.get(submissionId!),{revalidateOnFocus:false,shouldRetryOnError:false});
  const response=list.data;
  const shownDetail=detail??record.data;
  const loading=workspaceStatus!=='ready'||(submissionId?record.isLoading:list.isLoading);
  const loadError=list.error??record.error;
  const error=invalidDates?'The end date must be on or after the start date.':loadError instanceof Error?loadError.message:'';
  const detailHref = useCallback((id: string) => { const query = new URLSearchParams(params.toString()); query.set("submission", id); return `/utility/submissions?${query}`; }, [params]);
  function backToTracker() { const query = new URLSearchParams(params.toString()); query.delete("submission"); router.push(`/utility/submissions?${query}`); }
  function openReview(id: string, returnToTracker = false) {
    setEditor(null);
    router.push(submissionReviewHref(params, id, returnToTracker));
  }
  function closeReview() {
    router.push(closeSubmissionReviewHref(params));
  }
  function renderCell(sub: TrackerSubmission, column: TrackerColumn): ReactNode {
    switch (column) {
      case "job": return <td key="job" className="px-5 py-5"><div className="space-y-1.5"><div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"><Link href={detailHref(sub.id)} className="text-sm font-semibold leading-5 text-slate-900 hover:text-[#1a4fa0] hover:underline dark:text-slate-100">{sub.jobTitle || "Title unavailable"}</Link>{sub.jobType && <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-semibold leading-4 ${jobTypeBadgeClass(sub.jobType)}`}>{sub.jobType}</span>}</div><p className="whitespace-nowrap font-medium text-muted-foreground">{sub.jobCode || "Code unavailable"}</p><div className="flex items-center gap-2 whitespace-nowrap text-xs leading-5">{sub.jobUrgency && <span className="rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{sub.jobUrgency}</span>}<button type="button" aria-label={`${sub.submissionNumber ? `${submissionOrdinal(sub.submissionNumber)} submission` : "Submission"}; ${sub.jobSubmissionRequired ?? "No submission target"} required. Filter by this job.`} title={`${sub.submissionNumber ? `${submissionOrdinal(sub.submissionNumber)} submission` : "Submission"} · ${sub.jobSubmissionRequired ?? "—"} required`} className="border-l border-border pl-2 font-medium text-[#1a4fa0] dark:text-blue-300 hover:underline focus-visible:outline-2 focus-visible:outline-blue-500" onClick={() => { changeFilters({jobId:sub.jobId}); }}>{sub.submissionNumber ? submissionOrdinal(sub.submissionNumber) : "Submission"} / {sub.jobSubmissionRequired ?? "—"} req</button></div>{sub.jobIsCoSourced && <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">Co-sourced</span>}</div></td>;
      case "manager": return <td key="manager" className="px-2.5 py-3"><button type="button" onClick={()=>setProfileTarget({kind:'account-manager',submission:sub})} className="block w-full text-left hover:text-[#1a4fa0]"><UserIdentity size="table" wrapDetails user={{name:sub.accountManagerName,email:sub.accountManagerEmail}}/></button></td>;
      case "recruiter": return <td key="recruiter" className="px-2.5 py-3"><button type="button" onClick={()=>setProfileTarget({kind:'recruiter',submission:sub})} className="block w-full text-left hover:text-[#1a4fa0]"><UserIdentity size="table" wrapDetails user={{name:sub.recruiterName,email:sub.recruiterEmail,avatar:sub.recruiterAvatar}}/></button></td>;
      case "candidate": return <td key="candidate" className="px-2.5 py-3"><CandidateCell submission={sub} onOpen={() => setProfileTarget({ kind: "candidate", submission: sub })} /></td>;
      case "payDetails": return <td key="payDetails" className="px-3 py-3"><div className="space-y-2"><div><span className="block text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{compensationLabel(false,sub.jobType,sub.compensationPeriod)}</span><span className="text-xs font-medium">{submissionCompensationValue(sub,false)}</span></div><div><span className="block text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{compensationLabel(true,sub.jobType,sub.compensationPeriod)}</span><span className="text-xs font-medium">{submissionCompensationValue(sub,true)}</span></div></div></td>;
      case "clientTerms": return <td key="clientTerms" className="px-3 py-3 text-xs font-medium">{formatClientTerms(sub)}</td>;
      case "jobCreated": return <td key="jobCreated" className="px-2.5 py-3"><TableDate value={sub.jobCreatedAt} timezone={sub.timezone} /></td>;
      case "submitted": return <td key="submitted" className="px-2.5 py-3"><TableDate value={bucket==='closures'?sub.joinedAt:sub.createdAt} timezone={sub.timezone} /></td>;
      case "pipeline": return <td key="pipeline" className="px-2.5 py-4 text-center"><Pipeline submission={sub} /></td>;
      case "status": return <td key="status" className="px-2.5 py-3 text-center align-middle">
        <div className="flex flex-col items-center gap-1.5">
          <StageBadge submission={sub} />
          {sub.capabilities?.review && sub.finalStatus === "PENDING_APPROVAL" && <button
            type="button"
            aria-label={`Review submission for ${sub.candidateName || "candidate"}`}
            onClick={() => openReview(sub.id, true)}
            className="inline-flex min-h-6 items-center justify-center gap-1 rounded px-2 text-xs font-medium text-[#1a4fa0] hover:underline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300"
          >Review submission <span aria-hidden="true">→</span></button>}
        </div>
      </td>;
      case "actions": return <td key="actions" className="sticky right-0 z-10 bg-white dark:bg-slate-950 pl-3 pr-6 py-3 text-center shadow-[-1px_0_0_0_var(--border)]"><SubmissionActions submission={sub} href={detailHref(sub.id)} onAction={action => action === "review" ? openReview(sub.id, true) : setEditor({ submission: sub, action })} /></td>;
    }
  }
  if (workspaceStatus === "error") return <div role="alert" className="text-sm text-red-700">Unable to load workspace access. Refresh the page to retry.</div>;
  if (reviewRequested && workspaceStatus === "ready") return <div className="h-full min-h-0 overflow-auto"><ReviewWorkspace key={submissionId} submissionId={submissionId!} onClose={closeReview} onSaved={saved => { setDetail(saved); setRevision(r => r + 1); closeReview(); }} /></div>;
  return <main className={submissionId?"h-full min-h-0 min-w-0 space-y-4 overflow-auto text-foreground":"flex h-full min-h-0 min-w-0 flex-col text-foreground"}>
    {submissionId ? <Button variant="ghost" size="sm" className="text-xs -ml-2" onClick={backToTracker}><ArrowLeft className="h-3.5 w-3.5" />Back to submissions</Button> : null}
    {!submissionId && <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs" aria-label="Submission tracker">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-card px-4 py-3">
        <div role="group" aria-label="Submission stage" className="flex flex-wrap gap-0">{FILTERS.map(filter => <button type="button" aria-pressed={bucket === filter.key} key={filter.key} onClick={() => { setBucket(filter.key); setPage(1); }} className={cn("flex items-center gap-2 border border-border px-3 py-2 text-xs font-medium first:rounded-l-md last:rounded-r-md focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-blue-500 -ml-px first:ml-0", bucket === filter.key ? "border-blue-300 bg-blue-50 text-[#1a4fa0] dark:bg-blue-950 dark:text-blue-200" : "hover:bg-muted")}>
          {filter.label}<span className={cn("rounded-full px-1.5 py-0.5 text-xs min-w-5 text-center", bucket === filter.key ? PRIMARY : "bg-muted text-muted-foreground")}>{response?.counts?.[filter.key] ?? "—"}</span>
        </button>)}</div>
        {bucket === 'all' && <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1.5 px-1" role="group" aria-label="Round and status quick filters">
          <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Round</span>
          {quickRoundOptions.map(round => <Button key={round} size="sm" variant={filters.round === round ? 'default' : 'outline'} aria-pressed={filters.round === round} className={cn('h-7 min-w-9 px-2 text-xs', filters.round === round && PRIMARY)} onClick={() => toggleQuickRound(round)}>{round.toUpperCase()}</Button>)}
          <span aria-hidden="true" className="mx-1 h-5 border-l border-border" />
          <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
          {quickRoundStatuses.map(status => <Button key={status} size="sm" variant={filters.roundStatus === status ? 'default' : 'outline'} aria-pressed={filters.roundStatus === status} className={cn('h-7 px-2 text-xs', filters.roundStatus === status && PRIMARY)} onClick={() => toggleQuickRoundStatus(status)}>{status === InterviewRoundStatus.AWAITING_FEEDBACK ? 'Awaiting feedback' : status.charAt(0) + status.slice(1).toLowerCase()}</Button>)}
        </div>}
        <div className="flex items-center gap-2"><button type="button" role="switch" aria-checked={groupByJob} onClick={() => setGroupByJob(value => !value)} className="flex shrink-0 items-center gap-2 rounded-md px-2 py-2 text-xs focus-visible:outline-2 focus-visible:outline-blue-500">Group by job<span aria-hidden="true" className={cn("flex h-5 w-9 items-center rounded-full p-0.5 transition-colors", groupByJob ? "bg-[#1a4fa0]" : "bg-slate-300 dark:bg-slate-600")}><span className={cn("h-4 w-4 rounded-full bg-white transition-transform", groupByJob && "translate-x-4")} /></span></button><Button variant="ghost" size="icon" aria-label="Refresh submissions" disabled={loading} onClick={() => setRevision(r => r + 1)}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></Button></div>
      </div>
      <SubmissionFilterBar filters={filters} access={response?.filterAccess??access} scope={scope} search={search} onSearch={setSearch} onChange={(patch,reset)=>{if(reset)setSearch('');const scopedPatch=bucket==='all'&&('round'in patch||'roundStatus'in patch)?{...patch,bucket:'all' as const}:patch;changeFilters(scopedPatch,reset);}}/>
      {!!response?.undatedClosures&&bucket==='closures'&&<p className="px-5 py-2 text-xs text-amber-800 dark:text-amber-300">{response.undatedClosures} closures have no recorded join date and cannot be included in a joined-date range.</p>}
      <div className="relative min-h-0 flex-1 overflow-auto" data-slot="submission-table-scroll">
        <table className="w-full table-fixed border-collapse text-sm [&_th]:border-r [&_th]:border-border [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-border [&_td:last-child]:border-r-0 [&_td]:align-middle" style={{ minWidth: columns.reduce((width, column) => width + TRACKER_COLUMN_WIDTHS[column], 0) }}><colgroup>{columns.map(column => <col key={column} style={{ width: TRACKER_COLUMN_WIDTHS[column] }} />)}</colgroup><thead className="sticky top-0 z-20 select-none border-y border-border bg-card"><tr>{headers(() => setPage(1))}</tr></thead>
          <tbody className="divide-y divide-border">
            {loading || workspaceStatus !== "ready" ? <tr><td colSpan={100}><PageLoadingSkeleton variant="compact" /></td></tr> : error ? <tr><td colSpan={columns.length} className="py-12 text-center" role="alert">{error}{!error.includes("permission") && <Button variant="outline" className="ml-3 text-xs" onClick={() => setRevision(r => r + 1)}>Retry</Button>}</td></tr> : !response?.data.length ? <tr><td colSpan={columns.length} className="py-16 text-center text-muted-foreground">No submissions match these filters.</td></tr> : !groupByJob ? response.data.map(sub => {

              return <tr key={sub.id} className="hover:bg-muted/25">
                {columns.map(column => renderCell(sub, column))}
              </tr>;
            }) : Array.from(new Set(response.data.map(sub => sub.jobId))).map(jobId => {
              const submissions = response.data.filter(sub => sub.jobId === jobId);
              const job = submissions[0];
              return <Fragment key={jobId}><tr className="bg-blue-50/70 dark:bg-blue-950/40"><td colSpan={columns.length} className="px-5 py-3"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-2"><button type="button" className="font-semibold text-[#1a4fa0] dark:text-blue-200" aria-expanded={!collapsedJobs[jobId]} onClick={() => setCollapsedJobs(previous => ({ ...previous, [jobId]: !previous[jobId] }))}>{collapsedJobs[jobId] ? "▸" : "▾"} {job.jobCode || "Code unavailable"}</button><span className="font-semibold text-[#1a4fa0] dark:text-blue-200">{job.jobTitle || "Title unavailable"}</span>{job.jobUrgency && <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-900">{job.jobUrgency}</span>}{job.jobIsCoSourced && <span className="rounded bg-violet-100 px-2 py-1 text-xs text-violet-800">Co-sourced</span>}</div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>Client: {job.clientName || "Not provided"}</span><span>End client: {job.endClientName || "Not provided"}</span></div></div><span className="shrink-0 text-xs font-medium text-muted-foreground">{job.jobSubmissionDone ?? job.matchingJobSubmissionCount ?? submissions.length} / {job.jobSubmissionRequired ?? "—"} submissions{submissions.length < (job.matchingJobSubmissionCount ?? submissions.length) && ` · ${submissions.length} on this page`}</span></div></td></tr>{!collapsedJobs[jobId] && submissions.map(sub => {
              return <tr key={sub.id} className="hover:bg-muted/25 transition-colors">
                {columns.map(column => renderCell(sub, column))}
              </tr>;
            })}</Fragment>;
            })}
          </tbody>
        </table>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground" data-slot="submission-pagination">
        <p>{response ? `Showing ${response.total ? (response.page - 1) * response.limit + 1 : 0}–${Math.min(response.page * response.limit, response.total)} of ${response.total}` : "Loading records…"}</p>
        <label className="hidden items-center gap-2 sm:flex">Rows per page<select aria-label="Rows per page" className="h-8 rounded border bg-card px-2" value={filters.limit??20} onChange={e=>changeFilters({limit:Number(e.target.value)})}>{[10,20,50,100].map(value=><option key={value} value={value}>{value}</option>)}</select></label><nav aria-label="Submission pages" className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous page" disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>{response && Array.from({ length: Math.min(5, response.totalPages) }, (_, i) => Math.max(1, Math.min(page - 2, response.totalPages - 4)) + i).map(p => <Button key={p} variant={p === page ? "default" : "outline"} className={cn("h-8 min-w-8 px-2 text-xs", p === page && PRIMARY)} aria-label={`Page ${p}`} aria-current={p === page ? "page" : undefined} disabled={loading} onClick={() => setPage(p)}>{p}</Button>)}<Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next page" disabled={loading || !response || page >= response.totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button></nav>
      </div>
    </section>}
    {submissionId && !reviewRequested && (loading ? <PageLoadingSkeleton variant="table" /> : error ? <div role="alert" className="text-xs">{error}<Button variant="outline" className="ml-3 text-xs" onClick={() => setRevision(r => r + 1)}>Retry</Button></div> : shownDetail && <SubmissionDetails submission={shownDetail} onReview={() => openReview(shownDetail.id)} />)}
    {editor && !["review", "notes", "rate"].includes(editor.action) && <UpdateSubmissionDialog key={editor.submission.id} submission={editor.submission} href={detailHref(editor.submission.id)} onReview={() => {
      openReview(editor.submission.id, true);
    }} onClose={() => setEditor(null)} onSaved={saved => { setEditor(null); setDetail(saved); setRevision(r => r + 1); }} />}
    {editor && ["notes", "rate"].includes(editor.action) && <UpdateDialog key={`${editor.submission.id}-${editor.action}`} submission={editor.submission} action={editor.action} onClose={() => setEditor(null)} onSaved={saved => { setEditor(null); setDetail(saved); setRevision(r => r + 1); }} />}
    {profileTarget && <PersonProfileDialog key={`${profileTarget.kind}-${profileTarget.submission.id}`} target={profileTarget} onClose={() => setProfileTarget(null)} />}
  </main>;
}

function ScopedSubmissionsPage() {
  const search = useSearchParams();
  return search.get('view') === 'pod' ? <PodFeatureGate><SubmissionsPageContent /></PodFeatureGate> : <SubmissionsPageContent />;
}
export default function SubmissionsPage() { return <Suspense fallback={<PageLoadingSkeleton variant="table" />}><ScopedSubmissionsPage /></Suspense>; }
