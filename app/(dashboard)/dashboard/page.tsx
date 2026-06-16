"use client";

import React, { useEffect, useState } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { atsApi } from "@/lib/ats-api";
import Link from "next/link";

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profData, jobsData] = await Promise.all([
          atsApi.auth.me(),
          atsApi.jobs.list().catch(() => [])
        ]);
        setProfile(profData);
        setJobs(jobsData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-sm text-default-500">Loading workspace dashboard...</p>
      </div>
    );
  }

  const roleName = profile?.roleName || "Recruiter";
  const systemRole = profile?.systemRole || "RECRUITER";
  const isAlias = roleName.toUpperCase().trim() !== systemRole;

  // Metric calculation helpers
  const activeJobs = jobs.filter(j => j.jobStatus === "Active");
  const highPriorityJobs = activeJobs.filter(j => j.priority === "High" || j.priority === "Urgent");

  return (
    <div className="space-y-6">
      <SiteBreadcrumb />

      {/* Welcome Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 p-6 md:p-8 text-white shadow-md border border-slate-800">
        <div className="absolute -right-10 -bottom-10 opacity-10 text-[180px] font-black select-none pointer-events-none">
          ATS
        </div>
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
            <Icon icon="heroicons:sparkles" className="h-3.5 w-3.5" />
            {profile?.tenantDomain || "Company Workspace"}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome back, {profile?.fullName || "Staff Member"}!
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-md">
            Here is your dynamic workspace overview. Configure requirements, review candidate pipeline, and check staffing metrics.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Badge className="bg-white/10 text-white hover:bg-white/20 border-white/10 font-semibold px-2.5 py-1 text-xs">
              Role: {roleName}
            </Badge>
            {isAlias && (
              <Badge className="bg-amber-500/25 text-amber-300 border-amber-500/30 font-semibold px-2.5 py-1 text-xs flex items-center gap-1">
                <Icon icon="heroicons:cpu-chip" className="h-3.5 w-3.5" />
                Template: {systemRole.replace("_", " ")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Render Dashboard Widgets based on resolved systemRole */}
      {systemRole === "SUPER_ADMIN" || systemRole === "ADMIN" ? (
        <AdminDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} />
      ) : systemRole === "ACCOUNT_MANAGER" ? (
        <AccountManagerDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} highPriorityJobs={highPriorityJobs} />
      ) : systemRole === "DELIVERY_HEAD" || systemRole === "TRACKER" ? (
        <DeliveryHeadDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} />
      ) : (
        <RecruiterDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} />
      )}
    </div>
  );
}

