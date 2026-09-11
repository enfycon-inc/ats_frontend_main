"use client";

import React from "react";
import { Search, Filter, Settings, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchFilter: string;
  onSearchFilterChange: (filter: string) => void;
  onOpenFilters: () => void;
  onOpenColumns: () => void;
  activeFiltersCount: number;
}

const SEARCH_CATEGORIES = [
  { value: "All", label: "All Fields" },
  { value: "applicantName", label: "Applicant Name" },
  { value: "email", label: "Email" },
  { value: "mobile", label: "Mobile" },
  { value: "jobTitle", label: "Job Title" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "source", label: "Source" },
  { value: "status", label: "Status" },
  { value: "ownership", label: "Ownership" },
  { value: "workAuthorization", label: "Work Auth" },
];

export default function SearchToolbar({
  searchQuery,
  onSearchChange,
  searchFilter,
  onSearchFilterChange,
  onOpenFilters,
  onOpenColumns,
  activeFiltersCount,
}: SearchToolbarProps) {
  return (
    <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-neutral-50/70 dark:bg-slate-900/70 border-b border-neutral-200 dark:border-slate-800 font-sans">
      {/* Search category select */}
      <div className="flex items-center bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded-sm overflow-hidden">
        <select
          value={searchFilter}
          onChange={(e) => onSearchFilterChange(e.target.value)}
          className="px-2 py-0.5 text-xs text-neutral-700 dark:text-neutral-300 bg-transparent outline-hidden cursor-pointer border-none border-r border-neutral-300 dark:border-slate-700 font-medium min-w-[90px]"
        >
          {SEARCH_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search Input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search applicants..."
          className="w-full pl-8 pr-3 py-0.5 text-xs border border-neutral-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-950 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 outline-hidden focus:border-primary transition-colors"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side settings icons */}
      <div className="flex items-center border-l border-neutral-200 dark:border-slate-800 pl-1.5 gap-0.5">
        <button
          onClick={onOpenFilters}
          className={cn(
            "p-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer relative",
            activeFiltersCount > 0 && "text-primary"
          )}
          title="Filters"
        >
          <Filter className="h-3.5 w-3.5" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] text-white font-bold">
              {activeFiltersCount}
            </span>
          )}
        </button>
        <button
          onClick={onOpenColumns}
          className="p-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
          title="Columns settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
