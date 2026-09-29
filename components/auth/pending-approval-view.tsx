"use client";

import React, { useState, useMemo } from "react";
import { 
  UserCircle, 
  Briefcase, 
  Users, 
  Building2,
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  Clock,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Crown,
  ShieldCheck,
  Check,
} from "lucide-react";
import { atsApi } from "@/lib/ats-api";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { signOut } from "next-auth/react";

interface PendingApprovalViewProps {
  initialRequestedRole?: string | null;
  userEmail?: string;
  userName?: string;
  tenantName?: string;
}

type RoleCategory = "EMPLOYEE" | "BRANCH_ADMIN" | "UNIT_ADMIN" | "TENANT_ADMIN";

const roleCategories = [
  {
    id: "EMPLOYEE" as RoleCategory,
    title: "Branch Employee / Staff",
    description: "Operational role within a branch business unit (Recruiter, Account Manager, Delivery Head, etc.)",
    icon: Users,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    borderHover: "hover:border-blue-400",
    badge: "Branch & Unit Required",
  },
  {
    id: "BRANCH_ADMIN" as RoleCategory,
    title: "Branch Administrator",
    description: "Executive and operational leadership of a branch office location.",
    icon: Building2,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    borderHover: "hover:border-purple-400",
    badge: "Branch Required",
  },
  {
    id: "UNIT_ADMIN" as RoleCategory,
    title: "Branch Unit Admin",
    description: "Leadership and delivery management for a specific branch unit.",
    icon: Briefcase,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    borderHover: "hover:border-emerald-400",
    badge: "Branch & Unit Required",
  },
  {
    id: "TENANT_ADMIN" as RoleCategory,
    title: "Workspace Administrator",
    description: "Company-wide executive administration across all branches and units.",
    icon: Crown,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    borderHover: "hover:border-amber-400",
    badge: "Company-Wide",
  },
];

