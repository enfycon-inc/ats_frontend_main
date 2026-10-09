"use client";

import React from "react";
import { EDITABLE_JOB_STATUSES, normalizeJobStatus } from "@/lib/job-status-contract";
import { Job } from "../../data/mock-jobs";
import { Button } from "@/components/ui/button";

interface JobStatusModalProps {
  job: Job | null;
  statusValue: string;
  onStatusValueChange: (val: string) => void;
  comment: string;
  onCommentChange: (val: string) => void;
  saving: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function JobStatusModal({
  job,
  statusValue,
  onStatusValueChange,
  comment,
  onCommentChange,
  saving,
  error,
  onConfirm,
  onClose,
}: JobStatusModalProps) {
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center font-sans">
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 w-[450px] shadow-2xl rounded overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-100 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Job Status</h3>
          <button
            disabled={saving}
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-250 font-bold text-lg select-none cursor-pointer"
          >
            ×
          </button>
        </div>
        {/* Body */}
        <div className="p-4 space-y-4 text-xs"><p className="font-semibold">{job.jobCode}: {normalizeJobStatus(job.jobStatus) || job.jobStatus} → {statusValue}</p>{error && <p role="alert" className="text-red-700">{error}</p>}
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="col-span-1 text-neutral-600 dark:text-neutral-400 font-semibold text-right">
              Job Status
            </span>
            <select
              aria-label="New job status"
              disabled={saving}
              value={normalizeJobStatus(statusValue) || statusValue}
              onChange={(e) => onStatusValueChange(e.target.value)}
              className="col-span-3 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2 py-1.5 outline-hidden text-neutral-800 dark:text-neutral-200 focus:border-primary text-xs cursor-pointer font-medium"
            >
              {EDITABLE_JOB_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <span className="col-span-1 text-neutral-600 dark:text-neutral-400 font-semibold text-right pt-1.5">
              Comment
            </span>
            <textarea
              aria-label="Reason for job status change"
              disabled={saving}
              maxLength={2000}
              placeholder="Reason for this status change"
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              className="col-span-3 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden text-neutral-800 dark:text-neutral-200 focus:border-primary h-20 text-xs"
            />
          </div>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 bg-neutral-50 dark:bg-slate-900 border-t border-neutral-200 dark:border-slate-800 text-xs">
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={saving || !comment.trim() || normalizeJobStatus(statusValue) === normalizeJobStatus(job.jobStatus)}
            className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer rounded-sm"
          >
            {saving ? "Saving…" : "Confirm change"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 border border-neutral-300 dark:border-slate-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-slate-800 font-bold cursor-pointer rounded-sm"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
