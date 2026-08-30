"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DateTimePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Award,
  Calendar,
  Building2,
  MoreHorizontal,
  FileText,
  UserCheck,
  Sparkles,
  Check,
  X,
  CalendarDays,
  Pencil,
  Mail,
  Phone,
  MessageSquare,
  ArrowDown,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";
import { getActiveRolePermissions, resolveActiveSystemRole, CustomRoleDefinition } from "@/lib/role-permissions";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
  HoverCardArrow,
} from "@/components/ui/hover-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";

interface Submission {
  id: number;
  jobId: string;
  candidateId: number;
  recruiterId: string;
  l1Status: "PENDING" | "SCHEDULED" | "CLEARED" | "REJECTED" | null;
  l1Date: string | null;
  l1Remarks?: string | null;
  l2Status: "PENDING" | "SCHEDULED" | "CLEARED" | "REJECTED" | null;
  l2Date: string | null;
  l2Remarks?: string | null;
  l3Status: "PENDING" | "SCHEDULED" | "CLEARED" | "REJECTED" | null;
  l3Date: string | null;
  l3Remarks?: string | null;
  finalStatus: "PENDING_APPROVAL" | "SUBMITTED" | "REJECTED" | "OFFER" | "JOIN";
  remarks: string | null;
  recruiterComment: string | null;
  reviewFeedback: string | null; // AM/Pod Head feedback written during internal review
  podLeadRemarks?: string | null;
  createdAt: string;
  updatedAt: string;
  
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateCurrentLocation?: string;
  candidateExperience?: number | null;
  candidateDesignation?: string | null;
  candidateWorkAuth?: string | null;
  candidateSource?: string | null;
  candidateCurrentCtc?: string | null;
  candidateExpectedCtc?: string | null;
  candidateNoticePeriod?: number | null;
  jobCode?: string;
  jobTitle?: string;
  clientName?: string;
  endClientName?: string;
  recruiterName?: string;
  podHeadName?: string;
  accountManagerName?: string;
  submittedRate?: string | null;
  market?: string;
}

function renderPipelineProgress(sub: Submission) {
  // Candidate has interview progression if any round has been scheduled/updated
  const hasInterviewProgress =
    Boolean(sub.l1Date) ||
    Boolean(sub.l2Date) ||
    Boolean(sub.l3Date) ||
    (Boolean(sub.l1Status) && sub.l1Status !== "PENDING") ||
    (Boolean(sub.l2Status) && sub.l2Status !== "PENDING") ||
    (Boolean(sub.l3Status) && sub.l3Status !== "PENDING");

  // If candidate was rejected internally (before reaching interview stages)
  const isInternallyRejected = sub.finalStatus === "REJECTED" && !hasInterviewProgress;
  // If candidate is still awaiting internal review
  const isPendingReview = sub.finalStatus === "PENDING_APPROVAL" && !hasInterviewProgress;

  if (isInternallyRejected || isPendingReview) {
    return <span className="text-neutral-400 dark:text-neutral-500 italic text-xs select-none">—</span>;
  }

  const getStagePill = (stage: "L1" | "L2" | "L3", status: string | null, remarks?: string | null, dateStr?: string | null) => {
    const s = (status || "").toUpperCase();
    let badgeStyle = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    let label = "—";
    let statusTitle = "Not Started";

    if (s === "CLEARED" || s === "PASSED") {
      badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40";
      label = "Pass";
      statusTitle = "Passed";
    } else if (s === "REJECTED") {
      badgeStyle = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40";
      label = "Fail";
      statusTitle = "Rejected";
    } else if (s === "SCHEDULED") {
      badgeStyle = "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800/40";
      label = "Sched";
      statusTitle = "Scheduled";
    } else if (s === "PENDING") {
      badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40";
      label = "Pend";
      statusTitle = "Pending";
    }

    return (
      <HoverCard openDelay={150} closeDelay={150} key={stage}>
        <HoverCardTrigger asChild>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer select-none",
              badgeStyle
            )}
          >
            {stage}: {label}
          </span>
        </HoverCardTrigger>
        <HoverCardContent
          align="center"
          side="top"
          sideOffset={8}
          showArrow={false}
          className="w-72 p-0 shadow-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl z-50 text-left font-sans overflow-visible"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="overflow-hidden rounded-xl">
            <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {stage === "L1" ? "Round 1 (L1) — Screening" : stage === "L2" ? "Round 2 (L2) — Technical" : "Round 3 (L3) — Final"}
                </p>
              </div>
              <span className={cn("text-[10px] font-bold px-1.5 py-0.2 rounded border", badgeStyle)}>
                {statusTitle}
              </span>
            </div>
            <div className="p-3 space-y-2 text-xs">
              {dateStr ? (
                <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span>Scheduled: <strong className="font-semibold text-neutral-800 dark:text-neutral-100">{new Date(dateStr).toLocaleString()}</strong></span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>No interview date recorded</span>
                </div>
              )}
              {remarks ? (
                <div className="mt-1 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-neutral-150 dark:border-slate-700/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5">Evaluation Remarks</p>
                  <p className="text-neutral-700 dark:text-neutral-200 text-xs italic whitespace-pre-wrap">"{remarks}"</p>
                </div>
              ) : (
                <p className="text-[11px] text-neutral-400 italic">No stage evaluation remarks recorded.</p>
              )}
            </div>
          </div>
          <HoverCardArrow className="fill-white dark:fill-slate-900 stroke-neutral-200 dark:stroke-slate-800 stroke-1" width={12} height={6} />
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <div className="flex items-center gap-1">
      {getStagePill("L1", sub.l1Status, sub.l1Remarks, sub.l1Date)}
      {getStagePill("L2", sub.l2Status, sub.l2Remarks, sub.l2Date)}
      {getStagePill("L3", sub.l3Status, sub.l3Remarks, sub.l3Date)}
    </div>
  );
}

function renderInternalReviewStatus(sub: Submission) {
  const isPending = sub.finalStatus === "PENDING_APPROVAL";

  // Candidate has interview progression if any round has been scheduled/updated
  const hasInterviewProgress =
    Boolean(sub.l1Date) ||
    Boolean(sub.l2Date) ||
    Boolean(sub.l3Date) ||
    (Boolean(sub.l1Status) && sub.l1Status !== "PENDING") ||
    (Boolean(sub.l2Status) && sub.l2Status !== "PENDING") ||
    (Boolean(sub.l3Status) && sub.l3Status !== "PENDING");

  const isRejectedInternally = sub.finalStatus === "REJECTED" && !hasInterviewProgress;

  const statusLabel = isPending ? "Pending Review" : isRejectedInternally ? "Rejected Internally" : "Approved";
  const statusColor = isPending ? "text-amber-600 dark:text-amber-400" : isRejectedInternally ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400";
  const badgeStyle = isPending
    ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
    : isRejectedInternally
    ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
    : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300";

  return (
    <HoverCard openDelay={150} closeDelay={150}>
      <HoverCardTrigger asChild>
        <span className={cn("text-xs font-semibold select-none cursor-pointer transition-opacity hover:opacity-80", statusColor)}>
          {statusLabel}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        side="top"
        sideOffset={8}
        showArrow={false}
        className="w-80 p-0 shadow-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl z-50 text-left font-sans overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-xl">
          <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("p-1 rounded text-xs font-bold", badgeStyle)}>
                <FileText className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Internal Screening Status</p>
                <p className="text-[10px] text-neutral-500 truncate max-w-[150px]">{sub.candidateName}</p>
              </div>
            </div>
            <span className={cn("text-[10px] font-bold px-1.5 py-0.2 rounded border", badgeStyle)}>
              {statusLabel}
            </span>
          </div>
          <div className="p-3 space-y-2.5">
            {sub.accountManagerName && (
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <UserCheck className="h-3 w-3 text-neutral-400 shrink-0" />
                <span>Reviewer: <strong className="text-neutral-700 dark:text-neutral-200 font-semibold">{sub.accountManagerName}</strong></span>
              </div>
            )}
            {sub.updatedAt && (
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-neutral-400 shrink-0" />
                <span>Timestamp: <strong className="text-neutral-700 dark:text-neutral-200 font-semibold">{formatRemarkTimestamp(sub.updatedAt, sub.createdAt)}</strong></span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Internal Remarks &amp; Feedback</span>
              {(sub.reviewFeedback || sub.podLeadRemarks) ? (
                <p className="text-xs text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-slate-800/50 p-2.5 rounded-md border border-neutral-100 dark:border-slate-800/60 leading-relaxed break-words font-normal">
                  {sub.reviewFeedback || sub.podLeadRemarks}
                </p>
              ) : (
                <p className="text-[11px] italic text-neutral-400 dark:text-neutral-500 bg-neutral-50/50 dark:bg-slate-800/30 p-2 rounded-md border border-neutral-100 dark:border-slate-800/40">
                  {isPending ? "Awaiting screening decision from Account Manager or Pod Lead." : "No internal review remarks recorded."}
                </p>
              )}
            </div>
          </div>
        </div>
        <HoverCardArrow className="fill-white dark:fill-slate-900 stroke-neutral-200 dark:stroke-slate-800 stroke-1" width={12} height={6} />
      </HoverCardContent>
    </HoverCard>
  );
}

function formatRemarkTimestamp(dateStr?: string | null, fallbackDateStr?: string | null) {
  const d = dateStr || fallbackDateStr;
  if (!d) return null;
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    }) + " • " + date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return null;
  }
}

