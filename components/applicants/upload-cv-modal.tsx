"use client";

import React, { useState, useEffect, useRef } from "react";
import { UploadCloud, FileText, X, CheckCircle2, AlertCircle, Loader2, Sparkles, Briefcase, User, Mail, Phone, MapPin, Tag } from "lucide-react";
import { atsApi } from "@/lib/ats-api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface UploadCvModalProps {
  onClose: () => void;
  onDone: (msg: string) => void;
}

export default function UploadCvModal({ onClose, onDone }: UploadCvModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Submit to Job States
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [submitToJob, setSubmitToJob] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [submittedRate, setSubmittedRate] = useState("");
  const [recruiterComment, setRecruiterComment] = useState("");

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const jobsList = await atsApi.jobs.list();
        const active = jobsList.filter((j: any) => j.status === "ACTIVE" || j.jobStatus === "Active");
        setActiveJobs(active);
        if (active.length > 0) {
          setSelectedJobId(active[0].id);
        }
      } catch (err) {
        console.error("Failed to load active jobs:", err);
      }
    };
    fetchJobs();
  }, []);

  const pick = (f: File | null) => { 
    setErr(null); 
    setFile(f); 
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      // 1. Upload CV to candidate pool
      const res = await atsApi.candidates.uploadCv(file);
      const candidate = res.candidate;
      const name = candidate?.fullName || file.name;

      // 2. Submit to Job if enabled
      if (submitToJob && selectedJobId) {
        let parsedCandidateId = candidate.id;
        if (typeof parsedCandidateId === "string") {
          const parts = parsedCandidateId.split("-");
          const rawNum = parts[parts.length - 1];
          parsedCandidateId = parseInt(rawNum, 10);
        } else if (candidate.applicantId && typeof candidate.applicantId === "string") {
          const parts = candidate.applicantId.split("-");
          const rawNum = parts[parts.length - 1];
          parsedCandidateId = parseInt(rawNum, 10);
        }

        const currentUser = atsApi.auth.getCurrentUser();
        if (!currentUser?.id) {
          throw new Error("You must be logged in to submit a candidate to a job.");
        }
        await atsApi.submissions.create({
          candidateId: parsedCandidateId || candidate.id || 1,
          jobId: selectedJobId,
          recruiterId: currentUser.id,
          finalStatus: "PENDING_APPROVAL",
          submittedRate: submittedRate.trim() || null,
          recruiterComment: recruiterComment.trim() || null
        });
      }

      if (res.duplicate) {
        if (res.updated) {
          onDone(`${name} already exists. Profile updated with latest CV file.`);
        } else {
          onDone(submitToJob ? `${name} is a duplicate CV but was submitted to requisition.` : `${name} already exists in candidate pool.`);
        }
      } else {
        onDone(
          res.parsed
            ? (submitToJob ? `Parsed, saved & submitted ${name} to requisition.` : `Parsed & saved ${name} into talent database.`)
            : (submitToJob ? `Saved & submitted ${name} to requisition.` : `Saved ${name} into candidate pool.`)
        );
      }
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const selectedJob = activeJobs.find((j) => String(j.id) === String(selectedJobId));
  const isDomestic = selectedJob?.market === "IN";
  const rateLabel = isDomestic ? "Expected Salary (Lakhs INR)" : "Submitted Pay Rate ($/hr or $/yr)";
  const ratePlaceholder = isDomestic ? "e.g. 14.5" : "e.g. $75/hr";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Individual Resume Import</h2>
              <p className="text-[11px] text-neutral-500 font-medium">Extract structured entity profile and auto-deduplicate</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Dropzone Staging */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0] || null); }}
            onClick={() => inputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
              dragOver 
                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30" 
                : file 
                ? "border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/10" 
                : "border-neutral-250 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-600 bg-neutral-50/30 dark:bg-slate-950/20"
            }`}
          >
            {file ? (
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block truncate max-w-[280px]">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-semibold">
                      {(file.size / 1024).toFixed(1)} KB • Click or drop to replace
                    </span>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 text-[10px] font-bold">
                  Ready to Parse
                </Badge>
              </div>
            ) : (
              <>
                <UploadCloud className="h-9 w-9 mx-auto text-indigo-500/80 mb-2" />
                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Click or drag resume file to parse &amp; save
                </p>
                <p className="text-[11px] text-neutral-500 mt-1 font-medium">
                  Supports PDF, DOCX, DOC, or TXT (Max 10MB)
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <Badge variant="outline" className="text-[9px] font-bold text-neutral-500">PDF</Badge>
                  <Badge variant="outline" className="text-[9px] font-bold text-neutral-500">DOCX</Badge>
                  <Badge variant="outline" className="text-[9px] font-bold text-neutral-500">TXT</Badge>
                </div>
              </>
            )}
            <input 
              ref={inputRef} 
              type="file" 
              accept=".pdf,.doc,.docx,.txt" 
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] || null)} 
            />
          </div>

          {/* Requisition Submission Options */}
          {activeJobs.length > 0 && (
            <div className="border border-neutral-200 dark:border-slate-800 rounded-xl p-4 bg-neutral-50/50 dark:bg-slate-950/30 space-y-3">
              <label className="flex items-center gap-2.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={submitToJob}
                  onChange={(e) => setSubmitToJob(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer accent-indigo-600"
                />
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                  Submit directly to job requisition after parsing
                </span>
              </label>

              {submitToJob && (
                <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-slate-800">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                      Active Job Requisition
                    </label>
                    <select
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className="w-full text-xs font-semibold border border-neutral-300 dark:border-slate-700 rounded-lg px-3 h-9 bg-white dark:bg-slate-900 text-neutral-850 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    >
                      {activeJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.jobCode} - {j.jobTitle} ({j.clientName || 'Direct Client'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                      {rateLabel}
                    </label>
                    <Input
                      placeholder={ratePlaceholder}
                      value={submittedRate}
                      onChange={(e) => setSubmittedRate(e.target.value)}
                      className="h-8.5 text-xs bg-white dark:bg-slate-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                      Recruiter Note &amp; Comments
                    </label>
                    <textarea
                      placeholder="Add recruiter notes on experience, notice period, location preference..."
                      value={recruiterComment}
                      onChange={(e) => setRecruiterComment(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-neutral-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500/40 min-h-[60px]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {err && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 text-xs font-semibold text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{err}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-900/50">
          <p className="text-[11px] text-neutral-500 font-medium">
            Automated entity parsing &amp; hash deduplication enabled
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="rounded-lg px-3.5 py-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={submit} 
              disabled={!file || busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              {busy ? "Parsing & Saving..." : "Import & Extract Resume"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

