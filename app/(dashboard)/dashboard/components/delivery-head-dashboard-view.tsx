"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowUpRight, BellRing, Users } from "lucide-react";
import { atsApi } from "@/lib/ats-api";
import type { DeliveryStage } from "@/lib/delivery-dashboard-contract";
import { deliveryStageLabels, hasPendingDeliveryReview, stageShare, visibleDeliveryStage } from "@/lib/delivery-dashboard-presentation";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewWorkspace } from "@/components/submissions/review-workspace";
import { DeliveryMetrics, DeliveryPipelineView, DeliverySection, DeliveryStatus, deliveryCell as cell, deliveryHeader as tableHeader, deliverySurface as surface } from "./delivery-dashboard-widgets";

type DeliveryProfile = { id: string; permissions?: string[] };
export default function DeliveryHeadDashboardView() {
  const { profile, selection } = useDashboardContext();
  const scopeKey = [profile?.id, profile?.tenantId, profile?.branchId, profile?.businessUnitId, selection?.active.id, [...(profile?.permissions || [])].sort().join(",")].join(":");
  // Remount all data and selection state before another identity/scope can render.
  return profile ? <ScopedDeliveryDashboard key={scopeKey} scopeKey={scopeKey} profile={profile} /> : <DashboardSkeleton />;
}

