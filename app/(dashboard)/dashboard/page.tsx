"use client";

import React, { useEffect, useState, useMemo } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { atsApi } from "@/lib/ats-api";
import { CustomRoleDefinition } from "@/lib/role-permissions";
import { getDashboardRoleSelection } from "@/lib/dashboard-role";
import { getSavedDashboardRole } from "@/lib/dashboard-preference";
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

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideRole, setOverrideRole] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<CustomRoleDefinition[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    atsApi.auth.listRoles(undefined, true).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setAvailableRoles(data);
      }
    }).catch(() => {}).finally(() => setRolesLoaded(true));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const override = getSavedDashboardRole(profile);
      setOverrideRole(override);
      const handleStorage = () => {
        setOverrideRole(getSavedDashboardRole(profile));
      };
      window.addEventListener("storage", handleStorage);
      window.addEventListener("overrideRoleChanged", handleStorage);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("overrideRoleChanged", handleStorage);
      };
    }
  }, [profile]);

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
      if (updatedFields.assignedTo !== undefined) apiPayload.assignedTo = updatedFields.assignedTo;
      if (updatedFields.podId !== undefined) apiPayload.podId = updatedFields.podId;
      if (updatedFields.primaryRecruiterId !== undefined) apiPayload.primaryRecruiterId = updatedFields.primaryRecruiterId;

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



  if (loading || !rolesLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-sm text-default-500">Loading workspace dashboard...</p>
      </div>
    );
  }

  const { active, systemRole } = getDashboardRoleSelection(profile, availableRoles, overrideRole);
  const roleName = active.name;
  const isAlias = roleName.toUpperCase().trim() !== systemRole;

  // Metric calculation helpers
  const activeJobs = jobs.filter(j => j.jobStatus === "Active");
  const highPriorityJobs = activeJobs.filter(j => j.priority === "Hot" || j.priority === "High" || j.priority === "Urgent");



  return (
    <div className="space-y-6">
      <SiteBreadcrumb />

      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome back, {profile?.fullName || "Staff Member"}!
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800">
              <Icon icon="heroicons:sparkles" className="h-3 w-3" />
              {profile?.tenantDomain || "Workspace"}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {roleName === systemRole 
              ? `Monitor active jobs, review candidates, and track team progress.`
              : `Viewing dashboard as ${roleName}.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link href="/job-posting/new">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-xs h-9 px-3.5 cursor-pointer">
              <Icon icon="heroicons:plus-circle" className="h-4 w-4" />
              + Post New Job
            </Button>
          </Link>
          <Link href="/applicants">
            <Button size="sm" variant="outline" className="text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold gap-1.5 h-9 px-3.5 cursor-pointer">
              <Icon icon="heroicons:magnifying-glass" className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Search Candidates
            </Button>
          </Link>
        </div>
      </div>


      {/* Render Dashboard Widgets based on resolved systemRole */}
      {systemRole === "SUPER_ADMIN" ? (
        <GlobalAdminDashboardView profile={profile} />
      ) : systemRole === "BRANCH_ADMIN" ? (
        <BranchAdminDashboardView 
          profile={profile} 
          jobs={jobs} 
          activeJobs={activeJobs} 
          onUpdateJob={handleUpdateJob} 
        />
      ) : systemRole === "ADMIN" || systemRole === "TENANT_ADMIN" ? (
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
      ) : systemRole === "DELIVERY_HEAD" ? (
        <DeliveryHeadDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} />
      ) : (
        <RecruiterDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} />
      )}
    </div>
  );
}

// ─── GLOBAL ADMIN DASHBOARD VIEW (SUPER_ADMIN COMMAND CENTER) ────────────────
function GlobalAdminDashboardView({ profile }: { profile: any }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTenant, setSearchTenant] = useState("");

  // Tenant Details Modal state
  const [selectedTenantDetail, setSelectedTenantDetail] = useState<any | null>(null);
  const [loadingTenantDetail, setLoadingTenantDetail] = useState(false);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);

  const handleOpenTenantDetails = (tenantId: string) => {
    if (typeof window !== "undefined") {
      window.location.href = `/utility/approvals?tab=tenants`;
    }
  };
  // Approval state overrides
  const [selectedMarket, setSelectedMarket] = useState<Record<string, string>>({});
  const [selectedSubdomain, setSelectedSubdomain] = useState<Record<string, string>>({});
  const [selectedLimit, setSelectedLimit] = useState<Record<string, number>>({});
  const [submittingUser, setSubmittingUser] = useState<string | null>(null);

  useEffect(() => {
    loadGlobalData();
  }, []);

  async function loadGlobalData() {
    setLoading(true);
    try {
      const [tenantsData, pendingData, logsData] = await Promise.all([
        atsApi.auth.listTenants().catch(() => []),
        atsApi.auth.listPendingApprovals().catch(() => []),
        atsApi.auditLogs.list(5).catch(() => []),
      ]);
      setTenants(tenantsData);
      setPendingApprovals(pendingData);
      setAuditLogs(logsData);
    } catch (err) {
      console.error("Failed to load global admin data:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleApproveUser = async (user: any) => {
    setSubmittingUser(user.id);
    const market = selectedMarket[user.id] || user.defaultMarket || "US";
    const subdomain = selectedSubdomain[user.id] || user.tenantSubdomain || "";
    const userLimit = selectedLimit[user.id] || 5;

    try {
      await atsApi.auth.approveUser(user.id, market, subdomain, userLimit);
      toast.success(`Approved ${user.fullName} and activated company workspace!`);
      await loadGlobalData();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve workspace");
    } finally {
      setSubmittingUser(null);
    }
  };

  const handleToggleTenantStatus = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await atsApi.auth.updateTenantStatus(tenantId, newStatus);
      toast.success(`Tenant status updated to ${newStatus}`);
      await loadGlobalData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update tenant status");
    }
  };

  const activeTenants = tenants.filter((t) => t.status === "ACTIVE");
  const pendingTenants = tenants.filter((t) => t.status === "PENDING");
  const totalUsersEst = tenants.reduce((acc, t) => acc + (t.user_count || 1), 0);

  const filteredTenantsList = tenants.filter(
    (t) =>
      !searchTenant ||
      t.name?.toLowerCase().includes(searchTenant.toLowerCase()) ||
      t.domain?.toLowerCase().includes(searchTenant.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] border border-default-150 bg-white dark:bg-slate-900 rounded-2xl p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="mt-3 text-xs text-default-500 font-semibold">Initializing Platform Command Center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Platform Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl shadow-inner border border-indigo-100 dark:border-indigo-900/50">
              <Icon icon="heroicons:building-office-2" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Company Tenants</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl font-bold text-default-850">{tenants.length}</h3>
                <span className="text-[11px] font-bold text-emerald-600">({activeTenants.length} Active)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shadow-inner border border-amber-100 dark:border-amber-900/50">
              <Icon icon="heroicons:clock" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Pending Approvals</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl font-bold text-amber-600">{pendingApprovals.length}</h3>
                <span className="text-[11px] text-default-400 font-medium">Workspaces</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shadow-inner border border-emerald-100 dark:border-emerald-900/50">
              <Icon icon="heroicons:cpu-chip" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">AI Resume Parser</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-sm font-bold text-emerald-600">FastAPI Online</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl shadow-inner border border-blue-100 dark:border-blue-900/50">
              <Icon icon="heroicons:shield-check" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Security Audits</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl font-bold text-default-850">{auditLogs.length}</h3>
                <span className="text-[11px] text-default-400 font-medium">Logged</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Command Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/utility/approvals">
          <div className="p-3.5 rounded-xl border border-default-150 bg-white dark:bg-slate-900 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all flex items-center gap-3 shadow-sm group">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
              <Icon icon="heroicons:building-office" />
            </div>
            <div>
              <p className="text-xs font-bold text-default-850 group-hover:text-indigo-600">Tenant Management</p>
              <p className="text-[10px] text-default-400">Approvals & Limits</p>
            </div>
          </div>
        </Link>

        <Link href="/utility/audit-logs">
          <div className="p-3.5 rounded-xl border border-default-150 bg-white dark:bg-slate-900 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all flex items-center gap-3 shadow-sm group">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
              <Icon icon="heroicons:shield-check" />
            </div>
            <div>
              <p className="text-xs font-bold text-default-850 group-hover:text-emerald-600">Audit Logs</p>
              <p className="text-[10px] text-default-400">Cross-tenant trail</p>
            </div>
          </div>
        </Link>

        <Link href="/utility/dictionaries">
          <div className="p-3.5 rounded-xl border border-default-150 bg-white dark:bg-slate-900 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all flex items-center gap-3 shadow-sm group">
            <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
              <Icon icon="heroicons:cpu-chip" />
            </div>
            <div>
              <p className="text-xs font-bold text-default-850 group-hover:text-amber-600">AI Dictionaries</p>
              <p className="text-[10px] text-default-400">Skill normalization</p>
            </div>
          </div>
        </Link>

        <Link href="/utility/roles-permissions">
          <div className="p-3.5 rounded-xl border border-default-150 bg-white dark:bg-slate-900 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all flex items-center gap-3 shadow-sm group">
            <div className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
              <Icon icon="heroicons:lock-closed" />
            </div>
            <div>
              <p className="text-xs font-bold text-default-850 group-hover:text-rose-600">Global RBAC</p>
              <p className="text-[10px] text-default-400">Roles & permissions</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Pending Tenant Workspace Approvals */}
      <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-default-100 bg-amber-50/30 dark:bg-amber-950/10 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-default-900">
              <Icon icon="heroicons:clock" className="text-amber-500" />
              Pending Workspace Approvals ({pendingApprovals.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Review self-registered SaaS company tenants awaiting platform authorization.
            </CardDescription>
          </div>

          <Link href="/utility/approvals">
            <Button variant="outline" size="sm" className="text-xs h-8">
              Full Approvals Panel
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center text-xs text-default-400">
              <Icon icon="heroicons:check-circle" className="h-8 w-8 mx-auto text-emerald-500 mb-1" />
              No pending tenant approvals. All registered company workspaces are active!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-default-50 border-b border-default-100 text-xs font-semibold text-default-700">
                    <th className="py-3 px-4">Company / User</th>
                    <th className="py-3 px-4">Subdomain</th>
                    <th className="py-3 px-4">Market Mode</th>
                    <th className="py-3 px-4">User Limit</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100 text-xs">
                  {pendingApprovals.map((u) => (
                    <tr key={u.id} className="hover:bg-default-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-default-900">{u.tenantName || u.fullName}</div>
                        <div className="text-[11px] text-default-500">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-indigo-600">
                        {u.tenantSubdomain ? `${u.tenantSubdomain}.enfycon.com` : "Auto"}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={selectedMarket[u.id] || u.defaultMarket || "US"}
                          onChange={(e) =>
                            setSelectedMarket({ ...selectedMarket, [u.id]: e.target.value })
                          }
                          className="h-7 text-xs rounded border border-default-200 bg-white dark:bg-slate-800 px-2 text-default-700 outline-none"
                        >
                          <option value="US">🇺🇸 US IT Staffing</option>
                          <option value="IN">🇮🇳 India IT Staffing</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={selectedLimit[u.id] || 5}
                          onChange={(e) =>
                            setSelectedLimit({ ...selectedLimit, [u.id]: parseInt(e.target.value, 10) || 5 })
                          }
                          className="h-7 w-16 text-xs text-center rounded border border-default-200 bg-white dark:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          disabled={submittingUser === u.id}
                          onClick={() => handleApproveUser(u)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3 rounded font-semibold"
                        >
                          {submittingUser === u.id ? "Approving..." : "Approve Workspace"}
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

      {/* Active Company Workspaces & Audit Logs split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Tenants Directory */}
        <div className="lg:col-span-8">
          <Card className="border border-default-150 bg-white dark:bg-slate-900 h-full shadow-sm">
            <CardHeader className="border-b border-default-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Icon icon="heroicons:building-office-2" className="text-indigo-600" />
                  Active Company Workspaces ({filteredTenantsList.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Overview of all onboarded SaaS companies and license allocation.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Search tenant..."
                  value={searchTenant}
                  onChange={(e) => setSearchTenant(e.target.value)}
                  className="h-8 text-xs w-full sm:w-44"
                />
                <Link href="/utility/approvals?tab=tenants">
                  <Button variant="outline" size="sm" className="text-xs h-8 whitespace-nowrap font-bold">
                    Full Tenant Page →
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredTenantsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-default-400">No company tenants found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-default-50 border-b border-default-100 text-xs font-semibold text-default-700">
                        <th className="py-2.5 px-4">Company Name</th>
                        <th className="py-2.5 px-4">Domain / Subdomain</th>
                        <th className="py-2.5 px-4">Market</th>
                        <th className="py-2.5 px-4">Seats Limit</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-100 text-xs">
                      {filteredTenantsList.slice(0, 10).map((t) => (
                        <tr
                          key={t.id}
                          onClick={() => handleOpenTenantDetails(t.id)}
                          className="hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                        >
                          <td className="py-2.5 px-4 font-bold text-default-900 group-hover:text-indigo-600 flex items-center gap-1.5">
                            {t.name}
                            <Icon icon="heroicons:arrow-top-right-on-square" className="h-3 w-3 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </td>
                          <td className="py-2.5 px-4 font-mono text-indigo-600">{t.domain || "N/A"}</td>
                          <td className="py-2.5 px-4 font-semibold">
                            {t.default_market === "IN" ? "🇮🇳 India" : "🇺🇸 US IT"}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-default-700">
                            {t.user_limit || 5} Seats
                          </td>
                          <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleToggleTenantStatus(t.id, t.status)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                t.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                              }`}
                            >
                              {t.status}
                            </button>
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

        {/* Live Security Audit Logs Preview */}
        <div className="lg:col-span-4">
          <Card className="border border-default-150 bg-white dark:bg-slate-900 h-full shadow-sm flex flex-col justify-between">
            <CardHeader className="border-b border-default-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Icon icon="heroicons:shield-check" className="text-emerald-600" />
                  Live Security Trail
                </CardTitle>
                <CardDescription className="text-xs">Latest cross-tenant administrative logs.</CardDescription>
              </div>
              <Link href="/utility/audit-logs">
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-indigo-600">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[350px]">
              {auditLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-default-400 text-xs py-8">
                  No recent audit events captured.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-lg border border-default-100 bg-default-50/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[9px] uppercase font-mono">
                        {log.action}
                      </Badge>
                      <span className="text-[10px] text-default-400 font-mono">
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString() : ""}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-default-800 truncate">{log.actor_email || "System User"}</p>
                    <p className="text-[11px] text-default-500 truncate">{log.details}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* TENANT DETAILS & USER ROSTER MODAL */}
      <Dialog open={isTenantModalOpen} onOpenChange={setIsTenantModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-default-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Icon icon="heroicons:building-office-2" className="text-indigo-600" />
              Tenant Workspace Details & Users
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review user accounts, assigned roles, and usage metrics for this company.
            </DialogDescription>
          </DialogHeader>

          {loadingTenantDetail ? (
            <div className="p-12 text-center text-xs text-default-400 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
              Loading tenant users...
            </div>
          ) : selectedTenantDetail ? (
            <div className="space-y-5 py-2">
              {/* Tenant Header Info */}
              <div className="p-4 bg-default-50 dark:bg-slate-800/60 rounded-xl border border-default-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-default-900">{selectedTenantDetail.tenant?.name}</h3>
                    <Badge variant={selectedTenantDetail.tenant?.status === "ACTIVE" ? "success" : "destructive"} className="text-[10px]">
                      {selectedTenantDetail.tenant?.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-default-500 font-mono mt-0.5">
                    Subdomain: <strong className="text-indigo-600">{selectedTenantDetail.tenant?.domain}.localhost:3000</strong> | Market: <strong>{selectedTenantDetail.tenant?.defaultMarket === "IN" ? "🇮🇳 India IT" : "🇺🇸 US IT Staffing"}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`http://${selectedTenantDetail.tenant?.domain}.localhost:3000/dashboard`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" variant="outline" className="text-xs gap-1.5">
                      <Icon icon="heroicons:arrow-top-right-on-square" className="h-3.5 w-3.5" />
                      Visit Tenant Workspace
                    </Button>
                  </a>
                </div>
              </div>

              {/* Usage Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="p-3 bg-white dark:bg-slate-900 border border-default-200 rounded-lg">
                  <span className="text-[10px] text-default-400 uppercase font-bold block mb-1">User License Usage</span>
                  <span className="text-sm font-extrabold text-indigo-600">
                    {selectedTenantDetail.users?.length || 0} / {selectedTenantDetail.tenant?.userLimit || 5} Seats
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-default-200 rounded-lg">
                  <span className="text-[10px] text-default-400 uppercase font-bold block mb-1">Active Job Requisitions</span>
                  <span className="text-sm font-extrabold text-emerald-600">
                    {selectedTenantDetail.stats?.totalJobs || 0} Jobs
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-default-200 rounded-lg">
                  <span className="text-[10px] text-default-400 uppercase font-bold block mb-1">Candidate Profiles</span>
                  <span className="text-sm font-extrabold text-blue-600">
                    {selectedTenantDetail.stats?.totalCandidates || 0} CVs
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-default-200 rounded-lg">
                  <span className="text-[10px] text-default-400 uppercase font-bold block mb-1">Submissions Done</span>
                  <span className="text-sm font-extrabold text-amber-600">
                    {selectedTenantDetail.stats?.totalSubmissions || 0} Submissions
                  </span>
                </div>
              </div>

              {/* Users Roster Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-default-900 flex items-center gap-1.5">
                  <Icon icon="heroicons:users" className="text-indigo-600" />
                  Users ({selectedTenantDetail.users?.length || 0})
                </h4>

                <div className="border border-default-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-default-50 border-b border-default-200 text-default-700 font-semibold">
                        <th className="py-2.5 px-3">Full Name</th>
                        <th className="py-2.5 px-3">Email Address</th>
                        <th className="py-2.5 px-3">Assigned Role</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Date Added</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-100">
                      {selectedTenantDetail.users?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-default-400">
                            No users registered under this tenant.
                          </td>
                        </tr>
                      ) : (
                        selectedTenantDetail.users?.map((u: any) => (
                          <tr key={u.id} className="hover:bg-default-50/50">
                            <td className="py-2.5 px-3 font-bold text-default-900">{u.fullName || "User"}</td>
                            <td className="py-2.5 px-3 font-mono text-indigo-600">{u.email}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                {u.systemRole || u.roleName || (u.roles && u.roles[0]) || "STAFF"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                              }`}>
                                {u.isActive ? "ACTIVE" : "INACTIVE"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-default-400 font-mono text-[10px]">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-default-400">No details available.</div>
          )}

          <DialogFooter className="pt-2">
            <Button size="sm" variant="outline" onClick={() => setIsTenantModalOpen(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── BRANCH ADMIN DASHBOARD VIEW (BRANCH OPERATIONAL COMMAND CENTER) ────────
function BranchAdminDashboardView({
  profile,
  jobs,
  activeJobs,
  onUpdateJob,
}: {
  profile: any;
  jobs: any[];
  activeJobs: any[];
  onUpdateJob?: (jobId: string, updatedFields: any) => Promise<void>;
}) {
  const [localJobs, setLocalJobs] = useState<any[]>(jobs);

  useEffect(() => {
    setLocalJobs(jobs);
  }, [jobs]);

  const [activeBranchId, setActiveBranchId] = useState<string | null>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("active_branch_id");
    return profile?.branchId || null;
  });
  const [activeBranchName, setActiveBranchName] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("active_branch_name") || profile?.branchName || "Bhubaneswar (Domestic IT)";
    return profile?.branchName || "Bhubaneswar (Domestic IT)";
  });
  const [activeBranchTimezone, setActiveBranchTimezone] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("active_branch_timezone") || "Asia/Kolkata";
    return "Asia/Kolkata";
  });
  const [activeBranchMarket, setActiveBranchMarket] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("active_branch_market") || (profile?.defaultMarket === "US" ? "US IT" : "India IT");
    return profile?.defaultMarket === "US" ? "US IT" : "India IT";
  });

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [branchUsers, setBranchUsers] = useState<any[]>([]);
  const [pods, setPods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign Team Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedJobForAssign, setSelectedJobForAssign] = useState<any | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignTab, setAssignTab] = useState<"pods" | "users">("pods");
  const [assigning, setAssigning] = useState(false);

  const [branchUsesPods, setBranchUsesPods] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("active_branch_allow_pods");
      if (stored !== null) return stored === "true";
    }
    return true;
  });

  // Synchronize on branch switcher events
  useEffect(() => {
    const handleBranchChange = () => {
      if (typeof window !== "undefined") {
        setActiveBranchId(localStorage.getItem("active_branch_id"));
        setActiveBranchName(localStorage.getItem("active_branch_name") || profile?.branchName || "Branch Office");
        setActiveBranchTimezone(localStorage.getItem("active_branch_timezone") || "Asia/Kolkata");
        setActiveBranchMarket(localStorage.getItem("active_branch_market") || (profile?.defaultMarket === "US" ? "US IT" : "India IT"));
      }
    };
    window.addEventListener("branchChanged", handleBranchChange);
    window.addEventListener("storage", handleBranchChange);
    return () => {
      window.removeEventListener("branchChanged", handleBranchChange);
      window.removeEventListener("storage", handleBranchChange);
    };
  }, [profile]);

  // Load branch submissions, team roster, and recruitment pods
  useEffect(() => {
    let isMounted = true;
    async function loadBranchData() {
      try {
        setLoading(true);
        const bId = activeBranchId && activeBranchId !== "all" ? activeBranchId : undefined;
        const [subsRes, usersRes, podsRes] = await Promise.all([
          atsApi.submissions.list({ branchId: bId }).catch(() => []),
          atsApi.auth.listUsers().catch(() => []),
          atsApi.pods.list(bId).catch(() => []),
        ]);
        if (!isMounted) return;
        const subList = subsRes?.data || subsRes || [];
        setSubmissions(subList);
        setBranchUsers(usersRes || []);

        let resolvedPods = podsRes || [];
        if (resolvedPods.length === 0 && bId) {
          resolvedPods = await atsApi.pods.list().catch(() => []);
        }
        setPods(resolvedPods);
      } catch (err) {
        console.warn("Failed to load branch admin dashboard metrics:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadBranchData();
    return () => { isMounted = false; };
  }, [activeBranchId]);

  // Branch-scoped jobs filtering
  const branchJobs = useMemo(() => {
    if (!activeBranchId || activeBranchId === "all") return localJobs;
    return localJobs.filter((j: any) => {
      const jBranchId = j.branchId || j.branch_id;
      if (jBranchId && jBranchId === activeBranchId) return true;
      if (activeBranchName && j.businessUnit?.toLowerCase() === activeBranchName.toLowerCase()) return true;
      if (j.jobCode && activeBranchName && activeBranchName.toLowerCase().includes("bhubneswar") && j.jobCode.startsWith("BBS")) return true;
      return false;
    });
  }, [localJobs, activeBranchId, activeBranchName]);

  const branchActiveJobs = useMemo(() => {
    return branchJobs.filter((j: any) => j.jobStatus === "Active" || j.status === "ACTIVE" || j.status === "Active");
  }, [branchJobs]);

  const hotJobs = useMemo(() => {
    return branchActiveJobs.filter((j: any) => {
      const p = String(j.priority || j.urgency || "").toUpperCase();
      return p.includes("HOT") || p.includes("HIGH") || p.includes("URGENT");
    });
  }, [branchActiveJobs]);

  const warmJobs = useMemo(() => {
    return branchActiveJobs.filter((j: any) => {
      const p = String(j.priority || j.urgency || "").toUpperCase();
      return p.includes("WARM") || p.includes("MEDIUM") || (!p.includes("HOT") && !p.includes("COLD") && !p.includes("LOW") && !p.includes("HIGH") && !p.includes("URGENT"));
    });
  }, [branchActiveJobs]);

  const coldJobs = useMemo(() => {
    return branchActiveJobs.filter((j: any) => {
      const p = String(j.priority || j.urgency || "").toUpperCase();
      return p.includes("COLD") || p.includes("LOW");
    });
  }, [branchActiveJobs]);

  const totalPositions = useMemo(() => {
    return branchActiveJobs.reduce((acc: number, j: any) => acc + Number(j.noOfPositions || j.positions || 1), 0);
  }, [branchActiveJobs]);

  // Pipeline metrics
  const pendingScreenings = useMemo(() => {
    return submissions.filter((s: any) => s.finalStatus === "PENDING_APPROVAL" || s.internalReviewStatus === "PENDING");
  }, [submissions]);

  const activeInterviews = useMemo(() => {
    return submissions.filter((s: any) => {
      const final = (s.finalStatus || "").toUpperCase();
      if (final === "REJECTED" || final === "OFFER" || final === "OFFERED" || final === "JOIN" || final === "JOINED" || final === "PLACED") {
        return false;
      }
      const l1 = (s.l1Status || "").toUpperCase();
      const l2 = (s.l2Status || "").toUpperCase();
      const l3 = (s.l3Status || "").toUpperCase();

      return (
        ["SCHEDULED", "PASSED", "CLEARED", "COMPLETED"].includes(l1) ||
        ["SCHEDULED", "PASSED", "CLEARED", "COMPLETED"].includes(l2) ||
        ["SCHEDULED", "PASSED", "CLEARED", "COMPLETED"].includes(l3) ||
        ["L1", "L2", "L3", "INTERVIEW", "INTERVIEWING"].includes(final) ||
        final.includes("PASSED") ||
        Boolean(s.l1Date || s.l2Date || s.l3Date)
      );
    });
  }, [submissions]);

  const l1Count = useMemo(() => {
    return submissions.filter((s: any) => {
      const l1 = (s.l1Status || "").toUpperCase();
      const final = (s.finalStatus || "").toUpperCase();
      return ["SCHEDULED", "PASSED", "CLEARED", "COMPLETED"].includes(l1) || final === "L1" || Boolean(s.l1Date);
    }).length;
  }, [submissions]);

  const l2Count = useMemo(() => {
    return submissions.filter((s: any) => {
      const l2 = (s.l2Status || "").toUpperCase();
      const final = (s.finalStatus || "").toUpperCase();
      return ["SCHEDULED", "PASSED", "CLEARED", "COMPLETED"].includes(l2) || final === "L2" || Boolean(s.l2Date);
    }).length;
  }, [submissions]);

  const l3Count = useMemo(() => {
    return submissions.filter((s: any) => {
      const l3 = (s.l3Status || "").toUpperCase();
      const final = (s.finalStatus || "").toUpperCase();
      return ["SCHEDULED", "PASSED", "CLEARED", "COMPLETED"].includes(l3) || final === "L3" || Boolean(s.l3Date);
    }).length;
  }, [submissions]);

  const offersCount = useMemo(() => {
    return submissions.filter((s: any) => {
      const f = (s.finalStatus || "").toUpperCase();
      return f === "OFFER" || f === "OFFERED";
    }).length;
  }, [submissions]);

  const joinsCount = useMemo(() => {
    return submissions.filter((s: any) => {
      const f = (s.finalStatus || "").toUpperCase();
      return f === "JOIN" || f === "JOINED" || f === "PLACED";
    }).length;
  }, [submissions]);

  // Aging jobs (>48 hours open with 0 or <2 submissions)
  const agingJobs = useMemo(() => {
    return branchActiveJobs.filter((j: any) => {
      const createdTime = new Date(j.createdAt || j.created_at || Date.now()).getTime();
      const hoursOld = (Date.now() - createdTime) / (1000 * 60 * 60);
      const subCount = submissions.filter((s: any) => s.jobId === j.id || s.job_id === j.id || s.jobCode === j.jobCode).length;
      return hoursOld >= 48 && subCount < 2;
    });
  }, [branchActiveJobs, submissions]);

  // Branch recruiters output
  const branchRecruiters = useMemo(() => {
    const list = branchUsers.filter((u: any) => {
      if (!u.isActive) return false;
      if (!activeBranchId || activeBranchId === "all") return true;
      const bId = u.branchId || u.branch_id;
      if (bId === activeBranchId) return true;
      if (Array.isArray(u.assignedBranchIds) && u.assignedBranchIds.includes(activeBranchId)) return true;
      return false;
    });

    return list.map((user: any) => {
      const userSubs = submissions.filter((s: any) =>
        s.recruiterId === user.id ||
        s.recruiter_id === user.id ||
        (user.email && s.candidateEmail?.toLowerCase() === user.email.toLowerCase()) ||
        (user.fullName && s.recruiterName?.toLowerCase() === user.fullName.toLowerCase())
      );
      const userInterviews = userSubs.filter((s: any) =>
        s.l1Status === "SCHEDULED" || s.l2Status === "SCHEDULED" || s.l3Status === "SCHEDULED"
      );
      const userJoins = userSubs.filter((s: any) => s.finalStatus === "JOIN" || s.finalStatus === "OFFER");

      return {
        user,
        submissionsCount: userSubs.length,
        interviewsCount: userInterviews.length,
        joinsCount: userJoins.length,
      };
    }).sort((a, b) => b.submissionsCount - a.submissionsCount);
  }, [branchUsers, submissions, activeBranchId]);

  // Recruiter roster for assignments
  const branchRecruiterUsers = useMemo(() => {
    const scoped = branchUsers.filter((u: any) => {
      if (u.isActive === false) return false;
      if (!activeBranchId || activeBranchId === "all") return true;
      const bId = u.branchId || u.branch_id;
      if (bId === activeBranchId) return true;
      if (Array.isArray(u.assignedBranchIds) && u.assignedBranchIds.includes(activeBranchId)) return true;
      return false;
    });
    return scoped.length > 0 ? scoped : branchUsers.filter((u: any) => u.isActive !== false);
  }, [branchUsers, activeBranchId]);

  const filteredUsers = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return branchRecruiterUsers;
    return branchRecruiterUsers.filter((u: any) => {
      const name = (u.fullName || u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = (u.roleName || (u.roles && u.roles[0]) || u.systemRole || "").toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [branchRecruiterUsers, assignSearch]);

  const filteredPods = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return pods;
    return pods.filter((p: any) => {
      const name = (p.name || "").toLowerCase();
      const head = (p.podHeadName || "").toLowerCase();
      return name.includes(q) || head.includes(q);
    });
  }, [pods, assignSearch]);

  const handleOpenAssignModal = (job: any) => {
    setSelectedJobForAssign(job);
    setAssignSearch("");
    setAssignTab(pods.length > 0 && branchUsesPods ? "pods" : "users");
    setIsAssignModalOpen(true);
  };

  const handleExecuteAssignment = async (
    type: "pod" | "user" | "unassign",
    targetId: string,
    targetName: string
  ) => {
    if (!selectedJobForAssign) return;
    setAssigning(true);
    try {
      const payload: Record<string, any> = {};
      if (type === "pod") {
        payload.podId = targetId;
        payload.assignedTo = targetName;
      } else if (type === "user") {
        payload.primaryRecruiterId = targetId;
        payload.assignedTo = targetName;
        payload.podId = "none";
      } else {
        payload.assignedTo = "Unassigned";
        payload.podId = "none";
      }

      await atsApi.jobs.update(selectedJobForAssign.id, payload);
      toast.success(`Job assigned to ${targetName}`);

      setLocalJobs((prev) =>
        prev.map((j) =>
          j.id === selectedJobForAssign.id
            ? {
                ...j,
                assignedTo: targetName,
                podId: type === "pod" ? targetId : undefined,
                primaryRecruiterId: type === "user" ? targetId : undefined,
              }
            : j
        )
      );

      if (onUpdateJob) {
        onUpdateJob(selectedJobForAssign.id, payload).catch(() => {});
      }

      setIsAssignModalOpen(false);
      setSelectedJobForAssign(null);
    } catch (err: any) {
      console.error("Assignment error:", err);
      toast.error("Failed to assign job: " + (err.message || "Unknown error"));
    } finally {
      setAssigning(false);
    }
  };

  // Visual Analytics Chart Data
  const activityChartOptions: any = {
    chart: { type: "area", toolbar: { show: false }, zoom: { enabled: false }, fontFamily: "inherit" },
    colors: ["#6366f1", "#10b981", "#06b6d4"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], tooltip: { enabled: false } },
    yaxis: { labels: { formatter: (val: number) => Math.floor(val) } },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 90, 100] } },
    legend: { position: "top", horizontalAlign: "right" },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 }
  };
  const activityChartSeries = [
    { name: "Submissions", data: [Math.max(1, Math.round(submissions.length * 0.15)), Math.max(2, Math.round(submissions.length * 0.25)), Math.max(3, Math.round(submissions.length * 0.4)), Math.max(4, submissions.length), Math.max(2, Math.round(submissions.length * 0.6)), 2, 4] },
    { name: "Open Jobs", data: [branchActiveJobs.length || 1, branchActiveJobs.length || 2, branchActiveJobs.length || 3, branchActiveJobs.length || 3, branchActiveJobs.length || 2, branchActiveJobs.length || 1, branchActiveJobs.length || 2] },
    { name: "Interviews", data: [l1Count || 1, l2Count || 2, l3Count || 1, activeInterviews.length || 3, l2Count || 2, 0, 1] }
  ];

  const statusMixOptions: any = {
    chart: { type: "donut", fontFamily: "inherit" },
    labels: ["Active", "In Review", "Hired", "On Hold"],
    colors: ["#10b981", "#f59e0b", "#6366f1", "#94a3b8"],
    plotOptions: { pie: { donut: { size: "75%" } } },
    dataLabels: { enabled: false },
    legend: { position: "bottom" },
    stroke: { show: false }
  };
  const activeCount = branchActiveJobs.length;
  const pendingCount = pendingScreenings.length;
  const joinsPlacementsCount = joinsCount + offersCount;
  const holdCount = branchJobs.filter((j: any) => j.status === "On Hold" || j.jobStatus === "On Hold").length;
  const statusMixSeries = [
    activeCount || 1,
    pendingCount || 0,
    joinsPlacementsCount || 0,
    holdCount || 0
  ];

  const recentBranchJobs = [...branchJobs]
    .sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 1. BRANCH OPERATIONAL CONTEXT BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
            <Icon icon="heroicons:building-office-2" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Office: {activeBranchName}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {activeBranchMarket === "US" ? "US IT Staffing" : "Domestic India IT"} • Timezone: {activeBranchTimezone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/utility/users">
            <Button size="sm" variant="outline" className="text-xs font-bold h-8.5 gap-1.5 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-50 cursor-pointer">
              <Icon icon="heroicons:user-group" className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Branch Team
            </Button>
          </Link>
          <Link href="/utility/pods">
            <Button size="sm" variant="outline" className="text-xs font-bold h-8.5 gap-1.5 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-50 cursor-pointer">
              <Icon icon="heroicons:squares-plus" className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Recruitment Pods
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. TOP 4 CORE OPERATIONAL METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Jobs */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0 border border-indigo-100 dark:border-indigo-900/50">
              <Icon icon="heroicons:briefcase" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Jobs</p>
                <span className="text-[10px] text-slate-400 font-medium">{totalPositions} Openings</span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{branchActiveJobs.length}</h3>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Open</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Link
                  href="/job-posting?priority=Hot"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
                  title="Filter by Hot priority"
                >
                  <span>🔥</span>
                  <span>{hotJobs.length} Hot</span>
                </Link>
                <Link
                  href="/job-posting?priority=Warm"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 transition-colors cursor-pointer"
                  title="Filter by Warm priority"
                >
                  <span>⚡</span>
                  <span>{warmJobs.length} Warm</span>
                </Link>
                <Link
                  href="/job-posting?priority=Cold"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="Filter by Cold priority"
                >
                  <span>❄️</span>
                  <span>{coldJobs.length} Cold</span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Submissions */}
        <Link href="/utility/submissions" className="block">
          <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0 border border-emerald-100 dark:border-emerald-900/50">
                <Icon icon="heroicons:paper-airplane" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Submissions</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{submissions.length}</h3>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Total</span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {pendingScreenings.length} waiting for review
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 3: Interviews */}
        <Link href="/applicants/interviews" className="block">
          <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-cyan-300 dark:hover:border-cyan-800 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xl shrink-0 border border-cyan-100 dark:border-cyan-900/50">
                <Icon icon="heroicons:academic-cap" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Interviews</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{activeInterviews.length}</h3>
                  <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">In Progress</span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {l1Count} L1 • {l2Count} L2 • {l3Count} Final
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 4: Hires & Offers */}
        <Link href="/placements" className="block">
          <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-amber-300 dark:hover:border-amber-800 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0 border border-amber-100 dark:border-amber-900/50">
                <Icon icon="heroicons:check-badge" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hires & Offers</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{joinsCount + offersCount}</h3>
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Total</span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {offersCount} Offered • {joinsCount} Joined
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 3. OPERATIONAL ACTION CENTER: PROFILES WAITING & JOBS NEEDING ATTENTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Candidate Review Queue Card */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col">
          <CardHeader className="p-4 pb-3 border-b border-neutral-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm">
                <Icon icon="heroicons:clock" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                  Profiles Waiting for Review ({pendingScreenings.length})
                </CardTitle>
                <CardDescription className="text-[10.5px]">
                  Candidates waiting for review before sending to clients
                </CardDescription>
              </div>
            </div>
            <Link href="/utility/submissions">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer">
                View All →
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3 flex-1 overflow-y-auto max-h-[260px]">
            {pendingScreenings.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-400 dark:text-slate-500">
                <Icon icon="heroicons:check-circle" className="h-8 w-8 text-emerald-500/60 mb-1" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All caught up!</p>
                <p className="text-[11px] mt-0.5">No candidate profiles waiting for review.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingScreenings.slice(0, 4).map((sub: any) => (
                  <div key={sub.id} className="p-2.5 rounded-lg border border-neutral-150 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-855/50 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/applicants/CAN-${String(sub.candidateId || sub.candidate_id || sub.id).padStart(6, '0')}`}
                          className="font-bold text-slate-900 dark:text-white truncate hover:text-indigo-600 transition-colors"
                        >
                          {sub.candidateName || "Candidate"}
                        </Link>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">
                          {sub.jobCode || "JOB"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {sub.jobTitle} • Sourced by <span className="font-medium text-slate-700 dark:text-slate-300">{sub.recruiterName || "Recruiter"}</span>
                      </p>
                    </div>
                    <Link href={`/applicants/CAN-${String(sub.candidateId || sub.candidate_id || sub.id).padStart(6, '0')}`}>
                      <Button size="sm" className="h-7 px-2.5 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 cursor-pointer">
                        Review Candidate
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jobs Needing Attention Card */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col">
          <CardHeader className="p-4 pb-3 border-b border-neutral-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm">
                <Icon icon="heroicons:exclamation-triangle" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                  Jobs Needing Attention ({agingJobs.length})
                </CardTitle>
                <CardDescription className="text-[10.5px]">
                  Jobs open for more than 2 days with fewer than 2 candidates
                </CardDescription>
              </div>
            </div>
            <Link href="/job-posting">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer">
                View All Jobs →
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3 flex-1 overflow-y-auto max-h-[260px]">
            {agingJobs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-400 dark:text-slate-500">
                <Icon icon="heroicons:shield-check" className="h-8 w-8 text-emerald-500/60 mb-1" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All jobs are covered!</p>
                <p className="text-[11px] mt-0.5">Every active job has candidates in progress.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {agingJobs.slice(0, 4).map((job: any) => (
                  <div key={job.id} className="p-2.5 rounded-lg border border-neutral-150 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-855/50 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/job-posting/${job.id}`}
                          className="font-bold text-slate-900 dark:text-white truncate hover:text-indigo-600 transition-colors"
                        >
                          {job.jobTitle || job.title}
                        </Link>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300">
                          {job.jobCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Client: <span className="font-medium text-slate-700 dark:text-slate-300">{job.clientName || job.client || "Direct"}</span> • Assigned: <span className="font-semibold text-slate-700 dark:text-slate-300">{job.assignedTo || "Unassigned"}</span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAssignModal(job)}
                      className="h-7 px-2.5 text-[10px] font-bold border-rose-200 hover:bg-rose-50 text-rose-700 dark:border-rose-900 dark:hover:bg-rose-950/50 shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Icon icon="heroicons:user-plus" className="h-3 w-3" />
                      Assign Team
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. VISUAL ANALYTICS: ACTIVITY TREND & STATUS OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="p-4 pb-2 border-b border-neutral-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">Weekly Activity Trend</CardTitle>
              <CardDescription className="text-[10.5px]">Daily overview of candidate submissions, jobs, and interviews</CardDescription>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last 7 Days</span>
          </CardHeader>
          <CardContent className="p-3">
            <div className="h-[240px]">
              <Chart options={activityChartOptions} series={activityChartSeries} type="area" height="100%" width="100%" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="p-4 pb-2 border-b border-neutral-100 dark:border-slate-800">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">Job Status Overview</CardTitle>
            <CardDescription className="text-[10.5px]">Current status breakdown of branch jobs</CardDescription>
          </CardHeader>
          <CardContent className="p-3 flex items-center justify-center h-[240px]">
            <Chart options={statusMixOptions} series={statusMixSeries} type="donut" height="100%" width="100%" />
          </CardContent>
        </Card>
      </div>

      {/* 5. BOTTOM SECTION: RECRUITER PERFORMANCE & RECENT JOBS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recruiter Performance Table */}
        <div className="lg:col-span-5">
          <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs h-full flex flex-col">
            <CardHeader className="p-4 pb-3 border-b border-neutral-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Icon icon="heroicons:user-group" className="text-indigo-600 h-4 w-4" />
                  Recruiter Performance ({branchRecruiters.length})
                </CardTitle>
                <CardDescription className="text-[10.5px]">Team members and their delivery metrics</CardDescription>
              </div>
              <Link href="/utility/users">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer">
                  View Team →
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-x-auto">
              {branchRecruiters.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No active recruiters in this branch.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Recruiter</th>
                      <th className="py-2.5 px-3 text-center">Submissions</th>
                      <th className="py-2.5 px-3 text-center">Interviews</th>
                      <th className="py-2.5 px-3 text-right">Hires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {branchRecruiters.slice(0, 6).map(({ user, submissionsCount, interviewsCount, joinsCount }: any) => (
                      <tr key={user.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{user.fullName}</div>
                          <div className="text-[10.5px] text-slate-400 truncate">{user.roleName || user.roles?.[0] || "Recruiter"}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                          {submissionsCount}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-cyan-600 dark:text-cyan-400">
                          {interviewsCount}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            joinsCount > 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "text-slate-400"
                          }`}>
                            {joinsCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Jobs Table */}
        <div className="lg:col-span-7">
          <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs h-full flex flex-col">
            <CardHeader className="p-4 pb-3 border-b border-neutral-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Icon icon="heroicons:briefcase" className="text-emerald-600 h-4 w-4" />
                  Recent Jobs ({branchJobs.length})
                </CardTitle>
                <CardDescription className="text-[10.5px]">Latest jobs assigned to this office</CardDescription>
              </div>
              <Link href="/job-posting">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer">
                  All Jobs →
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-x-auto">
              {recentBranchJobs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No jobs found for this branch.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Job Title & Code</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3 text-center">Openings</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Date Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentBranchJobs.map((j: any) => (
                      <tr key={j.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <Link href={`/job-posting/${j.id}`} className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition-colors block truncate max-w-[200px]">
                            {j.jobTitle || j.title}
                          </Link>
                          <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">{j.jobCode}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                          {j.clientName || j.client || "Direct"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                          {j.noOfPositions || j.positions || 1}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            j.jobStatus === "Active" || j.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {j.jobStatus || j.status || "Active"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-[11px] text-slate-400 font-mono">
                          {j.createdAt || j.created_at ? new Date(j.createdAt || j.created_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 6. ASSIGN TEAM / RECRUITER MODAL */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-lg p-0 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <DialogHeader className="p-4 pb-3 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/70 dark:bg-slate-850/70">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                <Icon icon="heroicons:user-group" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Assign Team / Recruiter
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Assign requirement to a recruitment pod or team member
                </DialogDescription>
              </div>
            </div>

            {/* Selected Job Info Banner */}
            {selectedJobForAssign && (
              <div className="mt-3 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {selectedJobForAssign.jobTitle || selectedJobForAssign.title}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300">
                      {selectedJobForAssign.jobCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Client: {selectedJobForAssign.clientName || selectedJobForAssign.client || "Direct"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block">Current:</span>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {selectedJobForAssign.assignedTo || "Unassigned"}
                  </Badge>
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Tab Selector: Pods vs Individual Users */}
          <div className="px-4 pt-3 pb-1 flex items-center gap-2 border-b border-neutral-100 dark:border-slate-800">
            {branchUsesPods && (
              <button
                type="button"
                onClick={() => { setAssignTab("pods"); setAssignSearch(""); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  assignTab === "pods"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750"
                )}
              >
                <Icon icon="heroicons:squares-plus" className="h-3.5 w-3.5" />
                Recruitment Pods ({pods.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => { setAssignTab("users"); setAssignSearch(""); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                assignTab === "users"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750"
              )}
            >
              <Icon icon="heroicons:user" className="h-3.5 w-3.5" />
              Recruiters & Staff ({branchRecruiterUsers.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="px-4 pt-2.5">
            <div className="relative">
              <Icon icon="heroicons:magnifying-glass" className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder={assignTab === "pods" ? "Search pods by name or lead..." : "Search staff by name, role, or email..."}
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="h-8.5 pl-8 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                autoFocus
              />
            </div>
          </div>

          {/* Selection List */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[280px] space-y-2">
            {assignTab === "pods" ? (
              filteredPods.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <Icon icon="heroicons:squares-plus" className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No recruitment pods found.</p>
                  <p className="text-[11px] mt-0.5">You can assign to individual recruiters or create pods in Pods Manager.</p>
                  <Link href="/utility/pods" className="inline-block mt-2">
                    <Button size="sm" variant="outline" className="text-xs h-7 text-indigo-600">
                      Go to Pods Manager →
                    </Button>
                  </Link>
                </div>
              ) : (
                filteredPods.map((pod: any) => {
                  const isCurrent =
                    selectedJobForAssign?.podId === pod.id ||
                    selectedJobForAssign?.assignedTo?.toLowerCase() === pod.name?.toLowerCase();
                  return (
                    <div
                      key={pod.id}
                      className={cn(
                        "p-3 rounded-lg border flex items-center justify-between gap-3 text-xs transition-colors",
                        isCurrent
                          ? "border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-800"
                          : "border-neutral-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white truncate">{pod.name}</span>
                          {isCurrent && (
                            <Badge className="text-[9px] bg-indigo-600 text-white font-bold py-0 h-4">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          Pod Lead: <span className="font-medium text-slate-700 dark:text-slate-300">{pod.podHeadName || "Unassigned"}</span>
                          {pod.members && pod.members.length > 0 && (
                            <span> • {pod.members.length} Member{pod.members.length !== 1 ? 's' : ''}</span>
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={assigning}
                        onClick={() => handleExecuteAssignment("pod", pod.id, pod.name)}
                        className={cn(
                          "h-7 px-3 text-[11px] font-bold cursor-pointer shrink-0",
                          isCurrent
                            ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        )}
                      >
                        {assigning ? "Assigning..." : isCurrent ? "Re-assign" : "Assign Pod"}
                      </Button>
                    </div>
                  );
                })
              )
            ) : (
              filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <Icon icon="heroicons:users" className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No recruiters or staff matching "{assignSearch}".</p>
                </div>
              ) : (
                filteredUsers.map((u: any) => {
                  const isCurrent =
                    selectedJobForAssign?.primaryRecruiterId === u.id ||
                    selectedJobForAssign?.assignedTo?.toLowerCase() === (u.fullName || u.name || "").toLowerCase() ||
                    selectedJobForAssign?.assignedTo?.toLowerCase() === u.email?.toLowerCase();
                  const roleLabel = u.roleName || (u.roles && u.roles[0]) || u.systemRole || "Staff";
                  return (
                    <div
                      key={u.id}
                      className={cn(
                        "p-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs transition-colors",
                        isCurrent
                          ? "border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-800"
                          : "border-neutral-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-[10.5px] shrink-0 uppercase">
                          {(u.fullName || u.name || u.email || "U").substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white truncate">{u.fullName || u.name}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                              {roleLabel}
                            </span>
                            {isCurrent && (
                              <Badge className="text-[9px] bg-indigo-600 text-white font-bold py-0 h-4">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{u.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={assigning}
                        onClick={() => handleExecuteAssignment("user", u.id, u.fullName || u.name || u.email)}
                        className={cn(
                          "h-7 px-3 text-[11px] font-bold cursor-pointer shrink-0",
                          isCurrent
                            ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        )}
                      >
                        {assigning ? "Assigning..." : isCurrent ? "Re-assign" : "Assign"}
                      </Button>
                    </div>
                  );
                })
              )
            )}
          </div>

          {/* Footer: Mark Unassigned or Cancel */}
          <DialogFooter className="p-3 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850/50 flex flex-row items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={assigning}
              onClick={() => handleExecuteAssignment("unassign", "none", "Unassigned")}
              className="text-[11px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 cursor-pointer"
            >
              Clear Assignment (Unassigned)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={assigning}
              onClick={() => setIsAssignModalOpen(false)}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl shadow-inner shrink-0 border border-blue-100 dark:border-blue-900/30">
              <Icon icon="heroicons:briefcase" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total Jobs</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{canViewJobs ? totalJobs : "N/A"}</h3>
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
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{canViewJobs ? totalSubmissions : "N/A"}</h3>
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
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{canViewJobs ? filledJobsCount : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Jobs On Hold Card */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shadow-inner shrink-0 border border-amber-100 dark:border-amber-900/30">
              <Icon icon="heroicons:clock" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Jobs On Hold</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{canViewJobs ? holdJobsCount : "N/A"}</h3>
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
          ) : (
            <div className="p-8 text-center text-xs text-default-400">No candidate submissions recorded for your portfolio yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── POD LEAD / TEAM HEAD DASHBOARD VIEW ──────────────────────────────────────
function PodLeadDashboardView({ profile, jobs, activeJobs }: { profile: any; jobs: any[]; activeJobs: any[] }) {
  const [podSubmissions, setPodSubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    loadPodSubmissions();
  }, []);

  async function loadPodSubmissions() {
    setLoadingSubs(true);
    try {
      const data = await atsApi.submissions.list();
      const list = Array.isArray(data) ? data : data.data || [];
      setPodSubmissions(list);
    } catch (err) {
      console.error("Failed to fetch pod submissions:", err);
    } finally {
      setLoadingSubs(false);
    }
  }

  const handleApproveSubmission = async (subId: number) => {
    setProcessingId(subId);
    try {
      await atsApi.submissions.update(subId, { finalStatus: "SUBMITTED" });
      toast.success("Submission approved and forwarded to client!");
      await loadPodSubmissions();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve submission");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmission = async (subId: number) => {
    setProcessingId(subId);
    try {
      await atsApi.submissions.update(subId, { finalStatus: "REJECTED" });
      toast.success("Submission rejected.");
      await loadPodSubmissions();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject submission");
    } finally {
      setProcessingId(null);
    }
  };

  // Metrics
  const pendingApprovals = podSubmissions.filter((s) => s.finalStatus === "PENDING_APPROVAL");
  const approvedSubs = podSubmissions.filter((s) => s.finalStatus === "SUBMITTED" || s.finalStatus === "POD_APPROVED");
  const interviewsCount = podSubmissions.filter((s) => s.l1Status === "SCHEDULED" || s.l2Status === "SCHEDULED" || s.l3Status === "SCHEDULED" || s.l1Status === "PASSED" || s.l2Status === "PASSED" || s.l3Status === "PASSED").length;
  const placementsCount = podSubmissions.filter((s) => s.finalStatus === "OFFER" || s.finalStatus === "JOIN" || s.finalStatus === "PLACED").length;

  return (
    <div className="space-y-6">
      {/* 1. HOT ACTION ITEM BANNER: PENDING APPROVALS */}
      {pendingApprovals.length > 0 && (
        <Card className="border border-amber-300 dark:border-amber-900/60 bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-500/10 dark:from-amber-950/40 dark:to-slate-900 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-amber-200/50 dark:border-amber-900/30 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow">
                <Icon icon="heroicons:exclamation-triangle" className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-amber-950 dark:text-amber-300 flex items-center gap-2">
                  Action Required: Submissions Pending Approval ({pendingApprovals.length})
                </CardTitle>
                <CardDescription className="text-xs text-amber-800 dark:text-amber-400">
                  Review candidate CVs submitted by your pod recruiters before client dispatch.
                </CardDescription>
              </div>
            </div>
            <Link href="/utility/submissions">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1 shadow-sm">
                Full Review Queue →
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingApprovals.slice(0, 4).map((sub) => (
                <div key={sub.id} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between gap-3 shadow-xs">
                  <div>
                    <p className="font-bold text-xs text-default-900">{sub.candidateName || `Candidate #${sub.candidateId}`}</p>
                    <p className="text-[11px] text-default-500 font-mono mt-0.5">Job: {sub.jobCode || "Requirement"} | By: <strong>{sub.recruiterName || "Pod Recruiter"}</strong></p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      disabled={processingId === sub.id}
                      onClick={() => handleApproveSubmission(sub.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold h-7 px-2.5 shadow-xs"
                    >
                      Approve ✓
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processingId === sub.id}
                      onClick={() => handleRejectSubmission(sub.id)}
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 text-[11px] font-bold h-7 px-2"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. POD LEAD SCORECARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center text-2xl shrink-0 border border-amber-100 dark:border-amber-900/30">
              <Icon icon="heroicons:clock" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Pending My Review</p>
              <h3 className="text-2xl font-bold text-default-900 mt-0.5">{pendingApprovals.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center text-2xl shrink-0 border border-blue-100 dark:border-blue-900/30">
              <Icon icon="heroicons:document-check" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Pod Submissions</p>
              <h3 className="text-2xl font-bold text-default-900 mt-0.5">{podSubmissions.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 flex items-center justify-center text-2xl shrink-0 border border-cyan-100 dark:border-cyan-900/30">
              <Icon icon="heroicons:calendar" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Scheduled Interviews</p>
              <h3 className="text-2xl font-bold text-default-900 mt-0.5">{interviewsCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center text-2xl shrink-0 border border-emerald-100 dark:border-emerald-900/30">
              <Icon icon="heroicons:trophy" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Pod Placements</p>
              <h3 className="text-2xl font-bold text-default-900 mt-0.5">{placementsCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. POD SUBMISSIONS AUDIT TABLE */}
      <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="border-b border-default-100 pb-4 px-6 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
          <div>
            <CardTitle className="text-base font-bold text-default-900 flex items-center gap-2">
              <Icon icon="heroicons:user-group" className="text-indigo-600" />
              Pod Team Submissions & Review Table
            </CardTitle>
            <CardDescription className="text-xs mt-1">Live submission throughput across recruiters in your assigned pod.</CardDescription>
          </div>
          <Link href="/utility/submissions">
            <Button variant="outline" size="sm" className="text-xs font-bold h-8 text-indigo-600 border-indigo-200">
              Full Submissions Tracker →
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {loadingSubs ? (
            <div className="p-8 text-center text-xs text-default-400">Loading pod submissions...</div>
          ) : podSubmissions.length === 0 ? (
            <div className="p-8 text-center text-xs text-default-400">No candidate submissions recorded for your pod yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-default-50 border-b border-default-200 text-default-700 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Candidate Name</th>
                    <th className="py-3 px-4">Job Code & Title</th>
                    <th className="py-3 px-4">Submitted By</th>
                    <th className="py-3 px-4">Submitted Rate</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100">
                  {podSubmissions.slice(0, 10).map((sub) => (
                    <tr key={sub.id} className="hover:bg-default-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-default-900">
                        {sub.candidateName || `Candidate #${sub.candidateId}`}
                        <div className="text-[10px] text-default-400 font-normal">{sub.candidateEmail || "No Email"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-default-900">{sub.jobTitle || "Requirement"}</div>
                        <div className="font-mono text-[10px] text-indigo-600">{sub.jobCode}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-default-700">{sub.recruiterName || "Pod Recruiter"}</td>
                      <td className="py-3 px-4 font-bold text-default-800">{sub.submittedRate || "Standard"}</td>
                      <td className="py-3 px-4">
                        <Badge className={`px-2 py-0.5 text-[10px] font-bold ${
                          sub.finalStatus === "PENDING_APPROVAL" ? "bg-amber-100 text-amber-800" :
                          sub.finalStatus === "SUBMITTED" || sub.finalStatus === "POD_APPROVED" ? "bg-blue-100 text-blue-800" :
                          sub.finalStatus === "REJECTED" ? "bg-rose-100 text-rose-800" :
                          "bg-emerald-100 text-emerald-800"
                        }`}>
                          {sub.finalStatus?.replace("_", " ") || "SUBMITTED"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {sub.finalStatus === "PENDING_APPROVAL" ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              disabled={processingId === sub.id}
                              onClick={() => handleApproveSubmission(sub.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold h-6 px-2"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={processingId === sub.id}
                              onClick={() => handleRejectSubmission(sub.id)}
                              className="text-rose-600 border-rose-200 text-[10px] font-bold h-6 px-1.5"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-default-400 font-medium">Reviewed ✓</span>
                        )}
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
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [selectedJobForCV, setSelectedJobForCV] = useState<any | null>(null);

  useEffect(() => {
    async function loadSubs() {
      try {
        const res = await atsApi.submissions.list();
        const mine = Array.isArray(res) ? res : res?.data || [];
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
  const interviewsScheduled = mySubmissions.filter((s) => s.l1Status === "SCHEDULED" || s.l2Status === "SCHEDULED" || s.l3Status === "SCHEDULED" || s.l1Status === "PASSED" || s.l2Status === "PASSED" || s.l3Status === "PASSED").length;
  const selectedCount = mySubmissions.filter((sub) => sub.finalStatus === "OFFER" || sub.finalStatus === "JOIN" || sub.finalStatus === "PLACED").length;

  return (
    <div className="space-y-6">
      {/* 1. RECRUITER QUICK SOURCING TOOLBAR */}
      <div className="p-4 rounded-xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100">
            <Icon icon="heroicons:user-plus" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-default-900">Recruiter Sourcing Workspace</h3>
            <p className="text-xs text-default-500">Pick an active job requisition below to upload candidate CVs or match talent from database.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/applicants">
            <Button size="sm" variant="outline" className="text-xs font-bold border-default-200 h-8 gap-1">
              <Icon icon="heroicons:magnifying-glass" className="h-3.5 w-3.5 text-indigo-600" />
              Talent Bench Search
            </Button>
          </Link>
          <Link href="/email">
            <Button size="sm" variant="outline" className="text-xs font-bold border-default-200 h-8 gap-1 text-purple-700 bg-purple-50/50 hover:bg-purple-100">
              <Icon icon="heroicons:paper-airplane" className="h-3.5 w-3.5 text-purple-600" />
              Mass Mail Outreach
            </Button>
          </Link>
          <Link href="/utility/submissions">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold h-8 gap-1 shadow-xs">
              <Icon icon="heroicons:clipboard-document-list" className="h-3.5 w-3.5" />
              My Submissions Tracker
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. RECRUITER SCORECARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center text-2xl shrink-0 border border-blue-100 dark:border-blue-900/30">
              <Icon icon="heroicons:briefcase" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Active Assigned Jobs</p>
              <h3 className="text-2xl font-bold text-default-900 mt-0.5">{activeCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 flex items-center justify-center text-2xl shrink-0 border border-purple-100 dark:border-purple-900/30">
              <Icon icon="heroicons:document-text" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">My Submissions</p>
              <h3 className="text-2xl font-bold text-default-900 mt-0.5">{mySubmissions.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 flex items-center justify-center text-2xl shrink-0 border border-cyan-100 dark:border-cyan-900/30">
              <Icon icon="heroicons:calendar" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Interviews Scheduled</p>
              <h3 className="text-2xl font-bold text-default-900 mt-0.5">{interviewsScheduled}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center text-2xl shrink-0 border border-emerald-100 dark:border-emerald-900/30">
              <Icon icon="heroicons:trophy" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Selections / Placed</p>
              <h3 className="text-2xl font-bold text-default-900 mt-0.5">{selectedCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. WORKSPACE SPLIT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Pane: Active Assigned Jobs Queue */}
        <div className="xl:col-span-8">
          <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl h-full overflow-hidden">
            <CardHeader className="border-b border-default-100 pb-4 px-6 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
              <div>
                <CardTitle className="text-base font-bold text-default-900 flex items-center gap-2">
                  <Icon icon="heroicons:magnifying-glass" className="text-indigo-600" />
                  Active Sourcing Requisitions
                </CardTitle>
                <CardDescription className="text-xs mt-1">Select an active job requisition to post candidate profiles.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {activeJobs.length === 0 ? (
                <div className="p-12 text-center text-xs text-default-400">No active job requirements assigned at the moment.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-default-50 border-b border-default-200 text-default-700 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Job Title & Code</th>
                        <th className="py-3 px-4">Client</th>
                        <th className="py-3 px-4">Budget / Pay Rate</th>
                        <th className="py-3 px-4 text-center">Done / Target</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-100">
                      {activeJobs.slice(0, 10).map((job) => (
                        <tr key={job.id} className="hover:bg-default-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-default-900">{job.jobTitle}</div>
                            <div className="text-[10px] text-indigo-600 font-mono mt-0.5">{job.jobCode}</div>
                          </td>
                          <td className="py-3.5 px-4 text-default-700 font-medium">{job.client || "Client Requisition"}</td>
                          <td className="py-3.5 px-4 font-bold text-default-800">
                            {(() => {
                              const rate = job.payRate;
                              if (!rate || rate === "N/A") return "Standard";
                              if (/[a-zA-Z$₹]/.test(rate)) return rate;
                              return (job.market || "US") === "IN" ? `INR - ${rate} LPA` : `USD - $${rate}/hr`;
                            })()}
                          </td>
                          <td className="py-3.5 px-4 text-center font-extrabold text-indigo-600">
                            {job.submissionDone || 0} / {job.submissionRequired || 5}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button 
                                size="sm" 
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] h-7 px-2.5 shadow-xs"
                                onClick={() => setSelectedJobForCV(job)}
                              >
                                + Add CV
                              </Button>
                              <Link href={`/job-posting/${job.id}/matches`}>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-purple-600 border-purple-200 hover:bg-purple-50 font-bold text-[11px] h-7 px-2"
                                >
                                  AI Match
                                </Button>
                              </Link>
                            </div>
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

        {/* Right Pane: My Recent Submissions Live Feed */}
        <div className="xl:col-span-4">
          <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl h-full flex flex-col justify-between">
            <CardHeader className="border-b border-default-100 pb-4 px-5 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-default-900 flex items-center gap-2">
                <Icon icon="heroicons:document-check" className="text-emerald-500" />
                My Active Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {loadingSubs ? (
                <div className="p-6 text-center text-xs text-default-400">Loading submissions...</div>
              ) : mySubmissions.length === 0 ? (
                <div className="p-8 text-center text-xs text-default-400">No candidate submissions recorded yet.</div>
              ) : (
                <div className="max-h-[480px] overflow-y-auto divide-y divide-default-100">
                  {mySubmissions.slice(0, 10).map((sub) => (
                    <div key={sub.id} className="p-3.5 hover:bg-default-50/50 transition-colors flex items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-bold text-default-900">{sub.candidateName || `Candidate #${sub.candidateId}`}</p>
                        <p className="text-[10px] text-default-400 font-mono mt-0.5">{sub.jobCode || "Requirement"}</p>
                      </div>
                      <Badge className={`px-2 py-0.5 text-[9px] font-bold ${
                        sub.finalStatus === "PENDING_APPROVAL" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" :
                        sub.finalStatus === "SUBMITTED" || sub.finalStatus === "POD_APPROVED" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" :
                        sub.finalStatus === "REJECTED" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" :
                        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      }`}>
                        {sub.finalStatus?.replace("_", " ") || "SUBMITTED"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Candidate CV Upload Modal */}
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
