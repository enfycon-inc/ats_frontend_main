"use client";

import React, { useState, useEffect } from "react";
import { X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { atsApi } from "@/lib/ats-api";

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: SelectedFilters) => void;
  currentFilters: SelectedFilters;
}

export interface SelectedFilters {
  businessUnit: string;
  predefined: string[];
  accountManagers: string[];
  recruiters: string[];
  branches: string[];
  clients: string[];
  workModes: string[];
  statuses: string[];
  priorities: string[];
}

const PREDEFINED_FILTERS = [
  "Active Jobs",
  "Archived Jobs",
  "My Jobs",
  "Closed Jobs",
  "Jobs with submissions",
  "Jobs without submissions",
  "Jobs without Recruiters Assigned",
  "Jobs with Pipeline",
  "VMS Jobs",
];

export default function FilterDrawer({
  isOpen,
  onClose,
  onApply,
  currentFilters,
}: FilterDrawerProps) {
  const [businessUnit, setBusinessUnit] = useState(currentFilters.businessUnit || "All selected");
  const [selectedPredefined, setSelectedPredefined] = useState<string[]>(currentFilters.predefined || []);
  const [branches, setBranches] = useState<any[]>([]);
  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [draft, setDraft] = useState<SelectedFilters>(currentFilters);

  useEffect(() => {
    atsApi.branches.list()
      .then((data) => setBranches(data || []))
      .catch((err) => console.error("Failed to load branches for filter:", err));
    atsApi.businessUnits.list()
      .then((data) => setBusinessUnits(data || []))
      .catch((err) => console.error("Failed to load business units for filter:", err));
    atsApi.auth.listUsers().then(data => setUsers(data || [])).catch(() => setUsers([]));
    atsApi.clients.list().then(data => setClients(data || [])).catch(() => setClients([]));
  }, []);

  // Sync state with parent state when drawer opens
  useEffect(() => {
    if (isOpen) {
      setDraft(currentFilters);
      setBusinessUnit(currentFilters.businessUnit || "All selected");
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
      ...draft,
      businessUnit,
      predefined: selectedPredefined,
    });
    onClose();
  };

  const handleReset = () => {
    setBusinessUnit("All selected");
    setSelectedPredefined([]);
    setDraft({ businessUnit: "All selected", predefined: [], accountManagers: [], recruiters: [], branches: [], clients: [], workModes: [], statuses: [], priorities: [] });
  };

  const toggleValue = (key: keyof SelectedFilters, value: string) => {
    setDraft((previous) => {
      const values = (previous[key] as string[]) || [];
      return { ...previous, [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] };
    });
  };

  const peopleOptions = (role: "manager" | "recruiter") => users
    .filter((user) => {
      const roles = [user.role, ...(user.roles || []), ...(user.assignedRoles || []).map((item: any) => item.name || item.roleName || item.role)]
        .filter(Boolean).join(" ").toLowerCase();
      return role === "manager" ? /account.manager|delivery.head|branch.admin|unit.admin|tenant.admin/.test(roles) : /recruiter/.test(roles);
    })
    .map((user) => ({ id: user.id, label: user.fullName || user.name || user.email }))
    .filter((item) => item.id && item.label);

  const filterGroups: Array<{ key: keyof SelectedFilters; label: string; options: Array<{ id: string; label: string }> }> = [
    { key: "accountManagers", label: "Account manager", options: peopleOptions("manager") },
    { key: "recruiters", label: "Recruiter", options: peopleOptions("recruiter") },
    { key: "branches", label: "Branch", options: branches.map((item) => ({ id: item.id, label: item.name })).filter((item) => item.id && item.label) },
    { key: "clients", label: "Client", options: clients.map((item) => ({ id: item.id, label: item.clientName || item.name })).filter((item) => item.id && item.label) },
    { key: "workModes", label: "Work mode", options: ["In Office", "Remote", "Hybrid"].map((value) => ({ id: value, label: value })) },
    { key: "statuses", label: "Job status", options: ["Active", "Draft", "Closed", "Archived"].map((value) => ({ id: value, label: value })) },
    { key: "priorities", label: "Priority", options: ["Hot", "Warm", "Cold"].map((value) => ({ id: value, label: value })) },
  ];

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
            {/* Business Unit Select */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  Branch & Branch Unit
                </label>
                {businessUnits.length > 0 && (
                  <span className="text-[9.5px] text-blue-600 dark:text-blue-400 font-medium">
                    {businessUnits.length} branch units
                  </span>
                )}
              </div>
              <select
                value={businessUnit}
                onChange={(e) => setBusinessUnit(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-slate-850 border border-neutral-300 dark:border-slate-700 rounded px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 outline-hidden focus:border-primary transition-colors cursor-pointer"
              >
                <option value="All selected">All Branch Units (All Branches)</option>
                {branches.length > 0 ? (
                  branches.map((b) => {
                    const unitsForBranch = businessUnits.filter((u) => u.branchId === b.id);
                    if (unitsForBranch.length === 0) {
                      return (
                        <option key={b.id} value={b.name}>
                          {b.name} (Branch Office)
                        </option>
                      );
                    }
                    return (
                      <optgroup key={b.id} label={`${b.name} (${b.city ? b.city + ', ' : ''}${b.country || ''})`}>
                        {unitsForBranch.map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.name} — {u.shiftTiming || 'General Shift'} ({u.currency || 'INR'})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })
                ) : (
                  businessUnits.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Filter by</h3>
              {filterGroups.map(({ key, label, options }) => (
                <fieldset key={key} className="space-y-2">
                  <legend className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{label}</legend>
                  <div className="max-h-36 overflow-y-auto rounded-md border border-neutral-200 dark:border-slate-700 p-2 space-y-1">
                    {options.length ? options.map((option) => (
                      <label key={option.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-slate-800">
                        <input type="checkbox" checked={((draft[key] as string[]) || []).includes(option.id)} onChange={() => toggleValue(key, option.id)} />
                        <span className="truncate">{option.label}</span>
                      </label>
                    )) : <p className="px-1.5 py-1 text-xs text-neutral-400">No options available</p>}
                  </div>
                </fieldset>
              ))}
            </div>

            {/* Predefined Filters Tag Grid */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                Pre-Defined Filters
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PREDEFINED_FILTERS.map((filter) => {
                  const isSelected = selectedPredefined.includes(filter);
                  return (
                    <button
                      key={filter}
                      onClick={() => togglePredefined(filter)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                        isSelected
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-slate-650"
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          isSelected ? "bg-primary animate-pulse" : "bg-neutral-300 dark:bg-slate-600"
                        )}
                      />
                      {filter}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Footer Buttons */}
          <div className="p-4 border-t border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="w-1/2 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer font-bold text-xs"
            >
              Reset All
            </Button>
            <div className="flex gap-2 w-1/2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-slate-800 cursor-pointer font-semibold text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="bg-primary text-white hover:bg-primary/90 px-4 cursor-pointer font-bold text-xs shadow-xs"
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
