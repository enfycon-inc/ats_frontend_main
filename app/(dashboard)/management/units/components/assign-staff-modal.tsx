"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, UserPlus, Search, Check, X, 
  Loader2, AlertCircle, ArrowRight, Building2, Layers, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";

export interface UnitInfo {
  id: string;
  name: string;
  code?: string | null;
  branchName?: string | null;
  branchId?: string | null;
  market?: string | null;
}

interface CandidateStaff {
  id: string;
  email: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePicture?: string | null;
  isActive: boolean;
  branchId?: string | null;
  branchName?: string | null;
  currentUnitId?: string | null;
  currentUnitName?: string | null;
  roleName: string;
  systemRole?: string | null;
  podName?: string | null;
  isAssigned: boolean;
  isSameBranch: boolean;
}

interface AssignStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: UnitInfo | null;
  onSaved: () => void;
}

export function AssignStaffModal({
  isOpen,
  onClose,
  unit,
  onSaved,
}: AssignStaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [candidates, setCandidates] = useState<CandidateStaff[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialAssignedIds, setInitialAssignedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterScope, setFilterScope] = useState<"all" | "branch" | "assigned">("all");

  useEffect(() => {
    if (!isOpen || !unit?.id) return;

    let isMounted = true;
    setLoading(true);
    setSearchQuery("");
    setFilterScope("all");

    atsApi.businessUnits
      .getCandidateStaff(unit.id)
      .then((data: CandidateStaff[]) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : [];
        setCandidates(list);

        const assigned = new Set<string>();
        list.forEach((u) => {
          if (u.isAssigned) assigned.add(u.id);
        });
        setSelectedIds(new Set(assigned));
        setInitialAssignedIds(new Set(assigned));
      })
      .catch((err: any) => {
        console.error("Failed to load candidate staff:", err);
        toast.error("Failed to load candidate staff members.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, unit?.id]);

  const toggleUser = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // Scope filter
      if (filterScope === "branch" && !c.isSameBranch) return false;
      if (filterScope === "assigned" && !selectedIds.has(c.id)) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (c.fullName || "").toLowerCase().includes(q);
        const matchesEmail = (c.email || "").toLowerCase().includes(q);
        const matchesRole = (c.roleName || "").toLowerCase().includes(q);
        const matchesBranch = (c.branchName || "").toLowerCase().includes(q);
        const matchesUnit = (c.currentUnitName || "").toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesRole && !matchesBranch && !matchesUnit) {
          return false;
        }
      }
      return true;
    });
  }, [candidates, filterScope, selectedIds, searchQuery]);

  const handleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredCandidates.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const handleDeselectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredCandidates.forEach((c) => next.delete(c.id));
      return next;
    });
  };

  const handleSave = async () => {
    if (!unit?.id) return;
    setSaving(true);
    try {
      const idsArray = Array.from(selectedIds);
      await atsApi.businessUnits.assignMembers(unit.id, idsArray);
      toast.success(
        `Updated staff assignments for ${unit.name} (${idsArray.length} active staff).`
      );
      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Failed to assign staff members:", err);
      toast.error(err.message || "Failed to update staff assignments.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !unit) return null;

  const sameBranchCount = candidates.filter((c) => c.isSameBranch).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-slate-800 bg-neutral-50/70 dark:bg-slate-850 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Assign Staff to {unit.name}
                </h2>
                {unit.code && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                    {unit.code}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                  <Building2 className="h-3 w-3 text-neutral-400" />
                  {unit.branchName || "Unassigned Branch"}
                </span>
                <span>{"\u2022"}</span>
                <span>{unit.market === "US" ? "US IT Market" : "Domestic India"}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* SEARCH & FILTERS STRIP */}
        <div className="p-4 border-b border-neutral-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name, email, or role..."
                className="pl-8.5 h-8.5 text-xs bg-neutral-50 dark:bg-slate-850 rounded-lg border-neutral-200 dark:border-slate-700"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-slate-800 p-0.5 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setFilterScope("all")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                  filterScope === "all"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400"
                }`}
              >
                All ({candidates.length})
              </button>
              {unit.branchName && (
                <button
                  type="button"
                  onClick={() => setFilterScope("branch")}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    filterScope === "branch"
                      ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs"
                      : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {unit.branchName} ({sameBranchCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterScope("assigned")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                  filterScope === "assigned"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400"
                }`}
              >
                Selected ({selectedIds.size})
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-0.5">
            <span className="font-medium">
              Showing <strong>{filteredCandidates.length}</strong> available staff member{filteredCandidates.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Select All
              </button>
              <span>{"\u2022"}</span>
              <button
                type="button"
                onClick={handleDeselectAllFiltered}
                className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-semibold cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {/* CANDIDATE STAFF LIST */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-neutral-100 dark:divide-slate-800/80">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-xs text-neutral-500 mt-2 font-medium">
                Loading candidate staff members...
              </p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="py-16 text-center text-neutral-400">
              <Users className="h-10 w-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
              <p className="font-semibold text-neutral-700 dark:text-neutral-200 text-sm">
                No staff members found
              </p>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                {searchQuery
                  ? "Try searching for a different name, email, or role."
                  : "No staff match the selected filter scope."}
              </p>
            </div>
          ) : (
            filteredCandidates.map((c) => {
              const isSelected = selectedIds.has(c.id);
              const wasAssigned = initialAssignedIds.has(c.id);
              const willBeTransferred = !wasAssigned && !!c.currentUnitName && isSelected;
              const initials = (c.fullName || "User")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();

              return (
                <div
                  key={c.id}
                  onClick={() => toggleUser(c.id)}
                  className={`py-3 px-3 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                    isSelected
                      ? "bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50"
                      : "hover:bg-neutral-50 dark:hover:bg-slate-850/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent onClick
                      className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    />

                    {/* Avatar */}
                    <div className="h-8 w-8 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                          {c.fullName}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-700 dark:bg-slate-800 dark:text-neutral-300 border border-neutral-200/80 dark:border-slate-700 shrink-0">
                          {c.roleName}
                        </span>
                        {c.branchName && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 shrink-0">
                            {c.branchName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                        <span className="truncate">{c.email}</span>
                        {c.podName && (
                          <>
                            <span>{"\u2022"}</span>
                            <span className="text-purple-600 dark:text-purple-400 font-medium">
                              Pod: {c.podName}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Transfer warning if changing units */}
                      {willBeTransferred && (
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/60">
                            <AlertCircle className="h-3 w-3" />
                            Will be transferred from {c.currentUnitName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator on right */}
                  <div className="shrink-0 text-right">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                        <Check className="h-3 w-3" />
                        {wasAssigned ? "Assigned" : "Selected"}
                      </span>
                    ) : wasAssigned ? (
                      <span className="text-[10.5px] font-medium text-rose-600 dark:text-rose-400">
                        Will be unassigned
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-400">Unassigned</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-neutral-200 dark:border-slate-800 bg-neutral-50/70 dark:bg-slate-850 flex items-center justify-between shrink-0">
          <div className="text-xs text-neutral-600 dark:text-neutral-300">
            <strong className="text-blue-600 font-bold">{selectedIds.size}</strong> staff member{selectedIds.size === 1 ? "" : "s"} assigned to <strong>{unit.name}</strong>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-8.5 px-3.5 text-xs font-semibold border-neutral-300 dark:border-slate-700"
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={saving || loading}
              onClick={handleSave}
              className="h-8.5 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" /> Save Assignments
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
