"use client";

import React, { useState } from "react";
import {
  Plus,
  ChevronDown,
  Copy,
  Star,
  MoreHorizontal,
  Download,
  Trash2,
  FolderPlus,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ApplicantToolbarProps {
  savedViews: string[];
  activeView: string;
  onSelectView: (view: string) => void;
  onSaveView: (name: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  isRecruiter?: boolean;
  onUploadCv?: () => void;
}

export default function ApplicantToolbar({
  savedViews,
  activeView,
  onSelectView,
  onSaveView,
  onRefresh,
  onExport,
  selectedCount,
  onDeleteSelected,
  isRecruiter = false,
  onUploadCv,
}: ApplicantToolbarProps) {
  const router = useRouter();
  const [isSavingView, setIsSavingView] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  const handleSaveView = () => {
    if (newViewName.trim()) {
      onSaveView(newViewName.trim());
      setNewViewName("");
      setIsSavingView(false);
    }
  };

  return (
    <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-800 gap-2 font-sans">
      {/* Left: Saved Views */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {/* Saved Views Selector */}
        <div className="flex items-center bg-neutral-50 dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded-sm">
          <select
            value={activeView}
            onChange={(e) => onSelectView(e.target.value)}
            className="px-2 py-0.5 text-xs text-neutral-800 dark:text-neutral-200 bg-transparent outline-hidden cursor-pointer border-none font-semibold"
          >
            <option value="All Applicants">All Applicants</option>
            {savedViews.map((view) => (
              <option key={view} value={view}>
                {view}
              </option>
            ))}
          </select>
        </div>

        {/* Add View Button */}
        {!isSavingView ? (
          <button
            onClick={() => setIsSavingView(true)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-sm transition-colors cursor-pointer font-medium"
          >
            <Plus className="h-3 w-3" />
            Add View
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="text"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveView();
                if (e.key === "Escape") setIsSavingView(false);
              }}
              placeholder="View name..."
              className="px-2 py-0.5 text-xs border border-neutral-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-950 text-neutral-800 dark:text-neutral-200 outline-hidden focus:border-primary w-32"
            />
            <button
              onClick={handleSaveView}
              className="px-2 py-0.5 text-xs bg-primary text-white rounded-sm hover:bg-primary/90 cursor-pointer font-semibold"
            >
              Save
            </button>
            <button
              onClick={() => setIsSavingView(false)}
              className="px-1.5 py-0.5 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Selected count badge */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-sm ml-1">
            <span className="text-[10px] font-bold text-primary">
              {selectedCount} Selected
            </span>
            {!isRecruiter && (
              <button
                onClick={onDeleteSelected}
                className="text-[10px] text-red-650 hover:text-red-755 font-bold hover:underline cursor-pointer"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Copy Icon */}
        <button
          title="Copy to Clipboard"
          className="p-1 rounded-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>

        {/* Star / Bookmark */}
        <button
          title="Starred"
          className="p-1 rounded-sm text-neutral-500 hover:text-yellow-500 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Star className="h-3.5 w-3.5" />
        </button>

        {/* Export */}
        <button
          onClick={onExport}
          title="Export CSV"
          className="p-1 rounded-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
        </button>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          title="Refresh"
          className="p-1 rounded-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs min-w-40">
            <DropdownMenuItem
              className="text-xs cursor-pointer gap-2"
              onClick={() => onSaveView("Saved View " + Date.now())}
            >
              <FolderPlus className="h-3.5 w-3.5" /> Save Current View
            </DropdownMenuItem>
            {!isRecruiter && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs cursor-pointer gap-2 text-red-650 dark:text-red-400 focus:text-red-650"
                  onClick={onDeleteSelected}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Selected
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-neutral-200 dark:bg-slate-700 mx-0.5" />

        {/* Upload CV Button */}
        {onUploadCv && (
          <button
            onClick={onUploadCv}
            className="inline-flex items-center gap-1.5 rounded-sm bg-violet-600 hover:bg-violet-700 px-2.5 h-6.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Upload CV
          </button>
        )}

        {/* New Applicant Button */}
        <Button
          size="sm"
          onClick={() => router.push("/applicants/new")}
          className="h-6.5 px-2.5 text-xs font-bold bg-primary text-white hover:bg-primary/90 border-none shadow-none cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Applicant
        </Button>
      </div>
    </div>
  );
}
