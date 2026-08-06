"use client";

import React, { useEffect, useState } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";

interface Submission {
  id: number;
  jobId: string;
  candidateId: number;
  recruiterId: string;
  l1Status: "PENDING" | "SCHEDULED" | "CLEARED" | "REJECTED" | null;
  l1Date: string | null;
  l2Status: "PENDING" | "SCHEDULED" | "CLEARED" | "REJECTED" | null;
  l2Date: string | null;
  l3Status: "PENDING" | "SCHEDULED" | "CLEARED" | "REJECTED" | null;
  l3Date: string | null;
  finalStatus: "PENDING_APPROVAL" | "SUBMITTED" | "REJECTED" | "OFFER" | "JOIN";
  remarks: string | null;
  recruiterComment: string | null;
  reviewFeedback: string | null; // AM/Pod Head feedback written during internal review
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
  const getStageColor = (status: string | null) => {
    const s = (status || "").toUpperCase();
    if (s === "CLEARED") return "bg-emerald-500 border-emerald-600 dark:bg-emerald-600";
    if (s === "REJECTED") return "bg-rose-500 border-rose-600 dark:bg-rose-600";
    if (s === "SCHEDULED" || s === "PENDING") return "bg-indigo-500 border-indigo-600 dark:bg-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-950";
    return "bg-slate-200 border-slate-350 dark:bg-slate-800 dark:border-slate-700";
  };

  const getStageText = (status: string | null) => {
    const s = (status || "").toUpperCase();
    return s || "Not Started";
  };

  return (
    <div className="flex items-center space-x-2">
      {/* L1 */}
      <div className="flex flex-col items-center group relative">
        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${getStageColor(sub.l1Status)}`} title={`L1: ${getStageText(sub.l1Status)}`} />
        <span className="text-[10px] font-bold mt-1 text-default-500">L1</span>
      </div>
      <div className={`w-5 h-[2px] mb-4.5 ${(sub.l1Status === "CLEARED") ? "bg-emerald-500" : "bg-default-200 dark:bg-slate-800"}`} />
      
      {/* L2 */}
      <div className="flex flex-col items-center group relative">
        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${getStageColor(sub.l2Status)}`} title={`L2: ${getStageText(sub.l2Status)}`} />
        <span className="text-[10px] font-bold mt-1 text-default-500">L2</span>
      </div>
      <div className={`w-5 h-[2px] mb-4.5 ${(sub.l2Status === "CLEARED") ? "bg-emerald-500" : "bg-default-200 dark:bg-slate-800"}`} />

