"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { JobStatusModal } from "../../job-posting/components/data-table/job-status-modal";
import { normalizeJobStatus, QUICK_CHANGE_JOB_STATUSES } from "@/lib/job-status-contract";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { atsApi } from "@/lib/ats-api";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { getDashboardJobMetrics } from "@/lib/dashboard-metrics";
import Link from "next/link";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { TrackerDashboardSummary } from "@/lib/submission-contract";
import AddCandidateModal from "@/components/dashboard/AddCandidateModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full rounded-lg" />,
});

export default // ─── ACCOUNT MANAGER (BDM) DASHBOARD VIEW ────────────────────────────────────
function AccountManagerDashboardView({ 
  profile, 
  jobs, 
  jobsLoading,
  jobsError,
  onRetryJobs,
  activeJobs, 
  highPriorityJobs,
  onUpdateJob
}: { 
  profile: any; 
  jobs: any[]; 
  jobsLoading: boolean;
  jobsError: string | null;
  onRetryJobs: () => void;
  activeJobs: any[]; 
  highPriorityJobs: any[];
  onUpdateJob: (jobId: string, updatedFields: Partial<any>) => Promise<void>;
}) {
  const [editingCell, setEditingCell] = useState<{ jobId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editBillRateValue, setEditBillRateValue] = useState("");
  const [editPayRateValue, setEditPayRateValue] = useState("");
  const [statusJob, setStatusJob] = useState<any | null>(null);
  const [statusValue, setStatusValue] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const statusInFlight = useRef(false);
  const canEditStatus = profile?.permissions?.includes("job:edit") || profile?.permissions?.includes("*");
  const openStatus = (job: any) => {
    if (!canEditStatus || normalizeJobStatus(job.jobStatus || '') === 'Pending Approval' || (job.approvalStatus && job.approvalStatus !== 'APPROVED')) return;
    const status = normalizeJobStatus(job.jobStatus || '');
    setStatusJob({ ...job });
    setStatusValue(status && QUICK_CHANGE_JOB_STATUSES.some(option => option === status) ? status : '');
    setStatusError('');
  };
  const confirmStatus = async () => {
    if (!statusJob || statusInFlight.current || !canEditStatus || !statusValue || normalizeJobStatus(statusValue) === normalizeJobStatus(statusJob.jobStatus || '')) return;
    statusInFlight.current = true;
    setStatusSaving(true); setStatusError('');
    try {
      const saved = await atsApi.jobs.changeStatus(statusJob.id, { status: statusValue, expectedStatus: statusJob.jobStatus });
      await onUpdateJob(statusJob.id, { jobStatus: saved.status, _alreadySaved: true });
      setStatusJob(null);
      toast.success('Job status updated.');
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Unable to change status.');
    } finally {
      statusInFlight.current = false;
      setStatusSaving(false);
    }
  };
  
  const [activityRange, setActivityRange] = useState<7 | 30 | 90>(30);
  const [dashboardSummary, setDashboardSummary] = useState<TrackerDashboardSummary | null>(null);
  const [loadingDashboardSummary, setLoadingDashboardSummary] = useState(true);
  const [dashboardSummaryError, setDashboardSummaryError] = useState(false);
  const [dashboardSummaryRetry, setDashboardSummaryRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchDashboardSummary() {
      setLoadingDashboardSummary(true);
      setDashboardSummaryError(false);
      try {
        const result = await atsApi.submissions.getTrackerStats(activityRange);
        if (!cancelled) setDashboardSummary(result.dashboard || null);
      } catch {
        if (!cancelled) setDashboardSummaryError(true);
      } finally {
        if (!cancelled) setLoadingDashboardSummary(false);
      }
    }
    fetchDashboardSummary();
    return () => { cancelled = true; };
  }, [activityRange, dashboardSummaryRetry]);

  const handleSaveCell = async (jobId: string, field: string) => {
    if (field === "rates") {
      await onUpdateJob(jobId, { clientBillRate: editBillRateValue || "N/A", payRate: editPayRateValue || "N/A" });
    } else {
      await onUpdateJob(jobId, { [field]: editValue || "N/A" });
    }
    setEditingCell(null);
  };

  const canViewJobs = profile?.permissions?.includes("job:view");
  const canCreateJobs = profile?.permissions?.includes("job:create");

  // Calculations
  const totalJobs = jobs.length;
  const activeRequisitions = activeJobs.length;
  const totalSubmissions = dashboardSummary?.dashboardMetrics?.submissions ?? 0;
  const avgSubmissions = totalJobs ? (totalSubmissions / totalJobs).toFixed(1) : "0.0";
  const filledJobsCount = jobs.filter(j => j.jobStatus === "Filled" || j.jobStatus === "Closed").length;
  const inInterviewCount = dashboardSummary?.dashboardMetrics?.interviews ?? 0;
  const activity = dashboardSummary?.activity ?? [];
  const pipeline = dashboardSummary?.pipeline ?? [];
  const formatActivityDate = (date: string) => date
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })
    : "";
  const activityCategories = activity.map(point => point.date || "");
  const formatActivityAxisLabel = (value: string) => {
    if (!value) return "";
    const dayOfMonth = Number(value.slice(8, 10));
    const isFirstOrLast = value === activity[0]?.date || value === activity[activity.length - 1]?.date;
    const shouldShow = activityRange === 7 || isFirstOrLast || dayOfMonth === 1 ||
      (activityRange === 30 && [8, 15, 22, 29].includes(dayOfMonth)) ||
      (activityRange === 90 && dayOfMonth === 15);
    return shouldShow ? formatActivityDate(value) : "";
  };
  const chartRangeOptions: Array<{ days: 7 | 30 | 90; label: string }> = [
    { days: 7, label: "7 days" }, { days: 30, label: "30 days" }, { days: 90, label: "90 days" },
  ];
  const activityChartOptions: any = {
    chart: { type: "area", toolbar: { show: false }, zoom: { enabled: false }, fontFamily: "inherit", animations: { speed: 250 } },
    colors: ["#2563eb", "#f59e0b"],
    dataLabels: { enabled: false },
    stroke: { curve: "straight", width: [2.5, 2.5] },
    markers: { size: activityRange === 7 ? 3 : 2, strokeWidth: 0, hover: { size: 6 } },
    fill: { type: "gradient", gradient: { opacityFrom: 0.22, opacityTo: 0.02 } },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 4, padding: { left: 8, right: 8 } },
    legend: { position: "top", horizontalAlign: "right", fontSize: "12px", markers: { radius: 8 } },
    xaxis: { type: "category", categories: activityCategories, labels: { formatter: formatActivityAxisLabel, rotate: 0, hideOverlappingLabels: true, trim: false, style: { colors: "#64748b", fontSize: "10px" } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, forceNiceScale: true, labels: { style: { colors: "#64748b", fontSize: "10px" } } },
    tooltip: { shared: true, intersect: false, x: { formatter: (value: string) => formatActivityDate(value) } },
    noData: { text: "No activity in this period", style: { color: "#64748b" } },
  };
  const comparisonGroups = [
    { label: "Job demand", rows: [
      { label: "Jobs posted", count: totalJobs, color: "bg-blue-700" },
      { label: "Positions", count: jobs.reduce((sum, job) => sum + Math.max(0, Number(job.noOfPositions) || 0), 0), color: "bg-blue-700" },
    ] },
    { label: "Candidate progress", rows: [
      { label: "Submissions", count: totalSubmissions, color: "bg-blue-500" },
      { label: "In interview", count: inInterviewCount, color: "bg-amber-500" },
      { label: "Offers issued", count: pipeline.find(stage => stage.stage === "Offer")?.count ?? 0, color: "bg-violet-500" },
      { label: "Joined", count: pipeline.find(stage => stage.stage === "Joined")?.count ?? 0, color: "bg-emerald-500" },
    ] },
  ];
  const comparisonMaximum = Math.max(4, Math.ceil(Math.max(...comparisonGroups.flatMap(group => group.rows.map(row => row.count))) / 4) * 4);

  return (
    <div className="space-y-6">
      {/* AM Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Jobs Card */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl shadow-inner shrink-0 border border-blue-100 dark:border-blue-900/30">
              <Icon icon="heroicons:briefcase" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total Jobs</p>
              <h3 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{jobsLoading ? <Skeleton className="mt-1 h-7 w-14" /> : canViewJobs ? totalJobs : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Total Submissions Card */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl shadow-inner shrink-0 border border-purple-100 dark:border-purple-900/30">
              <Icon icon="heroicons:document-text" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total Submissions</p>
              <h3 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{loadingDashboardSummary ? <Skeleton className="mt-1 h-7 w-14" /> : canViewJobs ? totalSubmissions : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        {/* In Interview Card */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shadow-inner shrink-0 border border-amber-100 dark:border-amber-900/30">
              <Icon icon="heroicons:calendar-days" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">In Interview</p>
              <h3 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{loadingDashboardSummary ? <Skeleton className="mt-1 h-7 w-14" /> : canViewJobs ? inInterviewCount : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Filled Jobs Card */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shadow-inner shrink-0 border border-emerald-100 dark:border-emerald-900/30">
              <Icon icon="heroicons:user-group" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Filled Jobs</p>
              <h3 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{jobsLoading ? <Skeleton className="mt-1 h-7 w-14" /> : canViewJobs ? filledJobsCount : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account manager activity and pipeline charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-default-100 pb-4">
            <div>
              <CardTitle className="text-base font-bold">Submission activity</CardTitle>
              <CardDescription className="mt-1 text-xs">Daily submissions and scheduled interviews across the selected period.</CardDescription>
            </div>
            <div role="group" aria-label="Activity chart date range" className="flex shrink-0 rounded-lg border border-default-200 p-0.5">
              {chartRangeOptions.map(option => <button key={option.days} type="button" onClick={() => setActivityRange(option.days)} aria-pressed={activityRange === option.days}
                className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors", activityRange === option.days ? "bg-indigo-600 text-white" : "text-default-600 hover:bg-default-50")}>
                {option.label}
              </button>)}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            {loadingDashboardSummary && !dashboardSummary ? <div className="space-y-4 py-3"><div className="flex justify-end gap-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-20" /></div><Skeleton className="h-[260px] w-full rounded-lg" /></div>
              : dashboardSummaryError && !dashboardSummary ? <div role="alert" className="flex h-[280px] flex-col items-center justify-center gap-3 text-sm text-default-500"><span>Activity summary could not be loaded.</span><Button size="sm" variant="outline" onClick={() => setDashboardSummaryRetry(value => value + 1)}>Retry</Button></div>
              : <div className={cn("transition-opacity", loadingDashboardSummary && "opacity-50")}><Chart type="area" height={280} options={activityChartOptions} series={[
                { name: "Submissions", data: activity.map(point => Number(point.submissions) || 0) },
                { name: "Interviews", data: activity.map(point => Number(point.interviews) || 0) },
              ]} /></div>}
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="border-b border-default-100 pb-4">
            <CardTitle className="text-base font-bold">Hiring pipeline</CardTitle>
            <CardDescription className="mt-1 text-xs">Jobs and candidate progress across your portfolio.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            {jobsLoading || (loadingDashboardSummary && !dashboardSummary) ? <Skeleton className="h-[310px] w-full rounded-lg" />
              : jobsError || (dashboardSummaryError && !dashboardSummary) ? <div role="alert" className="flex h-[310px] items-center justify-center text-sm text-default-500">Pipeline comparison could not be loaded.</div>
              : <div className={cn("space-y-3 py-2 transition-opacity", loadingDashboardSummary && "opacity-50")}>
                {comparisonGroups.map((group, groupIndex) => <div key={group.label} className={cn("space-y-2", groupIndex > 0 && "border-t border-default-100 pt-3")}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
                  {group.rows.map(row => <div key={row.label} className="grid grid-cols-[100px_minmax(0,1fr)_28px] items-center gap-3 text-xs" title={`${row.label}: ${row.count}`}>
                    <span className="text-slate-700 dark:text-slate-300">{row.label}</span>
                    <div className="h-5 overflow-hidden rounded bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                      <div className={cn("h-full rounded transition-[width] duration-300", row.color)} style={{ width: `${row.count / comparisonMaximum * 100}%` }} />
                    </div>
                    <span className="text-right font-semibold tabular-nums text-slate-800 dark:text-slate-200">{row.count}</span>
                  </div>)}
                </div>)}
                <div className="grid grid-cols-[100px_minmax(0,1fr)_28px] gap-3" aria-hidden="true"><span /><div className="flex justify-between border-t border-default-200 pt-1 text-[10px] tabular-nums text-slate-500">{Array.from({ length: 5 }, (_, index) => <span key={index}>{comparisonMaximum * index / 4}</span>)}</div><span /></div>
                <p className="text-[10px] leading-relaxed text-slate-500">Job and position counts measure demand; candidate counts measure progress.</p>
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* AM Jobs Portfolio Table */}
      <Card className="border border-default-150 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <CardHeader className="border-b border-default-100 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Icon icon="heroicons:folder-open" className="text-indigo-655" />
              Active Job Portfolio (AM View)
            </CardTitle>
            <CardDescription className="text-xs">Monitor your assigned requisitions and metrics.</CardDescription>
          </div>
          {canCreateJobs && (
            <Link href="/job-posting/new">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-750 text-white font-semibold text-[11px] px-3 py-1.5 shadow-sm">
                + Create Job
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!canViewJobs ? (
            <div className="p-8 text-center text-xs text-default-400">Access Restricted. Contact Admin.</div>
          ) : jobsError ? (
            <div role="alert" className="flex flex-col items-center gap-3 p-8 text-center text-sm text-default-500"><span>{jobsError}</span><Button size="sm" variant="outline" onClick={onRetryJobs}>Retry jobs</Button></div>
          ) : jobsLoading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-11 w-full" />)}</div>
          ) : activeJobs.length === 0 ? (
            <div className="p-8 text-center text-xs text-default-400">No active job requirements assigned to your portfolio.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-default-50 border-b border-default-200">
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Job Code</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Job Title</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Type / Location</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Client Name</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider text-center">Positions</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider text-center">Submissions</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Responded By</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Rates</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100">
                  {activeJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-default-50/70 transition-colors text-xs group">
                      <td className="py-3 px-4 font-mono text-default-700 font-semibold">{job.jobCode}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-default-900">{job.jobTitle}</div>
                        {(job.priority === "Hot" || job.priority === "Urgent" || job.priority === "High") && (
                          <Badge className="mt-1 bg-rose-50 text-rose-600 border-rose-200 text-[9px] px-1.5 py-0">Hot Requirement</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <DashboardJobStatusBadge
                          status={job.jobStatus}
                          disabled={!canEditStatus || normalizeJobStatus(job.jobStatus || '') === 'Pending Approval' || Boolean(job.approvalStatus && job.approvalStatus !== 'APPROVED')}
                          jobCode={job.jobCode}
                          onClick={() => openStatus(job)}
                        />
                      </td>
                      <td className="py-3 px-4 text-default-600">
                        <div className="font-medium">{job.jobType || "Full-Time"}</div>
                        <div className="text-[10px] text-default-450">{job.location || "Remote"}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-default-855">{job.client || "N/A"}</td>
                      <td className="py-3 px-4 text-center font-bold text-default-800">{job.noOfPositions || 1}</td>
                      <td className="py-3 px-4 text-center font-bold text-indigo-650">
                        {job.submissionDone || 0} / {job.submissionRequired || 0}
                      </td>
                      <td className="py-3 px-4 text-default-600">
                        <div className="font-medium">{job.targetDate ? new Date(job.targetDate).toLocaleDateString() : "TBD"}</div>
                        <div className="text-[10px] text-amber-600 font-semibold">{job.jobAge || "0"} days active</div>
                      </td>
                      <td className="py-3 px-4 text-default-800 font-medium">
                        {(() => {
                          const formatRate = (rate: string, market: string) => {
                            if (!rate || rate === "N/A") return "N/A";
                            if (/[a-zA-Z$₹]/.test(rate)) return rate;
                            return market === "IN" ? `INR - ${rate} LPA` : `USD - $${rate}/hr`;
                          };
                          return (
                            <>
                              {formatRate(job.clientBillRate, job.market || "US")}
                              {" "}
                              <span className="text-default-400 font-normal">/</span>
                              {" "}
                              {formatRate(job.payRate, job.market || "US")}
                            </>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-default-500 font-medium">
                        {job.createdOn ? new Date(job.createdOn).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <JobStatusModal job={statusJob} statusValue={statusValue} onStatusValueChange={setStatusValue} saving={statusSaving} error={statusError} onConfirm={confirmStatus} onClose={() => { if (!statusInFlight.current) setStatusJob(null); }} />
    </div>
  );
}

// ─── POD LEAD / TEAM HEAD DASHBOARD VIEW ──────────────────────────────────────

function DashboardJobStatusBadge({
  status,
  disabled, jobCode, onClick,
}: {
  status: string;
  disabled: boolean;
  jobCode: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Edit status for ${jobCode}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "text-[10.5px] font-semibold px-2 py-0.5 rounded-sm border shadow-none bg-white dark:bg-slate-900 enabled:cursor-pointer disabled:cursor-default outline-none focus:ring-1 focus:ring-indigo-500",
        status === "Active"
          ? "text-green-700 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800/30"
          : status === "Close" || status === "Closed"
          ? "text-red-700 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800/30"
          : status === "Filled"
          ? "text-blue-700 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800/30"
          : "text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-800/30"
      )}
    >
      {normalizeJobStatus(status || '') || status}
    </button>
  );
}

// ─── ACCOUNT MANAGER (BDM) DASHBOARD VIEW ────────────────────────────────────
