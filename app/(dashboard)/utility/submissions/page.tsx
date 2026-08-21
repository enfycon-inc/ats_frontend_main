"use client";

import React, { useEffect, useState, useMemo } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";
import { getActiveRolePermissions, resolveActiveSystemRole, CustomRoleDefinition } from "@/lib/role-permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export const STANDARD_REMARKS_TEMPLATES = {
  review: [
    "NA",
    "Internal Screening NA - Submitted to Client",
    "Internal Screening Pending",
    "Internal Screening Scheduled",
    "Candidate Noshow",
    "Internal Screening Rescheduled",
    "Internal Screening Completed - Pending Feedback",
    "Selected in Internal Screening - Position went on Hold",
    "Selected in Internal Screening - Submitted to Client",
    "Selected in Internal Screening - Yet to Submit to Client",
    "Rejected in Internal Screening",
    "Candidate Not Responding",
    "Selected in Internal Screening - Position Closed by Client",
    "Rejected - Duplicate",
  ],
  l1: [
    "✓ Mandatory skills & tech stack 100% verified against JD",
    "✓ Immediate joiner — notice period ≤ 30 days confirmed",
    "✓ Valid work authorization & visa verified",
    "✓ Candidate CTC expectation within approved budget bracket",
    "✓ Excellent communication & profile presentation",
    "✕ Rejected: Notice period exceeds 60 days (Client requires immediate)",
    "✕ Rejected: Significant skill gap in core mandatory technologies",
    "✕ Rejected: Expected CTC exceeds maximum budget ceiling",
    "✕ Rejected: Location constraint / Candidate unwilling to relocate",
  ],
  l2: [
    "✓ Passed technical screening call with strong hands-on coding",
    "✓ Excellent project depth & system architecture knowledge",
    "✓ Solved technical live coding & algorithmic challenge",
    "✓ Strong technical communication & problem solving",
    "✕ Rejected: Failed live coding / technical screening assessment",
    "✕ Rejected: Lacked depth in framework fundamentals & design patterns",
    "✕ Rejected: Hands-on experience does not match claimed CV experience",
  ],
  l3: [
    "✓ Commercials & rate margin verified (>20% Gross Margin)",
    "✓ Candidate rate confirmation email on record",
    "✓ Client submission package formatted and validated",
    "✓ Candidate available & briefed on client interview process",
    "✕ Rejected: Commercial margin below minimum threshold (<15%)",
    "✕ Rejected: Candidate declined rate confirmation / demanded higher CTC",
  ],
  final: [
    "✓ Client shortlisted for Round 1 Interview",
    "✓ Client interview round completed successfully",
    "✓ Client released official offer letter",
    "✓ Candidate accepted offer & joined client successfully",
    "✕ Client rejected: Profile not aligned with hiring manager expectations",
    "✕ Candidate declined offer / accepted counter-offer",
    "✕ Position closed / Put on hold by client",
  ],
};

