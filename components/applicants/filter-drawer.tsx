"use client";

import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: SelectedFilters) => void;
  currentFilters: SelectedFilters;
}

export interface SelectedFilters {
  source: string;
  predefined: string[];
}

const PREDEFINED_FILTERS = [
  "New leads",
  "Interviewing",
  "Submitted to Client",
  "H1B Candidates",
  "US Citizens",
  "My Owned Profiles",
  "Profiles with Resumes",
  "Placed Candidates",
  "Rejected",
  "Dice Sourced",
  "LinkedIn Sourced",
];

export default function FilterDrawer({
  isOpen,
  onClose,
  onApply,
  currentFilters,
}: FilterDrawerProps) {
  const [source, setSource] = useState(currentFilters.source || "All selected");
  const [selectedPredefined, setSelectedPredefined] = useState<string[]>(
    currentFilters.predefined || []
  );

  // Sync state on drawer open
  useEffect(() => {
    if (isOpen) {
      setSource(currentFilters.source || "All selected");
      setSelectedPredefined(currentFilters.predefined || []);
    }
  }, [isOpen, currentFilters]);

  const togglePredefined = (filter: string) => {
    setSelectedPredefined((prev) =>
      prev.includes(filter)
        ? prev.filter((item) => item !== filter)
        : [...prev, filter]
    );
  };

  const handleApply = () => {
    onApply({
      source,
      predefined: selectedPredefined,
    });
    onClose();
  };

  const handleReset = () => {
    setSource("All selected");
    setSelectedPredefined([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-[400px] max-w-md bg-white dark:bg-slate-900 border-l border-neutral-200 dark:border-slate-800 shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-in-out">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between bg-neutral-50 dark:bg-slate-900/50">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
              Edit Filters
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-200 dark:hover:bg-slate-800 rounded-full transition-colors text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Sourced From select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                Sourced From
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-neutral-350 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 outline-hidden focus:border-primary transition-colors cursor-pointer"
              >
                <option value="All selected">All selected</option>
                <option value="Dice">Dice</option>
                <option value="Monster">Monster</option>
                <option value="Indeed">Indeed</option>
                <option value="LinkedIn">LinkedIn</option>
              </select>
            </div>

            {/* Predefined Filters Tag Grid */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                Pre-Defined Filters
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PREDEFINED_FILTERS.map((filter) => {
                  const isSelected = selectedPredefined.includes(filter);
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => togglePredefined(filter)}
                      className={cn(
                        "px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                        isSelected
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-neutral-50 dark:bg-slate-850 border-neutral-200 dark:border-slate-850 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-slate-600"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full shrink-0",
                          isSelected ? "bg-primary animate-pulse" : "bg-neutral-300 dark:bg-slate-600"
                        )}
                      />
                      {filter}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Filter Add Trigger */}
            <div className="pt-1.5">
              <button
                type="button"
                className="text-xs text-primary dark:text-blue-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add Filter
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="p-4 border-t border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-900/50 flex items-center justify-between gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="w-1/2 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-slate-700 cursor-pointer text-xs font-semibold h-8.5"
            >
              Reset All
            </Button>
            <div className="flex gap-2 w-1/2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-neutral-500 dark:text-neutral-400 cursor-pointer text-xs font-semibold h-8.5"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="bg-primary text-white hover:bg-primary/95 px-5 cursor-pointer font-bold text-xs shadow-xs border-none h-8.5"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