export default function PendingApprovalView({
  initialRequestedRole,
  userEmail,
  userName,
  tenantName,
}: PendingApprovalViewProps) {
  const [requestedRole, setRequestedRole] = useState<string | null>(initialRequestedRole || null);
  const [roleCategory, setRoleCategory] = useState<RoleCategory>("EMPLOYEE");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [branches, setBranches] = useState<any[]>([]);
  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  React.useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    if (requestedRole) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            // If the user's role has been granted, requested_role will be null and isApproved will be true
            if (data?.user?.is_approved && data?.user?.requested_role === null) {
              window.location.reload();
            }
          }
        } catch (e) {}
      }, 1000 * 60 * 3); // 3 minutes
    }
    return () => clearInterval(pollInterval);
  }, [requestedRole]);

  React.useEffect(() => {
    let mounted = true;
    setIsLoadingLocations(true);
    Promise.all([
      atsApi.branches.list().catch(() => []),
      atsApi.businessUnits.list().catch(() => []),
      atsApi.auth.listRoles(undefined, true).catch(() => []),
    ]).then(([bList, uList, rList]) => {
      if (!mounted) return;
      setBranches(Array.isArray(bList) ? bList : []);
      setBusinessUnits(Array.isArray(uList) ? uList : []);
      setRolesList(Array.isArray(rList) ? rList : []);
      setIsLoadingLocations(false);
    });
    return () => { mounted = false; };
  }, []);

  const filteredUnits = useMemo(() => {
    if (!selectedBranchId) return [];
    return businessUnits.filter(u => u.branchId === selectedBranchId || u.branch_id === selectedBranchId);
  }, [businessUnits, selectedBranchId]);

  // Dynamically compute available roles for selected branch and unit
  const availableStaffRoles = useMemo(() => {
    if (!selectedBranchId || !selectedUnitId) return [];

    const customRolesForUnit = rolesList.filter(r => {
      if (r.isSystem) return false;
      const bId = r.branchId || r.branch_id;
      const uId = r.businessUnitId || r.business_unit_id;
      return bId === selectedBranchId && uId === selectedUnitId;
    });

    return customRolesForUnit.map(r => ({
      id: r.name,
      title: r.name,
      description: r.description,
    }));
  }, [rolesList, selectedBranchId, selectedUnitId]);

  const handleSubmitRole = async () => {
    let effectiveRole = selectedRole;
    let branchToSend: string | undefined = selectedBranchId || undefined;
    let unitToSend: string | undefined = selectedUnitId || undefined;

    if (roleCategory === "TENANT_ADMIN") {
      effectiveRole = "TENANT_ADMIN";
      branchToSend = undefined;
      unitToSend = undefined;
    } else if (roleCategory === "BRANCH_ADMIN") {
      if (!selectedBranchId) {
        toast.error("Please select a Branch Office");
        return;
      }
      effectiveRole = "BRANCH_ADMIN";
      unitToSend = undefined; // Branch admin does not belong to a specific unit
    } else if (roleCategory === "UNIT_ADMIN") {
      if (!selectedBranchId) {
        toast.error("Please select a Branch Office");
        return;
      }
      if (!selectedUnitId) {
        toast.error("Please select a Branch Unit");
        return;
      }
      effectiveRole = "UNIT_ADMIN";
    } else if (roleCategory === "EMPLOYEE") {
      if (!selectedBranchId) {
        toast.error("Please select a Branch Office first");
        return;
      }
      if (!selectedUnitId) {
        toast.error("Please select a Branch Unit");
        return;
      }
      if (!selectedRole) {
        toast.error("Please select your Role for this unit");
        return;
      }
      effectiveRole = selectedRole;
    }

    try {
      setIsSubmitting(true);
      await atsApi.auth.requestRole(effectiveRole, branchToSend, unitToSend);
      toast.success("Role request submitted successfully!");
      setRequestedRole(effectiveRole);
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error: any) {
      console.error("Error requesting role:", error);
      toast.error(error.message || "Failed to submit role request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await atsApi.auth.me();
      if (res?.isApproved) {
        toast.success("Your account has been approved! Redirecting...");
        window.location.href = "/dashboard";
        return;
      }
      toast("Account still pending approval. Please check again shortly.", { icon: "⏳" });
    } catch {
      window.location.reload();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    // Force clear cookies client-side as a fallback
    // Dynamically clear all chunked cookies (e.g. ats.session-token.0, ats.session-token.1)
    document.cookie.split(";").forEach((cookieStr) => {
      const name = cookieStr.split("=")[0].trim();
      if (name.includes("ats.session-token") || name.includes("next-auth.session-token")) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
    });
    await signOut({ callbackUrl: "/auth/login" });
  };

  // ─── STATE 1: Already Requested Role (Hang Tight Screen) ───────────────────
  if (requestedRole) {
    return (
      <div className="w-full p-4 py-8 md:py-12">
        <div className="w-full max-w-lg mx-auto p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-neutral-100 dark:border-slate-800 text-center animate-in fade-in zoom-in duration-300">
          <div className="flex justify-center mb-6 relative">
            <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full w-28 h-28 mx-auto animate-pulse" />
            <div className="w-24 h-24 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-3xl flex items-center justify-center relative shadow-inner">
              <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">
            Hang Tight!
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-base mb-2">
            We&apos;re preparing your workspace{tenantName ? ` at ${tenantName}` : ""}.
          </p>
          <p className="text-neutral-400 dark:text-neutral-500 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
            Please kindly wait while your designation is approved by your Workspace Administrator or Branch Administrator.
          </p>

          {/* Requested Role Badge */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-left">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
              Request Details
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                Requested Role:
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {requestedRole.replace(/_/g, " ")}
              </span>
            </div>

            {userEmail && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-xs text-neutral-500 font-mono">
                <span>Account:</span>
                <span className="truncate max-w-[220px]">{userEmail}</span>
              </div>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-xs">
              <span className="text-neutral-500">Status:</span>
              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                Pending Administrator Approval
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Checking Status...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Approval Status
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full sm:w-auto h-11 px-5 rounded-xl font-semibold border-slate-200 dark:border-slate-700 text-neutral-600 dark:text-neutral-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STATE 2: Select Role Screen (First-time unapproved user) ──────────────
  const isFormValid = (() => {
    if (roleCategory === "TENANT_ADMIN") return true;
    if (roleCategory === "BRANCH_ADMIN") return Boolean(selectedBranchId);
    if (roleCategory === "UNIT_ADMIN") return Boolean(selectedBranchId && selectedUnitId);
    if (roleCategory === "EMPLOYEE") return Boolean(selectedBranchId && selectedUnitId && selectedRole);
    return false;
  })();

  return (
    <div className="w-full p-4 py-8 md:py-12">
      <div className="w-full max-w-4xl mx-auto animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4">
            <ShieldAlert className="w-3.5 h-3.5" />
            Welcome to {tenantName || "EnfySync ATS"}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">
            Select Your Workspace Role
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm sm:text-base max-w-xl mx-auto">
            Choose your role category below. Staff members specify their branch, unit, and staffing role; branch administrators select their branch location.
          </p>
        </div>

        {/* Step 1: Role Categories Grid */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
            1. Select Role Category
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {roleCategories.map((cat) => {
              const isSelected = roleCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setRoleCategory(cat.id);
                    setSelectedRole("");
                    if (cat.id === "TENANT_ADMIN") {
                      setSelectedBranchId("");
                      setSelectedUnitId("");
                    } else if (cat.id === "BRANCH_ADMIN") {
                      setSelectedUnitId("");
                    }
                  }}
                  className={cn(
                    "relative flex flex-col items-start p-4 rounded-2xl transition-all duration-200 border-2 text-left group cursor-pointer",
                    isSelected
                      ? "border-indigo-600 bg-white dark:bg-slate-800 shadow-md ring-2 ring-indigo-600/10"
                      : cn(
                          "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800",
                          cat.borderHover
                        )
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", cat.bg)}>
                      <Icon className={cn("w-5 h-5", cat.color)} />
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">
                    {cat.title}
                  </h3>
                  <p className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed mb-2.5">
                    {cat.description}
                  </p>
                  <span className="mt-auto text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300">
                    {cat.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Location & Role Hierarchy Configuration */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 shadow-sm">
          {roleCategory === "TENANT_ADMIN" ? (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
              <Crown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                  Tenant Administrator Request
                </h4>
                <p className="text-xs text-amber-800/80 dark:text-amber-300 leading-relaxed">
                  Tenant Administrators operate at the company headquarters level with full permissions across all branch offices and business units. No specific branch or unit is assigned.
                </p>
              </div>
            </div>
          ) : roleCategory === "BRANCH_ADMIN" ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  2. Select Branch Office Location <span className="text-rose-500">*</span>
                </h4>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                Select the branch location you will be administering. Branch Administrators manage the entire branch office across all units.
              </p>
              <div className="max-w-md">
                <Select
                  value={selectedBranchId || undefined}
                  onValueChange={(val) => {
                    setSelectedBranchId(val);
                    setSelectedUnitId("");
                  }}
                  disabled={isLoadingLocations}
                >
                  <SelectTrigger className="w-full h-auto min-h-[44px] px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left">
                    <SelectValue placeholder={isLoadingLocations ? "Loading branch offices..." : branches.length === 0 ? "-- No Branch Offices Configured --" : "-- Select Branch Office * --"} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        <div className="flex flex-col text-left">
                          <span className="font-medium text-sm">{b.name}</span>
                          <span className="text-[10px] text-neutral-500 mt-0.5">
                            {[b.city, b.state, b.country].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : roleCategory === "UNIT_ADMIN" ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  2. Select Branch & Branch Unit <span className="text-rose-500">*</span>
                </h4>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                Branch Unit Admins manage delivery for a specific branch business unit. Both branch office and branch unit are required.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Branch Office <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={selectedBranchId || undefined}
                    onValueChange={(val) => {
                      setSelectedBranchId(val);
                      setSelectedUnitId("");
                    }}
                    disabled={isLoadingLocations}
                  >
                    <SelectTrigger className="w-full h-auto min-h-[44px] px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left">
                      <SelectValue placeholder={isLoadingLocations ? "Loading branch offices..." : branches.length === 0 ? "-- No Branch Offices Configured --" : "-- Select Branch Office * --"} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium text-sm">{b.name}</span>
                            <span className="text-[10px] text-neutral-500 mt-0.5">
                              {[b.city, b.state, b.country].filter(Boolean).join(", ")}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Branch Unit <span className="text-rose-500">*</span>
                  </label>
                  {selectedBranchId ? (
                    <select
                      value={selectedUnitId}
                      onChange={(e) => setSelectedUnitId(e.target.value)}
                      className="w-full h-11 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Select Branch Unit * --</option>
                      {filteredUnits.length > 0 ? (
                        filteredUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No branch units configured for this branch</option>
                      )}
                    </select>
                  ) : (
                    <select
                      disabled
                      className="w-full h-11 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-neutral-100 dark:bg-slate-800/40 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
                    >
                      <option>-- Select a Branch Office First --</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  2. Select Branch Office, Branch Unit & Staff Role <span className="text-rose-500">*</span>
                </h4>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                Staff members operate within a branch unit. Select your branch office first, then choose your branch unit, and select your specific role.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Branch Office <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={selectedBranchId || undefined}
                    onValueChange={(val) => {
                      setSelectedBranchId(val);
                      setSelectedUnitId("");
                      setSelectedRole("");
                    }}
                    disabled={isLoadingLocations}
                  >
                    <SelectTrigger className="w-full h-auto min-h-[44px] px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left">
                      <SelectValue placeholder={isLoadingLocations ? "Loading branch offices..." : branches.length === 0 ? "-- No Branch Offices Configured --" : "-- Select Branch Office * --"} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium text-sm">{b.name}</span>
                            <span className="text-[10px] text-neutral-500 mt-0.5">
                              {[b.city, b.state, b.country].filter(Boolean).join(", ")}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Branch Unit <span className="text-rose-500">*</span>
                  </label>
                  {selectedBranchId ? (
                    <select
                      value={selectedUnitId}
                      onChange={(e) => {
                        setSelectedUnitId(e.target.value);
                        setSelectedRole("");
                      }}
                      className="w-full h-11 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Select Branch Unit * --</option>
                      {filteredUnits.length > 0 ? (
                        filteredUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No branch units configured for this branch</option>
                      )}
                    </select>
                  ) : (
                    <select
                      disabled
                      className="w-full h-11 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-neutral-100 dark:bg-slate-800/40 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
                    >
                      <option>-- Select a Branch Office First --</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Dynamic Role Selection for Employee */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  3. Select Role <span className="text-rose-500">*</span>
                </label>
                {selectedBranchId && selectedUnitId ? (
                  availableStaffRoles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {availableStaffRoles.map((r) => {
                        const isChecked = selectedRole === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedRole(r.id)}
                            className={cn(
                              "p-3 rounded-xl border text-left transition-all duration-200 flex items-start gap-2.5 cursor-pointer select-none",
                              isChecked
                                ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-600/10"
                                : "border-slate-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800/60"
                            )}
                          >
                            <span className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                              isChecked ? "border-indigo-600 bg-indigo-600 text-white" : "border-neutral-300 dark:border-slate-600"
                            )}>
                              {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-neutral-900 dark:text-white">
                                {r.title}
                              </div>
                              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2">
                                {r.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-neutral-500 bg-neutral-50 dark:bg-slate-800 rounded-xl">
                      No roles configured for this unit yet.
                    </div>
                  )
                ) : (
                  <div className="p-3.5 text-center text-xs text-neutral-400 dark:text-neutral-500 bg-neutral-50/80 dark:bg-slate-800/40 border border-dashed border-neutral-200 dark:border-slate-800 rounded-xl">
                    Please select a Branch Office and Branch Unit above to view available roles.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            onClick={handleSubmitRole}
            disabled={!isFormValid || isSubmitting}
            size="lg"
            className="h-12 px-8 rounded-xl text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 min-w-[240px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Submitting Request...
              </>
            ) : (
              <>
                Submit
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="h-12 px-5 text-sm font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
