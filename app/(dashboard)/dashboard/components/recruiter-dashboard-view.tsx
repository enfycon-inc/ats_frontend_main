"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { atsApi } from "@/lib/ats-api";
import Link from "next/link";
import AddCandidateModal from "@/components/dashboard/AddCandidateModal";
import type { TrackerSubmission, TrackerResponse } from "@/lib/submission-contract";
import type { TrackerDashboardSummary } from "@/lib/submission-contract";
import { stage as getSubmissionStage, statusDate, validTimezone } from "@/lib/submission-tracker";

type RecruiterProfile = { id?: string; tenantId?: string; permissions?: string[] };
type RecruiterJob = { id: string; jobTitle?: string; jobCode?: string; client?: string; submissionDone?: number | null; submissionRequired?: number | null; jobStatus?: string; priority?: string };
type RecruiterSubmissionResult = { key: string; data: TrackerSubmission[]; metrics: TrackerResponse["dashboardMetrics"] };
type RecruiterSummaryResult = { key: string; summary: TrackerDashboardSummary | null };

export default // ─── RECRUITER DASHBOARD VIEW ────────────────────────────────────────────────
function RecruiterDashboardView({ profile, activeJobs }: { profile: RecruiterProfile; activeJobs: RecruiterJob[] }) {
  const requestKey = `${profile?.tenantId || ""}:${profile?.id || ""}`;
  const [submissionResult, setSubmissionResult] = useState<RecruiterSubmissionResult | null>(null);
  const [submissionsErrorKey, setSubmissionsErrorKey] = useState<string | null>(null);
  const [activityRange, setActivityRange] = useState<7 | 30 | 90>(30);
  const [summaryResult, setSummaryResult] = useState<RecruiterSummaryResult | null>(null);
  const [summaryErrorKey, setSummaryErrorKey] = useState<string | null>(null);
  const [selectedJobForCV, setSelectedJobForCV] = useState<RecruiterJob | null>(null);
  const mySubmissions = submissionResult?.key === requestKey ? submissionResult.data : [];
  const metrics = submissionResult?.key === requestKey ? submissionResult.metrics : null;
  const submissionsError = submissionsErrorKey === requestKey;
  const loadingSubs = submissionResult?.key !== requestKey && !submissionsError;
  const summaryKey = `${requestKey}:${activityRange}`;
  const summary = summaryResult?.key === summaryKey ? summaryResult.summary : null;
  const summaryError = summaryErrorKey === summaryKey;
  const loadingSummary = !summary && !summaryError;

  useEffect(() => {
    let cancelled = false;
    async function loadSubs() {
      try {
        const res = await atsApi.submissions.list({ view: "my", limit: 10 });
        if (!cancelled) {
          setSubmissionResult({ key: requestKey, data: res.data, metrics: res.dashboardMetrics });
        }
      } catch {
        if (!cancelled) setSubmissionsErrorKey(requestKey);
      }
    }
    loadSubs();
    return () => { cancelled = true; };
  }, [requestKey]);

  useEffect(() => {
    let cancelled = false;
    atsApi.submissions.getTrackerStats(activityRange, "my")
      .then((result) => { if (!cancelled) setSummaryResult({ key: summaryKey, summary: result.dashboard || null }); })
      .catch(() => { if (!cancelled) setSummaryErrorKey(summaryKey); });
    return () => { cancelled = true; };
  }, [summaryKey, activityRange]);

  const activeCount = activeJobs.length;
  const interviewsScheduled = metrics?.interviews ?? "—";
  const selectedCount = metrics?.selections ?? "—";
  const pipeline = summary?.pipeline || [];
  const pipelineBase = summary?.dashboardMetrics.submissions ?? 0;
  const activity = summary?.activity || [];
  const activityBuckets = Array.from({ length: Math.min(7, activity.length) }, (_, index) => activity.slice(Math.floor(index * activity.length / 7), Math.floor((index + 1) * activity.length / 7)));
  const maxBucketActivity = Math.max(1, ...activityBuckets.map((bucket) => bucket.reduce((total, point) => total + point.submissions + point.interviews, 0)));
  const activityTotals = activity.reduce((totals, point) => ({ submissions: totals.submissions + point.submissions, interviews: totals.interviews + point.interviews }), { submissions: 0, interviews: 0 });
  const priorityJobs = [...activeJobs].sort((a, b) => {
    const coverageA = Number(a.submissionRequired) > 0 ? Number(a.submissionDone || 0) / Number(a.submissionRequired) : 0;
    const coverageB = Number(b.submissionRequired) > 0 ? Number(b.submissionDone || 0) / Number(b.submissionRequired) : 0;
    return coverageA - coverageB;
  }).slice(0, 5);
  const upcomingInterviews = mySubmissions.flatMap((submission) => {
    const scheduledRound = (["l1", "l2", "l3"] as const)
      .map((round) => ({ round, date: submission[`${round}Date`], status: submission[`${round}Status`] }))
      .filter((item) => item.status === "SCHEDULED" && item.date && new Date(item.date).getTime() >= Date.now())
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())[0];
    return scheduledRound ? [{ submission, round: scheduledRound.round, date: scheduledRound.date! }] : [];
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 4);
  const canCreateCandidates = profile?.permissions?.includes("candidate:create");
  const canViewCandidates = profile?.permissions?.includes("candidate:view");
  const canViewSubmissions = profile?.permissions?.includes("submission:view") || profile?.permissions?.includes("submission:create");
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const formatInterviewDate = (value: string, timezone?: string | null) => {
    const date = new Date(value);
    return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: validTimezone(timezone) }).format(date);
  };
  const formatStage = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Recruiter workspace</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-neutral-900 dark:text-white">Your hiring activity</h2>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{dateLabel} · Focus on priority roles and candidate progress.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewCandidates && <Link href="/applicants"><Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs"><Icon icon="heroicons:magnifying-glass" className="h-4 w-4 text-indigo-600" />Search candidates</Button></Link>}
          {canCreateCandidates && activeJobs.length > 0 && <Button size="sm" className="h-9 gap-1.5 bg-indigo-600 text-xs text-white hover:bg-indigo-700" onClick={() => setSelectedJobForCV(priorityJobs[0])}><Icon icon="heroicons:plus" className="h-4 w-4" />Add candidate</Button>}
          {canViewSubmissions && <Link href="/utility/submissions"><Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs"><Icon icon="heroicons:clipboard-document-list" className="h-4 w-4" />My submissions</Button></Link>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active requisitions", value: activeCount, icon: "heroicons:briefcase", tone: "blue" },
          { label: "My submissions", value: metrics?.submissions ?? "—", icon: "heroicons:document-text", tone: "violet" },
          { label: "Interviews scheduled", value: interviewsScheduled, icon: "heroicons:calendar", tone: "amber" },
          { label: "Selections / placed", value: selectedCount, icon: "heroicons:trophy", tone: "emerald" },
        ].map((item) => {
          const iconTone = item.tone === "blue" ? "bg-blue-50 text-blue-600 dark:text-blue-400" : item.tone === "violet" ? "bg-violet-50 text-violet-600 dark:text-violet-400" : item.tone === "amber" ? "bg-amber-50 text-amber-600 dark:text-amber-400" : "bg-emerald-50 text-emerald-600 dark:text-emerald-400";
          return (
          <Card key={item.label} className="rounded-xl border border-neutral-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="flex items-center gap-3.5 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconTone} dark:bg-slate-800`}><Icon icon={item.icon} className="text-xl" /></div>
              <div><p className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{item.label}</p><p className="mt-0.5 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{item.value}</p></div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 xl:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/30">
            <div><CardTitle className="text-sm font-bold text-neutral-900 dark:text-white">Priority requisitions</CardTitle><CardDescription className="mt-0.5 text-xs">Sourcing coverage for your active roles</CardDescription></div>
            {profile?.permissions?.includes("job:view") && <Link href="/job-posting" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">View jobs <span aria-hidden="true">→</span></Link>}
          </CardHeader>
          <CardContent className="p-0">
            {priorityJobs.length === 0 ? <div className="p-10 text-center text-xs text-neutral-500">No active sourcing requisitions are assigned to you.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs">
              <thead><tr className="border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:border-slate-800"><th className="px-4 py-2.5">Role</th><th className="px-3 py-2.5">Client</th><th className="px-3 py-2.5">Coverage</th><th className="px-3 py-2.5 text-center">Candidates</th><th className="px-4 py-2.5 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">{priorityJobs.map((job) => { const target = Number(job.submissionRequired) || 0; const done = Number(job.submissionDone) || 0; const progress = target ? Math.min(100, Math.round(done / target * 100)) : 0; return <tr key={job.id} className="transition-colors hover:bg-neutral-50/70 dark:hover:bg-slate-800/20">
                <td className="px-4 py-3"><p className="font-semibold text-neutral-900 dark:text-white">{job.jobTitle}</p><p className="mt-0.5 font-mono text-[10px] text-neutral-500">{job.jobCode || ""}</p></td>
                <td className="px-3 py-3 text-neutral-700 dark:text-neutral-300">{job.client || "Client requisition"}</td>
                <td className="px-3 py-3"><div className="flex min-w-24 items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-slate-700"><div className="h-full rounded-full bg-indigo-600" role="progressbar" aria-label={`${job.jobTitle} sourcing coverage`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} style={{ width: `${progress}%` }} /></div><span className="text-[10px] text-neutral-500">{done}/{target || "—"}</span></div></td>
                <td className="px-3 py-3 text-center font-semibold text-neutral-800 dark:text-neutral-200">{done}</td>
                <td className="px-4 py-3 text-right"><div className="inline-flex gap-1.5">{canCreateCandidates && <Button size="sm" className="h-7 bg-indigo-600 px-2.5 text-[10px] text-white hover:bg-indigo-700" onClick={() => setSelectedJobForCV(job)}>Add CV</Button>}{canViewCandidates && <Link href={`/job-posting/${job.id}/matches`}><Button size="sm" variant="outline" className="h-7 px-2 text-[10px]">AI match</Button></Link>}</div></td>
              </tr>; })}</tbody>
            </table></div>}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-neutral-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 xl:col-span-4">
          <CardHeader className="border-b border-neutral-100 px-4 py-3 dark:border-slate-800"><CardTitle className="text-sm font-bold text-neutral-900 dark:text-white">Upcoming interviews</CardTitle><CardDescription className="mt-0.5 text-xs">From your scheduled submission rounds</CardDescription></CardHeader>
          <CardContent className="p-0">
            {loadingSubs ? <div className="space-y-3 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-10 animate-pulse rounded bg-neutral-100 dark:bg-slate-800" />)}</div> : submissionsError ? <div role="alert" className="p-5 text-xs text-neutral-500">Interview schedule could not be loaded.</div> : upcomingInterviews.length === 0 ? <div className="p-8 text-center text-xs text-neutral-500">No upcoming interviews in your recent submissions.</div> : <ul className="divide-y divide-neutral-100 dark:divide-slate-800">{upcomingInterviews.map(({ submission, round, date }) => <li key={`${submission.id}-${round}`} className="flex gap-3 px-4 py-3"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300"><Icon icon="heroicons:calendar" /></div><div className="min-w-0"><p className="truncate text-xs font-semibold text-neutral-900 dark:text-white">{submission.candidateName || `Candidate #${submission.candidateId}`}</p><p className="mt-0.5 truncate text-[10px] text-neutral-500">{submission.jobTitle || submission.jobCode || "Requisition"} · {round.toUpperCase()}</p><p className="mt-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400">{formatInterviewDate(date, submission.timezone)}</p></div></li>)}</ul>}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-neutral-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-neutral-100 px-4 py-3 dark:border-slate-800"><CardTitle className="text-sm font-bold text-neutral-900 dark:text-white">Pipeline snapshot</CardTitle><CardDescription className="mt-0.5 text-xs">Your submissions by current stage · all time</CardDescription></CardHeader>
        <CardContent className="p-4">{loadingSummary && !summary ? <div className="h-32 animate-pulse rounded bg-neutral-100 dark:bg-slate-800" /> : summaryError ? <div role="alert" className="py-4 text-center text-xs text-neutral-500">Pipeline summary could not be loaded.</div> : pipeline.length === 0 ? <div className="py-4 text-center text-xs text-neutral-500">No pipeline activity is available yet.</div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">{pipeline.map((item, index) => { const colors = ["bg-indigo-600", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-emerald-500"]; const share = pipelineBase ? Math.round(item.count / pipelineBase * 100) : 0; return <div key={item.stage} className="min-w-0 border-l border-neutral-100 pl-3 first:border-0 first:pl-0 dark:border-slate-800"><p className="truncate text-[10px] font-semibold text-neutral-500">{item.stage}</p><div className="mt-1 flex items-baseline justify-between gap-2"><span className="text-xl font-bold text-neutral-900 dark:text-white">{item.count}</span><span className="text-[10px] text-neutral-400">{share}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-slate-800"><div className={`h-full rounded-full ${colors[index % colors.length]}`} style={{ width: `${share}%` }} /></div></div>; })}</div>}</CardContent>
      </Card>

      <Card className="rounded-xl border border-neutral-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-sm font-bold text-neutral-900 dark:text-white">Recent activity</CardTitle><CardDescription className="mt-0.5 text-xs">Submissions and interviews over the last {activityRange} days</CardDescription></div><div className="flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-slate-800" aria-label="Activity date range">{([7, 30, 90] as const).map((days) => <button key={days} type="button" aria-pressed={activityRange === days} onClick={() => setActivityRange(days)} className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${activityRange === days ? "bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400"}`}>{days} days</button>)}</div></CardHeader>
        <CardContent className="p-4">{loadingSummary && !summary ? <div className="h-32 animate-pulse rounded bg-neutral-100 dark:bg-slate-800" /> : summaryError ? <div role="alert" className="py-8 text-center text-xs text-neutral-500">Recent activity could not be loaded.</div> : activity.length === 0 ? <div className="py-8 text-center text-xs text-neutral-500">No activity in this period.</div> : <>
          <div className="mb-4 flex flex-wrap gap-5"><p className="text-xs text-neutral-500"><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-indigo-600" />Submissions <strong className="ml-1 text-neutral-900 dark:text-white">{activityTotals.submissions}</strong></p><p className="text-xs text-neutral-500"><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-violet-500" />Interviews <strong className="ml-1 text-neutral-900 dark:text-white">{activityTotals.interviews}</strong></p></div>
          <div className="grid h-28 grid-cols-7 items-end gap-2 sm:gap-4">{activityBuckets.map((bucket, index) => { const submissions = bucket.reduce((total, point) => total + point.submissions, 0); const interviews = bucket.reduce((total, point) => total + point.interviews, 0); const label = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${bucket[0].date}T00:00:00Z`)); return <div key={`${bucket[0].date}-${index}`} className="flex h-full flex-col items-center justify-end gap-1"><div className="flex h-20 w-full max-w-12 items-end justify-center gap-1" aria-label={`${label}: ${submissions} submissions and ${interviews} interviews`}><div className="w-2/5 rounded-t bg-indigo-600" style={{ height: `${Math.max(submissions ? 4 : 0, submissions / maxBucketActivity * 100)}%` }} /><div className="w-2/5 rounded-t bg-violet-500" style={{ height: `${Math.max(interviews ? 4 : 0, interviews / maxBucketActivity * 100)}%` }} /></div><span className="text-[9px] text-neutral-400">{label}</span></div>; })}</div>
        </>}</CardContent>
      </Card>

      <Card className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-slate-800"><div><CardTitle className="text-sm font-bold text-neutral-900 dark:text-white">Recent candidate activity</CardTitle><CardDescription className="mt-0.5 text-xs">Latest updates from your submissions</CardDescription></div>{canViewSubmissions && <Link href="/utility/submissions" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">View all <span aria-hidden="true">→</span></Link>}</CardHeader>
        <CardContent className="p-0">{loadingSubs ? <div className="space-y-3 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-10 animate-pulse rounded bg-neutral-100 dark:bg-slate-800" />)}</div> : submissionsError ? <div role="alert" className="p-6 text-center text-xs text-neutral-500">Your recent activity could not be loaded. Please try again.</div> : mySubmissions.length === 0 ? <div className="p-8 text-center text-xs text-neutral-500">No candidate submissions recorded yet.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead><tr className="border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:border-slate-800"><th className="px-4 py-2.5">Candidate</th><th className="px-3 py-2.5">Role</th><th className="px-3 py-2.5">Stage</th><th className="px-4 py-2.5 text-right">Updated</th></tr></thead><tbody className="divide-y divide-neutral-100 dark:divide-slate-800">{mySubmissions.slice(0, 6).map((submission) => { const currentStage = getSubmissionStage(submission); const date = statusDate(submission); const tone = currentStage.tone === "amber" ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" : currentStage.tone === "green" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : currentStage.tone === "red" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : currentStage.tone === "blue" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : "bg-neutral-100 text-neutral-700 dark:bg-slate-800 dark:text-neutral-300"; return <tr key={submission.id} className="hover:bg-neutral-50/70 dark:hover:bg-slate-800/20"><td className="px-4 py-3"><p className="font-semibold text-neutral-900 dark:text-white">{submission.candidateName || `Candidate #${submission.candidateId}`}</p><p className="mt-0.5 text-[10px] text-neutral-500">{submission.clientName || ""}</p></td><td className="px-3 py-3"><p className="text-neutral-800 dark:text-neutral-200">{submission.jobTitle || "Requisition"}</p><p className="mt-0.5 font-mono text-[10px] text-neutral-500">{submission.jobCode || ""}</p></td><td className="px-3 py-3"><Badge className={`border-0 px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{formatStage(currentStage.label)}</Badge></td><td className="px-4 py-3 text-right text-[10px] text-neutral-500">{date?.value ? formatInterviewDate(date.value, submission.timezone) : "Recently"}</td></tr>; })}</tbody></table></div>}</CardContent>
      </Card>

      {/* Candidate CV Upload Modal */}
      <AddCandidateModal 
        isOpen={!!selectedJobForCV} 
        onClose={() => setSelectedJobForCV(null)} 
        job={selectedJobForCV} 
      />
    </div>
  );
}
