"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { atsApi } from "@/lib/ats-api";
import {
  Globe,
  Building2,
  Trash2,
  Plus,
  ExternalLink,
  RefreshCw,
  Users,
  MapPin,
  Briefcase,
  CheckCircle2,
  ShieldCheck,
  Shield,
  Bell,
  Mail,
  DollarSign,
  Filter,
  Sliders,
  Sparkles,
  Save,
  ChevronRight,
  Layers,
  Award,
  Target
} from "lucide-react";
import toast from "react-hot-toast";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { getBaseDomain } from "@/utils/subdomain-helper";
import { isRoleAdmin, resolveActiveSystemRole, CustomRoleDefinition } from "@/lib/role-permissions";
import { EmailDispatchCard } from "@/components/company/email-dispatch-card";

interface DomainMapping {
  id: string | number;
  domain_name: string;
  is_primary: boolean;
  verification_token?: string;
  verification_status?: string;
  ssl_status?: string;
  verified_at?: string;
  created_at: string;
}

interface BranchItem {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  isActive: boolean;
  usersCount: number;
  jobsCount: number;
  createdAt: string;
}

interface BusinessUnitItem {
  id: string;
  name: string;
  code: string | null;
  market: string;
  currency: string;
  usersCount: number;
  jobsCount: number;
  createdAt: string;
}

