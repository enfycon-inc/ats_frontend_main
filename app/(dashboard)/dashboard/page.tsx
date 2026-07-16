"use client";

import React, { useEffect, useState } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { atsApi } from "@/lib/ats-api";
import Link from "next/link";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import AddCandidateModal from "@/components/dashboard/AddCandidateModal";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideRole, setOverrideRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const override = localStorage.getItem("override_role");
      setOverrideRole(override);
    }
  }, []);

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

  const handleUpdateJob = async (jobId: string, updatedFields: Partial<any>) => {
    // 1. Optimistic update
    setJobs((prevJobs) =>
      prevJobs.map((job) => (job.id === jobId ? { ...job, ...updatedFields } : job))
    );

    // 2. API Call
    try {
      const apiPayload: Record<string, any> = {};
      if (updatedFields.jobTitle !== undefined) apiPayload.title = updatedFields.jobTitle;
      if (updatedFields.client !== undefined) apiPayload.client = updatedFields.client;
      if (updatedFields.jobStatus !== undefined) apiPayload.status = updatedFields.jobStatus;
      if (updatedFields.priority !== undefined) apiPayload.priority = updatedFields.priority;
      if (updatedFields.clientBillRate !== undefined) apiPayload.clientBillRate = updatedFields.clientBillRate;
      if (updatedFields.payRate !== undefined) apiPayload.payRate = updatedFields.payRate;

      await atsApi.jobs.update(jobId, apiPayload);
      toast.success("Job updated successfully.");
    } catch (err: any) {
      toast.error("Failed to update job: " + err.message);
      // Reload on failure
      try {
        const jobsData = await atsApi.jobs.list().catch(() => []);
        setJobs(jobsData);
      } catch (reloadErr) {
        console.error("Failed to reload jobs:", reloadErr);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-sm text-default-500">Loading workspace dashboard...</p>
      </div>
    );
  }

  const systemRole = overrideRole || profile?.systemRole || "RECRUITER";
  const roleName = overrideRole 
    ? overrideRole.replace("_", " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
    : (profile?.roleName || "Recruiter");
  const isAlias = roleName.toUpperCase().trim() !== systemRole;

  // Metric calculation helpers
  const activeJobs = jobs.filter(j => j.jobStatus === "Active");
  const highPriorityJobs = activeJobs.filter(j => j.priority === "Hot" || j.priority === "High" || j.priority === "Urgent");

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
      {systemRole === "SUPER_ADMIN" || systemRole === "ADMIN" || systemRole === "TENANT_ADMIN" ? (
        <AdminDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} />
      ) : systemRole === "ACCOUNT_MANAGER" ? (
        <AccountManagerDashboardView 
          profile={profile} 
          jobs={jobs} 
          activeJobs={activeJobs} 
          highPriorityJobs={highPriorityJobs} 
          onUpdateJob={handleUpdateJob} 
        />
      ) : systemRole === "POD_LEAD" ? (
        <PodLeadDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} />
      ) : systemRole === "DELIVERY_HEAD" || systemRole === "TRACKER" ? (
        <DeliveryHeadDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} />
      ) : (
        <RecruiterDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} />
      )}
    </div>
  );
}

