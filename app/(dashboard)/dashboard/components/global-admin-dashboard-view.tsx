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

export default // ─── GLOBAL ADMIN DASHBOARD VIEW (SUPER_ADMIN COMMAND CENTER) ────────────────
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
