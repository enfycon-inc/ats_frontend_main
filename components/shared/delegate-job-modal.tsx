import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Share2, Loader2, AlertCircle } from "lucide-react";
import { atsApi } from "@/lib/ats-api";

interface DelegateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobCode: string;
  jobTitle: string;
  onSuccess: () => void;
}

export function DelegateJobModal({ isOpen, onClose, jobId, jobCode, jobTitle, onSuccess }: DelegateJobModalProps) {
  const [targetUnits, setTargetUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [targetUnitId, setTargetUnitId] = useState("");
  const [targetBranchId, setTargetBranchId] = useState("");
  const [noOfPositions, setNoOfPositions] = useState("");
  const [slaDaysTarget, setSlaDaysTarget] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (isOpen) {
      setLoading(true);
      setTargetUnits([]);
      atsApi.businessUnits.delegationTargets(jobId).then(res => {
        if (!cancelled) setTargetUnits(Array.isArray(res) ? res : []);
      }).catch(err => {
        if (!cancelled) setError(err.message || "Unable to load delegation targets. Please reopen to retry.");
      }).finally(() => { if (!cancelled) setLoading(false); });
      // Reset state
      setTargetUnitId("");
      setTargetBranchId("");
      setNoOfPositions("");
      setSlaDaysTarget("");
      setNotes("");
      setError(null);
    }
    return () => { cancelled = true; };
  }, [isOpen, jobId]);

  const branches = Array.from(new Map(targetUnits.filter(u => u.branchId).map(u => [u.branchId, { id: u.branchId, name: u.branchName || u.branch?.name || "Branch" }])).values());
  const visibleUnits = targetUnits.filter(u => u.branchId === targetBranchId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !visibleUnits.some(u => u.id === targetUnitId)) {
      setError("Please select a target operating unit.");
      return;
    }
    if (!noOfPositions || parseInt(noOfPositions) < 1) {
      setError("Number of positions is required and must be at least 1.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await atsApi.jobs.delegate(jobId, {
        targetUnitId,
        targetBranchId,
        slaDaysTarget: slaDaysTarget ? parseInt(slaDaysTarget) : undefined,
        notes: [`Positions requested: ${parseInt(noOfPositions)}`, notes.trim()].filter(Boolean).join("\n"),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to delegate job.");
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = !loading && visibleUnits.some(u => u.id === targetUnitId) && !!noOfPositions && parseInt(noOfPositions) >= 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Share2 className="h-5 w-5" /> Delegate Job (Unit-to-Unit)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select a branch and an operating unit in the job’s market segment to work on <strong>{jobCode} - {jobTitle}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md flex gap-2 items-start border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold text-neutral-700">Target Branch <span className="text-red-500">*</span></Label>
            <Select value={targetBranchId} onValueChange={id => { setTargetBranchId(id); setTargetUnitId(""); }} disabled={loading || submitting}>
              <SelectTrigger className="w-full text-xs h-9"><SelectValue placeholder={loading ? "Loading branches..." : "Select branch..."} /></SelectTrigger>
              <SelectContent>
                {branches.map(branch => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!loading && !error && branches.length === 0 && <p className="text-xs text-muted-foreground">No other branch has an operating unit in this job’s market segment.</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-neutral-700">Target Operating Unit (Same Market Segment) <span className="text-red-500">*</span></Label>
            <Select value={targetUnitId} onValueChange={setTargetUnitId} disabled={loading || submitting || !targetBranchId}>
              <SelectTrigger className="w-full text-xs h-9">
                <SelectValue placeholder={!targetBranchId ? "Select a branch first..." : "Select operating unit..."} />
              </SelectTrigger>
              <SelectContent>
                {visibleUnits.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    No eligible operating units found in this branch.
                  </div>
                ) : (
                  visibleUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.market})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Only units matching the job’s market segment are available.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-neutral-700">No. of Positions <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min="1"
              placeholder="e.g. 2"
              value={noOfPositions}
              onChange={(e) => setNoOfPositions(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-neutral-700">SLA Target (Days) <span className="text-neutral-400 font-normal">(Optional)</span></Label>
            <Input
              type="number"
              min="1"
              placeholder="Days to deliver profiles"
              value={slaDaysTarget}
              onChange={(e) => setSlaDaysTarget(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-neutral-700">Notes / Instructions <span className="text-neutral-400 font-normal">(Optional)</span></Label>
            <Textarea
              rows={3}
              placeholder="Any specific instructions for the target branch..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-neutral-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} size="sm" className="text-xs h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !isFormValid} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
              Send Delegation Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