// ─── POD LEAD DASHBOARD VIEW ──────────────────────────────────────────────────
function PodLeadDashboardView({ profile, jobs, activeJobs }: { profile: any; jobs: any[]; activeJobs: any[] }) {
  const [activeTab, setActiveTab] = useState<"team" | "workspace">("team");
  const [podTeam, setPodTeam] = useState<any>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);

  useEffect(() => {
    async function loadTeam() {
      try {
        const team = await atsApi.pods.getMyTeam();
        setPodTeam(team);
      } catch (err) {
        console.error("Failed to load pod team details:", err);
      } finally {
        setLoadingTeam(false);
      }
    }
    loadTeam();
  }, []);

  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  useEffect(() => {
    async function loadPending() {
      try {
        const res = await atsApi.submissions.list({ finalStatus: "PENDING_APPROVAL" });
        setPendingSubmissions(res || []);
      } catch (err) {
        console.error("Failed to load pending submissions", err);
      } finally {
        setLoadingPending(false);
      }
    }
    loadPending();
  }, []);

  const handleApproveSubmission = async (id: number) => {
    try {
      await atsApi.submissions.update(id, { finalStatus: "SUBMITTED" });
      toast.success("Submission Approved");
      setPendingSubmissions(prev => prev.filter(s => s.id !== id));
    } catch (error: any) {
      toast.error(error.message || "Failed to approve");
    }
  };

  const totalMembers = podTeam?.members?.length || 0;

  // Filter jobs assigned to this pod
  const podJobs = jobs.filter(j => j.podId && podTeam?.id && j.podId === podTeam.id);
  const filledPodJobs = podJobs.filter(j => j.jobStatus === "Filled" || j.jobStatus === "Closed");
  
  const fillRate = podJobs.length ? Math.round((filledPodJobs.length / podJobs.length) * 100) : 0;

  // Recruiter workload calculations
  const recruiterWorkload = podTeam?.members?.map((member: any) => {
    const memberJobs = podJobs.filter(j => j.primaryRecruiterId === member.id);
    const active = memberJobs.filter(j => j.jobStatus === "Active").length;
    const filled = memberJobs.filter(j => j.jobStatus === "Filled" || j.jobStatus === "Closed").length;
    return {
      name: member.fullName,
      email: member.email,
      role: member.systemRole,
      total: memberJobs.length,
      active,
      filled,
    };
  }) || [];

  // Job Status Distribution Data
  const statusSeries = [
    podJobs.filter((j) => j.jobStatus === "Active").length,
    podJobs.filter((j) => j.jobStatus === "Hold" || j.jobStatus === "On Hold").length,
    podJobs.filter((j) => j.jobStatus === "Filled").length,
    podJobs.filter((j) => j.jobStatus === "Closed").length,
  ];

  const hasChartData = statusSeries.some((v) => v > 0);

  const donutOptions: any = {
    chart: {
      type: "donut",
    },
    colors: ["#10B981", "#F59E0B", "#487FFF", "#EF4444"],
    labels: ["Active", "On Hold", "Filled", "Closed"],
    legend: {
      position: "bottom",
      labels: {
        colors: "#64748B",
      }
    },
    dataLabels: {
      enabled: false,
    },
  };

  if (loadingTeam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] border border-default-150 bg-white dark:bg-slate-900 rounded-xl p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-xs text-default-500 font-semibold">Loading pod team parameters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pod Lead Tabs */}
      <div className="flex items-center gap-2 border-b border-default-200 pb-0">
        <button
          onClick={() => setActiveTab("team")}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === "team" 
              ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-b-2 border-indigo-600" 
              : "text-default-500 hover:text-default-800 hover:bg-default-50 dark:hover:bg-slate-800"
          }`}
        >
          <Icon icon="heroicons:user-group" className="h-4 w-4" />
          Team Management
        </button>
        <button
          onClick={() => setActiveTab("workspace")}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === "workspace" 
              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-600" 
              : "text-default-500 hover:text-default-800 hover:bg-default-50 dark:hover:bg-slate-800"
          }`}
        >
          <Icon icon="heroicons:briefcase" className="h-4 w-4" />
          My Sourcing Workspace
        </button>
      </div>

      {activeTab === "team" ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Row 1: Pod Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-655 dark:text-indigo-400 flex items-center justify-center text-xl shadow-inner">
                  <Icon icon="heroicons:users" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Pod Name</p>
                  <h3 className="text-base font-bold text-default-855 mt-1 truncate max-w-[150px]">{podTeam?.name || "No Pod Assigned"}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-slate-800 text-emerald-605 dark:text-emerald-400 flex items-center justify-center text-xl shadow-inner">
                  <Icon icon="heroicons:briefcase" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Total Pod Jobs</p>
                  <h3 className="text-xl font-bold text-default-850 mt-1">{podJobs.length}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shadow-inner">
                  <Icon icon="heroicons:user-group" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Team Size</p>
                  <h3 className="text-xl font-bold text-default-850 mt-1">{totalMembers} Recruiters</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shadow-inner">
                  <Icon icon="heroicons:trophy" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Pod Fill Rate</p>
                  <h3 className="text-xl font-bold text-default-850 mt-1">{fillRate}%</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: High Priority Approvals */}
          <Card className="border border-default-150 bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-default-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Icon icon="heroicons:check-badge" className="text-amber-500" />
                  Pending Submissions Approval
                </CardTitle>
                <CardDescription className="text-xs">Review and approve submissions from your pod members.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPending ? (
                <div className="p-8 text-center text-xs text-default-400">Loading pending approvals...</div>
              ) : pendingSubmissions.length === 0 ? (
                <div className="p-8 text-center text-xs text-default-400">No pending submissions.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-default-50 border-b border-default-100">
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Candidate</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Job Code</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Submitted By</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-100">
                      {pendingSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-default-50/50 transition-colors text-xs">
                          <td className="py-2.5 px-4 font-semibold text-default-900">{sub.candidate?.firstName} {sub.candidate?.lastName}</td>
                          <td className="py-2.5 px-4 text-default-600 font-mono">{sub.job?.jobCode}</td>
                          <td className="py-2.5 px-4 text-default-600">{sub.recruiter?.fullName}</td>
                          <td className="py-2.5 px-4">
                            <Button size="sm" onClick={() => handleApproveSubmission(sub.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3 rounded">
                              Approve
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Row 3: Recruiter Workload Analysis */}
          <Card className="border border-default-150 bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-default-100">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Icon icon="heroicons:chart-bar-square" className="text-emerald-600" />
                Recruiter Workload Analysis
              </CardTitle>
              <CardDescription className="text-xs">Status of sourcing requisitions assigned to recruiters in your pod.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {recruiterWorkload.length === 0 ? (
                <p className="text-xs text-default-400 text-center py-4">No team member workload to display.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {recruiterWorkload.map((rec: any) => (
                    <div key={rec.email} className="rounded-xl border border-default-150 p-4 bg-default-50/50 hover:bg-default-50 transition-all shadow-sm">
                      <div className="flex items-start justify-between min-w-0 gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-default-855 truncate">{rec.name}</p>
                          <p className="text-[10px] text-default-400 font-mono truncate">{rec.email}</p>
                        </div>
                        <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-slate-800 dark:text-slate-300 font-semibold px-2 py-0.5 text-[8px] uppercase tracking-wider shrink-0">
                          {rec.role === "POD_LEAD" ? "Head 👑" : "Recruiter"}
                        </Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-default-100 shadow-inner">
                          <p className="text-[10px] text-default-400 font-semibold uppercase">Total</p>
                          <p className="font-bold text-default-800 mt-0.5">{rec.total}</p>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-default-100 shadow-inner">
                          <p className="text-[10px] text-blue-500 font-semibold uppercase">Active</p>
                          <p className="font-bold text-blue-600 mt-0.5">{rec.active}</p>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-default-100 shadow-inner">
                          <p className="text-[10px] text-emerald-500 font-semibold uppercase">Filled</p>
                          <p className="font-bold text-emerald-600 mt-0.5">{rec.filled}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Row 4: Requisitions & Status Distribution split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Active Pod Requisitions */}
            <div className="lg:col-span-8">
              <Card className="border border-default-150 bg-white dark:bg-slate-900 h-full">
                <CardHeader className="border-b border-default-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Icon icon="heroicons:list-bullet" className="text-indigo-650" />
                      Pod Sourcing Requisitions ({podTeam?.name})
                    </CardTitle>
                    <CardDescription className="text-xs">Monitor assignments and submission quotas for jobs routed to your pod.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {podJobs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-default-400">No job orders assigned to this pod yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-default-50 border-b border-default-100">
                            <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Code / Title</th>
                            <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Client Name</th>
                            <th className="py-2.5 px-4 text-xs font-semibold text-default-700">Priority</th>
                            <th className="py-2.5 px-4 text-xs font-semibold text-default-700 text-center">Submissions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-default-100">
                          {podJobs.slice(0, 10).map((job) => (
                            <tr key={job.id} className="hover:bg-default-50/50 transition-colors text-xs">
                              <td className="py-2.5 px-4">
                                <div className="font-semibold text-default-900">{job.jobTitle}</div>
                                <div className="text-[10px] text-default-400 font-mono">{job.jobCode}</div>
                              </td>
                              <td className="py-2.5 px-4 font-medium text-default-600">{job.client}</td>
                              <td className="py-2.5 px-4">
                                <Badge className={`px-2 py-0.5 text-[9px] font-bold ${
                                  job.priority === "Hot" || job.priority === "High" || job.priority === "Urgent" 
                                    ? "bg-rose-50 text-rose-700 border-rose-100" 
                                    : "bg-amber-50 text-amber-700 border-amber-100"
                                }`}>
                                  {job.priority}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-4 text-center font-bold text-indigo-655">
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
            </div>

            {/* Pod Job Status Distribution */}
            <div className="lg:col-span-4">
              <Card className="border border-default-150 bg-white dark:bg-slate-900 h-full">
                <CardHeader className="border-b border-default-100">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Icon icon="heroicons:chart-pie" className="text-amber-500" />
                    Job Distribution
                  </CardTitle>
                  <CardDescription className="text-xs">Breakdown of requisitions currently assigned to your team.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 flex items-center justify-center min-h-[250px]">
                  {hasChartData ? (
                    <div className="w-full">
                      <Chart
                        options={donutOptions}
                        series={statusSeries}
                        type="donut"
                        height={260}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-default-400 font-medium">No distribution data available.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <RecruiterDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} />
        </div>
      )}
    </div>
  );
}


// ─── ADMIN / SUPER ADMIN DASHBOARD VIEW ───────────────────────────────────────
function AdminDashboardView({ profile, jobs, activeJobs }: { profile: any; jobs: any[]; activeJobs: any[] }) {
  const userLimit = profile?.userLimit || 5;
  const activeUserCount = 2; // Mock/estimate count.
  const seatProgress = Math.min((activeUserCount / userLimit) * 100, 100);

  // Analytics Chart Data
  const activityChartOptions: any = {
    chart: { type: "area", toolbar: { show: false }, zoom: { enabled: false }, fontFamily: "inherit" },
    colors: ["#6366f1", "#10b981"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], tooltip: { enabled: false } },
    yaxis: { labels: { formatter: (val: number) => Math.floor(val) } },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
    legend: { position: "top", horizontalAlign: "right" },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 }
  };
  const activityChartSeries = [
    { name: "New Jobs", data: [4, 6, 2, 8, 5, 1, 3] },
    { name: "Total Submissions", data: [12, 18, 9, 24, 15, 4, 10] }
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

  const activeCount = jobs.filter(j => j.status === "Active").length;
  const holdCount = jobs.filter(j => j.status === "On Hold").length || 1; // dummy fallback
  const closedCount = jobs.filter(j => j.status === "Closed" || j.status === "Close").length || 2;
  const filledCount = jobs.filter(j => j.status === "Filled").length || 0;
  const statusMixSeries = [activeCount, holdCount, closedCount, filledCount];

  // Table Data (Latest 5 jobs)
  const recentJobs = [...jobs].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5);

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

      {/* 2. NEW ANALYTICS CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-default-150 shadow-sm">
          <CardHeader className="pb-2 border-b border-default-100 mb-4">
            <CardTitle className="text-sm font-bold text-default-800">Tenant Activity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <Chart options={activityChartOptions} series={activityChartSeries} type="area" height="100%" width="100%" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-default-150 shadow-sm">
          <CardHeader className="pb-2 border-b border-default-100 mb-4">
            <CardTitle className="text-sm font-bold text-default-800">Tenant Job Status Mix</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center h-[250px]">
            <Chart options={statusMixOptions} series={statusMixSeries} type="donut" height="100%" width="100%" />
          </CardContent>
        </Card>
      </div>

      {/* 3. NEW RECENT ORGANIZATIONAL JOBS TABLE */}
      <Card className="border border-default-150 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-default-100 bg-default-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-default-800">Recent Organizational Requirements</CardTitle>
              <CardDescription className="text-xs mt-1">Latest jobs created across your tenant.</CardDescription>
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
                      <div className="font-semibold text-indigo-600 dark:text-indigo-400">{job.title}</div>
                      <div className="text-xs text-default-500">{job.jobCode || `JOB-${1000+i}`}</div>
                    </td>
                    <td className="p-3 text-default-700">{job.clientName || "Direct"}</td>
                    <td className="p-3 font-medium">{job.headcount || 1}</td>
                    <td className="p-3">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold",
                        job.status === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        "bg-default-100 text-default-600 dark:bg-slate-800 dark:text-default-300"
                      )}>
                        {job.status || "Active"}
                      </span>
                    </td>
                    <td className="p-3 text-default-500 text-xs">
                      {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Recently"}
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
function AccountManagerDashboardView({ 
  profile, 
  jobs, 
  activeJobs, 
  highPriorityJobs,
  onUpdateJob
}: { 
  profile: any; 
  jobs: any[]; 
  activeJobs: any[]; 
  highPriorityJobs: any[];
  onUpdateJob: (jobId: string, updatedFields: Partial<any>) => Promise<void>;
}) {
  const [editingCell, setEditingCell] = useState<{ jobId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editBillRateValue, setEditBillRateValue] = useState("");
  const [editPayRateValue, setEditPayRateValue] = useState("");
  
  // State for AM Submissions
  const [amSubmissions, setAmSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  useEffect(() => {
    async function fetchAmSubmissions() {
      try {
        const data = await atsApi.submissions.list();
        // Assume API returns submissions relevant to AM's portfolio, 
        // or filter locally if needed. 
        setAmSubmissions(Array.isArray(data) ? data : data.data || []);
      } catch (err) {
        console.error("Failed to fetch AM submissions:", err);
      } finally {
        setLoadingSubmissions(false);
      }
    }
    fetchAmSubmissions();
  }, []);

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
  const totalSubmissions = jobs.reduce((sum, j) => sum + (j.submissionDone || 0), 0);
  const avgSubmissions = totalJobs ? (totalSubmissions / totalJobs).toFixed(1) : "0.0";
  const filledJobsCount = jobs.filter(j => j.jobStatus === "Filled" || j.jobStatus === "Closed").length;
  const holdJobsCount = jobs.filter(j => j.jobStatus === "Hold" || j.jobStatus === "On Hold").length;

  return (
    <div className="space-y-6">
      {/* AM Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Jobs Card */}
        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl shadow-inner shrink-0">
              <Icon icon="heroicons:briefcase" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Total Jobs</p>
              <h3 className="text-2xl font-bold text-default-850 mt-1">{canViewJobs ? totalJobs : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Total Submissions Card */}
        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl shadow-inner shrink-0">
              <Icon icon="heroicons:document-text" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Total Submissions</p>
              <h3 className="text-2xl font-bold text-default-850 mt-1">{canViewJobs ? totalSubmissions : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Filled Jobs Card */}
        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shadow-inner shrink-0">
              <Icon icon="heroicons:user-group" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Filled Jobs</p>
              <h3 className="text-2xl font-bold text-default-850 mt-1">{canViewJobs ? filledJobsCount : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Jobs On Hold Card */}
        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shadow-inner shrink-0">
              <Icon icon="heroicons:clock" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Jobs On Hold</p>
              <h3 className="text-2xl font-bold text-default-850 mt-1">{canViewJobs ? holdJobsCount : "N/A"}</h3>
            </div>
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
                        <DashboardJobStatusSelect
                          status={job.jobStatus}
                          onChange={(newStatus) => onUpdateJob(job.id, { jobStatus: newStatus })}
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

      {/* AM Submissions Tracking Table */}
      <Card className="border border-default-150 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <CardHeader className="border-b border-default-100 flex flex-row items-center justify-between bg-emerald-50/30 dark:bg-emerald-900/10">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Icon icon="heroicons:users" className="text-emerald-600" />
              My Portfolio Submissions
            </CardTitle>
            <CardDescription className="text-xs">Track candidate pipeline across your assigned jobs.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingSubmissions ? (
            <div className="p-8 text-center text-xs text-default-400">Loading submissions...</div>
          ) : amSubmissions.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <Icon icon="heroicons:inbox" className="h-10 w-10 text-default-300 mb-3" />
              <p className="text-sm font-semibold text-default-600">No Submissions Yet</p>
              <p className="text-xs text-default-400 max-w-sm mt-1">Candidates submitted by recruiters for your job requisitions will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-default-50 border-b border-default-200">
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Candidate Name</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Job Code</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Submitted By</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Current Status</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Submitted Date</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Final Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100">
                  {amSubmissions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-default-50/70 transition-colors text-xs">
                      <td className="py-3 px-4 font-semibold text-default-900">
                        {sub.candidate?.firstName} {sub.candidate?.lastName}
                        <div className="text-[10px] text-default-450 font-normal mt-0.5">{sub.candidate?.email || "No Email"}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-default-600">{sub.job?.jobCode || "N/A"}</td>
                      <td className="py-3 px-4 font-medium text-default-700">{sub.recruiter?.fullName || "Unknown Recruiter"}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 flex-col items-start">
                          <span className="text-[10px] text-default-500 font-semibold">L1: {sub.l1Status || "Pending"}</span>
                          <span className="text-[10px] text-default-500 font-semibold">L2: {sub.l2Status || "Pending"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-default-500">
                        {new Date(sub.submittedAt || sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`px-2 py-0.5 text-[10px] font-bold ${
                          sub.finalStatus === "OFFER" || sub.finalStatus === "JOIN" 
                            ? "bg-emerald-100 text-emerald-800" 
                            : sub.finalStatus === "REJECTED" 
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {sub.finalStatus || "SUBMITTED"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── RECRUITER DASHBOARD VIEW ────────────────────────────────────────────────
function RecruiterDashboardView({ profile, jobs, activeJobs }: { profile: any; jobs: any[]; activeJobs: any[] }) {
  const canViewJobs = profile?.permissions?.includes("job:view");

  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [selectedJobForCV, setSelectedJobForCV] = useState<any | null>(null);

  useEffect(() => {
    async function loadSubs() {
      try {
        const res = await atsApi.submissions.list();
        const mine = res?.filter((s: any) => s.recruiterId === profile?.id) || [];
        setMySubmissions(mine);
      } catch (err) {
        console.error("Failed to load my submissions", err);
      } finally {
        setLoadingSubs(false);
      }
    }
    loadSubs();
  }, [profile?.id]);

  // Analytics Calculations
  const totalJobs = jobs.length;
  const activeCount = activeJobs.length;
  const selectedCount = mySubmissions.filter((sub) => sub.finalStatus === "OFFER" || sub.finalStatus === "JOIN").length;
  const rejectedCount = mySubmissions.filter((sub) => sub.finalStatus === "REJECTED").length;
  const holdCount = jobs.filter((job) => job.jobStatus === "Hold" || job.jobStatus === "On Hold").length;

  return (
    <div className="space-y-6">
      {/* 1. Stat Cards (Enfysync Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-default-500">Assigned Jobs</p>
                <h3 className="text-3xl font-bold text-default-900 mt-2">{totalJobs}</h3>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center text-2xl">
                <Icon icon="heroicons:briefcase" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <Icon icon="heroicons:arrow-trending-up" className="h-4 w-4" />
                +{activeCount}
              </span>
              <span className="text-default-400 ml-2">Currently active roles</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-default-500">Candidate Submissions</p>
                <h3 className="text-3xl font-bold text-default-900 mt-2">{mySubmissions.length}</h3>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-600/10 text-purple-600 flex items-center justify-center text-2xl">
                <Icon icon="heroicons:document-text" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <Icon icon="heroicons:arrow-trending-up" className="h-4 w-4" />
                {totalJobs ? (mySubmissions.length / totalJobs).toFixed(1) : "0"}/job
              </span>
              <span className="text-default-400 ml-2">Submission throughput</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-default-500">Selected Candidates</p>
                <h3 className="text-3xl font-bold text-default-900 mt-2">{selectedCount}</h3>
              </div>
              <div className="h-12 w-12 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center text-2xl">
                <Icon icon="heroicons:users" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <Icon icon="heroicons:arrow-trending-up" className="h-4 w-4" />
                -{rejectedCount}
              </span>
              <span className="text-default-400 ml-2">Conversion to final select</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-default-500">Jobs On Hold</p>
                <h3 className="text-3xl font-bold text-default-900 mt-2">{holdCount}</h3>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-600/10 text-amber-600 flex items-center justify-center text-2xl">
                <Icon icon="heroicons:clock" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-amber-500 font-bold flex items-center gap-1">
                <Icon icon="heroicons:exclamation-circle" className="h-4 w-4" />
                Needs Action
              </span>
              <span className="text-default-400 ml-2">Need follow-up action</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Workspace Split Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left pane: My Assigned Jobs */}
        <div className="xl:col-span-8">
          <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl h-full overflow-hidden">
            <CardHeader className="border-b border-default-100 pb-4 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
              <div>
                <CardTitle className="text-base font-bold text-default-900 flex items-center gap-2">
                  <Icon icon="heroicons:magnifying-glass" className="text-indigo-600" />
                  My Assigned Jobs
                </CardTitle>
                <CardDescription className="text-xs mt-1">Select a job order to submit candidates.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {activeJobs.length === 0 ? (
                <div className="p-12 text-center text-sm text-default-400">No jobs to source for at the moment.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-default-50 border-b border-default-200">
                        <th className="py-4 px-5 text-xs font-bold text-default-700 uppercase tracking-wider">Code / Job Title</th>
                        <th className="py-4 px-5 text-xs font-bold text-default-700 uppercase tracking-wider">Client</th>
                        <th className="py-4 px-5 text-xs font-bold text-default-700 uppercase tracking-wider">Primary Skills</th>
                        <th className="py-4 px-5 text-xs font-bold text-default-700 uppercase tracking-wider">Pay Rate</th>
                        <th className="py-4 px-5 text-xs font-bold text-default-700 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-100">
                      {activeJobs.slice(0, 10).map((job) => (
                        <tr key={job.id} className="hover:bg-default-50/70 transition-colors text-sm group">
                          <td className="py-4 px-5">
                            <div className="font-bold text-default-900">{job.jobTitle}</div>
                            <div className="text-xs text-default-500 font-mono mt-0.5">{job.jobCode}</div>
                          </td>
                          <td className="py-4 px-5 text-default-700 font-medium">{job.client || "N/A"}</td>
                          <td className="py-4 px-5">
                            <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                              {job.skillsRequired?.slice(0, 3).map((skill: string, index: number) => (
                                <Badge key={index} className="bg-default-100 text-default-700 border-default-200 font-semibold px-2 py-0.5 text-[10px] uppercase tracking-wider">
                                  {skill}
                                </Badge>
                              )) || <span className="text-xs text-default-400">Not specified</span>}
                            </div>
                          </td>
                          <td className="py-4 px-5 font-bold text-default-855">
                            {(() => {
                              const rate = job.payRate;
                              if (!rate || rate === "N/A") return "N/A";
                              if (/[a-zA-Z$₹]/.test(rate)) return rate;
                              return (job.market || "US") === "IN" ? `INR - ${rate} LPA` : `USD - $${rate}/hr`;
                            })()}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 font-bold transition-all shadow-sm"
                              onClick={() => setSelectedJobForCV(job)}
                            >
                              <Icon icon="heroicons:plus-circle" className="mr-1.5 h-4 w-4" />
                              Source / Add CV
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right pane: My Submissions Tracker */}
        <div className="xl:col-span-4">
          <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl h-full">
            <CardHeader className="border-b border-default-100 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-default-900 flex items-center gap-2">
                <Icon icon="heroicons:document-check" className="text-emerald-500" />
                My Submissions Tracker
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingSubs ? (
                <div className="p-6 text-center text-sm text-default-400">Loading tracker...</div>
              ) : mySubmissions.length === 0 ? (
                <div className="p-8 text-center text-sm text-default-400">No submissions yet. Start sourcing!</div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-default-100">
                      {mySubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-default-50/50 transition-colors text-xs">
                          <td className="py-3 px-4 font-semibold text-default-900">
                            {sub.candidate?.firstName} {sub.candidate?.lastName}
                            <div className="text-[10px] text-default-500 font-mono mt-0.5">{sub.job?.jobCode}</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge className={`px-2 py-0.5 text-[9px] font-bold ${
                              sub.finalStatus === "PENDING_APPROVAL" ? "bg-amber-100 text-amber-800" :
                              sub.finalStatus === "SUBMITTED" ? "bg-blue-100 text-blue-800" :
                              sub.finalStatus === "REJECTED" ? "bg-red-100 text-red-800" :
                              "bg-emerald-100 text-emerald-800"
                            }`}>
                              {sub.finalStatus?.replace("_", " ") || "SUBMITTED"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add CV Modal */}
      <AddCandidateModal 
        isOpen={!!selectedJobForCV} 
        onClose={() => setSelectedJobForCV(null)} 
        job={selectedJobForCV} 
      />
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
