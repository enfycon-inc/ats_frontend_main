// @ts-nocheck
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Check, X, Loader2, Sparkles } from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { atsApi } from "@/lib/ats-api";
import { UserAvatar } from "@/components/shared/user-identity";
import { Job } from "../../data/mock-jobs";

export interface PodLeadAssignModalProps {
  job: Job | null;
  currentUser: any;
  currentUserBranchId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedFields: Partial<Job>) => void;
}

export function PodLeadAssignModal({
  job,
  currentUser,
  currentUserBranchId,
  isOpen,
  onClose,
  onSuccess,
}: PodLeadAssignModalProps) {
  const [search, setSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [podInfo, setPodInfo] = useState<{ id?: string; name?: string; memberCount?: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize and load pod recruiters whenever modal opens
  useEffect(() => {
    if (!isOpen || !job) {
      setHasInteracted(false);
      setErrorMessage(null);
      return;
    }

    setSearch("");
    setIsSaving(false);
    setHasInteracted(false);
    setErrorMessage(null);

    // Initial selected recruiters from job requisition
    const initialSelected: string[] = [];
    if (Array.isArray((job as any).recruiterIds)) {
      for (const rid of (job as any).recruiterIds) {
        if (rid && !initialSelected.includes(rid)) {
          initialSelected.push(rid);
        }
      }
    }
    if (job.recruiterId && !initialSelected.includes(job.recruiterId)) {
      initialSelected.push(job.recruiterId);
    }
    setSelectedUserIds(initialSelected);

    let isDisposed = false;
    async function loadPodData() {
      setIsLoading(true);
      try {
        const targetBranchId = job?.branchId || currentUserBranchId || undefined;
        const targetUnitId =
          (job as any)?.businessUnitId ||
          (job as any)?.business_unit_id ||
          (currentUser as any)?.businessUnitId ||
          undefined;

        // Fetch scoped staffing options for this job (backend strictly enforces pod_id = actor's pod)
        // and fetch the Pod Lead's team metadata
        const [staff, myTeam] = await Promise.all([
          atsApi.jobs
            .staffingOptions(
              {
                branchId: targetBranchId,
                businessUnitId: targetUnitId,
                jobId: job.id,
              },
              { silent: true }
            )
            .catch((err: any) => {
              const msg = err?.message || "Unable to load eligible recruiters for this job.";
              setErrorMessage(msg);
              return [];
            }),
          atsApi.pods.findMyTeam().catch(() => null),
        ]);

        if (isDisposed) return;

        const eligibleStaff = (staff || []).filter((u: any) => u.canRecruit !== false);
        setRecruiters(eligibleStaff);

        // Resolve Pod metadata
        if (myTeam) {
          setPodInfo({
            id: myTeam.id,
            name: myTeam.name,
            memberCount: myTeam.members?.length || eligibleStaff.length,
          });
        } else if (job.podName && job.podName !== "N/A" && job.podName.toLowerCase() !== "unassigned") {
          setPodInfo({
            name: job.podName,
            memberCount: eligibleStaff.length,
          });
        } else {
          setPodInfo({
            name: "Recruitment Pod",
            memberCount: eligibleStaff.length,
          });
        }

        // Fallback: match by recruiter names if IDs were not populated
        if (initialSelected.length === 0) {
          const recruiterStr =
            job.recruiter && job.recruiter !== "N/A" && job.recruiter.toLowerCase() !== "unassigned"
              ? job.recruiter
              : (job as any).assignedTo &&
                (job as any).assignedTo !== "N/A" &&
                (job as any).assignedTo !== "Unassigned"
              ? (job as any).assignedTo
              : "";
          if (recruiterStr && !recruiterStr.toUpperCase().startsWith("ALL")) {
            const names = recruiterStr.split(",").map((s: string) => s.trim().toLowerCase());
            const matchedIds: string[] = [];
            for (const u of eligibleStaff) {
              const uName = (u.fullName || u.name || "").toLowerCase();
              if (uName && names.includes(uName) && !matchedIds.includes(u.id)) {
                matchedIds.push(u.id);
              }
            }
            if (matchedIds.length > 0) {
              setSelectedUserIds(matchedIds);
            }
          }
        }
      } catch (err: any) {
        if (!isDisposed) {
          console.error("[PodLeadAssignModal] Failed to load pod staffing:", err);
          setErrorMessage(err?.message || "Failed to load pod recruiters.");
        }
      } finally {
        if (!isDisposed) {
          setIsLoading(false);
        }
      }
    }

    loadPodData();
    return () => {
      isDisposed = true;
    };
  }, [isOpen, job?.id, currentUser, currentUserBranchId]);

  // Filter recruiters strictly within pod by search query
  const filteredRecruiters = useMemo(() => {
    if (!search.trim()) return recruiters;
    const q = search.trim().toLowerCase();
    return recruiters.filter((u: any) => {
      const name = (u.fullName || u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [recruiters, search]);

  // Selection handlers
  const handleToggleUser = (userId: string) => {
    setHasInteracted(true);
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setHasInteracted(true);
    const visibleIds = filteredRecruiters.map((u: any) => u.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id: string) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleDeselectAll = () => {
    setHasInteracted(true);
    setSelectedUserIds([]);
  };

  // Submit assignments (Strictly Pod Lead mutation payload: only recruiter fields)
  const handleSave = async (unassignAll = false) => {
    if (!job) return;
    setIsSaving(true);
    try {
      const targetUserIds = unassignAll ? [] : selectedUserIds;
      const selectedUsers = recruiters.filter((u: any) => targetUserIds.includes(u.id));
      const recruiterNames = selectedUsers.map((u: any) => u.fullName || u.name || u.email);

      // Strict Pod Lead payload: NEVER send podId, podIds, podName, or assignmentReason
      const payload: Record<string, any> = {
        recruiterId: selectedUsers[0]?.id || null,
        recruiterIds: selectedUsers.map((u: any) => u.id),
        recruiter: recruiterNames.length > 0 ? recruiterNames.join(", ") : "N/A",
        assignedTo: recruiterNames.length > 0 ? recruiterNames.join(", ") : "Unassigned",
      };

      await atsApi.jobs.update(job.id, payload);

      onSuccess({
        ...payload,
        _alreadySaved: true,
      } as any);

      if (unassignAll || selectedUsers.length === 0) {
        toast.success("Recruiter assignments cleared for this pod.");
      } else {
        toast.success(
          `Assigned ${selectedUsers.length} recruiter${selectedUsers.length > 1 ? "s" : ""} to ${job.jobCode || "job"}.`
        );
      }

      onClose();
    } catch (err: any) {
      console.error("[PodLeadAssignModal] Save failed:", err);
      toast.error(err?.message || "Failed to update recruiter assignments.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentlyAssignedSet = useMemo(() => {
    if (!job) return new Set<string>();
    const ids = Array.isArray((job as any).recruiterIds)
      ? (job as any).recruiterIds
      : job.recruiterId
      ? [job.recruiterId]
      : [];
    return new Set<string>(ids.map(String));
  }, [job]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Assign Pod Recruiters</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Assign active recruiters from your pod to this job requisition.
              </DialogDescription>
            </div>
          </div>

          {/* Context Badges Container */}
          <div className="mt-3 p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 space-y-1.5 text-xs">
            {/* Pod Info Badge */}
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-medium">
              <Icon icon="heroicons:user-group" className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                {podInfo?.name || "Enterprise Recruitment Pod"}
                <span className="text-blue-600/80 dark:text-blue-400/80 font-normal ml-1">
                  • {podInfo?.memberCount || recruiters.length} Member{podInfo?.memberCount !== 1 ? "s" : ""}
                </span>
              </span>
            </div>

            {/* Job Requisition Badge */}
            {job && (
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-[11.5px] truncate">
                <Icon icon="heroicons:tag" className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span className="truncate">
                  Job: <strong className="font-semibold text-slate-900 dark:text-slate-100">[{job.jobCode}]</strong>{" "}
                  {job.jobTitle}
                  {job.client && <span className="text-slate-500"> ({job.client})</span>}
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Search Bar & Shortcuts Toolbar */}
        <div className="px-5 pt-3 pb-2 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Icon
                icon="heroicons:magnifying-glass"
                className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400"
              />
              <Input
                placeholder="Filter pod recruiters by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8.5 text-xs bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-lg"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSelectAll}
              disabled={filteredRecruiters.length === 0}
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
            >
              Select All ({filteredRecruiters.length})
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              disabled={selectedUserIds.length === 0}
              className="text-[11px] font-medium px-2 py-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Recruiter List Area */}
        <div className="px-5 py-1 max-h-[340px] min-h-[180px] overflow-y-auto space-y-1.5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
              <span>Loading pod recruiters...</span>
            </div>
          ) : errorMessage ? (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <Icon icon="heroicons:exclamation-triangle" className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold">Unable to load recruiters</p>
                <p className="text-[11px] mt-0.5 opacity-90">{errorMessage}</p>
              </div>
            </div>
          ) : filteredRecruiters.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              <Icon icon="heroicons:users" className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-600 dark:text-slate-300 text-xs">
                {search ? `No pod recruiters matching "${search}"` : "No recruiters found in your pod."}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {search ? "Try searching with a different name or email." : "Please contact your Delivery Head to add recruiters to this pod."}
              </p>
            </div>
          ) : (
            filteredRecruiters.map((u: any) => {
              const isSelected = selectedUserIds.includes(u.id);
              const isCurrentlyAssigned = currentlyAssignedSet.has(String(u.id));

              return (
                <div
                  key={u.id}
                  onClick={() => handleToggleUser(u.id)}
                  className={cn(
                    "p-2.5 sm:px-3 sm:py-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs transition-all cursor-pointer select-none",
                    isSelected
                      ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-600 shadow-2xs ring-1 ring-blue-400/40"
                      : isCurrentlyAssigned
                      ? "border-slate-300 bg-slate-50/60 dark:bg-slate-800/40 dark:border-slate-700 hover:bg-slate-100/70"
                      : "border-slate-200/90 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-850/80"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Checkbox Icon */}
                    <div
                      className={cn(
                        "h-4.5 w-4.5 rounded flex items-center justify-center shrink-0 transition-colors border",
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-transparent hover:border-blue-400"
                      )}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>

                    {/* Avatar */}
                    <UserAvatar user={u} className="h-8 w-8 text-xs font-semibold" />

                    {/* Recruiter Details: Full Name & Email beneath */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                          {u.fullName || u.name}
                        </span>

                        {isCurrentlyAssigned && (
                          <Badge
                            variant="outline"
                            className="text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 py-0 h-4 px-1.5"
                          >
                            Currently Assigned
                          </Badge>
                        )}
                      </div>

                      {u.email && (
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                          {u.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <span className="text-[10.5px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 shrink-0">
                      Selected
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 flex flex-row items-center justify-between sm:justify-between">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white">{selectedUserIds.length}</span> of{" "}
            <span>{recruiters.length}</span> Pod Recruiters Assigned
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving || selectedUserIds.length === 0}
              onClick={() => handleSave(true)}
              className="text-xs h-8 px-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              Clear All
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isSaving || isLoading}
              onClick={() => handleSave(false)}
              className="text-xs h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer shadow-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                "Update Recruiter Assignments"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
