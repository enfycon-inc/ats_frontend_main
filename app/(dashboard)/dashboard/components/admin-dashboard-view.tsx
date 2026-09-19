"use client";

import React, { useEffect, useState, useMemo } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { atsApi } from "@/lib/ats-api";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { getDashboardJobMetrics } from "@/lib/dashboard-metrics";
import Link from "next/link";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import AddCandidateModal from "@/components/dashboard/AddCandidateModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default // ─── ADMIN / SUPER ADMIN DASHBOARD VIEW ───────────────────────────────────────
function AdminDashboardView({ profile, jobs, activeJobs }: { profile: any; jobs: any[]; activeJobs: any[] }) {
  const userLimit = profile?.userLimit ?? null;
  const metrics = getDashboardJobMetrics(jobs);

  // Analytics Chart Data
  const activityChartOptions: any = {
    chart: { type: "area", toolbar: { show: false }, zoom: { enabled: false }, fontFamily: "inherit" },
    colors: ["#6366f1"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: { categories: metrics.dayLabels, tooltip: { enabled: false } },
    yaxis: { labels: { formatter: (val: number) => Math.floor(val) } },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
    legend: { position: "top", horizontalAlign: "right" },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 }
  };
  const activityChartSeries = [
    { name: "New Jobs", data: metrics.dailyJobs }
  ];

  const statusMixOptions: any = {
    chart: { type: "donut", fontFamily: "inherit" },
    labels: ["Active", "On Hold", "Closed", "Filled"],
    colors: ["#10b981", "#f59e0b", "#ef4444", "#3b82f6"],
    plotOptions: { pie: { donut: { size: "75%" } } },
    dataLabels: { enabled: false },
    legend: { position: "bottom" },
    stroke: { show: false }
  };

  const statusMixSeries = metrics.statusMix;

  // Table Data (Latest 5 jobs)
  const recentJobs = metrics.recentJobs;

  return (
    <div className="space-y-6">
      {/* 1. ORIGINAL METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:users" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Seat Limit</p>
              <h3 className="text-xl font-bold text-default-850 mt-1">{userLimit ?? "Unavailable"}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:briefcase" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Active Jobs</p>
              <h3 className="text-xl font-bold text-default-850 mt-1">{activeJobs.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:globe-americas" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Operating Market</p>
              <h3 className="text-base font-bold text-default-850 mt-1">{profile?.defaultMarket === "IN" ? "🇮🇳 India IT" : "🇺🇸 US IT"}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:shield-check" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Status</p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">Active</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. NEW ANALYTICS CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-default-150 shadow-sm">
          <CardHeader className="pb-2 border-b border-default-100 mb-4">
            <CardTitle className="text-sm font-bold text-default-800">New Jobs — Last 7 Days</CardTitle>
            <CardDescription className="text-xs">Based on jobs available in the selected office scope.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <Chart options={activityChartOptions} series={activityChartSeries} type="area" height="100%" width="100%" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-default-150 shadow-sm">
          <CardHeader className="pb-2 border-b border-default-100 mb-4">
            <CardTitle className="text-sm font-bold text-default-800">Job Status Mix</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center h-[250px]">
            {statusMixSeries.some(count => count > 0) ? (
              <Chart options={statusMixOptions} series={statusMixSeries} type="donut" height="100%" width="100%" />
            ) : (
              <p className="text-xs text-default-500">No job status data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. NEW RECENT ORGANIZATIONAL JOBS TABLE */}
      <Card className="border border-default-150 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-default-100 bg-default-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-default-800">Recent Organizational Requirements</CardTitle>
              <CardDescription className="text-xs mt-1">Latest jobs in the selected office scope.</CardDescription>
            </div>
            <Link href="/job-posting">
              <Button variant="outline" size="sm" className="text-xs h-8">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-default-100 dark:bg-slate-800/80 text-default-600 dark:text-default-300 text-[11px] uppercase tracking-wider">
                <th className="p-3 font-semibold">Job Title</th>
                <th className="p-3 font-semibold">Client</th>
                <th className="p-3 font-semibold">Positions</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100 dark:divide-slate-800 text-sm">
              {recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-default-400">No recent jobs found in the tenant.</td>
                </tr>
              ) : (
                recentJobs.map((job, i) => (
                  <tr key={job.id || i} className="hover:bg-default-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-indigo-600 dark:text-indigo-400">{job.jobTitle || "Untitled job"}</div>
                      <div className="text-xs text-default-500">{job.jobCode || "—"}</div>
                    </td>
                    <td className="p-3 text-default-700">{job.client || "—"}</td>
                    <td className="p-3 font-medium">{job.noOfPositions ?? "—"}</td>
                    <td className="p-3">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold",
                        job.jobStatus === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        "bg-default-100 text-default-600 dark:bg-slate-800 dark:text-default-300"
                      )}>
                        {job.jobStatus || "—"}
                      </span>
                    </td>
                    <td className="p-3 text-default-500 text-xs">
                      {job.createdOn ? new Date(job.createdOn).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. ORIGINAL ADMIN QUICK PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-default-150 bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-default-100">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Icon icon="heroicons:cog" className="text-indigo-600" />
              Workspace Controls
            </CardTitle>
            <CardDescription className="text-xs">Quick shortcuts to administer the ATS portal.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="bg-default-50 dark:bg-slate-800/40 p-4 rounded-xl space-y-2.5">
              <div className="flex justify-between text-xs font-bold text-default-700">
                <span>Licensed Staff Seats</span>
                <span>{userLimit ?? "Unavailable"}</span>
              </div>
              <p className="text-[11px] text-default-500">
                Current seat utilization is unavailable on this dashboard.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link href="/utility/roles-permissions">
                <Button variant="outline" className="w-full justify-start text-xs font-semibold" size="sm">
                  <Icon icon="heroicons:user-group" className="mr-2 h-4 w-4 text-indigo-600" />
                  Manage Staff & Roles
                </Button>
              </Link>
              <Link href="/job-posting/new">
                <Button variant="outline" className="w-full justify-start text-xs font-semibold" size="sm">
                  <Icon icon="heroicons:plus" className="mr-2 h-4 w-4 text-emerald-600" />
                  Post Job Requirement
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-default-100">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Icon icon="heroicons:shield-check" className="text-amber-500" />
              System Status
            </CardTitle>
            <CardDescription className="text-xs">Multi-tenant environment parameters.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-default-500">Corporate Domain</span>
              <span className="font-bold text-default-900 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-default-200">
                {profile?.tenantDomain ? (profile.tenantDomain.toLowerCase().endsWith('.com') ? profile.tenantDomain : `${profile.tenantDomain}.com`) : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-default-500">India Recruitment Mode</span>
              <span className="font-bold text-default-900">{profile?.defaultMarket === "IN" ? "Enabled" : "Disabled"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-default-500">Platform Approvals</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Bypassed (Instant)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardJobStatusSelect({
  status,
  onChange,
}: {
  status: string;
  onChange: (newStatus: string) => void;
}) {
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "text-[10.5px] font-semibold px-2 py-0.5 rounded-sm border shadow-none bg-white dark:bg-slate-900 cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500",
        status === "Active"
          ? "text-green-700 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800/30"
          : status === "Close" || status === "Closed"
          ? "text-red-700 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800/30"
          : status === "Filled"
          ? "text-blue-700 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800/30"
          : "text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-800/30"
      )}
    >
      <option value="Active">Active</option>
      <option value="Hold">Hold</option>
      <option value="Filled">Filled</option>
      <option value="Closed">Closed</option>
    </select>
  );
}

// ─── ACCOUNT MANAGER (BDM) DASHBOARD VIEW ────────────────────────────────────
