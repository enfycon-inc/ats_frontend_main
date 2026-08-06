"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { atsApi } from "@/lib/ats-api";
import { Globe, Building2, Trash2, Plus, ExternalLink, RefreshCw, Users, MapPin, Briefcase, CheckCircle2, ShieldAlert } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { getBaseDomain } from "@/utils/subdomain-helper";

interface DomainMapping {
  id: string | number;
  domain_name: string;
  is_primary: boolean;
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
  const [subdomain, setSubdomain] = useState("");
  const [originalSubdomain, setOriginalSubdomain] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [podSystemEnabled, setPodSystemEnabled] = useState(true);
  const [togglingPodSystem, setTogglingPodSystem] = useState(false);
  const [candidatePoolMode, setCandidatePoolMode] = useState("COMBINED_MARKET");
  const [updatingPoolMode, setUpdatingPoolMode] = useState(false);
  const [customDomains, setCustomDomains] = useState<DomainMapping[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSubdomain, setSavingSubdomain] = useState(false);
  const [addingDomain, setAddingDomain] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Branches State
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [branchState, setBranchState] = useState("");
  const [branchCountry, setBranchCountry] = useState("India");
  const [addingBranch, setAddingBranch] = useState(false);

  // Business Units State
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitItem[]>([]);
  const [showAddBU, setShowAddBU] = useState(false);
  const [buName, setBuName] = useState("");
  const [buCode, setBuCode] = useState("");
  const [buMarket, setBuMarket] = useState("US");
  const [buCurrency, setBuCurrency] = useState("USD");
  const [addingBU, setAddingBU] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const user = atsApi.auth.getCurrentUser();
      if (user) {
        setCompanyName(user.companyName || "My Company Workspace");
        const canEdit = user.roles?.includes("ADMIN") || user.roles?.includes("SUPER_ADMIN");
        setIsAdmin(!!canEdit);
        setIsSuperAdmin(!!user.roles?.includes("SUPER_ADMIN"));
      }
      
      const profile = await atsApi.auth.me();
      if (profile) {
        if (profile.tenant) {
          setCompanyName(profile.tenant.name || "");
          setSubdomain(profile.tenant.domain || "");
          setOriginalSubdomain(profile.tenant.domain || "");
        }
        if (profile.podSystemEnabled !== undefined) {
          setPodSystemEnabled(profile.podSystemEnabled);
        }
        if (profile.candidatePoolMode) {
          setCandidatePoolMode(profile.candidatePoolMode);
        }
        if (profile.roles) {
          const canEdit = profile.roles.includes("ADMIN") || profile.roles.includes("SUPER_ADMIN");
          setIsAdmin(!!canEdit);
          setIsSuperAdmin(!!profile.roles.includes("SUPER_ADMIN"));
        }
      }
      
      // Load custom domains, branches, business units
      const [domainsRes, branchesRes, buRes] = await Promise.all([
        atsApi.auth.listMyDomains().catch(() => []),
        atsApi.branches.list().catch(() => []),
        atsApi.businessUnits.list().catch(() => []),
      ]);

