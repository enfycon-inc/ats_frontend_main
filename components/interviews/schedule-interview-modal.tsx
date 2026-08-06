"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Clock,
  UserCheck,
  Video,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: {
    id: number;
    candidateId: number;
    candidateName?: string;
    jobTitle?: string;
    jobCode?: string;
    l1Status?: string | null;
    l1Date?: string | null;
    l1Interviewer?: string | null;
    l1Remarks?: string | null;
    l2Status?: string | null;
    l2Date?: string | null;
    l2Interviewer?: string | null;
    l2Remarks?: string | null;
    l3Status?: string | null;
    l3Date?: string | null;
    l3Interviewer?: string | null;
    l3Remarks?: string | null;
    finalStatus?: string;
    meetingLink?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  submission,
  onSuccess,
}: ScheduleInterviewModalProps) {
  const [stage, setStage] = useState<"INTERNAL" | "L1" | "L2" | "L3">("L1");
  const [scheduledAt, setScheduledAt] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [status, setStatus] = useState<"SCHEDULED" | "CLEARED" | "REJECTED" | "PENDING">("SCHEDULED");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (submission) {
      // Default stage: check existing statuses
      if (submission.finalStatus === "PENDING_APPROVAL") {
        setStage("INTERNAL");
      } else if (!submission.l1Status || submission.l1Status === "PENDING") {
        setStage("L1");
      } else if (submission.l1Status === "CLEARED" && (!submission.l2Status || submission.l2Status === "PENDING")) {
        setStage("L2");
      } else if (submission.l2Status === "CLEARED" && (!submission.l3Status || submission.l3Status === "PENDING")) {
        setStage("L3");
      } else {
        setStage("L1");
      }

      setMeetingLink(submission.meetingLink || "");
    }
  }, [submission]);

  // Sync stage selection to form values
  useEffect(() => {
    if (!submission) return;

    if (stage === "INTERNAL") {
      setStatus(submission.finalStatus === "PENDING_APPROVAL" ? "PENDING" : "CLEARED");
      setScheduledAt("");
      setInterviewer(submission.l1Interviewer || "");
      setRemarks(submission.l1Remarks || "");
    } else if (stage === "L1") {
      setStatus((submission.l1Status as any) || "SCHEDULED");
      setScheduledAt(submission.l1Date ? submission.l1Date.slice(0, 16) : "");
      setInterviewer(submission.l1Interviewer || "");
      setRemarks(submission.l1Remarks || "");
    } else if (stage === "L2") {
      setStatus((submission.l2Status as any) || "SCHEDULED");
      setScheduledAt(submission.l2Date ? submission.l2Date.slice(0, 16) : "");
      setInterviewer(submission.l2Interviewer || "");
      setRemarks(submission.l2Remarks || "");
    } else if (stage === "L3") {
      setStatus((submission.l3Status as any) || "SCHEDULED");
      setScheduledAt(submission.l3Date ? submission.l3Date.slice(0, 16) : "");
      setInterviewer(submission.l3Interviewer || "");
      setRemarks(submission.l3Remarks || "");
    }
  }, [stage, submission]);

  if (!submission) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: any = {
        meetingLink: meetingLink.trim() || null,
      };

      if (stage === "INTERNAL") {
        if (status === "CLEARED") {
          payload.finalStatus = "SUBMITTED";
        } else if (status === "REJECTED") {
          payload.finalStatus = "REJECTED";
        }
        if (remarks.trim()) payload.podLeadRemarks = remarks.trim();
      } else if (stage === "L1") {
        payload.l1Status = status;
        payload.l1Date = scheduledAt ? new Date(scheduledAt).toISOString() : null;
        payload.l1Interviewer = interviewer.trim() || null;
        payload.l1Remarks = remarks.trim() || null;

        if (status === "REJECTED") {
          payload.finalStatus = "REJECTED";
        } else if (status === "CLEARED" && submission.finalStatus === "PENDING_APPROVAL") {
          payload.finalStatus = "SUBMITTED";
        }
      } else if (stage === "L2") {
        payload.l2Status = status;
        payload.l2Date = scheduledAt ? new Date(scheduledAt).toISOString() : null;
        payload.l2Interviewer = interviewer.trim() || null;
        payload.l2Remarks = remarks.trim() || null;

        if (status === "REJECTED") {
          payload.finalStatus = "REJECTED";
        }
      } else if (stage === "L3") {
        payload.l3Status = status;
        payload.l3Date = scheduledAt ? new Date(scheduledAt).toISOString() : null;
        payload.l3Interviewer = interviewer.trim() || null;
        payload.l3Remarks = remarks.trim() || null;

        if (status === "CLEARED") {
          payload.finalStatus = "OFFER";
        } else if (status === "REJECTED") {
          payload.finalStatus = "REJECTED";
        }
      }

      await atsApi.submissions.update(submission.id, payload);
      toast.success(`Interview round (${stage}) updated successfully!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(`Failed to update interview: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl p-0 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850/40">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-extrabold text-[10px] uppercase tracking-wide border-0 px-2 py-0.5">
              Interview & Scorecard
            </Badge>
            {submission.jobCode && (
              <span className="text-[10px] font-mono text-neutral-500 font-bold">
                {submission.jobCode}
              </span>
            )}
          </div>
          <DialogTitle className="text-lg font-black text-neutral-900 dark:text-white mt-1.5 flex items-center justify-between">
            <span>Schedule Interview: {submission.candidateName}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500 mt-0.5">
            Log interview dates, interviewer details, and scorecard evaluation remarks.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          {/* Stage Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-450">
              Select Round / Stage
            </label>
            <div className="grid grid-cols-4 gap-1.5 bg-neutral-100 dark:bg-slate-800 p-1 rounded-lg">
              {[
                { key: "INTERNAL", label: "Internal Screen" },
                { key: "L1", label: "L1 Screen" },
                { key: "L2", label: "L2 Tech Round" },
                { key: "L3", label: "L3 Final / HR" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStage(item.key as any)}
                  className={`py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    stage === item.key
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          {stage !== "INTERNAL" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-450 flex items-center gap-1">
                  <CalendarDays className="h-3 w-3 text-indigo-500" /> Date & Time
                </label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Interviewer Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-450 flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-indigo-500" /> Interviewer Name / Email
                </label>
                <Input
                  placeholder="e.g. John Doe (Tech Lead)"
                  value={interviewer}
                  onChange={(e) => setInterviewer(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          {/* Meeting URL */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-450 flex items-center gap-1">
              <Video className="h-3 w-3 text-indigo-500" /> Meeting Link (Zoom / Teams / Meet)
            </label>
            <Input
              placeholder="https://meet.google.com/abc-xyz"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              className="h-9 text-xs font-mono text-indigo-600 dark:text-indigo-400"
            />
          </div>

          {/* Round Outcome Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-450">
              Round Status / Outcome
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "SCHEDULED", label: "Scheduled", color: "border-indigo-200 bg-indigo-50/50 text-indigo-700" },
                { key: "CLEARED", label: "Passed / Cleared", color: "border-emerald-200 bg-emerald-50/50 text-emerald-700" },
                { key: "REJECTED", label: "Rejected", color: "border-rose-200 bg-rose-50/50 text-rose-700" },
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatus(st.key as any)}
                  className={`py-2 px-2 border rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    status === st.key
                      ? `${st.color} ring-2 ring-indigo-500/20`
                      : "border-neutral-200 dark:border-slate-800 text-neutral-500 hover:border-neutral-300"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Evaluation / Scorecard Remarks */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-450 flex items-center gap-1">
              <FileText className="h-3 w-3 text-indigo-500" /> Evaluation Remarks & Feedback
            </label>
            <textarea
              rows={3}
              placeholder="Enter interviewer feedback, technical score, or screening notes..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full p-2.5 text-xs border border-neutral-250 dark:border-slate-700 rounded-lg bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-600"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-neutral-100 dark:border-slate-800 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-neutral-300 font-semibold text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-9 shadow-sm"
            >
              {submitting ? "Saving..." : "Save Interview Details"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
