"use client";

import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { JobSubmissions } from "@/components/submissions/job-submissions";
import { jobLocationDisplay } from "@/lib/job-location";
import type { TrackerResponse, TrackerSubmission } from "@/lib/submission-contract";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, Sparkles, DollarSign, Briefcase, MapPin, CreditCard, Building2, Clock, Zap, AlertCircle, User, UserPlus, ClipboardList, RefreshCw, Loader2, FileText, CheckCircle, XCircle, Upload, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { JobDescriptionView } from "@/components/ui/job-description-view";




import { atsApi } from "@/lib/ats-api";
import { CandidateSubmissionModal } from "@/components/job-posting/CandidateSubmissionModal";
import { mapApiJobToJob, type Job } from "../data/mock-jobs";
import toast from "react-hot-toast";
import { DelegateJobModal } from "@/components/shared/delegate-job-modal";
import { getActiveRolePermissions, resolveActiveSystemRole, CustomRoleDefinition } from "@/lib/role-permissions";
import { getDashboardRoleSelection } from "@/lib/dashboard-role";

const TIER_STYLES: Record<string, { chip: string; label: string; text: string }> = {
  Strong: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900", label: "Strong Match", text: "text-emerald-600 dark:text-emerald-400" },
  Good:   { chip: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",             label: "Good Match",   text: "text-blue-600 dark:text-blue-400" },
  Fair:   { chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",         label: "Fair Match",   text: "text-amber-600 dark:text-amber-400" },
  Low:    { chip: "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-slate-800 dark:text-neutral-400 dark:border-slate-700", label: "Low Match",    text: "text-neutral-500 dark:text-neutral-400" },
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = String(params?.id || "");

  // States
  const [job, setJob] = useState<Job | null>(null);
  const [submissions, setSubmissions] = useState<TrackerSubmission[]>([]);
  const [submissionResponse, setSubmissionResponse] = useState<TrackerResponse | null>(null);
  const [aiMatches, setAiMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "pipeline" | "matches">("details");

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
    const isDelegatedView = useMemo(() => {
    if (!currentUser || !job) return false;
    const permissions = currentUser.permissions || [];
    const isTenantAdmin = permissions.some((p: string) => ["tenant:manage", "tenant:settings"].includes(p));
    if (isTenantAdmin) return false;
    return Boolean(currentUser.branchId && job.branchId && currentUser.branchId !== job.branchId);
  }, [currentUser, job]);

  const isAM = activeSystemRole === "ACCOUNT_MANAGER";
  const isPodLead = activeSystemRole === "POD_LEAD";
  const canSubmitCandidate = job?.capabilities?.submitCandidate === true;

  const hasEditPermission = useMemo(() => {
    if (!currentUser) return false;
    return job?.capabilities?.edit === true;
  }, [currentUser, job]);

  const [submitting, setSubmitting] = useState(false);
  const [publication, setPublication] = useState({ published: false, slug: null as string | null, description: '', eligible: false, visible: false });
  const [publicationOpen, setPublicationOpen] = useState(false);
  const [publicationSaving, setPublicationSaving] = useState(false);
  const [publicationError, setPublicationError] = useState('');
  const canManagePublication = job?.capabilities?.managePublication === true;
  async function savePublication() {
    const publish = !publication.published;
    setPublicationSaving(true); setPublicationError('');
    try {
      const result = await atsApi.jobs.setPublication(id, publish);
      setPublication(previous => ({ ...previous, published: result.isPubliclyPublished, visible: result.isPubliclyPublished, slug: result.publicSlug, description: previous.description }));
      setPublicationOpen(false);
      toast.success(publish ? 'Job published to the website feed.' : 'Job removed from the website feed.');
    } catch (error: any) { setPublicationError(error.message || 'Could not update website publication.'); }
    finally { setPublicationSaving(false); }
  }


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
    setMatchesError('');
    try {
      const matchesData = await atsApi.jobs.matches(id, { limit: 15 });
      if (matchesData && matchesData.matches) {
        setAiMatches(matchesData.matches);
      }
    } catch (err: any) {
      setMatchesError(err.message || "Could not load AI matches.");
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
      const subsData = await atsApi.submissions.list({ jobId: id, page: 1, limit: 20 });

      setJob(mapApiJobToJob(jobData));
      setPublication({ published: Boolean(jobData.isPubliclyPublished), slug: jobData.publicSlug || null, description: jobData.publicDescription || '', visible: Boolean(jobData.isPubliclyPublished) && ['ACTIVE', 'CLOSED'].includes(String(jobData.jobStatus).toUpperCase()) && (!jobData.approvalStatus || jobData.approvalStatus === 'APPROVED'), eligible: String(jobData.jobStatus).toUpperCase() === 'ACTIVE' && (!jobData.approvalStatus || jobData.approvalStatus === 'APPROVED') });
      setSubmissions(subsData.data);
      setSubmissionResponse(subsData);

      // Fetch matches asynchronously so it doesn't block UI load
      if (jobData.capabilities?.findMatches) loadMatches();
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

  const handleDownloadResume = async (candId: string | number, name: string) => {
    try {
      const blob = await atsApi.candidates.fetchResumeBlob(candId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const extension = blob.type === 'application/pdf' ? '.pdf' : blob.type === 'application/msword' ? '.doc'
        : blob.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? '.docx' : '';
      link.setAttribute("download", `${name.replace(/[\\/\r\n\s]+/g, "_")}_Resume${extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      toast.success("Resume downloaded successfully!");
    } catch (err: any) {
      toast.error("Failed to fetch resume blob: " + err.message);
    }
  };

  if (loading) {
    return (
      <PageLoadingSkeleton variant="detail" />
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

  const totalSubCount = submissionResponse?.total ?? 0;

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
              <h2 className="text-xl font-black text-neutral-900 dark:text-white mb-2">
                {job.jobTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-neutral-500 font-medium">
                <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-neutral-400" /> {job.client} {job.clientJobId !== "N/A" ? `→ ${job.clientJobId}` : ""}</span>
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-neutral-400" /> {jobLocationDisplay(job)}</span>
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
            {(canSubmitCandidate || String(job?.jobStatus).toLowerCase() === "closed") && (
              <Button
                size="sm"
                disabled={!canSubmitCandidate}
                title={!canSubmitCandidate ? "This job is closed." : undefined}
                onClick={() => setUploadSubmitOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm rounded-lg h-9 text-xs cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" /> Submit New Candidate
              </Button>
            )}
            {canManagePublication && <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{publication.published ? (publication.visible ? 'Published to website' : 'Automatic publication pending') : 'Not published to website'}</Badge>
              <Button variant="outline" size="sm" className="h-9 text-xs border-blue-300 text-blue-800 dark:text-blue-200" disabled={publicationSaving || !publication.eligible} title={!publication.eligible ? 'Only active, approved jobs can be published or unpublished.' : undefined} onClick={() => { setPublicationError(''); setPublicationOpen(true); }}>
                <Share2 className="mr-1.5 h-3.5 w-3.5" />{publication.published ? 'Unpublish from website' : 'Publish to website'}
              </Button>
            </div>}

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

      <Dialog open={publicationOpen} onOpenChange={open => { if (!publicationSaving) setPublicationOpen(open); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle className="text-lg">{publication.published ? 'Unpublish from website' : 'Publish to website'}</DialogTitle><DialogDescription>
            {publication.published ? 'This job will stop appearing in the public jobs API and stop accepting website applications. Existing submissions are retained. Website caches may take time to refresh.' : 'The existing job description will be used on the careers website. The job will be visible to website clients with matching access scope.'}
          </DialogDescription></DialogHeader>
          {publication.slug && <p className="break-all text-xs text-muted-foreground">Public slug: {publication.slug}</p>}
          {publicationError && <p role="alert" className="text-xs text-red-700">{publicationError}</p>}
          <DialogFooter><Button variant="outline" disabled={publicationSaving} onClick={() => setPublicationOpen(false)}>Cancel</Button><Button disabled={publicationSaving} onClick={() => void savePublication()} className="bg-[#1a4fa0] text-white hover:bg-[#154181]">{publicationSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{publication.published ? 'Unpublish job' : 'Publish job'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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
                Created by <strong>{job.createdBy || "Account Manager"}</strong>. Assigned Reviewer: <strong>{job.assignedApproverName || ("Assigned Reviewer")}</strong>. This requirement is <strong>hidden from recruiters</strong> until approved.
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
          <ClipboardList className="h-4 w-4" /> Pipeline ({totalSubCount})
        </button>
        {job?.capabilities?.findMatches && <button
          onClick={() => setActiveTab("matches")}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 border-transparent -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            activeTab === "matches"
              ? "text-indigo-650 border-indigo-600 font-extrabold bg-indigo-50/20"
              : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/50"
          }`}
        >
          <Sparkles className="h-4 w-4" /> AI Candidate Matches {matchesLoading ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : `(${aiMatches.length})`}
        </button>}
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
                  <span className="text-2xl font-black text-neutral-800 dark:text-white">{totalSubCount}</span>
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
                  <span>{Math.min(100, Math.round((totalSubCount / (job.submissionRequired || 1)) * 100))}%</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((totalSubCount / (job.submissionRequired || 1)) * 100))}%` }}
                  />
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

              {/* Left Description area */}
              <div className="lg:col-span-8 space-y-4 min-w-0">
                <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
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
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block">{job.jobType || (job as any).businessUnit || 'N/A'}</span>
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

                {/* Created By */}
                <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-xs font-bold text-neutral-800 dark:text-white">Created By</h3>

                    <div className="flex items-center gap-4 bg-neutral-50 dark:bg-slate-850 p-3 rounded-lg border border-neutral-100 dark:border-slate-800">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white dark:bg-slate-800 shadow-sm border border-neutral-100 dark:border-slate-700 shrink-0">
                        <User className="h-4 w-4 text-neutral-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] uppercase font-bold text-neutral-450 block tracking-wider mb-0.5">Created By</span>
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block truncate">
                          {job.createdBy || job.accountManagerName || "System Admin"}
                        </span>
                        {(job.creatorEmail || job.accountManagerEmail) && (
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block truncate">
                            {job.creatorEmail || job.accountManagerEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUBMISSIONS PIPELINE */}
        {activeTab === "pipeline" && submissionResponse && (
          <Card className="rounded-xl border border-border bg-card p-4">
            <JobSubmissions jobId={String(id)} jobType={job.jobType} market={job.market} initialResponse={submissionResponse} onSaved={loadData} showBoard showStageFilters={false} />
          </Card>
        )}

        {/* TAB 3: AI CANDIDATE MATCHES */}
        {activeTab === "matches" && job?.capabilities?.findMatches && (
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

            {matchesError && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800">{matchesError}</p>}
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
                            {match.currentTitle} {"\u2022"} {match.location || "Location N/A"} {"\u2022"} {match.experienceYears} Years Exp
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
                        {effectivePerms.includes("candidate:download_resume") && (<Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadResume(match.candidateId, match.fullName || "Candidate")}
                          className="h-8 border-neutral-255 text-xs font-bold"
                        >
                          CV
                        </Button>)}
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

      <CandidateSubmissionModal open={uploadSubmitOpen} onOpenChange={setUploadSubmitOpen} job={job} onSuccess={loadData} />
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
              {!isDelegatedView && (<><span className="text-neutral-500 font-medium">Assigned To:</span>
<span className="text-neutral-800 dark:text-neutral-200 font-semibold">{job?.podName || job?.recruiter || "Unassigned"}</span></>)}
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
