import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Star, Users, User, Check, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { JobPodOption, JobStaffOption } from "@/lib/ats-api";
import { USER_CITY_OPTIONS } from "@/lib/user-city-contract";

export type AssignmentType = "unassigned" | "automatic" | "pod" | "recruiters";

interface JobAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentType: AssignmentType;
  selectedPodIds: string[];
  selectedRecruiterIds: string[];
  onApply: (type: AssignmentType, podIds: string[], recruiterIds: string[]) => void;
  podsList: JobPodOption[];
  recruitersList: JobStaffOption[];
  activeBranch?: any;
  canAssignPods?: boolean;
  canAssignRecruiters?: boolean;
  automaticPods?: boolean;
}

export function JobAssignmentModal({
  isOpen,
  onClose,
  assignmentType: initialType,
  selectedPodIds: initialPodIds,
  selectedRecruiterIds: initialRecruiterIds,
  onApply,
  podsList,
  recruitersList,
  activeBranch,
  canAssignPods = false,
  canAssignRecruiters = false,
  automaticPods = false,
}: JobAssignmentModalProps) {
  const [type, setType] = useState<AssignmentType>(initialType);
  const [podIds, setPodIds] = useState<string[]>(initialPodIds);
  const [recruiterIds, setRecruiterIds] = useState<string[]>(initialRecruiterIds);
  const [recruiterTab, setRecruiterTab] = useState<"frequent" | "all">("frequent");
  const [cityFilter, setCityFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setPodIds(initialPodIds);
      setRecruiterIds(initialRecruiterIds);
      setSearch("");
      setCityFilter("all");
      setRecruiterTab("frequent");
    }
  }, [isOpen, initialType, initialPodIds, initialRecruiterIds]);

  const filteredPods = useMemo(() => {
    if (!search) return podsList;
    const q = search.toLowerCase();
    return podsList.filter((p) => p.name?.toLowerCase().includes(q));
  }, [podsList, search]);

  const cityOptions = useMemo(() => {
    const availableCities = new Set(recruitersList.map(recruiter => recruiter.city?.trim()).filter(Boolean));
    return USER_CITY_OPTIONS.filter(option => availableCities.has(option.value));
  }, [recruitersList]);

  const filteredRecruiters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recruitersList.filter((r) => {
      const name = (r.fullName || "").toLowerCase();
      const email = (r.email || "").toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q);
      const matchesCity = cityFilter === "all" || r.city?.trim() === cityFilter;
      return matchesSearch && matchesCity;
    });
  }, [recruitersList, search, cityFilter]);

  const frequentRecruiters = useMemo(() => filteredRecruiters
    .filter(recruiter => recruiter.assignmentCount > 0)
    .sort((a, b) => {
      const lastAssignedDifference = new Date(b.lastAssignedAt || 0).getTime() - new Date(a.lastAssignedAt || 0).getTime();
      return lastAssignedDifference || b.assignmentCount - a.assignmentCount || a.fullName.localeCompare(b.fullName);
    }), [filteredRecruiters]);

  const visibleRecruiters = recruiterTab === "frequent" ? frequentRecruiters : filteredRecruiters;

  const handleApply = () => {
    onApply(validSelection ? type : "unassigned", validSelection && type === "pod" ? podIds : [], validSelection && type === "recruiters" ? recruiterIds : []);
    onClose();
  };

  const handleSelectAllRecruiters = () => {
    const visibleIds = visibleRecruiters.map(recruiter => recruiter.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => recruiterIds.includes(id));
    if (allVisibleSelected) {
      setRecruiterIds(ids => ids.filter(id => !visibleIds.includes(id)));
    } else {
      setRecruiterIds(ids => [...new Set([...ids, ...visibleIds])]);
    }
  };

  const isAutomaticEnabled = automaticPods && canAssignPods;
  const isPodsEnabled = !automaticPods && canAssignPods && activeBranch?.allowPods === true;
  const isRecruitersEnabled = canAssignRecruiters && activeBranch?.allowNone === true;
  const isAssignLaterEnabled = !activeBranch || activeBranch.allowUnassigned === true || activeBranch.allow_unassigned === true;

  useEffect(() => {
    if (!isOpen) return;
    if ((type === "automatic" && isAutomaticEnabled) || (type === "pod" && isPodsEnabled) || (type === "recruiters" && isRecruitersEnabled)) return;
    setType(isAutomaticEnabled ? "automatic" : isPodsEnabled ? "pod" : isRecruitersEnabled ? "recruiters" : "unassigned");
  }, [isOpen, type, isAutomaticEnabled, isPodsEnabled, isRecruitersEnabled]);
  const validSelection = (type === "automatic" && isAutomaticEnabled) || (type === "pod" && isPodsEnabled && podIds.length > 0 && podIds.every(id => podsList.some(p => p.id === id))) ||
    (type === "recruiters" && isRecruitersEnabled && recruiterIds.length > 0 && recruiterIds.every(id => recruitersList.some(r => r.id === id)));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Job Assignment
          </DialogTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose pods or recruiters for this job.
          </p>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 pt-2">
          {isAutomaticEnabled && <button type="button" onClick={() => setType("automatic")} className={cn("px-4 py-2.5 text-sm font-semibold border-b-2", type === "automatic" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-600")}>Automatic Pods</button>}
          {isPodsEnabled && (
            <button
              onClick={() => { setType("pod"); setSearch(""); }}
              className={cn(
                "px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors",
                type === "pod"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Recruitment Pods
            </button>
          )}
          
          {isRecruitersEnabled && (
          <button
            onClick={() => { setType("recruiters"); setSearch(""); }}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors",
              type === "recruiters"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Individual Recruiters
          </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900">
          {type === "automatic" && isAutomaticEnabled && <p className="p-6 text-sm text-slate-600">The next eligible pod in this unit will be assigned when you publish. Saving a draft does not use a turn.</p>}
          {!isAutomaticEnabled && !isPodsEnabled && !isRecruitersEnabled && (
            <p className="p-6 text-sm text-slate-500">No assignment channels are enabled for this unit and your active role.</p>
          )}
          
          {type === "recruiters" && (
            <div role="tablist" aria-label="Recruiter list" className="flex border-b border-slate-200 bg-slate-50 px-4 dark:border-slate-800 dark:bg-slate-900/50">
              <button type="button" role="tab" aria-selected={recruiterTab === "frequent"} onClick={() => setRecruiterTab("frequent")}
                className={cn("flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold", recruiterTab === "frequent" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white")}>
                <Star className="h-3.5 w-3.5" /> Frequently Assigned
              </button>
              <button type="button" role="tab" aria-selected={recruiterTab === "all"} onClick={() => setRecruiterTab("all")}
                className={cn("border-b-2 px-3 py-2.5 text-sm font-semibold", recruiterTab === "all" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white")}>
                All Recruiters
              </button>
            </div>
          )}

          {/* Search and city filter for recruiters; search for pods. */}
          {type !== "unassigned" && type !== "automatic" && (
            <div className="flex gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={type === "pod" ? "Search pods..." : "Search recruiters..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 h-9 text-sm"
                />
              </div>
              {type === "recruiters" && (
                <select aria-label="Filter recruiters by city" value={cityFilter} onChange={event => setCityFilter(event.target.value)}
                  className="h-9 w-36 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <option value="all">All cities</option>
                  {cityOptions.map(city => <option key={city.value} value={city.value}>{city.label}</option>)}
                </select>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-1 relative">
            {/* --- PODS --- */}
            {type === "pod" && (
              <>
                {filteredPods.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                    <Building2 className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">No pods available.</p>
                  </div>
                ) : (
                  filteredPods.map(pod => (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={podIds.includes(pod.id)}
                      key={pod.id}
                      onClick={() => setPodIds(ids => ids.includes(pod.id) ? ids.filter(id => id !== pod.id) : [...ids, pod.id])}
                      className={cn(
                        "flex w-full items-center justify-start gap-3 text-left p-3 rounded-xl cursor-pointer border transition-all",
                        podIds.includes(pod.id)
                          ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700"
                          : "bg-white border-transparent hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={cn("font-semibold text-sm", podIds.includes(pod.id) ? "text-indigo-900 dark:text-indigo-100" : "text-slate-900 dark:text-slate-200")}>
                          {pod.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {pod.memberCount} members {"\u2022"} Lead: {pod.podHeadName || "None"}
                        </p>
                      </div>
                      <div className={cn(
                        "order-first h-5 w-5 rounded border flex items-center justify-center shrink-0",
                        podIds.includes(pod.id) ? "border-indigo-600 bg-indigo-600" : "border-slate-300 dark:border-slate-600"
                      )}>
                        {podIds.includes(pod.id) && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  ))
                )}
              </>
            )}

            {/* --- RECRUITERS --- */}
            {type === "recruiters" && (
              <>
                {visibleRecruiters.length > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 mb-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {recruiterIds.length} recruiter{recruiterIds.length !== 1 ? 's' : ''} selected
                    </span>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={visibleRecruiters.every(recruiter => recruiterIds.includes(recruiter.id))} onChange={handleSelectAllRecruiters} />
                      Select All
                    </label>
                  </div>
                )}
                
                {visibleRecruiters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                    <User className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-center text-sm">
                      {recruiterTab === "frequent" && filteredRecruiters.length === 0
                        ? "No recruiters match your search or city filter."
                        : recruiterTab === "frequent"
                          ? "No recruiters have been assigned to jobs you created in this unit yet."
                          : "No recruiters match your search or city filter."}
                    </p>
                    {recruiterTab === "frequent" && filteredRecruiters.length > 0 && (
                      <Button type="button" variant="link" className="mt-1 h-auto p-1" onClick={() => setRecruiterTab("all")}>Browse all recruiters</Button>
                    )}
                  </div>
                ) : (
                  visibleRecruiters.map(rec => {
                    const isSelected = recruiterIds.includes(rec.id);
                    const initials = rec.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";
                    const lastAssignedDate = rec.lastAssignedAt ? new Date(rec.lastAssignedAt) : null;
                    const lastAssignedLabel = lastAssignedDate && !Number.isNaN(lastAssignedDate.getTime())
                      ? lastAssignedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                      : null;
                    return (
                      <div
                        key={rec.id}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => {
                          if (isSelected) {
                            setRecruiterIds(prev => prev.filter(id => id !== rec.id));
                          } else {
                            setRecruiterIds(prev => [...prev, rec.id]);
                          }
                        }}
                        className={cn(
                          "flex items-center p-2.5 rounded-lg cursor-pointer border transition-all gap-3",
                          isSelected
                            ? "bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800/50"
                            : "bg-white border-transparent hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                        )}
                        onKeyDown={event => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            if (isSelected) setRecruiterIds(prev => prev.filter(id => id !== rec.id));
                            else setRecruiterIds(prev => [...prev, rec.id]);
                          }
                        }}
                      >
                        <div className={cn(
                          "h-4 w-4 rounded flex items-center justify-center shrink-0 border transition-colors",
                          isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        )}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <Avatar className="h-9 w-9 shrink-0 border border-slate-200 dark:border-slate-700">
                          <AvatarImage src={rec.avatar || undefined} alt="" />
                          <AvatarFallback className="bg-blue-50 text-[10px] font-semibold text-[#1a4fa0] dark:bg-blue-950/50 dark:text-blue-300">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{rec.fullName || "User"}</span>
                          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{rec.email}</span>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {rec.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{USER_CITY_OPTIONS.find(option => option.value === rec.city)?.label || rec.city}</span>}
                            {recruiterTab === "frequent" && <span>{rec.assignmentCount} job{rec.assignmentCount === 1 ? "" : "s"}{lastAssignedLabel ? ` · Last assigned ${lastAssignedLabel}` : ""}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}


          </div>
        </div>

        {isAssignLaterEnabled && (
          <div className="px-6 py-2 flex justify-end">
            <Button variant="ghost" onClick={() => { onApply("unassigned", [], []); onClose(); }}>Clear Assignment</Button>
          </div>
        )}
        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {type === "pod" && podIds.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="font-bold text-slate-900 dark:text-white">{podIds.length}</span> pods selected
              </span>
            )}
            {type === "recruiters" && recruiterIds.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="font-bold text-slate-900 dark:text-white">{recruiterIds.length}</span> Recruiters Selected
              </span>
            )}
            {type === "automatic" && <span>Automatic pod assignment</span>}
            {type === "unassigned" && (
              <span className="text-orange-600 dark:text-orange-400 font-semibold">
                Will save as Unassigned
              </span>
            )}
            {((type === "pod" && podIds.length === 0) || (type === "recruiters" && recruiterIds.length === 0)) && (
              <span className="text-slate-500 font-normal">No assignment selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} className="h-9 font-semibold">
              Cancel
            </Button>
            <Button 
              onClick={handleApply} 
              disabled={!validSelection && !isAssignLaterEnabled}
              className="h-9 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Apply Assignment
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
