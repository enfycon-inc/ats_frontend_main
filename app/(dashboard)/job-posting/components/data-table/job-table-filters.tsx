"use client";

import React from "react";
import { Search, Calendar, ChevronDown, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface JobTableFiltersProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  isPodSystemEnabled: boolean;
  selectedPod: string;
  onPodChange: (val: string) => void;
  availablePods: { id: string; name: string }[];
  selectedBranch: string;
  onBranchChange: (val: string) => void;
  availableBranches: string[];
  selectedCreator: string;
  onCreatorChange: (val: string) => void;
  availableCreators: string[];
  selectedAssignee: string;
  onAssigneeChange: (val: string) => void;
  availableAssignees: string[];
  selectedClient: string;
  onClientChange: (val: string) => void;
  availableClients: string[];
  selectedPeriod: string;
  onPeriodChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  selectedSort: string;
  onSortChange: (val: string) => void;
  showRangePicker: boolean;
  onToggleRangePicker: () => void;
  onCloseRangePicker: () => void;
  isAnyFilterActive: boolean;
  onResetFilters: () => void;
}

export function JobTableFilters({
  searchQuery,
  onSearchChange,
  isPodSystemEnabled,
  selectedPod,
  onPodChange,
  availablePods,
  selectedBranch,
  onBranchChange,
  availableBranches,
  selectedCreator,
  onCreatorChange,
  availableCreators,
  selectedAssignee,
  onAssigneeChange,
  availableAssignees,
  selectedClient,
  onClientChange,
  availableClients,
  selectedPeriod,
  onPeriodChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  selectedSort,
  onSortChange,
  showRangePicker,
  onToggleRangePicker,
  onCloseRangePicker,
  isAnyFilterActive,
  onResetFilters,
}: JobTableFiltersProps) {
  return (
    <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-900/60 border-b border-neutral-200 dark:border-slate-800">
      <div className="flex flex-wrap items-end gap-3 lg:gap-3.5">
        {/* 1. SEARCH */}
        <div className="flex flex-col gap-1.5 flex-[1.4] min-w-[200px]">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
            SEARCH
          </label>
          <div className="relative flex items-center">
            <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Job title or code..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-7 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] focus:border-[#1a4fa0] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-0.5 cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 2. POD (Only rendered if pod system is enabled!) */}
        {isPodSystemEnabled && (
          <div className="flex flex-col gap-1.5 flex-1 min-w-[130px]">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
              <span>POD</span>
            </label>
            <select
              value={selectedPod}
              onChange={(e) => onPodChange(e.target.value)}
              className="w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] cursor-pointer transition-colors"
            >
              <option value="All">All Pods</option>
              {availablePods.map((p) => (
                <option key={p.id || p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* BRANCH */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
            BRANCH
          </label>
          <select
            value={selectedBranch}
            onChange={(e) => onBranchChange(e.target.value)}
            className="w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] cursor-pointer transition-colors"
          >
            <option value="All">All Branches</option>
            {availableBranches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>

        {/* 3. CREATED BY */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
            CREATED BY
          </label>
          <select
            value={selectedCreator}
            onChange={(e) => onCreatorChange(e.target.value)}
            className="w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] cursor-pointer transition-colors"
          >
            <option value="All">All Creators</option>
            {availableCreators.map((creator) => (
              <option key={creator} value={creator}>
                {creator}
              </option>
            ))}
          </select>
        </div>

        {/* 4. ASSIGNED TO */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
            ASSIGNED TO
          </label>
          <select
            value={selectedAssignee}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className="w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] cursor-pointer transition-colors"
          >
            <option value="All">All Assignees</option>
            <option value="Unassigned">Unassigned</option>
            {availableAssignees.map((assignee) => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>
        </div>

        {/* 5. CLIENT */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[130px]">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
            CLIENT
          </label>
          <select
            value={selectedClient}
            onChange={(e) => onClientChange(e.target.value)}
            className="w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] cursor-pointer transition-colors"
          >
            <option value="All">All Clients</option>
            {availableClients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* 6. PERIOD */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
            PERIOD
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => {
              onPeriodChange(e.target.value);
              if (e.target.value !== "Custom") {
                onStartDateChange("");
                onEndDateChange("");
              } else {
                onToggleRangePicker();
              }
            }}
            className="w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] cursor-pointer transition-colors"
          >
            <option value="All Time">All Time</option>
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Custom">Custom Range</option>
          </select>
        </div>

        {/* 7. RANGE */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px] relative">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
            RANGE
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={onToggleRangePicker}
              className={cn(
                "w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border rounded-md font-medium text-left flex items-center justify-between transition-colors shadow-2xs cursor-pointer",
                startDate || endDate || selectedPeriod === "Custom"
                  ? "border-[#1a4fa0] text-[#1a4fa0] dark:text-blue-400 font-semibold"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              )}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">
                  {startDate && endDate
                    ? `${startDate} ~ ${endDate}`
                    : startDate
                    ? `From ${startDate}`
                    : endDate
                    ? `Until ${endDate}`
                    : "Pick a range"}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 shrink-0 text-slate-400 ml-1" />
            </button>

            {showRangePicker && (
              <div className="absolute right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-3 w-[260px] space-y-2.5 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pick Date Range</span>
                  <button
                    type="button"
                    onClick={onCloseRangePicker}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-medium">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      onStartDateChange(e.target.value);
                      onPeriodChange("Custom");
                    }}
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-medium">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      onEndDateChange(e.target.value);
                      onPeriodChange("Custom");
                    }}
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      onStartDateChange("");
                      onEndDateChange("");
                      onPeriodChange("All Time");
                      onCloseRangePicker();
                    }}
                    className="text-[11px] text-slate-500 hover:text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={onCloseRangePicker}
                    className="px-3 py-1 bg-primary text-white text-[11px] font-bold rounded-md shadow-2xs hover:bg-primary/90 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 8. SORT BY */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[130px]">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
            SORT BY
          </label>
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] cursor-pointer transition-colors"
          >
            <option value="Latest Posted">Latest Posted</option>
            <option value="Oldest Posted">Oldest Posted</option>
            <option value="Recently Updated">Recently Updated</option>
            <option value="Job Title (A-Z)">Job Title (A-Z)</option>
            <option value="Job Title (Z-A)">Job Title (Z-A)</option>
            <option value="Hot First">Hot Priority First</option>
          </select>
        </div>

        {/* Reset Filters button */}
        {isAnyFilterActive && (
          <div className="flex items-end pb-0.5">
            <button
              type="button"
              onClick={onResetFilters}
              className="h-9 px-3 rounded-md border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/50 flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
