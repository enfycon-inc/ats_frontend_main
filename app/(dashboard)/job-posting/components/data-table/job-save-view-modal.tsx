"use client";

import React, { useState } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JobSaveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (viewName: string) => void;
}

export function JobSaveViewModal({ isOpen, onClose, onSave }: JobSaveViewModalProps) {
  const [viewName, setViewName] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-neutral-250 dark:border-slate-800 w-80 shadow-2xl space-y-4 font-sans">
        <div>
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
            <FolderPlus className="h-4 w-4 text-primary" /> Save Current View
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Enter a name for this custom view config.
          </p>
        </div>
        <input
          type="text"
          placeholder="e.g. Active Java Jobs"
          value={viewName}
          onChange={(e) => setViewName(e.target.value)}
          className="w-full bg-neutral-50 dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 outline-hidden focus:border-primary"
          autoFocus
        />
        <div className="flex items-center justify-end gap-2 text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 cursor-pointer text-neutral-500"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (viewName.trim()) {
                onSave(viewName.trim());
                setViewName("");
                onClose();
              }
            }}
            className="h-8 bg-primary text-white cursor-pointer font-bold"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
