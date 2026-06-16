"use client";

import React, { useEffect, useState } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";

interface PendingUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  createdAt: string;
  tenantId: string;
  tenantName: string;
  defaultMarket: string;
  tenantSubdomain: string;
}

interface Tenant {
  id: string;
  name: string;
  domain: string;
  status: string;
  defaultMarket: "US" | "IN";
  userLimit: number;
  createdAt: string;
}

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "tenants">("pending");
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Market + subdomain selections for pending approvals
  const [marketAssignments, setMarketAssignments] = useState<Record<string, "US" | "IN">>({});
  const [subdomainAssignments, setSubdomainAssignments] = useState<Record<string, string>>({}); 

  useEffect(() => {
    const user = atsApi.auth.getCurrentUser();
    const hasAdminRole = user?.roles?.includes("SUPER_ADMIN");
    setIsAdmin(hasAdminRole);

    if (hasAdminRole) {
      loadData();
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchPendingApprovals(), fetchTenants()]);
    } catch (err: any) {
      toast.error("Failed to load data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    const data = await atsApi.auth.listPendingApprovals();
    setPendingUsers(data);

    // Initialize market + subdomain for each pending user
    const initialMarkets: Record<string, "US" | "IN"> = {};
    const initialSubdomains: Record<string, string> = {};
    data.forEach((u) => {
      initialMarkets[u.id] = (u.defaultMarket as "US" | "IN") || "US";
      initialSubdomains[u.id] = u.tenantSubdomain || "";
    });
    setMarketAssignments(initialMarkets);
    setSubdomainAssignments(initialSubdomains);
  };

  const fetchTenants = async () => {
    const data = await atsApi.auth.listTenants();
    setTenants(data);
  };

  const handleMarketChange = (userId: string, market: "US" | "IN") => {
    setMarketAssignments((prev) => ({ ...prev, [userId]: market }));
  };

  const handleSubdomainChange = (userId: string, value: string) => {
    setSubdomainAssignments((prev) => ({
      ...prev,
      [userId]: value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
    }));
  };

  const handleApprove = async (userId: string) => {
    const selectedMarket = marketAssignments[userId] || "US";
    const selectedSubdomain = subdomainAssignments[userId]?.trim();
    if (!selectedSubdomain) {
      return toast.error("Please assign a workspace subdomain before approving.");
    }
    try {
      setSubmittingId(userId);
      await atsApi.auth.approveUser(userId, selectedMarket, selectedSubdomain);
      toast.success(`Approved! Workspace: ${selectedSubdomain}.enfycon.com`);
      await loadData();
    } catch (err: any) {
      toast.error("Approval failed: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleTenantMarketToggle = async (tenantId: string, currentMarket: "US" | "IN") => {
    const nextMarket = currentMarket === "US" ? "IN" : "US";
    try {
      setSubmittingId(tenantId);
      await atsApi.auth.updateTenantMarket(tenantId, nextMarket);
      toast.success(`Market configuration changed to ${nextMarket === "US" ? "US IT Staffing" : "Indian Staffing"}!`);
      await fetchTenants();
    } catch (err: any) {
      toast.error("Failed to update tenant market: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleTenantStatusToggle = async (tenantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      setSubmittingId(tenantId);
      await atsApi.auth.updateTenantStatus(tenantId, nextStatus);
      toast.success(`Tenant status changed to ${nextStatus}!`);
      await fetchTenants();
    } catch (err: any) {
      toast.error("Failed to update tenant status: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleTenantUserLimitChange = async (tenantId: string, limit: number) => {
    if (isNaN(limit) || limit < 1) return;
    try {
      setSubmittingId(tenantId);
      await atsApi.auth.updateTenantUserLimit(tenantId, limit);
      toast.success(`Tenant user limit updated to ${limit}!`);
      await fetchTenants();
    } catch (err: any) {
      toast.error("Failed to update user limit: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div>
        <SiteBreadcrumb />
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-sm text-default-500">Loading configurations...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div>
        <SiteBreadcrumb />
        <Card className="border border-red-500/20 bg-red-950/10 max-w-2xl mx-auto mt-10">
          <CardContent className="p-8 text-center">
            <div className="inline-flex h-12 w-12 rounded-full bg-red-500/10 text-red-500 items-center justify-center text-2xl mb-4">
              <Icon icon="heroicons:shield-exclamation" />
            </div>
            <h2 className="text-xl font-bold text-red-500 mb-2">Access Denied</h2>
            <p className="text-sm text-default-600">
              You must have **Administrator** privileges to view the registration and market assignment dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SiteBreadcrumb />
      
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-default-900 flex items-center gap-2">
            <Icon icon="heroicons:shield-check" className="text-indigo-600 h-7 w-7" />
            Platform Tenant & Markets Panel
          </h1>
          <p className="text-sm text-default-600 mt-1">
            Approve pending user accounts, view active tenants, and configure their operating recruitment markets.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-default-100 dark:bg-slate-800 p-1 rounded-lg border border-default-250 w-fit">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition cursor-pointer ${
              activeTab === "pending"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-default-500 hover:text-default-800"
            }`}
          >
            <Icon icon="heroicons:user-plus" className="h-4 w-4" />
            Pending Approvals ({pendingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab("tenants")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition cursor-pointer ${
              activeTab === "tenants"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-default-500 hover:text-default-800"
            }`}
          >
            <Icon icon="heroicons:building-office-2" className="h-4 w-4" />
            Active Tenants ({tenants.length})
          </button>
        </div>
      </div>

      <Card className="border border-default-100 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-default-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium">
                {activeTab === "pending" ? "Pending Approvals" : "Active Tenants & Markets"}
              </CardTitle>
              <CardDescription className="mt-1">
                {activeTab === "pending" 
                  ? "Approve user profiles and configure their corporate staffing market layout."
                  : "View active global companies and change their workspace configuration on-the-fly."}
              </CardDescription>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={loadData} 
              className="flex items-center gap-2"
            >
              <Icon icon="heroicons:arrow-path" className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {activeTab === "pending" ? (
            /* ========================================================
               TAB 1: PENDING APPROVALS LIST
               ======================================================== */
            pendingUsers.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center justify-center">
                <div className="inline-flex h-16 w-16 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-500 items-center justify-center text-3xl mb-4 shadow-inner">
                  <Icon icon="heroicons:check-badge" />
                </div>
                <h3 className="text-lg font-bold text-default-900 mb-1">All Caught Up!</h3>
                <p className="text-sm text-default-500 max-w-sm">
                  No new user registrations are currently pending administrator approval.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-default-50 dark:bg-slate-800/50 border-b border-default-100">
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Applicant Details</th>
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Company (Tenant)</th>
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Requested Role</th>
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Assign Domain 🔐</th>
                      <th className="py-4 px-6 text-sm font-semibold text-default-700 w-64">Market</th>
                      <th className="py-4 px-6 text-sm font-semibold text-default-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-default-100">
                    {pendingUsers.map((user) => {
                      const selectedMarket = marketAssignments[user.id] || "US";
                      return (
                        <tr key={user.id} className="hover:bg-default-50/50 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                                {user.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-default-900 text-sm">{user.fullName}</div>
                                <div className="text-xs text-default-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div>
                              <div className="text-sm font-medium text-default-800 flex items-center gap-1.5">
                                <Icon icon="heroicons:building-office" className="h-4 w-4 text-default-400" />
                                {user.tenantName}
                              </div>
                              <div className="text-[11px] text-default-400 mt-0.5">
                                Reg: {new Date(user.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <Badge className="border border-indigo-100 bg-indigo-50/30 text-indigo-700 dark:border-indigo-950 dark:bg-indigo-950/20 dark:text-indigo-400 capitalize text-xs">
                              {user.roles.join(", ").toLowerCase()}
                            </Badge>
                          </td>
                          <td className="py-4 px-6">
                            {/* SUBDOMAIN — set by platform admin only */}
                            <div className="flex items-center gap-1 bg-default-50 dark:bg-slate-800 border border-default-200 rounded-lg overflow-hidden w-52">
                              <input
                                type="text"
                                value={subdomainAssignments[user.id] || ""}
                                onChange={(e) => handleSubdomainChange(user.id, e.target.value)}
                                placeholder="company-slug"
                                className="bg-transparent border-0 px-2.5 py-1.5 text-xs font-medium text-default-900 focus:outline-none w-full"
                              />
                              <span className="text-[10px] font-semibold text-default-400 bg-default-100 dark:bg-slate-700 px-1.5 py-1.5 whitespace-nowrap border-l border-default-200">
                                .enfycon.com
                              </span>
                            </div>
                            {subdomainAssignments[user.id] && (
                              <p className="text-[10px] text-emerald-600 mt-1">
                                → {subdomainAssignments[user.id]}.enfycon.com
                              </p>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex bg-default-100 dark:bg-slate-800 p-0.5 rounded-lg border border-default-200/50 w-fit">
                              <button
                                onClick={() => handleMarketChange(user.id, "US")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                                  selectedMarket === "US"
                                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                    : "text-default-500 hover:text-default-800"
                                }`}
                              >
                                🇺🇸 US IT
                              </button>
                              <button
                                onClick={() => handleMarketChange(user.id, "IN")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                                  selectedMarket === "IN"
                                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                    : "text-default-500 hover:text-default-800"
                                }`}
                              >
                                🇮🇳 India
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(user.id)}
                              disabled={submittingId === user.id}
                              className={`font-semibold transition-all ${
                                selectedMarket === "IN" 
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
                              }`}
                            >
                              {submittingId === user.id ? (
                                <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                              ) : (
                                <>
                                  <Icon icon="heroicons:check" className="mr-1 h-4 w-4" />
                                  Approve
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* ========================================================
               TAB 2: ACTIVE TENANTS & CONFIGURATION
               ======================================================== */
            tenants.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center justify-center">
                <div className="inline-flex h-16 w-16 rounded-full bg-slate-100 text-slate-500 items-center justify-center text-3xl mb-4">
                  <Icon icon="heroicons:building-office" />
                </div>
                <h3 className="text-lg font-bold text-default-900 mb-1">No Tenants Registered</h3>
                <p className="text-sm text-default-500 max-w-sm">
                  There are no active tenants registered on the platform.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-default-50 dark:bg-slate-800/50 border-b border-default-100">
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Company Details</th>
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Domain Domain</th>
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Status</th>
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Seats Limit</th>
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Staffing Market Layout Configuration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-default-100">
                    {tenants.map((tenant) => {
                      return (
                        <tr key={tenant.id} className="hover:bg-default-50/50 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-100 dark:border-slate-700">
                                <Icon icon="heroicons:building-office-2" className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="font-semibold text-default-900 text-sm">{tenant.name}</div>
                                <div className="text-[10px] text-default-400">ID: {tenant.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm font-medium text-default-850 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1.5 rounded border border-slate-100 dark:border-slate-700">
                              {tenant.domain}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`tenant-status-${tenant.id}`}
                                checked={tenant.status === "ACTIVE"}
                                onCheckedChange={() => handleTenantStatusToggle(tenant.id, tenant.status)}
                                disabled={submittingId === tenant.id}
                              />
                              <span className={`text-xs font-semibold ${
                                tenant.status === "ACTIVE" ? "text-emerald-600" : "text-rose-600"
                              }`}>
                                {tenant.status === "ACTIVE" ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                defaultValue={tenant.userLimit || 5}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (val !== tenant.userLimit) {
                                    handleTenantUserLimitChange(tenant.id, val);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = parseInt((e.target as HTMLInputElement).value, 10);
                                    if (val !== tenant.userLimit) {
                                      handleTenantUserLimitChange(tenant.id, val);
                                    }
                                  }
                                }}
                                className="w-16 border border-default-250 dark:border-slate-700 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-600 bg-transparent text-default-850"
                              />
                              <span className="text-[11px] text-default-500 font-medium">seats</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-4">
                              <div className="flex bg-default-100 dark:bg-slate-800 p-0.5 rounded-lg border border-default-200/50 w-fit">
                                <button
                                  onClick={() => tenant.defaultMarket !== "US" && handleTenantMarketToggle(tenant.id, "IN")}
                                  disabled={submittingId === tenant.id}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                                    tenant.defaultMarket === "US"
                                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                      : "text-default-500 hover:text-default-850"
                                  }`}
                                >
                                  🇺🇸 US IT Staffing
                                </button>
                                <button
                                  onClick={() => tenant.defaultMarket !== "IN" && handleTenantMarketToggle(tenant.id, "US")}
                                  disabled={submittingId === tenant.id}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                                    tenant.defaultMarket === "IN"
                                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                      : "text-default-500 hover:text-default-850"
                                  }`}
                                >
                                  🇮🇳 Indian Staffing
                                </button>
                              </div>
                              {submittingId === tenant.id && (
                                <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