      {/* L3 */}
      <div className="flex flex-col items-center group relative">
        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${getStageColor(sub.l3Status)}`} title={`L3: ${getStageText(sub.l3Status)}`} />
        <span className="text-[10px] font-bold mt-1 text-default-500">L3</span>
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
  const [l2Status, setL2Status] = useState<any>("");
  const [l2Date, setL2Date] = useState("");
  const [l3Status, setL3Status] = useState<any>("");
  const [l3Date, setL3Date] = useState("");
  const [finalStatus, setFinalStatus] = useState<any>("");
  const [remarks, setRemarks] = useState("");
  const [recruiterComment, setRecruiterComment] = useState("");
  const [submittedRate, setSubmittedRate] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState(""); // AM/Pod feedback for recruiter

  useEffect(() => {
    const user = atsApi.auth.getCurrentUser();
    setCurrentUser(user);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = atsApi.auth.getCurrentUser();
      
      const [submissionsData, statsData] = await Promise.all([
        atsApi.submissions.list({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          finalStatus: statusFilter || undefined,
        }),
        atsApi.submissions.getTrackerStats(),
      ]);

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
    setL2Status(sub.l2Status || "");
    setL2Date(sub.l2Date ? sub.l2Date.slice(0, 16) : "");
    setL3Status(sub.l3Status || "");
    setL3Date(sub.l3Date ? sub.l3Date.slice(0, 16) : "");
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

  const handleUpdateSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    // Check user roles
    const roles = currentUser?.roles || [];
    const isRecruiterOnly = roles.includes("RECRUITER") && !roles.includes("ADMIN") && !roles.includes("SUPER_ADMIN") && !roles.includes("ACCOUNT_MANAGER") && !roles.includes("POD_LEAD");

    try {
      setSubmitting(true);
      
      const payload: any = {};
      if (isRecruiterOnly) {
        // Recruiters can only update their own comment
        payload.recruiterComment = recruiterComment.trim() || null;
      } else {
        // AM / Pod Lead / Admin can edit all
        payload.l1Status = l1Status || null;
        payload.l1Date = l1Date ? new Date(l1Date).toISOString() : null;
        payload.l2Status = l2Status || null;
        payload.l2Date = l2Date ? new Date(l2Date).toISOString() : null;
        payload.l3Status = l3Status || null;
        payload.l3Date = l3Date ? new Date(l3Date).toISOString() : null;
        payload.finalStatus = finalStatus;
        payload.remarks = remarks.trim() || null;
        payload.recruiterComment = recruiterComment.trim() || null;
        payload.submittedRate = submittedRate.trim() || null;
        payload.reviewFeedback = reviewFeedback.trim() || null;
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

  // Determine user editing capabilities
  const roles = currentUser?.roles || [];
  const isRecruiterOnly = roles.includes("RECRUITER") && !roles.includes("ADMIN") && !roles.includes("SUPER_ADMIN") && !roles.includes("ACCOUNT_MANAGER") && !roles.includes("POD_LEAD");

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
            { label: "L1 Pending Review", value: stats.l1Pending, icon: "heroicons:user", color: "amber" },
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
                    {["Job Requisition", "Account Manager", "Recruiter", "Candidate Details", "Pay Rate", "Pipeline Progress", "Status", "Remarks / Feedback", "Sourced On", "Actions"].map((h) => (
                      <th key={h} className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-wider text-default-600">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-default-500 font-semibold italic">
                        <div className="flex flex-col items-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                          <span>Loading candidate submissions…</span>
                        </div>
                      </td>
                    </tr>
                  ) : submissions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-default-500 font-semibold italic">
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
                        {/* Job Requisition */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="font-bold text-default-900 flex items-center gap-1.5">
                              <span className="text-xs">{sub.jobTitle}</span>
                              <Badge className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-0 text-[9px] py-0 px-1 font-bold">
                                {sub.jobCode}
                              </Badge>
                            </div>
                            <div className="text-[10px] text-default-500 font-semibold">
                              Client: <span className="text-default-700">{sub.clientName || "—"}</span>
                            </div>
                          </div>
                        </td>

                        {/* Account Manager */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-semibold text-default-855 text-xs">
                            {sub.accountManagerName || "—"}
                          </div>
                        </td>

                        {/* Recruiter */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-semibold text-default-855 text-xs">
                            {sub.recruiterName || "—"}
                          </div>
                        </td>

                        {/* Candidate Details */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <div className="text-default-900 font-bold text-sm">{sub.candidateName}</div>
                            <div className="text-[10px] text-default-455 font-normal">{sub.candidateEmail}</div>
                            {sub.candidatePhone && (
                              <div className="text-[9px] text-default-400 font-normal">{sub.candidatePhone}</div>
                            )}
                            {sub.candidateCurrentLocation && (
                              <div className="text-[9px] text-default-400 font-normal flex items-center gap-0.5 mt-0.5">
                                <Icon icon="heroicons:map-pin" className="h-2.5 w-2.5" />
                                {sub.candidateCurrentLocation}
                              </div>
                            )}
                            <div 
                              className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors w-fit"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadResume(sub.candidateId, sub.candidateName || "Candidate");
                              }}
                            >
                              <Icon icon="heroicons:document-arrow-down" className="h-3 w-3" />
                              View / Download CV
                            </div>
                          </div>
                        </td>

                        {/* Submitted Rate */}
                        <td className="py-4 px-4 whitespace-nowrap text-xs font-semibold text-default-700">
                          {formatSubmittedRate(sub.submittedRate, sub.market, sub.jobCode, sub.jobTitle)}
                        </td>

                        {/* Pipeline Progress (L1, L2, L3 visual) */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {renderPipelineProgress(sub)}
                        </td>

                        {/* Status + Approve Action — compact inline */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {sub.finalStatus === "PENDING_APPROVAL" ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge className="bg-amber-100 text-amber-800 text-[9px] uppercase tracking-wider font-bold border-0 px-2 py-1 shrink-0">
                                Pending
                              </Badge>
                              {(() => {
                                const roles = currentUser?.roles || [];
                                const canApprove = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN") || roles.includes("ACCOUNT_MANAGER") || roles.includes("POD_LEAD") || roles.includes("DELIVERY_HEAD");
                                if (!canApprove) return null;
                                return (
                                  <Button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await atsApi.submissions.update(sub.id, { finalStatus: "SUBMITTED" });
                                        toast.success("Submission approved!");
                                        loadData();
                                      } catch (err: any) {
                                        toast.error("Failed to approve: " + err.message);
                                      }
                                    }}
                                    className="h-6 px-2 text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 font-bold rounded-md shrink-0"
                                  >
                                    ✓ Approve
                                  </Button>
                                );
                              })()}
                            </div>
                          ) : (
                            <Badge className={`text-[9px] uppercase tracking-wider font-bold border-0 px-2 py-1 ${
                              sub.finalStatus === "JOIN" ? "bg-emerald-100 text-emerald-800" :
                              sub.finalStatus === "OFFER" ? "bg-teal-50 text-teal-700" :
                              sub.finalStatus === "REJECTED" ? "bg-rose-100 text-rose-800" :
                              "bg-indigo-50 text-indigo-700"
                            }`}>
                              {sub.finalStatus === "SUBMITTED" ? "Submitted to Client" : sub.finalStatus}
                            </Badge>
                          )}
                        </td>

                        {/* Remarks / Feedback */}
                        <td className="py-4 px-4 max-w-[200px] truncate text-xs text-default-600 font-medium" title={`Recruiter Comment: ${sub.recruiterComment || '—'}\nManager Remarks: ${sub.remarks || '—'}`}>
                          <div className="flex flex-col gap-0.5">
                            {sub.recruiterComment && (
                              <div>
                                <span className="text-[9px] text-default-455 uppercase font-bold">Recruiter:</span>
                                <p className="truncate text-default-700 font-medium mt-0.5">{sub.recruiterComment}</p>
                              </div>
                            )}
                            {sub.remarks && (
                              <div className="mt-1 border-t border-default-100 pt-1">
                                <span className="text-[9px] text-default-455 uppercase font-bold">Remarks:</span>
                                <p className="truncate text-default-600 italic font-semibold mt-0.5">{sub.remarks}</p>
                              </div>
                            )}
                            {!sub.recruiterComment && !sub.remarks && <span className="text-default-400 italic">—</span>}
                          </div>
                        </td>

                        {/* Sourced On */}
                        <td className="py-4 px-4 whitespace-nowrap text-default-500 font-medium">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </td>

                        {/* Actions (Kebab Menu) */}
                        <td className="py-4 px-4 whitespace-nowrap text-right">
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
                            <DropdownMenuContent align="end" className="w-36 rounded-xl shadow-lg border-default-200">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditPanel(sub);
                                }}
                                className="text-xs cursor-pointer gap-2 font-medium"
                              >
                                <Icon icon="heroicons:pencil-square" className="h-4 w-4 text-indigo-500" />
                                Edit status
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubForInterview(sub);
                                  setInterviewModalOpen(true);
                                }}
                                className="text-xs cursor-pointer gap-2 font-medium"
                              >
                                <Icon icon="heroicons:calendar-days" className="h-4 w-4 text-purple-500" />
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
                                View Details (CV)
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
                title: "L1 Review",
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

                {/* ── ZONE A: Internal Review (only shown when PENDING_APPROVAL) ── */}
                {selectedSubmission?.finalStatus === "PENDING_APPROVAL" && (
                  <div className="border border-amber-200 dark:border-amber-900/40 rounded-xl overflow-hidden">
                    <div className="bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 flex items-center gap-2 border-b border-amber-200 dark:border-amber-900/40">
                      <Icon icon="heroicons:clock" className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Step 1 — Internal Review</span>
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
                      {!isRecruiterOnly && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-default-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Icon icon="heroicons:pencil" className="h-3 w-3 text-indigo-500" />
                            Your Feedback to Recruiter
                            <span className="text-default-400 font-normal normal-case tracking-normal">— visible to recruiter</span>
                          </label>
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
                      {!isRecruiterOnly && (() => {
                        const roles = currentUser?.roles || [];
                        const canApprove = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN") || roles.includes("ACCOUNT_MANAGER") || roles.includes("POD_LEAD") || roles.includes("DELIVERY_HEAD");
                        if (!canApprove) return null;
                        return (
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
                              Approve & Submit
                            </Button>
                          </div>
                        );
                      })()}

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
                          <span className="text-[10px] font-bold text-default-500 uppercase tracking-wider">Step 2 — Interview Rounds</span>
                          <div className="h-px flex-1 bg-default-150" />
                        </div>

                        {/* L1 Stage */}
                        <div className="space-y-2 p-3 border border-default-100 rounded-lg dark:bg-slate-800/10">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-default-850">L1 — Round 1</label>
                            <Badge className="bg-slate-100 text-slate-600 text-[8px] border-0 py-0.5">{l1Status || "PENDING"}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={l1Status}
                              onChange={(e) => handleL1Change(e.target.value)}
                              className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-2 h-8 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                            >
                              <option value="">— PENDING —</option>
                              <option value="SCHEDULED">SCHEDULED</option>
                              <option value="CLEARED">CLEARED</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
                            <Input type="datetime-local" value={l1Date} onChange={(e) => setL1Date(e.target.value)} className="h-8 text-[10px]" />
                          </div>
                        </div>

                        {/* L2 Stage */}
                        <div className={`space-y-2 p-3 border border-default-100 rounded-lg dark:bg-slate-800/10 transition-opacity ${isL1Rejected ? "opacity-40 pointer-events-none" : ""}` }>
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-default-850">L2 — Round 2</label>
                            <Badge className="bg-slate-100 text-slate-600 text-[8px] border-0 py-0.5">{l2Status || "Not Started"}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select value={l2Status} onChange={(e) => handleL2Change(e.target.value)} disabled={isL1Rejected} className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-2 h-8 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600">
                              <option value="">— Not Started —</option>
                              <option value="PENDING">PENDING</option>
                              <option value="SCHEDULED">SCHEDULED</option>
                              <option value="CLEARED">CLEARED</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
                            <Input type="datetime-local" value={l2Date} onChange={(e) => setL2Date(e.target.value)} disabled={isL1Rejected} className="h-8 text-[10px]" />
                          </div>
                        </div>

                        {/* L3 Stage */}
                        <div className={`space-y-2 p-3 border border-default-100 rounded-lg dark:bg-slate-800/10 transition-opacity ${(isL1Rejected || isL2Rejected) ? "opacity-40 pointer-events-none" : ""}`}>
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-default-850">L3 — Final Round</label>
                            <Badge className="bg-slate-100 text-slate-600 text-[8px] border-0 py-0.5">{l3Status || "Not Started"}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select value={l3Status} onChange={(e) => handleL3Change(e.target.value)} disabled={isL1Rejected || isL2Rejected} className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-2 h-8 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600">
                              <option value="">— Not Started —</option>
                              <option value="PENDING">PENDING</option>
                              <option value="SCHEDULED">SCHEDULED</option>
                              <option value="CLEARED">CLEARED</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
                            <Input type="datetime-local" value={l3Date} onChange={(e) => setL3Date(e.target.value)} disabled={isL1Rejected || isL2Rejected} className="h-8 text-[10px]" />
                          </div>
                        </div>

                        {/* Final Status override */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-default-800 block">Final Status</label>
                          <select value={finalStatus} onChange={(e) => setFinalStatus(e.target.value)} className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-3 h-8 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600">
                            <option value="SUBMITTED">SUBMITTED — Sent to Client</option>
                            <option value="REJECTED">REJECTED</option>
                            <option value="OFFER">OFFER — Offer Extended</option>
                            <option value="JOIN">JOIN — Placed / Joined</option>
                          </select>
                        </div>

                        {/* Remarks from AM for client feedback */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-default-800 block flex items-center gap-1.5">
                            <Icon icon="heroicons:document-text" className="h-3.5 w-3.5 text-default-400" />
                            Client / Interview Remarks
                          </label>
                          <textarea
                            placeholder="Client feedback, interview notes, reason for rejection..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-3 py-2 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 resize-none"
                            rows={3}
                          />
                        </div>
                      </>
                    )}
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
    </div>
  );
}
