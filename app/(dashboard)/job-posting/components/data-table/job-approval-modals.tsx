// @ts-nocheck
"use client";

import React, { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { Job } from "../../data/mock-jobs";
import { Button } from "@/components/ui/button";
import { atsApi } from "@/lib/ats-api";
import { toast } from "react-hot-toast";

const APPROVE_REMARK_OPTIONS = [
  "Approved — Requisition verified and rates validated",
  "Approved — High priority requirement, ready for immediate sourcing",
  "Approved with client budget sign-off",
  "Approved with rate exception ceiling",
  "Custom Note / Instructions...",
];

const REJECT_REASON_OPTIONS = [
  "Rate / Budget is too low for required experience level",
  "Incomplete job description or missing critical skill details",
  "Client contract or billing terms not finalized",
  "Duplicate job requirement",
  "Incorrect visa or work authorization terms",
  "Client requirement put on hold / cancelled",
  "Custom Reason / Feedback...",
];

interface ApproveJobModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (jobId: string) => void;
}

export function ApproveJobModal({
  job,
  isOpen,
  onClose,
  onSuccess,
}: ApproveJobModalProps) {
  const [approvePreset, setApprovePreset] = useState<string>(
    "Approved — Requisition verified and rates validated"
  );
  const [approveRemark, setApproveRemark] = useState<string>("");
  const [isApproving, setIsApproving] = useState<boolean>(false);

  if (!isOpen || !job) return null;

  const handleConfirmApprove = async () => {
    setIsApproving(true);
    try {
      const toastId = `approve-job-${job.id}`;
      toast.loading(`Activating ${job.jobCode || "job"}...`, { id: toastId });
      await atsApi.jobs.approve(job.id);
      toast.success(`Job ${job.jobCode || ""} approved & activated!`, { id: toastId });
      onSuccess(job.id);
      onClose();
      setApproveRemark("");
    } catch (err: any) {
      toast.error("Failed to approve job: " + (err?.message || "Unknown error"), {
        id: `approve-job-${job.id}`,
      });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                Approve & Activate Job Requisition
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Requisition will become active and available for candidate sourcing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Compact Job Info Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg p-3.5 space-y-2.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-mono text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">
                    {job.jobCode}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                    Pending Approval
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    🔥 {job.priority || "Warm"}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {job.jobTitle}
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px]">
              <div>
                <span className="text-slate-400 text-[10px] block font-medium">
                  Client / End Client
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {job.client}{" "}
                  {(job as any).endClientName || 'N/A' && (job as any).endClientName || 'N/A' !== job.client
                    ? `(${(job as any).endClientName || 'N/A'})`
                    : ""}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-medium">
                  Location & Work Mode
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {job.location || "Remote"}
                  {job.states ? `, ${job.states}` : ""}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-medium">
                  Client Bill Rate / CTC
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {job.clientBillRate || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-medium">
                  Pay Rate / Salary
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {job.payRate || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-medium">
                  Job Created By
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {job.createdBy || "Account Manager"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-medium">
                  Assigned Pod / Recruiter
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {job.podName || (job as any).assignedTo || 'N/A' || "Unassigned"}
                </span>
              </div>
            </div>
          </div>

          {/* Approval Remarks Dropdown & Custom Note */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Approval Remarks / Sign-off Template
            </label>
            <select
              value={approvePreset}
              onChange={(e) => setApprovePreset(e.target.value)}
              className="w-full p-2 bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-neutral-900 dark:text-neutral-100 font-medium cursor-pointer"
            >
              {APPROVE_REMARK_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            <div>
              <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                {approvePreset === "Custom Note / Instructions..."
                  ? "Custom Remarks *"
                  : "Additional Reviewer Notes (Optional)"}
              </label>
              <textarea
                rows={2}
                value={approveRemark}
                onChange={(e) => setApproveRemark(e.target.value)}
                placeholder={
                  approvePreset === "Custom Note / Instructions..."
                    ? "Enter specific reviewer instructions or approval notes..."
                    : "Optional internal notes for recruiters / AM..."
                }
                className="w-full p-2 bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-neutral-900 dark:text-neutral-100 resize-none transition-all placeholder:text-neutral-400"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-neutral-50 dark:bg-slate-900/60 border-t border-neutral-200 dark:border-slate-800 text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isApproving}
            className="text-xs font-medium cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={
              isApproving ||
              (approvePreset === "Custom Note / Instructions..." && !approveRemark.trim())
            }
            onClick={handleConfirmApprove}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            {isApproving ? "Activating..." : "Confirm & Activate Job"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface RejectJobModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (jobId: string, reason: string) => void;
}

export function RejectJobModal({
  job,
  isOpen,
  onClose,
  onSuccess,
}: RejectJobModalProps) {
  const [rejectCategory, setRejectCategory] = useState<string>(
    "Rate / Budget is too low for required experience level"
  );
  const [rejectReason, setRejectReason] = useState<string>("");
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  if (!isOpen || !job) return null;

  const handleConfirmReject = async () => {
    const finalReason =
      rejectCategory === "Custom Reason / Feedback..."
        ? rejectReason.trim()
        : rejectReason.trim()
        ? `[${rejectCategory}] ${rejectReason.trim()}`
        : rejectCategory;

    if (!finalReason) {
      toast.error("Please provide a reason or feedback for rejection.");
      return;
    }

    setIsRejecting(true);
    try {
      const toastId = `reject-job-${job.id}`;
      toast.loading(`Rejecting ${job.jobCode || "job"}...`, { id: toastId });
      await atsApi.jobs.reject(job.id, finalReason);
      toast.success(`Job ${job.jobCode || ""} rejected with feedback.`, { id: toastId });
      onSuccess(job.id, finalReason);
      onClose();
      setRejectReason("");
    } catch (err: any) {
      toast.error("Failed to reject job: " + (err?.message || "Unknown error"), {
        id: `reject-job-${job.id}`,
      });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-rose-50/70 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                Reject Job Requirement
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Provide reason and feedback for the Account Manager to revise
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Compact Job Info Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg p-3.5 space-y-2.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-mono text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">
                    {job.jobCode}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                    Pending Approval
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    🔥 {job.priority || "Warm"}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {job.jobTitle}
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px]">
              <div>
                <span className="text-slate-400 text-[10px] block font-medium">
                  Client / End Client
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {job.client}{" "}
                  {(job as any).endClientName || 'N/A' && (job as any).endClientName || 'N/A' !== job.client
                    ? `(${(job as any).endClientName || 'N/A'})`
                    : ""}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-medium">
                  Location & Work Mode
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {job.location || "Remote"}
                  {job.states ? `, ${job.states}` : ""}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-medium">
                  Client Bill Rate / CTC
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {job.clientBillRate || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-medium">
                  Pay Rate / Salary
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {job.payRate || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-medium">
                  Job Created By
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {job.createdBy || "Account Manager"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-medium">
                  Assigned Pod / Recruiter
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {job.podName || (job as any).assignedTo || 'N/A' || "Unassigned"}
                </span>
              </div>
            </div>
          </div>

          {/* Rejection Category Dropdown & Custom Feedback */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Reason for Rejection / Issue Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={rejectCategory}
              onChange={(e) => setRejectCategory(e.target.value)}
              className="w-full p-2 bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-neutral-900 dark:text-neutral-100 font-medium cursor-pointer"
            >
              {REJECT_REASON_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            <div>
              <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                {rejectCategory === "Custom Reason / Feedback..."
                  ? "Detailed Rejection Reason *"
                  : "Detailed Reviewer Remarks / Feedback (Optional)"}
              </label>
              <textarea
                autoFocus={rejectCategory === "Custom Reason / Feedback..."}
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Please revise the CTC ceiling to 14 LPA as market rate for this experience is higher, and clarify visa/notice period requirements..."
                className="w-full p-2.5 bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-neutral-900 dark:text-neutral-100 resize-none transition-all placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div className="p-2.5 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg text-[10.5px] text-neutral-600 dark:text-neutral-300">
            This requirement will be moved to{" "}
            <span className="font-semibold text-rose-600 dark:text-rose-400">Draft</span> and
            returned to{" "}
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {job.createdBy || "the creator"}
            </span>{" "}
            with your feedback.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-neutral-50 dark:bg-slate-900/60 border-t border-neutral-200 dark:border-slate-800 text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isRejecting}
            className="text-xs font-medium cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={
              isRejecting ||
              (rejectCategory === "Custom Reason / Feedback..." && !rejectReason.trim())
            }
            onClick={handleConfirmReject}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            {isRejecting ? "Rejecting..." : "Confirm Rejection"}
          </Button>
        </div>
      </div>
    </div>
  );
}
