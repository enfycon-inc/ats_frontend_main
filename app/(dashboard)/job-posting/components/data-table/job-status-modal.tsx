"use client";

import React from "react";
import { QUICK_CHANGE_JOB_STATUSES, normalizeJobStatus } from "@/lib/job-status-contract";
import { Job } from "../../data/mock-jobs";
import { Button } from "@/components/ui/button";

export interface JobClosureOptions { keepExistingSubmissionsOpen?: boolean; reason?: string }

interface JobStatusModalProps {
  job: Job | null;
  statusValue: string;
  onStatusValueChange: (val: string) => void;
  saving: boolean;
  error: string;
  onConfirm: (options?: JobClosureOptions) => void;
  onClose: () => void;
}

export function JobStatusModal({
  job,
  statusValue,
  onStatusValueChange,
  saving,
  error,
  onConfirm,
  onClose,
}: JobStatusModalProps) {
  const [keepOpen, setKeepOpen] = React.useState<boolean | null>(null);
  const [reason, setReason] = React.useState('');
  React.useEffect(() => { setKeepOpen(null); setReason(''); }, [job?.id, statusValue]);
  const closing = normalizeJobStatus(statusValue) === 'Closed';
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center font-sans">
      <div role="dialog" aria-modal="true" aria-label="Edit Job Status" className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 w-[580px] max-h-[90vh] overflow-y-auto max-w-[calc(100vw-2rem)] shadow-2xl rounded overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-100 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Edit Job Status</h3>
          <button
            data-window-close
            aria-label="Close"
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
              <option value="" disabled>Select status</option>
              {QUICK_CHANGE_JOB_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          {closing && <fieldset className="space-y-3" disabled={saving}>
            <legend className="mb-2 text-sm font-semibold">Keep already submitted candidates open?</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3"><input type="radio" name="existing-submissions" checked={keepOpen === true} onChange={() => setKeepOpen(true)} className="mt-0.5" /><span><strong className="block">Yes - continue existing submissions</strong><span className="mt-1 block text-muted-foreground">Authorized users can continue reviews, interviews, offers, and joining updates for candidates already submitted.</span></span></label>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3"><input type="radio" name="existing-submissions" checked={keepOpen === false} onChange={() => setKeepOpen(false)} className="mt-0.5" /><span><strong className="block">No - pause existing submissions</strong><span className="mt-1 block text-muted-foreground">Submission statuses become read-only until the job is reactivated. Existing stages, outcomes, and history are preserved.</span></span></label>
            <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-blue-900 dark:bg-blue-950 dark:text-blue-200">In both cases: new submissions and applications are blocked. AI matching and job editing remain disabled.</p>
            <label className="block space-y-1"><span className="font-semibold">Closing reason (optional)</span><textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} rows={2} className="block w-full rounded-md border border-input bg-background p-2 text-xs" placeholder="Add a reason..." /></label>
            {keepOpen === null && <p className="text-muted-foreground">Select an option to continue.</p>}
          </fieldset>}
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 bg-neutral-50 dark:bg-slate-900 border-t border-neutral-200 dark:border-slate-800 text-xs">
          <Button
            size="sm"
            onClick={() => onConfirm(closing ? { keepExistingSubmissionsOpen: keepOpen === true, reason: reason.trim() || undefined } : undefined)}
            disabled={saving || (closing && keepOpen === null) || !statusValue || normalizeJobStatus(statusValue) === normalizeJobStatus(job.jobStatus)}
            className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer rounded-sm"
          >
            {saving ? "Saving…" : closing ? "Close job" : "Confirm change"}
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
