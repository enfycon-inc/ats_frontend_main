"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
  XCircle,
  Eye,
  Lock,
  Upload,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { atsApi } from "@/lib/ats-api";
import { mapApiJobToJob, type Job } from "../data/mock-jobs";
import toast from "react-hot-toast";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";

const TIER_STYLES: Record<string, { chip: string; label: string; text: string }> = {
  Strong: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900", label: "Strong Match", text: "text-emerald-600 dark:text-emerald-400" },
  Good:   { chip: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",             label: "Good Match",   text: "text-blue-600 dark:text-blue-400" },
  Fair:   { chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",         label: "Fair Match",   text: "text-amber-600 dark:text-amber-400" },
  Low:    { chip: "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-slate-800 dark:text-neutral-400 dark:border-slate-700", label: "Low Match",    text: "text-neutral-500 dark:text-neutral-400" },
};

function renderPipelineCircles(sub: any) {
  const getStageColor = (status: string | null) => {
    const s = (status || "").toUpperCase();
    if (s === "CLEARED") return "bg-emerald-500 border-emerald-600 dark:bg-emerald-600";
    if (s === "REJECTED") return "bg-rose-500 border-rose-600 dark:bg-rose-600";
    if (s === "SCHEDULED" || s === "PENDING") return "bg-indigo-500 border-indigo-600 dark:bg-indigo-650 ring-2 ring-indigo-150";
    return "bg-neutral-200 border-neutral-300 dark:bg-slate-850 dark:border-slate-750";
  };

  return (
    <div className="flex items-center space-x-1">
      <div className="flex flex-col items-center group relative">
        <div className={`w-3 h-3 rounded-full border ${getStageColor(sub.l1Status)}`} title={`L1: ${sub.l1Status || "PENDING"}`} />
        <span className="text-[9px] font-bold mt-0.5 text-neutral-405">L1</span>
      </div>
      <div className="w-2.5 h-[1.5px] bg-neutral-200 dark:bg-slate-800 mb-2.5" />
      <div className="flex flex-col items-center group relative">
        <div className={`w-3 h-3 rounded-full border ${getStageColor(sub.l2Status)}`} title={`L2: ${sub.l2Status || "Not Started"}`} />
        <span className="text-[9px] font-bold mt-0.5 text-neutral-405">L2</span>
      </div>
      <div className="w-2.5 h-[1.5px] bg-neutral-200 dark:bg-slate-800 mb-2.5" />
      <div className="flex flex-col items-center group relative">
        <div className={`w-3 h-3 rounded-full border ${getStageColor(sub.l3Status)}`} title={`L3: ${sub.l3Status || "Not Started"}`} />
        <span className="text-[9px] font-bold mt-0.5 text-neutral-405">L3</span>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
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

  // User details & permission controls
  const currentUser = useMemo(() => {
    if (typeof window !== "undefined") {
      return atsApi.auth.getCurrentUser();
    }
    return null;
  }, []);

  const roles = useMemo(() => currentUser?.roles || [], [currentUser]);
  const isRecruiterOnly = useMemo(() => {
    return roles.includes("RECRUITER") && !roles.includes("ADMIN") && !roles.includes("SUPER_ADMIN") && !roles.includes("ACCOUNT_MANAGER") && !roles.includes("POD_LEAD");
  }, [roles]);

  const hasEditPermission = useMemo(() => {
    if (!currentUser) return false;
    const permissions = currentUser.permissions || [];
    return permissions.includes("job:edit") || roles.includes("SUPER_ADMIN") || roles.includes("ADMIN") || roles.includes("ACCOUNT_MANAGER") || roles.includes("POD_LEAD");
  }, [currentUser, roles]);

  // Submission Review Dialog states
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [l1Status, setL1Status] = useState("");
  const [l2Status, setL2Status] = useState("");
  const [l3Status, setL3Status] = useState("");
  const [finalStatus, setFinalStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [recruiterComment, setRecruiterComment] = useState("");
  const [submittedRate, setSubmittedRate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Job Approval / Rejection states
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const canApproveJob = useMemo(() => {
    if (!currentUser) return false;
    const permissions = currentUser.permissions || [];
    const isAssigned = Boolean(
      job?.assignedApproverId &&
      (currentUser.dbId === job.assignedApproverId || currentUser.keycloakId === job.assignedApproverId)
    );
    return (
      isAssigned ||
      permissions.includes("job:approve") ||
      roles.includes("SUPER_ADMIN") ||
      roles.includes("ADMIN") ||
      roles.includes("BRANCH_ADMIN")
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
      const [jobData, subsData] = await Promise.all([
        atsApi.jobs.get(id),
        atsApi.submissions.list({ jobId: id }),
      ]);

      setJob(mapApiJobToJob(jobData));
      setSubmissions(Array.isArray(subsData) ? subsData : subsData?.data || []);
      
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
    setL2Status(sub.l2Status || "");
    setL3Status(sub.l3Status || "");
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
      if (isRecruiterOnly) {
        payload.recruiterComment = recruiterComment.trim() || null;
      } else {
        payload.l1Status = l1Status || null;
        payload.l2Status = l2Status || null;
        payload.l3Status = l3Status || null;
        payload.finalStatus = finalStatus;
        payload.remarks = remarks.trim() || null;
        payload.recruiterComment = recruiterComment.trim() || null;
        payload.submittedRate = submittedRate.trim() || null;
      }

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
            <Button
              size="sm"
              onClick={() => setUploadSubmitOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm rounded-lg h-9 text-xs"
            >
              <Upload className="h-3.5 w-3.5" /> Upload & Submit CV
            </Button>
            {hasEditPermission && (
              <Link href={`/job-posting/${job.id}/edit`}>
                <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold gap-1.5 shadow-sm rounded-lg h-9">
                  <Pencil className="h-3.5 w-3.5" /> Edit Job
                </Button>
              </Link>
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              
              {/* Left Description area */}
              <div className="lg:col-span-8 space-y-4">
                <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <h2 className="text-sm font-bold text-neutral-800 dark:text-white flex items-center gap-2 border-b border-neutral-100 dark:border-slate-800 pb-2">
                      <FileText className="h-4 w-4 text-indigo-500" /> Job Description
                    </h2>
                    {job.jobDescription ? (
                      <div
                        className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-none prose dark:prose-invert prose-xs"
                        dangerouslySetInnerHTML={{ __html: job.jobDescription }}
                      />
                    ) : (
                      <p className="text-xs text-neutral-450 italic">No job description provided.</p>
                    )}
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
              <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-none overflow-hidden rounded-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px] text-xs">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-slate-800/40 border-b border-neutral-200 dark:border-slate-800">
                        {["Candidate Details", "Recruiter", "Sourced Rate", "Interview Progress", "Final Status", "Feedback Logs", "Actions"].map((h) => (
                          <th key={h} className="py-2.5 px-4 font-extrabold uppercase text-[10px] tracking-wider text-neutral-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-slate-850">
                      {submissions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-neutral-450 italic">
                            No candidates have been submitted to this requisition pipeline yet.
                          </td>
                        </tr>
                      ) : (
                        submissions.map((sub) => (
                          <tr
                            key={sub.id}
                            onClick={() => openReviewPanel(sub)}
                            className="hover:bg-neutral-50/50 dark:hover:bg-slate-850/20 cursor-pointer transition-all"
                          >
                            <td className="py-3 px-4">
                              <div className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                                {sub.candidateName}
                              </div>
                              <div className="text-[10px] text-neutral-400 mt-0.5">{sub.candidateEmail}</div>
                              {sub.candidateCurrentLocation && (
                                <div className="text-[9px] text-neutral-450 mt-0.5 flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3 text-neutral-400 shrink-0" /> {sub.candidateCurrentLocation}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-neutral-600 dark:text-neutral-350 font-semibold">
                              {sub.recruiterName || "System / API"}
                            </td>
                            <td className="py-3 px-4 font-bold text-neutral-805 dark:text-neutral-200">
                              {sub.submittedRate || "—"}
                            </td>
                            <td className="py-3 px-4">
                              {renderPipelineCircles(sub)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                className={`text-[9px] uppercase tracking-wide font-extrabold border-0 px-2 py-0.5 ${
                                  sub.finalStatus === "JOIN"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : sub.finalStatus === "OFFER"
                                    ? "bg-teal-50 text-teal-700"
                                    : sub.finalStatus === "REJECTED"
                                    ? "bg-rose-100 text-rose-800"
                                    : sub.finalStatus === "PENDING_APPROVAL"
                                    ? "bg-amber-100 text-amber-805"
                                    : "bg-indigo-50 text-indigo-700"
                                }`}
                              >
                                {sub.finalStatus === "PENDING_APPROVAL" ? "Internal Review" : sub.finalStatus === "SUBMITTED" ? "Sent to Client" : sub.finalStatus}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 max-w-[200px] truncate text-neutral-500 font-medium">
                              {sub.remarks || sub.recruiterComment || "—"}
                            </td>
                            <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5">
                                {sub.finalStatus === "PENDING_APPROVAL" && !isRecruiterOnly && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveSubmission(sub.id)}
                                    className="bg-emerald-650 hover:bg-emerald-755 text-white text-[10px] py-1 h-7 font-bold"
                                  >
                                    Approve
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSubForInterview(sub);
                                    setInterviewModalOpen(true);
                                  }}
                                  className="h-7 text-[10px] font-bold border-neutral-300 text-indigo-650 hover:bg-indigo-50"
                                >
                                  <CalendarDays className="h-3 w-3 mr-1" /> Schedule
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadResume(sub.candidateId, sub.candidateName || "Candidate")}
                                  className="h-7 text-indigo-650 p-1 hover:bg-indigo-50/50"
                                  title="Download Resume"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* PIPELINE KANBAN BOARD VIEW */}
            {pipelineView === "kanban" && (
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3 pb-4 overflow-x-auto min-w-max select-none">
                {[
                  { id: "l1", title: "L1 Review", color: "border-t-amber-500 bg-amber-50/5", badge: "bg-amber-100 text-amber-800", subs: submissions.filter((s) => s.finalStatus === "PENDING_APPROVAL" && s.l1Status !== "REJECTED") },
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
                            {renderPipelineCircles(sub)}
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
                          <span className="text-[9px] text-neutral-400">Click [+ Upload & Submit CV] above to add candidates from Dice/LinkedIn</span>
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
                        ) : (
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
                        )}
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
        <DialogContent className="sm:max-w-[450px] font-sans">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-neutral-800 dark:text-white flex items-center gap-1">
              <ClipboardList className="h-4 w-4 text-indigo-500" />
              Candidate Pipeline Stage Review
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Update submission stages for candidate <strong>{selectedSub?.candidateName}</strong> on requisition <strong>{job.jobTitle}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateSubmission} className="space-y-4 text-xs">
            
            {/* Candidate details quickcard */}
            {selectedSub && (
              <div className="p-3 bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm grid grid-cols-2 gap-2 text-[10.5px]">
                <div className="col-span-2 border-b border-neutral-100 dark:border-slate-800 pb-1 flex justify-between font-bold">
                  <span>{selectedSub.candidateName}</span>
                  <span className="text-[9px] text-neutral-400">ID: {selectedSub.candidateId}</span>
                </div>
                <div>
                  <span className="text-neutral-450 block">Designation</span>
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300 truncate block">{selectedSub.candidateDesignation || "Not Specified"}</span>
                </div>
                <div>
                  <span className="text-neutral-450 block">Experience</span>
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300 block">{selectedSub.candidateExperience ? `${selectedSub.candidateExperience} Yrs` : "N/A"}</span>
                </div>
                <div>
                  <span className="text-neutral-450 block">Email Address</span>
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300 truncate block">{selectedSub.candidateEmail}</span>
                </div>
                <div>
                  <span className="text-neutral-450 block">Work Auth</span>
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300 block truncate">{selectedSub.candidateWorkAuth || "N/A"}</span>
                </div>
              </div>
            )}

            {/* Status Selectors (Admins/AMs only) */}
            {!isRecruiterOnly ? (
              <div className="space-y-3.5 pt-2">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-450 uppercase">L1 Status</label>
                    <select
                      value={l1Status}
                      onChange={(e) => setL1Status(e.target.value)}
                      className="w-full border border-neutral-300 dark:border-slate-700 rounded h-8 bg-transparent text-xs outline-none cursor-pointer"
                    >
                      <option value="">Pending</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="CLEARED">Cleared</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-450 uppercase">L2 Status</label>
                    <select
                      value={l2Status}
                      onChange={(e) => setL2Status(e.target.value)}
                      className="w-full border border-neutral-300 dark:border-slate-700 rounded h-8 bg-transparent text-xs outline-none cursor-pointer"
                    >
                      <option value="">Not Started</option>
                      <option value="PENDING">Pending</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="CLEARED">Cleared</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-450 uppercase">L3 Status</label>
                    <select
                      value={l3Status}
                      onChange={(e) => setL3Status(e.target.value)}
                      className="w-full border border-neutral-300 dark:border-slate-700 rounded h-8 bg-transparent text-xs outline-none cursor-pointer"
                    >
                      <option value="">Not Started</option>
                      <option value="PENDING">Pending</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="CLEARED">Cleared</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-450 uppercase block">Submission Status</label>
                    <select
                      value={finalStatus}
                      onChange={(e) => setFinalStatus(e.target.value)}
                      className="w-full border border-neutral-300 dark:border-slate-700 rounded h-8 bg-transparent text-xs outline-none cursor-pointer font-bold"
                    >
                      <option value="PENDING_APPROVAL">Pending Review</option>
                      <option value="SUBMITTED">Submitted to Client</option>
                      <option value="OFFER">Offer Stage</option>
                      <option value="JOIN">Joined / Placed</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-450 uppercase block">Submitted Pay Rate</label>
                    <Input
                      value={submittedRate}
                      onChange={(e) => setSubmittedRate(e.target.value)}
                      className="h-8 text-xs font-semibold"
                      placeholder="e.g. $70/hr or 15 LPA"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-450 uppercase block">Manager Feedback / Remarks</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full min-h-12 border border-neutral-300 dark:border-slate-700 rounded p-2 text-xs bg-transparent outline-none focus:border-indigo-500"
                    placeholder="Enter manager feedback notes..."
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50/15 rounded border border-amber-100 text-[11px] text-amber-800">
                ⚠️ As a recruiter, you have view-only access to pipeline interview stages. You can update comments below.
              </div>
            )}

            <div className="space-y-1 pt-1">
              <label className="text-[10px] font-bold text-neutral-450 uppercase block">Recruiter Submission Note</label>
              <textarea
                value={recruiterComment}
                onChange={(e) => setRecruiterComment(e.target.value)}
                className="w-full min-h-12 border border-neutral-300 dark:border-slate-700 rounded p-2 text-xs bg-transparent outline-none focus:border-indigo-500"
                placeholder="Recruiter comments or screening summary notes..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setReviewOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
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
              className="bg-indigo-650 hover:bg-indigo-755 text-white text-xs font-bold"
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
                className="w-full p-2.5 border border-neutral-300 dark:border-slate-700 rounded-lg bg-transparent text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-neutral-100 dark:border-slate-800 gap-2">
              <Button type="button" variant="outline" onClick={() => setUploadSubmitOpen(false)} className="text-xs h-9">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploadingCv || !uploadFile}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-9 shadow-sm"
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
              <span className="text-neutral-500 font-medium">Submitted By:</span>
              <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{job?.createdBy}</span>
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
    </div>
  );
}
