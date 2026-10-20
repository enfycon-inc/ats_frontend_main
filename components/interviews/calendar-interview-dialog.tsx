"use client";

import { useState } from "react";
import useSWR from "swr";
import { CalendarDays, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";
import type { InterviewColor, RoundKey, TrackerSubmission, TrackerUpdate } from "@/lib/submission-contract";
import { interviewInstant, localInterviewParts, ROUNDS, validTimezone } from "@/lib/submission-tracker";
import { stageRemarkSuggestions, type StageRemark } from "@/lib/stage-remarks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const COLORS: { key: InterviewColor; label: string; value: string }[] = [
  { key: "blue", label: "Blue", value: "#2563eb" },
  { key: "violet", label: "Violet", value: "#7c3aed" },
  { key: "rose", label: "Rose", value: "#e11d48" },
  { key: "green", label: "Green", value: "#15803d" },
  { key: "amber", label: "Amber", value: "#b45309" },
];

function initialScheduleState(submission: TrackerSubmission | null, requestedRound?: RoundKey, start?: string) {
  const key = submission && (requestedRound || ROUNDS.find(({ key: candidate }, index) =>
    submission[`${candidate}Status`] !== "CLEARED" && (index === 0 || submission[`${ROUNDS[index - 1].key}Status`] === "CLEARED"),
  )?.key) || "l1";
  const zone = validTimezone(submission?.timezone);
  const wasCancelled = submission?.[`${key}Status`] === "CANCELLED";
  const existingDate = (wasCancelled ? null : submission?.[`${key}Date`]) || start || null;
  const parts = existingDate ? localInterviewParts(existingDate, zone) : null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return {
    round: key,
    date: parts?.date || today,
    time: parts?.time || "10:00",
    timezone: zone,
    interviewer: submission?.[`${key}Interviewer`] || "",
    meetingLink: submission?.meetingLink || "",
    remarks: wasCancelled ? "" : submission?.[`${key}Remarks`] || "",
    color: (submission?.[`${key}Color`] || (submission?.[`${key}Status`] === "AWAITING_FEEDBACK" ? "violet" : key === "l2" ? "violet" : key === "l3" ? "rose" : "blue")) as InterviewColor,
  };
}

function canScheduleRound(submission: TrackerSubmission, round: RoundKey) {
  const rounds: RoundKey[] = ["l1", "l2", "l3"];
  const index = rounds.indexOf(round);
  const status = submission[`${round}Status`];
  const activeRound = rounds.find(key => submission[`${key}Status`] !== "CLEARED");
  if (activeRound !== round) return false;
  if (["SCHEDULED", "AWAITING_FEEDBACK"].includes(status || "")) return true;
  return submission.finalStatus === "SUBMITTED" &&
    [null, undefined, "PENDING", "CANCELLED"].includes(status) &&
    (status === "CANCELLED" || !submission[`${round}Date`]) &&
    rounds.slice(0, index).every(key => submission[`${key}Status`] === "CLEARED") &&
    rounds.slice(index + 1).every(key => [null, undefined, "PENDING"].includes(submission[`${key}Status`]) && !submission[`${key}Date`]);
}