      setCustomDomains(domainsRes || []);
      setBranches(branchesRes || []);
      setBusinessUnits(buRes || []);
    } catch (err: any) {
      toast.error("Failed to load workspace settings: " + err.message);
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
          ? "Recruitment Pod system enabled for workspace."
          : "Recruitment Pod system disabled for workspace."
      );
    } catch (err: any) {
      toast.error("Failed to update Pod system setting: " + err.message);
    } finally {
      setTogglingPodSystem(false);
    }
  };

  const handlePoolModeChange = async (mode: string) => {
    try {
      setUpdatingPoolMode(true);
      await atsApi.auth.updateMySettings({ candidatePoolMode: mode });
      setCandidatePoolMode(mode);
      toast.success("Candidate CV pool access policy updated successfully!");
    } catch (err: any) {
      toast.error("Failed to update candidate pool setting: " + err.message);
    } finally {
      setUpdatingPoolMode(false);
    }
  };

  const handleSaveSubdomain = async () => {
    const slug = subdomain.toLowerCase().trim();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return toast.error("Subdomain must contain only lowercase letters, numbers, and hyphens.");
    }
    if (slug === originalSubdomain) {
      return toast.success("Subdomain is already up to date.");
    }

    try {
      setSavingSubdomain(true);
      await atsApi.auth.updateMySubdomain(slug);
      toast.success("Workspace subdomain updated successfully!");
      
      const base = getBaseDomain();
      const protocol = window.location.protocol;
      window.location.href = `${protocol}//${slug}.${base}/company`;
    } catch (err: any) {
      toast.error("Failed to update subdomain: " + err.message);
    } finally {
      setSavingSubdomain(false);
    }
  };

  const handleAddDomain = async () => {
    const domain = newDomain.toLowerCase().trim();
    if (!domain || !/^[a-z0-9.-]+$/.test(domain) || domain.includes("..")) {
      return toast.error("Please enter a valid domain name (e.g. jobs.mycompany.com).");
    }

    try {
      setAddingDomain(true);
      const res = await atsApi.auth.addMyDomain(domain);
      setCustomDomains((prev) => [...prev, res]);
      setNewDomain("");
      toast.success(`Custom domain ${domain} mapped successfully!`);
    } catch (err: any) {
      toast.error("Failed to map custom domain: " + err.message);
    } finally {
      setAddingDomain(false);
    }
  };

  const handleDeleteDomain = async (domainId: string | number, domainName: string) => {
    if (!confirm(`Are you sure you want to remove the domain mapping for ${domainName}?`)) {
      return;
    }

    try {
      await atsApi.auth.deleteMyDomain(String(domainId));
      setCustomDomains((prev) => prev.filter((d) => d.id !== domainId));
      toast.success("Domain mapping removed.");
    } catch (err: any) {
      toast.error("Failed to remove domain: " + err.message);
    }
  };

  // Branch Handlers
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) {
      return toast.error("Branch name is required.");
    }
    try {
      setAddingBranch(true);
      const newBranch = await atsApi.branches.create({
        name: branchName.trim(),
        code: branchCode.trim() || undefined,
        city: branchCity.trim() || undefined,
        state: branchState.trim() || undefined,
        country: branchCountry.trim() || "India",
      });
      setBranches((prev) => [...prev, newBranch]);
      setBranchName("");
      setBranchCode("");
      setBranchCity("");
      setBranchState("");
      setShowAddBranch(false);
      toast.success(`Branch "${newBranch.name}" created successfully!`);
    } catch (err: any) {
      toast.error("Failed to create branch: " + err.message);
    } finally {
      setAddingBranch(false);
    }
  };

  const handleDeleteBranch = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete branch "${name}"?`)) return;
    try {
      await atsApi.branches.delete(id);
      setBranches((prev) => prev.filter((b) => b.id !== id));
      toast.success(`Branch "${name}" deleted.`);
    } catch (err: any) {
      toast.error("Failed to delete branch: " + err.message);
    }
  };

  // Business Unit Handlers
  const handleCreateBU = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buName.trim()) {
      return toast.error("Business Unit name is required.");
    }
    try {
      setAddingBU(true);
      const newBU = await atsApi.businessUnits.create({
        name: buName.trim(),
        code: buCode.trim() || undefined,
        market: buMarket,
        currency: buCurrency,
      });
      setBusinessUnits((prev) => [...prev, newBU]);
      setBuName("");
      setBuCode("");
      setShowAddBU(false);
      toast.success(`Business Unit "${newBU.name}" created successfully!`);
    } catch (err: any) {
      toast.error("Failed to create Business Unit: " + err.message);
    } finally {
      setAddingBU(false);
    }
  };

  const handleDeleteBU = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete Business Unit "${name}"?`)) return;
    try {
      await atsApi.businessUnits.delete(id);
      setBusinessUnits((prev) => prev.filter((b) => b.id !== id));
      toast.success(`Business Unit "${name}" deleted.`);
    } catch (err: any) {
      toast.error("Failed to delete Business Unit: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-neutral-100 dark:bg-[#1e2734]">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">Company Settings</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded shadow-sm">
          <RefreshCw className="animate-spin h-8 w-8 text-primary mb-3" />
          <p className="text-sm text-neutral-500">Loading workspace settings...</p>
        </div>
      </div>
    );
  }

  const base = getBaseDomain();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-100 dark:bg-[#1e2734]">
      <SiteBreadcrumb />
      
      {/* Page Title */}
      <div className="mb-4 mt-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Workspace &amp; Organization Settings
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">Manage your corporate branches, business unit divisions, tenant domains, and pod system.</p>
        </div>
      </div>

      {!isAdmin && (
        <div className="mb-4 border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <span>🔒 <strong>Read-Only Mode:</strong> You are logged in with role permissions that allow viewing only. Only Workspace Administrators can modify company settings.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Branches & Business Units */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Branch Locations Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Office Branch Locations ({branches.length})
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500 mt-0.5">
                  Define geographic office branches (e.g. Hyderabad Office, Vizag Office) for seat scoping and analytics.
                </CardDescription>
              </div>
              {isAdmin && (
                <Button
                  onClick={() => setShowAddBranch(!showAddBranch)}
                  size="sm"
                  className="h-8 text-xs font-bold px-3 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Branch
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              
              {/* Add Branch Form */}
              {showAddBranch && (
                <form onSubmit={handleCreateBranch} className="p-3 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">New Branch Office</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Branch Name *</Label>
                      <Input
                        type="text"
                        placeholder="e.g. Hyderabad Branch"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        className="h-8 text-xs font-medium bg-white dark:bg-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Branch Code</Label>
                      <Input
                        type="text"
                        placeholder="e.g. HYD"
                        value={branchCode}
                        onChange={(e) => setBranchCode(e.target.value)}
                        className="h-8 text-xs font-medium bg-white dark:bg-slate-900 uppercase"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">City</Label>
                      <Input
                        type="text"
                        placeholder="e.g. Hyderabad"
                        value={branchCity}
                        onChange={(e) => setBranchCity(e.target.value)}
                        className="h-8 text-xs font-medium bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Country</Label>
                      <Input
                        type="text"
                        placeholder="e.g. India"
                        value={branchCountry}
                        onChange={(e) => setBranchCountry(e.target.value)}
                        className="h-8 text-xs font-medium bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAddBranch(false)} className="h-7 text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={addingBranch} className="h-7 text-xs font-bold">
                      {addingBranch ? "Saving..." : "Save Branch"}
                    </Button>
                  </div>
                </form>
              )}

              {/* Branches List */}
              {branches.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-neutral-250 dark:border-slate-800 rounded bg-neutral-50/50 dark:bg-slate-950/5 text-xs text-neutral-500 font-medium">
                  No office branches defined yet. Click "Add Branch" to set up your primary office location.
                </div>
              ) : (
                <div className="border border-neutral-200 dark:border-slate-800/80 rounded divide-y divide-neutral-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {branches.map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-3 py-3 hover:bg-neutral-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 font-bold text-xs">
                          {b.code || b.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">{b.name}</span>
                            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px] font-semibold px-1.5 py-0.2 rounded border border-emerald-200/40">
                              Active Location
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {b.city ? `${b.city}, ${b.country || 'India'}` : (b.country || 'India')} • {b.usersCount} Assigned Recruiters • {b.jobsCount} Jobs
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteBranch(b.id, b.name)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                          title="Delete Branch"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Business Units (Divisions) Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                  Business Units &amp; Operating Divisions ({businessUnits.length})
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500 mt-0.5">
                  Separate US IT Staffing from Domestic Staffing for market-specific tax and recruitment workflows.
                </CardDescription>
              </div>
              {isAdmin && (
                <Button
                  onClick={() => setShowAddBU(!showAddBU)}
                  size="sm"
                  className="h-8 text-xs font-bold px-3 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Division
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-4">

              {/* Add BU Form */}
              {showAddBU && (
                <form onSubmit={handleCreateBU} className="p-3 border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">New Business Unit Division</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Division Name *</Label>
                      <Input
                        type="text"
                        placeholder="e.g. US IT Staffing Division"
                        value={buName}
                        onChange={(e) => setBuName(e.target.value)}
                        className="h-8 text-xs font-medium bg-white dark:bg-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Code</Label>
                      <Input
                        type="text"
                        placeholder="e.g. USIT"
                        value={buCode}
                        onChange={(e) => setBuCode(e.target.value)}
                        className="h-8 text-xs font-medium bg-white dark:bg-slate-900 uppercase"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Market Segment</Label>
                      <select
                        value={buMarket}
                        onChange={(e) => {
                          setBuMarket(e.target.value);
                          setBuCurrency(e.target.value === "INDIA" ? "INR" : "USD");
                        }}
                        className="w-full h-8 px-2 text-xs border rounded bg-white dark:bg-slate-900 border-neutral-300 dark:border-slate-700 font-medium"
                      >
                        <option value="US">US IT Staffing (USD, W2/C2C, Visa)</option>
                        <option value="INDIA">India Domestic Staffing (INR, CTC, PAN)</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Default Currency</Label>
                      <Input
                        type="text"
                        value={buCurrency}
                        onChange={(e) => setBuCurrency(e.target.value)}
                        className="h-8 text-xs font-medium bg-white dark:bg-slate-900 uppercase"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAddBU(false)} className="h-7 text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={addingBU} className="h-7 text-xs font-bold">
                      {addingBU ? "Saving..." : "Save Division"}
                    </Button>
                  </div>
                </form>
              )}

              {/* BU List */}
              {businessUnits.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-neutral-250 dark:border-slate-800 rounded bg-neutral-50/50 dark:bg-slate-950/5 text-xs text-neutral-500 font-medium">
                  No business units defined yet. Click "Add Division" to separate your market teams.
                </div>
              ) : (
                <div className="border border-neutral-200 dark:border-slate-800/80 rounded divide-y divide-neutral-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {businessUnits.map((bu) => (
                    <div key={bu.id} className="flex items-center justify-between px-3 py-3 hover:bg-neutral-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {bu.code || bu.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">{bu.name}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                              bu.market === 'INDIA' 
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400' 
                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400'
                            }`}>
                              {bu.market === 'INDIA' ? 'India Domestic Market (INR)' : 'US IT Market (USD)'}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Currency: {bu.currency} • {bu.usersCount} Active Recruiters • {bu.jobsCount} Requisitions
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteBU(bu.id, bu.name)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                          title="Delete Business Unit"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subdomain settings card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
              <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Workspace Subdomain</CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Your default access link. You can customize the subdomain slug.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subdomain-slug" className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Subdomain Slug
                </Label>
                <div className="flex items-center">
                  <Input
                    id="subdomain-slug"
                    type="text"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    disabled={!isSuperAdmin || savingSubdomain}
                    className="rounded-r-none font-semibold text-xs h-9 bg-neutral-50 dark:bg-slate-950/20 border-r-0 focus:ring-0 focus:border-neutral-300 dark:focus:border-slate-700"
                    placeholder="company-name"
                  />
                  <div className="h-9 px-3 border border-neutral-250 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800 flex items-center text-xs font-bold text-neutral-500 dark:text-neutral-400 rounded-r border-l-0">
                    .{base.replace(":3000", "")}
                  </div>
                </div>
                <p className="text-[10px] text-neutral-500">
                  {!isSuperAdmin
                    ? "🔒 Subdomain slug changes require Enfycon Platform Administrator (SUPER_ADMIN) authorization."
                    : "Warning: Changing this slug will modify the URL you and your recruiters use to log in."}
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-150 dark:border-slate-800/40 flex justify-between items-center">
                <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                  Current workspace URL: 
                  <a 
                    href={`${window.location.protocol}//${originalSubdomain}.${base}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center gap-0.5"
                  >
                    {originalSubdomain}.{base}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Button 
                  onClick={handleSaveSubdomain} 
                  disabled={!isSuperAdmin || savingSubdomain || subdomain === originalSubdomain}
                  className="h-8 text-xs font-bold px-4"
                >
                  {savingSubdomain ? "Saving..." : "Update Subdomain"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Candidate CV Pool & Branch Sharing Control Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
              <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                Candidate CV Pool &amp; Branch Sharing Control
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500 mt-1">
                Configure how candidate search and CV records are shared across office branches in this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                candidatePoolMode === 'COMBINED_MARKET' 
                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-800' 
                  : 'border-neutral-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800/30'
              }`}>
                <input
                  type="radio"
                  name="candidatePoolMode"
                  value="COMBINED_MARKET"
                  checked={candidatePoolMode === 'COMBINED_MARKET'}
                  disabled={!isAdmin || updatingPoolMode}
                  onChange={() => handlePoolModeChange('COMBINED_MARKET')}
                  className="mt-1 accent-emerald-600"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      🌐 Combined Market Pools (Recommended Default)
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300/50">
                      DEFAULT
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    All Domestic branches (India) share the Domestic CV pool (<code className="text-[10px]">market = INDIA</code>). All USIT branches share the USIT CV pool (<code className="text-[10px]">market = US</code>). Operations remain branch-isolated.
                  </p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                candidatePoolMode === 'STRICT_BRANCH' 
                  ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-800' 
                  : 'border-neutral-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800/30'
              }`}>
                <input
                  type="radio"
                  name="candidatePoolMode"
                  value="STRICT_BRANCH"
                  checked={candidatePoolMode === 'STRICT_BRANCH'}
                  disabled={!isAdmin || updatingPoolMode}
                  onChange={() => handlePoolModeChange('STRICT_BRANCH')}
                  className="mt-1 accent-amber-600"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      🔒 Strict Branch Isolation
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Recruiters can only search and view candidate CVs created within or assigned to their home branch. Cross-branch CV search is restricted.
                  </p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                candidatePoolMode === 'ALL_BRANCHES' 
                  ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-800' 
                  : 'border-neutral-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800/30'
              }`}>
                <input
                  type="radio"
                  name="candidatePoolMode"
                  value="ALL_BRANCHES"
                  checked={candidatePoolMode === 'ALL_BRANCHES'}
                  disabled={!isAdmin || updatingPoolMode}
                  onChange={() => handlePoolModeChange('ALL_BRANCHES')}
                  className="mt-1 accent-indigo-600"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      🏢 Open Workspace Sharing
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    All recruiters across all branches and markets can search and view all candidate CVs in the tenant workspace.
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Pod System Settings Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Recruitment Pod System
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500 mt-1">
                  Enable or disable round-robin delivery team pod routing for job requisitions in this company workspace.
                </CardDescription>
              </div>
              <Switch
                checked={podSystemEnabled}
                disabled={!isAdmin || togglingPodSystem}
                onCheckedChange={handleTogglePodSystem}
              />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-950/20">
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${podSystemEnabled ? "bg-emerald-500" : "bg-slate-400"}`} />
                <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Status:{" "}
                  <span className={`font-bold ${podSystemEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500"}`}>
                    {podSystemEnabled ? "Pods Enabled (Active Round-Robin Assignment)" : "Pods Disabled"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Custom Domains & DNS Instructions Info Card */}
        <div className="space-y-6">
          
          {/* Custom Domains settings card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
              <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Custom Domains</CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Point your own custom domain (e.g. `careers.mycompany.com`) directly to this ATS workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              
              {/* Add Custom Domain Form */}
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    disabled={!isAdmin || addingDomain}
                    placeholder="e.g. careers.mycompany.com"
                    className="font-semibold text-xs h-9 bg-neutral-50 dark:bg-slate-950/20"
                  />
                </div>
                <Button
                  onClick={handleAddDomain}
                  disabled={!isAdmin || addingDomain || !newDomain.trim()}
                  className="h-9 text-xs font-bold px-4 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Map Domain
                </Button>
              </div>

              {/* Mapped Domains List */}
              <div className="pt-2">
                <Label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-2">
                  Mapped Domains ({customDomains.length})
                </Label>
                {customDomains.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-neutral-250 dark:border-slate-800 rounded bg-neutral-50/50 dark:bg-slate-950/5 text-xs text-neutral-500 font-medium">
                    No custom domains linked yet. Type your custom domain above to map it.
                  </div>
                ) : (
                  <div className="border border-neutral-200 dark:border-slate-800/80 rounded divide-y divide-neutral-200 dark:divide-slate-800 bg-neutral-50/20 dark:bg-slate-950/5">
                    {customDomains.map((domain) => (
                      <div key={domain.id} className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-neutral-500" />
                          <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">
                            {domain.domain_name}
                          </span>
                          {domain.is_primary ? (
                            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-400 text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-emerald-200/50">
                              Primary Subdomain
                            </span>
                          ) : (
                            <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/25 dark:text-blue-400 text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-blue-200/50">
                              Custom Alias
                            </span>
                          )}
                        </div>

                        {!domain.is_primary && isAdmin && (
                          <button
                            onClick={() => handleDeleteDomain(domain.id, domain.domain_name)}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                            title="Delete Mapping"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* DNS Setup Instructions Info Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
              <CardTitle className="text-sm font-bold text-neutral-850 dark:text-neutral-150 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-indigo-500" /> DNS Instructions
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                How to configure your domain mapping correctly.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
                To link a custom domain to your workspace, you must configure your domain's DNS settings at your registrar (e.g. Cloudflare, GoDaddy, Namecheap).
              </p>

              <div className="space-y-3 bg-neutral-50 dark:bg-slate-950/20 p-3 rounded border border-neutral-200 dark:border-slate-800/60 text-xs">
                <div>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 block mb-0.5">Option A: CNAME Record (Recommended)</span>
                  <p className="text-neutral-500 text-[11px] mb-1.5">For subdomains like <code className="bg-neutral-200 dark:bg-slate-800 px-1 py-0.2 rounded font-semibold text-[10px]">jobs.yourcompany.com</code></p>
                  <table className="w-full text-left font-sans text-[10px]">
                    <thead>
                      <tr className="border-b border-neutral-350 text-neutral-600 dark:text-neutral-400">
                        <th className="pb-1 font-bold">Type</th>
                        <th className="pb-1 font-bold">Host</th>
                        <th className="pb-1 font-bold">Points To</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-neutral-850 dark:text-neutral-200 font-semibold">
                        <td className="py-1">CNAME</td>
                        <td className="py-1">jobs</td>
                        <td className="py-1">enfycon.com</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-neutral-200 dark:border-slate-800/60">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 block mb-0.5">Option B: A Record</span>
                  <p className="text-neutral-500 text-[11px] mb-1.5">For root domains like <code className="bg-neutral-200 dark:bg-slate-800 px-1 py-0.2 rounded font-semibold text-[10px]">yourcompany.com</code></p>
                  <table className="w-full text-left font-sans text-[10px]">
                    <thead>
                      <tr className="border-b border-neutral-350 text-neutral-600 dark:text-neutral-400">
                        <th className="pb-1 font-bold">Type</th>
                        <th className="pb-1 font-bold">Host</th>
                        <th className="pb-1 font-bold">Points To</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-neutral-850 dark:text-neutral-200 font-semibold">
                        <td className="py-1">A</td>
                        <td className="py-1">@</td>
                        <td className="py-1">192.0.2.1 <span className="font-normal text-[9px] text-neutral-400">(Your Server IP)</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-950/15 border border-blue-200/30 dark:border-blue-900/30 p-2.5 rounded text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed font-medium">
                Note: DNS changes can take anywhere from a few minutes up to 24 hours to propagate worldwide. Once active, visitors accessing the custom domain will load this workspace instantly.
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
