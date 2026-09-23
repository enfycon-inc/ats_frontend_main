"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { atsApi } from "@/lib/ats-api";
import {
  Building2,
  Lock,
  Globe,
  Mail,
  Sliders,
  RefreshCw,
  Briefcase,
  Users,
  Target,
  Sparkles,
  Save,
  CheckCircle2,
  Filter,
  Bell,
  Award,
} from "lucide-react";
import toast from "react-hot-toast";
import { getBaseDomain } from "@/utils/subdomain-helper";
import { isRoleAdmin, resolveActiveSystemRole, CustomRoleDefinition } from "@/lib/role-permissions";
import { GeneralTab } from "@/components/company/tabs/general-tab";
import { AuthTab } from "@/components/company/tabs/auth-tab";
import { DomainsTab, DomainMapping } from "@/components/company/tabs/domains-tab";
import { EmailTab } from "@/components/company/tabs/email-tab";
import { HiringTab } from "@/components/company/tabs/hiring-tab";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";


export interface BranchItem { id: string; name: string; code: string; location: string; status: string; unitsCount: number; staffCount: number; reqsCount: number; }
export interface BusinessUnitItem { id: string; branchId: string; name: string; code: string; market: string; shiftTiming: string; staffCount: number; reqsCount: number; status: string; }

export default function CompanySettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] bg-neutral-100 dark:bg-[#1e2734]">
          <RefreshCw className="animate-spin h-8 w-8 text-primary mb-3" />
          <p className="text-sm text-neutral-500">Loading settings...</p>
        </div>
      }
    >
      <CompanySettingsContent />
    </Suspense>
  );
}