function renderPipelineProgress(sub: Submission) {
  const getBadgeStyle = (status: string | null) => {
    const s = (status || "").toUpperCase();
    if (s === "CLEARED") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    if (s === "REJECTED") return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
    if (s === "SCHEDULED") return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800";
    if (s === "PENDING") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    return "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/30 dark:text-slate-500 dark:border-slate-800";
  };

  const getLabel = (stage: string, status: string | null) => {
    const s = (status || "").toUpperCase();
    if (s === "CLEARED") return `${stage}: Pass ✓`;
    if (s === "REJECTED") return `${stage}: Fail ✕`;
    if (s === "SCHEDULED") return `${stage}: Sched`;
    if (s === "PENDING") return `${stage}: Pend`;
    return `${stage}: —`;
  };

  return (
    <div className="flex flex-col gap-1 min-w-[130px]">
      <div className="flex items-center gap-1">
        <span
          title={`Round 1 (L1) Interview: ${sub.l1Status || 'Pending'}${sub.l1Remarks ? `\nFeedback: ${sub.l1Remarks}` : ''}`}
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getBadgeStyle(sub.l1Status)}`}
        >
          {getLabel("L1", sub.l1Status || "PENDING")}
        </span>
        <span
          title={`L2 Technical Vetting: ${sub.l2Status || 'Not started'}${sub.l2Remarks ? `\nFeedback: ${sub.l2Remarks}` : ''}`}
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getBadgeStyle(sub.l2Status)}`}
        >
          {getLabel("L2", sub.l2Status)}
        </span>
        <span
          title={`L3 Commercial Audit: ${sub.l3Status || 'Not started'}${sub.l3Remarks ? `\nFeedback: ${sub.l3Remarks}` : ''}`}
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getBadgeStyle(sub.l3Status)}`}
        >
          {getLabel("L3", sub.l3Status)}
        </span>
      </div>
      {(sub.l1Remarks || sub.l2Remarks || sub.l3Remarks) && (
        <div className="text-[9px] text-default-450 truncate max-w-[170px] italic font-medium" title={sub.l3Remarks || sub.l2Remarks || sub.l1Remarks || ''}>
          "{sub.l3Remarks || sub.l2Remarks || sub.l1Remarks}"
        </div>
      )}
    </div>
  );
}

function renderClutterFreeRemarks(sub: Submission) {
  const allRemarks: { label: string; text: string; color: string }[] = [];
  if (sub.remarks) allRemarks.push({ label: "Final", text: sub.remarks, color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" });
  if (sub.l3Remarks) allRemarks.push({ label: "L3", text: sub.l3Remarks, color: "text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300" });
  if (sub.l2Remarks) allRemarks.push({ label: "L2", text: sub.l2Remarks, color: "text-cyan-700 bg-cyan-50 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300" });
  if (sub.l1Remarks) allRemarks.push({ label: "L1", text: sub.l1Remarks, color: "text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300" });
  if (sub.reviewFeedback) allRemarks.push({ label: "Review", text: sub.reviewFeedback, color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300" });
  if (sub.recruiterComment) allRemarks.push({ label: "Recruiter", text: sub.recruiterComment, color: "text-slate-700 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300" });

  const primary = allRemarks[0];
  const fullTooltip = allRemarks.map(r => `[${r.label}] ${r.text}`).join('\n\n');

  return (
    <div className="flex flex-col gap-1 text-xs max-w-[240px]">
      {primary ? (
        <div className="flex items-center gap-1.5" title={fullTooltip}>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${primary.color}`}>
            {primary.label}
          </span>
          <span className="text-default-750 font-medium truncate max-w-[150px]">
            {primary.text}
          </span>
          {allRemarks.length > 1 && (
            <span 
              className="text-[9px] font-semibold bg-default-100 text-default-500 hover:bg-default-200 px-1 py-0.2 rounded shrink-0 cursor-help"
              title={fullTooltip}
            >
              +{allRemarks.length - 1}
            </span>
          )}
        </div>
      ) : (
        <span className="text-default-400 italic text-[11px]">No remarks</span>
      )}
      <div className="text-[9px] text-default-400 font-medium flex items-center gap-1">
        <Icon icon="heroicons:calendar" className="h-3 w-3 text-default-400" />
        {new Date(sub.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
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
  const [newRemarkStage, setNewRemarkStage] = useState("review");
  const [newRemarkText, setNewRemarkText] = useState("");
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

  const openEditPanel = (sub: Submission) => {
    setSelectedSubmission(sub);
    setL1Status(sub.l1Status || "");
    setL1Date(sub.l1Date ? sub.l1Date.slice(0, 16) : "");
    setL1Remarks(sub.l1Remarks || "");
    setL2Status(sub.l2Status || "");
    setL2Date(sub.l2Date ? sub.l2Date.slice(0, 16) : "");
    setL2Remarks(sub.l2Remarks || "");
    setL3Status(sub.l3Status || "");
    setL3Date(sub.l3Date ? sub.l3Date.slice(0, 16) : "");
    setL3Remarks(sub.l3Remarks || "");
    setFinalStatus(sub.finalStatus);
    setRemarks(sub.remarks || "");
    setRecruiterComment(sub.recruiterComment || "");
    setSubmittedRate(sub.submittedRate || "");
    setReviewFeedback(sub.reviewFeedback || "");
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
  const resolvedTemplates = {
    review: [...STANDARD_REMARKS_TEMPLATES.review, ...customRemarks.filter(r => r.stage?.toLowerCase() === "review" || r.stage?.toLowerCase() === "internal_review").map(r => r.remarkText)],
    l1: [...STANDARD_REMARKS_TEMPLATES.l1, ...customRemarks.filter(r => r.stage?.toLowerCase() === "l1").map(r => r.remarkText)],
    l2: [...STANDARD_REMARKS_TEMPLATES.l2, ...customRemarks.filter(r => r.stage?.toLowerCase() === "l2").map(r => r.remarkText)],
    l3: [...STANDARD_REMARKS_TEMPLATES.l3, ...customRemarks.filter(r => r.stage?.toLowerCase() === "l3").map(r => r.remarkText)],
    final: [...STANDARD_REMARKS_TEMPLATES.final, ...customRemarks.filter(r => r.stage?.toLowerCase() === "final").map(r => r.remarkText)],
  };

  const handleConfirmQuickReview = async () => {
    if (!quickReviewSub) return;
    try {
      setSubmitting(true);
      const targetStatus = quickReviewAction === "APPROVE" ? "SUBMITTED" : "REJECTED";
      await atsApi.submissions.update(quickReviewSub.id, {
        finalStatus: targetStatus,
        reviewFeedback: quickReviewRemark.trim() || (quickReviewAction === "APPROVE" ? "Approved for client submission" : "Rejected internally"),
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

  const handleAddCustomRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemarkText.trim()) return;
    try {
      setAddingRemark(true);
      const created = await atsApi.submissions.createCustomRemark({
        stage: newRemarkStage,
        remarkText: newRemarkText.trim(),
      });
      setCustomRemarks((prev) => [...prev, created]);
      setNewRemarkText("");
      toast.success("Custom stage remark added!");
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
      payload.recruiterComment = recruiterComment.trim() || null;

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

  // Sequential status dependencies check (Auto Rejection logic)
  const isL1Rejected = l1Status === "REJECTED";
  const isL2Rejected = l2Status === "REJECTED";

  // Side-effect: auto-reject progression if values change in form
  const handleL1Change = (val: string) => {
    setL1Status(val);
    if (val === "REJECTED") {
      setL2Status("");
      setL2Date("");
      setL3Status("");
      setL3Date("");
      setFinalStatus("REJECTED");
    } else if (val === "CLEARED" && finalStatus === "REJECTED") {
      setFinalStatus("SUBMITTED");
    }
  };

  const handleL2Change = (val: string) => {
    setL2Status(val);
    if (val === "REJECTED") {
      setL3Status("");
      setL3Date("");
      setFinalStatus("REJECTED");
    } else if (val === "CLEARED" && finalStatus === "REJECTED") {
      setFinalStatus("SUBMITTED");
    }
  };

  const handleL3Change = (val: string) => {
    setL3Status(val);
    if (val === "REJECTED") {
      setFinalStatus("REJECTED");
    } else if (val === "CLEARED") {
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
          <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm overflow-hidden rounded-xl mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-default-50/50 dark:bg-slate-800/20 border-b border-default-150">
                    {["Job & Client", "Candidate & Pay Rate", "Internal Review", "Interview Rounds (L1, L2, L3)", "Final Status", "Remarks & Date", "Actions"].map((h) => (
                      <th key={h} className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-wider text-default-600">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-default-500 font-semibold italic">
                        <div className="flex flex-col items-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                          <span>Loading candidate submissions…</span>
                        </div>
                      </td>
                    </tr>
                  ) : submissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-default-500 font-semibold italic">
                        <div className="flex flex-col items-center gap-3">
                          <Icon icon="heroicons:clipboard-document-check" className="h-10 w-10 text-default-300" />
                          <span>No submissions match your query.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    submissions.map((sub) => (
                      <tr
                        key={sub.id}
                        onClick={() => openEditPanel(sub)}
                        className={`hover:bg-indigo-50/30 dark:hover:bg-slate-850/15 cursor-pointer transition-colors ${
                          selectedSubmission?.id === sub.id ? "bg-indigo-50/50 dark:bg-indigo-950/10" : ""
                        }`}
                      >
                        {/* 1. Job & Client */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="font-bold text-default-900 flex items-center gap-1.5">
                              <span className="text-xs">{sub.jobTitle}</span>
                              <Badge className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-0 text-[9px] py-0 px-1 font-bold">
                                {sub.jobCode}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-default-600 font-semibold flex items-center gap-1">
                              <Icon icon="heroicons:building-office-2" className="h-3 w-3 text-default-400" />
                              {sub.clientName || "Direct Client"}
                            </div>
                          </div>
                        </td>

                        {/* 2. Candidate & Pay Rate */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="text-default-900 font-bold text-sm flex items-center gap-1.5">
                              {sub.candidateName}
                              {sub.submittedRate && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded">
                                  {formatSubmittedRate(sub.submittedRate, sub.market, sub.jobCode, sub.jobTitle)}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-default-500 font-normal">{sub.candidateEmail}</div>
                          </div>
                        </td>

                        {/* 3. Internal Review Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {sub.finalStatus === "PENDING_APPROVAL" ? (
                            <div className="flex flex-col gap-1.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-900 w-fit">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Pending Review
                              </span>
                              {canInternalScreen && (
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setQuickReviewSub(sub);
                                      setQuickReviewAction("APPROVE");
                                      setQuickReviewRemark("");
                                      setQuickReviewModalOpen(true);
                                    }}
                                    className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Icon icon="heroicons:check" className="h-3 w-3" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setQuickReviewSub(sub);
                                      setQuickReviewAction("REJECT");
                                      setQuickReviewRemark("");
                                      setQuickReviewModalOpen(true);
                                    }}
                                    className="h-6 px-2 text-[10px] text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/30 font-bold rounded flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Icon icon="heroicons:x-mark" className="h-3 w-3" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 w-fit">
                              <Icon icon="heroicons:check-circle" className="h-3 w-3 text-emerald-600" />
                              Approved
                            </span>
                          )}
                        </td>

                        {/* 4. Interview Rounds (L1, L2, L3) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderPipelineProgress(sub)}
                        </td>

                        {/* 5. Final Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {sub.finalStatus === "PENDING_APPROVAL" ? (
                            <span className="text-[11px] text-default-400 italic">In Internal Review</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit ${
                                sub.finalStatus === "JOIN" ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300" :
                                sub.finalStatus === "OFFER" ? "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300" :
                                sub.finalStatus === "REJECTED" ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300" :
                                "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300"
                              }`}>
                                {sub.finalStatus === "SUBMITTED" && "🚀 Submitted to Client"}
                                {sub.finalStatus === "OFFER" && "🎉 Offer Released"}
                                {sub.finalStatus === "JOIN" && "🏆 Joined / Placed"}
                                {sub.finalStatus === "REJECTED" && "✕ Rejected"}
                                {sub.finalStatus !== "SUBMITTED" && sub.finalStatus !== "OFFER" && sub.finalStatus !== "JOIN" && sub.finalStatus !== "REJECTED" && sub.finalStatus}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 6. Remarks & Date */}
                        <td className="py-3.5 px-4 max-w-[240px]">
                          {renderClutterFreeRemarks(sub)}
                        </td>

                        {/* 7. Actions (Kebab Menu) */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-default-500 hover:text-default-900 rounded-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Icon icon="heroicons:ellipsis-vertical" className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg border-default-200">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditPanel(sub);
                                }}
                                className="text-xs cursor-pointer gap-2 font-medium"
                              >
                                <Icon icon="heroicons:pencil-square" className="h-4 w-4 text-indigo-500" />
                                Edit Status &amp; Rounds
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubForInterview(sub);
                                  setInterviewModalOpen(true);
                                }}
                                className="text-xs cursor-pointer gap-2 font-medium"
                              >
                                <Icon icon="heroicons:calendar" className="h-4 w-4 text-cyan-500" />
                                Schedule Interview
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadResume(sub.candidateId, sub.candidateName || "Candidate");
                                }}
                                className="text-xs cursor-pointer gap-2 font-medium"
                              >
                                <Icon icon="heroicons:document-arrow-down" className="h-4 w-4 text-emerald-500" />
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
          </Card>
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
        className={`fixed top-0 right-0 h-full w-[430px] bg-white dark:bg-slate-900 border-l border-default-200 shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-default-150 shrink-0 bg-default-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
              <Icon icon="heroicons:pencil-square" className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-default-900">Review Candidate Submission</h2>
              {selectedSubmission && (
                <p className="text-[11px] text-default-500 font-semibold">{selectedSubmission.candidateName}</p>
              )}
            </div>
          </div>
          <button
            onClick={closePanel}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-default-500 hover:text-default-800 hover:bg-default-100 transition cursor-pointer"
          >
            <Icon icon="heroicons:x-mark" className="h-5 w-5" />
          </button>
        </div>

        {/* Panel Form — scrollable body */}
        <form onSubmit={handleUpdateSubmission} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {selectedSubmission && (
              <div className="space-y-4">
                {/* 1. Candidate Profile Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-default-900">{selectedSubmission.candidateName}</h3>
                      <p className="text-xs text-default-500 font-medium">{selectedSubmission.candidateDesignation || "Designation: Not Specified"}</p>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-0 font-bold text-[9px]">
                      ID: {selectedSubmission.candidateId}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-[11px] pt-1 border-t border-slate-150/40 dark:border-slate-800">
                    <div>
                      <span className="text-default-400 block font-medium">Email</span>
                      <span className="font-semibold text-default-850 truncate block">{selectedSubmission.candidateEmail}</span>
                    </div>
                    <div>
                      <span className="text-default-400 block font-medium">Phone</span>
                      <span className="font-semibold text-default-850 block">{selectedSubmission.candidatePhone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-default-400 block font-medium">Location</span>
                      <span className="font-semibold text-default-850 block truncate">{selectedSubmission.candidateCurrentLocation || "—"}</span>
                    </div>
                    <div>
                      <span className="text-default-400 block font-medium">Experience</span>
                      <span className="font-semibold text-default-850 block">
                        {selectedSubmission.candidateExperience != null ? `${selectedSubmission.candidateExperience} Years` : "—"}
                      </span>
                    </div>
                    {/* India specific CTC / Notice */}
                    {(selectedSubmission.market === "IN" || selectedSubmission.jobCode?.includes("-IN-") || selectedSubmission.jobTitle?.toLowerCase().includes("india") || selectedSubmission.jobCode?.toLowerCase().includes("in")) ? (
                      <>
                        <div>
                          <span className="text-default-400 block font-medium">Current CTC</span>
                          <span className="font-semibold text-default-850 block">
                            {selectedSubmission.candidateCurrentCtc ? `${selectedSubmission.candidateCurrentCtc} Lakhs` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-default-400 block font-medium">Notice Period</span>
                          <span className="font-semibold text-default-850 block">
                            {selectedSubmission.candidateNoticePeriod != null ? `${selectedSubmission.candidateNoticePeriod} Days` : "—"}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-default-400 block font-medium">Work Authorization</span>
                          <span className="font-semibold text-default-850 block truncate">{selectedSubmission.candidateWorkAuth || "—"}</span>
                        </div>
                        <div>
                          <span className="text-default-400 block font-medium">Source</span>
                          <span className="font-semibold text-default-850 block truncate">{selectedSubmission.candidateSource || "—"}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Prominent Resume Link */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDownloadResume(selectedSubmission.candidateId, selectedSubmission.candidateName || "Candidate")}
                    className="w-full flex items-center justify-center gap-2 mt-2 py-2 h-9 text-xs font-bold text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-200 dark:border-indigo-900 rounded-lg transition"
                  >
                    <Icon icon="heroicons:arrow-down-tray" className="h-4 w-4" />
                    Download / View Resume
                  </Button>
                </div>

                {/* 2. Requisition Info Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                  <h4 className="text-[11px] font-bold text-default-700 uppercase tracking-wider">Job Requisition</h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-default-400 block font-medium">Job Code & Title</span>
                      <span className="font-semibold text-default-850 block truncate">
                        {selectedSubmission.jobCode} - {selectedSubmission.jobTitle}
                      </span>
                    </div>
                    <div>
                      <span className="text-default-450 block font-medium">Client Name</span>
                      <span className="font-semibold text-default-850 block truncate">{selectedSubmission.clientName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-default-450 block font-medium">Recruiter</span>
                      <span className="font-semibold text-default-850 block truncate">{selectedSubmission.recruiterName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-default-450 block font-medium">Pod Head</span>
                      <span className="font-semibold text-default-850 block truncate">{selectedSubmission.podHeadName || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Submitter Comments & Rates */}
                <div className="space-y-4 pt-1">
                  {/* Recruiter Comment */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-default-800 block">Recruiter Comment</label>
                    <textarea
                      placeholder="Add comments on candidate salary expectations, notice period, location etc..."
                      value={recruiterComment}
                      onChange={(e) => setRecruiterComment(e.target.value)}
                      className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-3 py-2 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 resize-none"
                      rows={2}
                    />
                  </div>

                  {/* Submitted Rate / Expected Salary */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-default-800 block">
                      {(selectedSubmission.market === "IN" || selectedSubmission.jobCode?.includes("-IN-") || selectedSubmission.jobTitle?.toLowerCase().includes("india") || selectedSubmission.jobCode?.toLowerCase().includes("in"))
                        ? "Expected Salary (Lakhs)"
                        : "Submitted Pay Rate ($/hr or $/yr)"}
                    </label>
                    <Input
                      placeholder={(selectedSubmission.market === "IN" || selectedSubmission.jobCode?.includes("-IN-") || selectedSubmission.jobTitle?.toLowerCase().includes("india") || selectedSubmission.jobCode?.toLowerCase().includes("in"))
                        ? "e.g. 12.5"
                        : "e.g. $70/hr"}
                      value={submittedRate}
                      onChange={(e) => setSubmittedRate(e.target.value)}
                      className="h-8 text-xs bg-transparent"
                    />
                  </div>
                </div>

                {/* 4. Timeline Audit Trail Summary */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <h4 className="text-[11px] font-bold text-default-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Icon icon="heroicons:clock" className="h-3.5 w-3.5 text-default-450" />
                    Audit Logs / Stages
                  </h4>
                  <div className="space-y-2.5 pl-1.5 border-l-2 border-slate-200 dark:border-slate-700 ml-1.5 pt-1">
                    <div className="relative text-[10px]">
                      <div className="absolute -left-[11px] top-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                      <span className="font-semibold text-default-600">Sourced & Submitted internally</span>
                      <span className="text-default-400 block">On {new Date(selectedSubmission.createdAt).toLocaleString()} by {selectedSubmission.recruiterName || "Recruiter"}</span>
                    </div>

                    {selectedSubmission.l1Date && (
                      <div className="relative text-[10px]">
                        <div className="absolute -left-[11px] top-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        <span className="font-semibold text-default-600">L1 Stage: {selectedSubmission.l1Status || "PENDING"}</span>
                        <span className="text-default-400 block">Scheduled/Updated: {new Date(selectedSubmission.l1Date).toLocaleString()}</span>
                      </div>
                    )}

                    {selectedSubmission.l2Date && (
                      <div className="relative text-[10px]">
                        <div className="absolute -left-[11px] top-1 h-1.5 w-1.5 rounded-full bg-cyan-500" />
                        <span className="font-semibold text-default-600">L2 Stage: {selectedSubmission.l2Status}</span>
                        <span className="text-default-400 block">Scheduled/Updated: {new Date(selectedSubmission.l2Date).toLocaleString()}</span>
                      </div>
                    )}

                    {selectedSubmission.l3Date && (
                      <div className="relative text-[10px]">
                        <div className="absolute -left-[11px] top-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-default-600">L3 Stage: {selectedSubmission.l3Status}</span>
                        <span className="text-default-400 block">Scheduled/Updated: {new Date(selectedSubmission.l3Date).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── ZONE A: Internal Screening Review & Submission Approval (only shown when PENDING_APPROVAL) ── */}
                {selectedSubmission?.finalStatus === "PENDING_APPROVAL" && (
                  <div className="border border-amber-200 dark:border-amber-900/40 rounded-xl overflow-hidden">
                    <div className="bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 flex items-center gap-2 border-b border-amber-200 dark:border-amber-900/40">
                      <Icon icon="heroicons:clock" className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Internal Screening Review & Submission Approval</span>
                      <Badge className="ml-auto bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-0 text-[8px] font-bold">Awaiting Your Decision</Badge>
                    </div>
                    <div className="p-4 space-y-3">

                      {/* Recruiter's submission comment — read-only for AM/Pod */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Icon icon="heroicons:chat-bubble-left" className="h-3 w-3" />
                          Recruiter's Submission Note
                        </label>
                        <div className="text-xs text-default-700 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 min-h-[48px] leading-relaxed">
                          {selectedSubmission.recruiterComment || <span className="text-default-400 italic">No comment from recruiter.</span>}
                        </div>
                      </div>

                      {/* AM / Pod Lead writes feedback for recruiter */}
                      {canInternalScreen && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-default-700 uppercase tracking-wider flex items-center gap-1.5">
                              <Icon icon="heroicons:pencil" className="h-3 w-3 text-indigo-500" />
                              Your Feedback to Recruiter
                              <span className="text-default-400 font-normal normal-case tracking-normal">— visible to recruiter</span>
                            </label>
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  setReviewFeedback((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                                  e.target.value = "";
                                }
                              }}
                              className="text-[10px] border border-amber-200 dark:border-amber-900 rounded px-1.5 py-0.5 bg-amber-50/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold cursor-pointer"
                            >
                              <option value="" disabled>+ Quick Pick Review Remark</option>
                              {resolvedTemplates.review.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                          <textarea
                            placeholder="e.g. Rate is too high, candidate's notice period is a concern, ask for lower expectation..."
                            value={reviewFeedback}
                            onChange={(e) => setReviewFeedback(e.target.value)}
                            className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-3 py-2 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 resize-none"
                            rows={3}
                          />
                        </div>
                      )}

                      {/* Approve / Reject actions */}
                      {canInternalScreen ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            type="button"
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
                            className="h-8 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-400 rounded-lg"
                          >
                            <Icon icon="heroicons:x-mark" className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                          <Button
                            type="button"
                            disabled={submitting}
                            onClick={async () => {
                              try {
                                setSubmitting(true);
                                await atsApi.submissions.update(selectedSubmission.id, {
                                  finalStatus: "SUBMITTED",
                                  reviewFeedback: reviewFeedback.trim() || null,
                                });
                                toast.success("✅ Approved & submitted to client!");
                                closePanel();
                                await loadData();
                              } catch (err: any) {
                                toast.error("Failed: " + err.message);
                              } finally { setSubmitting(false); }
                            }}
                            className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                          >
                            <Icon icon="heroicons:check-badge" className="h-3.5 w-3.5 mr-1" />
                            Approve & Submit to Client
                          </Button>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                          <Icon icon="heroicons:lock-closed" className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">Internal Screening Gate in Progress</span>
                            <span className="text-[11px] text-amber-700/90 dark:text-amber-300/80">
                              This candidate submission is awaiting review & clearance by an authorized Pod Lead or Delivery Head before client release.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Recruiter view — show AM feedback if exists */}
                      {isRecruiterOnly && selectedSubmission.reviewFeedback && (
                        <div className="flex items-start gap-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-lg p-3">
                          <Icon icon="heroicons:chat-bubble-left-ellipsis" className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1">Feedback from Review</p>
                            <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">{selectedSubmission.reviewFeedback}</p>
                          </div>
                        </div>
                      )}

                      {isRecruiterOnly && (
                        <div className="text-[10px] text-default-500 italic">Your submission is under internal review. You will see feedback here once reviewed.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── ZONE B: Interview Progression (shown after approval) ── */}
                {selectedSubmission?.finalStatus !== "PENDING_APPROVAL" && (
                  <div className="space-y-3">

                    {/* Show AM feedback to recruiter as banner */}
                    {isRecruiterOnly && selectedSubmission?.reviewFeedback && (
                      <div className="flex items-start gap-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-lg p-3">
                        <Icon icon="heroicons:chat-bubble-left-ellipsis" className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1">Review Feedback from AM / Pod Lead</p>
                          <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">{selectedSubmission.reviewFeedback}</p>
                        </div>
                      </div>
                    )}

                    {isRecruiterOnly ? (
                      <div className="border border-default-150 bg-default-50/30 p-3 rounded-lg text-[10px] text-default-500 flex items-start gap-2">
                        <Icon icon="heroicons:information-circle" className="h-4 w-4 shrink-0 mt-0.5 text-default-400" />
                        <span>Interview stages are updated by your AM or Pod Lead. You can update your recruiter note below.</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-px flex-1 bg-default-150" />
                          <span className="text-[10px] font-bold text-default-500 uppercase tracking-wider">Interview Rounds (L1, L2, L3)</span>
                          <div className="h-px flex-1 bg-default-150" />
                        </div>

                        {/* ── STAGE 1: Round 1 (L1) Interview ── */}
                        <div className="space-y-2 p-3 border border-default-150 rounded-xl bg-slate-50/50 dark:bg-slate-800/20">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-default-850 flex items-center gap-1.5">
                              <Icon icon="heroicons:document-magnifying-glass" className="h-4 w-4 text-indigo-600" />
                              Round 1 (L1) — Interview Stage
                            </label>
                            {canAuditL1 ? (
                              <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 text-[9px] border-0 py-0.5">
                                {l1Status || "PENDING"}
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-500 text-[9px] border-0 py-0.5 flex items-center gap-1">
                                <Icon icon="heroicons:lock-closed" className="h-2.5 w-2.5" />
                                Locked (View Only)
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={l1Status}
                              disabled={!canAuditL1}
                              onChange={(e) => handleL1Change(e.target.value)}
                              className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-2 h-8 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <option value="">— PENDING —</option>
                              <option value="SCHEDULED">SCHEDULED</option>
                              <option value="CLEARED">CLEARED</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
                            <Input
                              type="datetime-local"
                              value={l1Date}
                              disabled={!canAuditL1}
                              onChange={(e) => setL1Date(e.target.value)}
                              className="h-8 text-[10px] disabled:opacity-60"
                            />
                          </div>

                          {/* L1 Remarks & Standard Templates */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-default-600 uppercase tracking-wider">L1 Screening Remarks</span>
                              {canAuditL1 && (
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setL1Remarks((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                                      e.target.value = "";
                                    }
                                  }}
                                  className="text-[10px] border border-default-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800 text-indigo-600 font-semibold cursor-pointer"
                                >
                                  <option value="" disabled>+ Quick Pick Remark</option>
                                  {resolvedTemplates.l1.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <textarea
                              rows={2}
                              disabled={!canAuditL1}
                              placeholder={canAuditL1 ? "Enter L1 screening remarks or select a quick pick template..." : "No L1 remarks recorded."}
                              value={l1Remarks}
                              onChange={(e) => setL1Remarks(e.target.value)}
                              className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-2.5 py-1.5 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>

                        {/* ── STAGE 2: L2 Technical Evaluation ── */}
                        <div className={`space-y-2 p-3 border border-default-150 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 transition-opacity ${isL1Rejected ? "opacity-40 pointer-events-none" : ""}`}>
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-default-850 flex items-center gap-1.5">
                              <Icon icon="heroicons:code-bracket" className="h-4 w-4 text-cyan-600" />
                              Round 2 (L2) — Technical Evaluation
                            </label>
                            {canAuditL2 ? (
                              <Badge className="bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 text-[9px] border-0 py-0.5">
                                {l2Status || "Not Started"}
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-500 text-[9px] border-0 py-0.5 flex items-center gap-1">
                                <Icon icon="heroicons:lock-closed" className="h-2.5 w-2.5" />
                                Locked (View Only)
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={l2Status}
                              disabled={!canAuditL2 || isL1Rejected}
                              onChange={(e) => handleL2Change(e.target.value)}
                              className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-2 h-8 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <option value="">— Not Started —</option>
                              <option value="PENDING">PENDING</option>
                              <option value="SCHEDULED">SCHEDULED</option>
                              <option value="CLEARED">CLEARED</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
                            <Input
                              type="datetime-local"
                              value={l2Date}
                              disabled={!canAuditL2 || isL1Rejected}
                              onChange={(e) => setL2Date(e.target.value)}
                              className="h-8 text-[10px] disabled:opacity-60"
                            />
                          </div>

                          {/* L2 Remarks & Standard Templates */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-default-600 uppercase tracking-wider">L2 Technical Remarks</span>
                              {canAuditL2 && !isL1Rejected && (
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setL2Remarks((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                                      e.target.value = "";
                                    }
                                  }}
                                  className="text-[10px] border border-default-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800 text-cyan-600 font-semibold cursor-pointer"
                                >
                                  <option value="" disabled>+ Quick Pick Remark</option>
                                  {resolvedTemplates.l2.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <textarea
                              rows={2}
                              disabled={!canAuditL2 || isL1Rejected}
                              placeholder={canAuditL2 ? "Enter L2 technical remarks or select a quick pick template..." : "No L2 remarks recorded."}
                              value={l2Remarks}
                              onChange={(e) => setL2Remarks(e.target.value)}
                              className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-2.5 py-1.5 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>

                        {/* ── STAGE 3: L3 Commercial Verification ── */}
                        <div className={`space-y-2 p-3 border border-default-150 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 transition-opacity ${(isL1Rejected || isL2Rejected) ? "opacity-40 pointer-events-none" : ""}`}>
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-default-850 flex items-center gap-1.5">
                              <Icon icon="heroicons:currency-dollar" className="h-4 w-4 text-purple-600" />
                              Round 3 (L3) — Commercial Verification
                            </label>
                            {canAuditL3 ? (
                              <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/40 text-[9px] border-0 py-0.5">
                                {l3Status || "Not Started"}
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-500 text-[9px] border-0 py-0.5 flex items-center gap-1">
                                <Icon icon="heroicons:lock-closed" className="h-2.5 w-2.5" />
                                Locked (View Only)
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={l3Status}
                              disabled={!canAuditL3 || isL1Rejected || isL2Rejected}
                              onChange={(e) => handleL3Change(e.target.value)}
                              className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-2 h-8 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <option value="">— Not Started —</option>
                              <option value="PENDING">PENDING</option>
                              <option value="SCHEDULED">SCHEDULED</option>
                              <option value="CLEARED">CLEARED</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
                            <Input
                              type="datetime-local"
                              value={l3Date}
                              disabled={!canAuditL3 || isL1Rejected || isL2Rejected}
                              onChange={(e) => setL3Date(e.target.value)}
                              className="h-8 text-[10px] disabled:opacity-60"
                            />
                          </div>

                          {/* L3 Remarks & Standard Templates */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-default-600 uppercase tracking-wider">L3 Commercial Remarks</span>
                              {canAuditL3 && !isL1Rejected && !isL2Rejected && (
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setL3Remarks((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                                      e.target.value = "";
                                    }
                                  }}
                                  className="text-[10px] border border-default-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800 text-purple-600 font-semibold cursor-pointer"
                                >
                                  <option value="" disabled>+ Quick Pick Remark</option>
                                  {resolvedTemplates.l3.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <textarea
                              rows={2}
                              disabled={!canAuditL3 || isL1Rejected || isL2Rejected}
                              placeholder={canAuditL3 ? "Enter L3 commercial verification notes or select a quick pick..." : "No L3 remarks recorded."}
                              value={l3Remarks}
                              onChange={(e) => setL3Remarks(e.target.value)}
                              className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-2.5 py-1.5 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>

                        {/* ── FINAL STATUS & ACTIONS ── */}
                        <div className="space-y-2 p-3.5 border border-default-200 rounded-xl bg-white dark:bg-slate-850">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-default-850 flex items-center gap-1.5">
                              <Icon icon="heroicons:flag" className="h-4 w-4 text-emerald-600" />
                              Final Status (Offer &amp; Placement Outcome)
                            </label>
                            {!canFinalStatus && (
                              <Badge className="bg-slate-100 text-slate-500 text-[9px] border-0 py-0.5 flex items-center gap-1">
                                <Icon icon="heroicons:lock-closed" className="h-2.5 w-2.5" />
                                Locked (Requires submission:final_status)
                              </Badge>
                            )}
                          </div>
                          <select
                            value={finalStatus}
                            disabled={!canFinalStatus}
                            onChange={(e) => setFinalStatus(e.target.value)}
                            className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-3 h-8.5 bg-transparent text-default-850 font-semibold focus:outline-none focus:border-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <option value="SUBMITTED">SUBMITTED — Sent to Client</option>
                            <option value="REJECTED">REJECTED</option>
                            <option value="OFFER">OFFER — Offer Extended</option>
                            <option value="JOIN">JOIN — Placed / Joined</option>
                          </select>

                          {/* Final Remarks & Standard Templates */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-default-600 uppercase tracking-wider">Final Remarks / Notes</span>
                              {canFinalStatus && (
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setRemarks((prev) => (prev ? `${prev} | ${e.target.value}` : e.target.value));
                                      e.target.value = "";
                                    }
                                  }}
                                  className="text-[10px] border border-default-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800 text-emerald-600 font-semibold cursor-pointer"
                                >
                                  <option value="" disabled>+ Quick Pick Remark</option>
                                  {resolvedTemplates.final.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <textarea
                              placeholder={canFinalStatus ? "Client feedback, interview outcomes, placement notes..." : "No final remarks recorded."}
                              value={remarks}
                              disabled={!canFinalStatus}
                              onChange={(e) => setRemarks(e.target.value)}
                              className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-2.5 py-2 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                              rows={2.5}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── CARD: Complete Submission Audit Trail ── */}
                {selectedSubmission && (
                  <div className="p-3.5 border border-default-200 rounded-xl bg-default-50/50 dark:bg-slate-800/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon icon="heroicons:clock" className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-bold text-default-850 uppercase tracking-wider">Evaluation Audit Trail</span>
                    </div>

                    <div className="relative pl-5 border-l-2 border-indigo-200 dark:border-indigo-900/50 space-y-3.5 text-xs">
                      {/* Sourced */}
                      <div className="relative">
                        <div className="absolute -left-[27px] top-0.5 h-3 w-3 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-slate-900" />
                        <div className="font-bold text-default-800">
                          Sourced by {selectedSubmission.recruiterName || 'Recruiter'}
                        </div>
                        <div className="text-[10px] text-default-450">
                          {new Date(selectedSubmission.createdAt).toLocaleString()}
                        </div>
                        {selectedSubmission.recruiterComment && (
                          <div className="mt-1 text-[11px] text-default-700 bg-white dark:bg-slate-800/60 p-2 rounded border border-default-150">
                            "{selectedSubmission.recruiterComment}"
                          </div>
                        )}
                      </div>

                      {/* L1 Stage */}
                      {selectedSubmission.l1Status && (
                        <div className="relative">
                          <div className="absolute -left-[27px] top-0.5 h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900" />
                          <div className="font-bold text-default-800 flex items-center gap-1.5">
                            <span>L1 Screening:</span>
                            <Badge className="text-[9px] py-0 px-1 font-bold">{selectedSubmission.l1Status}</Badge>
                          </div>
                          {selectedSubmission.l1Date && (
                            <div className="text-[10px] text-default-450">
                              {new Date(selectedSubmission.l1Date).toLocaleString()}
                            </div>
                          )}
                          {selectedSubmission.l1Remarks && (
                            <div className="mt-1 text-[11px] text-default-700 bg-white dark:bg-slate-800/60 p-2 rounded border border-default-150">
                              "{selectedSubmission.l1Remarks}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* L2 Stage */}
                      {selectedSubmission.l2Status && (
                        <div className="relative">
                          <div className="absolute -left-[27px] top-0.5 h-3 w-3 rounded-full bg-cyan-500 ring-4 ring-white dark:ring-slate-900" />
                          <div className="font-bold text-default-800 flex items-center gap-1.5">
                            <span>L2 Tech Screen:</span>
                            <Badge className="text-[9px] py-0 px-1 font-bold bg-cyan-50 text-cyan-700">{selectedSubmission.l2Status}</Badge>
                          </div>
                          {selectedSubmission.l2Date && (
                            <div className="text-[10px] text-default-450">
                              {new Date(selectedSubmission.l2Date).toLocaleString()}
                            </div>
                          )}
                          {selectedSubmission.l2Remarks && (
                            <div className="mt-1 text-[11px] text-default-700 bg-white dark:bg-slate-800/60 p-2 rounded border border-default-150">
                              "{selectedSubmission.l2Remarks}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* L3 Stage */}
                      {selectedSubmission.l3Status && (
                        <div className="relative">
                          <div className="absolute -left-[27px] top-0.5 h-3 w-3 rounded-full bg-purple-500 ring-4 ring-white dark:ring-slate-900" />
                          <div className="font-bold text-default-800 flex items-center gap-1.5">
                            <span>L3 Commercial Audit:</span>
                            <Badge className="text-[9px] py-0 px-1 font-bold bg-purple-50 text-purple-700">{selectedSubmission.l3Status}</Badge>
                          </div>
                          {selectedSubmission.l3Date && (
                            <div className="text-[10px] text-default-450">
                              {new Date(selectedSubmission.l3Date).toLocaleString()}
                            </div>
                          )}
                          {selectedSubmission.l3Remarks && (
                            <div className="mt-1 text-[11px] text-default-700 bg-white dark:bg-slate-800/60 p-2 rounded border border-default-150">
                              "{selectedSubmission.l3Remarks}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* Final Status */}
                      {selectedSubmission.finalStatus && selectedSubmission.finalStatus !== 'PENDING_APPROVAL' && (
                        <div className="relative">
                          <div className="absolute -left-[27px] top-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900" />
                          <div className="font-bold text-default-800 flex items-center gap-1.5">
                            <span>Client Milestone:</span>
                            <Badge className="text-[9px] py-0 px-1 font-bold bg-emerald-50 text-emerald-700">{selectedSubmission.finalStatus}</Badge>
                          </div>
                          {selectedSubmission.remarks && (
                            <div className="mt-1 text-[11px] text-default-700 bg-white dark:bg-slate-800/60 p-2 rounded border border-default-150">
                              "{selectedSubmission.remarks}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel Footer */}
          <div className="shrink-0 border-t border-default-150 bg-default-50/60 dark:bg-slate-800/40 px-6 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closePanel}
                disabled={submitting}
                className="font-semibold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 shadow-xs"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Icon icon="heroicons:check" className="h-3.5 w-3.5" />
                    Save Changes
                  </span>
                )}
              </Button>
            </div>
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

      {/* ── TENANT CUSTOM REMARKS SETTINGS MODAL ── */}
      <Dialog open={customRemarksModalOpen} onOpenChange={setCustomRemarksModalOpen}>
        <DialogContent className="sm:max-w-[600px] font-sans max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-neutral-800 dark:text-white flex items-center gap-2">
              <Icon icon="heroicons:cog-6-tooth" className="h-5 w-5 text-indigo-600" />
              Tenant Custom Stage Remarks Templates
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Configure company-wide standard remarks options for your recruiters, pod leads, and account managers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
            {/* Add New Form */}
            <form onSubmit={handleAddCustomRemark} className="p-3 border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-xl space-y-3">
              <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Icon icon="heroicons:plus-circle" className="h-4 w-4" />
                Add New Custom Quick-Pick Remark
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-default-500 uppercase">Target Stage</label>
                  <select
                    value={newRemarkStage}
                    onChange={(e) => setNewRemarkStage(e.target.value)}
                    className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-2 h-8.5 bg-white dark:bg-slate-800 text-default-850"
                  >
                    <option value="review">Internal Screening &amp; Review Gate</option>
                    <option value="l1">Round 1 (L1) — Interview</option>
                    <option value="l2">Round 2 (L2) — Technical Vetting</option>
                    <option value="l3">Round 3 (L3) — Commercial Audit</option>
                    <option value="final">Final Client Milestone</option>
                  </select>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-default-500 uppercase">Remark Text / Template</label>
                  <Input
                    placeholder="e.g. ✓ Resume screened & profile cleared for client submission"
                    value={newRemarkText}
                    onChange={(e) => setNewRemarkText(e.target.value)}
                    className="h-8.5 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={addingRemark || !newRemarkText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-7.5 px-4"
                >
                  {addingRemark ? "Adding..." : "+ Add Option"}
                </Button>
              </div>
            </form>

            {/* List of Custom Remarks */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-default-700 uppercase tracking-wider">Active Custom Remarks by Stage</div>
              {customRemarks.length === 0 ? (
                <div className="text-xs text-default-400 p-4 border border-dashed border-default-200 rounded-lg text-center italic">
                  No tenant-specific custom remarks configured yet. The standard system defaults are active.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {customRemarks.map((rem) => (
                    <div key={rem.id} className="flex items-center justify-between p-2.5 bg-default-50 dark:bg-slate-800/40 rounded-lg border border-default-150 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge className="text-[9px] uppercase font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                          {rem.stage}
                        </Badge>
                        <span className="text-default-800 dark:text-default-200 font-medium">{rem.remarkText}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCustomRemark(rem.id)}
                        className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-7 w-7 p-0"
                      >
                        <Icon icon="heroicons:trash" className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-default-150">
            <Button variant="outline" size="sm" onClick={() => setCustomRemarksModalOpen(false)} className="text-xs">
              Close
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
                  {resolvedTemplates.review.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
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
