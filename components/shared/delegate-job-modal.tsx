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
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [targetBranchId, setTargetBranchId] = useState("");
  const [noOfPositions, setNoOfPositions] = useState("");
  const [slaDaysTarget, setSlaDaysTarget] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadBranches();
      // Reset state
      setTargetBranchId("");
      setNoOfPositions("");
      setSlaDaysTarget("");
      setNotes("");
      setError(null);
    }
  }, [isOpen]);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await atsApi.branches.list();
      // Filter out the current user's branch (we don't want to delegate to ourselves)
      // For now, list all branches. The backend prevents delegating to the same branch.
      setBranches(res || []);
    } catch (err) {
      console.error("Failed to load branches", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBranchId) {
      setError("Please select a target branch.");
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

  const isFormValid = !!targetBranchId && !!noOfPositions && parseInt(noOfPositions) >= 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Share2 className="h-5 w-5" /> Delegate Job (Co-Source)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Send a delegation request to another branch to work on <strong>{jobCode} - {jobTitle}</strong>.
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
            <Select value={targetBranchId} onValueChange={setTargetBranchId} disabled={loading}>
              <SelectTrigger className="w-full text-xs h-9">
                <SelectValue placeholder={loading ? "Loading branches..." : "Select branch..."} />
              </SelectTrigger>
              <SelectContent>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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