function CompanySettingsContent() {
  const [profile, setProfile] = useState<any>(null);
  const [availableRoles, setAvailableRoles] = useState<CustomRoleDefinition[]>([]);
  const [overrideRole, setOverrideRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Tenant Admin State
  const [subdomain, setSubdomain] = useState("");
  const [originalSubdomain, setOriginalSubdomain] = useState("");
  const [companyName, setCompanyName] = useState("");
    const [siteTitle, setSiteTitle] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [savingCompanyProfile, setSavingCompanyProfile] = useState(false);
  const [podSystemEnabled, setPodSystemEnabled] = useState(true);
  const [togglingPodSystem, setTogglingPodSystem] = useState(false);
  const [candidatePoolMode, setCandidatePoolMode] = useState("COMBINED_MARKET");
  const [updatingPoolMode, setUpdatingPoolMode] = useState(false);
  const [jobCodePattern, setJobCodePattern] = useState("{BRANCH}-{UNIT}-{YYMMDD}-{SEQ}");
  const [enforceJobCodePattern, setEnforceJobCodePattern] = useState(false);
  const [updatingJobCodePattern, setUpdatingJobCodePattern] = useState(false);
  const [customDomains, setCustomDomains] = useState<DomainMapping[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [savingSubdomain, setSavingSubdomain] = useState(false);
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);

  // Branches
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [branchState, setBranchState] = useState("");
  const [branchCountry, setBranchCountry] = useState("India");
  const [addingBranch, setAddingBranch] = useState(false);

  // Business Units
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitItem[]>([]);
  const [showAddBU, setShowAddBU] = useState(false);
  const [buName, setBuName] = useState("");
  const [buCode, setBuCode] = useState("");
  const [buMarket, setBuMarket] = useState("US");
  const [buCurrency, setBuCurrency] = useState("USD");
  const [buBranchId, setBuBranchId] = useState("");
  const [buShiftTiming, setBuShiftTiming] = useState("General Shift");
  const [buWorkStartTime, setBuWorkStartTime] = useState("09:00");
  const [buWorkEndTime, setBuWorkEndTime] = useState("18:00");
  const [buTimezone, setBuTimezone] = useState("Asia/Kolkata");
  const [addingBU, setAddingBU] = useState(false);

  useEffect(() => {
    atsApi.auth
      .listRoles()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableRoles(data);
        }
      })
      .catch(() => {});
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
        atsApi.auth.listRoles().catch(() => []),
      ]);

      if (profileData) {
        setProfile(profileData);
        if (profileData.tenant) {
          setCompanyName(profileData.tenant.name || "");
          setSiteTitle(profileData.tenant.siteTitle || "");
          setLogoUrl(profileData.tenant.logoUrl || "");
          setSubdomain(profileData.tenant.domain || "");
          setOriginalSubdomain(profileData.tenant.domain || "");
          if (profileData.tenant.jobCodePattern !== undefined) setJobCodePattern(profileData.tenant.jobCodePattern || "{BRANCH}-{UNIT}-{YYMMDD}-{SEQ}");
          if (profileData.tenant.enforceJobCodePattern !== undefined) setEnforceJobCodePattern(profileData.tenant.enforceJobCodePattern || false);
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

  const handleUpdateJobCodePattern = async (pattern: string, enforce: boolean) => {
    try {
      setUpdatingJobCodePattern(true);
      await atsApi.auth.updateMySettings({ jobCodePattern: pattern, enforceJobCodePattern: enforce });
      setJobCodePattern(pattern);
      setEnforceJobCodePattern(enforce);
      toast.success("Job code standardization settings updated.");
    } catch (err: any) {
      toast.error("Failed to update job code settings: " + err.message);
    } finally {
      setUpdatingJobCodePattern(false);
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

  
  const handleSaveCompanyProfile = async () => {
    try {
      setSavingCompanyProfile(true);
      await atsApi.auth.updateMySettings({ 
        name: companyName,
        siteTitle: siteTitle,
        logoUrl: logoUrl
      });
      
      if (siteTitle) {
        document.title = siteTitle;
      }
      toast.success("Company profile saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save company profile");
    } finally {
      setSavingCompanyProfile(false);
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

  const handleVerifyDomain = async (domainName: string) => {
    try {
      setVerifyingDomain(domainName);
      const res = await atsApi.auth.verifyMyDomain(domainName);
      if (res.verified) {
        toast.success(res.message || `Domain ${domainName} verified and SSL activated!`);
      } else {
        toast(res.message || "DNS verification in progress. Please ensure TXT/CNAME records are created.", {
          icon: "ℹ️",
        });
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
        branchId: buBranchId || undefined,
        code: buCode.trim() || undefined,
        market: buMarket,
        currency: buCurrency,
        shiftTiming: buShiftTiming || undefined,
        workStartTime: buWorkStartTime || undefined,
        workEndTime: buWorkEndTime || undefined,
        timezone: buTimezone || undefined,
      });
      toast.success(`Branch unit "${res.name}" created!`);
      const [updatedBranches, updatedBUs] = await Promise.all([
        atsApi.branches.list().catch(() => []),
        atsApi.businessUnits.list().catch(() => []),
      ]);
      setBranches(updatedBranches || []);
      setBusinessUnits(updatedBUs || []);
      setShowAddBU(false);
      setBuName("");
      setBuCode("");
      setBuBranchId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create business unit.");
    } finally {
      setAddingBU(false);
    }
  };

  const handleDeleteBU = async (buId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete branch unit "${name}"?`)) return;
    try {
      await atsApi.businessUnits.delete(buId);
      toast.success(`Branch unit "${name}" deleted.`);
      const [updatedBranches, updatedBUs] = await Promise.all([
        atsApi.branches.list().catch(() => []),
        atsApi.businessUnits.list().catch(() => []),
      ]);
      setBranches(updatedBranches || []);
      setBusinessUnits(updatedBUs || []);
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
      {/* Role-Specific Settings View Rendering */}
      {systemRole === "ADMIN" || systemRole === "TENANT_ADMIN" || systemRole === "SUPER_ADMIN" ? (
        <TenantAdminSettingsView
          profile={profile}
          companyName={companyName}
          setCompanyName={setCompanyName}
          siteTitle={siteTitle}
          setSiteTitle={setSiteTitle}
          logoUrl={logoUrl}
          setLogoUrl={setLogoUrl}
          savingCompanyProfile={savingCompanyProfile}
          handleSaveCompanyProfile={handleSaveCompanyProfile}
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
          jobCodePattern={jobCodePattern}
          enforceJobCodePattern={enforceJobCodePattern}
          updatingJobCodePattern={updatingJobCodePattern}
          handleUpdateJobCodePattern={handleUpdateJobCodePattern}
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
          buBranchId={buBranchId}
          setBuBranchId={setBuBranchId}
          buShiftTiming={buShiftTiming}
          setBuShiftTiming={setBuShiftTiming}
          buWorkStartTime={buWorkStartTime}
          setBuWorkStartTime={setBuWorkStartTime}
          buWorkEndTime={buWorkEndTime}
          setBuWorkEndTime={setBuWorkEndTime}
          buTimezone={buTimezone}
          setBuTimezone={setBuTimezone}
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
        <PodLeadSettingsView
          profile={profile}
          activeRoleName={activeRoleName}
          isDeliveryHead={systemRole === "DELIVERY_HEAD"}
        />
      ) : (
        <RecruiterSettingsView profile={profile} activeRoleName={activeRoleName} />
      )}
    </div>
  );
}

// ─── 1. TENANT ADMIN WORKSPACE SETTINGS VIEW (DECOUPLED TABBED LAYOUT) ────────
function TenantAdminSettingsView(props: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const base = getBaseDomain();

  // Tab State synced with URL query (?tab=general|auth|domains|email|hiring)
  const currentTab = searchParams.get("tab") || "general";

  const tabs = [
    { id: "general", label: "General & Structure", icon: Building2 },
    { id: "auth", label: "Authentication & SSO", icon: Lock },
    { id: "domains", label: "Custom Domains", icon: Globe },
    { id: "email", label: "Email Integration", icon: Mail },
    { id: "hiring", label: "Hiring & Pod Rules", icon: Sliders },
  ];

  const handleSelectTab = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`/company?${params.toString()}`);
  };

  const tabDescriptions: Record<string, string> = {
    general: "Manage your corporate branches, business unit divisions, and tenant workspace subdomain.",
    auth: "Configure employee sign-in methods, Microsoft 365 / Google SSO, and domain isolation policies.",
    domains: "Map custom external domains (e.g. careers.company.com) with automated DNS verification and SSL.",
    email: "Configure outbound transactional email delivery strategies, DNS authentication, and SMTP.",
    hiring: "Set candidate CV pool sharing boundaries, recruitment pod dispatch, and stage remark templates.",
  };

  return (
    <div className="space-y-4">
      {/* Top Tab Switcher Pills */}
      <div className="flex items-center pt-1 pb-1">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-200/70 dark:bg-slate-800/80 rounded-xl border border-neutral-250 dark:border-slate-700/80 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-white dark:bg-slate-900 text-neutral-900 dark:text-neutral-100 shadow-xs border border-neutral-200/90 dark:border-slate-700 font-bold"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-neutral-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Decoupled Tab Views */}
      <div className="pt-2">
        {currentTab === "general" && (
          <GeneralTab
            companyName={props.companyName}
            setCompanyName={props.setCompanyName}
            siteTitle={props.siteTitle}
            setSiteTitle={props.setSiteTitle}
            logoUrl={props.logoUrl}
            setLogoUrl={props.setLogoUrl}
            savingCompanyProfile={props.savingCompanyProfile}
            handleSaveCompanyProfile={props.handleSaveCompanyProfile}
            subdomain={props.subdomain}
            setSubdomain={props.setSubdomain}
            originalSubdomain={props.originalSubdomain}
            savingSubdomain={props.savingSubdomain}
            handleSaveSubdomain={props.handleSaveSubdomain}
            isSuperAdmin={props.isSuperAdmin}
            base={base}
          />
        )}

        {currentTab === "auth" && (
          <AuthTab
            tenantId={props.profile?.tenantId}
            subdomain={props.subdomain || props.originalSubdomain}
            companyName={props.companyName}
          />
        )}

        {currentTab === "domains" && (
          <DomainsTab
            customDomains={props.customDomains}
            subdomain={props.subdomain}
            newDomain={props.newDomain}
            setNewDomain={props.setNewDomain}
            addingDomain={props.addingDomain}
            handleAddDomain={props.handleAddDomain}
            handleDeleteDomain={props.handleDeleteDomain}
            handleVerifyDomain={props.handleVerifyDomain}
            verifyingDomain={props.verifyingDomain}
            base={base}
          />
        )}

        {currentTab === "email" && (
          <EmailTab
            tenantId={props.profile?.tenantId}
            subdomain={props.subdomain || props.originalSubdomain}
            companyName={props.companyName}
            userEmail={props.profile?.email}
          />
        )}

        {currentTab === "hiring" && (
          <HiringTab
            candidatePoolMode={props.candidatePoolMode}
            updatingPoolMode={props.updatingPoolMode}
            handleUpdatePoolMode={props.handleUpdatePoolMode}
            podSystemEnabled={props.podSystemEnabled}
            togglingPodSystem={props.togglingPodSystem}
            handleTogglePodSystem={props.handleTogglePodSystem}
            jobCodePattern={props.jobCodePattern}
            enforceJobCodePattern={props.enforceJobCodePattern}
            updatingJobCodePattern={props.updatingJobCodePattern}
            handleUpdateJobCodePattern={props.handleUpdateJobCodePattern}
          />
        )}
      </div>
    </div>
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
  const [signature, setSignature] = useState(
    `Best Regards,\n${profile?.fullName || "Account Manager"}\nClient Solutions & Business Development\n${
      profile?.tenantDomain || "Enfycon"
    } ATS`
  );

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
                  <Briefcase className="h-4 w-4 text-emerald-600" />
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
function PodLeadSettingsView({
  profile,
  activeRoleName,
  isDeliveryHead,
}: {
  profile: any;
  activeRoleName: string;
  isDeliveryHead?: boolean;
}) {
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