function ScopedDeliveryDashboard({ profile, scopeKey }: { profile: DeliveryProfile; scopeKey: string }) {
  const [stage, setStage] = useState<DeliveryStage>("all");
  const [page, setPage] = useState(1);
  const [memberPage, setMemberPage] = useState(1);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const canReview = profile.permissions?.includes("submission:internal_screening") === true;
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ["delivery-dashboard", scopeKey, stage, page, memberPage],
    () => atsApi.businessUnits.deliveryDashboard(stage, page, memberPage),
    { keepPreviousData: true, revalidateOnFocus: true, dedupingInterval: 5000 },
  );
  const selected = visibleDeliveryStage(stage, data?.pipeline, canReview);
  useEffect(() => {
    if (selected !== stage) { setStage(selected); setPage(1); }
  }, [selected, stage]);
  useEffect(() => {
    const refresh = () => { void mutate(); };
    window.addEventListener("app:refresh", refresh);
    return () => window.removeEventListener("app:refresh", refresh);
  }, [mutate]);
  function chooseStage(next: DeliveryStage) {
    setStage(visibleDeliveryStage(next, data?.pipeline, canReview)); setPage(1);
    document.getElementById("delivery-submissions")?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
  if (error && !data) return <div role="alert" className={`${surface} space-y-3 p-5`}><p className="text-sm">Your unit dashboard could not be loaded. Check your branch and unit assignment and try again.</p><Button variant="outline" size="sm" onClick={() => void mutate()}>Retry</Button></div>;
  if (!data) return <DashboardSkeleton />;
  const pipeline = data.pipeline;
  const showReview = hasPendingDeliveryReview(pipeline, canReview);
  const resultsReady = !error && !isLoading && data.stage === selected && data.submissionPage === page;
  const membersReady = !error && !isLoading && data.pendingUserPage === memberPage;
  const maximumPodJobs = Math.max(0, ...(data.pods || []).map(pod => pod.jobs || 0));
  if (reviewId && canReview) return <ReviewWorkspace key={`${scopeKey}:${reviewId}`} submissionId={reviewId} onClose={() => { setReviewId(null); void mutate(); }} onSaved={() => { setReviewId(null); void mutate(); }} />;
  return <section aria-label="Delivery Head dashboard" className="min-w-0 space-y-4 text-slate-900 dark:text-slate-100">
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">Could not refresh the dashboard. Showing the last loaded summary.<Button size="sm" variant="outline" onClick={() => void mutate()}>Retry</Button></div>}
    <DeliveryMetrics activeJobs={data.activeJobs} pipeline={pipeline} onSelect={chooseStage} />
    {pipeline && <>
      {showReview && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30"><div className="flex items-center gap-3"><BellRing className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" /><div><h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">{pipeline.review} {pipeline.review === 1 ? "submission awaits" : "submissions await"} approval</h2><p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">Review and approve or reject with feedback.</p></div></div><Button size="sm" className="bg-amber-600 text-xs text-white hover:bg-amber-700" onClick={() => chooseStage("review")}>Review submissions<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Button></div>}
      <DeliveryPipelineView submissionRequired={data.submissionRequired} pipeline={pipeline} selected={selected} onSelect={chooseStage} showReview={showReview} />
      <DeliverySection id="delivery-submissions" title={`${selected === "all" ? "All submissions" : selected === "review" ? "Internal review" : selected === "closed" ? "Closed unsuccessful" : `${deliveryStageLabels[selected]} submissions`}${resultsReady ? ` · ${data.submissionTotal}` : ""}`} action={<div className="flex flex-wrap gap-2"><Button size="sm" variant={selected === "all" ? "secondary" : "outline"} className="text-xs" onClick={() => chooseStage("all")}>All</Button>{showReview && <Button size="sm" variant={selected === "review" ? "secondary" : "outline"} className="text-xs" onClick={() => chooseStage("review")}>Awaiting approval {pipeline.review}</Button>}<Button size="sm" variant={selected === "closed" ? "secondary" : "outline"} className="text-xs" onClick={() => chooseStage("closed")}>Closed {pipeline.closed}</Button></div>}>
        <div aria-busy={!resultsReady} aria-live="polite">{!resultsReady ? <div className="p-4">{error ? <p className="text-xs text-slate-500">Results unavailable. Retry to load this stage.</p> : <><p className="sr-only">Loading submissions</p><Skeleton className="h-24 w-full" /></>}</div> : <>
          <div className="overflow-x-auto"><table className="w-full"><thead className={tableHeader}><tr>{["Candidate", "Job", "Status", "Action"].map(label => <th key={label} className={cell}>{label}</th>)}</tr></thead><tbody>{data.submissions?.map(submission => <tr key={submission.id} className="border-t border-slate-100 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40"><td className={`${cell} font-medium`}>{submission.candidateName}</td><td className={cell}>{submission.jobTitle}</td><td className={cell}><DeliveryStatus value={submission.finalStatus} /></td><td className={cell}>{selected === "review" && canReview ? <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setReviewId(submission.id)}>Review</Button> : <Link className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400" href={`/utility/submissions?submission=${encodeURIComponent(submission.id)}`}>Open<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></Link>}</td></tr>)}</tbody></table></div>
          {!data.submissions?.length && <p className="p-5 text-xs text-slate-500">No submissions in this stage.</p>}
          {(data.submissionTotal || 0) > 10 && <Pagination page={page} total={data.submissionTotal || 0} onChange={setPage} />}
        </>}</div>
      </DeliverySection>
    </>}
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
      <div className="min-w-0 space-y-4">
        {data.activeJobs !== null && <DeliverySection id="delivery-priority-jobs" title="Priority jobs" note="Up to 8 active jobs, highest priority first">
        <div className="overflow-x-auto"><table className="w-full"><thead className={tableHeader}><tr>{["Job", "Priority", ...(pipeline ? ["Submissions"] : [])].map(label => <th key={label} className={cell}>{label}</th>)}</tr></thead><tbody>{data.jobs.map(job => <tr key={job.id} className="border-t border-slate-100 dark:border-slate-800"><td className={cell}><Link className="font-semibold text-indigo-600 dark:text-indigo-400" href={`/job-posting/${job.id}`}>{job.jobTitle}</Link><span className="mt-1 block text-[10.5px] text-slate-500">{job.jobCode}</span></td><td className={cell}><DeliveryStatus value={job.urgency} /></td>{pipeline && <td className={`${cell} tabular-nums`}>{job.submissions}</td>}</tr>)}</tbody></table></div>{!data.jobs.length && <Empty>No active jobs in your unit.</Empty>}
      </DeliverySection>}
        {data.pods && <DeliverySection title="Pod workload" note="Active job counts by pod">
        <div className="space-y-4 p-4">{data.pods.map((pod, index) => <div key={pod.id}><div className="mb-2 flex items-center justify-between gap-2 text-xs"><span className="min-w-0 break-words font-medium">{pod.name}</span><span className="shrink-0 text-slate-500">{pod.members} members{pod.jobs !== null && ` · ${pod.jobs} jobs`}</span></div>{pod.jobs !== null && <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${index % 3 === 0 ? "bg-blue-500" : index % 3 === 1 ? "bg-violet-500" : "bg-emerald-500"}`} style={{ width: `${stageShare(pod.jobs, maximumPodJobs)}%` }} /></div>}</div>)}</div>{!data.pods.length && <Empty>No pods in your unit.</Empty>}
      </DeliverySection>}
      </div>
      <div className="min-w-0 space-y-3" data-delivery-schedule-column>
        {data.interviews && <DeliverySection id="delivery-interviews" title="Upcoming interviews" note="Next 10 interviews · Your local timezone">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">{data.interviews.map(interview => <div key={`${interview.id}:${interview.round}`} className="flex min-w-0 items-start gap-3 px-4 py-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" /><div className="min-w-0 flex-1"><Link className="break-words text-xs font-semibold text-indigo-600 dark:text-indigo-400" href={`/utility/submissions?submission=${interview.id}`}>{interview.candidateName}</Link><p className="mt-1 break-words text-[11px] text-slate-500">{interview.jobTitle}</p><p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">{new Date(interview.date).toLocaleString()}</p></div><Badge variant="outline" className="text-[10.5px]">{interview.round.toUpperCase()}</Badge></div>)}</div>{!data.interviews.length && <Empty>No upcoming scheduled interviews.</Empty>}
      </DeliverySection>}
        {data.pendingUsers && (data.pendingUserTotal ?? 0) > 0 && <DeliverySection title={`Pending user requests · ${data.pendingUserTotal}`} note="Current unit only" action={<Users className="h-4 w-4 text-violet-500" aria-hidden="true" />}>
        <div aria-busy={!membersReady}>{!membersReady ? <div className="p-4">{error ? <p className="text-xs text-slate-500">Requests unavailable. Retry to load this page.</p> : <Skeleton className="h-24 w-full" />}</div> : <>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">{data.pendingUsers.map(request => <div key={request.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="break-words text-xs font-medium">{request.fullName}</p><p className="mt-1 break-all text-[10.5px] text-slate-500">{request.email}</p><p className="mt-1 text-[10.5px] text-slate-500">Requested role: {request.requestedRole?.replaceAll("_", " ") || "Not specified"}</p></div><Button asChild size="sm" variant="outline" className="h-7 text-xs"><Link href={`/utility/users?requestId=${encodeURIComponent(request.id)}`}>Review request<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></Link></Button></div>)}</div>
          {(data.pendingUserTotal || 0) > 10 && <Pagination page={memberPage} total={data.pendingUserTotal || 0} onChange={setMemberPage} />}
        </>}</div>
      </DeliverySection>}
      </div>
    </div>
  </section>;
}
function DashboardSkeleton() {
  return <div aria-label="Loading delivery dashboard" className="min-w-0 space-y-4"><Skeleton className="h-12 w-full" /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map(index => <Skeleton key={index} className="h-24 w-full" />)}</div><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>;
}
function Empty({ children }: { children: React.ReactNode }) { return <p className="px-4 py-5 text-xs text-slate-500">{children}</p>; }
function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  return <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-3 dark:border-slate-800"><p className="text-xs text-slate-500">Page {page} of {Math.max(1, Math.ceil(total / 10))}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={page * 10 >= total} onClick={() => onChange(page + 1)}>Next</Button></div></div>;
}