function renderClutterFreeRemarks(sub: Submission) {
  const allRemarks: { stage: string; label: string; text: string; timestamp?: string | null; dotColor: string; labelColor: string; bgBadge: string }[] = [];

  if (sub.remarks) {
    allRemarks.push({
      stage: "Final Decision",
      label: "Final",
      text: sub.remarks,
      timestamp: formatRemarkTimestamp(sub.updatedAt, sub.createdAt),
      dotColor: "bg-emerald-500 ring-emerald-100 dark:ring-emerald-950",
      labelColor: "text-emerald-700 dark:text-emerald-400",
      bgBadge: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
    });
  }
  if (sub.l3Remarks) {
    allRemarks.push({
      stage: "Round 3 (L3)",
      label: "L3",
      text: sub.l3Remarks,
      timestamp: formatRemarkTimestamp(sub.l3Date, sub.updatedAt || sub.createdAt),
      dotColor: "bg-purple-500 ring-purple-100 dark:ring-purple-950",
      labelColor: "text-purple-700 dark:text-purple-400",
      bgBadge: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300"
    });
  }
  if (sub.l2Remarks) {
    allRemarks.push({
      stage: "Round 2 (L2)",
      label: "L2",
      text: sub.l2Remarks,
      timestamp: formatRemarkTimestamp(sub.l2Date, sub.updatedAt || sub.createdAt),
      dotColor: "bg-cyan-500 ring-cyan-100 dark:ring-cyan-950",
      labelColor: "text-cyan-700 dark:text-cyan-400",
      bgBadge: "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/40 dark:border-cyan-800 dark:text-cyan-300"
    });
  }
  if (sub.l1Remarks) {
    allRemarks.push({
      stage: "Round 1 (L1)",
      label: "L1",
      text: sub.l1Remarks,
      timestamp: formatRemarkTimestamp(sub.l1Date, sub.updatedAt || sub.createdAt),
      dotColor: "bg-indigo-500 ring-indigo-100 dark:ring-indigo-950",
      labelColor: "text-indigo-700 dark:text-indigo-400",
      bgBadge: "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300"
    });
  }
  if (sub.reviewFeedback || sub.podLeadRemarks) {
    allRemarks.push({
      stage: "Internal Review",
      label: "Internal",
      text: (sub.reviewFeedback || sub.podLeadRemarks)!,
      timestamp: formatRemarkTimestamp(sub.updatedAt, sub.createdAt),
      dotColor: "bg-amber-500 ring-amber-100 dark:ring-amber-950",
      labelColor: "text-amber-700 dark:text-amber-400",
      bgBadge: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
    });
  }
  if (sub.recruiterComment) {
    allRemarks.push({
      stage: "Recruiter Note",
      label: "Recruiter",
      text: sub.recruiterComment,
      timestamp: formatRemarkTimestamp(sub.createdAt),
      dotColor: "bg-slate-400 ring-slate-100 dark:ring-slate-800",
      labelColor: "text-slate-700 dark:text-slate-300",
      bgBadge: "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
    });
  }

  const latest = allRemarks[0];

  if (!latest) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-neutral-400 italic text-[11px]">No remarks</span>
        {sub.createdAt && (
          <div className="text-[10px] text-neutral-400 flex items-center gap-1 font-normal">
            <Calendar className="h-3 w-3 text-neutral-400 shrink-0" />
            {new Date(sub.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </div>
        )}
      </div>
    );
  }

  return (
    <HoverCard openDelay={150} closeDelay={150}>
      <HoverCardTrigger asChild>
        <div className="flex flex-col justify-center gap-0.5 min-w-[180px] max-w-[280px] cursor-pointer group/remark select-none">
          <div className="flex items-center gap-1 text-xs text-neutral-800 dark:text-neutral-200 overflow-hidden">
            <span className={cn("font-semibold shrink-0 text-xs", latest.labelColor)}>
              {latest.label}:
            </span>
            <span className="font-normal truncate text-xs text-neutral-800 dark:text-neutral-200">
              {latest.text}
            </span>
            {allRemarks.length > 1 && (
              <span className="shrink-0 text-[9.5px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 rounded px-1 py-0">
                +{allRemarks.length - 1}
              </span>
            )}
          </div>
          <div className="text-[10.5px] text-neutral-400 flex items-center gap-1 font-normal group-hover/remark:text-blue-500 transition-colors">
            <Calendar className="h-3 w-3 text-neutral-400 shrink-0" />
            {new Date(sub.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        side="left"
        sideOffset={12}
        showArrow={false}
        className="w-96 p-0 shadow-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl z-50 overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-xl">
          <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Remarks &amp; Feedback History</p>
                <p className="text-[10px] text-neutral-500 truncate max-w-[200px]">{sub.candidateName}</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-neutral-200 dark:border-slate-700">
              {allRemarks.length} {allRemarks.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          <div className="p-4 max-h-[340px] overflow-y-auto">
            <div className="relative pl-6 space-y-4">
              {allRemarks.map((item, i) => {
                const isLast = i === allRemarks.length - 1;
                return (
                  <div key={i} className="relative group/timeline">
                    {/* Vertical Timeline Connector with Directional Arrow */}
                    {!isLast && (
                      <div className="absolute -left-[19px] top-4 -bottom-4 w-[2px] bg-neutral-200 dark:bg-slate-800 flex flex-col items-center justify-end z-0">
                        <ArrowDown className="h-2.5 w-2.5 text-neutral-400 dark:text-neutral-500 -mb-1 shrink-0" />
                      </div>
                    )}

                    {/* Stage Node Dot */}
                    <div
                      className={cn(
                        "absolute -left-6 top-1 h-3 w-3 rounded-full ring-4 shadow-xs z-10 transition-transform group-hover/timeline:scale-110",
                        item.dotColor
                      )}
                    />

                    {/* Content Box with Speech Pointer Arrow */}
                    <div className="flex flex-col gap-1.5 z-10">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.2 rounded border", item.bgBadge)}>
                            {item.stage}
                          </span>
                          {i === 0 && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-1 rounded">
                              Latest
                            </span>
                          )}
                        </div>
                        {item.timestamp && (
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 shrink-0" />
                            {item.timestamp}
                          </span>
                        )}
                      </div>
                      <div className="relative text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal bg-neutral-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-neutral-200/80 dark:border-slate-800/80 shadow-xs before:absolute before:-left-1 before:top-3 before:h-2 before:w-2 before:rotate-45 before:bg-neutral-50 dark:before:bg-slate-800/50 before:border-l before:border-b before:border-neutral-200/80 dark:before:border-slate-800/80">
                        {item.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <HoverCardArrow className="fill-white dark:fill-slate-900 stroke-neutral-300 dark:stroke-slate-600 stroke-[1.5px] drop-shadow-sm" width={18} height={9} />
      </HoverCardContent>
    </HoverCard>
  );
}

interface TrackerStats {
  total: number;
  l1Pending: number;
  l2Pending: number;
  l3Pending: number;
}

function formatSubmittedRate(rate: string | null | undefined, market?: string, jobCode?: string, jobTitle?: string) {
  if (!rate) return "—";
  const isDomestic = market === "IN" || 
                     jobCode?.includes("-IN-") || 
                     jobTitle?.toLowerCase().includes("india") || 
                     jobCode?.toLowerCase().includes("in");
  const cleanRate = rate.trim();
  if (isDomestic) {
    if (/lakh|lpa|inr|₹/i.test(cleanRate)) return cleanRate;
    if (/^\d+(\.\d+)?$/.test(cleanRate)) return `${cleanRate} Lakhs`;
    return `${cleanRate} Lakhs`;
  } else {
    if (/\$|hr|yr|usd/i.test(cleanRate)) return cleanRate;
    if (/^\d+(\.\d+)?$/.test(cleanRate)) return `$${cleanRate}/hr`;
    return `$${cleanRate}`;
  }
}

export default function SubmissionsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<TrackerStats>({ total: 0, l1Pending: 0, l2Pending: 0, l3Pending: 0 });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Edit panel state
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"pipeline" | "review" | "profile">("pipeline");

  // Interview Schedule Modal state
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [selectedSubForInterview, setSelectedSubForInterview] = useState<any>(null);

  // Form fields state
  const [l1Status, setL1Status] = useState<any>("");
  const [l1Date, setL1Date] = useState("");
  const [l1Remarks, setL1Remarks] = useState("");
  const [l2Status, setL2Status] = useState<any>("");
  const [l2Date, setL2Date] = useState("");
  const [l2Remarks, setL2Remarks] = useState("");
  const [l3Status, setL3Status] = useState<any>("");
  const [l3Date, setL3Date] = useState("");
  const [l3Remarks, setL3Remarks] = useState("");
  const [finalStatus, setFinalStatus] = useState<any>("");
  const [remarks, setRemarks] = useState("");
  const [recruiterComment, setRecruiterComment] = useState("");
  const [submittedRate, setSubmittedRate] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState(""); // AM/Pod feedback for recruiter

  // Tenant Custom Remarks Configuration State
  const [customRemarks, setCustomRemarks] = useState<any[]>([]);
  const [customRemarksModalOpen, setCustomRemarksModalOpen] = useState(false);
  const [customRemarksStageFilter, setCustomRemarksStageFilter] = useState<"review" | "l1" | "l2" | "l3" | "final" | "all">("review");
  const [newCustomAcceptText, setNewCustomAcceptText] = useState("");
  const [newCustomRejectText, setNewCustomRejectText] = useState("");
  const [addingRemark, setAddingRemark] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<CustomRoleDefinition[]>([]);

  // Quick Decision Modal state (for inline Table Approve / Reject)
  const [quickReviewModalOpen, setQuickReviewModalOpen] = useState(false);
  const [quickReviewSub, setQuickReviewSub] = useState<Submission | null>(null);
  const [quickReviewAction, setQuickReviewAction] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [quickReviewRemark, setQuickReviewRemark] = useState("");

  useEffect(() => {
    const user = atsApi.auth.getCurrentUser();
    setCurrentUser(user);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = atsApi.auth.getCurrentUser();
      
      const [submissionsData, statsData, customRemarksData, rolesData] = await Promise.all([
        atsApi.submissions.list({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          finalStatus: statusFilter || undefined,
        }),
        atsApi.submissions.getTrackerStats(),
        atsApi.submissions.getCustomRemarks(user?.branchId || undefined).catch(() => []),
        atsApi.auth.listRoles().catch(() => []),
      ]);

      setAvailableRoles(rolesData || []);
      setCustomRemarks(customRemarksData || []);

      // Apply search query locally on candidate name, candidate email, job code, or job title
      let list = submissionsData.data || submissionsData || [];
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        list = list.filter((s: Submission) => 
          s.candidateName?.toLowerCase().includes(q) ||
          s.candidateEmail?.toLowerCase().includes(q) ||
          s.jobCode?.toLowerCase().includes(q) ||
          s.jobTitle?.toLowerCase().includes(q)
        );
      }

      setSubmissions(list);
      setStats(statsData);
    } catch (err: any) {
      toast.error("Failed to load submissions tracker: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setStartDate("");
    setEndDate("");
    setTimeout(() => loadData(), 50);
  };

  // Helper function to render categorized dropdown options (Accept / Reject / General)
  const renderCategorizedRemarkOptions = (stage: string) => {
    const stageKey = stage.toLowerCase();
    const stageItems = customRemarks.filter(
      r => r.stage?.toLowerCase() === stageKey || (stageKey === "review" && r.stage?.toLowerCase() === "internal_review")
    );
    const acceptItems = stageItems.filter(r => r.remarkType === "ACCEPT");
    const rejectItems = stageItems.filter(r => r.remarkType === "REJECT");
    const generalItems = stageItems.filter(r => r.remarkType === "GENERAL" || !r.remarkType);

    return (
      <>
        {acceptItems.length > 0 && (
          <optgroup label="✓ Accept / Cleared">
            {acceptItems.map(r => (
              <option key={r.id} value={r.remarkText}>{r.remarkText}</option>
            ))}
          </optgroup>
        )}
        {rejectItems.length > 0 && (
          <optgroup label="✕ Reject / Issue">
            {rejectItems.map(r => (
              <option key={r.id} value={r.remarkText}>{r.remarkText}</option>
            ))}
          </optgroup>
        )}
        {generalItems.length > 0 && (
          <optgroup label="ℹ General Feedback">
            {generalItems.map(r => (
              <option key={r.id} value={r.remarkText}>{r.remarkText}</option>
            ))}
          </optgroup>
        )}
      </>
    );
  };

  const openEditPanel = (sub: Submission) => {
    setSelectedSubmission(sub);
    setL1Status(sub.l1Status || "");
    setL1Date(sub.l1Date || "");
    setL1Remarks(sub.l1Remarks || "");
    setL2Status(sub.l2Status || "");
    setL2Date(sub.l2Date || "");
    setL2Remarks(sub.l2Remarks || "");
    setL3Status(sub.l3Status || "");
    setL3Date(sub.l3Date || "");
    setL3Remarks(sub.l3Remarks || "");
    setFinalStatus(sub.finalStatus);
    setRemarks(sub.remarks || "");
    setRecruiterComment(sub.recruiterComment || "");
    setSubmittedRate(sub.submittedRate || "");
    setReviewFeedback(sub.reviewFeedback || sub.podLeadRemarks || "");
    if (sub.finalStatus === "PENDING_APPROVAL") {
      setDrawerTab("review");
    } else {
      setDrawerTab("pipeline");
    }
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedSubmission(null);
  };

  // Active Perspective & Dynamic Role Permissions
  const activeRoleName = useMemo(() => {
    if (typeof window !== "undefined") {
      const override = localStorage.getItem("override_role");
      if (override) return override;
    }
    return currentUser?.systemRole || currentUser?.roles?.[0] || "RECRUITER";
  }, [currentUser]);

  const activeSystemRole = useMemo(() => {
    return resolveActiveSystemRole(activeRoleName, availableRoles, currentUser);
  }, [activeRoleName, availableRoles, currentUser]);

  const effectivePerms = useMemo(() => {
    return getActiveRolePermissions(activeRoleName, availableRoles, currentUser);
  }, [activeRoleName, availableRoles, currentUser]);

  const isAdmin = activeSystemRole === "ADMIN" || activeSystemRole === "SUPER_ADMIN" || activeSystemRole === "TENANT_ADMIN";
  const isDeliveryHead = activeSystemRole === "DELIVERY_HEAD";
  const isAm = activeSystemRole === "ACCOUNT_MANAGER";
  const isPodLead = activeSystemRole === "POD_LEAD";

  const canAuditRounds = isAdmin || isDeliveryHead || effectivePerms.includes("submission:audit_rounds");
  const canAuditL1 = canAuditRounds || isPodLead || effectivePerms.includes("submission:audit_l1");
  const canAuditL2 = canAuditRounds || effectivePerms.includes("submission:audit_l2");
  const canAuditL3 = canAuditRounds || effectivePerms.includes("submission:audit_l3");
  const canInternalScreen = isAdmin || isDeliveryHead || isPodLead || effectivePerms.includes("submission:internal_screening");
  const canFinalStatus = isAdmin || isDeliveryHead || isAm || effectivePerms.includes("submission:final_status");
  const canApproveClient = canInternalScreen || canFinalStatus;
  const canEditRate = isAdmin || isDeliveryHead || effectivePerms.includes("submission:edit_rate");
  const isRecruiterOnly = activeSystemRole === "RECRUITER" && !canAuditL1 && !canAuditL2 && !canAuditL3 && !canInternalScreen && !canFinalStatus && !canAuditRounds;
  const canManageRemarks = isAdmin || effectivePerms.includes("tenant:settings");

  const canEditRecruiterComment = useMemo(() => {
    if (isAdmin) return true;
    if (
      activeSystemRole === "RECRUITER" &&
      selectedSubmission?.finalStatus === "PENDING_APPROVAL" &&
      (currentUser?.id === selectedSubmission?.recruiterId ||
        currentUser?.name === selectedSubmission?.recruiterName)
    ) {
      return true;
    }
    return false;
  }, [isAdmin, activeSystemRole, selectedSubmission, currentUser]);

  const resolvedTemplates = useMemo(() => ({
    review: Array.from(new Set(customRemarks.filter(r => r.stage?.toLowerCase() === "review" || r.stage?.toLowerCase() === "internal_review").map(r => r.remarkText))),
    l1: Array.from(new Set(customRemarks.filter(r => r.stage?.toLowerCase() === "l1").map(r => r.remarkText))),
    l2: Array.from(new Set(customRemarks.filter(r => r.stage?.toLowerCase() === "l2").map(r => r.remarkText))),
    l3: Array.from(new Set(customRemarks.filter(r => r.stage?.toLowerCase() === "l3").map(r => r.remarkText))),
    final: Array.from(new Set(customRemarks.filter(r => r.stage?.toLowerCase() === "final").map(r => r.remarkText))),
  }), [customRemarks]);

  const handleConfirmQuickReview = async () => {
    if (!quickReviewSub) return;
    try {
      setSubmitting(true);
      const targetStatus = quickReviewAction === "APPROVE" ? "SUBMITTED" : "REJECTED";
      const note = quickReviewRemark.trim() || (quickReviewAction === "APPROVE" ? "Approved for client submission" : "Rejected internally");
      await atsApi.submissions.update(quickReviewSub.id, {
        finalStatus: targetStatus,
        reviewFeedback: note,
        podLeadRemarks: note,
      });
      toast.success(quickReviewAction === "APPROVE" ? "✅ Approved & submitted to client!" : "Submission rejected internally.");
      setQuickReviewModalOpen(false);
      setQuickReviewSub(null);
      setQuickReviewRemark("");
      await loadData();
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDirectCustomRemark = async (type: "ACCEPT" | "REJECT", text: string) => {
    if (!text.trim()) return;
    const items = text
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (items.length === 0) return;

    try {
      setAddingRemark(true);
      const user = atsApi.auth.getCurrentUser();
      const stage = customRemarksStageFilter === "all" ? "review" : customRemarksStageFilter;
      const createdList = await Promise.all(
        items.map((itemText) =>
          atsApi.submissions.createCustomRemark({
            stage: stage,
            remarkText: itemText,
            remarkType: type,
            branchId: user?.branchId || undefined,
          })
        )
      );
      setCustomRemarks((prev) => [...prev, ...createdList]);
      if (type === "ACCEPT") setNewCustomAcceptText("");
      if (type === "REJECT") setNewCustomRejectText("");
      if (items.length === 1) {
        toast.success(`✓ ${type === "ACCEPT" ? "Acceptance" : "Rejection"} template added!`);
      } else {
        toast.success(`✓ Added ${items.length} ${type === "ACCEPT" ? "acceptance" : "rejection"} templates!`);
      }
    } catch (err: any) {
      toast.error("Failed to add remark: " + err.message);
    } finally {
      setAddingRemark(false);
    }
  };

  const handleDeleteCustomRemark = async (id: number) => {
    try {
      await atsApi.submissions.deleteCustomRemark(id);
      setCustomRemarks((prev) => prev.filter((r) => r.id !== id));
      toast.success("Custom remark removed!");
    } catch (err: any) {
      toast.error("Failed to delete remark: " + err.message);
    }
  };

  const handleUpdateSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    try {
      setSubmitting(true);
      
      const payload: any = {};
      if (canAuditL1) {
        payload.l1Status = l1Status || null;
        payload.l1Date = l1Date ? new Date(l1Date).toISOString() : null;
        payload.l1Remarks = l1Remarks.trim() || null;
      }
      if (canAuditL2) {
        payload.l2Status = l2Status || null;
        payload.l2Date = l2Date ? new Date(l2Date).toISOString() : null;
        payload.l2Remarks = l2Remarks.trim() || null;
      }
      if (canAuditL3) {
        payload.l3Status = l3Status || null;
        payload.l3Date = l3Date ? new Date(l3Date).toISOString() : null;
        payload.l3Remarks = l3Remarks.trim() || null;
      }
      if (canApproveClient) {
        payload.finalStatus = finalStatus;
        payload.remarks = remarks.trim() || null;
        payload.reviewFeedback = reviewFeedback.trim() || null;
      }
      if (canEditRate) {
        payload.submittedRate = submittedRate.trim() || null;
      }
      if (canEditRecruiterComment) {
        payload.recruiterComment = recruiterComment.trim() || null;
      }

      await atsApi.submissions.update(selectedSubmission.id, payload);
      toast.success("Submission updated successfully!");
      closePanel();
      await loadData();
    } catch (err: any) {
      toast.error("Failed to update submission: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (submissions.length === 0) {
      toast.error("No submissions available to export.");
      return;
    }
    const headers = ["ID", "Candidate Name", "Candidate Email", "Job Code", "Job Title", "Client", "Recruiter", "Recruitment Manager / Pod Head", "Submitted Rate", "Recruiter Comment", "L1 Status", "L2 Status", "L3 Status", "Final Status", "Remarks", "Submission Date"];
    const rows = submissions.map((s) => [
      s.id,
      s.candidateName || "",
      s.candidateEmail || "",
      s.jobCode || "",
      s.jobTitle || "",
      s.clientName || "",
      s.recruiterName || "—",
      s.podHeadName || "—",
      s.submittedRate || "—",
      s.recruiterComment || "",
      s.l1Status || "PENDING",
      s.l2Status || "—",
      s.l3Status || "—",
      s.finalStatus,
      s.remarks || "",
      new Date(s.createdAt).toLocaleDateString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `submissions_tracker_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadResume = async (candidateId: number, candidateName: string) => {
    try {
      const blob = await atsApi.candidates.fetchResumeBlob(candidateId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${candidateName.replace(/\s+/g, "_")}_Resume.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Resume downloaded successfully!");
    } catch (err: any) {
      toast.error("Failed to download resume: " + err.message);
    }
  };

  // Sequential status dependencies check (Strict Pipeline Progression logic)
  const isL1Cleared = l1Status === "CLEARED" || l1Status === "PASSED";
  const isL1Rejected = l1Status === "REJECTED";
  const isL2Cleared = l2Status === "CLEARED" || l2Status === "PASSED";
  const isL2Rejected = l2Status === "REJECTED";
  const isL3Cleared = l3Status === "CLEARED" || l3Status === "PASSED";
  const isL3Rejected = l3Status === "REJECTED";

  // L2 is accessible only if L1 is cleared
  const canAccessL2 = canAuditL2 && isL1Cleared;
  // L3 is accessible only if L2 is cleared
  const canAccessL3 = canAuditL3 && isL2Cleared;

  // Side-effect: auto-reject progression if values change in form
  const handleL1Change = (val: string) => {
    setL1Status(val);
    if (val === "REJECTED") {
      setL2Status("");
      setL2Date("");
      setL3Status("");
      setL3Date("");
      setFinalStatus("REJECTED");
    } else if ((val === "CLEARED" || val === "PASSED") && finalStatus === "REJECTED") {
      setFinalStatus("SUBMITTED");
    } else if (!val || val === "PENDING" || val === "SCHEDULED") {
      // Reset downstream rounds if L1 is not cleared
      setL2Status("");
      setL2Date("");
      setL3Status("");
      setL3Date("");
      if (finalStatus === "REJECTED" || finalStatus === "OFFER" || finalStatus === "JOIN") {
        setFinalStatus("SUBMITTED");
      }
    }
  };

  const handleL2Change = (val: string) => {
    setL2Status(val);
    if (val === "REJECTED") {
      setL3Status("");
      setL3Date("");
      setFinalStatus("REJECTED");
    } else if ((val === "CLEARED" || val === "PASSED") && finalStatus === "REJECTED") {
      setFinalStatus("SUBMITTED");
    } else if (!val || val === "PENDING" || val === "SCHEDULED") {
      setL3Status("");
      setL3Date("");
      if (finalStatus === "OFFER" || finalStatus === "JOIN") {
        setFinalStatus("SUBMITTED");
      }
    }
  };

  const handleL3Change = (val: string) => {
    setL3Status(val);
    if (val === "REJECTED") {
      setFinalStatus("REJECTED");
    } else if (val === "CLEARED" || val === "PASSED") {
      setFinalStatus("OFFER");
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Main View Area */}
      <div className={`transition-all duration-300 ${panelOpen ? "pr-[440px]" : ""}`}>
        <SiteBreadcrumb />

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-default-100 pb-5 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-default-900 flex items-center gap-2">
              <Icon icon="heroicons:clipboard-document-list" className="text-indigo-600 h-7 w-7" />
              Submissions Tracker
            </h1>
            <p className="text-sm text-default-600 mt-1">
              Monitor candidate submissions, schedule client interview rounds, and approve internal submissions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-default-300 rounded-lg p-0.5 bg-default-100 dark:bg-slate-800">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-900 text-indigo-650 shadow-sm"
                    : "text-default-500 hover:text-default-800"
                }`}
              >
                <Icon icon="heroicons:list-bullet" className="h-4 w-4" />
                List
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === "kanban"
                    ? "bg-white dark:bg-slate-900 text-indigo-650 shadow-sm"
                    : "text-default-500 hover:text-default-800"
                }`}
              >
                <Icon icon="heroicons:presentation-chart-line" className="h-4 w-4" />
                Board
              </button>
            </div>
            {canManageRemarks && (
              <Button
                onClick={() => setCustomRemarksModalOpen(true)}
                variant="outline"
                className="flex items-center gap-1.5 border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300 font-semibold text-xs h-9"
              >
                <Icon icon="heroicons:cog-6-tooth" className="h-4 w-4" />
                Manage Stage Remarks
              </Button>
            )}
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="flex items-center gap-1.5 border-default-300 font-semibold text-sm"
            >
              <Icon icon="heroicons:arrow-down-tray" className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={loadData}
              variant="outline"
              className="flex items-center gap-1.5 border-default-300 font-semibold text-sm"
            >
              <Icon icon="heroicons:arrow-path" className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[
            { label: "Total Submissions", value: stats.total, icon: "heroicons:clipboard-document", color: "indigo" },
            { label: "Pending Internal Review", value: stats.l1Pending, icon: "heroicons:user", color: "amber" },
            { label: "L2 Scheduled", value: stats.l2Pending, icon: "heroicons:calendar", color: "cyan" },
            { label: "L3 Direct Interview", value: stats.l3Pending, icon: "heroicons:academic-cap", color: "purple" },
          ].map(({ label, value, icon, color }) => (
            <Card key={label} className={`border border-default-150 bg-white dark:bg-slate-900 p-4 flex items-center gap-3 shadow-xs`}>
              <div className={`h-10 w-10 rounded-lg bg-${color}-50 text-${color}-600 dark:bg-${color}-950/20 dark:text-${color}-450 flex items-center justify-center text-lg shrink-0`}>
                <Icon icon={icon} />
              </div>
              <div>
                <div className="text-[10px] text-default-450 font-bold uppercase tracking-wider">{label}</div>
                <div className={`text-xl font-bold text-default-900 mt-0.5`}>{loading ? "..." : value}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* SEARCH & FILTERS BAR */}
        <Card className="border border-default-150 bg-white dark:bg-slate-900 p-4 shadow-sm rounded-xl mt-6">
          <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end">
            {/* Search Query */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-default-450 uppercase tracking-wider">Search Query</label>
              <Input
                placeholder="Candidate, Job code, Title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            
            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-default-450 uppercase tracking-wider">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-3 h-9 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              >
                <option value="">All Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="SUBMITTED">Submitted to Client</option>
                <option value="REJECTED">Rejected</option>
                <option value="OFFER">Offer Stage</option>
                <option value="JOIN">Joined / Placed</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-default-450 uppercase tracking-wider">From Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-default-450 uppercase tracking-wider">To Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 h-9">
              <Button type="submit" size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs">
                Filter
              </Button>
              <Button type="button" size="sm" onClick={handleClearFilters} variant="outline" className="flex-1 text-xs border-default-300 font-semibold">
                Clear
              </Button>
            </div>
          </form>
        </Card>

        {/* SUBMISSIONS LIST VS KANBAN PIPELINE */}
        {viewMode === "list" ? (
          <div className="border border-neutral-200 dark:border-slate-800 rounded-sm bg-white dark:bg-slate-900 overflow-hidden shadow-xs mt-6">
            <div className="overflow-auto max-h-[calc(100vh-270px)] relative">
              <table className="w-full border-collapse text-left table-auto border-neutral-200 dark:border-slate-800 min-w-[1200px]">
                <thead className="sticky top-0 z-20 bg-blue-50 dark:bg-slate-800 border-b border-neutral-250 dark:border-slate-700 shadow-xs select-none">
                  <tr>
                    <th className="sticky top-0 z-20 p-2 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 bg-blue-50 dark:bg-slate-800 border-r border-b border-neutral-250 dark:border-slate-700 uppercase tracking-wider text-[10px] whitespace-nowrap">
                      Job Code
                    </th>
                    <th className="sticky top-0 z-20 p-2 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 bg-blue-50 dark:bg-slate-800 border-r border-b border-neutral-250 dark:border-slate-700 uppercase tracking-wider text-[10px] whitespace-nowrap">
                      Candidate
                    </th>
                    <th className="sticky top-0 z-20 p-2 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 bg-blue-50 dark:bg-slate-800 border-r border-b border-neutral-250 dark:border-slate-700 uppercase tracking-wider text-[10px] whitespace-nowrap">
                      Job Title &amp; Client
                    </th>
                    <th className="sticky top-0 z-20 p-2 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 bg-blue-50 dark:bg-slate-800 border-r border-b border-neutral-250 dark:border-slate-700 uppercase tracking-wider text-[10px] whitespace-nowrap">
                      Pay Rate
                    </th>
                    <th className="sticky top-0 z-20 p-2 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 bg-blue-50 dark:bg-slate-800 border-r border-b border-neutral-250 dark:border-slate-700 uppercase tracking-wider text-[10px] whitespace-nowrap">
                      Internal Review
                    </th>
                    <th className="sticky top-0 z-20 p-2 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 bg-blue-50 dark:bg-slate-800 border-r border-b border-neutral-250 dark:border-slate-700 uppercase tracking-wider text-[10px] whitespace-nowrap">
                      Interview Rounds
                    </th>
                    <th className="sticky top-0 z-20 p-2 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 bg-blue-50 dark:bg-slate-800 border-r border-b border-neutral-250 dark:border-slate-700 uppercase tracking-wider text-[10px] whitespace-nowrap">
                      Final Status
                    </th>
                    <th className="sticky top-0 z-20 p-2 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 bg-blue-50 dark:bg-slate-800 border-r border-b border-neutral-250 dark:border-slate-700 uppercase tracking-wider text-[10px] whitespace-nowrap">
                      Remarks &amp; Date
                    </th>
                    <th className="sticky top-0 z-20 p-2 text-center text-[11px] font-bold text-neutral-700 dark:text-neutral-200 bg-blue-50 dark:bg-slate-800 border-b border-neutral-250 dark:border-slate-700 uppercase tracking-wider text-[10px] whitespace-nowrap w-[56px]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-slate-800 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="h-32 text-center text-neutral-500 font-medium bg-white dark:bg-slate-900">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                          <span className="text-xs">Loading candidate submissions…</span>
                        </div>
                      </td>
                    </tr>
                  ) : submissions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="h-32 text-center text-neutral-500 font-medium bg-white dark:bg-slate-900">
                        No submissions found. Try adjusting your search queries or date filters.
                      </td>
                    </tr>
                  ) : (
                    submissions.map((sub, idx) => (
                      <tr
                        key={sub.id}
                        onClick={() => openEditPanel(sub)}
                        className={cn(
                          "group transition-colors cursor-pointer border-b border-neutral-200 dark:border-slate-800/80 h-[52px]",
                          selectedSubmission?.id === sub.id
                            ? "bg-primary/10 hover:bg-primary/10 dark:bg-primary/15 dark:hover:bg-primary/15"
                            : idx % 2 === 0
                            ? "bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-slate-800/60"
                            : "bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-slate-800/60"
                        )}
                      >
                        {/* 1. Job Code (Leftmost Column) */}
                        <td className="h-[52px] py-1 px-2.5 border-r border-neutral-200 dark:border-slate-800 whitespace-nowrap align-middle">
                          {sub.jobId ? (
                            <Link href={`/job-posting/${sub.jobId}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                              <span className="text-[#1a4fa0] dark:text-blue-400 font-semibold hover:underline cursor-pointer font-mono">
                                {sub.jobCode || "—"}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-[#1a4fa0] dark:text-blue-400 font-semibold font-mono">
                              {sub.jobCode || "—"}
                            </span>
                          )}
                        </td>

                        {/* 2. Candidate */}
                        <td className="h-[52px] py-1 px-2.5 border-r border-neutral-200 dark:border-slate-800 whitespace-nowrap align-middle">
                          <div className="flex flex-col justify-center gap-0.5 max-w-[200px]">
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-[#1a4fa0] dark:group-hover:text-blue-400 transition-colors truncate">
                              {sub.candidateName}
                            </span>
                            <span className="text-[10.5px] text-neutral-400 font-normal truncate">
                              {sub.candidateEmail || "—"}
                            </span>
                          </div>
                        </td>

                        {/* 3. Job Title & Client */}
                        <td className="h-[52px] py-1 px-2.5 border-r border-neutral-200 dark:border-slate-800 whitespace-nowrap align-middle">
                          <div className="flex flex-col justify-center gap-0.5 max-w-[220px]">
                            <span className="font-medium text-xs text-slate-900 dark:text-slate-100 truncate">
                              {sub.jobTitle || "—"}
                            </span>
                            <span className="text-[10.5px] text-neutral-500 truncate">
                              {sub.clientName || "Direct Client"}
                            </span>
                          </div>
                        </td>

                        {/* 4. Pay Rate */}
                        <td className="h-[52px] py-1 px-2.5 border-r border-neutral-200 dark:border-slate-800 whitespace-nowrap align-middle font-normal text-xs text-neutral-800 dark:text-neutral-200">
                          {formatSubmittedRate(sub.submittedRate, sub.market, sub.jobCode, sub.jobTitle)}
                        </td>

                        {/* 5. Internal Review Status (Pure clean text with HoverCard) */}
                        <td className="h-[52px] py-1 px-2.5 border-r border-neutral-200 dark:border-slate-800 whitespace-nowrap align-middle">
                          <div className="flex items-center gap-1.5">
                            {renderInternalReviewStatus(sub)}
                            {sub.finalStatus === "PENDING_APPROVAL" && canInternalScreen && (
                              <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickReviewSub(sub);
                                    setQuickReviewAction("APPROVE");
                                    setQuickReviewRemark("");
                                    setQuickReviewModalOpen(true);
                                  }}
                                  className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] rounded shadow-xs cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickReviewSub(sub);
                                    setQuickReviewAction("REJECT");
                                    setQuickReviewRemark("");
                                    setQuickReviewModalOpen(true);
                                  }}
                                  className="px-1.5 py-0.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 dark:bg-slate-900 dark:border-rose-900 font-semibold text-[10px] rounded cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 6. Interview Rounds (L1, L2, L3) */}
                        <td className="h-[52px] py-1 px-2.5 border-r border-neutral-200 dark:border-slate-800 whitespace-nowrap align-middle">
                          <div className="flex items-center gap-1">
                            {renderPipelineProgress(sub)}
                          </div>
                        </td>

                        {/* 7. Final Status (Pure clean text, no dots) */}
                        <td className="h-[52px] py-1 px-2.5 border-r border-neutral-200 dark:border-slate-800 whitespace-nowrap align-middle">
                          {sub.finalStatus === "PENDING_APPROVAL" ? (
                            <span className="text-xs text-neutral-400 italic select-none">In Review</span>
                          ) : sub.finalStatus === "SUBMITTED" ? (
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold select-none">
                              Submitted to Client
                            </span>
                          ) : sub.finalStatus === "OFFER" ? (
                            <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold select-none">
                              Offer Released
                            </span>
                          ) : sub.finalStatus === "JOIN" ? (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold select-none">
                              Joined / Placed
                            </span>
                          ) : sub.finalStatus === "REJECTED" ? (
                            <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold select-none">
                              Rejected
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-700 dark:text-neutral-300 font-semibold select-none">
                              {sub.finalStatus}
                            </span>
                          )}
                        </td>

                        {/* 8. Remarks & Date */}
                        <td className="h-[52px] py-1 px-2.5 border-r border-neutral-200 dark:border-slate-800 min-w-[220px] max-w-[320px] whitespace-nowrap align-middle">
                          {renderClutterFreeRemarks(sub)}
                        </td>

                        {/* 9. Action */}
                        <td className="h-[52px] py-1 px-2.5 text-center whitespace-nowrap align-middle" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded text-neutral-500 dark:text-neutral-400 transition-colors cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-border/70 font-sans p-1">
                              <DropdownMenuItem
                                onClick={() => openEditPanel(sub)}
                                className="text-xs cursor-pointer gap-2 font-medium py-1.5"
                              >
                                <Pencil className="h-3.5 w-3.5 text-indigo-500" />
                                Edit Status &amp; Rounds
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSubForInterview(sub);
                                  setInterviewModalOpen(true);
                                }}
                                className="text-xs cursor-pointer gap-2 font-medium py-1.5"
                              >
                                <CalendarDays className="h-3.5 w-3.5 text-cyan-500" />
                                Schedule Interview
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDownloadResume(sub.candidateId, sub.candidateName || "Candidate")}
                                className="text-xs cursor-pointer gap-2 font-medium py-1.5"
                              >
                                <FileText className="h-3.5 w-3.5 text-emerald-500" />
                                Download CV
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mt-6 overflow-x-auto pb-4">
            {[
              {
                id: "l1",
                title: "Internal Review",
                color: "border-t-amber-500 bg-amber-50/10 dark:bg-amber-950/5",
                badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
                subs: submissions.filter(s => s.finalStatus === "PENDING_APPROVAL" && s.l1Status !== "REJECTED"),
              },
              {
                id: "submitted",
                title: "Submitted",
                color: "border-t-blue-500 bg-blue-50/10 dark:bg-blue-950/5",
                badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                subs: submissions.filter(s => (s.finalStatus === "SUBMITTED" || (s.finalStatus as string) === "POD_APPROVED") && s.l1Status !== "SCHEDULED" && s.l2Status !== "SCHEDULED" && s.l3Status !== "SCHEDULED" && s.l1Status !== "REJECTED" && s.l2Status !== "REJECTED" && s.l3Status !== "REJECTED"),
              },
              {
                id: "interviews",
                title: "Interviews",
                color: "border-t-cyan-500 bg-cyan-50/10 dark:bg-cyan-950/5",
                badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
                subs: submissions.filter(s => (s.l1Status === "SCHEDULED" || (s.l1Status as string) === "PASSED" || s.l1Status === "CLEARED" || s.l2Status === "SCHEDULED" || (s.l2Status as string) === "PASSED" || s.l2Status === "CLEARED" || s.l3Status === "SCHEDULED" || (s.l3Status as string) === "PASSED" || s.l3Status === "CLEARED" || (s.finalStatus && s.finalStatus.includes("PASSED"))) && s.finalStatus !== "OFFER" && s.finalStatus !== "JOIN" && s.finalStatus !== "REJECTED"),
              },
              {
                id: "offers",
                title: "Offer Stage",
                color: "border-t-teal-500 bg-teal-50/10 dark:bg-teal-950/5",
                badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
                subs: submissions.filter(s => s.finalStatus === "OFFER"),
              },
              {
                id: "joined",
                title: "Joined",
                color: "border-t-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5",
                badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
                subs: submissions.filter(s => s.finalStatus === "JOIN" || (s.finalStatus as string) === "PLACED"),
              },
              {
                id: "rejected",
                title: "Rejected",
                color: "border-t-rose-500 bg-rose-50/10 dark:bg-rose-950/5",
                badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
                subs: submissions.filter(s => s.finalStatus === "REJECTED" || s.l1Status === "REJECTED" || s.l2Status === "REJECTED" || s.l3Status === "REJECTED"),
              },
            ].map((col) => (
              <div
                key={col.id}
                className={`flex flex-col rounded-xl border border-default-200 dark:border-slate-800 border-t-4 ${col.color} p-3 min-w-[200px] h-[calc(100vh-280px)]`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-default-200/50 mb-3 shrink-0">
                  <span className="font-bold text-xs text-default-800">{col.title}</span>
                  <Badge className={`text-[10px] font-bold py-0.25 px-1.5 rounded-full ${col.badge}`}>
                    {col.subs.length}
                  </Badge>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {col.subs.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => openEditPanel(sub)}
                      className={`p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850/50 rounded-lg border border-default-200 dark:border-slate-800 shadow-xs hover:shadow-sm cursor-pointer transition-all ${
                        selectedSubmission?.id === sub.id ? "ring-2 ring-indigo-500" : ""
                      }`}
                    >
                      <div className="font-bold text-xs text-default-900 truncate">
                        {sub.candidateName}
                      </div>
                      <div className="text-[10px] text-default-500 font-semibold mt-1 truncate">
                        {sub.jobTitle}
                      </div>
                      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-default-100/50 text-[10px]">
                        <span className="text-default-455 font-semibold truncate max-w-[80px]">
                          {sub.recruiterName || "—"}
                        </span>
                        <span className="font-bold text-indigo-655">
                          {formatSubmittedRate(sub.submittedRate, sub.market, sub.jobCode, sub.jobTitle)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          sub.l1Status === "CLEARED" ? "bg-emerald-500" :
                          sub.l1Status === "REJECTED" ? "bg-rose-500" :
                          sub.l1Status ? "bg-amber-500" : "bg-neutral-200 dark:bg-slate-700"
                        }`} title={`L1: ${sub.l1Status || "PENDING"}`} />
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          sub.l2Status === "CLEARED" ? "bg-emerald-500" :
                          sub.l2Status === "REJECTED" ? "bg-rose-500" :
                          sub.l2Status ? "bg-amber-500" : "bg-neutral-200 dark:bg-slate-700"
                        }`} title={`L2: ${sub.l2Status || "Not Started"}`} />
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          sub.l3Status === "CLEARED" ? "bg-emerald-500" :
                          sub.l3Status === "REJECTED" ? "bg-rose-500" :
                          sub.l3Status ? "bg-amber-500" : "bg-neutral-200 dark:bg-slate-700"
                        }`} title={`L3: ${sub.l3Status || "Not Started"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT SIDE PANEL — Update Statuses */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/10"
          onClick={closePanel}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-[440px] bg-card border-l border-border shadow-xl z-40 flex flex-col transition-transform duration-300 ease-in-out ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Review Candidate</h2>
              {selectedSubmission && (
                <p className="text-xs text-muted-foreground">{selectedSubmission.candidateName} • {selectedSubmission.jobCode}</p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={closePanel}
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Panel Form — scrollable body */}
        <form onSubmit={handleUpdateSubmission} className="flex flex-col flex-1 overflow-hidden">
          {selectedSubmission && (
            <>
              {/* Top Compact Summary Context Box */}
              <div className="px-5 py-3 bg-muted/40 border-b border-border shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{selectedSubmission.candidateName}</span>
                      <Badge variant="outline" className="font-mono text-[10px] font-normal py-0">
                        {selectedSubmission.jobCode}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {selectedSubmission.jobTitle || "Job Requisition"} • {selectedSubmission.clientName || "Direct Client"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadResume(selectedSubmission.candidateId, selectedSubmission.candidateName || "Candidate")}
                    className="h-8 text-xs shrink-0 cursor-pointer"
                  >
                    <Icon icon="heroicons:arrow-down-tray" className="h-3.5 w-3.5 mr-1.5" />
                    Resume
                  </Button>
                </div>
              </div>

              {/* Shadcn Tabs Navigation */}
              <Tabs value={drawerTab} onValueChange={(val: any) => setDrawerTab(val)} className="flex-1 flex flex-col overflow-hidden gap-0">
                <div className="px-5 pt-3 pb-2 border-b border-border bg-card shrink-0">
                  <TabsList className="grid grid-cols-3 w-full h-9 bg-muted">
                    <TabsTrigger value="pipeline" className="text-xs font-medium">
                      Pipeline
                    </TabsTrigger>
                    <TabsTrigger value="review" className="text-xs font-medium flex items-center justify-center gap-1.5">
                      Internal Review
                      {selectedSubmission.finalStatus === "PENDING_APPROVAL" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="text-xs font-medium">
                      Profile &amp; Audit
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Scrollable Tab Content Area */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {/* ── TAB 1: INTERVIEW PIPELINE ── */}
                  <TabsContent value="pipeline" className="space-y-3.5 m-0 outline-none">
                    {/* Stage 1: Round 1 (L1) */}
                    <div className="rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850/40 p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">
                          Round 1 (L1) — Screening
                        </Label>
                        <Badge variant="secondary" className="text-[10px] font-medium py-0">
                          {l1Status || "PENDING"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={l1Status}
                          disabled={!canAuditL1}
                          onChange={(e) => handleL1Change(e.target.value)}
                          className="w-full text-xs border border-input rounded-md px-2.5 h-8.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed shadow-none"
                        >
                          <option value="">— PENDING —</option>
                          <option value="SCHEDULED">SCHEDULED</option>
                          <option value="CLEARED">CLEARED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                        <DateTimePicker
                          value={l1Date}
                          onChange={setL1Date}
                          disabled={!canAuditL1}
                          placeholder="Date &amp; Time"
                        />
                      </div>
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] text-muted-foreground font-normal">Remarks</Label>
                          {canAuditL1 && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  setL1Remarks((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                                  e.target.value = "";
                                }
                              }}
                              className="text-[10px] border border-border rounded px-1.5 py-0.5 bg-background text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                            >
                              <option value="" disabled>+ Template</option>
                              {renderCategorizedRemarkOptions("l1")}
                            </select>
                          )}
                        </div>
                        <Textarea
                          rows={2}
                          disabled={!canAuditL1}
                          placeholder={canAuditL1 ? "Screening feedback or evaluation notes..." : "No remarks recorded."}
                          value={l1Remarks}
                          onChange={(e) => setL1Remarks(e.target.value)}
                          className="text-xs min-h-[52px] resize-none bg-background shadow-none"
                        />
                      </div>
                    </div>

                    {/* Stage 2: Round 2 (L2) */}
                    <div className={cn("rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850/40 p-3.5 space-y-3", !canAccessL2 && "opacity-45")}>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">
                          Round 2 (L2) — Technical
                        </Label>
                        <Badge variant="secondary" className="text-[10px] font-medium py-0">
                          {!isL1Cleared ? (isL1Rejected ? "L1 Rejected" : "Awaiting L1 Clearance") : (l2Status || "Not Started")}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={l2Status}
                          disabled={!canAccessL2}
                          onChange={(e) => handleL2Change(e.target.value)}
                          className="w-full text-xs border border-input rounded-md px-2.5 h-8.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed shadow-none"
                        >
                          <option value="">— Not Started —</option>
                          <option value="PENDING">PENDING</option>
                          <option value="SCHEDULED">SCHEDULED</option>
                          <option value="CLEARED">CLEARED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                        <DateTimePicker
                          value={l2Date}
                          onChange={setL2Date}
                          disabled={!canAccessL2}
                          placeholder="Date &amp; Time"
                        />
                      </div>
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] text-muted-foreground font-normal">Remarks</Label>
                          {canAccessL2 && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  setL2Remarks((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                                  e.target.value = "";
                                }
                              }}
                              className="text-[10px] border border-border rounded px-1.5 py-0.5 bg-background text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                            >
                              <option value="" disabled>+ Template</option>
                              {renderCategorizedRemarkOptions("l2")}
                            </select>
                          )}
                        </div>
                        <Textarea
                          rows={2}
                          disabled={!canAccessL2}
                          placeholder={canAccessL2 ? "Technical evaluation notes..." : "Awaiting Round 1 (L1) clearance."}
                          value={l2Remarks}
                          onChange={(e) => setL2Remarks(e.target.value)}
                          className="text-xs min-h-[52px] resize-none bg-background shadow-none"
                        />
                      </div>
                    </div>

                    {/* Stage 3: Round 3 (L3) */}
                    <div className={cn("rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850/40 p-3.5 space-y-3", !canAccessL3 && "opacity-45")}>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">
                          Round 3 (L3) — Commercial / Final
                        </Label>
                        <Badge variant="secondary" className="text-[10px] font-medium py-0">
                          {!isL2Cleared ? (isL2Rejected || isL1Rejected ? "Prior Round Rejected" : "Awaiting L2 Clearance") : (l3Status || "Not Started")}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={l3Status}
                          disabled={!canAccessL3}
                          onChange={(e) => handleL3Change(e.target.value)}
                          className="w-full text-xs border border-input rounded-md px-2.5 h-8.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed shadow-none"
                        >
                          <option value="">— Not Started —</option>
                          <option value="PENDING">PENDING</option>
                          <option value="SCHEDULED">SCHEDULED</option>
                          <option value="CLEARED">CLEARED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                        <DateTimePicker
                          value={l3Date}
                          onChange={setL3Date}
                          disabled={!canAccessL3}
                          placeholder="Date &amp; Time"
                        />
                      </div>
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] text-muted-foreground font-normal">Remarks</Label>
                          {canAccessL3 && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  setL3Remarks((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                                  e.target.value = "";
                                }
                              }}
                              className="text-[10px] border border-border rounded px-1.5 py-0.5 bg-background text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                            >
                              <option value="" disabled>+ Template</option>
                              {renderCategorizedRemarkOptions("l3")}
                            </select>
                          )}
                        </div>
                        <Textarea
                          rows={2}
                          disabled={!canAccessL3}
                          placeholder={canAccessL3 ? "Commercial remarks..." : "Awaiting Round 2 (L2) clearance."}
                          value={l3Remarks}
                          onChange={(e) => setL3Remarks(e.target.value)}
                          className="text-xs min-h-[52px] resize-none bg-background shadow-none"
                        />
                      </div>
                    </div>

                    {/* Final Outcome */}
                    <div className="rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850/40 p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">
                          Final Client Status
                        </Label>
                        <Badge variant="outline" className="text-[10px] font-medium py-0">
                          {finalStatus}
                        </Badge>
                      </div>
                      <select
                        value={finalStatus}
                        disabled={!canFinalStatus}
                        onChange={(e) => setFinalStatus(e.target.value)}
                        className="w-full text-xs border border-input rounded-md px-3 h-8.5 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed shadow-none"
                      >
                        <option value="SUBMITTED">SUBMITTED — Sent to Client</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="OFFER">OFFER — Offer Extended</option>
                        <option value="JOIN">JOIN — Placed / Joined</option>
                      </select>
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] text-muted-foreground font-normal">Final Remarks</Label>
                          {canFinalStatus && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  setRemarks((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                                  e.target.value = "";
                                }
                              }}
                              className="text-[10px] border border-border rounded px-1.5 py-0.5 bg-background text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                            >
                              <option value="" disabled>+ Template</option>
                              {renderCategorizedRemarkOptions("final")}
                            </select>
                          )}
                        </div>
                        <Textarea
                          placeholder={canFinalStatus ? "Client feedback, placement confirmation..." : "No final remarks recorded."}
                          value={remarks}
                          disabled={!canFinalStatus}
                          onChange={(e) => setRemarks(e.target.value)}
                          className="text-xs min-h-[52px] resize-none bg-background shadow-none"
                          rows={2}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── TAB 2: INTERNAL REVIEW & FINANCIALS ── */}
                  <TabsContent value="review" className="space-y-3.5 m-0 outline-none">
                    {/* Internal Review Decision Card */}
                    <Card className="p-4 border border-border shadow-none space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">
                          Internal Screening Gate
                        </Label>
                        <Badge
                          variant={selectedSubmission.finalStatus === "PENDING_APPROVAL" ? "secondary" : selectedSubmission.finalStatus === "REJECTED" ? "destructive" : "default"}
                          className="text-[10px] font-medium py-0"
                        >
                          {selectedSubmission.finalStatus === "PENDING_APPROVAL" ? "Pending Review" : selectedSubmission.finalStatus === "REJECTED" ? "Rejected" : "Approved"}
                        </Badge>
                      </div>

                      {/* Review Feedback text & Quick Pick */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] text-muted-foreground font-normal">Reviewer Feedback &amp; Notes</Label>
                          {canInternalScreen && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  setReviewFeedback((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                                  e.target.value = "";
                                }
                              }}
                              className="text-[10px] border border-border rounded px-1.5 py-0.5 bg-background text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                            >
                              <option value="" disabled>+ Template</option>
                              {renderCategorizedRemarkOptions("review")}
                            </select>
                          )}
                        </div>
                        {canInternalScreen ? (
                          <Textarea
                            placeholder="Evaluation notes, rate justification, validation remarks..."
                            value={reviewFeedback}
                            onChange={(e) => setReviewFeedback(e.target.value)}
                            className="text-xs min-h-[70px] resize-none"
                            rows={3}
                          />
                        ) : (
                          <div className="text-xs border border-border rounded-md p-2.5 bg-muted/30 text-foreground min-h-[48px]">
                            {reviewFeedback || <span className="text-muted-foreground italic">No review notes recorded.</span>}
                          </div>
                        )}
                      </div>

                      {/* Quick Approve / Reject Buttons (when pending decision) */}
                      {selectedSubmission.finalStatus === "PENDING_APPROVAL" && canInternalScreen && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={submitting}
                            onClick={async () => {
                              try {
                                setSubmitting(true);
                                await atsApi.submissions.update(selectedSubmission.id, {
                                  finalStatus: "REJECTED",
                                  reviewFeedback: reviewFeedback.trim() || null,
                                });
                                toast.success("Submission rejected internally.");
                                closePanel();
                                await loadData();
                              } catch (err: any) {
                                toast.error("Failed: " + err.message);
                              } finally { setSubmitting(false); }
                            }}
                            className="text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Reject Internally
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={submitting}
                            onClick={async () => {
                              try {
                                setSubmitting(true);
                                await atsApi.submissions.update(selectedSubmission.id, {
                                  finalStatus: "SUBMITTED",
                                  reviewFeedback: reviewFeedback.trim() || null,
                                });
                                toast.success("Approved & submitted to client.");
                                closePanel();
                                await loadData();
                              } catch (err: any) {
                                toast.error("Failed: " + err.message);
                              } finally { setSubmitting(false); }
                            }}
                            className="text-xs cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Approve &amp; Submit
                          </Button>
                        </div>
                      )}
                    </Card>

                    {/* Pay Rate & Recruiter Sourcing Note Card */}
                    <Card className="p-4 border border-border shadow-none space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          {(selectedSubmission.market === "IN" || selectedSubmission.jobCode?.includes("-IN-") || selectedSubmission.jobTitle?.toLowerCase().includes("india") || selectedSubmission.jobCode?.toLowerCase().includes("in"))
                            ? "Expected Salary (Lakhs)"
                            : "Submitted Pay Rate ($/hr or $/yr)"}
                        </Label>
                        <Input
                          placeholder="e.g. 12.5 or $70/hr"
                          value={submittedRate}
                          disabled={!canEditRate}
                          onChange={(e) => setSubmittedRate(e.target.value)}
                          className="h-8.5 text-xs disabled:opacity-70"
                        />
                      </div>

                      <Separator />

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground">
                            Recruiter Sourcing Note
                          </Label>
                          <span className="text-[11px] text-muted-foreground font-normal">
                            {selectedSubmission.recruiterName || "Recruiter"}
                          </span>
                        </div>
                        {canEditRecruiterComment ? (
                          <Textarea
                            placeholder="Candidate salary expectations, notice period, location etc..."
                            value={recruiterComment}
                            onChange={(e) => setRecruiterComment(e.target.value)}
                            className="text-xs min-h-[64px] resize-none"
                            rows={2.5}
                          />
                        ) : (
                          <div className="text-xs border border-border rounded-md p-2.5 bg-muted/30 text-foreground min-h-[44px]">
                            {recruiterComment || <span className="italic text-muted-foreground">No recruiter submission comments provided.</span>}
                          </div>
                        )}
                      </div>
                    </Card>
                  </TabsContent>

                  {/* ── TAB 3: CANDIDATE PROFILE & SINGLE TIMELINE AUDIT TRAIL ── */}
                  <TabsContent value="profile" className="space-y-3.5 m-0 outline-none">
                    {/* Full Candidate Profile Grid */}
                    <Card className="p-4 border border-border shadow-none space-y-3">
                      <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Candidate Information
                      </Label>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Email Address</span>
                          <span className="font-medium text-foreground truncate block">{selectedSubmission.candidateEmail || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Phone Number</span>
                          <span className="font-medium text-foreground block">{selectedSubmission.candidatePhone || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Location</span>
                          <span className="font-medium text-foreground block truncate">{selectedSubmission.candidateCurrentLocation || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Experience</span>
                          <span className="font-medium text-foreground block">
                            {selectedSubmission.candidateExperience != null ? `${selectedSubmission.candidateExperience} Years` : "—"}
                          </span>
                        </div>
                        {(selectedSubmission.market === "IN" || selectedSubmission.jobCode?.includes("-IN-") || selectedSubmission.jobTitle?.toLowerCase().includes("india") || selectedSubmission.jobCode?.toLowerCase().includes("in")) ? (
                          <>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Current CTC</span>
                              <span className="font-medium text-foreground block">
                                {selectedSubmission.candidateCurrentCtc ? `${selectedSubmission.candidateCurrentCtc} Lakhs` : "—"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Notice Period</span>
                              <span className="font-medium text-foreground block">
                                {selectedSubmission.candidateNoticePeriod != null ? `${selectedSubmission.candidateNoticePeriod} Days` : "—"}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Work Authorization</span>
                              <span className="font-medium text-foreground block truncate">{selectedSubmission.candidateWorkAuth || "—"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Source Channel</span>
                              <span className="font-medium text-foreground block truncate">{selectedSubmission.candidateSource || "—"}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </Card>

                    {/* Job Requisition Card */}
                    <Card className="p-4 border border-border shadow-none space-y-3">
                      <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Job Requisition
                      </Label>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Job Code</span>
                          <span className="font-mono font-medium text-foreground block">{selectedSubmission.jobCode || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Client Name</span>
                          <span className="font-medium text-foreground block truncate">{selectedSubmission.clientName || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Recruiter</span>
                          <span className="font-medium text-foreground block truncate">{selectedSubmission.recruiterName || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Pod Head</span>
                          <span className="font-medium text-foreground block truncate">{selectedSubmission.podHeadName || "—"}</span>
                        </div>
                      </div>
                    </Card>

                    {/* Unified Evaluation Timeline Audit Trail */}
                    <Card className="p-4 border border-border shadow-none space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                          Evaluation Timeline
                        </Label>
                      </div>

                      <div className="relative pl-4 border-l border-border space-y-4 text-xs pt-1">
                        {/* Sourced */}
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-foreground" />
                          <div className="font-medium text-foreground">
                            Sourced by {selectedSubmission.recruiterName || "Recruiter"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(selectedSubmission.createdAt).toLocaleString()}
                          </div>
                          {selectedSubmission.recruiterComment && (
                            <div className="mt-1.5 text-xs text-foreground bg-muted/40 p-2 rounded-md border border-border">
                              "{selectedSubmission.recruiterComment}"
                            </div>
                          )}
                        </div>

                        {/* Internal Review Feedback if present */}
                        {selectedSubmission.reviewFeedback && (
                          <div className="relative">
                            <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-muted-foreground" />
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              <span>Internal Screening:</span>
                              <Badge variant="outline" className="text-[10px] py-0 font-normal">
                                {selectedSubmission.finalStatus === "REJECTED" ? "Rejected" : "Approved"}
                              </Badge>
                            </div>
                            {selectedSubmission.updatedAt && (
                              <div className="text-[11px] text-muted-foreground">
                                {new Date(selectedSubmission.updatedAt).toLocaleString()}
                              </div>
                            )}
                            <div className="mt-1.5 text-xs text-foreground bg-muted/40 p-2 rounded-md border border-border">
                              "{selectedSubmission.reviewFeedback}"
                            </div>
                          </div>
                        )}

                        {/* L1 Stage */}
                        {selectedSubmission.l1Status && (
                          <div className="relative">
                            <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-muted-foreground" />
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              <span>L1 Screening:</span>
                              <Badge variant="outline" className="text-[10px] py-0 font-normal">{selectedSubmission.l1Status}</Badge>
                            </div>
                            {selectedSubmission.l1Date && (
                              <div className="text-[11px] text-muted-foreground">
                                {new Date(selectedSubmission.l1Date).toLocaleString()}
                              </div>
                            )}
                            {selectedSubmission.l1Remarks && (
                              <div className="mt-1.5 text-xs text-foreground bg-muted/40 p-2 rounded-md border border-border">
                                "{selectedSubmission.l1Remarks}"
                              </div>
                            )}
                          </div>
                        )}

                        {/* L2 Stage */}
                        {selectedSubmission.l2Status && (
                          <div className="relative">
                            <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-muted-foreground" />
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              <span>L2 Technical:</span>
                              <Badge variant="outline" className="text-[10px] py-0 font-normal">{selectedSubmission.l2Status}</Badge>
                            </div>
                            {selectedSubmission.l2Date && (
                              <div className="text-[11px] text-muted-foreground">
                                {new Date(selectedSubmission.l2Date).toLocaleString()}
                              </div>
                            )}
                            {selectedSubmission.l2Remarks && (
                              <div className="mt-1.5 text-xs text-foreground bg-muted/40 p-2 rounded-md border border-border">
                                "{selectedSubmission.l2Remarks}"
                              </div>
                            )}
                          </div>
                        )}

                        {/* L3 Stage */}
                        {selectedSubmission.l3Status && (
                          <div className="relative">
                            <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-muted-foreground" />
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              <span>L3 Commercial:</span>
                              <Badge variant="outline" className="text-[10px] py-0 font-normal">{selectedSubmission.l3Status}</Badge>
                            </div>
                            {selectedSubmission.l3Date && (
                              <div className="text-[11px] text-muted-foreground">
                                {new Date(selectedSubmission.l3Date).toLocaleString()}
                              </div>
                            )}
                            {selectedSubmission.l3Remarks && (
                              <div className="mt-1.5 text-xs text-foreground bg-muted/40 p-2 rounded-md border border-border">
                                "{selectedSubmission.l3Remarks}"
                              </div>
                            )}
                          </div>
                        )}

                        {/* Final Status */}
                        {selectedSubmission.finalStatus && selectedSubmission.finalStatus !== 'PENDING_APPROVAL' && (
                          <div className="relative">
                            <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-foreground" />
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              <span>Client Milestone:</span>
                              <Badge variant="outline" className="text-[10px] py-0 font-normal">{selectedSubmission.finalStatus}</Badge>
                            </div>
                            {selectedSubmission.remarks && (
                              <div className="mt-1.5 text-xs text-foreground bg-muted/40 p-2 rounded-md border border-border">
                                "{selectedSubmission.remarks}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}

          {/* Panel Footer */}
          <div className="shrink-0 border-t border-border bg-card px-5 py-3.5 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closePanel}
              disabled={submitting}
              className="text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="text-xs px-5 h-9 cursor-pointer font-medium"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={interviewModalOpen}
        onClose={() => setInterviewModalOpen(false)}
        submission={selectedSubForInterview}
        onSuccess={loadData}
      />

      {/* ── TENANT CUSTOM REMARKS SETTINGS MODAL (THEME MATCHED ENTERPRISE DESIGN) ── */}
      <Dialog open={customRemarksModalOpen} onOpenChange={setCustomRemarksModalOpen}>
        <DialogContent className="sm:max-w-[950px] font-sans max-h-[90vh] flex flex-col p-0 overflow-hidden border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
            <DialogTitle className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Icon icon="heroicons:cog-6-tooth" className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Stage Remarks Templates
            </DialogTitle>
            <DialogDescription className="text-[11.5px] text-slate-500 dark:text-slate-400">
              Standard quick-pick templates for approving or rejecting candidates across hiring stages.
            </DialogDescription>
          </DialogHeader>

          {/* Stage Tabs */}
          <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1.5 shrink-0">Stage:</span>
            {[
              { key: "review", label: "Internal Review Gate", count: customRemarks.filter(r => r.stage === "review" || r.stage === "internal_review").length },
              { key: "l1", label: "Round 1 (L1)", count: customRemarks.filter(r => r.stage === "l1").length },
              { key: "l2", label: "Round 2 (L2)", count: customRemarks.filter(r => r.stage === "l2").length },
              { key: "l3", label: "Round 3 (L3)", count: customRemarks.filter(r => r.stage === "l3").length },
              { key: "final", label: "Final Milestone", count: customRemarks.filter(r => r.stage === "final").length },
              { key: "all", label: "All Stages", count: customRemarks.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCustomRemarksStageFilter(tab.key as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  customRemarksStageFilter === tab.key
                    ? "bg-indigo-600 text-white font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                  customRemarksStageFilter === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Body: 2 Columns */}
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/40 dark:bg-slate-900/40">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              
              {/* ── LEFT COLUMN: ACCEPTANCE REMARKS ── */}
              <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Acceptance / Approval Templates
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Predefined remarks when approving or clearing candidates
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                    {
                      customRemarks.filter(r => 
                        (customRemarksStageFilter === "all" || r.stage === customRemarksStageFilter || (customRemarksStageFilter === "review" && r.stage === "internal_review")) &&
                        r.remarkType === "ACCEPT"
                      ).length
                    } items
                  </span>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddDirectCustomRemark("ACCEPT", newCustomAcceptText);
                  }} 
                  className="p-3 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex gap-2"
                >
                  <Input
                    placeholder="Type remark(s) — separate multiple with comma (,)..."
                    value={newCustomAcceptText}
                    onChange={(e) => setNewCustomAcceptText(e.target.value)}
                    className="h-9 text-xs bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-lg flex-1 text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={addingRemark || !newCustomAcceptText.trim()}
                    className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shrink-0 cursor-pointer shadow-xs"
                  >
                    + Add
                  </Button>
                </form>

                <div className="p-3 space-y-2 max-h-[380px] overflow-y-auto">
                  {customRemarks.filter(r => 
                    (customRemarksStageFilter === "all" || r.stage === customRemarksStageFilter || (customRemarksStageFilter === "review" && r.stage === "internal_review")) &&
                    r.remarkType === "ACCEPT"
                  ).length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 italic">
                      No acceptance remarks added yet for this stage. Type above to add (comma-separated supported).
                    </div>
                  ) : (
                    customRemarks
                      .filter(r => 
                        (customRemarksStageFilter === "all" || r.stage === customRemarksStageFilter || (customRemarksStageFilter === "review" && r.stage === "internal_review")) &&
                        r.remarkType === "ACCEPT"
                      )
                      .map((rem) => (
                        <div 
                          key={rem.id}
                          className="p-2.5 bg-slate-50/60 dark:bg-slate-800/50 rounded-lg border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-2.5 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-xs"
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="text-emerald-600 font-bold text-xs mt-0.5">✓</span>
                            <span className="text-slate-800 dark:text-slate-200 font-normal leading-relaxed">
                              {rem.remarkText}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {customRemarksStageFilter === "all" && (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded uppercase bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {rem.stage}
                              </span>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCustomRemark(rem.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 h-7 w-7 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Delete template"
                            >
                              <Icon icon="heroicons:trash" className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* ── RIGHT COLUMN: REJECTION REMARKS ── */}
              <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center font-bold text-xs">
                      ✕
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Rejection / Issue Templates
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Predefined feedback reasons when candidate does not qualify
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                    {
                      customRemarks.filter(r => 
                        (customRemarksStageFilter === "all" || r.stage === customRemarksStageFilter || (customRemarksStageFilter === "review" && r.stage === "internal_review")) &&
                        r.remarkType === "REJECT"
                      ).length
                    } items
                  </span>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddDirectCustomRemark("REJECT", newCustomRejectText);
                  }} 
                  className="p-3 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex gap-2"
                >
                  <Input
                    placeholder="Type rejection reason(s) — separate multiple with comma (,)..."
                    value={newCustomRejectText}
                    onChange={(e) => setNewCustomRejectText(e.target.value)}
                    className="h-9 text-xs bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-lg flex-1 text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={addingRemark || !newCustomRejectText.trim()}
                    className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shrink-0 cursor-pointer shadow-xs"
                  >
                    + Add
                  </Button>
                </form>

                <div className="p-3 space-y-2 max-h-[380px] overflow-y-auto">
                  {customRemarks.filter(r => 
                    (customRemarksStageFilter === "all" || r.stage === customRemarksStageFilter || (customRemarksStageFilter === "review" && r.stage === "internal_review")) &&
                    r.remarkType === "REJECT"
                  ).length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 italic">
                      No rejection remarks added yet for this stage. Type above to add (comma-separated supported).
                    </div>
                  ) : (
                    customRemarks
                      .filter(r => 
                        (customRemarksStageFilter === "all" || r.stage === customRemarksStageFilter || (customRemarksStageFilter === "review" && r.stage === "internal_review")) &&
                        r.remarkType === "REJECT"
                      )
                      .map((rem) => (
                        <div 
                          key={rem.id}
                          className="p-2.5 bg-slate-50/60 dark:bg-slate-800/50 rounded-lg border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-2.5 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-xs"
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="text-rose-500 font-bold text-xs mt-0.5">✕</span>
                            <span className="text-slate-800 dark:text-slate-200 font-normal leading-relaxed">
                              {rem.remarkText}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {customRemarksStageFilter === "all" && (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded uppercase bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {rem.stage}
                              </span>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCustomRemark(rem.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 h-7 w-7 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Delete template"
                            >
                              <Icon icon="heroicons:trash" className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

            </div>
          </div>

          <DialogFooter className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
            <Button variant="outline" size="sm" onClick={() => setCustomRemarksModalOpen(false)} className="text-xs font-semibold px-5 rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 cursor-pointer">
              Close &amp; Finish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QUICK REVIEW DECISION MODAL (Approve / Reject from Table) ── */}
      <Dialog open={quickReviewModalOpen} onOpenChange={setQuickReviewModalOpen}>
        <DialogContent className="sm:max-w-[500px] font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              {quickReviewAction === "APPROVE" ? (
                <>
                  <Icon icon="heroicons:check-badge" className="h-5 w-5 text-emerald-600" />
                  Approve &amp; Submit to Client
                </>
              ) : (
                <>
                  <Icon icon="heroicons:x-circle" className="h-5 w-5 text-rose-600" />
                  Reject Candidate Internally
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              {quickReviewAction === "APPROVE" ? (
                <>
                  Confirm internal clearance for <strong>{quickReviewSub?.candidateName}</strong> on requirement <strong>{quickReviewSub?.jobTitle} ({quickReviewSub?.jobCode})</strong>.
                </>
              ) : (
                <>
                  Provide internal rejection feedback for <strong>{quickReviewSub?.candidateName}</strong>. This feedback will be logged and visible to the recruiter.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            {/* Candidate & Rate Summary Card */}
            <div className="p-3 bg-neutral-50 dark:bg-slate-800/40 rounded-lg border border-neutral-200 dark:border-slate-700 flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-neutral-900 dark:text-white block text-sm">{quickReviewSub?.candidateName}</span>
                <span className="text-neutral-500 text-[11px]">{quickReviewSub?.candidateEmail}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-neutral-450 block">Pay Rate</span>
                <span className="font-bold text-emerald-600 text-xs">
                  {formatSubmittedRate(quickReviewSub?.submittedRate, quickReviewSub?.market, quickReviewSub?.jobCode, quickReviewSub?.jobTitle)}
                </span>
              </div>
            </div>

            {/* Recruiter's Note if any */}
            {quickReviewSub?.recruiterComment && (
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-md border border-slate-200 dark:border-slate-700 text-[11px]">
                <span className="font-bold text-neutral-500 uppercase text-[9px] block mb-0.5">Recruiter's Submission Note:</span>
                <span className="text-neutral-700 dark:text-neutral-300 italic">{quickReviewSub.recruiterComment}</span>
              </div>
            )}

            {/* Pre-defined Remarks Template Picker */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Review Remarks &amp; Feedback
                </label>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setQuickReviewRemark((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                      e.target.value = "";
                    }
                  }}
                  className="text-[10px] border border-amber-300 dark:border-amber-900 rounded px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold cursor-pointer"
                >
                  <option value="" disabled>+ Quick Pick Pre-Defined Remark</option>
                  {renderCategorizedRemarkOptions("review")}
                </select>
              </div>
              <textarea
                rows={3}
                placeholder={quickReviewAction === "APPROVE" ? "e.g. ✓ Resume screened & profile approved for client submission" : "e.g. ✕ Rejected: Expected CTC is too high for this budget..."}
                value={quickReviewRemark}
                onChange={(e) => setQuickReviewRemark(e.target.value)}
                className="w-full p-2.5 border border-neutral-300 dark:border-slate-700 rounded-lg bg-transparent text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 resize-none font-sans"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => {
                setQuickReviewModalOpen(false);
                setQuickReviewSub(null);
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              onClick={handleConfirmQuickReview}
              className={`text-xs font-bold text-white ${
                quickReviewAction === "APPROVE"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {submitting
                ? "Processing..."
                : quickReviewAction === "APPROVE"
                ? "Confirm & Submit to Client"
                : "Confirm Internal Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
