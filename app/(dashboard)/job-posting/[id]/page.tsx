"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Pencil,
  Sparkles,
  DollarSign,
  Briefcase,
  MapPin,
  CreditCard,
  Building2,
  Users,
  Clock,
  CalendarDays,
  Zap,
  Check,
  X,
  Mail,
  Phone,
  AlertCircle,
  UserPlus,
  ClipboardList,
  RefreshCw,
  Loader2,
  FileText,
  Activity,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Lock,
  Upload,
  Calendar,
  MoreHorizontal,
  Send,
  Award,
  MessageSquare,
  UserCheck,
  FileDown,
  ExternalLink,
  Share2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { JobDescriptionView } from "@/components/ui/job-description-view";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { atsApi } from "@/lib/ats-api";
import { mapApiJobToJob, type Job } from "../data/mock-jobs";
import toast from "react-hot-toast";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { DelegateJobModal } from "@/components/shared/delegate-job-modal";
import { getActiveRolePermissions, resolveActiveSystemRole, CustomRoleDefinition } from "@/lib/role-permissions";
import { getDashboardRoleSelection } from "@/lib/dashboard-role";

const TIER_STYLES: Record<string, { chip: string; label: string; text: string }> = {
  Strong: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900", label: "Strong Match", text: "text-emerald-600 dark:text-emerald-400" },
  Good:   { chip: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",             label: "Good Match",   text: "text-blue-600 dark:text-blue-400" },
  Fair:   { chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",         label: "Fair Match",   text: "text-amber-600 dark:text-amber-400" },
  Low:    { chip: "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-slate-800 dark:text-neutral-400 dark:border-slate-700", label: "Low Match",    text: "text-neutral-500 dark:text-neutral-400" },
};

function renderPipelineProgress(sub: any) {
  // If candidate was rejected internally (before reaching interview stages)
  const isInternallyRejected = sub.finalStatus === "REJECTED" && (!sub.l1Status || sub.l1Status === "PENDING") && !sub.l1Date;
  // If candidate is still awaiting internal review
  const isPendingReview = sub.finalStatus === "PENDING_APPROVAL" && (!sub.l1Status || sub.l1Status === "PENDING") && !sub.l1Date;

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

    const roundName = stage === "L1" ? "Round 1 (L1) - Screening" : stage === "L2" ? "Round 2 (L2) - Technical" : "Round 3 (L3) - Client Final";

    return (
      <HoverCard key={stage} openDelay={150} closeDelay={150}>
        <HoverCardTrigger asChild>
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-md border shadow-none inline-flex items-center gap-0.5 select-none cursor-pointer transition-all hover:scale-105",
              badgeStyle
            )}
          >
            <span className="opacity-70 font-semibold">{stage}:</span>
            <span>{label}</span>
          </span>
        </HoverCardTrigger>
        <HoverCardContent
          align="center"
          side="top"
          className="w-80 p-0 overflow-hidden shadow-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl z-50 text-left font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("p-1 rounded text-xs font-bold", badgeStyle)}>
                <UserCheck className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{roundName}</p>
                <p className="text-[10px] text-neutral-500 truncate max-w-[150px]">{sub.candidateName}</p>
              </div>
            </div>
            <span className={cn("text-[10px] font-bold px-1.5 py-0.2 rounded border", badgeStyle)}>
              {statusTitle}
            </span>
          </div>
          <div className="p-3 space-y-2.5">
            {dateStr && (
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-neutral-400 shrink-0" />
                <span>Interview Date: <strong className="text-neutral-700 dark:text-neutral-200 font-semibold">{new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</strong></span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Feedback &amp; Remarks</span>
              {remarks ? (
                <p className="text-xs text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-slate-800/50 p-2.5 rounded-md border border-neutral-100 dark:border-slate-800/60 leading-relaxed break-words font-normal">
                  {remarks}
                </p>
              ) : (
                <p className="text-[11px] italic text-neutral-400 dark:text-neutral-500 bg-neutral-50/50 dark:bg-slate-800/30 p-2 rounded-md border border-neutral-100 dark:border-slate-800/40">
                  No feedback remarks recorded yet for this round.
                </p>
              )}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <div className="flex items-center gap-1">
      {getStagePill("L1", sub.l1Status || "PENDING", sub.l1Remarks, sub.l1Date)}
      {getStagePill("L2", sub.l2Status, sub.l2Remarks, sub.l2Date)}
      {getStagePill("L3", sub.l3Status, sub.l3Remarks, sub.l3Date)}
    </div>
  );
}

function renderInternalReviewStatus(sub: any) {
  const isPending = sub.finalStatus === "PENDING_APPROVAL";
  const isRejected = sub.finalStatus === "REJECTED";

  const statusLabel = isPending ? "Pending Review" : isRejected ? "Rejected Internally" : "Approved";
  const statusColor = isPending ? "text-amber-600 dark:text-amber-400" : isRejected ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400";
  const badgeStyle = isPending
    ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
    : isRejected
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
        className="w-80 p-0 overflow-hidden shadow-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl z-50 text-left font-sans"
        onClick={(e) => e.stopPropagation()}
      >
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

function renderClutterFreeRemarks(sub: any) {
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
        className="w-96 p-0 overflow-hidden shadow-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl z-50"
        onClick={(e) => e.stopPropagation()}
      >
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

        <div className="p-4 max-h-[320px] overflow-y-auto space-y-3">
          <div className="relative pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-slate-800 space-y-4">
            {allRemarks.map((item, i) => (
              <div key={i} className="relative group/timeline">
                <div className={cn(
                  "absolute -left-5 top-0.5 h-2.5 w-2.5 rounded-full ring-4",
                  item.dotColor
                )} />
                <div className="flex flex-col gap-1.5">
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
                  <p className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal bg-neutral-50 dark:bg-slate-800/40 p-2 rounded-md border border-neutral-100 dark:border-slate-800/60">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = String(params?.id || "");

  // States
  const [job, setJob] = useState<Job | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [aiMatches, setAiMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "pipeline" | "matches">("details");
  const [pipelineView, setPipelineView] = useState<"list" | "kanban">("list");

  // Sync tab from URL query param if present
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam === "pipeline" || tabParam === "matches" || tabParam === "details") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // User details & permission controls
  const currentUser = useMemo(() => {
    if (typeof window !== "undefined") {
      return atsApi.auth.getCurrentUser();
    }
    return null;
  }, []);

  const roles = useMemo(() => currentUser?.roles || [], [currentUser]);
  const [availableRoles, setAvailableRoles] = useState<CustomRoleDefinition[]>([]);

  useEffect(() => {
    atsApi.auth.listRoles().then((data) => {
      setAvailableRoles(data || []);
    }).catch(() => {});
  }, []);

  const activeRoleName = useMemo(() => {
    if (!currentUser) return "RECRUITER";
    const { active } = getDashboardRoleSelection(currentUser, availableRoles);
    return active.id;
  }, [currentUser, availableRoles]);

  const activeSystemRole = useMemo(() => {
    return resolveActiveSystemRole(activeRoleName, availableRoles, currentUser);
  }, [activeRoleName, availableRoles, currentUser]);

  const effectivePerms = useMemo(() => {
    return getActiveRolePermissions(activeRoleName, availableRoles, currentUser);
  }, [activeRoleName, availableRoles, currentUser]);

  const isAdmin = activeSystemRole === "TENANT_ADMIN" || activeSystemRole === "SUPER_ADMIN";
  const isDeliveryHead = activeSystemRole === "DELIVERY_HEAD";
  const isAM = activeSystemRole === "ACCOUNT_MANAGER";
  const isPodLead = activeSystemRole === "POD_LEAD";
  const canSubmitCandidate = useMemo(() => isAdmin || effectivePerms.includes("submission:create"), [isAdmin, effectivePerms]);

  const canAuditRounds = useMemo(() => isAdmin || isDeliveryHead || effectivePerms.includes("submission:audit_rounds"), [isAdmin, isDeliveryHead, effectivePerms]);
  const canAuditL1 = useMemo(() => canAuditRounds || isPodLead || effectivePerms.includes("submission:audit_l1"), [canAuditRounds, isPodLead, effectivePerms]);
  const canAuditL2 = useMemo(() => canAuditRounds || effectivePerms.includes("submission:audit_l2"), [canAuditRounds, effectivePerms]);
  const canAuditL3 = useMemo(() => canAuditRounds || effectivePerms.includes("submission:audit_l3"), [canAuditRounds, effectivePerms]);
  const canInternalScreen = useMemo(() => isAdmin || isDeliveryHead || isPodLead || effectivePerms.includes("submission:internal_screening"), [isAdmin, isDeliveryHead, isPodLead, effectivePerms]);
  const canFinalStatus = useMemo(() => isAdmin || isDeliveryHead || isAM || effectivePerms.includes("submission:final_status"), [isAdmin, isDeliveryHead, isAM, effectivePerms]);
  const canApproveClient = useMemo(() => canInternalScreen || canFinalStatus, [canInternalScreen, canFinalStatus]);
  const canEditRate = useMemo(() => isAdmin || isDeliveryHead || effectivePerms.includes("submission:edit_rate"), [isAdmin, isDeliveryHead, effectivePerms]);

  const isRecruiterOnly = useMemo(() => {
    return activeSystemRole === "RECRUITER" && !canAuditL1 && !canAuditL2 && !canAuditL3 && !canInternalScreen && !canFinalStatus && !canAuditRounds;
  }, [activeSystemRole, canAuditL1, canAuditL2, canAuditL3, canInternalScreen, canFinalStatus, canAuditRounds]);

  const hasEditPermission = useMemo(() => {
    if (!currentUser) return false;
    return effectivePerms.includes("job:edit") || isAdmin || isAM;
  }, [currentUser, effectivePerms, isAdmin, isAM]);

  // Submission Review Dialog states
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [l1Status, setL1Status] = useState("");
  const [l1Remarks, setL1Remarks] = useState("");
  const [l2Status, setL2Status] = useState("");
  const [l2Remarks, setL2Remarks] = useState("");
  const [l3Status, setL3Status] = useState("");
  const [l3Remarks, setL3Remarks] = useState("");
  const [finalStatus, setFinalStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [recruiterComment, setRecruiterComment] = useState("");
  const [submittedRate, setSubmittedRate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [customRemarks, setCustomRemarks] = useState<any[]>([]);

  const renderCategorizedRemarkOptions = (stage: string) => {
    const stageKey = stage.toLowerCase();
    const stageItems = customRemarks.filter(
      (r) => r.stage?.toLowerCase() === stageKey || (stageKey === "review" && r.stage?.toLowerCase() === "internal_review")
    );
    const acceptItems = stageItems.filter((r) => r.remarkType === "ACCEPT");
    const rejectItems = stageItems.filter((r) => r.remarkType === "REJECT");
    const generalItems = stageItems.filter((r) => r.remarkType === "GENERAL" || !r.remarkType);

    return (
      <>
        {acceptItems.length > 0 && (
          <optgroup label="✓ Accept / Cleared">
            {acceptItems.map((r) => (
              <option key={r.id} value={r.remarkText}>{r.remarkText}</option>
            ))}
          </optgroup>
        )}
        {rejectItems.length > 0 && (
          <optgroup label="✕ Reject / Issue">
            {rejectItems.map((r) => (
              <option key={r.id} value={r.remarkText}>{r.remarkText}</option>
            ))}
          </optgroup>
        )}
        {generalItems.length > 0 && (
          <optgroup label="ℹ General Feedback">
            {generalItems.map((r) => (
              <option key={r.id} value={r.remarkText}>{r.remarkText}</option>
            ))}
          </optgroup>
        )}
      </>
    );
  };

  const resolvedTemplates = useMemo(() => ({
    l1: Array.from(new Set(customRemarks.filter((r) => r.stage?.toLowerCase() === "l1").map((r) => r.remarkText))),
    l2: Array.from(new Set(customRemarks.filter((r) => r.stage?.toLowerCase() === "l2").map((r) => r.remarkText))),
    l3: Array.from(new Set(customRemarks.filter((r) => r.stage?.toLowerCase() === "l3").map((r) => r.remarkText))),
    final: Array.from(new Set(customRemarks.filter((r) => r.stage?.toLowerCase() === "final").map((r) => r.remarkText))),
  }), [customRemarks]);

  // Job Approval / Rejection states
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const canApproveJob = useMemo(() => {
    if (!currentUser) return false;
    const permissions = currentUser.permissions || [];
    const normalizedRoles = (roles || []).map((r: string) => r.toUpperCase().replace(/[\s-_]+/g, ""));
    const isSuperOrAdmin = Boolean(
      normalizedRoles.includes("SUPERADMIN") ||
      normalizedRoles.includes("TENANT_ADMIN") ||
      normalizedRoles.includes("SUPER_ADMIN")
    );
    const hasJobApprovePerm = permissions.includes("job:approve") || (permissions.length === 0 && isSuperOrAdmin);
    const isAssigned = Boolean(
      job?.assignedApproverId &&
      (currentUser.dbId === job.assignedApproverId || currentUser.keycloakId === job.assignedApproverId || currentUser.id === job.assignedApproverId)
    );
    const isJobCreator = Boolean(
      (job?.createdBy && currentUser?.fullName && job.createdBy.toLowerCase() === currentUser.fullName.toLowerCase()) ||
      (job?.createdBy && currentUser?.email && job.createdBy.toLowerCase() === currentUser.email.toLowerCase()) ||
      (job?.createdBy && currentUser?.id && job.createdBy === currentUser.id)
    );

    return (
      isAssigned ||
      (hasJobApprovePerm && (!isJobCreator || isSuperOrAdmin))
    );
  }, [currentUser, roles, job]);

  // AI Matches Submission modal states
  const [matchSubmitOpen, setMatchSubmitOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [matchRate, setMatchRate] = useState("");
  const [matchComment, setMatchComment] = useState("");

  // Interview Schedule Modal state
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [selectedSubForInterview, setSelectedSubForInterview] = useState<any>(null);

  // Direct Upload & Submit Candidate modal state
  const [uploadSubmitOpen, setUploadSubmitOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSource, setUploadSource] = useState("Dice Sourcing");
  const [uploadRate, setUploadRate] = useState("");
  const [uploadComment, setUploadComment] = useState("");
  const [uploadingCv, setUploadingCv] = useState(false);

  const loadMatches = useCallback(async () => {
    if (!id) return;
    setMatchesLoading(true);
    try {
      const matchesData = await atsApi.jobs.matches(id, { limit: 15 });
      if (matchesData && matchesData.matches) {
        setAiMatches(matchesData.matches);
      }
    } catch (err) {
      console.error("Failed to load AI matches:", err);
    } finally {
      setMatchesLoading(false);
    }
  }, [id]);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const jobData = await atsApi.jobs.get(id);
      const [subsData, remarksData] = await Promise.all([
        atsApi.submissions.list({ jobId: id }),
        atsApi.submissions.getCustomRemarks((jobData as any)?.branchId || undefined).catch(() => []),
      ]);

      setJob(mapApiJobToJob(jobData));
      setSubmissions(Array.isArray(subsData) ? subsData : subsData?.data || []);
      setCustomRemarks(remarksData || []);
      
      // Fetch matches asynchronously so it doesn't block UI load
      loadMatches();
    } catch (err: any) {
      console.error("Failed to load job order details:", err);
      setError(err.message || "Failed to load job order details.");
    } finally {
      setLoading(false);
    }
  }, [id, loadMatches]);

  useEffect(() => {
    loadData();
  }, [id, loadData]);

  // Clean rate formatting
  const parseRateValue = (rateStr: string): number => {
    if (!rateStr || rateStr === "N/A") return 0;
    const match = rateStr.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  };

  // Calculate gross margin/markup dynamically (Admins & AMs only)
  const calculateMargin = () => {
    if (!job) return null;
    const bill = parseRateValue(job.clientBillRate);
    const pay = parseRateValue(job.payRate);
    if (bill === 0 || pay === 0 || bill <= pay) return null;
    const diff = bill - pay;
    const pct = ((diff / bill) * 100).toFixed(1);
    const isHourly = job.clientBillRate.includes("/hr") || job.payRate.includes("/hr");
    return {
      value: isHourly ? `$${diff.toFixed(2)}/hr` : `${diff.toFixed(1)} LPA`,
      percentage: `${pct}%`,
    };
  };

  const marginInfo = useMemo(calculateMargin, [job]);

  // Form handlers
  const openReviewPanel = (sub: any) => {
    setSelectedSub(sub);
    setL1Status(sub.l1Status || "");
    setL1Remarks(sub.l1Remarks || "");
    setL2Status(sub.l2Status || "");
    setL2Remarks(sub.l2Remarks || "");
    setL3Status(sub.l3Status || "");
    setL3Remarks(sub.l3Remarks || "");
    setFinalStatus(sub.finalStatus || "PENDING_APPROVAL");
    setRemarks(sub.remarks || "");
    setRecruiterComment(sub.recruiterComment || "");
    setSubmittedRate(sub.submittedRate || "");
    setReviewOpen(true);
  };

  const handleUpdateSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    setSubmitting(true);
    try {
      const payload: any = {};
      if (canAuditL1) {
        payload.l1Status = l1Status || null;
        payload.l1Remarks = l1Remarks.trim() || null;
      }
      if (canAuditL2) {
        payload.l2Status = l2Status || null;
        payload.l2Remarks = l2Remarks.trim() || null;
      }
      if (canAuditL3) {
        payload.l3Status = l3Status || null;
        payload.l3Remarks = l3Remarks.trim() || null;
      }
      if (canApproveClient) {
        payload.finalStatus = finalStatus;
        payload.remarks = remarks.trim() || null;
      }
      if (canEditRate) {
        payload.submittedRate = submittedRate.trim() || null;
      }
      payload.recruiterComment = recruiterComment.trim() || null;

      await atsApi.submissions.update(selectedSub.id, payload);
      toast.success("Submission updated successfully!");
      setReviewOpen(false);
      setSelectedSub(null);
      loadData();
    } catch (err: any) {
      toast.error("Failed to update submission: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveSubmission = async (subId: number) => {
    try {
      await atsApi.submissions.update(subId, { finalStatus: "SUBMITTED" });
      toast.success("Submission approved and submitted to client!");
      loadData();
    } catch (err: any) {
      toast.error("Failed to approve submission: " + err.message);
    }
  };

  const handleApproveJob = async () => {
    if (!job) return;
    setActionLoading(true);
    try {
      await atsApi.jobs.approve(job.id);
      toast.success("Job requirement approved & activated for recruiters!");
      setApproveModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error("Failed to approve job: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectJob = async () => {
    if (!job) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejecting this job requisition.");
      return;
    }
    setActionLoading(true);
    try {
      await atsApi.jobs.reject(job.id, rejectReason.trim());
      toast.success("Job requisition rejected.");
      setRejectModalOpen(false);
      setRejectReason("");
      loadData();
    } catch (err: any) {
      toast.error("Failed to reject job: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmSubmitMatch = async () => {
    if (!selectedMatch || !job) return;
    setSubmitting(true);
    try {
      await atsApi.submissions.create({
        candidateId: selectedMatch.candidateId,
        jobId: job.id,
        recruiterId: currentUser?.dbId || currentUser?.keycloakId || "system",
        finalStatus: "PENDING_APPROVAL",
        submittedRate: matchRate.trim() || null,
        recruiterComment: matchComment.trim() || null,
      });

      toast.success(`Submitted ${selectedMatch.fullName || "candidate"} to this pipeline!`);
      setMatchSubmitOpen(false);
      setSelectedMatch(null);
      loadData();
    } catch (err: any) {
      toast.error(`Failed to submit: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadAndSubmitCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !job) {
      toast.error("Please select a CV file to upload.");
      return;
    }

    setUploadingCv(true);
    try {
      // 1. Upload & Parse CV -> creates Candidate Profile & saves binary CV file
      const res = await atsApi.candidates.uploadCv(uploadFile, uploadSource);
      const candidate = res.candidate;

      // 2. Submit candidate to this active Requisition Pipeline
      await atsApi.submissions.create({
        candidateId: candidate.id,
        jobId: job.id,
        recruiterId: currentUser?.dbId || currentUser?.keycloakId || "system",
        finalStatus: "PENDING_APPROVAL",
        submittedRate: uploadRate.trim() || null,
        recruiterComment: uploadComment.trim() || null,
      });

      toast.success(`Candidate ${candidate.fullName || ""} parsed & submitted to pipeline!`);
      setUploadSubmitOpen(false);
      setUploadFile(null);
      setUploadRate("");
      setUploadComment("");
      loadData();
    } catch (err: any) {
      toast.error("Failed to upload & submit: " + err.message);
    } finally {
      setUploadingCv(false);
    }
  };

  const handleDownloadResume = async (candId: number, name: string) => {
    try {
      const blob = await atsApi.candidates.fetchResumeBlob(candId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${name.replace(/\s+/g, "_")}_Resume.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Resume downloaded successfully!");
    } catch (err: any) {
      toast.error("Failed to fetch resume blob: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="text-xs text-neutral-500 font-semibold">Loading job details...</span>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <p className="text-sm font-semibold text-rose-600">{error || "Requisition not found."}</p>
        <Button variant="outline" onClick={() => router.push("/job-posting")} className="text-xs">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Requisitions
        </Button>
      </div>
    );
  }

  // Submission counters
  const totalSubCount = submissions.length;
  const pendingReviewCount = submissions.filter((s) => s.finalStatus === "PENDING_APPROVAL").length;
  const clientSubmittedCount = submissions.filter((s) => s.finalStatus === "SUBMITTED").length;
  const interviewedCount = submissions.filter((s) => s.l1Status === "PASSED" || s.l1Status === "CLEARED" || s.l2Status === "PASSED" || s.l2Status === "CLEARED" || s.l3Status === "PASSED" || s.l3Status === "CLEARED" || (s.finalStatus && s.finalStatus.includes("PASSED"))).length;
  const offeredCount = submissions.filter((s) => s.finalStatus === "OFFER").length;
  const placedCount = submissions.filter((s) => s.finalStatus === "JOIN" || s.finalStatus === "PLACED").length;
  const rejectedCount = submissions.filter((s) => s.finalStatus === "REJECTED").length;

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-neutral-50 dark:bg-slate-955 font-sans p-4 space-y-4">
      
      {/* TOP HEADER CONTROLS */}
      <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-sm shrink-0 mb-2">
        <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-4 items-start">
            <button
              onClick={() => router.push("/job-posting")}
              className="mt-1 flex items-center justify-center w-8 h-8 rounded-full border border-neutral-200 dark:border-slate-700 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <code className="text-[10px] font-mono bg-neutral-100 dark:bg-slate-800 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-300 font-bold border border-neutral-200 dark:border-slate-700">
                  {job.jobCode}
                </code>
                <Badge
                  className={`text-[9px] uppercase tracking-wide font-extrabold shadow-none border-none py-0.5 px-2 ${
                    job.jobStatus === "Active"
                      ? "bg-emerald-100 text-emerald-800"
                      : job.jobStatus === "Closed" || job.jobStatus === "Close"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {job.jobStatus}
                </Badge>
                <Badge className="bg-rose-50 text-rose-600 border-none font-bold text-[9px] py-0.5 px-2 flex items-center gap-1">
                  🔥 {job.priority || "Warm"}
                </Badge>
              </div>
              <h1 className="text-xl font-black text-neutral-900 dark:text-white mb-2">
                {job.jobTitle}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-neutral-500 font-medium">
                <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-neutral-400" /> {job.client} {job.clientJobId !== "N/A" ? `→ ${job.clientJobId}` : ""}</span>
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-neutral-400" /> {job.location || "Remote"}</span>
                <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-neutral-400" /> {job.jobType || "Contract"}</span>
                <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-neutral-400" /> {job.visaType || "ALL_VISA"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={loadData} className="border-neutral-250 text-xs font-semibold h-9">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            {(job.jobStatus === "Pending Approval" || job.approvalStatus === "PENDING_APPROVAL") && canApproveJob && (
              <>
                <Button
                  size="sm"
                  onClick={() => setRejectModalOpen(true)}
                  variant="outline"
                  className="border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 font-bold text-xs h-9"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => setApproveModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-sm"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve Job
                </Button>
              </>
            )}
            {canSubmitCandidate && (
              <Button
                size="sm"
                onClick={() => setUploadSubmitOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm rounded-lg h-9 text-xs cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" /> Submit New Candidate
              </Button>
            )}
            {hasEditPermission && (
              <Link href={`/job-posting/${job.id}/edit`}>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm rounded-lg h-9 cursor-pointer">
                  <Pencil className="h-3.5 w-3.5" /> Edit Job
                </Button>
              </Link>
            )}
            {effectivePerms.includes("job:delegate") && (
              <Button 
                size="sm" 
                onClick={() => setDelegateModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1.5 shadow-sm rounded-lg h-9 cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" /> Delegate Job
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* APPROVAL WORKFLOW NOTIFICATION BANNER */}
      {(job.jobStatus === "Pending Approval" || job.approvalStatus === "PENDING_APPROVAL") && (
        <div className="p-4 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shrink-0 mt-0.5">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-amber-950 dark:text-amber-100">
                  Job Requirement Pending Review &amp; Approval
                </h3>
                <Badge className="bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 text-[9px] font-bold">
                  Pending Approval
                </Badge>
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                Created by <strong>{job.createdBy || "Account Manager"}</strong>. Assigned Reviewer: <strong>{job.assignedApproverName || (job.assignedApproverRole === "POD_LEAD" ? "Recruitment Pod Lead" : job.assignedApproverRole === "DELIVERY_HEAD" ? "Delivery Head" : "Assigned Reviewer")}</strong>. This requirement is <strong>hidden from recruiters</strong> until approved.
              </p>
            </div>
          </div>

          {canApproveJob && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => setRejectModalOpen(true)}
                variant="outline"
                className="border-rose-300 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold h-8.5"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
              <Button
                size="sm"
                onClick={() => setApproveModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8.5 shadow-sm"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve &amp; Activate Job
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TABS NAVIGATION BAR (Ceipal style) */}
      <div className="flex border-b border-neutral-200 dark:border-slate-800 shrink-0 select-none">
        <button
          onClick={() => setActiveTab("details")}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 border-transparent -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            activeTab === "details"
              ? "text-indigo-650 border-indigo-600 font-extrabold bg-indigo-50/20"
              : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/50"
          }`}
        >
          <FileText className="h-4 w-4" /> Job Details
        </button>
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 border-transparent -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            activeTab === "pipeline"
              ? "text-indigo-650 border-indigo-600 font-extrabold bg-indigo-50/20"
              : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/50"
          }`}
        >
          <ClipboardList className="h-4 w-4" /> Pipeline ({submissions.length})
        </button>
        <button
          onClick={() => setActiveTab("matches")}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 border-transparent -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            activeTab === "matches"
              ? "text-indigo-650 border-indigo-600 font-extrabold bg-indigo-50/20"
              : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/50"
          }`}
        >
          <Sparkles className="h-4 w-4" /> AI Candidate Matches {matchesLoading ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : `(${aiMatches.length})`}
        </button>
      </div>

      {/* DASHBOARD WORKSPACE */}
      <div className="flex-1 overflow-auto min-h-0 pr-1">

        {/* TAB 1: JOB REQUISITION DETAILS */}
        {activeTab === "details" && (
          <div className="space-y-4">
            
            {/* TOP STATS CARDS (US IT Template) */}
            <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-sm p-5">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-slate-850 rounded-sm border border-neutral-100 dark:border-slate-800">
                  <span className="text-2xl font-black text-neutral-800 dark:text-white">{job.noOfPositions}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-450 mt-1">Positions</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-slate-850 rounded-sm border border-neutral-100 dark:border-slate-800">
                  <span className="text-2xl font-black text-neutral-800 dark:text-white">{submissions.length}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-450 mt-1">Submitted</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-slate-850 rounded-sm border border-neutral-100 dark:border-slate-800">
                  <span className="text-2xl font-black text-neutral-800 dark:text-white">{job.submissionRequired}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-450 mt-1">Required</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-slate-850 rounded-sm border border-neutral-100 dark:border-slate-800">
                  <span className="text-2xl font-black text-neutral-800 dark:text-white">{job.agingDays}d</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-450 mt-1">CFR Age</span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  <span>Submission Progress</span>
                  <span>{Math.min(100, Math.round((submissions.length / (job.submissionRequired || 1)) * 100))}%</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round((submissions.length / (job.submissionRequired || 1)) * 100))}%` }} 
                  />
                </div>
              </div>
            </Card>

            {/* SUBMITTED CANDIDATES & RESUMES STRIP (Ceipal / Enterprise ATS style) */}
            <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850 gap-3">
                <div className="flex items-center gap-3">
          {/* DEBUG INFO */}
          <div className="text-[10px] text-red-500 font-bold">
            isAdmin: {String(isAdmin)} | canSubmit: {String(canSubmitCandidate)} | roleName: {activeRoleName} | perms: {effectivePerms.includes("submission:create") ? "yes" : "no"} | total perms: {effectivePerms.length} | currentUser.perms: {currentUser?.permissions?.length}
          </div>
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                        Candidate Submissions for this Requirement
                      </h2>
                      <Badge className={cn(
                        "text-[10px] font-bold border",
                        submissions.length > 0
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800"
                          : "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-slate-800 dark:text-neutral-400"
                      )}>
                        {submissions.length} / {job.submissionRequired || 5} Submitted
                      </Badge>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Review submitted candidate profiles, monitor client approval status, and download original resumes.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {canSubmitCandidate && (
                    <Button
                      size="sm"
                      onClick={() => setUploadSubmitOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1 text-xs h-8 shadow-xs rounded-lg cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" /> Submit New Candidate
                    </Button>
                  )}
                  {submissions.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTab("pipeline")}
                      className="text-xs font-semibold h-8 rounded-lg"
                    >
                      Open Pipeline Board →
                    </Button>
                  )}
                </div>
              </div>

              {submissions.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-400 flex items-center justify-center mx-auto mb-3">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">No Candidates Submitted Yet</h3>
                  <p className="text-[11px] text-neutral-400 max-w-md mx-auto mt-1 mb-4">
                    This requirement is actively accepting submissions (0 of {job.submissionRequired || 5} required candidates). Upload a resume or select candidates from AI Matches to start client screening.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {canSubmitCandidate && (
                      <Button
                        size="sm"
                        onClick={() => setUploadSubmitOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 text-xs h-8.5 rounded-lg shadow-sm cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" /> Upload &amp; Submit Candidate CV
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTab("matches")}
                      className="text-xs font-semibold h-8.5 rounded-lg border-neutral-300"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 mr-1" /> View AI Matches ({aiMatches.length})
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/80 dark:bg-slate-850/80 border-b border-neutral-200 dark:border-slate-800 text-[10.5px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 select-none">
                        <th className="py-2.5 px-4">Candidate Name &amp; Contact</th>
                        <th className="py-2.5 px-3">Recruiter</th>
                        <th className="py-2.5 px-3">Submitted Rate</th>
                        <th className="py-2.5 px-3">Internal Review</th>
                        <th className="py-2.5 px-3">Client Status</th>
                        <th className="py-2.5 px-3">Remarks / Date</th>
                        <th className="py-2.5 px-4 text-right">Actions &amp; CV Download</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-slate-800 text-xs">
                      {submissions.map((sub) => (
                        <tr
                          key={sub.id}
                          className="hover:bg-neutral-50/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Candidate Name & Contact */}
                          <td className="py-3 px-4 align-middle">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-650 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-100 dark:border-indigo-900/60">
                                {sub.candidateName ? sub.candidateName.charAt(0).toUpperCase() : "C"}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/applicants/CAN-${String(sub.candidateId).padStart(6, '0')}`}
                                  className="font-bold text-neutral-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline flex items-center gap-1"
                                >
                                  <span>{sub.candidateName}</span>
                                  <ExternalLink className="h-3 w-3 text-neutral-400 inline shrink-0" />
                                </Link>
                                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2 mt-0.5 truncate">
                                  <span>{sub.candidateEmail || "—"}</span>
                                  {sub.candidatePhone && <span>• {sub.candidatePhone}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Recruiter */}
                          <td className="py-3 px-3 align-middle font-medium text-neutral-800 dark:text-neutral-200">
                            {sub.recruiterName || "System"}
                          </td>

                          {/* Pay Rate */}
                          <td className="py-3 px-3 align-middle font-semibold text-neutral-850 dark:text-neutral-200">
                            {sub.submittedRate || job.payRate || "—"}
                          </td>

                          {/* Internal Review */}
                          <td className="py-3 px-3 align-middle">
                            {renderInternalReviewStatus(sub)}
                          </td>

                          {/* Client / Final Status */}
                          <td className="py-3 px-3 align-middle">
                            {sub.finalStatus === "PENDING_APPROVAL" ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] font-semibold">
                                Pending Approval
                              </Badge>
                            ) : sub.finalStatus === "SUBMITTED" ? (
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 text-[10px] font-bold">
                                Submitted to Client
                              </Badge>
                            ) : sub.finalStatus === "OFFER" ? (
                              <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 text-[10px] font-bold">
                                Offer Released
                              </Badge>
                            ) : sub.finalStatus === "JOIN" || sub.finalStatus === "PLACED" ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px] font-bold">
                                Joined / Placed
                              </Badge>
                            ) : sub.finalStatus === "REJECTED" ? (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 text-[10px] font-bold">
                                Rejected
                              </Badge>
                            ) : (
                              <Badge className="bg-neutral-100 text-neutral-700 border-neutral-200 text-[10px] font-semibold">
                                {sub.finalStatus}
                              </Badge>
                            )}
                          </td>

                          {/* Remarks / Date */}
                          <td className="py-3 px-3 align-middle text-xs max-w-[200px] truncate">
                            {renderClutterFreeRemarks(sub)}
                          </td>

                          {/* Actions & CV Download */}
                          <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadResume(sub.candidateId, sub.candidateName || "Candidate")}
                                className="h-7 text-[11px] font-bold border-indigo-200 text-indigo-700 dark:text-indigo-300 bg-indigo-50/40 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/30 flex items-center gap-1 rounded-md cursor-pointer"
                                title="Download candidate CV PDF"
                              >
                                <FileDown className="h-3 w-3" /> Download CV
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openReviewPanel(sub)}
                                className="h-7 text-[11px] font-semibold border-neutral-300 dark:border-slate-700 rounded-md cursor-pointer flex items-center gap-1"
                              >
                                <Pencil className="h-3 w-3" /> Review
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              
              {/* Left Description area */}
              <div className="lg:col-span-8 space-y-4">
                <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <h2 className="text-sm font-bold text-neutral-800 dark:text-white flex items-center gap-2 border-b border-neutral-100 dark:border-slate-800 pb-2">
                      <FileText className="h-4 w-4 text-indigo-500" /> Job Description
                    </h2>
                    <JobDescriptionView 
                      content={job.jobDescription} 
                      jobTitle={job.jobTitle} 
                    />
                  </CardContent>
                </Card>

                {job.skillsRequired && job.skillsRequired.length > 0 && (
                  <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-sm">
                    <CardContent className="p-5">
                      <h2 className="text-sm font-bold text-neutral-800 dark:text-white mb-3">Required Technical Skills</h2>
                      <div className="flex flex-wrap gap-1.5">
                        {job.skillsRequired.map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 text-xs font-semibold rounded-md border bg-indigo-50/20 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-850"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Sidebar */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* Job Info */}
                <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-xs font-bold text-neutral-800 dark:text-white">Job Info</h3>
                    
                    <div className="flex items-center gap-4 bg-neutral-50 dark:bg-slate-850 p-3 rounded-lg border border-neutral-100 dark:border-slate-800">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white dark:bg-slate-800 shadow-sm border border-neutral-100 dark:border-slate-700 shrink-0">
                        <DollarSign className="h-4 w-4 text-neutral-500" />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-neutral-450 block tracking-wider mb-0.5">Pay Rate</span>
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block">{job.payRate}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-neutral-50 dark:bg-slate-850 p-3 rounded-lg border border-neutral-100 dark:border-slate-800">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white dark:bg-slate-800 shadow-sm border border-neutral-100 dark:border-slate-700 shrink-0">
                        <Zap className="h-4 w-4 text-neutral-500" />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-neutral-450 block tracking-wider mb-0.5">Requirement Type</span>
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block">{job.jobType || job.businessUnit}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Client */}
                <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-xs font-bold text-neutral-800 dark:text-white">Client</h3>
                    
                    <div className="flex items-center gap-4 bg-neutral-50 dark:bg-slate-850 p-3 rounded-lg border border-neutral-100 dark:border-slate-800">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white dark:bg-slate-800 shadow-sm border border-neutral-100 dark:border-slate-700 shrink-0">
                        <Building2 className="h-4 w-4 text-neutral-500" />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-neutral-450 block tracking-wider mb-0.5">Client</span>
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block">{job.client}</span>
                      </div>
                    </div>
                    
                    {job.clientJobId && job.clientJobId !== "N/A" && (
                      <div className="flex items-center gap-4 bg-neutral-50 dark:bg-slate-850 p-3 rounded-lg border border-neutral-100 dark:border-slate-800">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white dark:bg-slate-800 shadow-sm border border-neutral-100 dark:border-slate-700 shrink-0">
                          <Building2 className="h-4 w-4 text-neutral-500" />
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-neutral-450 block tracking-wider mb-0.5">End Client</span>
                          <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block">{job.clientJobId}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Account Manager */}
                <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-xs font-bold text-neutral-800 dark:text-white">Account Manager</h3>
                    
                    <div className="flex items-center gap-4 bg-neutral-50 dark:bg-slate-850 p-3 rounded-lg border border-neutral-100 dark:border-slate-800">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white dark:bg-slate-800 shadow-sm border border-neutral-100 dark:border-slate-700 shrink-0">
                        <UserPlus className="h-4 w-4 text-neutral-500" />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-neutral-450 block tracking-wider mb-0.5">Account Manager</span>
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block">{job.recruitmentManager}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUBMISSIONS PIPELINE */}
        {activeTab === "pipeline" && (
          <div className="space-y-4">
            
            {/* Pipeline Statistics Header */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3 rounded flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wider">Total Submitted</span>
                <span className="text-lg font-black text-neutral-800 dark:text-neutral-100 mt-1">{totalSubCount}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3 rounded flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold text-amber-500 block tracking-wider">Internal Review</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">{pendingReviewCount}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3 rounded flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold text-blue-500 block tracking-wider">Client Sent</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">{clientSubmittedCount}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3 rounded flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold text-cyan-500 block tracking-wider">Interviewing</span>
                <span className="text-lg font-black text-cyan-600 dark:text-cyan-400 mt-1">{interviewedCount}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3 rounded flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold text-emerald-600 block tracking-wider">Selected / Placed</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-450 mt-1">{placedCount + offeredCount}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3 rounded flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold text-rose-500 block tracking-wider">Rejected</span>
                <span className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">{rejectedCount}</span>
              </div>
            </div>

            {/* List vs Board Mode Switcher */}
            <div className="flex justify-end items-center gap-2">
              <span className="text-xs text-neutral-500 font-bold mr-1">View Mode</span>
              <div className="flex items-center border border-neutral-300 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-0.5">
                <button
                  onClick={() => setPipelineView("list")}
                  className={`px-3 py-1 text-xs font-bold rounded-sm transition-all cursor-pointer ${
                    pipelineView === "list"
                      ? "bg-neutral-100 dark:bg-slate-800 text-indigo-650"
                      : "text-neutral-450 hover:text-neutral-805"
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setPipelineView("kanban")}
                  className={`px-3 py-1 text-xs font-bold rounded-sm transition-all cursor-pointer ${
                    pipelineView === "kanban"
                      ? "bg-neutral-100 dark:bg-slate-800 text-indigo-650"
                      : "text-neutral-450 hover:text-neutral-805"
                  }`}
                >
                  Kanban Board
                </button>
              </div>
            </div>

            {/* PIPELINE LIST VIEW */}
            {pipelineView === "list" && (
              <div className="border border-neutral-200 dark:border-slate-800 rounded-sm bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                <div className="overflow-auto max-h-[calc(100vh-320px)] relative">
                  <table className="w-full border-collapse text-left table-auto border-neutral-200 dark:border-slate-800 min-w-[1000px]">
                    <thead className="sticky top-0 z-20 bg-blue-50 dark:bg-slate-800 border-b border-neutral-250 dark:border-slate-700 shadow-xs select-none">
                      <tr>
                        <th className="sticky top-0 z-20 p-2 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 bg-blue-50 dark:bg-slate-800 border-r border-b border-neutral-250 dark:border-slate-700 uppercase tracking-wider text-[10px] whitespace-nowrap">
                          Candidate
                        </th>
                        <th className="sticky top-0 z-20 p-2 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 bg-blue-50 dark:bg-slate-800 border-r border-b border-neutral-250 dark:border-slate-700 uppercase tracking-wider text-[10px] whitespace-nowrap">
                          Recruiter
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
                          Current Status
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
                      {submissions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="h-32 text-center text-neutral-500 font-medium bg-white dark:bg-slate-900">
                            No candidate submissions yet. Click "+ Submit New Candidate" or add matches to begin screening.
                          </td>
                        </tr>
                      ) : (
                        submissions.map((sub, idx) => (
                          <tr
                            key={sub.id}
                            onClick={() => openReviewPanel(sub)}
                            className={cn(
                              "group transition-colors cursor-pointer border-b border-neutral-200 dark:border-slate-800/80 h-[52px]",
                              idx % 2 === 0
                                ? "bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-slate-800/60"
                                : "bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-slate-800/60"
                            )}
                          >
                            {/* 1. Candidate Details */}
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

                            {/* 2. Recruiter */}
                            <td className="h-[52px] py-1 px-2.5 border-r border-neutral-200 dark:border-slate-800 whitespace-nowrap align-middle text-xs font-medium text-neutral-800 dark:text-neutral-200">
                              {sub.recruiterName || "System / API"}
                            </td>

                            {/* 3. Pay Rate */}
                            <td className="h-[52px] py-1 px-2.5 border-r border-neutral-200 dark:border-slate-800 whitespace-nowrap align-middle font-normal text-xs text-neutral-800 dark:text-neutral-200">
                              {sub.submittedRate || "—"}
                            </td>

                            {/* 4. Internal Review */}
                            <td className="h-[52px] py-1 px-2.5 border-r border-neutral-200 dark:border-slate-800 whitespace-nowrap align-middle">
                              <div className="flex items-center gap-1.5">
                                {renderInternalReviewStatus(sub)}
                                {sub.finalStatus === "PENDING_APPROVAL" && canInternalScreen && (
                                  <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          await atsApi.submissions.update(sub.id, { finalStatus: "SUBMITTED" });
                                          toast.success("Submission approved and submitted to client!");
                                          loadData();
                                        } catch (err: any) {
                                          toast.error("Failed: " + err.message);
                                        }
                                      }}
                                      className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] rounded shadow-xs cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          await atsApi.submissions.update(sub.id, { finalStatus: "REJECTED" });
                                          toast.success("Submission rejected internally.");
                                          loadData();
                                        } catch (err: any) {
                                          toast.error("Failed: " + err.message);
                                        }
                                      }}
                                      className="px-1.5 py-0.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 dark:bg-slate-900 dark:border-rose-900 font-semibold text-[10px] rounded cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 5. Interview Progress */}
                            <td className="h-[52px] py-1 px-2.5 border-r border-neutral-200 dark:border-slate-800 whitespace-nowrap align-middle">
                              <div className="flex items-center gap-1">
                                {renderPipelineProgress(sub)}
                              </div>
                            </td>

                            {/* 6. Final Status */}
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

                            {/* 7. Remarks & Date */}
                            <td className="h-[52px] py-1 px-2.5 border-r border-neutral-200 dark:border-slate-800 min-w-[220px] max-w-[320px] whitespace-nowrap align-middle">
                              {renderClutterFreeRemarks(sub)}
                            </td>

                            {/* 8. Action */}
                            <td className="h-[52px] py-1 px-2.5 text-center whitespace-nowrap align-middle" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadResume(sub.candidateId, sub.candidateName || "Candidate")}
                                  className="h-7 text-[10.5px] font-bold px-2 flex items-center gap-1 border-indigo-200 text-indigo-700 dark:text-indigo-300 bg-indigo-50/40 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/30"
                                  title="Download candidate CV PDF"
                                >
                                  <FileDown className="h-3 w-3" /> CV
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-1 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded text-neutral-500 dark:text-neutral-400 transition-colors cursor-pointer">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-border/70 font-sans p-1">
                                    <DropdownMenuItem
                                      onClick={() => openReviewPanel(sub)}
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
                                      <FileDown className="h-3.5 w-3.5 text-indigo-500" />
                                      Download Resume PDF
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PIPELINE KANBAN BOARD VIEW */}
            {pipelineView === "kanban" && (
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3 pb-4 overflow-x-auto min-w-max select-none">
                {[
                  { id: "l1", title: "Internal Review", color: "border-t-amber-500 bg-amber-50/5", badge: "bg-amber-100 text-amber-800", subs: submissions.filter((s) => s.finalStatus === "PENDING_APPROVAL" && s.l1Status !== "REJECTED") },
                  { id: "submitted", title: "Client Submitted", color: "border-t-blue-500 bg-blue-50/5", badge: "bg-blue-100 text-blue-800", subs: submissions.filter((s) => (s.finalStatus === "SUBMITTED" || s.finalStatus === "POD_APPROVED") && s.l1Status !== "SCHEDULED" && s.l2Status !== "SCHEDULED" && s.l3Status !== "SCHEDULED" && s.l1Status !== "REJECTED" && s.l2Status !== "REJECTED" && s.l3Status !== "REJECTED") },
                  { id: "interviews", title: "Client Interviews", color: "border-t-cyan-500 bg-cyan-50/5", badge: "bg-cyan-100 text-cyan-800", subs: submissions.filter((s) => (s.l1Status === "SCHEDULED" || s.l1Status === "PASSED" || s.l1Status === "CLEARED" || s.l2Status === "SCHEDULED" || s.l2Status === "PASSED" || s.l2Status === "CLEARED" || s.l3Status === "SCHEDULED" || s.l3Status === "PASSED" || s.l3Status === "CLEARED" || (s.finalStatus && s.finalStatus.includes("PASSED"))) && s.finalStatus !== "OFFER" && s.finalStatus !== "JOIN" && s.finalStatus !== "REJECTED") },
                  { id: "offers", title: "Offer Stage", color: "border-t-teal-500 bg-teal-50/5", badge: "bg-teal-100 text-teal-800", subs: submissions.filter((s) => s.finalStatus === "OFFER") },
                  { id: "joined", title: "Placed / Joined", color: "border-t-emerald-500 bg-emerald-50/5", badge: "bg-emerald-100 text-emerald-800", subs: submissions.filter((s) => s.finalStatus === "JOIN" || s.finalStatus === "PLACED") },
                  { id: "rejected", title: "Rejections", color: "border-t-rose-500 bg-rose-50/5", badge: "bg-rose-100 text-rose-800", subs: submissions.filter((s) => s.finalStatus === "REJECTED" || s.l1Status === "REJECTED" || s.l2Status === "REJECTED" || s.l3Status === "REJECTED") },
                ].map((col) => (
                  <div
                    key={col.id}
                    className={`flex flex-col border border-neutral-200 dark:border-slate-800 border-t-4 rounded ${col.color} p-3 w-[210px] min-h-[400px]`}
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-neutral-200/50 dark:border-slate-800 mb-3 shrink-0">
                      <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200">{col.title}</span>
                      <Badge className={`text-[10px] font-bold ${col.badge} rounded-full py-0.2 px-1.5`}>
                        {col.subs.length}
                      </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                      {col.subs.map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() => openReviewPanel(sub)}
                          className="p-2.5 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded shadow-xs hover:shadow-sm cursor-pointer hover:border-neutral-350 transition-all text-xs"
                        >
                          <p className="font-bold text-neutral-850 dark:text-neutral-200 truncate">{sub.candidateName}</p>
                          <p className="text-[10px] text-neutral-450 truncate mt-0.5">by {sub.recruiterName || "N/A"}</p>
                          
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-neutral-100 dark:border-slate-850 text-[10px] font-semibold">
                            <span className="text-neutral-400">{sub.submittedRate || "—"}</span>
                            {renderPipelineProgress(sub)}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubForInterview(sub);
                              setInterviewModalOpen(true);
                            }}
                            className="w-full mt-2 h-6 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 p-0"
                          >
                            <CalendarDays className="h-3 w-3 mr-1" /> Schedule Interview
                          </Button>
                        </div>
                      ))}
                      {col.subs.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-[10px] text-neutral-400 font-medium text-center py-10 px-2 gap-1.5 border border-dashed border-neutral-200 dark:border-slate-800 rounded-lg my-2 bg-neutral-50/50 dark:bg-slate-850/20">
                          <span className="font-bold text-neutral-500">No candidates in {col.title}</span>
                          <span className="text-[9px] text-neutral-400">Click [+ Submit New Candidate] above to add candidates from Dice/LinkedIn</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 3: AI CANDIDATE MATCHES */}
        {activeTab === "matches" && (
          <div className="space-y-4">
            
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-4 rounded-sm">
              <h3 className="text-sm font-bold text-neutral-850 dark:text-neutral-100 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-violet-500" />
                AI Ranked Database Recommendations
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                The ranker runs skill overlap and experience parameters to match this job requisition with your overall candidate pool.
              </p>
            </div>

            <div className="space-y-3">
              {aiMatches.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-neutral-250 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-sm">
                  <p className="text-xs text-neutral-450 italic">No matches available. Run bulk CV parsing to populate candidate database pool.</p>
                </div>
              ) : (
                aiMatches.map((match, idx) => {
                  const styles = TIER_STYLES[match.matchTier] || TIER_STYLES.Low;
                  const alreadySubmitted = submissions.some((s) => s.candidateId === match.candidateId);
                  
                  return (
                    <div
                      key={match.candidateId}
                      className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm p-4 hover:border-neutral-300 dark:hover:border-slate-705 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono font-bold text-neutral-400 pt-1">
                          {(idx + 1).toString().padStart(2, "0")}
                        </span>
                        
                        {/* Score meter circle */}
                        <div className="h-11 w-11 rounded-full border-2 border-indigo-650 flex items-center justify-center font-black text-indigo-700 bg-indigo-50/10 text-xs shrink-0 select-none">
                          {match.matchScore}%
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-sm text-neutral-800 dark:text-neutral-250 truncate">
                              {match.fullName}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-wide border px-1.5 py-0.2 rounded-full ${styles.chip}`}>
                              {styles.label}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 font-medium truncate mt-0.5">
                            {match.currentTitle} • {match.location || "Location N/A"} • {match.experienceYears} Years Exp
                          </p>

                          {/* Matched skills list */}
                          {match.matchedSkills && match.matchedSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {match.matchedSkills.map((s: string) => (
                                <span key={s} className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 text-[10px] font-semibold px-1 rounded">
                                  ✓ {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadResume(match.candidateId, match.fullName || "Candidate")}
                          className="h-8 border-neutral-255 text-xs font-bold"
                        >
                          CV
                        </Button>
                        {alreadySubmitted ? (
                          <Button size="sm" disabled className="h-8 bg-neutral-100 text-neutral-400 text-xs font-bold border-none">
                            Submitted
                          </Button>
                        ) : canSubmitCandidate ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedMatch(match);
                              setMatchRate("");
                              setMatchComment("");
                              setMatchSubmitOpen(true);
                            }}
                            className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                          >
                            Submit Profile
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

      </div>

      {/* PIPELINE REVIEW EDIT DIALOG */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-3xl font-sans max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-5 py-3.5 border-b border-neutral-200 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-850 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                Candidate Pipeline Stage Review
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Update interview progression, audit remarks, and client status for <strong>{selectedSub?.candidateName}</strong> on <strong>{job.jobTitle}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateSubmission} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-xs">
              
              {/* Candidate details horizontal compact bar */}
              {selectedSub && (
                <div className="p-3 bg-neutral-50 dark:bg-slate-850 border border-neutral-200 dark:border-slate-800 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Candidate</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-100 block truncate">{selectedSub.candidateName}</span>
                    <span className="text-[10px] text-neutral-400 block truncate">{selectedSub.candidateEmail || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Designation</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200 block truncate">{selectedSub.candidateDesignation || "Software Engineer"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Experience</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200 block">{selectedSub.candidateExperience ? `${selectedSub.candidateExperience} Yrs` : "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Work Auth</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200 block truncate">{selectedSub.candidateWorkAuth || "US Citizen / Any"}</span>
                  </div>
                </div>
              )}

              {/* UNIFIED SINGLE-THEME INTERVIEW STAGES (3-Column Grid) */}
              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Interview Progression Stages
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* Stage 1: Round 1 (L1) */}
                  <div className="p-3 border border-neutral-200 dark:border-slate-800 rounded-lg bg-neutral-50/40 dark:bg-slate-850/40 space-y-2 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          Round 1 (L1)
                        </span>
                        {!canAuditL1 && (
                          <Badge variant="secondary" className="text-[9px] py-0">View Only</Badge>
                        )}
                      </div>
                      <select
                        value={l1Status}
                        disabled={!canAuditL1}
                        onChange={(e) => setL1Status(e.target.value)}
                        className="w-full border border-neutral-300 dark:border-slate-700 rounded h-7.5 bg-white dark:bg-slate-800 text-xs px-2 outline-hidden cursor-pointer disabled:opacity-60 text-neutral-800 dark:text-neutral-200"
                      >
                        <option value="">Pending</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="CLEARED">Cleared</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                      {canAuditL1 && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              setL1Remarks((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                              e.target.value = "";
                            }
                          }}
                          className="w-full border border-neutral-300 dark:border-slate-700 rounded h-7 text-[11px] bg-white dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 px-1.5 font-medium cursor-pointer"
                        >
                          <option value="" disabled>+ Quick Remark</option>
                          {renderCategorizedRemarkOptions("l1")}
                        </select>
                      )}
                    </div>
                    {canAuditL1 && (
                      <textarea
                        rows={2}
                        placeholder="L1 screening feedback..."
                        value={l1Remarks}
                        onChange={(e) => setL1Remarks(e.target.value)}
                        className="w-full border border-neutral-300 dark:border-slate-700 rounded p-2 text-xs bg-white dark:bg-slate-900 outline-hidden focus:border-primary resize-none text-neutral-800 dark:text-neutral-200"
                      />
                    )}
                  </div>

                  {/* Stage 2: Round 2 (L2) */}
                  <div className="p-3 border border-neutral-200 dark:border-slate-800 rounded-lg bg-neutral-50/40 dark:bg-slate-850/40 space-y-2 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          Round 2 (L2)
                        </span>
                        {!canAuditL2 && (
                          <Badge variant="secondary" className="text-[9px] py-0">View Only</Badge>
                        )}
                      </div>
                      <select
                        value={l2Status}
                        disabled={!canAuditL2}
                        onChange={(e) => setL2Status(e.target.value)}
                        className="w-full border border-neutral-300 dark:border-slate-700 rounded h-7.5 bg-white dark:bg-slate-800 text-xs px-2 outline-hidden cursor-pointer disabled:opacity-60 text-neutral-800 dark:text-neutral-200"
                      >
                        <option value="">Not Started</option>
                        <option value="PENDING">Pending</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="CLEARED">Cleared</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                      {canAuditL2 && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              setL2Remarks((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                              e.target.value = "";
                            }
                          }}
                          className="w-full border border-neutral-300 dark:border-slate-700 rounded h-7 text-[11px] bg-white dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 px-1.5 font-medium cursor-pointer"
                        >
                          <option value="" disabled>+ Quick Remark</option>
                          {renderCategorizedRemarkOptions("l2")}
                        </select>
                      )}
                    </div>
                    {canAuditL2 && (
                      <textarea
                        rows={2}
                        placeholder="L2 technical feedback..."
                        value={l2Remarks}
                        onChange={(e) => setL2Remarks(e.target.value)}
                        className="w-full border border-neutral-300 dark:border-slate-700 rounded p-2 text-xs bg-white dark:bg-slate-900 outline-hidden focus:border-primary resize-none text-neutral-800 dark:text-neutral-200"
                      />
                    )}
                  </div>

                  {/* Stage 3: Round 3 (L3) */}
                  <div className="p-3 border border-neutral-200 dark:border-slate-800 rounded-lg bg-neutral-50/40 dark:bg-slate-850/40 space-y-2 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          Round 3 (L3)
                        </span>
                        {!canAuditL3 && (
                          <Badge variant="secondary" className="text-[9px] py-0">View Only</Badge>
                        )}
                      </div>
                      <select
                        value={l3Status}
                        disabled={!canAuditL3}
                        onChange={(e) => setL3Status(e.target.value)}
                        className="w-full border border-neutral-300 dark:border-slate-700 rounded h-7.5 bg-white dark:bg-slate-800 text-xs px-2 outline-hidden cursor-pointer disabled:opacity-60 text-neutral-800 dark:text-neutral-200"
                      >
                        <option value="">Not Started</option>
                        <option value="PENDING">Pending</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="CLEARED">Cleared</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                      {canAuditL3 && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              setL3Remarks((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                              e.target.value = "";
                            }
                          }}
                          className="w-full border border-neutral-300 dark:border-slate-700 rounded h-7 text-[11px] bg-white dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 px-1.5 font-medium cursor-pointer"
                        >
                          <option value="" disabled>+ Quick Remark</option>
                          {renderCategorizedRemarkOptions("l3")}
                        </select>
                      )}
                    </div>
                    {canAuditL3 && (
                      <textarea
                        rows={2}
                        placeholder="L3 readiness feedback..."
                        value={l3Remarks}
                        onChange={(e) => setL3Remarks(e.target.value)}
                        className="w-full border border-neutral-300 dark:border-slate-700 rounded p-2 text-xs bg-white dark:bg-slate-900 outline-hidden focus:border-primary resize-none text-neutral-800 dark:text-neutral-200"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Final Milestone, Pay Rate & Client Feedback in a 2-Column Compact Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                
                {/* Left: Final Milestone & Pay Rate */}
                <div className="p-3 border border-neutral-200 dark:border-slate-800 rounded-lg bg-neutral-50/40 dark:bg-slate-850/40 space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-450 uppercase block tracking-wider">
                      Final Milestone Status
                    </label>
                    <select
                      value={finalStatus}
                      disabled={!canApproveClient}
                      onChange={(e) => setFinalStatus(e.target.value)}
                      className="w-full border border-neutral-300 dark:border-slate-700 rounded h-8 bg-white dark:bg-slate-800 text-xs px-2 outline-hidden cursor-pointer font-bold disabled:opacity-60 text-neutral-900 dark:text-white"
                    >
                      <option value="PENDING_APPROVAL">Pending Review</option>
                      <option value="SUBMITTED">Submitted to Client</option>
                      <option value="OFFER">Offer Stage</option>
                      <option value="JOIN">Joined / Placed</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-450 uppercase block tracking-wider">
                      Submitted Pay Rate
                    </label>
                    <Input
                      value={submittedRate}
                      disabled={!canEditRate}
                      onChange={(e) => setSubmittedRate(e.target.value)}
                      className="h-8 text-xs font-semibold bg-white dark:bg-slate-800 disabled:opacity-60"
                      placeholder="e.g. $70/hr or 15 LPA"
                    />
                  </div>
                </div>

                {/* Right: Client / Final Remarks */}
                <div className="p-3 border border-neutral-200 dark:border-slate-800 rounded-lg bg-neutral-50/40 dark:bg-slate-850/40 space-y-1.5 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-neutral-450 uppercase block tracking-wider">
                      Client / Final Remarks
                    </label>
                    {canApproveClient && (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            setRemarks((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                            e.target.value = "";
                          }
                        }}
                        className="text-[10px] border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 font-medium cursor-pointer"
                      >
                        <option value="" disabled>+ Client Quick Remark</option>
                        {renderCategorizedRemarkOptions("final")}
                      </select>
                    )}
                  </div>
                  <textarea
                    value={remarks}
                    disabled={!canApproveClient}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    className="w-full flex-1 border border-neutral-300 dark:border-slate-700 rounded p-2 text-xs bg-white dark:bg-slate-900 outline-hidden focus:border-primary disabled:opacity-60 resize-none text-neutral-800 dark:text-neutral-200"
                    placeholder={canApproveClient ? "Enter manager / client feedback notes..." : "No remarks recorded."}
                  />
                </div>
              </div>

              {/* Recruiter Submission Note */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-450 uppercase block tracking-wider">
                  Recruiter Submission Note
                </label>
                <textarea
                  value={recruiterComment}
                  onChange={(e) => setRecruiterComment(e.target.value)}
                  rows={2}
                  className="w-full border border-neutral-300 dark:border-slate-700 rounded p-2 text-xs bg-white dark:bg-slate-900 outline-hidden focus:border-primary resize-none text-neutral-800 dark:text-neutral-200"
                  placeholder="Recruiter comments or screening summary notes..."
                />
              </div>
            </div>

            <DialogFooter className="px-5 py-3 border-t border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850 shrink-0 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setReviewOpen(false)} className="text-xs h-8">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-8 cursor-pointer">
                {submitting ? "Updating..." : "Save Updates"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI MATCH SUBMISSION FORM DIALOG */}
      <Dialog open={matchSubmitOpen} onOpenChange={setMatchSubmitOpen}>
        <DialogContent className="sm:max-w-[400px] font-sans">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-neutral-800 dark:text-white">Submit Ranked Candidate</DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Submit candidate <strong>{selectedMatch?.fullName}</strong> to the requisition pipeline <strong>{job.jobTitle}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs py-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-neutral-450 uppercase">Expected / Submitted Rate</label>
              <Input
                placeholder="e.g. $65/hr or 12 LPA"
                value={matchRate}
                onChange={(e) => setMatchRate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-neutral-450 uppercase">Submission Note / Comments</label>
              <textarea
                placeholder="Recruiter screening feedback comments..."
                value={matchComment}
                onChange={(e) => setMatchComment(e.target.value)}
                className="min-h-16 border border-neutral-300 dark:border-slate-700 rounded p-2 text-xs bg-transparent outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMatchSubmitOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmitMatch}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
            >
              {submitting ? "Submitting..." : "Confirm Submission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={interviewModalOpen}
        onClose={() => setInterviewModalOpen(false)}
        submission={selectedSubForInterview}
        onSuccess={loadData}
      />

      {/* DIRECT UPLOAD & SUBMIT CV DIALOG (Dice / LinkedIn / Portal Sourcing) */}
      <Dialog open={uploadSubmitOpen} onOpenChange={setUploadSubmitOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl p-0 overflow-hidden font-sans">
          <div className="p-5 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850/40">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase border-0 px-2 py-0.5">
                1-Click Sourcing
              </Badge>
              <span className="text-[10px] font-mono text-neutral-500 font-bold">{job.jobCode}</span>
            </div>
            <DialogTitle className="text-lg font-black text-neutral-900 dark:text-white mt-1.5">
              Upload CV & Submit Candidate
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 mt-0.5">
              Upload a CV downloaded from Dice, LinkedIn, or Indeed to automatically parse & submit directly into this requisition pipeline.
            </DialogDescription>
          </div>

          <form onSubmit={handleUploadAndSubmitCandidate} className="p-5 space-y-4 text-xs">
            {/* File Dropzone */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-450">
                Select Candidate Resume File (PDF / DOCX)
              </label>
              <div className="border-2 border-dashed border-neutral-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl p-4 text-center bg-neutral-50/50 dark:bg-slate-850/50 transition-all">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  id="cv-upload-input"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="cv-upload-input" className="cursor-pointer flex flex-col items-center gap-1.5">
                  <Upload className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-neutral-700 dark:text-neutral-200">
                    {uploadFile ? uploadFile.name : "Click to select or drop CV file"}
                  </span>
                  <span className="text-[10px] text-neutral-400">PDF, DOCX up to 15MB</span>
                </label>
              </div>
            </div>

            {/* Sourcing Channel & Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-450">Sourcing Source</label>
                <select
                  value={uploadSource}
                  onChange={(e) => setUploadSource(e.target.value)}
                  className="w-full h-9 border border-neutral-300 dark:border-slate-700 rounded-lg px-2.5 bg-transparent text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="Dice Sourcing">Dice Sourcing</option>
                  <option value="LinkedIn Recruiter">LinkedIn Recruiter</option>
                  <option value="Monster / Indeed">Monster / Indeed</option>
                  <option value="CareerBuilder">CareerBuilder</option>
                  <option value="Referral / Direct">Referral / Direct</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-450">Submitted / Expected Rate</label>
                <Input
                  placeholder="e.g. $70/hr or 14 LPA"
                  value={uploadRate}
                  onChange={(e) => setUploadRate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Screening Comment */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-450">Screening Comment / Notes</label>
              <textarea
                rows={2}
                placeholder="Initial screening remarks (e.g. Available immediately, 10+ yrs Java exp)..."
                value={uploadComment}
                onChange={(e) => setUploadComment(e.target.value)}
                className="w-full p-2.5 border border-neutral-300 dark:border-slate-700 rounded-lg bg-transparent text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-neutral-100 dark:border-slate-800 gap-2">
              <Button type="button" variant="outline" onClick={() => setUploadSubmitOpen(false)} className="text-xs h-9">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploadingCv || !uploadFile}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-9 shadow-sm cursor-pointer"
              >
                {uploadingCv ? "Parsing & Submitting..." : "Upload & Submit to Pipeline"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* APPROVE JOB CONFIRMATION MODAL */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <CheckCircle className="h-5 w-5" /> Approve &amp; Activate Job Requirement
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Approving this requisition will change its status to <strong>Active</strong> and make it immediately visible to all eligible recruiters in the pod / branch.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 bg-neutral-50 dark:bg-slate-850 rounded-lg border border-neutral-200 dark:border-slate-750 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-500 font-medium">Job Title:</span>
              <strong className="text-neutral-900 dark:text-white">{job?.jobTitle}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 font-medium">Client Account:</span>
              <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{job?.client}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 font-medium">Created By:</span>
              <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{job?.createdBy || "Account Manager"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 font-medium">Assigned To:</span>
              <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{job?.assignedTo || "Pod / Recruiter"}</span>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setApproveModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={handleApproveJob}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              {actionLoading ? "Approving..." : "Confirm & Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT JOB MODAL */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <XCircle className="h-5 w-5" /> Reject Job Requirement
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Please provide feedback or the reason for rejection to notify the Account Manager.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
              Rejection Reason / Feedback <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Rate is too low for senior role / missing client bill rate details / incorrect tech stack..."
              className="w-full p-2.5 border border-neutral-300 dark:border-slate-700 rounded-lg bg-transparent text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={actionLoading || !rejectReason.trim()}
              onClick={handleRejectJob}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              {actionLoading ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELEGATE JOB MODAL */}
      <DelegateJobModal
        isOpen={delegateModalOpen}
        onClose={() => setDelegateModalOpen(false)}
        jobId={job.id}
        jobCode={job.jobCode}
        jobTitle={job.jobTitle}
        onSuccess={loadData}
      />
    </div>
  );
}
