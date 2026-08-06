"use client";

import React, { useEffect, useState } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

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
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"pending" | "tenants">(initialTab === "tenants" ? "tenants" : "pending");

  useEffect(() => {
    if (initialTab === "tenants") {
      setActiveTab("tenants");
    }
  }, [initialTab]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Market + subdomain + limits selections for pending approvals
  const [marketAssignments, setMarketAssignments] = useState<Record<string, "US" | "IN">>({});
  const [subdomainAssignments, setSubdomainAssignments] = useState<Record<string, string>>({}); 
  const [userLimitAssignments, setUserLimitAssignments] = useState<Record<string, number>>({});
  const [maxBranchesAssignments, setMaxBranchesAssignments] = useState<Record<string, number>>({});

  // Manual Tenant Creation Modal state
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  const [manualCompanyName, setManualCompanyName] = useState("");
  const [manualSubdomain, setManualSubdomain] = useState("");
  const [manualAdminFullName, setManualAdminFullName] = useState("");
  const [manualAdminEmail, setManualAdminEmail] = useState("");
  const [manualAdminPassword, setManualAdminPassword] = useState("Admin@123");
  const [manualUserLimit, setManualUserLimit] = useState(20);
  const [manualMaxBranches, setManualMaxBranches] = useState(5);
  const [manualMarket, setManualMarket] = useState<"US" | "IN">("US");
  const [creatingManualTenant, setCreatingManualTenant] = useState(false);

  // SaaS Tenant Details Modal state
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); 

  useEffect(() => {
    if (status === "loading") return;

    const user = session?.user || atsApi.auth.getCurrentUser();
    const hasAdminRole =
      (user as any)?.roles?.includes("SUPER_ADMIN") ||
      (user as any)?.systemRole === "SUPER_ADMIN";
    setIsAdmin(!!hasAdminRole);

    if (hasAdminRole) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [session, status]);

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

    // Initialize market + subdomain + limits for each pending user
    const initialMarkets: Record<string, "US" | "IN"> = {};
    const initialSubdomains: Record<string, string> = {};
    const initialUserLimits: Record<string, number> = {};
    const initialMaxBranches: Record<string, number> = {};
    data.forEach((u) => {
      initialMarkets[u.id] = (u.defaultMarket as "US" | "IN") || "US";
      initialSubdomains[u.id] = u.tenantSubdomain || "";
      initialUserLimits[u.id] = 20;
      initialMaxBranches[u.id] = 5;
    });
    setMarketAssignments(initialMarkets);
    setSubdomainAssignments(initialSubdomains);
    setUserLimitAssignments(initialUserLimits);
    setMaxBranchesAssignments(initialMaxBranches);
  };

  const fetchTenants = async () => {
    const data = await atsApi.auth.listTenants();
    setTenants(data);
  };

  const handleViewTenantDetails = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsModalOpen(true);
    setTenantUsers([]);
    try {
      setUsersLoading(true);
      const data = await atsApi.auth.listUsers(tenant.id);
      setTenantUsers(data);
    } catch (err: any) {
      toast.error("Failed to load tenant users: " + err.message);
    } finally {
      setUsersLoading(false);
    }
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
    const selectedUserLimit = userLimitAssignments[userId] || 20;
    const selectedMaxBranches = maxBranchesAssignments[userId] || 5;
    if (!selectedSubdomain) {
      return toast.error("Please assign a workspace subdomain before approving.");
    }
    try {
      setSubmittingId(userId);
      await atsApi.auth.approveUser(userId, selectedMarket, selectedSubdomain, selectedUserLimit, selectedMaxBranches);
      toast.success(`Approved! Workspace: ${selectedSubdomain}.enfycon.com (${selectedUserLimit} seats, ${selectedMaxBranches} max branches)`);
      await loadData();
    } catch (err: any) {
      toast.error("Approval failed: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCreateManualTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCompanyName.trim()) return toast.error("Company Name is required.");
    if (!manualSubdomain.trim()) return toast.error("Subdomain is required.");
    if (!manualAdminFullName.trim()) return toast.error("Tenant Admin Name is required.");
    if (!manualAdminEmail.trim()) return toast.error("Tenant Admin Email is required.");

    try {
      setCreatingManualTenant(true);
      const res = await atsApi.auth.createManualTenant({
        companyName: manualCompanyName.trim(),
        subdomain: manualSubdomain.trim().toLowerCase(),
        adminFullName: manualAdminFullName.trim(),
        adminEmail: manualAdminEmail.trim().toLowerCase(),
        adminPassword: manualAdminPassword || "Admin@123",
        userLimit: manualUserLimit,
        maxBranches: manualMaxBranches,
        defaultMarket: manualMarket,
      });

      toast.success(`Tenant "${manualCompanyName}" created and activated! Workspace: ${manualSubdomain}.enfycon.com`);
      
      // Reset form & close modal
      setManualCompanyName("");
      setManualSubdomain("");
      setManualAdminFullName("");
      setManualAdminEmail("");
      setManualAdminPassword("Admin@123");
      setManualUserLimit(20);
      setManualMaxBranches(5);
      setManualMarket("US");
      setShowCreateTenantModal(false);

      await loadData();
    } catch (err: any) {
      toast.error("Failed to create tenant: " + err.message);
    } finally {
      setCreatingManualTenant(false);
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

  const handleTenantBranchLimitChange = async (tenantId: string, limit: number) => {
    if (isNaN(limit) || limit < 1) return;
    try {
      setSubmittingId(tenantId);
      await atsApi.auth.updateTenantBranchLimit(tenantId, limit);
      toast.success(`Tenant max branches updated to ${limit}!`);
      await fetchTenants();
    } catch (err: any) {
      toast.error("Failed to update branch limit: " + err.message);
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
        
        {/* Action Buttons & Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => setShowCreateTenantModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Icon icon="heroicons:plus-circle" className="h-4 w-4" />
            Create Manual Tenant
          </Button>

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
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Assign Domain 🔐</th>
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Seats Limit</th>
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Max Branches</th>
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Market</th>
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
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                value={userLimitAssignments[user.id] || 20}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setUserLimitAssignments(prev => ({ ...prev, [user.id]: isNaN(val) ? 20 : val }));
                                }}
                                className="w-16 border border-default-250 dark:border-slate-700 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-600 bg-transparent text-default-850"
                              />
                              <span className="text-[10px] text-default-500 font-medium">seats</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                value={maxBranchesAssignments[user.id] || 5}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setMaxBranchesAssignments(prev => ({ ...prev, [user.id]: isNaN(val) ? 5 : val }));
                                }}
                                className="w-16 border border-default-250 dark:border-slate-700 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-600 bg-transparent text-default-850"
                              />
                              <span className="text-[10px] text-default-500 font-medium">branches</span>
                            </div>
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
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Max Branches</th>
                      <th className="py-4 px-6 text-sm font-semibold text-default-700">Staffing Market Layout Configuration</th>
                      <th className="py-4 px-6 text-sm font-semibold text-default-700 text-right">Actions</th>
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
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                defaultValue={(tenant as any).maxBranches || (tenant as any).max_branches || 5}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  handleTenantBranchLimitChange(tenant.id, val);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = parseInt((e.target as HTMLInputElement).value, 10);
                                    handleTenantBranchLimitChange(tenant.id, val);
                                  }
                                }}
                                className="w-16 border border-default-250 dark:border-slate-700 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-600 bg-transparent text-default-850"
                              />
                              <span className="text-[11px] text-default-500 font-medium">branches</span>
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
                          <td className="py-4 px-6 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewTenantDetails(tenant)}
                              className="flex items-center gap-1.5 ml-auto cursor-pointer font-semibold border-indigo-200 hover:border-indigo-300 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 dark:border-slate-700"
                            >
                              <Icon icon="heroicons:eye" className="h-4 w-4" />
                              View Users
                            </Button>
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

      {/* Tenant Details & Users Modal */}
      {isModalOpen && selectedTenant && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                  <Icon icon="heroicons:building-office-2" className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-default-900">{selectedTenant.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">Workspace: {selectedTenant.domain}.enfycon.com</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <Icon icon="heroicons:x-mark" className="h-6 w-6" />
              </button>
            </div>

            {/* Tenant Parameters Summary Card */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-indigo-50/30 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tenant ID</span>
                <span className="text-xs font-mono text-default-800 break-all select-all block mt-0.5">{selectedTenant.id}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Seats Capacity</span>
                <span className="text-sm font-semibold text-default-800 block mt-0.5">{selectedTenant.userLimit} seats</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Staffing Market</span>
                <span className="text-sm font-semibold text-default-800 block mt-0.5">
                  {selectedTenant.defaultMarket === 'IN' ? '🇮🇳 Indian Staffing' : '🇺🇸 US IT Staffing'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Creation Date</span>
                <span className="text-sm font-semibold text-default-800 block mt-0.5">
                  {new Date(selectedTenant.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </span>
              </div>
            </div>

            {/* Modal Body: Users List */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <h4 className="text-sm font-bold text-default-900 mb-4 flex items-center gap-1.5">
                <Icon icon="heroicons:users" className="h-4 w-4 text-indigo-600" />
                Registered Workspace Users ({tenantUsers.length})
              </h4>

              {usersLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                  <p className="mt-3 text-xs text-slate-500">Retrieving workspace staff members...</p>
                </div>
              ) : tenantUsers.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="inline-flex h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 items-center justify-center text-xl mb-3">
                    <Icon icon="heroicons:user-group" />
                  </div>
                  <p className="text-sm font-semibold text-default-950">No users found</p>
                  <p className="text-xs text-slate-500 mt-0.5">There are no registered staff members in this company workspace.</p>
                </div>
              ) : (
                <div className="border border-slate-150 dark:border-slate-850 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-150 dark:border-slate-800/80">
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Staff Member</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Workspace Role</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                      {tenantUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-850/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-655 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                {user.fullName ? user.fullName.charAt(0).toUpperCase() : '?'}
                              </div>
                              <span className="font-semibold text-default-900 text-xs">{user.fullName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 font-mono">
                            {user.email}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 uppercase tracking-wider">
                              {user.roleName || user.roles?.join(', ') || 'Staff'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              user.isActive ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="font-semibold cursor-pointer"
              >
                Close View
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Tenant Creation Modal (Super Admin) */}
      {showCreateTenantModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
          onClick={() => setShowCreateTenantModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                  <Icon icon="heroicons:plus-circle" className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-default-900">Provision Manual Tenant</h3>
                  <p className="text-xs text-slate-500 font-medium">Create and activate a new company workspace directly.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateTenantModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <Icon icon="heroicons:x-mark" className="h-6 w-6" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreateManualTenant} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold text-default-800">Company Name *</label>
                <Input
                  placeholder="e.g. Acme Staffing Solutions"
                  value={manualCompanyName}
                  onChange={(e) => {
                    setManualCompanyName(e.target.value);
                    if (!manualSubdomain) {
                      setManualSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    }
                  }}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-default-800">Workspace Subdomain *</label>
                <div className="flex items-center bg-default-50 dark:bg-slate-800 border border-default-250 dark:border-slate-700 rounded-lg overflow-hidden">
                  <input
                    type="text"
                    placeholder="acme-staffing"
                    value={manualSubdomain}
                    onChange={(e) => setManualSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="bg-transparent px-3 py-2 text-xs font-semibold text-default-900 focus:outline-none w-full"
                    required
                  />
                  <span className="text-[11px] font-bold text-default-500 bg-default-100 dark:bg-slate-700 px-3 py-2 border-l border-default-250">
                    .enfycon.com
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-default-800">Admin Full Name *</label>
                  <Input
                    placeholder="John Doe"
                    value={manualAdminFullName}
                    onChange={(e) => setManualAdminFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-default-800">Admin Work Email *</label>
                  <Input
                    type="email"
                    placeholder="admin@acmestaffing.com"
                    value={manualAdminEmail}
                    onChange={(e) => setManualAdminEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-default-800">Temporary Password</label>
                <Input
                  type="text"
                  placeholder="Admin@123"
                  value={manualAdminPassword}
                  onChange={(e) => setManualAdminPassword(e.target.value)}
                />
              </div>

              {/* Plan Limits */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/40 dark:bg-slate-900/40 border border-indigo-100 dark:border-slate-800 rounded-xl">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300">User Seats Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={manualUserLimit}
                    onChange={(e) => setManualUserLimit(parseInt(e.target.value, 10) || 20)}
                    className="w-full border border-indigo-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-default-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Max Branches Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={manualMaxBranches}
                    onChange={(e) => setManualMaxBranches(parseInt(e.target.value, 10) || 5)}
                    className="w-full border border-indigo-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-default-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-default-800">Default Staffing Market</label>
                <div className="flex bg-default-100 dark:bg-slate-800 p-1 rounded-lg border border-default-250">
                  <button
                    type="button"
                    onClick={() => setManualMarket("US")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded transition cursor-pointer ${
                      manualMarket === "US"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm"
                        : "text-default-500"
                    }`}
                  >
                    🇺🇸 US IT Staffing
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualMarket("IN")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded transition cursor-pointer ${
                      manualMarket === "IN"
                        ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm"
                        : "text-default-500"
                    }`}
                  >
                    🇮🇳 Indian Staffing
                  </button>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateTenantModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={creatingManualTenant}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                >
                  {creatingManualTenant ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                  ) : (
                    <>
                      <Icon icon="heroicons:check" className="h-4 w-4" />
                      Provision & Activate Tenant
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
