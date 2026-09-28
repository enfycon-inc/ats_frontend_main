"use client";

import React from "react";
import { UserPlus, Sparkles, Pencil, Edit, Plus, Archive } from "lucide-react";
import { Icon } from "@iconify/react";
import { Job } from "../../data/mock-jobs";

export interface JobContextMenuProps {
  x: number;
  y: number;
  job: Job;
  hasSubmitCandidatePermission: boolean;
  hasEditPermission: boolean;
  hasDelegatePermission: boolean;
  currentUserBranchId: string | null | undefined;
  onOpenSourceModal: (job: Job) => void;
  onFindMatches: (job: Job) => void;
  onDelegateJob: (job: Job) => void;
  onEditJob: (job: Job) => void;
  onQuickEdit: (job: Job) => void;
  onOpenAssignModal: (job: Job) => void;
  onArchiveJob: (job: Job) => void;
  onClose: () => void;
}

export function JobContextMenu({
  x,
  y,
  job,
  hasSubmitCandidatePermission,
  hasEditPermission,
  hasDelegatePermission,
  currentUserBranchId,
  onOpenSourceModal,
  onFindMatches,
  onDelegateJob,
  onEditJob,
  onQuickEdit,
  onOpenAssignModal,
  onArchiveJob,
  onClose,
}: JobContextMenuProps) {
  return (
    <div
      style={{ top: y, left: x }}
      className="fixed z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-neutral-200/90 dark:border-slate-800 rounded-xl shadow-xl shadow-slate-900/10 dark:shadow-black/50 w-56 p-1.5 flex flex-col gap-1 text-xs select-none font-sans animate-in fade-in-0 zoom-in-95"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-0.5">
        <div className="px-2.5 pt-1 pb-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Quick Actions
        </div>

        {hasSubmitCandidatePermission && (
          <button
            onClick={() => {
              onOpenSourceModal(job);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer font-semibold"
          >
            <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
            <span>Submit Candidate</span>
          </button>
        )}

        <button
          onClick={() => {
            onFindMatches(job);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors cursor-pointer font-semibold"
        >
          <div className="h-6 w-6 rounded-md bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span>Find AI Matches</span>
        </button>
      </div>

      <div className="border-t border-neutral-100 dark:border-slate-800 my-0.5" />

      <div className="space-y-0.5">
        <div className="px-2.5 pt-1 pb-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Management
        </div>

        {hasDelegatePermission && job.branchId === currentUserBranchId && (
          <button
            onClick={() => {
              onDelegateJob(job);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer font-semibold"
          >
            <div className="h-6 w-6 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon icon="heroicons:share" className="h-3.5 w-3.5" />
            </div>
            <span>Delegate Job</span>
          </button>
        )}

        {hasEditPermission && (
          <>
            <button
              onClick={() => {
                onEditJob(job);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer font-semibold"
            >
              <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Pencil className="h-3.5 w-3.5" />
              </div>
              <span>Edit Job</span>
            </button>
            <button
              onClick={() => {
                onQuickEdit(job);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer font-semibold"
            >
              <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Edit className="h-3.5 w-3.5" />
              </div>
              <span>Quick Edit</span>
            </button>

            <button
              onClick={() => {
                onOpenAssignModal(job);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer font-semibold"
            >
              <div className="h-6 w-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <span>Assign Recruiters / Pods</span>
            </button>
          </>
        )}

        <button
          onClick={() => {
            onArchiveJob(job);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer font-semibold"
        >
          <div className="h-6 w-6 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Archive className="h-3.5 w-3.5" />
          </div>
          <span>Archive Job</span>
        </button>
      </div>
    </div>
  );
}