export function CalendarInterviewDialog({
  submission,
  round: requestedRound,
  start,
  readOnly = false,
  allowEdit = true,
  interviewerOptions = [],
  onClose,
  onSaved,
}: {
  submission: TrackerSubmission | null;
  round?: RoundKey;
  start?: string;
  readOnly?: boolean;
  allowEdit?: boolean;
  interviewerOptions?: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [initial] = useState(() => initialScheduleState(submission, requestedRound, start));
  const [round, setRound] = useState<RoundKey>(initial.round);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [interviewer, setInterviewer] = useState(initial.interviewer);
  const [meetingLink, setMeetingLink] = useState(initial.meetingLink);
  const [remarks, setRemarks] = useState(initial.remarks);
  const [remarksFocused, setRemarksFocused] = useState(false);
  const [color, setColor] = useState<InterviewColor>(initial.color);
  const [editMode, setEditMode] = useState(!readOnly);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelMode, setCancelMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: remarkTemplates = [] } = useSWR<StageRemark[]>(
    submission?.branchId ? ["calendar-interview-remarks", submission.branchId] : null,
    () => atsApi.submissions.getCustomRemarks(submission!.branchId!, false),
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );

  const timezones = Array.from(new Set([
    validTimezone(submission?.timezone),
    validTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone),
    "Asia/Kolkata", "America/New_York", "UTC",
  ])).filter(Boolean);

  if (!submission) return null;
  const allowed = ROUNDS.filter(({ key }, index) => {
    if (key === requestedRound) return true;
    if (submission[`${key}Status`] && submission[`${key}Status`] !== "PENDING") return false;
    return index === 0 || submission[`${ROUNDS[index - 1].key}Status`] === "CLEARED";
  });
  const canScheduleSelectedRound = requestedRound
    ? canScheduleRound(submission, requestedRound)
    : allowed.some(item => item.key === round);
  const existingStatus = submission[`${round}Status`];
  const existingInterview = Boolean(submission[`${round}Date`] && ["SCHEDULED", "AWAITING_FEEDBACK"].includes(existingStatus || ""));
  const canEditInterview = Boolean(allowEdit && submission.capabilities?.schedule && existingInterview);
  const roundLabel = round.toUpperCase();
  const remarkSuggestions = remarks.trim()
    ? stageRemarkSuggestions(remarkTemplates, round)
      .filter(item => item.remarkText.toLowerCase().includes(remarks.trim().toLowerCase()) && item.remarkText.trim().toLowerCase() !== remarks.trim().toLowerCase())
      .slice(0, 4)
    : [];

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!submission || saving) return;
    setSaving(true);
    setError("");
    try {
      if (cancelMode && !cancelReason.trim()) throw new Error("Enter a cancellation reason.");
      const nextDate = cancelMode ? submission[`${round}Date`] : interviewInstant(date, time, timezone);
      const previousDate = submission[`${round}Date`];
      const rescheduled = existingInterview && !cancelMode && Boolean(previousDate && nextDate) &&
        new Date(previousDate!).getTime() !== new Date(nextDate!).getTime();
      const payload: TrackerUpdate = {
        expectedUpdatedAt: submission.updatedAt,
        requestId: crypto.randomUUID(),
        [`${round}Status`]: cancelMode ? "CANCELLED" : "SCHEDULED",
        [`${round}Date`]: nextDate,
        [`${round}Interviewer`]: interviewer.trim() || null,
        [`${round}Remarks`]: (cancelMode ? cancelReason : remarks).trim() || null,
        [`${round}Color`]: cancelMode ? submission[`${round}Color`] || null : color,
        meetingLink: meetingLink.trim() || null,
      };
      await atsApi.submissions.update(submission.id, payload);
      toast.success(cancelMode ? "Interview cancelled" : rescheduled ? "Interview rescheduled" : "Interview saved");
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Interview could not be saved. Reload and try again.");
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto p-0">
      <DialogHeader className="border-b border-border px-5 py-4 pr-12">
        <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#1a4fa0]" /><DialogTitle className="text-sm">{!editMode ? "Interview details" : cancelMode ? "Cancel interview" : existingInterview ? "Edit interview" : "Schedule interview"}</DialogTitle></div>
        <DialogDescription className="text-xs">{!editMode ? "Review the interview schedule and details." : existingInterview && !cancelMode ? "Changing the date or time will record this interview as rescheduled." : "Link a submission and interview round to manage the schedule."}</DialogDescription>
      </DialogHeader>
      <form onSubmit={event => void save(event)}>
        <div className="space-y-4 px-5 py-4">
          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs"><div className="font-semibold">{submission.candidateName || "Candidate"} · {submission.jobTitle || submission.jobCode}</div><div className="mt-1 text-muted-foreground">{submission.jobCode} · Submitted by {submission.recruiterName || "Recruiter"}</div></div>
          {!editMode ? <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-3 text-xs">
            <dt className="text-muted-foreground">Interview round</dt><dd className="font-medium">{roundLabel}</dd>
            <dt className="text-muted-foreground">Date and time</dt><dd className="font-medium">{submission[`${round}Date`] ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(submission[`${round}Date`]!)) : "Not scheduled"}</dd>
            <dt className="text-muted-foreground">Time zone</dt><dd className="font-medium">{timezone}</dd>
            <dt className="text-muted-foreground">Interviewer</dt><dd className="font-medium">{submission[`${round}Interviewer`] || "Not assigned"}</dd>
            <dt className="text-muted-foreground">Meeting link</dt><dd className="min-w-0 break-all">{submission.meetingLink ? <a className="text-[#1a4fa0] underline" href={submission.meetingLink} target="_blank" rel="noreferrer">{submission.meetingLink}</a> : "Not provided"}</dd>
            <dt className="text-muted-foreground">Remarks</dt><dd className="whitespace-pre-wrap">{submission[`${round}Remarks`] || "No remarks"}</dd>
          </dl> : <>
            <div className="space-y-1"><label className="text-xs font-medium">Interview round <span className="text-red-500">*</span></label><select aria-label="Interview round" value={round} disabled={Boolean(requestedRound)} onChange={event => setRound(event.target.value as RoundKey)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">{allowed.map(item => <option value={item.key} key={item.key}>{item.label}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="text-xs font-medium">Date <span className="text-red-500">*</span></label><Input type="date" required value={date} disabled={cancelMode || saving} onChange={event => setDate(event.target.value)} className="h-9 text-xs" /></div><div className="space-y-1"><label className="text-xs font-medium">Start time <span className="text-red-500">*</span></label><Input type="time" required value={time} disabled={cancelMode || saving} onChange={event => setTime(event.target.value)} className="h-9 text-xs" /></div></div>
            <div className="space-y-1"><label className="text-xs font-medium">Time zone <span className="text-red-500">*</span></label><select value={timezone} disabled={cancelMode || saving} onChange={event => setTimezone(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">{timezones.map(zone => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}</select></div>
            <div className="space-y-1"><label className="text-xs font-medium">Interviewer</label><Input list="calendar-interviewer-options" value={interviewer} disabled={cancelMode || saving} onChange={event => setInterviewer(event.target.value)} className="h-9 text-xs" placeholder="Search or enter interviewer" /><datalist id="calendar-interviewer-options">{interviewerOptions.map(name => <option key={name} value={name} />)}</datalist></div>
            <div className="space-y-1"><label className="text-xs font-medium">Meeting link</label><Input type="url" value={meetingLink} disabled={cancelMode || saving} onChange={event => setMeetingLink(event.target.value)} className="h-9 text-xs" placeholder="https://…" /></div>
            <div className="space-y-1"><label className="text-xs font-medium">{cancelMode ? <>Cancellation reason <span className="text-red-500">*</span></> : "Remarks"}</label><Textarea value={cancelMode ? cancelReason : remarks} required={cancelMode} maxLength={500} rows={3} disabled={saving} onFocus={() => !cancelMode && setRemarksFocused(true)} onBlur={event => { if (!event.relatedTarget?.closest("[data-remark-suggestions]")) setRemarksFocused(false); }} onChange={event => cancelMode ? setCancelReason(event.target.value) : setRemarks(event.target.value)} className="text-xs" placeholder={cancelMode ? "Why is this interview being cancelled?" : "Add remarks for this interview…"} /><div className="text-right text-[10px] text-muted-foreground">{(cancelMode ? cancelReason : remarks).length}/500</div>{!cancelMode && !saving && remarksFocused && remarkSuggestions.length > 0 && <div data-remark-suggestions aria-label={`${roundLabel} remark suggestions`} className="rounded-md border border-border bg-popover p-1 shadow-sm">{remarkSuggestions.map(item => <button key={item.id} type="button" onMouseDown={event => event.preventDefault()} onClick={() => { setRemarks(item.remarkText); setRemarksFocused(false); }} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted">{item.remarkText}</button>)}</div>}</div>
            {!cancelMode && <fieldset className="space-y-2"><legend className="text-xs font-medium">Calendar color</legend><div className="flex flex-wrap gap-2">{COLORS.map(item => <button key={item.key} type="button" aria-label={`${item.label} calendar color`} aria-pressed={color === item.key} disabled={saving} onClick={() => setColor(item.key)} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${color === item.key ? "border-[#1a4fa0] bg-blue-50 font-semibold text-[#1a4fa0]" : "border-border"}`}><span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.value }} />{item.label}</button>)}</div></fieldset>}
          </>}
          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        </div>
        <DialogFooter className="flex-row items-center justify-between border-t border-border px-5 py-3">
          {editMode && existingInterview && submission.capabilities?.schedule && !cancelMode ? <Button type="button" variant="ghost" className="mr-auto text-xs text-red-600" disabled={saving} onClick={() => { setCancelReason(""); setCancelMode(true); }}><X className="mr-1 h-3.5 w-3.5" />Cancel interview</Button> : <span />}
          {cancelMode && <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => { setCancelReason(""); setCancelMode(false); }}>Back</Button>}
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={onClose}>Close</Button>
          {!editMode && canEditInterview && <Button type="button" size="sm" className="bg-[#1a4fa0] text-white hover:bg-[#154181]" onClick={() => setEditMode(true)}>Edit interview</Button>}
          {editMode && <Button type="submit" size="sm" disabled={saving || !submission.capabilities?.schedule || (!cancelMode && !canScheduleSelectedRound)} className="bg-[#1a4fa0] text-white hover:bg-[#154181]">{saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}{cancelMode ? "Confirm cancellation" : existingInterview ? "Save interview" : "Schedule interview"}</Button>}
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
