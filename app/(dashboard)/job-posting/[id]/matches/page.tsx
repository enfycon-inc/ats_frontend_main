"use client";

/**
 * AI Candidate Matches — ranks the tenant candidate pool against a job
 * requisition using the backend's /api/jobs/:id/matches engine
 * (skill overlap + experience fit + resume-text hits + optional semantic).
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Sparkles, RefreshCw, MapPin, Briefcase, GraduationCap,
  Mail, Phone, Check, X, Zap, ZapOff, Users, AlertCircle,
} from "lucide-react";
import { atsApi, type JobMatchesResponse, type CandidateMatch } from "@/lib/ats-api";

const TIER_STYLES: Record<CandidateMatch["matchTier"], { ring: string; text: string; chip: string; label: string }> = {
  Strong: { ring: "#10b981", text: "text-emerald-600 dark:text-emerald-400", chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900", label: "Strong match" },
  Good:   { ring: "#3b82f6", text: "text-blue-600 dark:text-blue-400",       chip: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",             label: "Good match" },
  Fair:   { ring: "#f59e0b", text: "text-amber-600 dark:text-amber-400",     chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",         label: "Fair match" },
  Low:    { ring: "#94a3b8", text: "text-neutral-500 dark:text-neutral-400", chip: "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-slate-800 dark:text-neutral-400 dark:border-slate-700", label: "Low match" },
};

function ScoreMeter({ score, tier }: { score: number; tier: CandidateMatch["matchTier"] }) {
  const color = TIER_STYLES[tier].ring;
  return (
    <div
      className="relative h-16 w-16 shrink-0 rounded-full grid place-items-center"
      style={{ background: `conic-gradient(${color} ${score * 3.6}deg, var(--meter-track, #e5e7eb) 0deg)` }}
    >
      <div className="absolute inset-[3px] rounded-full bg-white dark:bg-slate-900 grid place-items-center">
        <span className={`text-lg font-bold tabular-nums ${TIER_STYLES[tier].text}`}>{score}</span>
        <span className="text-[8px] font-semibold uppercase tracking-wider text-neutral-400 -mt-1">match</span>
      </div>
    </div>
  );
}

function SkillChip({ label, kind }: { label: string; kind: "matched" | "missing" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${
        kind === "matched"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
          : "bg-neutral-50 text-neutral-500 border-neutral-200 line-through decoration-neutral-300 dark:bg-slate-800/60 dark:text-neutral-500 dark:border-slate-700"
      }`}
    >
      {kind === "matched" ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

export default function JobMatchesPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = String(params?.id || "");

  const [data, setData] = useState<JobMatchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await atsApi.jobs.matches(jobId, { limit: 50 });
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { if (jobId) load(); }, [jobId, load]);

  const job = data?.job;
  const matches = data?.matches || [];
  const tierCounts = matches.reduce(
    (acc, m) => { acc[m.matchTier]++; return acc; },
    { Strong: 0, Good: 0, Fair: 0, Low: 0 } as Record<CandidateMatch["matchTier"], number>,
  );

  return (
    <div className="min-h-full bg-neutral-50 dark:bg-slate-950 [--meter-track:#e5e7eb] dark:[--meter-track:#334155]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-5">
        {/* Breadcrumb / back */}
        <button
          onClick={() => router.push("/job-posting")}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Jobs
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 dark:bg-violet-950/50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                <Sparkles className="h-3 w-3" /> AI Matching
              </span>
              {data && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    data.parserOnline
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-neutral-200 text-neutral-600 dark:bg-slate-800 dark:text-neutral-400"
                  }`}
                  title={data.parserOnline
                    ? "Semantic similarity from the resume parser is included in scores."
                    : "Resume parser offline — scores use skill overlap + experience only."}
                >
                  {data.parserOnline ? <Zap className="h-3 w-3" /> : <ZapOff className="h-3 w-3" />}
                  {data.parserOnline ? "Semantic ON" : "Semantic OFF"}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {job ? job.jobTitle : "Candidate Matches"}
            </h1>
            {job && (
              <p className="text-xs font-medium text-neutral-500 mt-0.5">
                {job.jobCode} · {job.client} · {job.location}
              </p>
            )}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer self-start"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Re-run
          </button>
        </div>

        {/* Job requirement summary */}
        {job && (
          <div className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 mb-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <Meta icon={<Briefcase className="h-3.5 w-3.5" />} label="Experience" value={`${job.expMin}–${job.expMax} yrs`} />
              <Meta icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={job.location || "—"} />
              <Meta icon={<GraduationCap className="h-3.5 w-3.5" />} label="Visa / Work Auth" value={job.visaType || "Any"} />
              <Meta icon={<Users className="h-3.5 w-3.5" />} label="Positions" value={String(job.noOfPositions ?? 1)} />
            </div>
            {(job.skillsRequired?.length > 0) && (
              <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Required skills</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {job.skillsRequired.map((s) => (
                    <span key={s} className="rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 px-2 py-0.5 text-[11px] font-medium">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary stats */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatTile label="Candidates ranked" value={matches.length} tone="neutral" />
            <StatTile label="Strong (75%+)" value={tierCounts.Strong} tone="emerald" />
            <StatTile label="Good (50–74%)" value={tierCounts.Good} tone="blue" />
            <StatTile label="Fair (25–49%)" value={tierCounts.Fair} tone="amber" />
          </div>
        )}

        {/* States */}
        {loading && <SkeletonList />}

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 dark:border-slate-700 p-10 text-center">
            <Users className="h-8 w-8 mx-auto text-neutral-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No candidates to rank yet</p>
            <p className="text-xs text-neutral-500 mt-1">Import or parse candidates into the pool, then re-run matching.</p>
          </div>
        )}

        {/* Ranked list */}
        {!loading && !error && matches.length > 0 && (
          <div className="space-y-2.5">
            {matches.map((m, i) => (
              <MatchCard key={m.candidateId} rank={i + 1} m={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-neutral-400 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</div>
        <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">{value}</div>
      </div>
    </div>
  );
}

const TONES: Record<string, string> = {
  neutral: "text-neutral-800 dark:text-neutral-200",
  emerald: "text-emerald-600 dark:text-emerald-400",
  blue: "text-blue-600 dark:text-blue-400",
  amber: "text-amber-600 dark:text-amber-400",
};
function StatTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
      <div className={`text-2xl font-bold tabular-nums ${TONES[tone]}`}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mt-0.5">{label}</div>
    </div>
  );
}

function MatchCard({ rank, m }: { rank: number; m: CandidateMatch }) {
  const tier = TIER_STYLES[m.matchTier];
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-neutral-300 dark:hover:border-slate-700 hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold tabular-nums text-neutral-400 w-5 text-right">{rank}</span>
          <ScoreMeter score={m.matchScore} tier={m.matchTier} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
              {m.fullName || "Unnamed candidate"}
            </h3>
            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${tier.chip}`}>{tier.label}</span>
            <span className="rounded-md bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:text-neutral-400">{m.source}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{m.currentTitle}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location || "—"}</span>
            <span className="inline-flex items-center gap-1">{m.experienceYears} yrs exp</span>
            <span className="inline-flex items-center gap-1">{m.workAuthorization}</span>
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {m.matchedSkills.map((s) => <SkillChip key={`m-${s}`} label={s} kind="matched" />)}
            {m.missingSkills.map((s) => <SkillChip key={`x-${s}`} label={s} kind="missing" />)}
          </div>

          {/* Breakdown + actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2.5 border-t border-neutral-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-neutral-500">
              <BreakdownStat label="Primary skills" value={m.breakdown.primarySkills} />
              <BreakdownStat label="Secondary" value={m.breakdown.secondarySkills} />
              <BreakdownStat label="Experience fit" value={`${m.breakdown.experienceFit}%`} />
              <BreakdownStat label="Semantic" value={m.breakdown.semantic == null ? "—" : `${m.breakdown.semantic}%`} />
            </div>
            <div className="flex items-center gap-1.5">
              {m.email && (
                <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 rounded-md border border-neutral-300 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors" title={m.email}>
                  <Mail className="h-3 w-3" /> Email
                </a>
              )}
              {m.phone && (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-md border border-neutral-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium text-neutral-500">
                  <Phone className="h-3 w-3" /> {m.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakdownStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-bold uppercase tracking-wider text-neutral-400">{label}</span>
      <span className="font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">{value}</span>
    </span>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-neutral-100 dark:bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-40 rounded bg-neutral-100 dark:bg-slate-800" />
              <div className="h-2.5 w-64 rounded bg-neutral-100 dark:bg-slate-800" />
              <div className="h-5 w-52 rounded bg-neutral-100 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
