"use client";

import React, { useEffect, useState, useTransition } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Define Kanban Pipeline Stage Structure
interface PipelineStage {
  id: string;
  title: string;
  badgeColor: string;
  icon: string;
  count: number;
}

const STAGES: PipelineStage[] = [
  { id: "PENDING_APPROVAL", title: "Sourced (Pending TL)", badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400", icon: "heroicons:inbox-arrow-down", count: 0 },
  { id: "SUBMITTED", title: "Internal Approved", badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400", icon: "heroicons:check-badge", count: 0 },
  { id: "L1", title: "L1 Interview", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400", icon: "heroicons:chat-bubble-bottom-center-text", count: 0 },
  { id: "L2", title: "L2 Tech Round", badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400", icon: "heroicons:code-bracket-square", count: 0 },
  { id: "L3", title: "L3 Client / HR", badgeColor: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400", icon: "heroicons:user-group", count: 0 },
  { id: "OFFER", title: "Offer / Placed", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400", icon: "heroicons:trophy", count: 0 },
  { id: "REJECTED", title: "Rejected", badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400", icon: "heroicons:x-circle", count: 0 },
];

export default function PipelinePage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string>("ALL");
  const [draggedCardId, setDraggedCardId] = useState<number | null>(null);

  // Selected Submission for Evaluation Modal
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"pod_lead" | "l1" | "l2" | "l3" | "final">("l1");

  // Form State for Stage Modal Updates
  const [formData, setFormData] = useState({
    podLeadRemarks: "",
    l1Status: "PENDING",
    l1Date: "",
    l1Interviewer: "",
    l1Remarks: "",
    l2Status: "PENDING",
    l2Date: "",
    l2Interviewer: "",
    l2Remarks: "",
    l3Status: "PENDING",
    l3Date: "",
    l3Interviewer: "",
    l3Remarks: "",
    finalStatus: "SUBMITTED",
    remarks: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPipelineData();
  }, []);

  async function loadPipelineData() {
    setLoading(true);
    try {
      const [subsData, jobsData] = await Promise.all([
        atsApi.submissions.list({ limit: 200 }),
        atsApi.jobs.list().catch(() => []),
      ]);
      setSubmissions(subsData?.data || []);
      setJobs(jobsData || []);
    } catch (err: any) {
      console.error("Failed to load pipeline submissions:", err);
      toast.error("Failed to load pipeline board");
    } finally {
      setLoading(false);
    }
  }

  // Determine stage category for a submission
  const getSubmissionStageId = (sub: any): string => {
    if (sub.finalStatus === "REJECTED" || sub.l1Status === "REJECTED" || sub.l2Status === "REJECTED" || sub.l3Status === "REJECTED") {
      return "REJECTED";
    }
    if (sub.finalStatus === "OFFER" || sub.finalStatus === "JOIN") {
      return "OFFER";
    }
    if (sub.l3Status === "SCHEDULED" || sub.l3Status === "CLEARED" || sub.l3Date) {
      return "L3";
    }
    if (sub.l2Status === "SCHEDULED" || sub.l2Status === "CLEARED" || sub.l2Date) {
      return "L2";
    }
    if (sub.l1Status === "SCHEDULED" || sub.l1Status === "CLEARED" || sub.l1Date) {
      return "L1";
    }
    if (sub.finalStatus === "SUBMITTED") {
      return "SUBMITTED";
    }
    return "PENDING_APPROVAL";
  };

  // Filtered submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesJob = selectedJobId === "ALL" || sub.jobId === selectedJobId;
    const matchesSearch =
      !search ||
      sub.candidateName?.toLowerCase().includes(search.toLowerCase()) ||
      sub.jobTitle?.toLowerCase().includes(search.toLowerCase()) ||
      sub.jobCode?.toLowerCase().includes(search.toLowerCase()) ||
      sub.recruiterName?.toLowerCase().includes(search.toLowerCase());

    return matchesJob && matchesSearch;
  });

  // Calculate Stage Counts
  const stageCounts = STAGES.map((stage) => {
    const count = filteredSubmissions.filter((sub) => getSubmissionStageId(sub) === stage.id).length;
    return { ...stage, count };
  });

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedCardId(id);
    e.dataTransfer.setData("text/plain", id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    if (!draggedCardId) return;

    const sub = submissions.find((s) => s.id === draggedCardId);
    if (!sub) return;

    const currentStage = getSubmissionStageId(sub);
    if (currentStage === targetStageId) return;

    // Build update payload based on target stage
    const updatePayload: Record<string, any> = {};

    if (targetStageId === "REJECTED") {
      updatePayload.finalStatus = "REJECTED";
    } else if (targetStageId === "OFFER") {
      updatePayload.finalStatus = "OFFER";
    } else if (targetStageId === "L1") {
      updatePayload.l1Status = "SCHEDULED";
      if (sub.finalStatus === "PENDING_APPROVAL") updatePayload.finalStatus = "SUBMITTED";
    } else if (targetStageId === "L2") {
      updatePayload.l1Status = "CLEARED";
      updatePayload.l2Status = "SCHEDULED";
      if (sub.finalStatus === "PENDING_APPROVAL") updatePayload.finalStatus = "SUBMITTED";
    } else if (targetStageId === "L3") {
      updatePayload.l2Status = "CLEARED";
      updatePayload.l3Status = "SCHEDULED";
      if (sub.finalStatus === "PENDING_APPROVAL") updatePayload.finalStatus = "SUBMITTED";
    } else if (targetStageId === "SUBMITTED") {
      updatePayload.finalStatus = "SUBMITTED";
    }

    // Optimistic Update UI
    setSubmissions((prev) =>
      prev.map((s) => (s.id === draggedCardId ? { ...s, ...updatePayload } : s))
    );

    try {
      await atsApi.submissions.update(draggedCardId, updatePayload);
      toast.success(`Moved candidate to ${STAGES.find((s) => s.id === targetStageId)?.title}`);
    } catch (err: any) {
      toast.error("Failed to update candidate stage: " + err.message);
      await loadPipelineData();
    } finally {
      setDraggedCardId(null);
    }
  };

  // Open Modal for Detailed Multi-Stage Comment & Schedule Evaluation
  const openEvaluationModal = (sub: any) => {
    setSelectedSubmission(sub);
    setFormData({
      podLeadRemarks: sub.podLeadRemarks || "",
      l1Status: sub.l1Status || "PENDING",
      l1Date: sub.l1Date ? sub.l1Date.substring(0, 16) : "",
      l1Interviewer: sub.l1Interviewer || "",
      l1Remarks: sub.l1Remarks || "",
      l2Status: sub.l2Status || "PENDING",
      l2Date: sub.l2Date ? sub.l2Date.substring(0, 16) : "",
      l2Interviewer: sub.l2Interviewer || "",
      l2Remarks: sub.l2Remarks || "",
      l3Status: sub.l3Status || "PENDING",
      l3Date: sub.l3Date ? sub.l3Date.substring(0, 16) : "",
      l3Interviewer: sub.l3Interviewer || "",
      l3Remarks: sub.l3Remarks || "",
      finalStatus: sub.finalStatus || "SUBMITTED",
      remarks: sub.remarks || "",
    });
    setIsModalOpen(true);
  };

  const handleSaveEvaluation = async () => {
    if (!selectedSubmission) return;
    setSaving(true);

    try {
      const payload: Record<string, any> = {
        podLeadRemarks: formData.podLeadRemarks,
        l1Status: formData.l1Status,
        l1Date: formData.l1Date ? new Date(formData.l1Date).toISOString() : null,
        l1Interviewer: formData.l1Interviewer,
        l1Remarks: formData.l1Remarks,
        l2Status: formData.l2Status,
        l2Date: formData.l2Date ? new Date(formData.l2Date).toISOString() : null,
        l2Interviewer: formData.l2Interviewer,
        l2Remarks: formData.l2Remarks,
        l3Status: formData.l3Status,
        l3Date: formData.l3Date ? new Date(formData.l3Date).toISOString() : null,
        l3Interviewer: formData.l3Interviewer,
        l3Remarks: formData.l3Remarks,
        finalStatus: formData.finalStatus,
        remarks: formData.remarks,
      };

      await atsApi.submissions.update(selectedSubmission.id, payload);
      toast.success("Interview evaluation comments and schedules saved successfully!");
      setIsModalOpen(false);
      await loadPipelineData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save evaluation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SiteBreadcrumb />

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 p-6 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 mb-2">
            <Icon icon="heroicons:view-columns" className="h-3.5 w-3.5" />
            Candidate Pipeline Tracking
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Interactive Drag-and-Drop Pipeline Board</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Drag candidates across stages. Account Managers, BDMs, and Team Leads can log L1, L2, L3 interviewer feedback and client comments.
          </p>
        </div>

        <Button
          onClick={loadPipelineData}
          disabled={loading}
          variant="outline"
          className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs gap-2"
        >
          <Icon icon="heroicons:arrow-path" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Board
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="border border-default-150 shadow-sm bg-white dark:bg-slate-900">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Input
              placeholder="Search candidate, job code, recruiter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs w-full sm:w-64"
            />
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="h-9 px-3 text-xs rounded-md border border-default-200 bg-white dark:bg-slate-900 text-default-700 outline-none w-full sm:w-64"
            >
              <option value="ALL">All Job Requisitions</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jobCode} — {j.jobTitle} ({j.client})
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-default-500 font-semibold">
            Showing <strong className="text-default-900">{filteredSubmissions.length}</strong> Candidate Submissions
          </div>
        </CardContent>
      </Card>

      {/* KANBAN BOARD COLUMNS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 border border-default-150 bg-white dark:bg-slate-900 rounded-2xl">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="mt-3 text-xs text-default-500 font-semibold">Loading interactive recruitment board...</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 min-h-[600px] select-none">
          {stageCounts.map((stage) => {
            const stageSubs = filteredSubmissions.filter((sub) => getSubmissionStageId(sub) === stage.id);

            return (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="w-72 shrink-0 flex flex-col bg-default-100/60 dark:bg-slate-900/60 rounded-xl border border-default-200 dark:border-slate-800 p-3 min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-default-200 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <Icon icon={stage.icon} className="h-4 w-4 text-indigo-600" />
                    <span className="font-bold text-xs text-default-900">{stage.title}</span>
                  </div>
                  <Badge className={`px-2 py-0.5 text-[10px] font-bold ${stage.badgeColor}`}>
                    {stage.count}
                  </Badge>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {stageSubs.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-default-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-[11px] text-default-400 font-medium text-center p-2">
                      Drop candidate here
                    </div>
                  ) : (
                    stageSubs.map((sub) => (
                      <div
                        key={sub.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, sub.id)}
                        onClick={() => openEvaluationModal(sub)}
                        className="bg-white dark:bg-slate-900 border border-default-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing space-y-2 group"
                      >
                        {/* Job & Code */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[10px] text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                            {sub.jobCode || "REQ"}
                          </span>
                          <span className="text-[10px] text-default-400 font-mono">
                            {sub.submittedRate || sub.market === "IN" ? "🇮🇳 IN" : "🇺🇸 US"}
                          </span>
                        </div>

                        {/* Candidate Name & Designation */}
                        <div>
                          <h4 className="font-bold text-xs text-default-900 group-hover:text-indigo-600 transition-colors">
                            {sub.candidateName || "Unnamed Candidate"}
                          </h4>
                          <p className="text-[11px] text-default-500 truncate">{sub.jobTitle}</p>
                        </div>

                        {/* Details Pills */}
                        <div className="text-[10.5px] text-default-600 space-y-1 pt-1 border-t border-default-100 dark:border-slate-800">
                          <p className="flex items-center justify-between">
                            <span className="text-default-400">Recruiter:</span>
                            <span className="font-semibold text-default-800">{sub.recruiterName || "Staff"}</span>
                          </p>
                          {sub.l1Interviewer && (
                            <p className="flex items-center justify-between">
                              <span className="text-default-400">L1 Interviewer:</span>
                              <span className="font-semibold text-indigo-600 truncate max-w-[110px]">{sub.l1Interviewer}</span>
                            </p>
                          )}
                          {sub.l1Remarks && (
                            <p className="text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded truncate" title={sub.l1Remarks}>
                              💬 {sub.l1Remarks}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex items-center justify-between text-[10px]">
                          <span className="text-default-400 font-mono">
                            {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : ""}
                          </span>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-indigo-600 font-semibold hover:bg-indigo-50">
                            Evaluate Stage $\rightarrow$
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MULTI-STAGE INTERVIEW EVALUATION & CLIENT COMMENTS MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-default-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Icon icon="heroicons:chat-bubble-left-right" className="text-indigo-600" />
              Multi-Stage Evaluation: {selectedSubmission?.candidateName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Requisition: <strong className="text-default-900">{selectedSubmission?.jobTitle} ({selectedSubmission?.jobCode})</strong> | Recruiter: <strong className="text-default-900">{selectedSubmission?.recruiterName}</strong>
            </DialogDescription>
          </DialogHeader>

          {/* Stage Tabs */}
          <div className="flex items-center gap-1 border-b border-default-200 pt-2">
            <button
              onClick={() => setActiveTab("l1")}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
                activeTab === "l1" ? "border-indigo-600 text-indigo-600 bg-indigo-50/50" : "border-transparent text-default-500 hover:text-default-800"
              }`}
            >
              L1 Round (AM/BDM)
            </button>
            <button
              onClick={() => setActiveTab("l2")}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
                activeTab === "l2" ? "border-indigo-600 text-indigo-600 bg-indigo-50/50" : "border-transparent text-default-500 hover:text-default-800"
              }`}
            >
              L2 Tech Round
            </button>
            <button
              onClick={() => setActiveTab("l3")}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
                activeTab === "l3" ? "border-indigo-600 text-indigo-600 bg-indigo-50/50" : "border-transparent text-default-500 hover:text-default-800"
              }`}
            >
              L3 Final / Client
            </button>
            <button
              onClick={() => setActiveTab("pod_lead")}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
                activeTab === "pod_lead" ? "border-indigo-600 text-indigo-600 bg-indigo-50/50" : "border-transparent text-default-500 hover:text-default-800"
              }`}
            >
              Team Lead Review
            </button>
            <button
              onClick={() => setActiveTab("final")}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
                activeTab === "final" ? "border-indigo-600 text-indigo-600 bg-indigo-50/50" : "border-transparent text-default-500 hover:text-default-800"
              }`}
            >
              Final Decision
            </button>
          </div>

          <div className="space-y-4 py-3">
            {/* L1 TAB */}
            {activeTab === "l1" && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-default-700 block mb-1">L1 Status</label>
                    <select
                      value={formData.l1Status}
                      onChange={(e) => setFormData({ ...formData, l1Status: e.target.value })}
                      className="w-full h-9 px-2 text-xs rounded border border-default-200 bg-white dark:bg-slate-800 outline-none"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="CLEARED">CLEARED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-default-700 block mb-1">L1 Interview Date</label>
                    <input
                      type="datetime-local"
                      value={formData.l1Date}
                      onChange={(e) => setFormData({ ...formData, l1Date: e.target.value })}
                      className="w-full h-9 px-2 text-xs rounded border border-default-200 bg-white dark:bg-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-default-700 block mb-1">L1 Interviewer Name</label>
                    <Input
                      placeholder="e.g. John Client Lead / BDM"
                      value={formData.l1Interviewer}
                      onChange={(e) => setFormData({ ...formData, l1Interviewer: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-default-700 block mb-1">
                    L1 Client Feedback & Interview Comments (AM / BDM Logged)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter detailed L1 interview feedback, technical ratings, or client comments..."
                    value={formData.l1Remarks}
                    onChange={(e) => setFormData({ ...formData, l1Remarks: e.target.value })}
                    className="w-full p-2.5 text-xs rounded border border-default-200 bg-white dark:bg-slate-800 outline-none text-default-900"
                  />
                </div>
              </div>
            )}

            {/* L2 TAB */}
            {activeTab === "l2" && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-default-700 block mb-1">L2 Status</label>
                    <select
                      value={formData.l2Status}
                      onChange={(e) => setFormData({ ...formData, l2Status: e.target.value })}
                      className="w-full h-9 px-2 text-xs rounded border border-default-200 bg-white dark:bg-slate-800 outline-none"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="CLEARED">CLEARED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-default-700 block mb-1">L2 Interview Date</label>
                    <input
                      type="datetime-local"
                      value={formData.l2Date}
                      onChange={(e) => setFormData({ ...formData, l2Date: e.target.value })}
                      className="w-full h-9 px-2 text-xs rounded border border-default-200 bg-white dark:bg-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-default-700 block mb-1">L2 Technical Interviewer</label>
                    <Input
                      placeholder="e.g. Lead Architect / Tech Interviewer"
                      value={formData.l2Interviewer}
                      onChange={(e) => setFormData({ ...formData, l2Interviewer: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-default-700 block mb-1">L2 Technical Feedback Comments</label>
                  <textarea
                    rows={3}
                    placeholder="Enter technical round coding feedback, architecture questions results..."
                    value={formData.l2Remarks}
                    onChange={(e) => setFormData({ ...formData, l2Remarks: e.target.value })}
                    className="w-full p-2.5 text-xs rounded border border-default-200 bg-white dark:bg-slate-800 outline-none text-default-900"
                  />
                </div>
              </div>
            )}

            {/* L3 TAB */}
            {activeTab === "l3" && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-default-700 block mb-1">L3 Status</label>
                    <select
                      value={formData.l3Status}
                      onChange={(e) => setFormData({ ...formData, l3Status: e.target.value })}
                      className="w-full h-9 px-2 text-xs rounded border border-default-200 bg-white dark:bg-slate-800 outline-none"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="CLEARED">CLEARED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-default-700 block mb-1">L3 Interview Date</label>
                    <input
                      type="datetime-local"
                      value={formData.l3Date}
                      onChange={(e) => setFormData({ ...formData, l3Date: e.target.value })}
                      className="w-full h-9 px-2 text-xs rounded border border-default-200 bg-white dark:bg-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-default-700 block mb-1">L3 Client HR / Manager</label>
                    <Input
                      placeholder="e.g. VP Engineering / Client HR"
                      value={formData.l3Interviewer}
                      onChange={(e) => setFormData({ ...formData, l3Interviewer: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-default-700 block mb-1">L3 Final Client Comments</label>
                  <textarea
                    rows={3}
                    placeholder="Enter final client interview feedback, rate negotiation, or offer remarks..."
                    value={formData.l3Remarks}
                    onChange={(e) => setFormData({ ...formData, l3Remarks: e.target.value })}
                    className="w-full p-2.5 text-xs rounded border border-default-200 bg-white dark:bg-slate-800 outline-none text-default-900"
                  />
                </div>
              </div>
            )}

            {/* POD LEAD TAB */}
            {activeTab === "pod_lead" && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-default-700 block mb-1">
                    Team Lead / Pod Lead Internal Approval Remarks
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter internal pod review comments, candidate quality check notes..."
                    value={formData.podLeadRemarks}
                    onChange={(e) => setFormData({ ...formData, podLeadRemarks: e.target.value })}
                    className="w-full p-2.5 text-xs rounded border border-default-200 bg-white dark:bg-slate-800 outline-none text-default-900"
                  />
                </div>
              </div>
            )}

            {/* FINAL DECISION TAB */}
            {activeTab === "final" && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-default-700 block mb-1">Final Submission Status</label>
                  <select
                    value={formData.finalStatus}
                    onChange={(e) => setFormData({ ...formData, finalStatus: e.target.value })}
                    className="w-full h-9 px-2 text-xs rounded border border-default-200 bg-white dark:bg-slate-800 outline-none font-bold text-indigo-600"
                  >
                    <option value="PENDING_APPROVAL">PENDING_APPROVAL (Internal Review)</option>
                    <option value="SUBMITTED">SUBMITTED (Client Forwarded)</option>
                    <option value="OFFER">OFFER (Offer Extended)</option>
                    <option value="JOIN">JOIN (Candidate Placed / Hired)</option>
                    <option value="REJECTED">REJECTED (Submission Closed)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-default-700 block mb-1">General Remarks / Rejection Reason</label>
                  <textarea
                    rows={3}
                    placeholder="Enter final decision remarks or rejection reason..."
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full p-2.5 text-xs rounded border border-default-200 bg-white dark:bg-slate-800 outline-none text-default-900"
                  />
                </div>
              </div>
            )}

            {/* COMBINED MULTI-STAGE COMMENT TIMELINE */}
            <div className="pt-3 border-t border-default-200">
              <h5 className="font-bold text-xs text-default-900 mb-2 flex items-center gap-1.5">
                <Icon icon="heroicons:clock" className="text-indigo-600" />
                Chronological Multi-Stage Comment Stream
              </h5>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 text-xs">
                {selectedSubmission?.recruiterComment && (
                  <div className="p-2 rounded bg-default-50 dark:bg-slate-800 border border-default-100">
                    <span className="font-bold text-default-800">Recruiter Sourcing Note: </span>
                    <span className="text-default-600">{selectedSubmission.recruiterComment}</span>
                  </div>
                )}
                {selectedSubmission?.podLeadRemarks && (
                  <div className="p-2 rounded bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 text-amber-900 dark:text-amber-300">
                    <span className="font-bold">Team Lead Review: </span>
                    <span>{selectedSubmission.podLeadRemarks}</span>
                  </div>
                )}
                {selectedSubmission?.l1Remarks && (
                  <div className="p-2 rounded bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 text-indigo-900 dark:text-indigo-300">
                    <span className="font-bold">L1 Feedback ({selectedSubmission.l1Interviewer || "AM"}): </span>
                    <span>{selectedSubmission.l1Remarks}</span>
                  </div>
                )}
                {selectedSubmission?.l2Remarks && (
                  <div className="p-2 rounded bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 text-purple-900 dark:text-purple-300">
                    <span className="font-bold">L2 Tech Feedback ({selectedSubmission.l2Interviewer || "Interviewer"}): </span>
                    <span>{selectedSubmission.l2Remarks}</span>
                  </div>
                )}
                {selectedSubmission?.l3Remarks && (
                  <div className="p-2 rounded bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 text-teal-900 dark:text-teal-300">
                    <span className="font-bold">L3 Client Feedback ({selectedSubmission.l3Interviewer || "Client HR"}): </span>
                    <span>{selectedSubmission.l3Remarks}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" disabled={saving} onClick={handleSaveEvaluation} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
              {saving ? "Saving..." : "Save Evaluation & Comments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