// ─── ADMIN / SUPER ADMIN DASHBOARD VIEW ───────────────────────────────────────
function AdminDashboardView({ profile, jobs, activeJobs }: { profile: any; jobs: any[]; activeJobs: any[] }) {
  const userLimit = profile?.userLimit || 5;
  const activeUserCount = 2; // Mock/estimate count.
  const seatProgress = Math.min((activeUserCount / userLimit) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:users" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Seats License</p>
              <h3 className="text-xl font-bold text-default-850 mt-1">{activeUserCount} / {userLimit}</h3>
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

      {/* Admin Quick Panels */}
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
                <span>License Seat Allocation</span>
                <span>{seatProgress.toFixed(0)}% Utilized</span>
              </div>
              <div className="w-full bg-default-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${seatProgress > 80 ? "bg-rose-500" : "bg-indigo-600"}`}
                  style={{ width: `${seatProgress}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-default-500">
                You have allocated {activeUserCount} of {userLimit} total staff seat licenses. Deactivate old staff to free up licenses.
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
              <span className="font-bold text-default-900 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-default-200">{profile?.tenantDomain || "N/A"}.com</span>
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

// ─── ACCOUNT MANAGER (BDM) DASHBOARD VIEW ────────────────────────────────────
function AccountManagerDashboardView({ profile, jobs, activeJobs, highPriorityJobs }: { profile: any; jobs: any[]; activeJobs: any[]; highPriorityJobs: any[] }) {
  const canViewJobs = profile?.permissions?.includes("job:view");
  const canCreateJobs = profile?.permissions?.includes("job:create");

  return (
    <div className="space-y-6">
      {/* AM Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:briefcase" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">My Active Job Orders</p>
              <h3 className="text-xl font-bold text-default-850 mt-1">{canViewJobs ? activeJobs.length : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-rose-50 dark:bg-slate-800 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:fire" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Urgent Requests</p>
              <h3 className="text-xl font-bold text-rose-600 mt-1">{canViewJobs ? highPriorityJobs.length : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:check-circle" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Total Submissions</p>
              <h3 className="text-xl font-bold text-default-850 mt-1">
                {canViewJobs ? activeJobs.reduce((acc, job) => acc + (job.submissionDone || 0), 0) : "N/A"}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:arrow-path" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Closure Goal</p>
              <h3 className="text-xl font-bold text-default-850 mt-1">{canViewJobs ? "75% Achieved" : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AM Portfolio Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {canViewJobs ? (
          <Card className="lg:col-span-2 border border-default-150 bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-default-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Icon icon="heroicons:folder-open" className="text-indigo-600" />
                  Active Job Portfolio (AM View)
                </CardTitle>
                <CardDescription className="text-xs">Monitor status of job orders, openings, and submissions.</CardDescription>
              </div>
              {canCreateJobs && (
                <Link href="/job-posting/new">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-750 text-white font-semibold text-[11px] px-2.5 py-1">
                    + Create Job
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {activeJobs.length === 0 ? (
                <div className="p-8 text-center text-xs text-default-400">No active job requirements assigned to your portfolio.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-default-50 border-b border-default-100">
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Code / Title</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Client Name</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Bill/Pay Rate</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Priority</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700 text-center">Submissions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-100">
                      {activeJobs.slice(0, 5).map((job) => (
                        <tr key={job.id} className="hover:bg-default-50/50 transition-colors text-xs">
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-default-900">{job.jobTitle}</div>
                            <div className="text-[10px] text-default-400 font-mono">{job.jobCode}</div>
                          </td>
                          <td className="py-2.5 px-4 font-medium text-default-600">{job.client}</td>
                          <td className="py-2.5 px-4 font-medium text-default-850">
                            {job.clientBillRate} / {job.payRate}
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge className={`px-2 py-0.5 text-[9px] font-bold ${
                              job.priority === "High" || job.priority === "Urgent" 
                                ? "bg-rose-50 text-rose-700 border-rose-100" 
                                : "bg-default-100 text-default-700 border-default-200"
                            }`}>
                              {job.priority}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-indigo-600">
                            {job.submissionDone} / {job.submissionRequired}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-2 border border-default-150 bg-white dark:bg-slate-900 p-8 text-center flex flex-col items-center justify-center min-h-[300px] shadow-sm">
            <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-slate-800 text-amber-500 flex items-center justify-center text-2xl mb-3 shadow-inner">
              <Icon icon="heroicons:shield-exclamation" />
            </div>
            <h4 className="text-sm font-bold text-default-900 mb-1">Access Restricted</h4>
            <p className="text-xs text-default-500 max-w-xs leading-normal">
              You do not have the necessary <strong>job:view</strong> permission required to see active job orders. Contact your administrator.
            </p>
          </Card>
        )}

        {/* High Priority Requirements Sidebar */}
        <Card className="border border-default-150 bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-default-100">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Icon icon="heroicons:fire" className="text-rose-600" />
              Hot Requirements
            </CardTitle>
            <CardDescription className="text-xs">Needs immediate sourcing coverage.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {!canViewJobs ? (
              <div className="text-center py-8 text-xs text-default-400">
                <Icon icon="heroicons:lock-closed" className="mx-auto h-5 w-5 mb-1.5 text-default-300" />
                Access Blocked
              </div>
            ) : highPriorityJobs.length === 0 ? (
              <p className="text-xs text-default-400 text-center py-6">No urgent jobs at the moment.</p>
            ) : (
              highPriorityJobs.slice(0, 4).map((job) => (
                <div key={job.id} className="border border-rose-100/50 bg-rose-50/10 p-3 rounded-lg space-y-1.5 hover:bg-rose-50/20 transition-all">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-rose-600 font-mono">{job.jobCode}</span>
                    <Badge className="bg-rose-600 text-white font-semibold text-[9px] px-1.5 py-0.2">Hot</Badge>
                  </div>
                  <h4 className="text-xs font-bold text-default-900">{job.jobTitle}</h4>
                  <div className="flex justify-between text-[10px] text-default-500 font-semibold pt-1 border-t border-rose-50">
                    <span>Client: {job.client}</span>
                    <span>Rate: {job.clientBillRate}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── RECRUITER DASHBOARD VIEW ────────────────────────────────────────────────
function RecruiterDashboardView({ profile, jobs, activeJobs }: { profile: any; jobs: any[]; activeJobs: any[] }) {
  const canViewJobs = profile?.permissions?.includes("job:view");

  return (
    <div className="space-y-6">
      {/* Recruiter Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:briefcase" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Active Jobs to Source</p>
              <h3 className="text-xl font-bold text-default-850 mt-1">{canViewJobs ? activeJobs.length : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:arrow-up-tray" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">My Submissions</p>
              <h3 className="text-xl font-bold text-default-850 mt-1">12 Candidates</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:chat-bubble-left-right" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Interview loops</p>
              <h3 className="text-xl font-bold text-default-850 mt-1">4 Active</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:trophy" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Sourcing Rank</p>
              <h3 className="text-xl font-bold text-default-850 mt-1">#2 in CSM</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recruiter Workspace Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {canViewJobs ? (
          <Card className="lg:col-span-2 border border-default-150 bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-default-100">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Icon icon="heroicons:magnifying-glass" className="text-indigo-600" />
                Sourcing Board
              </CardTitle>
              <CardDescription className="text-xs">Select a job order to submit candidates.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {activeJobs.length === 0 ? (
                <div className="p-8 text-center text-xs text-default-400">No jobs to source for at the moment.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-default-50 border-b border-default-100">
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Code / Job Title</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Client</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Primary Skills</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Pay Rate</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-100">
                      {activeJobs.slice(0, 5).map((job) => (
                        <tr key={job.id} className="hover:bg-default-50/50 transition-colors text-xs">
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-default-900">{job.jobTitle}</div>
                            <div className="text-[10px] text-default-400 font-mono">{job.jobCode}</div>
                          </td>
                          <td className="py-2.5 px-4 text-default-600 font-medium">{job.client}</td>
                          <td className="py-2.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {job.skillsRequired?.slice(0, 3).map((skill: string, index: number) => (
                                <Badge key={index} className="bg-default-100 text-default-600 border-default-200 font-semibold px-1 py-0 text-[8px]">{skill}</Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-default-850">{job.payRate}</td>
                          <td className="py-2.5 px-4 text-right">
                            <Link href={`/job-posting/${job.id}`}>
                              <Button size="sm" variant="outline" className="text-[10px] font-bold py-0.5 px-2">
                                Source
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-2 border border-default-150 bg-white dark:bg-slate-900 p-8 text-center flex flex-col items-center justify-center min-h-[300px] shadow-sm">
            <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-slate-800 text-amber-500 flex items-center justify-center text-2xl mb-3 shadow-inner">
              <Icon icon="heroicons:shield-exclamation" />
            </div>
            <h4 className="text-sm font-bold text-default-900 mb-1">Access Restricted</h4>
            <p className="text-xs text-default-500 max-w-xs leading-normal">
              You do not have the necessary <strong>job:view</strong> permission required to see active job orders. Contact your administrator.
            </p>
          </Card>
        )}

        {/* Recruiter Sourcing Funnel */}
        <Card className="border border-default-150 bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-default-100">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Icon icon="heroicons:funnel" className="text-emerald-500" />
              Sourcing Pipeline
            </CardTitle>
            <CardDescription className="text-xs">Stages of your submitted applications.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-default-600">
                <span>Sourced Profile Entries</span>
                <span className="font-bold text-default-900">30</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded overflow-hidden">
                <div className="bg-indigo-500 h-full rounded" style={{ width: '80%' }}></div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-default-600">
                <span>Submissions Approved</span>
                <span className="font-bold text-default-900">12</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded overflow-hidden">
                <div className="bg-blue-500 h-full rounded" style={{ width: '40%' }}></div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-default-600">
                <span>Currently Interviewing</span>
                <span className="font-bold text-default-900">4</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded overflow-hidden">
                <div className="bg-amber-500 h-full rounded" style={{ width: '15%' }}></div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-default-600">
                <span>Closed Placements 🎉</span>
                <span className="font-bold text-emerald-600">2</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded overflow-hidden">
                <div className="bg-emerald-500 h-full rounded" style={{ width: '8%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── DELIVERY HEAD / TRACKER DASHBOARD VIEW ──────────────────────────────────
function DeliveryHeadDashboardView({ profile, jobs, activeJobs }: { profile: any; jobs: any[]; activeJobs: any[] }) {
  const canViewJobs = profile?.permissions?.includes("job:view");

  return (
    <div className="space-y-6">
      {/* Delivery Head Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:check-circle" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Submissions to Audit</p>
              <h3 className="text-xl font-bold text-indigo-600 mt-1">7 Pending</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:briefcase" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Active Sourcing Requisitions</p>
              <h3 className="text-xl font-bold text-default-850 mt-1">{canViewJobs ? activeJobs.length : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shadow-inner">
              <Icon icon="heroicons:academic-cap" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Active Interviews Today</p>
              <h3 className="text-xl font-bold text-default-850 mt-1">3 Scheduled</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {canViewJobs ? (
          <Card className="lg:col-span-2 border border-default-150 bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-default-100">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Icon icon="heroicons:list-bullet" className="text-indigo-600" />
                Recruitment Delivery Sourcing Coverage
              </CardTitle>
              <CardDescription className="text-xs">Monitor current team coverage on active client requisitions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {activeJobs.length === 0 ? (
                <div className="p-8 text-center text-xs text-default-400">No active job requirements to monitor.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-default-50 border-b border-default-100">
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Code / Job Title</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Client Name</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700 text-center">Submissions Coverage</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700 text-right">Coverage Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-100">
                      {activeJobs.slice(0, 5).map((job) => {
                        const percentage = Math.min((job.submissionDone / job.submissionRequired) * 100, 100);
                        return (
                          <tr key={job.id} className="hover:bg-default-50/50 transition-colors text-xs">
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-default-900">{job.jobTitle}</div>
                              <div className="text-[10px] text-default-400 font-mono">{job.jobCode}</div>
                            </td>
                            <td className="py-2.5 px-4 font-medium text-default-600">{job.client}</td>
                            <td className="py-2.5 px-4 text-center font-bold text-default-850">
                              {job.submissionDone} / {job.submissionRequired}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <Badge className={`px-2 py-0.5 text-[9px] font-bold ${
                                percentage >= 100 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                  : percentage >= 50 
                                  ? "bg-blue-50 text-blue-700 border-blue-100"
                                  : "bg-amber-50 text-amber-700 border-amber-100"
                              }`}>
                                {percentage >= 100 ? "Full Coverage" : percentage >= 50 ? "Partial Coverage" : "Needs Sourcing"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-2 border border-default-150 bg-white dark:bg-slate-900 p-8 text-center flex flex-col items-center justify-center min-h-[300px] shadow-sm">
            <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-slate-800 text-amber-500 flex items-center justify-center text-2xl mb-3 shadow-inner">
              <Icon icon="heroicons:shield-exclamation" />
            </div>
            <h4 className="text-sm font-bold text-default-900 mb-1">Access Restricted</h4>
            <p className="text-xs text-default-500 max-w-xs leading-normal">
              You do not have the necessary <strong>job:view</strong> permission required to see active job orders. Contact your administrator.
            </p>
          </Card>
        )}

        {/* L1 Audit Pipeline Status */}
        <Card className="border border-default-150 bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-default-100">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Icon icon="heroicons:shield-check" className="text-indigo-600" />
              L1 Audit Checklist
            </CardTitle>
            <CardDescription className="text-xs">Standard operational procedure review.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            <div className="p-3 bg-default-50 rounded-lg border border-default-150 space-y-1">
              <h5 className="font-bold text-default-900 flex items-center gap-1">
                <Icon icon="heroicons:arrow-up-tray" className="text-indigo-600" />
                1. Resume Submissions Audit
              </h5>
              <p className="text-[10px] text-default-500">Ensure skills and visa status match requirements exactly before pushing candidate profiles to AM review.</p>
            </div>
            <div className="p-3 bg-default-50 rounded-lg border border-default-150 space-y-1">
              <h5 className="font-bold text-default-900 flex items-center gap-1">
                <Icon icon="heroicons:briefcase" className="text-emerald-600" />
                2. Market Segment Alignment
              </h5>
              <p className="text-[10px] text-default-500">Review bill rate vs pay rate margins to ensure compliance with company threshold policies.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