export default function CompanySettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [availableRoles, setAvailableRoles] = useState<CustomRoleDefinition[]>([]);
  const [overrideRole, setOverrideRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Tenant Admin State
  const [subdomain, setSubdomain] = useState("");
  const [originalSubdomain, setOriginalSubdomain] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [podSystemEnabled, setPodSystemEnabled] = useState(true);
  const [togglingPodSystem, setTogglingPodSystem] = useState(false);
  const [candidatePoolMode, setCandidatePoolMode] = useState("COMBINED_MARKET");
  const [updatingPoolMode, setUpdatingPoolMode] = useState(false);
  const [customDomains, setCustomDomains] = useState<DomainMapping[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [savingSubdomain, setSavingSubdomain] = useState(false);
  const [addingDomain, setAddingDomain] = useState(false);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [branchState, setBranchState] = useState("");
  const [branchCountry, setBranchCountry] = useState("India");
  const [addingBranch, setAddingBranch] = useState(false);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitItem[]>([]);
  const [showAddBU, setShowAddBU] = useState(false);
  const [buName, setBuName] = useState("");
  const [buCode, setBuCode] = useState("");
  const [buMarket, setBuMarket] = useState("US");
  const [buCurrency, setBuCurrency] = useState("USD");
  const [addingBU, setAddingBU] = useState(false);

  useEffect(() => {
    atsApi.auth.listRoles().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setAvailableRoles(data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOverrideRole(localStorage.getItem("override_role"));
      const handleStorage = () => {
        setOverrideRole(localStorage.getItem("override_role"));
      };
      window.addEventListener("storage", handleStorage);
      window.addEventListener("overrideRoleChanged", handleStorage);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("overrideRoleChanged", handleStorage);
      };
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [user, profileData, rolesList] = await Promise.all([
        atsApi.auth.getCurrentUser(),
        atsApi.auth.me().catch(() => null),
        atsApi.auth.listRoles().catch(() => [])
      ]);

      if (profileData) {
        setProfile(profileData);
        if (profileData.tenant) {
          setCompanyName(profileData.tenant.name || "");
          setSubdomain(profileData.tenant.domain || "");
          setOriginalSubdomain(profileData.tenant.domain || "");
        }
        if (profileData.podSystemEnabled !== undefined) {
          setPodSystemEnabled(profileData.podSystemEnabled);
        }
        if (profileData.candidatePoolMode) {
          setCandidatePoolMode(profileData.candidatePoolMode);
        }
      } else if (user) {
        setProfile(user);
        setCompanyName(user.companyName || "My Company Workspace");
      }

      if (Array.isArray(rolesList) && rolesList.length > 0) {
        setAvailableRoles(rolesList);
      }

      // Load custom domains, branches, business units if admin
      const override = typeof window !== "undefined" ? localStorage.getItem("override_role") : null;
      const activeRole = override || profileData?.systemRole || user?.systemRole || user?.roles?.[0];
      const isAdmin = isRoleAdmin(activeRole, rolesList, user || profileData);

      if (isAdmin) {
        const [domainsRes, branchesRes, buRes] = await Promise.all([
          atsApi.auth.listMyDomains().catch(() => []),
          atsApi.branches.list().catch(() => []),
          atsApi.businessUnits.list().catch(() => []),
        ]);
        setCustomDomains(domainsRes || []);
        setBranches(branchesRes || []);
        setBusinessUnits(buRes || []);
      }
    } catch (err: any) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePodSystem = async (enabled: boolean) => {
    try {
      setTogglingPodSystem(true);
      await atsApi.auth.updateMySettings({ podSystemEnabled: enabled });
      setPodSystemEnabled(enabled);
      toast.success(
        enabled
          ? "Recruitment Pod routing system enabled."
          : "Recruitment Pod system disabled (Universal recruiter mode active)."
      );
    } catch (err: any) {
      toast.error("Failed to update pod settings: " + err.message);
    } finally {
      setTogglingPodSystem(false);
    }
  };

  const handleUpdatePoolMode = async (mode: string) => {
    try {
      setUpdatingPoolMode(true);
      await atsApi.auth.updateMySettings({ candidatePoolMode: mode });
      setCandidatePoolMode(mode);
      toast.success("Candidate pool sharing policy updated successfully.");
    } catch (err: any) {
      toast.error("Failed to update candidate pool settings: " + err.message);
    } finally {
      setUpdatingPoolMode(false);
    }
  };

  const handleSaveSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSub = subdomain.trim().toLowerCase();
    if (!cleanSub) return toast.error("Please enter a valid subdomain.");
    if (cleanSub === originalSubdomain) return toast("Subdomain is unchanged.");
    try {
      setSavingSubdomain(true);
      await atsApi.auth.updateMySubdomain(cleanSub);
      setOriginalSubdomain(cleanSub);
      toast.success(`Subdomain updated to "${cleanSub}". Redirecting...`);
      const hostname = window.location.hostname;
      const parts = hostname.split(".");
      const protocol = window.location.protocol;
      let base = parts.slice(1).join(".");
      if (hostname.includes("localhost")) base = "localhost:3000";
      window.location.href = `${protocol}//${cleanSub}.${base}/company`;
    } catch (err: any) {
      toast.error(err.message || "Failed to update subdomain.");
    } finally {
      setSavingSubdomain(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = newDomain.trim().toLowerCase();
    if (!cleanDomain) return toast.error("Please enter a domain name.");
    try {
      setAddingDomain(true);
      const res = await atsApi.auth.addMyDomain(cleanDomain);
      toast.success(`Custom domain "${cleanDomain}" added successfully!`);
      setNewDomain("");
      setCustomDomains((prev) => [...prev, res]);
    } catch (err: any) {
      toast.error(err.message || "Failed to add domain.");
    } finally {
      setAddingDomain(false);
    }
  };

  const handleDeleteDomain = async (domainId: string | number) => {
    if (!confirm("Are you sure you want to remove this custom domain?")) return;
    try {
      await atsApi.auth.deleteMyDomain(String(domainId));
      toast.success("Domain mapping removed.");
      setCustomDomains((prev) => prev.filter((d) => String(d.id) !== String(domainId)));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete domain.");
    }
  };

  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);

  const handleVerifyDomain = async (domainName: string) => {
    try {
      setVerifyingDomain(domainName);
      const res = await atsApi.auth.verifyMyDomain(domainName);
      if (res.verified) {
        toast.success(res.message || `Domain ${domainName} verified and SSL activated!`);
      } else {
        toast(res.message || "DNS verification in progress. Please ensure TXT/CNAME records are created.", { icon: "ℹ️" });
      }
      const updatedDomains = await atsApi.auth.listMyDomains();
      setCustomDomains(updatedDomains || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to verify domain.");
    } finally {
      setVerifyingDomain(null);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return toast.error("Branch name is required.");
    try {
      setAddingBranch(true);
      const res = await atsApi.branches.create({
        name: branchName.trim(),
        code: branchCode.trim() || undefined,
        city: branchCity.trim() || undefined,
        state: branchState.trim() || undefined,
        country: branchCountry.trim() || undefined,
      });
      toast.success(`Office branch "${res.name}" created!`);
      setBranches((prev) => [...prev, res]);
      setShowAddBranch(false);
      setBranchName("");
      setBranchCode("");
      setBranchCity("");
      setBranchState("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create branch.");
    } finally {
      setAddingBranch(false);
    }
  };

  const handleDeleteBranch = async (branchId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete branch "${name}"?`)) return;
    try {
      await atsApi.branches.delete(branchId);
      toast.success(`Branch "${name}" deleted.`);
      setBranches((prev) => prev.filter((b) => b.id !== branchId));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete branch.");
    }
  };

  const handleCreateBU = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buName.trim()) return toast.error("Business Unit name is required.");
    try {
      setAddingBU(true);
      const res = await atsApi.businessUnits.create({
        name: buName.trim(),
        code: buCode.trim() || undefined,
        market: buMarket,
        currency: buCurrency,
      });
      toast.success(`Business unit "${res.name}" created!`);
      setBusinessUnits((prev) => [...prev, res]);
      setShowAddBU(false);
      setBuName("");
      setBuCode("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create business unit.");
    } finally {
      setAddingBU(false);
    }
  };

  const handleDeleteBU = async (buId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete business unit "${name}"?`)) return;
    try {
      await atsApi.businessUnits.delete(buId);
      toast.success(`Business unit "${name}" deleted.`);
      setBusinessUnits((prev) => prev.filter((bu) => bu.id !== buId));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete business unit.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-neutral-100 dark:bg-[#1e2734]">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">Settings</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded shadow-sm">
          <RefreshCw className="animate-spin h-8 w-8 text-primary mb-3" />
          <p className="text-sm text-neutral-500">Loading role settings...</p>
        </div>
      </div>
    );
  }

  // Active perspective resolution
  const activeRoleName = overrideRole || profile?.roles?.[0] || profile?.systemRole || "RECRUITER";
  const systemRole = resolveActiveSystemRole(activeRoleName, availableRoles, profile);
  const isSuperAdmin = activeRoleName === "SUPER_ADMIN";

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-100 dark:bg-[#1e2734]">
      <SiteBreadcrumb />

      {/* Role-Specific Settings View Rendering */}
      {systemRole === "ADMIN" || systemRole === "TENANT_ADMIN" || systemRole === "SUPER_ADMIN" ? (
        <TenantAdminSettingsView
          companyName={companyName}
          subdomain={subdomain}
          originalSubdomain={originalSubdomain}
          setSubdomain={setSubdomain}
          savingSubdomain={savingSubdomain}
          handleSaveSubdomain={handleSaveSubdomain}
          podSystemEnabled={podSystemEnabled}
          togglingPodSystem={togglingPodSystem}
          handleTogglePodSystem={handleTogglePodSystem}
          candidatePoolMode={candidatePoolMode}
          updatingPoolMode={updatingPoolMode}
          handleUpdatePoolMode={handleUpdatePoolMode}
          branches={branches}
          showAddBranch={showAddBranch}
          setShowAddBranch={setShowAddBranch}
          branchName={branchName}
          setBranchName={setBranchName}
          branchCode={branchCode}
          setBranchCode={setBranchCode}
          branchCity={branchCity}
          setBranchCity={setBranchCity}
          branchState={branchState}
          setBranchState={setBranchState}
          branchCountry={branchCountry}
          setBranchCountry={setBranchCountry}
          addingBranch={addingBranch}
          handleCreateBranch={handleCreateBranch}
          handleDeleteBranch={handleDeleteBranch}
          businessUnits={businessUnits}
          showAddBU={showAddBU}
          setShowAddBU={setShowAddBU}
          buName={buName}
          setBuName={setBuName}
          buCode={buCode}
          setBuCode={setBuCode}
          buMarket={buMarket}
          setBuMarket={setBuMarket}
          buCurrency={buCurrency}
          setBuCurrency={setBuCurrency}
          addingBU={addingBU}
          handleCreateBU={handleCreateBU}
          handleDeleteBU={handleDeleteBU}
          customDomains={customDomains}
          newDomain={newDomain}
          setNewDomain={setNewDomain}
          addingDomain={addingDomain}
          handleAddDomain={handleAddDomain}
          handleDeleteDomain={handleDeleteDomain}
          handleVerifyDomain={handleVerifyDomain}
          verifyingDomain={verifyingDomain}
          isSuperAdmin={isSuperAdmin}
        />
      ) : systemRole === "ACCOUNT_MANAGER" ? (
        <AccountManagerSettingsView profile={profile} activeRoleName={activeRoleName} />
      ) : systemRole === "POD_LEAD" || systemRole === "DELIVERY_HEAD" ? (
        <PodLeadSettingsView profile={profile} activeRoleName={activeRoleName} isDeliveryHead={systemRole === "DELIVERY_HEAD"} />
      ) : (
        <RecruiterSettingsView profile={profile} activeRoleName={activeRoleName} />
      )}
    </div>
  );
}

// ─── 1. TENANT ADMIN WORKSPACE & ORGANIZATION SETTINGS VIEW ──────────────────
function TenantAdminSettingsView(props: any) {
  const base = getBaseDomain();

  return (
    <>
      {/* Page Title */}
      <div className="mb-4 mt-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Workspace &amp; Organization Settings
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your corporate branches, business unit divisions, tenant domains, and pod system.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Branches & Business Units */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Branch Locations Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Office Branch Locations ({props.branches.length})
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500 mt-0.5">
                  Define geographic office branches (e.g. Hyderabad Office, Vizag Office) for seat scoping and analytics.
                </CardDescription>
              </div>
              <Button
                onClick={() => props.setShowAddBranch(!props.showAddBranch)}
                size="sm"
                className="h-8 text-xs font-bold px-3 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Branch
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {props.showAddBranch && (
                <form onSubmit={props.handleCreateBranch} className="p-3 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">New Branch Office</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Branch Name *</Label>
                      <Input
                        type="text"
                        placeholder="e.g. Hyderabad Branch"
                        value={props.branchName}
                        onChange={(e) => props.setBranchName(e.target.value)}
                        className="h-8 text-xs font-medium bg-white dark:bg-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Branch Code</Label>
                      <Input
                        type="text"
                        placeholder="e.g. HYD"
                        value={props.branchCode}
                        onChange={(e) => props.setBranchCode(e.target.value)}
                        className="h-8 text-xs font-medium bg-white dark:bg-slate-900 uppercase"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">City</Label>
                      <Input
                        type="text"
                        placeholder="e.g. Hyderabad"
                        value={props.branchCity}
                        onChange={(e) => props.setBranchCity(e.target.value)}
                        className="h-8 text-xs font-medium bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Country</Label>
                      <Input
                        type="text"
                        placeholder="e.g. India"
                        value={props.branchCountry}
                        onChange={(e) => props.setBranchCountry(e.target.value)}
                        className="h-8 text-xs font-medium bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => props.setShowAddBranch(false)} className="h-7 text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={props.addingBranch} className="h-7 text-xs font-bold">
                      {props.addingBranch ? "Saving..." : "Save Branch"}
                    </Button>
                  </div>
                </form>
              )}

              {props.branches.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-neutral-250 dark:border-slate-800 rounded bg-neutral-50/50 dark:bg-slate-950/5 text-xs text-neutral-500 font-medium">
                  No office branches defined yet. Click "Add Branch" to set up your primary office location.
                </div>
              ) : (
                <div className="border border-neutral-200 dark:border-slate-800/80 rounded divide-y divide-neutral-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {props.branches.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between px-3 py-3 hover:bg-neutral-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 font-bold text-xs">
                          {b.code || b.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">{b.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50">
                              Active Location
                            </Badge>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {b.city ? `${b.city}, ${b.country || "India"}` : b.country || "India"} • {b.usersCount || 0} Assigned Recruiters • {b.jobsCount || 0} Jobs
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => props.handleDeleteBranch(b.id, b.name)}
                        className="h-7 w-7 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Business Units & Divisions Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  Business Units &amp; Operating Divisions ({props.businessUnits.length})
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500 mt-0.5">
                  Separate US IT Staffing from Domestic Staffing for market-specific tax and recruitment workflows.
                </CardDescription>
              </div>
              <Button
                onClick={() => props.setShowAddBU(!props.showAddBU)}
                size="sm"
                className="h-8 text-xs font-bold px-3 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Division
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {props.showAddBU && (
                <form onSubmit={props.handleCreateBU} className="p-3 border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">New Business Unit</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Unit Name *</Label>
                      <Input
                        type="text"
                        placeholder="e.g. US IT Staffing Division"
                        value={props.buName}
                        onChange={(e) => props.setBuName(e.target.value)}
                        className="h-8 text-xs font-medium bg-white dark:bg-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Unit Code</Label>
                      <Input
                        type="text"
                        placeholder="e.g. USIT"
                        value={props.buCode}
                        onChange={(e) => props.setBuCode(e.target.value)}
                        className="h-8 text-xs font-medium bg-white dark:bg-slate-900 uppercase"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Target Market</Label>
                      <select
                        value={props.buMarket}
                        onChange={(e) => props.setBuMarket(e.target.value)}
                        className="w-full h-8 text-xs font-medium bg-white dark:bg-slate-900 border border-neutral-250 dark:border-slate-700 rounded px-2"
                      >
                        <option value="US">US Market</option>
                        <option value="INDIA">India Domestic Market</option>
                        <option value="GLOBAL">Global / Multi-Market</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Billing Currency</Label>
                      <select
                        value={props.buCurrency}
                        onChange={(e) => props.setBuCurrency(e.target.value)}
                        className="w-full h-8 text-xs font-medium bg-white dark:bg-slate-900 border border-neutral-250 dark:border-slate-700 rounded px-2"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD ($)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => props.setShowAddBU(false)} className="h-7 text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={props.addingBU} className="h-7 text-xs font-bold">
                      {props.addingBU ? "Saving..." : "Save Unit"}
                    </Button>
                  </div>
                </form>
              )}

              {props.businessUnits.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-neutral-250 dark:border-slate-800 rounded bg-neutral-50/50 dark:bg-slate-950/5 text-xs text-neutral-500 font-medium">
                  No business units defined yet. Click "Add Division" to separate your market teams.
                </div>
              ) : (
                <div className="border border-neutral-200 dark:border-slate-800/80 rounded divide-y divide-neutral-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {props.businessUnits.map((bu: any) => (
                    <div key={bu.id} className="flex items-center justify-between px-3 py-3 hover:bg-neutral-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {bu.code || bu.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">{bu.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-300 text-indigo-700 dark:text-indigo-400 bg-indigo-50/50">
                              {bu.market} • {bu.currency}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {bu.usersCount || 0} Staff Members • {bu.jobsCount || 0} Requisitions
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => props.handleDeleteBU(bu.id, bu.name)}
                        className="h-7 w-7 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Subdomain Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
              <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                Workspace Subdomain
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500 mt-0.5">
                Your default access link. You can customize the subdomain slug.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form onSubmit={props.handleSaveSubdomain} className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Subdomain Slug</Label>
                  <div className="flex items-center mt-1.5 max-w-md">
                    <Input
                      type="text"
                      value={props.subdomain}
                      onChange={(e) => props.setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="e.g. acme"
                      className="h-9 text-xs font-semibold rounded-r-none border-r-0 bg-white dark:bg-slate-900"
                      disabled={!props.isSuperAdmin}
                    />
                    <div className="h-9 px-3 flex items-center justify-center bg-neutral-100 dark:bg-slate-800 border border-neutral-250 dark:border-slate-700 rounded-r text-xs text-neutral-600 dark:text-neutral-400 font-mono select-none">
                      .{base}
                    </div>
                  </div>
                  {!props.isSuperAdmin && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                      <span>🔒 Subdomain slug changes require Enfycon Platform Administrator (SUPER_ADMIN) authorization.</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-neutral-500">
                    Current workspace URL: <span className="font-mono text-primary font-bold">{props.originalSubdomain ? `${props.originalSubdomain}.${base}` : "Loading..."}</span>
                  </div>
                  {props.isSuperAdmin && (
                    <Button
                      type="submit"
                      disabled={props.savingSubdomain || props.subdomain === props.originalSubdomain || !props.subdomain.trim()}
                      size="sm"
                      className="text-xs font-bold"
                    >
                      {props.savingSubdomain ? "Updating..." : "Update Subdomain"}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 4. Workspace Email & Custom Domain Strategy Card */}
          <EmailDispatchCard
            tenantId={props.profile?.tenantId}
            subdomain={props.subdomain || props.originalSubdomain}
            companyName={props.companyName}
            userEmail={props.profile?.email}
          />

          {/* 5. Candidate Pool Mode Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
              <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Candidate CV Pool &amp; Branch Sharing Control
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500 mt-0.5">
                Configure how candidate search and CV records are shared across office branches in this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div
                onClick={() => props.handleUpdatePoolMode("COMBINED_MARKET")}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                  props.candidatePoolMode === "COMBINED_MARKET"
                    ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs"
                    : "border-neutral-200 dark:border-slate-800 hover:bg-neutral-50/50"
                }`}
              >
                <input
                  type="radio"
                  name="candidatePoolMode"
                  checked={props.candidatePoolMode === "COMBINED_MARKET"}
                  onChange={() => props.handleUpdatePoolMode("COMBINED_MARKET")}
                  className="mt-0.5 text-emerald-600"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">
                      Combined Market Pools (Recommended Default)
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-300 text-emerald-700 bg-emerald-50">
                      DEFAULT
                    </Badge>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    All Domestic branches (India) share the Domestic CV pool (market = INDIA). All USIT branches share the USIT CV pool (market = US). Operations remain branch-isolated.
                  </p>
                </div>
              </div>

              <div
                onClick={() => props.handleUpdatePoolMode("STRICT_ISOLATION")}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                  props.candidatePoolMode === "STRICT_ISOLATION"
                    ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs"
                    : "border-neutral-200 dark:border-slate-800 hover:bg-neutral-50/50"
                }`}
              >
                <input
                  type="radio"
                  name="candidatePoolMode"
                  checked={props.candidatePoolMode === "STRICT_ISOLATION"}
                  onChange={() => props.handleUpdatePoolMode("STRICT_ISOLATION")}
                  className="mt-0.5 text-emerald-600"
                />
                <div>
                  <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">
                    Strict Branch Isolation
                  </span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Recruiters can only search and view candidate CVs created within or assigned to their home branch. Cross-branch CV search is restricted.
                  </p>
                </div>
              </div>

              <div
                onClick={() => props.handleUpdatePoolMode("OPEN_WORKSPACE")}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                  props.candidatePoolMode === "OPEN_WORKSPACE"
                    ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs"
                    : "border-neutral-200 dark:border-slate-800 hover:bg-neutral-50/50"
                }`}
              >
                <input
                  type="radio"
                  name="candidatePoolMode"
                  checked={props.candidatePoolMode === "OPEN_WORKSPACE"}
                  onChange={() => props.handleUpdatePoolMode("OPEN_WORKSPACE")}
                  className="mt-0.5 text-emerald-600"
                />
                <div>
                  <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">
                    Open Workspace Sharing
                  </span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    All recruiters across all branches and markets can search and view all candidate CVs in the tenant workspace.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Pod System Settings Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Recruitment Pod System
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500 mt-0.5">
                  Enable or disable round-robin delivery team pod routing for job requisitions in this company workspace.
                </CardDescription>
              </div>
              <Switch
                checked={props.podSystemEnabled}
                onCheckedChange={props.handleTogglePodSystem}
                disabled={props.togglingPodSystem}
              />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${props.podSystemEnabled ? "bg-emerald-500" : "bg-neutral-400"}`} />
                <span>Status: <strong>{props.podSystemEnabled ? "Pods Enabled (Multi-Pod Routing Active)" : "Pods Disabled (Universal Recruiter Mode Active)"}</strong></span>
              </div>
            </CardContent>
          </Card>

          {/* 6. Branch-Isolated Job Assignment Policies */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  Branch-Isolated Job Assignment Policies
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500 mt-0.5">
                  Job assignment strategies (Direct Recruiter, Pod System Auto/Manual, All Branch Recruiters, and Unassigned) are configured individually per branch.
                </CardDescription>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => { window.location.href = "/utility/branches"; }}
                className="h-8 text-xs font-bold px-3 gap-1 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                Manage Branch Policies →
              </Button>
            </CardHeader>
          </Card>
        </div>

        {/* Right Column: Custom Domains & DNS Instructions */}
        <div className="space-y-6">
          {/* Custom Domains Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
              <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Custom Domains
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500 mt-0.5">
                Point your own custom domain (e.g. `careers.mycompany.com`) directly to this ATS workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form onSubmit={props.handleAddDomain} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={props.newDomain}
                    onChange={(e) => props.setNewDomain(e.target.value.toLowerCase().trim())}
                    placeholder="e.g. careers.mycompany.com"
                    className="h-8 text-xs bg-white dark:bg-slate-900 flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={props.addingDomain || !props.newDomain.trim()}
                    size="sm"
                    className="h-8 text-xs font-bold"
                  >
                    {props.addingDomain ? "Adding..." : "+ Map Domain"}
                  </Button>
                </div>
              </form>

              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Mapped Domains ({props.customDomains.length + (props.subdomain ? 1 : 0)})
                </p>

                {props.subdomain && (
                  <div className="flex items-center justify-between p-2 rounded border border-neutral-200 dark:border-slate-800 bg-neutral-50/70 dark:bg-slate-950/20 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span className="font-mono text-neutral-800 dark:text-neutral-200 truncate">{props.subdomain}.{base}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-300 text-emerald-700 bg-emerald-50 flex-shrink-0">
                        Primary Subdomain
                      </Badge>
                    </div>
                  </div>
                )}

                {props.customDomains.map((d: any) => (
                  <div key={d.id} className="flex flex-col gap-2 p-2.5 rounded border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                    <div className="flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <Globe className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
                        <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200 truncate">{d.domain_name}</span>
                        {d.is_primary && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-300 text-emerald-700 bg-emerald-50 flex-shrink-0">
                            Primary
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 font-medium ${
                            d.verification_status === "VERIFIED"
                              ? "border-emerald-300 text-emerald-700 bg-emerald-50/70"
                              : "border-amber-300 text-amber-700 bg-amber-50/70"
                          }`}
                        >
                          {d.verification_status === "VERIFIED" ? "✓ Verified" : "⏳ Pending DNS"}
                        </Badge>
                        {d.ssl_status === "ACTIVE" && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-blue-300 text-blue-700 bg-blue-50/70">
                            🔒 SSL Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {d.verification_status !== "VERIFIED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={props.verifyingDomain === d.domain_name}
                            onClick={() => props.handleVerifyDomain(d.domain_name)}
                            className="h-6 px-2 text-[10px] font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                          >
                            {props.verifyingDomain === d.domain_name ? "Checking..." : "Verify DNS"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => props.handleDeleteDomain(d.id)}
                          className="h-6 w-6 text-neutral-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {d.verification_status !== "VERIFIED" && d.verification_token && (
                      <div className="text-[10px] bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded border border-slate-200/80 font-mono text-slate-500">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">TXT Record Value:</span>{" "}
                        <span className="select-all text-indigo-600 font-bold">{d.verification_token}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* DNS Instructions Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-2 border-b border-neutral-150 dark:border-slate-800/60">
              <CardTitle className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" />
                DNS Instructions
              </CardTitle>
              <CardDescription className="text-[11px] text-neutral-500">
                How to configure your domain mapping correctly.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3 text-[11px] text-neutral-600 dark:text-neutral-400 space-y-2.5 leading-relaxed">
              <p>
                To link a custom domain to your workspace, you must configure your domain's DNS settings at your registrar (e.g. Cloudflare, GoDaddy, Namecheap).
              </p>

              <div className="p-2.5 rounded bg-neutral-50 dark:bg-slate-950/40 border border-neutral-200 dark:border-slate-800 font-mono text-[10.5px] space-y-1">
                <div className="font-bold text-neutral-700 dark:text-neutral-300">Option A: CNAME Record (Recommended)</div>
                <div className="text-neutral-500">For subdomains like <code className="text-primary">jobs.yourcompany.com</code></div>
                <div className="grid grid-cols-3 gap-1 pt-1 text-neutral-800 dark:text-neutral-200">
                  <span>Type</span><span>Host</span><span>Points To</span>
                  <span className="font-bold">CNAME</span><span>jobs</span><span className="text-primary font-bold">enfycon.com</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-neutral-50 dark:bg-slate-950/40 border border-neutral-200 dark:border-slate-800 font-mono text-[10.5px] space-y-1">
                <div className="font-bold text-neutral-700 dark:text-neutral-300">Option B: A Record</div>
                <div className="text-neutral-500">For root domains like <code className="text-primary">yourcompany.com</code></div>
                <div className="grid grid-cols-3 gap-1 pt-1 text-neutral-800 dark:text-neutral-200">
                  <span>Type</span><span>Host</span><span>Points To</span>
                  <span className="font-bold">A</span><span>@</span><span className="text-primary font-bold">192.0.2.1 (Your Server IP)</span>
                </div>
              </div>

              <p className="text-[10px] text-neutral-400 italic">
                Note: DNS changes can take anywhere from a few minutes up to 24 hours to propagate worldwide. Once active, visitors accessing the custom domain will load this workspace instantly.
              </p>
            </CardContent>
          </Card>

          {/* Security & Governance Audit Trail Card */}
          <Card className="border border-indigo-200 dark:border-indigo-900/50 shadow-xs bg-indigo-50/20 dark:bg-slate-900">
            <CardHeader className="pb-2 border-b border-indigo-100 dark:border-slate-800">
              <CardTitle className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                Security &amp; Audit Trail
              </CardTitle>
              <CardDescription className="text-[11px] text-neutral-500">
                View real-time immutable audit logs of recruiter actions, client rate changes, and workspace security events.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3 flex items-center justify-between">
              <div className="text-[11px] text-neutral-600 dark:text-slate-400">
                SOC2-ready event stream.
              </div>
              <Button
                size="sm"
                onClick={() => { window.location.href = "/utility/audit-logs"; }}
                className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 cursor-pointer"
              >
                View Audit Logs →
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  );
}

// ─── 2. BD MANAGER / ACCOUNT MANAGER WORKSPACE SETTINGS VIEW ─────────────────
function AccountManagerSettingsView({ profile, activeRoleName }: { profile: any; activeRoleName: string }) {
  const [currency, setCurrency] = useState("USD");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [rateFormat, setRateFormat] = useState("HOURLY");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [clientFeedbackAlerts, setClientFeedbackAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [agingAlerts, setAgingAlerts] = useState(true);
  const [signature, setSignature] = useState(`Best Regards,\n${profile?.fullName || "Account Manager"}\nClient Solutions & Business Development\n${profile?.tenantDomain || "Enfycon"} ATS`);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ats_settings_ACCOUNT_MANAGER");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.currency) setCurrency(parsed.currency);
          if (parsed.priorityFilter) setPriorityFilter(parsed.priorityFilter);
          if (parsed.rateFormat) setRateFormat(parsed.rateFormat);
          if (parsed.emailAlerts !== undefined) setEmailAlerts(parsed.emailAlerts);
          if (parsed.clientFeedbackAlerts !== undefined) setClientFeedbackAlerts(parsed.clientFeedbackAlerts);
          if (parsed.dailyDigest !== undefined) setDailyDigest(parsed.dailyDigest);
          if (parsed.agingAlerts !== undefined) setAgingAlerts(parsed.agingAlerts);
          if (parsed.signature) setSignature(parsed.signature);
        } catch (e) {}
      }
    }
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "ats_settings_ACCOUNT_MANAGER",
        JSON.stringify({
          currency,
          priorityFilter,
          rateFormat,
          emailAlerts,
          clientFeedbackAlerts,
          dailyDigest,
          agingAlerts,
          signature,
        })
      );
    }
    toast.success("BD & Account Management preferences updated successfully!");
  };

  return (
    <>
      <div className="mb-4 mt-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-600" />
            BD &amp; Account Management Workspace Settings
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure client communication preferences, job submission alerts, default billing rate currency, and portfolio filters.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Preferences Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Perspective Scope Card */}
          <Card className="border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/10 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {(profile?.fullName || "AM").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-neutral-850 dark:text-neutral-100">{profile?.fullName || "BD Manager"}</span>
                    <Badge className="bg-indigo-600 text-white text-[10px] uppercase font-bold px-2 py-0.5">
                      Active: {activeRoleName}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {profile?.email || "deb@deb.com"} • Assigned Branch: {profile?.branchName || "Domestic / Global Branch"}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-indigo-300 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2.5 py-1">
                Client Portfolio Scope
              </Badge>
            </CardContent>
          </Card>

          {/* Job & Client Portfolio Preferences Form */}
          <form onSubmit={handleSavePreferences} className="space-y-6">
            <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Client &amp; Requisition Portfolio Defaults
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Customize how financial figures, requisition priorities, and client margins are formatted on your dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Base Currency for Client Requisitions</Label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="mt-1.5 w-full h-8 text-xs font-semibold bg-white dark:bg-slate-900 border border-neutral-250 dark:border-slate-700 rounded px-2.5"
                    >
                      <option value="USD">USD ($) - US IT Standard</option>
                      <option value="INR">INR (₹) - India Domestic Standard</option>
                      <option value="EUR">EUR (€) - European Union</option>
                      <option value="GBP">GBP (£) - United Kingdom</option>
                      <option value="CAD">CAD ($) - Canada</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Default Requisition Priority Filter</Label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="mt-1.5 w-full h-8 text-xs font-semibold bg-white dark:bg-slate-900 border border-neutral-250 dark:border-slate-700 rounded px-2.5"
                    >
                      <option value="ALL">All Assigned Requisitions</option>
                      <option value="HOT_URGENT">Hot &amp; Urgent Priority Jobs First</option>
                      <option value="ACTIVE_ONLY">Active Requisitions with Open Slots</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Client Bill Rate Display Format</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                    <div
                      onClick={() => setRateFormat("HOURLY")}
                      className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2.5 ${
                        rateFormat === "HOURLY"
                          ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs font-bold text-indigo-900 dark:text-indigo-300"
                          : "border-neutral-200 dark:border-slate-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      <input type="radio" name="rateFormat" checked={rateFormat === "HOURLY"} onChange={() => setRateFormat("HOURLY")} />
                      <span className="text-xs">Hourly Bill Rate (e.g. $85.00/hr)</span>
                    </div>

                    <div
                      onClick={() => setRateFormat("ANNUAL_CTC")}
                      className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2.5 ${
                        rateFormat === "ANNUAL_CTC"
                          ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs font-bold text-indigo-900 dark:text-indigo-300"
                          : "border-neutral-200 dark:border-slate-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      <input type="radio" name="rateFormat" checked={rateFormat === "ANNUAL_CTC"} onChange={() => setRateFormat("ANNUAL_CTC")} />
                      <span className="text-xs">Annual CTC / % Commission Placement</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline & Submission Notification Alerts */}
            <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-purple-600" />
                  Pipeline &amp; Submissions Notifications
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Select which recruiter events and client milestone updates trigger immediate notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">Recruiter Candidate Submission Alerts</span>
                    <p className="text-[11px] text-neutral-500">Receive notification when a recruiter uploads or maps a candidate to your client job.</p>
                  </div>
                  <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">Client Interview &amp; Feedback Updates</span>
                    <p className="text-[11px] text-neutral-500">Alert immediately when client changes interview stage or submits scorecards.</p>
                  </div>
                  <Switch checked={clientFeedbackAlerts} onCheckedChange={setClientFeedbackAlerts} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">Daily Portfolio Performance Digest</span>
                    <p className="text-[11px] text-neutral-500">Receive a morning summary digest of open requisitions, active submissions, and interviews.</p>
                  </div>
                  <Switch checked={dailyDigest} onCheckedChange={setDailyDigest} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">Idle Job Alerts (&gt; 14 days without submittals)</span>
                    <p className="text-[11px] text-neutral-500">Auto-flag aging client requisitions that lack candidate pipeline coverage.</p>
                  </div>
                  <Switch checked={agingAlerts} onCheckedChange={setAgingAlerts} />
                </div>
              </CardContent>
            </Card>

            {/* Email Signature for Client Communication */}
            <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Client Outreach Email Signature
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Template automatically appended when emailing clients and submitting candidate profiles.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <textarea
                  rows={4}
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="w-full text-xs font-mono p-3 bg-neutral-50 dark:bg-slate-950/40 border border-neutral-250 dark:border-slate-700 rounded-lg focus:outline-indigo-500"
                />
                <div className="flex justify-end">
                  <Button type="submit" className="text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Save className="h-3.5 w-3.5" /> Save BD Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Right Col: Quick Guidance & Info */}
        <div className="space-y-6">
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-2 border-b border-neutral-150 dark:border-slate-800/60">
              <CardTitle className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                BD Manager Perspective Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 text-xs text-neutral-600 dark:text-neutral-400 space-y-2.5 leading-relaxed">
              <p>
                In the <strong>BD / Account Manager</strong> perspective, your workspace is optimized for managing client accounts, reviewing candidate submissions from recruiters, and tracking placements.
              </p>
              <div className="p-2.5 rounded bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 text-[11.5px] space-y-1 text-indigo-900 dark:text-indigo-300">
                <div className="font-bold">Operational Privileges:</div>
                <div>• Create &amp; edit Client Job Requisitions</div>
                <div>• View Candidate Talent Pool &amp; Submissions</div>
                <div>• Manage Clients, Contacts &amp; Agreements</div>
                <div>• Review Placements, Timesheets &amp; Reports</div>
              </div>
              <p className="text-[11px] text-neutral-400 italic">
                Note: Organization-wide settings (such as branch creation, custom domains, and user limits) are managed under the Tenant Admin perspective.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// ─── 3. RECRUITER WORKSPACE SETTINGS VIEW ────────────────────────────────────
function RecruiterSettingsView({ profile, activeRoleName }: { profile: any; activeRoleName: string }) {
  const [market, setMarket] = useState("USIT");
  const [autoHighlight, setAutoHighlight] = useState(true);
  const [autoTagSkills, setAutoTagSkills] = useState(true);
  const [instantAlerts, setInstantAlerts] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("ats_settings_RECRUITER", JSON.stringify({ market, autoHighlight, autoTagSkills, instantAlerts }));
    }
    toast.success("Recruiter sourcing settings saved!");
  };

  return (
    <>
      <div className="mb-4 mt-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Recruiter Workspace &amp; Sourcing Settings
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure default resume search markets, AI skill-parsing preferences, and candidate pipeline alerts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-emerald-600" />
                  Candidate Sourcing &amp; Resume Search Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Default Resume Search Market</Label>
                  <select
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    className="mt-1.5 w-full h-8 text-xs font-semibold bg-white dark:bg-slate-900 border border-neutral-250 dark:border-slate-700 rounded px-2.5"
                  >
                    <option value="USIT">US IT Candidate Pool (H1B, GC, US Citizen, W2/C2C)</option>
                    <option value="DOMESTIC">India Domestic Candidate Pool (Notice Period, CTC)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">Auto-Highlight Matching Skills on CV Preview</span>
                    <p className="text-[11px] text-neutral-500">Automatically highlight keywords in candidate resumes matching active job requirements.</p>
                  </div>
                  <Switch checked={autoHighlight} onCheckedChange={setAutoHighlight} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">Auto-Tag Extracted Skills on Upload</span>
                    <p className="text-[11px] text-neutral-500">Auto-populate candidate skills tags during bulk and single CV parsing.</p>
                  </div>
                  <Switch checked={autoTagSkills} onCheckedChange={setAutoTagSkills} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">Requisition Assignment Alerts</span>
                    <p className="text-[11px] text-neutral-500">Receive notifications whenever new jobs are assigned to your pod or recruiter queue.</p>
                  </div>
                  <Switch checked={instantAlerts} onCheckedChange={setInstantAlerts} />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Save className="h-3.5 w-3.5" /> Save Sourcing Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        <div className="space-y-6">
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-2 border-b border-neutral-150 dark:border-slate-800/60">
              <CardTitle className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Recruiter Role Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 text-xs text-neutral-600 dark:text-neutral-400 space-y-2 leading-relaxed">
              <p>
                As a Recruiter, you have access to Candidate Pools, Resume Parsing, Job Requisitions, and Submission Trackers.
              </p>
              <div className="p-2.5 rounded bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-[11.5px] space-y-1 text-emerald-900 dark:text-emerald-300">
                <div>• Search &amp; Source Candidates</div>
                <div>• Submit CVs to Open Jobs</div>
                <div>• Track Candidate Submissions Status</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// ─── 4. POD LEAD & DELIVERY HEAD WORKSPACE SETTINGS VIEW ──────────────────────
function PodLeadSettingsView({ profile, activeRoleName, isDeliveryHead }: { profile: any; activeRoleName: string; isDeliveryHead?: boolean }) {
  const [distMode, setDistMode] = useState("AUTO_ROUND_ROBIN");
  const [reviewRequired, setReviewRequired] = useState(true);
  const [targetAlerts, setTargetAlerts] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("ats_settings_POD_LEAD", JSON.stringify({ distMode, reviewRequired, targetAlerts }));
    }
    toast.success("Pod leadership settings updated!");
  };

  return (
    <>
      <div className="mb-4 mt-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            {isDeliveryHead ? "Delivery Head Management Settings" : "Recruitment Pod Leadership Settings"}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure team requisition distribution strategies, candidate submission QA reviews, and SLA notifications.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-purple-600" />
                  Team Workflow &amp; Distribution Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Pod Requisition Distribution Mode</Label>
                  <select
                    value={distMode}
                    onChange={(e) => setDistMode(e.target.value)}
                    className="mt-1.5 w-full h-8 text-xs font-semibold bg-white dark:bg-slate-900 border border-neutral-250 dark:border-slate-700 rounded px-2.5"
                  >
                    <option value="AUTO_ROUND_ROBIN">Auto Round-Robin (Equally distribute incoming requisitions)</option>
                    <option value="LEAD_ASSIGNED">Manual Pod Lead Assignment Only</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">Pod Lead Submission QA Review Threshold</span>
                    <p className="text-[11px] text-neutral-500">Require pod lead sign-off before candidate resumes are dispatched to account managers.</p>
                  </div>
                  <Switch checked={reviewRequired} onCheckedChange={setReviewRequired} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">Daily Team Target &amp; SLA Alerts</span>
                    <p className="text-[11px] text-neutral-500">Receive alerts if a high-priority requisition has no submittals within 24 hours.</p>
                  </div>
                  <Switch checked={targetAlerts} onCheckedChange={setTargetAlerts} />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" className="text-xs font-bold gap-1.5 bg-purple-600 hover:bg-purple-700 text-white">
                    <Save className="h-3.5 w-3.5" /> Save Leadership Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        <div className="space-y-6">
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-2 border-b border-neutral-150 dark:border-slate-800/60">
              <CardTitle className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-purple-600" />
                Pod Leadership Scope
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 text-xs text-neutral-600 dark:text-neutral-400 space-y-2 leading-relaxed">
              <p>
                In the <strong>{isDeliveryHead ? "Delivery Head" : "Pod Lead"}</strong> perspective, you oversee requisition pipelines, submission reviews, and recruiter team allocation.
              </p>
              <div className="p-2.5 rounded bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-[11.5px] space-y-1 text-purple-900 dark:text-purple-300">
                <div>• Manage Pod Team Allocations</div>
                <div>• Review Team Performance &amp; Submissions</div>
                <div>• Distribute Requisitions to Recruiters</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
