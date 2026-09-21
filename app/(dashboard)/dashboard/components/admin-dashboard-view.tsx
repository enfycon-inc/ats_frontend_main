
"use client";

import React, { useEffect, useState, useMemo } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { atsApi } from "@/lib/ats-api";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function AdminDashboardView({ profile, jobs, activeJobs }: { profile: any; jobs: any[]; activeJobs: any[] }) {
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const seatLimit = profile?.userLimit || "Unlimited";

  useEffect(() => {
    let cancelled = false;
    // Fetch users and branches in the background for global metrics
    Promise.all([
      atsApi.auth.listUsers().catch(() => []),
      atsApi.branches.list().catch(() => [])
    ]).then(([u, b]) => {
      if (!cancelled) {
        setUsers(Array.isArray(u) ? u : []);
        setBranches(Array.isArray(b) ? b : []);
        setIsLoadingBranches(false);
      }
    });
    
        
    return () => { cancelled = true; };
  }, []);

  // 1. Group jobs by Branch for the Branch Performance Matrix
  const branchMetrics = useMemo(() => {
    const map = new Map<string, { name: string; active: number; onHold: number; closed: number; filled: number; total: number }>();
    
    // Initialize map with known branches from API to ensure empty branches show up
    branches.forEach(b => {
      map.set(b.name, { name: b.name, active: 0, onHold: 0, closed: 0, filled: 0, total: 0 });
    });

    jobs.forEach(j => {
      const branchName = j.businessUnit || j.branchName || "Unassigned / Global";
      if (!map.has(branchName)) {
        map.set(branchName, { name: branchName, active: 0, onHold: 0, closed: 0, filled: 0, total: 0 });
      }
      const data = map.get(branchName)!;
      data.total += 1;
      
      const status = j.jobStatus || "";
      if (status === "Active") data.active += 1;
      else if (status === "On Hold") data.onHold += 1;
      else if (status === "Closed") data.closed += 1;
      else if (status === "Filled") data.filled += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.active - a.active);
  }, [jobs, branches]);

  // 2. Job Status Mix Stacked Bar Chart Configuration
  const stackedChartSeries = useMemo(() => {
    return [
      { name: "Active", data: branchMetrics.map(b => b.active) },
      { name: "On Hold", data: branchMetrics.map(b => b.onHold) },
      { name: "Closed", data: branchMetrics.map(b => b.closed) },
      { name: "Filled", data: branchMetrics.map(b => b.filled) },
    ];
  }, [branchMetrics]);

  const stackedChartOptions: any = useMemo(() => ({
    chart: { type: "bar", stacked: true, toolbar: { show: false }, background: "transparent" },
    plotOptions: { bar: { horizontal: false, columnWidth: "40%", borderRadius: 2 } },
    xaxis: { categories: branchMetrics.map(b => b.name), labels: { style: { colors: "#64748b" } } },
    yaxis: { labels: { style: { colors: "#64748b" } } },
    colors: ["#10b981", "#f59e0b", "#ef4444", "#3b82f6"],
    legend: { position: "top", horizontalAlign: "right" },
    dataLabels: { enabled: false },
    theme: { mode: typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light" }
  }), [branchMetrics]);

  // 3. Recent Jobs
  const recentJobs = useMemo(() => {
    return [...jobs].sort((a, b) => new Date(b.createdOn || 0).getTime() - new Date(a.createdOn || 0).getTime()).slice(0, 10);
  }, [jobs]);

  return (
    <div className="space-y-6">
      {/* 1. GLOBAL KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-default-150 shadow-sm bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Icon icon="heroicons:building-office" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-default-500 uppercase tracking-wider mb-1">Active Branches</p>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {isLoadingBranches ? <Skeleton className="h-8 w-12" /> : branches.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Icon icon="heroicons:briefcase" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-default-500 uppercase tracking-wider mb-1">Global Active Jobs</p>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{activeJobs.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Icon icon="heroicons:users" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-default-500 uppercase tracking-wider mb-1">Staff / Seat Usage</p>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {users.length > 0 ? users.length : (isLoadingBranches ? <Skeleton className="h-8 w-16 inline-block" /> : "0")} <span className="text-sm font-semibold text-default-400">/ {seatLimit}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Icon icon="heroicons:chart-bar" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-default-500 uppercase tracking-wider mb-1">Total Pipeline</p>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {jobs.reduce((acc, job) => acc + (job.submissionsCount || 0), 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. BRANCH PERFORMANCE MATRIX */}
        <Card className="border border-default-150 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <CardHeader className="border-b border-default-100 py-4 bg-default-50/50 dark:bg-slate-900/50">
            <CardTitle className="text-sm font-bold text-default-800">Branch Performance Matrix</CardTitle>
            <CardDescription className="text-xs mt-1">Workload distribution across offices.</CardDescription>
          </CardHeader>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-default-100 dark:bg-slate-800/80 text-default-600 dark:text-default-300 text-[10px] uppercase tracking-wider shadow-sm">
                  <th className="p-3 font-bold">Branch Name</th>
                  <th className="p-3 font-bold text-center">Active Jobs</th>
                  <th className="p-3 font-bold text-center">Total Jobs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100 dark:divide-slate-800 text-sm">
                {isLoadingBranches ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={"skel-matrix-"+i}>
                      <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-3 flex justify-center"><Skeleton className="h-5 w-8 rounded-full" /></td>
                      <td className="p-3 text-center"><Skeleton className="h-4 w-6 mx-auto" /></td>
                    </tr>
                  ))
                ) : branchMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-default-400">No branch data available.</td>
                  </tr>
                ) : (
                  branchMetrics.map((b, i) => (
                    <tr key={i} className="hover:bg-default-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{b.name}</td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold text-xs">
                          {b.active}
                        </span>
                      </td>
                      <td className="p-3 text-center font-medium text-default-600">{b.total}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 3. JOB STATUS DISTRIBUTION */}
        <Card className="border border-default-150 shadow-sm flex flex-col h-[400px]">
          <CardHeader className="border-b border-default-100 py-4">
            <CardTitle className="text-sm font-bold text-default-800">Job Status by Branch</CardTitle>
            <CardDescription className="text-xs mt-1">Cross-branch status distribution.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex items-center justify-center">
            {isLoadingBranches ? (
              <div className="w-full h-[320px] px-2 flex items-end justify-around pb-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={"skel-chart-"+i} className="w-12 rounded-t-sm" style={{ height: Math.floor(Math.random() * 60 + 20) + "%" }} />
                ))}
              </div>
            ) : branchMetrics.length > 0 ? (
              <div className="w-full h-[320px] px-2">
                <Chart options={stackedChartOptions} series={stackedChartSeries} type="bar" height="100%" width="100%" />
              </div>
            ) : (
              <p className="text-xs text-default-500">No data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. GLOBAL ACTIVITY FEED */}
      <Card className="border border-default-150 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-default-100 bg-default-50/50 dark:bg-slate-900/50 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-default-800">Global Activity Feed</CardTitle>
              <CardDescription className="text-xs mt-1">Latest requirements posted across all branches.</CardDescription>
            </div>
            <Link href="/job-posting">
              <Button variant="outline" size="sm" className="text-xs h-8">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-default-100 dark:bg-slate-800/80 text-default-600 dark:text-default-300 text-[10px] uppercase tracking-wider">
                <th className="p-3 font-bold">Branch</th>
                <th className="p-3 font-bold">Job Title</th>
                <th className="p-3 font-bold">Client</th>
                <th className="p-3 font-bold">Status</th>
                <th className="p-3 font-bold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100 dark:divide-slate-800 text-sm">
              {isLoadingBranches ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={"skel-feed-"+i}>
                    <td className="p-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-48" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="p-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                  </tr>
                ))
              ) : recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-default-400">No recent jobs found in the tenant.</td>
                </tr>
              ) : (
                recentJobs.map((job, i) => (
                  <tr key={job.id || i} className="hover:bg-default-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
                        {job.businessUnit || job.branchName || "Global"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-indigo-600 dark:text-indigo-400 text-[13px]">{job.jobTitle || "Untitled"}</div>
                      <div className="text-[10px] text-default-500 font-mono mt-0.5">{job.jobCode || "--"}</div>
                    </td>
                    <td className="p-3 text-default-700 text-xs">{job.client || "--"}</td>
                    <td className="p-3">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold",
                        job.jobStatus === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        "bg-default-100 text-default-600 dark:bg-slate-800 dark:text-default-300"
                      )}>
                        {job.jobStatus || "--"}
                      </span>
                    </td>
                    <td className="p-3 text-default-500 text-xs">
                      {job.createdOn ? new Date(job.createdOn).toLocaleDateString() : "--"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
