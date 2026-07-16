"use client";

/**
 * Candidates Module — live candidate pool backed by the ATS API.
 * Supports the CV save mechanism: upload a resume → parse (best-effort) →
 * store the file + create the candidate → download the CV later.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, UploadCloud, FileText, Download, Trash2, MapPin, Briefcase,
  Users, X, CheckCircle2, AlertCircle, Loader2, Sparkles,
} from "lucide-react";
import { atsApi } from "@/lib/ats-api";
import { Input } from "@/components/ui/input";

interface Candidate {
  id: string;
  applicantId: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  source: string;
  status: string;
  jobTitle: string;
  skills: string[];
  workAuthorization: string;
  experienceYears: number;
  createdOn: string;
}

const dbId = (c: Candidate) => c.applicantId?.replace(/^APP-/, "") || "";

const SOURCE_STYLES: Record<string, string> = {
  "CV Upload": "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  Dice: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  Monster: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
};
const sourceStyle = (s: string) => SOURCE_STYLES[s] || "bg-neutral-100 text-neutral-600 dark:bg-slate-800 dark:text-neutral-400";

export default function CandidatesModulePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await atsApi.candidates.list();
      setCandidates(list as Candidate[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) =>
      [c.fullName, c.email, c.jobTitle, c.source, ...(c.skills || [])]
        .join(" ").toLowerCase().includes(q),
    );
  }, [candidates, query]);

  const sourceCounts = useMemo(() => {
    const m: Record<string, number> = {};
    candidates.forEach((c) => { m[c.source] = (m[c.source] || 0) + 1; });
    return m;
  }, [candidates]);

  const handleDownload = async (c: Candidate) => {
    try {
      const blob = await atsApi.candidates.fetchResumeBlob(dbId(c));
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e: any) {
      setToast({ kind: "err", msg: e?.message || "Could not open CV" });
    }
  };

  const handleDelete = async (c: Candidate) => {
    if (!confirm(`Delete ${c.fullName}? This removes the candidate and their CV.`)) return;
    try {
      await atsApi.candidates.delete(dbId(c));
      setCandidates((prev) => prev.filter((x) => x.applicantId !== c.applicantId));
      setToast({ kind: "ok", msg: `Deleted ${c.fullName}` });
    } catch (e: any) {
      setToast({ kind: "err", msg: e?.message || "Delete failed" });
    }
  };

  return (
    <div className="min-h-full bg-neutral-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Candidates</h1>
            <p className="text-xs font-medium text-neutral-500 mt-0.5">
              Your talent pool · upload a CV to parse and save it automatically
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, skill, source…"
                className="w-56 rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <button
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <UploadCloud className="h-3.5 w-3.5" /> Upload CV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatTile label="Total candidates" value={candidates.length} />
          <StatTile label="From CV upload" value={sourceCounts["CV Upload"] || 0} accent="violet" />
          <StatTile label="From Dice" value={sourceCounts["Dice"] || 0} accent="orange" />
          <StatTile label="From Monster" value={sourceCounts["Monster"] || 0} accent="indigo" />
        </div>

        {/* States */}
        {loading && <SkeletonRows />}
        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 dark:border-slate-700 p-10 text-center">
            <Users className="h-8 w-8 mx-auto text-neutral-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              {candidates.length === 0 ? "No candidates yet" : "No matches for your search"}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {candidates.length === 0 ? "Upload a CV to add your first candidate." : "Try a different keyword."}
            </p>
          </div>
        )}

        {/* List */}
        {!loading && !error && filtered.length > 0 && (
          <div className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {filtered.map((c, i) => (
              <div
                key={c.applicantId || i}
                className={`flex flex-col md:flex-row md:items-center gap-3 p-3.5 ${i > 0 ? "border-t border-neutral-100 dark:border-slate-800" : ""} hover:bg-neutral-50 dark:hover:bg-slate-800/40 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 grid place-items-center text-white text-xs font-bold">
                    {(c.fullName || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-neutral-900 dark:text-white truncate">{c.fullName}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${sourceStyle(c.source)}`}>{c.source}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500 mt-0.5">
                      <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{c.jobTitle}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{[c.city, c.state].filter((x) => x && x !== "Unknown").join(", ") || "—"}</span>
                      <span>{c.experienceYears} yrs</span>
                      <span className="truncate max-w-[180px]">{c.email}</span>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="hidden lg:flex flex-wrap gap-1 max-w-[280px] justify-end">
                  {(c.skills || []).slice(0, 4).map((s) => (
                    <span key={s} className="rounded bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-400">{s}</span>
                  ))}
                  {(c.skills || []).length > 4 && (
                    <span className="rounded bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">+{c.skills.length - 4}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleDownload(c)} title="View / download CV"
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-300 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors">
                    <Download className="h-3 w-3" /> CV
                  </button>
                  <button onClick={() => handleDelete(c)} title="Delete candidate"
                    className="inline-flex items-center rounded-md border border-neutral-300 dark:border-slate-700 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {uploadOpen && (
        <UploadCvModal
          onClose={() => setUploadOpen(false)}
          onDone={(msg) => { setToast({ kind: "ok", msg }); load(); }}
        />
      )}

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${
          toast.kind === "ok"
            ? "bg-emerald-600 text-white"
            : "bg-red-600 text-white"
        }`}>
          {toast.kind === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

const ACCENTS: Record<string, string> = {
  neutral: "text-neutral-800 dark:text-neutral-200",
  violet: "text-violet-600 dark:text-violet-400",
  orange: "text-orange-600 dark:text-orange-400",
  indigo: "text-indigo-600 dark:text-indigo-400",
};
function StatTile({ label, value, accent = "neutral" }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
      <div className={`text-2xl font-bold tabular-nums ${ACCENTS[accent]}`}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mt-0.5">{label}</div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`flex items-center gap-3 p-3.5 ${i > 0 ? "border-t border-neutral-100 dark:border-slate-800" : ""} animate-pulse`}>
          <div className="h-9 w-9 rounded-full bg-neutral-100 dark:bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 rounded bg-neutral-100 dark:bg-slate-800" />
            <div className="h-2.5 w-64 rounded bg-neutral-100 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function UploadCvModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
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

  const pick = (f: File | null) => { setErr(null); setFile(f); };

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
        await atsApi.submissions.create({
          candidateId: parsedCandidateId || candidate.id || 1,
          jobId: selectedJobId,
          recruiterId: currentUser?.id || "d2ec2da8-816c-410a-8c0c-4737b5ae21cf",
          finalStatus: "PENDING_APPROVAL",
          submittedRate: submittedRate.trim() || null,
          recruiterComment: recruiterComment.trim() || null
        });
      }

      if (res.duplicate) {
        if (res.updated) {
          onDone(`${name} already exists. Profile has been updated with the latest CV details!`);
        } else {
          onDone(submitToJob ? `${name} is a duplicate CV but was submitted to the job.` : `${name} is already in the pool (duplicate CV).`);
        }
      } else {
        onDone(
          res.parsed
            ? (submitToJob ? `Parsed, saved & submitted ${name} to job.` : `Parsed & saved ${name}.`)
            : (submitToJob ? `Saved & submitted ${name} to job (parser offline).` : `Saved ${name} (parser offline).`)
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
  const rateLabel = isDomestic ? "Expected Salary (Lakhs)" : "Submitted Pay Rate ($/hr or $/yr)";
  const ratePlaceholder = isDomestic ? "e.g. 12.5" : "e.g. $70/hr";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-950/50">
              <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </span>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Upload CV</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0] || null); }}
            onClick={() => inputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-neutral-300 dark:border-slate-700 hover:border-neutral-400 dark:hover:border-slate-600"
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                <FileText className="h-5 w-5 text-blue-500" /> {file.name}
              </div>
            ) : (
              <>
                <UploadCloud className="h-8 w-8 mx-auto text-neutral-400 mb-2" />
                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Drop a resume here, or click to browse</p>
                <p className="text-[11px] text-neutral-500 mt-1">PDF, DOCX, or TXT</p>
              </>
            )}
            <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
              onChange={(e) => pick(e.target.files?.[0] || null)} />
          </div>

          {/* Submit to Job checkbox & selection */}
          {activeJobs.length > 0 && (
            <div className="mt-4 border-t border-neutral-100 dark:border-slate-800 pt-4 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={submitToJob}
                  onChange={(e) => setSubmitToJob(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                />
                Submit this candidate to a job immediately
              </label>

              {submitToJob && (
                <div className="flex flex-col gap-2 mt-1.5 pl-5.5">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="modal-job-select" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      Select Active Requisition
                    </label>
                    <select
                      id="modal-job-select"
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className="w-full text-xs border border-neutral-300 dark:border-slate-700 rounded-lg px-2.5 h-8.5 bg-transparent text-neutral-850 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      {activeJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.jobCode} - {j.jobTitle} ({j.clientName})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    <label htmlFor="modal-submitted-rate" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      {rateLabel}
                    </label>
                    <Input
                      id="modal-submitted-rate"
                      placeholder={ratePlaceholder}
                      value={submittedRate}
                      onChange={(e) => setSubmittedRate(e.target.value)}
                      className="h-8.5 text-xs bg-transparent"
                    />
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    <label htmlFor="modal-recruiter-comment" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      Comments
                    </label>
                    <textarea
                      id="modal-recruiter-comment"
                      placeholder="Recruiter comments or notes..."
                      value={recruiterComment}
                      onChange={(e) => setRecruiterComment(e.target.value)}
                      className="min-h-16 text-xs bg-transparent border border-neutral-300 dark:border-slate-700 rounded-md p-2 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="mt-3 text-[11px] text-neutral-500 leading-relaxed">
            The CV is de-duplicated by content, parsed for skills &amp; experience, and stored so you can download it later.
          </p>

          {err && (
            <div className="mt-3 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {err}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-neutral-100 dark:border-slate-800">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={submit} disabled={!file || busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 text-xs font-semibold text-white transition-colors">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            {busy ? "Saving…" : "Upload & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
