"use client";
import { CalendarDays, Check, CheckCircle2, Clock3, X, XCircle } from 'lucide-react';
import type { TrackerSubmission } from '@/lib/submission-contract';
import { currentRound, formatInterview, rejectionStage, ROUNDS, stage, statusDate, validTimezone } from '@/lib/submission-tracker';
import { cn } from '@/lib/utils';
const TONES = {
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  blue: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  green: "bg-[#008000] text-white",
  red: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};
export function StageBadge({ submission }: { submission: TrackerSubmission }) {
  const state = stage(submission);
  const date = statusDate(submission);
  const Icon = state.tone === "green" ? CheckCircle2 : state.tone === "red" ? XCircle : state.tone === "blue" ? CalendarDays : Clock3;
  return <div className="flex flex-col items-center gap-1.5">{submission.jobStatus?.toLowerCase() === "closed" && <span className="rounded bg-slate-100 px-2 py-1 text-[10.5px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{submission.workflowPaused ? "Job closed - workflow paused" : "Job closed"}</span>}<span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10.5px] font-semibold max-w-full text-center", TONES[state.tone])}><Icon className="h-3.5 w-3.5" />{state.label}</span>{date && <time dateTime={date.value} title={date.label} className="text-[10.5px] leading-4 text-muted-foreground">{date.label === "Scheduled interview" ? "" : date.label + " "}{formatInterview(date.value, validTimezone(submission.timezone))}</time>}</div>;
}
export function Pipeline({ submission }: { submission: TrackerSubmission }) {
  const state = stage(submission);
  const rejectedKey = rejectionStage(submission);
  const approvalEvidence = ["SUBMITTED", "OFFER"].includes(submission.rejectionFromStatus || "") || ROUNDS.some(round => ["SCHEDULED", "CLEARED", "REJECTED"].includes(submission[`${round.key}Status`] || ""));
  const reviewComplete = submission.finalStatus !== "PENDING_APPROVAL" && rejectedKey !== "review" && (submission.finalStatus !== "REJECTED" || approvalEvidence);
  const terminal = ["SELECTED", "JOIN", "OFFER"].includes(submission.finalStatus);
  const current = currentRound(submission)?.key;
  const stages = [{ key: "review", label: "Internal review", complete: reviewComplete }, ...ROUNDS.map(round => ({ key: round.key, label: round.label, complete: submission[`${round.key}Status`] === "CLEARED" })) , { key: "final", label: "Final", complete: terminal }];
  const activeKey = submission.finalStatus === "PENDING_APPROVAL" ? "review" : current || "final";
  return <div className="mx-auto w-full min-w-0 max-w-[300px]" aria-label={`Pipeline: ${state.label}`}><div className="grid grid-cols-5">{stages.map((item, index) => {
    const rejected = item.key === rejectedKey;
    const active = !submission.workflowPaused && !["NOT_SELECTED", "WITHDRAWN", "JOIN"].includes(submission.finalStatus) && !rejectedKey && item.key === activeKey && !item.complete;
    const skipped = terminal && ROUNDS.some(round => round.key === item.key) && !item.complete;
    return <div key={item.key} className="relative flex min-w-0 flex-col items-center gap-1.5">
      {index < stages.length - 1 && <span aria-hidden="true" className={cn("absolute left-[calc(50%+14px)] top-2.5 h-px w-[calc(100%-28px)]", item.complete ? "bg-[#008000]" : "bg-slate-200 dark:bg-slate-700")} />}
      <span className="relative flex h-5 w-5 items-center justify-center">
        {active && <span aria-hidden="true" className="absolute -inset-1 rounded-full bg-[#1a4fa0]/15 motion-safe:animate-pulse" />}
        <span aria-hidden="true" className={cn("relative flex h-5 w-5 items-center justify-center rounded-full border-2", rejected ? "border-red-600 bg-red-600" : item.complete ? "border-[#008000] bg-[#008000]" : active ? state.tone === "red" ? "border-red-500 bg-red-50" : "border-[#1a4fa0] bg-[#1a4fa0]" : "border-slate-300 bg-background")}>{rejected ? <X className="h-3 w-3 text-white" strokeWidth={3} /> : item.complete ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : skipped ? <span className="text-xs leading-none text-muted-foreground">−</span> : null}</span>
      </span>
      <span className={cn("text-center text-[10px] leading-tight", active ? "font-semibold text-[#1a4fa0] dark:text-blue-300" : "text-muted-foreground")}>{item.label}{skipped && <span className="sr-only"> (skipped)</span>}</span>
    </div>;
  })}</div></div>;
}
