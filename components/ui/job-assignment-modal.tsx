import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, Users, ShieldAlert, User, Check, X, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type AssignmentType = "unassigned" | "pod" | "recruiters";

interface JobAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentType: AssignmentType;
  selectedPodId: string | null;
  selectedRecruiterIds: string[];
  onApply: (type: AssignmentType, podId: string | null, recruiterIds: string[]) => void;
  podsList: any[];
  recruitersList: any[];
  activeBranch?: any;
  canAssignPods?: boolean;
  canAssignRecruiters?: boolean;
}

export function JobAssignmentModal({
  isOpen,
  onClose,
  assignmentType: initialType,
  selectedPodId: initialPodId,
  selectedRecruiterIds: initialRecruiterIds,
  onApply,
  podsList,
  recruitersList,
  activeBranch,
  canAssignPods = false,
  canAssignRecruiters = false,
}: JobAssignmentModalProps) {
  const [type, setType] = useState<AssignmentType>(initialType);
  const [podId, setPodId] = useState<string | null>(initialPodId);
  const [recruiterIds, setRecruiterIds] = useState<string[]>(initialRecruiterIds);
  
  const [search, setSearch] = useState("");

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setPodId(initialPodId);
      setRecruiterIds(initialRecruiterIds);
      setSearch("");
    }
  }, [isOpen, initialType, initialPodId, initialRecruiterIds]);

  const filteredPods = useMemo(() => {
    if (!search) return podsList;
    const q = search.toLowerCase();
    return podsList.filter((p) => p.name?.toLowerCase().includes(q));
  }, [podsList, search]);

  const filteredRecruiters = useMemo(() => {
    if (!search) return recruitersList;
    const q = search.toLowerCase();
    return recruitersList.filter((r) => {
      const name = (r.fullName || r.name || "").toLowerCase();
      const email = (r.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [recruitersList, search]);

  const handleApply = () => {
    onApply(validSelection ? type : "unassigned", validSelection && type === "pod" ? podId : null, validSelection && type === "recruiters" ? recruiterIds : []);
    onClose();
  };

  const handleSelectAllRecruiters = () => {
    if (allFilteredSelected) {
      setRecruiterIds(ids => ids.filter(id => !recruitersList.some(r => r.id === id)));
    } else {
      setRecruiterIds(ids => [...new Set([...ids, ...recruitersList.map(r => r.id)])]);
    }
  };

  const isPodsEnabled = canAssignPods && activeBranch?.allowPods === true;
  const isRecruitersEnabled = canAssignRecruiters && activeBranch?.allowNone === true;
  const isAssignLaterEnabled = !activeBranch || activeBranch.allowUnassigned === true || activeBranch.allow_unassigned === true;

  // Select All includes every eligible recruiter in the selected unit.
  const allFilteredSelected = recruitersList.length > 0 && recruitersList.every(r => recruiterIds.includes(r.id));
  useEffect(() => {
    if (!isOpen) return;
    if ((type === "pod" && isPodsEnabled) || (type === "recruiters" && isRecruitersEnabled)) return;
    setType(isPodsEnabled ? "pod" : isRecruitersEnabled ? "recruiters" : "unassigned");
  }, [isOpen, type, isPodsEnabled, isRecruitersEnabled]);
  const validSelection = (type === "pod" && isPodsEnabled && podsList.some(p => p.id === podId)) ||
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
            Choose who should work on this requirement.
          </p>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 pt-2">
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
          {!isPodsEnabled && !isRecruitersEnabled && (
            <p className="p-6 text-sm text-slate-500">No assignment channels are enabled for this unit and your active role.</p>
          )}
          
          {/* SEARCH BAR (For Pods & Recruiters) */}
          {type !== "unassigned" && (
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={type === "pod" ? "Search pods..." : "Search recruiters..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 h-9 text-sm"
                />
              </div>
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
                    <div
                      key={pod.id}
                      onClick={() => setPodId(pod.id)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all",
                        podId === pod.id
                          ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700"
                          : "bg-white border-transparent hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80"
                      )}
                    >
                      <div>
                        <p className={cn("font-semibold text-sm", podId === pod.id ? "text-indigo-900 dark:text-indigo-100" : "text-slate-900 dark:text-slate-200")}>
                          {pod.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {pod.members?.length || 0} recruiters {"\u2022"} Lead: {pod.leadName || pod.leadEmail || "None"}
                        </p>
                      </div>
                      <div className={cn(
                        "h-5 w-5 rounded-full border flex items-center justify-center shrink-0",
                        podId === pod.id ? "border-indigo-600 bg-indigo-600" : "border-slate-300 dark:border-slate-600"
                      )}>
                        {podId === pod.id && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* --- RECRUITERS --- */}
            {type === "recruiters" && (
              <>
                {filteredRecruiters.length > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 mb-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {recruiterIds.length} recruiter{recruiterIds.length !== 1 ? 's' : ''} selected
                    </span>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={allFilteredSelected} onChange={handleSelectAllRecruiters} />
                      Select All
                    </label>
                  </div>
                )}
                
                {filteredRecruiters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                    <User className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">No recruiters found.</p>
                  </div>
                ) : (
                  filteredRecruiters.map(rec => {
                    const isSelected = recruiterIds.includes(rec.id);
                    return (
                      <div
                        key={rec.id}
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
                      >
                        <div className={cn(
                          "h-4 w-4 rounded flex items-center justify-center shrink-0 border transition-colors",
                          isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        )}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {rec.fullName || rec.name || "User"}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {rec.email}
                          </span>
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
            <Button variant="ghost" onClick={() => { onApply("unassigned", null, []); onClose(); }}>Clear Assignment</Button>
          </div>
        )}
        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {type === "pod" && podId && (
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" />
                Selected Pod: <span className="font-bold text-slate-900 dark:text-white">{podsList.find(p => p.id === podId)?.name}</span>
              </span>
            )}
            {type === "recruiters" && recruiterIds.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="font-bold text-slate-900 dark:text-white">{recruiterIds.length}</span> Recruiters Selected
              </span>
            )}
            {type === "unassigned" && (
              <span className="text-orange-600 dark:text-orange-400 font-semibold">
                Will save as Unassigned
              </span>
            )}
            {((type === "pod" && !podId) || (type === "recruiters" && recruiterIds.length === 0)) && (
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
