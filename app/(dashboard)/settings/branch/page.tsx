// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UnitsContent } from "@/app/(dashboard)/management/units/page";
import { 
  Building2, MapPin, Plus, Edit2, Users, CheckCircle2, XCircle, 
  Search, ShieldAlert, X, Globe, UserPlus, Briefcase, Crown, Shield,
  GitFork, ChevronRight, ChevronDown, Layers, ArrowRight, MessageSquare, ListChecks, Trash2,
  Lock, Clock, Calendar, Sun, Moon, Check, Loader2, Table as TableIcon, Mail, Pencil, MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";
import { useSocket } from "@/contexts/SocketContext";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { getDynamicTimezoneOptions } from "@/lib/timezone-helper";

const SYSTEM_INTERNAL_ROLES = new Set([
  "default_roles_enfycon_ats",
  "offline_access",
  "uma_authorization",
  "manage_account",
  "manage_account_links",
  "view_profile",
  "default_roles",
]);

function getDisplayRoles(roles: any): string[] {
  const arr = Array.isArray(roles) ? roles : typeof roles === "string" ? [roles] : [];
  return arr.filter((r) => !SYSTEM_INTERNAL_ROLES.has(String(r).toLowerCase().replace(/-/g, "_").trim()));
}

function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

function getRoleBadge(role: string) {
  const norm = role.toUpperCase().replace(/[\s-]/g, "_");
  if (norm.includes("UNIT_ADMIN") || norm.includes("UNIT ADMIN")) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
        Unit Admin
      </span>
    );
  }
  if (norm.includes("TENANT_ADMIN") || norm.includes("SUPER_ADMIN")) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
        {role === "BRANCH_ADMIN" ? "Branch Admin" : role.replace(/_/g, " ")}
      </span>
    );
  }
  if (norm.includes("DELIVERY_HEAD")) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
        Delivery Head
      </span>
    );
  }
  if (norm.includes("BDM") || norm.includes("ACCOUNT_MANAGER")) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
        BDM
      </span>
    );
  }
  if (norm.includes("RECRUITER")) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
        Recruiter
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {role.replace(/_/g, " ")}
    </span>
  );
}

function formatTime12(timeStr?: string) {
  if (!timeStr) return "09:00 AM";
  const trimmed = timeStr.trim();
  if (/AM|PM/i.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return trimmed;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

function BranchManagementPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab") === "units" ? "units" : "branches";
  const filterBranchId = searchParams?.get("branchId") || "";
  const [sessionUser, setLiveProfile] = useState<any>(null);
  const { isUserOnline } = useSocket();
  

  const userPermissions: string[] = Array.isArray(sessionUser?.permissions) ? sessionUser.permissions : [];

  // PURE GRANULAR PERMISSION-BASED CAPABILITIES
  // Branch Admin has branch_admin:manage but is explicitly NOT allowed to create or delete branches
  const canCreateBranch = userPermissions.includes('branch:create') || userPermissions.includes('tenant:settings');
  const canEditBranchFunc = (branchId: string) => {
    if (userPermissions.some(p => ['tenant:settings', 'tenant:manage', 'platform:manage'].includes(p))) return true;
    if (userPermissions.includes('branch:edit') || userPermissions.includes('branch_admin:manage')) {
      return sessionUser?.branchId === branchId;
    }
    return false;
  };
  const canEditBranch = userPermissions.includes('branch:edit') || userPermissions.includes('branch_admin:manage') || userPermissions.includes('tenant:settings');
  const canDeleteBranch = userPermissions.includes('branch:delete') || userPermissions.includes('tenant:settings');
  const canAssignManager = userPermissions.includes('branch:assign_manager') || userPermissions.includes('branch_admin:manage') || userPermissions.includes('user:manage') || userPermissions.includes('tenant:settings');
  const canAssignUserRoles = userPermissions.includes('branch:assign_user') || userPermissions.includes('branch_admin:manage') || userPermissions.includes('user:manage') || userPermissions.includes('tenant:settings');
  const canManageBranches = canCreateBranch || canDeleteBranch;
  const canManageUnit = userPermissions.includes('unit_admin:manage') || canManageBranches;
  const canEditUnitFunc = (unitId: string) => {
    if (isTenantManager || canManageBranches) return true;
    if (userPermissions.includes('unit_admin:manage')) {
      return sessionUser?.businessUnitId === unitId;
    }
    return false;
  };
  const isGlobalAdmin = userPermissions.includes('system:admin') || userPermissions.includes('platform:manage');
  const isTenantManager = userPermissions.some(p => ['tenant:settings', 'tenant:manage', 'platform:manage'].includes(p));
  const ownBranchSettings = !isTenantManager;
  const canManageGlobalRemarks =
    userPermissions.includes('tenant:settings') ||
    userPermissions.includes('tenant:manage') ||
    userPermissions.includes('system:admin') || userPermissions.includes('platform:manage');

  const [branches, setBranches] = useState<any[]>([]);
  const totalUnitsCount = useMemo(() => {
    return branches.reduce((acc, b) => acc + (b.businessUnits?.length || 0), 0);
  }, [branches]);
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "tree" | "cards">("table");
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isAssignUserOpen, setIsAssignUserOpen] = useState(false);
  const [isChangeManagerOpen, setIsChangeManagerOpen] = useState(false);
  const [managerSearchQuery, setManagerSearchQuery] = useState("");
  const [showOnlyAdmins, setShowOnlyAdmins] = useState(true);
  const [savingManager, setSavingManager] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<any>(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [selectedBranchUnits, setSelectedBranchUnits] = useState<any[]>([]);

  // Branch Units Management State
  const [isCreateUnitOpen, setIsCreateUnitOpen] = useState(false);
  const [isManageUnitsOpen, setIsManageUnitsOpen] = useState(false);
  const [isEditUnitOpen, setIsEditUnitOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [editUnitFormData, setEditUnitFormData] = useState({
    name: "",
    market: "INDIA",
    currency: "INR",
    shiftTiming: "General Shift",
    workStartTime: "09:30",
    workEndTime: "18:30",
    timezone: "Asia/Kolkata",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    breakDurationMinutes: 60,
    allowNone: false,
    allowPods: true,
    allowUnassigned: true,
    podDistributionStrategy: "AUTO" as "AUTO" | "MANUAL",
  });
  const [isSubmittingEditUnit, setIsSubmittingEditUnit] = useState(false);
  const [unitBranch, setUnitBranch] = useState<any>(null);
  const [unitFormData, setUnitFormData] = useState({
    name: "",
    branchId: "",
    market: "INDIA",
    currency: "INR",
    shiftTiming: "General Shift",
    workStartTime: "09:30",
    workEndTime: "18:30",
    timezone: "Asia/Kolkata",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    breakDurationMinutes: 60,
    allowNone: false,
    allowPods: true,
    allowUnassigned: true,
    podDistributionStrategy: "AUTO" as "AUTO" | "MANUAL",
  });
  const [unitPods, setUnitPods] = useState<any[]>([]);
  const [loadingUnitPods, setLoadingUnitPods] = useState(false);
  const [quickPodUnitId, setQuickPodUnitId] = useState<string>("");
  const [isSubmittingUnit, setIsSubmittingUnit] = useState(false);
  const [unitFormError, setUnitFormError] = useState("");
  const [isDeletingUnit, setIsDeletingUnit] = useState(false);

  // Branch & Global Stage Remarks Modal State
  const [isRemarksOpen, setIsRemarksOpen] = useState(false);
  const [isGlobalRemarksMode, setIsGlobalRemarksMode] = useState(false);
  const [selectedBranchForRemarks, setSelectedBranchForRemarks] = useState<any>(null);
  const [branchRemarks, setBranchRemarks] = useState<any[]>([]);
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [remarksStageFilter, setRemarksStageFilter] = useState("review");
  const [newAcceptText, setNewAcceptText] = useState("");
  const [newRejectText, setNewRejectText] = useState("");
  const [addingBranchRemark, setAddingBranchRemark] = useState(false);
  const [isTogglingGlobalRemarks, setIsTogglingGlobalRemarks] = useState(false);

  // Global Remarks Selection Picker for Branch Admin
  const [availableGlobalRemarks, setAvailableGlobalRemarks] = useState<any[]>([]);
  const [isGlobalSelectorOpen, setIsGlobalSelectorOpen] = useState(false);
  const [selectedGlobalIds, setSelectedGlobalIds] = useState<number[]>([]);
  const [savingGlobalSelection, setSavingGlobalSelection] = useState(false);
  const [globalSelectorStageFilter, setGlobalSelectorStageFilter] = useState("all");

  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);
  const [branchMembers, setBranchMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [tenantRoles, setTenantRoles] = useState<any[]>([]);
  const [marketSegments, setMarketSegments] = useState<any[]>([]);

  // Multi-role state for staff assignment
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["RECRUITER"]);
  const [allTenantUsers, setAllTenantUsers] = useState<any[]>([]);
  const [selectedUserToAssign, setSelectedUserToAssign] = useState<string>("");

  // Recruitment Pods state for the branch currently being edited
  const [branchPods, setBranchPods] = useState<any[]>([]);
  const [loadingBranchPods, setLoadingBranchPods] = useState(false);
  const [isQuickCreatePodOpen, setIsQuickCreatePodOpen] = useState(false);
  const [quickPodName, setQuickPodName] = useState("");
  const [quickPodHeadId, setQuickPodHeadId] = useState("");
  const [quickPodRecruiterIds, setQuickPodRecruiterIds] = useState<string[]>([]);
  const [quickPodDesc, setQuickPodDesc] = useState("");
  const [isCreatingQuickPod, setIsCreatingQuickPod] = useState(false);
  const [availableBranchRecruiters, setAvailableBranchRecruiters] = useState<any[]>([]);

  // Form states (Blank by default - zero hardcoding)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    street: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    market: "INDIA",
    timezone: "Asia/Kolkata",
    workStartTime: "09:00",
    workEndTime: "18:00",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    shiftTiming: "General Shift",
    breakDurationMinutes: 60,
    allowNone: false,
    allowPods: true,
    allowAll: true,
    allowUnassigned: true,
    podDistributionStrategy: "AUTO" as "AUTO" | "MANUAL",
    requireAmJobApproval: true,
    requireJobApproval: true,
    rolesRequiringApproval: ["ACCOUNT_MANAGER", "BD", "RECRUITER"],
    defaultJobApproverRole: "POD_LEAD",
    allowedJobApproverRoles: ["POD_LEAD", "DELIVERY_HEAD", "PRIMARY_RECRUITER", "BRANCH_ADMIN"],
    approvalRoutingMode: "FLEXIBLE" as "FLEXIBLE" | "ENFORCE_DEFAULT",
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    loadBranchesAndHierarchy();
  }, []);

  const loadBranchesAndHierarchy = async () => {
    try {
      setLoading(true);
      const profile = await atsApi.auth.me() as any;
      setLiveProfile(profile);
      const tenantManager = (profile.permissions || []).some((p: string) => ['tenant:settings', 'tenant:manage', 'platform:manage'].includes(p));
      const [listData, hierData, rolesData, msData] = await Promise.all([
        tenantManager ? atsApi.branches.list() : profile.branchId ? atsApi.branches.get(profile.branchId).then(branch => [branch]) : Promise.resolve([]),
        tenantManager ? atsApi.branches.getHierarchy().catch(() => null) : Promise.resolve(null),
        atsApi.auth.listRoles().catch(() => []),
        atsApi.marketSegments.list().catch(() => []),
      ]);
      setBranches(listData || []);
      setHierarchyData(hierData);
      setTenantRoles(rolesData || []);
      setMarketSegments(msData || []);
      if (!tenantManager && listData?.[0]) await openEditModal(listData[0]);
    } catch (err: any) {
      console.error("Failed to load branches:", err);
      setFormError(err.message || 'Unable to load branch settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Branch Name is required");
      return;
    }
    try {
      setFormError("");
      const created = await atsApi.branches.create({
        name: formData.name,
        code: formData.code,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        market: formData.market,
        timezone: formData.timezone,
        workStartTime: formData.workStartTime,
        workEndTime: formData.workEndTime,
        workingDays: formData.workingDays,
        shiftTiming: formData.shiftTiming?.trim() || (formData.market === "US" ? "US Shift" : "General Shift"),
        breakDurationMinutes: formData.breakDurationMinutes,
      });
      if (created && typeof window !== "undefined") {
        localStorage.setItem("active_branch_id", created.id);
        localStorage.setItem("active_branch_name", created.name);
      }
      setIsCreateOpen(false);
      resetForm();
      await loadBranchesAndHierarchy();
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create branch");
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    try {
      setIsSubmittingBranch(true);
      setFormError("");
      const updated = await atsApi.branches.update(selectedBranch.id, {
        name: formData.name.trim(),
        code: formData.code ? formData.code.trim() : "",
        city: formData.city ? formData.city.trim() : "",
        state: formData.state ? formData.state.trim() : "",
        country: formData.country || "India",
        market: formData.market || "INDIA",
        timezone: formData.timezone,
        workStartTime: formData.workStartTime,
        workEndTime: formData.workEndTime,
        workingDays: formData.workingDays,
        shiftTiming: formData.shiftTiming?.trim() || (formData.market === "US" ? "US Shift" : "General Shift"),
        breakDurationMinutes: formData.breakDurationMinutes,
        allowNone: formData.allowNone,
        allowPods: (formData.allowNone || branchPods.length === 0) ? false : formData.allowPods,
        allowAll: formData.allowNone ? false : formData.allowAll,
        allowUnassigned: formData.allowNone ? false : formData.allowUnassigned,
        podDistributionStrategy: formData.podDistributionStrategy,
        requireAmJobApproval: formData.requireJobApproval,
        requireJobApproval: formData.requireJobApproval,
        rolesRequiringApproval: formData.rolesRequiringApproval,
        defaultJobApproverRole: formData.defaultJobApproverRole,
        allowedJobApproverRoles: formData.allowedJobApproverRoles,
        approvalRoutingMode: formData.approvalRoutingMode,
      });

      if (typeof window !== "undefined") {
        const activeBranchId = localStorage.getItem("active_branch_id");
        if (activeBranchId === selectedBranch.id && updated?.name) {
          localStorage.setItem("active_branch_name", updated.name);
          window.dispatchEvent(new Event("branch_updated"));
        }
      }

      toast.success("Branch details updated successfully!");
      setIsEditOpen(false);
      resetForm();
      await loadBranchesAndHierarchy();
    } catch (err: any) {
      setFormError(err.message || "Failed to update branch");
      toast.error(err.message || "Failed to update branch");
    } finally {
      setIsSubmittingBranch(false);
    }
  };

  const handleDeleteBranchConfirm = async () => {
    if (!branchToDelete) return;
    try {
      setIsDeletingBranch(true);
      await atsApi.branches.delete(branchToDelete.id);
      toast.success(`Branch "${branchToDelete.name}" deleted successfully!`);
      setBranchToDelete(null);
      await loadBranchesAndHierarchy();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete branch");
    } finally {
      setIsDeletingBranch(false);
    }
  };

  const openCreateUnitModal = (branch?: any) => {
    const targetBranch = branch || selectedBranch || branches[0] || null;
    setUnitBranch(targetBranch);
    const isUs = targetBranch?.market === "US";
    setUnitFormData({
      name: "",
      branchId: targetBranch?.id || "",
      market: isUs ? "US" : "INDIA",
      currency: isUs ? "USD" : "INR",
      shiftTiming: isUs ? "US Shift" : "General Shift",
      workStartTime: isUs ? "20:00" : "09:30",
      workEndTime: isUs ? "05:00" : "18:30",
      timezone: targetBranch?.timezone || (isUs ? "America/New_York" : "Asia/Kolkata"),
      workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      breakDurationMinutes: 60,
      allowNone: false,
      allowPods: true,
        allowUnassigned: true,
      podDistributionStrategy: "AUTO",
    });
    setUnitFormError("");
    setIsCreateUnitOpen(true);
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitFormData.name.trim()) {
      setUnitFormError("Unit Name is required (e.g. US IT Staffing, Domestic IT)");
      return;
    }
    if (!unitFormData.branchId) {
      setUnitFormError("Target Branch Office is required");
      return;
    }
    try {
      setIsSubmittingUnit(true);
      setUnitFormError("");
      await atsApi.businessUnits.create({
        name: unitFormData.name.trim(),
        branchId: unitFormData.branchId,
        market: unitFormData.market,
        currency: unitFormData.currency,
        shiftTiming: unitFormData.shiftTiming,
        marketSegmentId: unitFormData.marketSegmentId || null,
        workStartTime: unitFormData.workStartTime,
        workEndTime: unitFormData.workEndTime,
        timezone: unitFormData.timezone,
        workingDays: unitFormData.workingDays,
        breakDurationMinutes: unitFormData.breakDurationMinutes,
        allowNone: unitFormData.allowNone,
        allowPods: unitFormData.allowPods,
        allowUnassigned: unitFormData.allowUnassigned,
        podDistributionStrategy: unitFormData.podDistributionStrategy,
      });
      toast.success(`Branch unit "${unitFormData.name}" added successfully!`);
      setIsCreateUnitOpen(false);
      await loadBranchesAndHierarchy();
      if (unitBranch) {
        const freshUnits = await atsApi.businessUnits.list(unitBranch.id).catch(() => []);
        setSelectedBranchUnits(freshUnits || []);
      }
    } catch (err: any) {
      setUnitFormError(err.message || "Failed to create branch unit");
    } finally {
      setIsSubmittingUnit(false);
    }
  };

  const openManageUnitsModal = async (branch: any) => {
    setUnitBranch(branch);
    try {
      const units = await atsApi.businessUnits.list(branch.id).catch(() => []);
      setSelectedBranchUnits(units || branch.businessUnits || []);
    } catch {
      setSelectedBranchUnits(branch.businessUnits || []);
    }
    setIsManageUnitsOpen(true);
  };

  const handleDeleteUnit = async (unit: any) => {
    if ((unit.usersCount || 0) > 0 || (unit.jobsCount || 0) > 0) {
      toast.error(`Cannot delete unit "${unit.name}": It has active staff or open requisitions assigned.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete branch unit "${unit.name}"?`)) return;
    try {
      setIsDeletingUnit(true);
      await atsApi.businessUnits.delete(unit.id);
      toast.success(`Branch unit "${unit.name}" deleted.`);
      if (unitBranch) {
        const freshUnits = await atsApi.businessUnits.list(unitBranch.id).catch(() => []);
        setSelectedBranchUnits(freshUnits || []);
      }
      await loadBranchesAndHierarchy();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete branch unit");
    } finally {
      setIsDeletingUnit(false);
    }
  };

  const openEditUnitModal = async (unit: any) => {
    setEditingUnit(unit);
    const isUs = unit.market === "US";
    const allowNone = Boolean(unit.allowNone);
    setEditUnitFormData({
      name: unit.name || "",
      market: unit.market || (isUs ? "US" : "INDIA"),
      currency: unit.currency || (isUs ? "USD" : "INR"),
      shiftTiming: unit.shiftTiming || (isUs ? "US Shift" : "General Shift"),
      marketSegmentId: unit.marketSegmentId || "",
      workStartTime: unit.workStartTime || (isUs ? "20:00" : "09:30"),
      workEndTime: unit.workEndTime || (isUs ? "05:00" : "18:30"),
      timezone: unit.timezone || (isUs ? "America/New_York" : "Asia/Kolkata"),
      workingDays: Array.isArray(unit.workingDays) && unit.workingDays.length > 0 ? unit.workingDays : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      breakDurationMinutes: unit.breakDurationMinutes ?? 60,
      allowNone: allowNone,
      allowPods: unit.allowPods !== false,
      allowUnassigned: unit.allowUnassigned !== false,
      podDistributionStrategy: (unit.podDistributionStrategy || "AUTO") as "AUTO" | "MANUAL",
    });
    setIsEditUnitOpen(true);

    // Fetch live pods scoped to this branch unit
    setLoadingUnitPods(true);
    setUnitPods([]);
    try {
      const uPods = await atsApi.pods.list({ businessUnitId: unit.id, branchId: unit.branchId });
      const pods = Array.isArray(uPods) ? uPods : [];
      setUnitPods(pods);
    } catch (err) {
      console.error("Failed to load unit pods:", err);
      setUnitPods([]);
    } finally {
      setLoadingUnitPods(false);
    }
  };

  const handleUpdateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    if (!editUnitFormData.name.trim()) {
      toast.error("Unit Name is required");
      return;
    }
    try {
      setIsSubmittingEditUnit(true);
      await atsApi.businessUnits.update(editingUnit.id, {
        name: editUnitFormData.name.trim(),
        market: editUnitFormData.market,
        currency: editUnitFormData.currency,
        shiftTiming: editUnitFormData.shiftTiming,
        marketSegmentId: editUnitFormData.marketSegmentId || null,
        workStartTime: editUnitFormData.workStartTime,
        workEndTime: editUnitFormData.workEndTime,
        timezone: editUnitFormData.timezone,
        workingDays: editUnitFormData.workingDays,
        breakDurationMinutes: editUnitFormData.breakDurationMinutes,
        allowNone: editUnitFormData.allowNone,
        allowPods: editUnitFormData.allowPods,
        allowUnassigned: editUnitFormData.allowUnassigned,
        podDistributionStrategy: editUnitFormData.podDistributionStrategy,
      });
      toast.success(`Branch unit "${editUnitFormData.name}" updated successfully!`);
      setIsEditUnitOpen(false);
      setEditingUnit(null);
      await loadBranchesAndHierarchy();
      if (selectedBranch) {
        const freshUnits = await atsApi.businessUnits.list(selectedBranch.id).catch(() => []);
        setSelectedBranchUnits(freshUnits || []);
      }
      if (unitBranch) {
        const freshUnits = await atsApi.businessUnits.list(unitBranch.id).catch(() => []);
        setSelectedBranchUnits(freshUnits || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update branch unit");
    } finally {
      setIsSubmittingEditUnit(false);
    }
  };

  const handleSaveManagers = async () => {
    if (!selectedBranch) return;
    try {
      setSavingManager(true);
      await atsApi.branches.updateManagers(selectedBranch.id, selectedManagerIds);
      toast.success("Branch Admins assigned successfully!");
      setIsChangeManagerOpen(false);
      await loadBranchesAndHierarchy();
      if (isMembersOpen && selectedBranch) openMembersModal(selectedBranch);
    } catch (err: any) {
      toast.error(err.message || "Failed to assign managers");
    } finally {
      setSavingManager(false);
    }
  };

  const toggleManagerSelection = (id: string) => {
    setSelectedManagerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const openChangeManagerModal = async (b: any) => {
    setSelectedBranch(b);
    setSelectedManagerIds(b.managers?.map((m: any) => m.id) || []);
    setManagerSearchQuery("");
    setIsChangeManagerOpen(true);
    try {
      setMembersLoading(true);
      const users = await atsApi.auth.listUsers().catch(() => []);
      setAllTenantUsers(users || []);
    } catch (err) {
      console.error("Failed to load users for manager selection:", err);
      setAllTenantUsers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleSaveMemberRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !selectedMember) return;
    try {
      await atsApi.branches.assignUser(selectedBranch.id, selectedMember.id, selectedRoles, selectedUnitId || undefined);
      setIsAssignUserOpen(false);
      openMembersModal(selectedBranch);
      await loadBranchesAndHierarchy();
    } catch (err: any) {
      alert(err.message || "Failed to update staff roles");
    }
  };

  const openEditModal = async (b: any) => {
    setSelectedBranch(b);
    const allowNone = Boolean(b.allowNone);
    const existingPodsCount = b.podsCount ?? (Array.isArray(b.pods) ? b.pods.length : 0);
    const initialAllowPods = (allowNone || existingPodsCount === 0) ? false : (b.allowPods !== false);

    setFormData({
      name: b.name || "",
      code: b.code || "",
      street: b.street || "",
      city: b.city || "",
      state: b.state || "",
      country: b.country || "India",
      pincode: b.pincode || "",
      market: b.market || "INDIA",
      timezone: b.timezone || (b.market === "US" || b.country === "United States" ? "America/New_York" : "Asia/Kolkata"),
      workStartTime: b.workStartTime || "09:00",
      workEndTime: b.workEndTime || "18:00",
      workingDays: Array.isArray(b.workingDays) && b.workingDays.length > 0
        ? b.workingDays
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      shiftTiming: b.shiftTiming || (b.market === "US" ? "US Shift" : "General Shift"),
      breakDurationMinutes: b.breakDurationMinutes ?? 60,
      allowNone: allowNone,
      allowPods: initialAllowPods,
      allowAll: allowNone ? false : b.allowAll !== false,
      allowUnassigned: allowNone ? false : b.allowUnassigned !== false,
      podDistributionStrategy: (b.podDistributionStrategy || "AUTO") as "AUTO" | "MANUAL",
      requireAmJobApproval: b.requireJobApproval !== false && b.requireAmJobApproval !== false,
      requireJobApproval: b.requireJobApproval !== false && b.requireAmJobApproval !== false,
      rolesRequiringApproval: Array.isArray(b.rolesRequiringApproval) && b.rolesRequiringApproval.length > 0
        ? b.rolesRequiringApproval
        : ["ACCOUNT_MANAGER", "BD", "RECRUITER"],
      defaultJobApproverRole: b.defaultJobApproverRole || "POD_LEAD",
      allowedJobApproverRoles: Array.isArray(b.allowedJobApproverRoles) && b.allowedJobApproverRoles.length > 0
        ? b.allowedJobApproverRoles
        : ["POD_LEAD", "DELIVERY_HEAD", "PRIMARY_RECRUITER", "BRANCH_ADMIN"],
      approvalRoutingMode: (b.approvalRoutingMode || "FLEXIBLE") as "FLEXIBLE" | "ENFORCE_DEFAULT",
    });
    setFormError("");
    setIsEditOpen(true);

    // Fetch live pods for selected branch
    setLoadingBranchPods(true);
    setBranchPods([]);
    try {
      const podsList = await atsApi.pods.list(b.id);
      const pods = Array.isArray(podsList) ? podsList : [];
      setBranchPods(pods);
      if (pods.length === 0) {
        setFormData((prev) => ({ ...prev, allowPods: false }));
      }
    } catch (err) {
      console.error("Failed to load branch pods:", err);
      setBranchPods([]);
      setFormData((prev) => ({ ...prev, allowPods: false }));
    } finally {
      setLoadingBranchPods(false);
    }
  };

  const openQuickCreatePod = async (targetUnitId?: string, targetBranchObj?: any) => {
    const branchToUse = targetBranchObj || selectedBranch || (editingUnit ? branches.find((b: any) => b.id === editingUnit.branchId) : null);
    if (!branchToUse) return;
    if (!selectedBranch) setSelectedBranch(branchToUse);
    const unitId = targetUnitId || (editingUnit ? editingUnit.id : "");
    setQuickPodUnitId(unitId);
    setQuickPodName("");
    setQuickPodHeadId("");
    setQuickPodRecruiterIds([]);
    setQuickPodDesc("");
    setIsQuickCreatePodOpen(true);
    try {
      const recruiters = await atsApi.pods.getAvailableRecruiters({
        branchId: branchToUse.id,
        businessUnitId: unitId || undefined,
      }).catch(() => []);
      setAvailableBranchRecruiters(recruiters || []);
    } catch (err) {
      console.error("Failed to fetch available recruiters:", err);
      setAvailableBranchRecruiters([]);
    }
  };

  const handleQuickCreatePod = async (e: React.FormEvent) => {
    e.preventDefault();
    const branchToUse = selectedBranch || (editingUnit ? branches.find((b: any) => b.id === editingUnit.branchId) : null);
    if (!branchToUse) return;
    if (!quickPodName.trim()) {
      toast.error("Pod Name is required.");
      return;
    }

    try {
      setIsCreatingQuickPod(true);
      await atsApi.pods.create({
        name: quickPodName.trim(),
        branchId: branchToUse.id,
        businessUnitId: quickPodUnitId || undefined,
        podHeadId: quickPodHeadId || undefined,
        recruiterIds: quickPodRecruiterIds.length > 0 ? quickPodRecruiterIds : undefined,
        description: quickPodDesc.trim() || undefined,
      });

      toast.success(`Recruitment Pod "${quickPodName}" created! Pod routing is now enabled.`);
      setIsQuickCreatePodOpen(false);

      // If created for editingUnit, refresh unit pods and auto-enable allowPods in editUnitFormData!
      if (editingUnit && (!quickPodUnitId || quickPodUnitId === editingUnit.id)) {
        const uPods = await atsApi.pods.list({ businessUnitId: editingUnit.id, branchId: editingUnit.branchId }).catch(() => []);
        setUnitPods(Array.isArray(uPods) ? uPods : []);
        setEditUnitFormData((prev) => ({ ...prev, allowPods: true }));
      }

      // Refresh pods for branch
      const podsList = await atsApi.pods.list(branchToUse.id);
      const pods = Array.isArray(podsList) ? podsList : [];
      setBranchPods(pods);

      // Auto-enable allowPods in the edit form!
      setFormData((prev) => ({ ...prev, allowPods: true }));

      // Refresh hierarchy and branch list in background
      loadBranchesAndHierarchy();
    } catch (err: any) {
      toast.error(err.message || "Failed to create pod");
    } finally {
      setIsCreatingQuickPod(false);
    }
  };

  const openMembersModal = async (b: any) => {
    setSelectedBranch(b);
    setIsMembersOpen(true);
    setSelectedUserToAssign("");
    try {
      setMembersLoading(true);
      const [members, users, units] = await Promise.all([
        atsApi.branches.getMembers(b.id).catch(() => []),
        atsApi.auth.listUsers().catch(() => []),
        atsApi.businessUnits.list(b.id).catch(() => []),
      ]);
      setBranchMembers(members || []);
      setAllTenantUsers(users || []);
      setSelectedBranchUnits(units || b.businessUnits || []);
    } catch (err) {
      console.error("Failed to load members:", err);
      setBranchMembers([]);
      setSelectedBranchUnits(b.businessUnits || []);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleAssignUserToBranch = async (userId: string) => {
    if (!selectedBranch || !userId) return;
    try {
      await atsApi.branches.assignUser(selectedBranch.id, userId);
      const members = await atsApi.branches.getMembers(selectedBranch.id);
      setBranchMembers(members || []);
      setSelectedUserToAssign("");
      loadBranchesAndHierarchy();
    } catch (err: any) {
      alert(err.message || "Failed to assign user to branch");
    }
  };

  const openEditMemberRolesModal = (user: any) => {
    setSelectedMember(user);
    setSelectedRoles(Array.isArray(user.roles) ? user.roles : ["RECRUITER"]);
    setSelectedUnitId(user.businessUnitId || (selectedBranchUnits[0]?.id || ""));
    setIsAssignUserOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      street: "",
      city: "",
      state: "",
      country: "India",
      pincode: "",
      market: "INDIA",
      timezone: "Asia/Kolkata",
      workStartTime: "09:00",
      workEndTime: "18:00",
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      shiftTiming: "General Shift",
      breakDurationMinutes: 60,
      allowNone: false,
      allowPods: true,
      allowAll: true,
      allowUnassigned: true,
      podDistributionStrategy: "AUTO",
      requireAmJobApproval: true,
      requireJobApproval: true,
      rolesRequiringApproval: ["ACCOUNT_MANAGER", "BD", "RECRUITER"],
      defaultJobApproverRole: "POD_LEAD",
      allowedJobApproverRoles: ["POD_LEAD", "DELIVERY_HEAD", "PRIMARY_RECRUITER", "BRANCH_ADMIN"],
      approvalRoutingMode: "FLEXIBLE",
    });
    setFormError("");
    setSelectedBranch(null);
  };

  const openGlobalRemarksModal = async () => {
    setIsGlobalRemarksMode(true);
    setSelectedBranchForRemarks({
      id: null,
      name: "Global Organization (All Branches)",
      market: "GLOBAL",
      enableGlobalRemarks: true,
    });
    setIsRemarksOpen(true);
    setLoadingRemarks(true);
    setRemarksStageFilter("review");
    setNewAcceptText("");
    setNewRejectText("");
    try {
      const data = await atsApi.submissions.getCustomRemarks(undefined, true);
      const globalOnly = (data || []).filter((r: any) => !r.branchId || r.isGlobal);
      setBranchRemarks(globalOnly);
    } catch (err: any) {
      toast.error("Failed to load global remarks: " + err.message);
    } finally {
      setLoadingRemarks(false);
    }
  };

  const openBranchRemarksModal = async (branch: any) => {
    setIsGlobalRemarksMode(false);
    setSelectedBranchForRemarks(branch);
    setIsRemarksOpen(true);
    setLoadingRemarks(true);
    setRemarksStageFilter("review");
    setNewAcceptText("");
    setNewRejectText("");

    let initialSelectedIds: number[] = [];
    if (branch.selectedGlobalRemarkIds && branch.selectedGlobalRemarkIds !== 'ALL') {
      try {
        const parsed = JSON.parse(branch.selectedGlobalRemarkIds);
        if (Array.isArray(parsed)) initialSelectedIds = parsed;
      } catch {}
    }
    setSelectedGlobalIds(initialSelectedIds);

    try {
      const [data, allGlobals] = await Promise.all([
        atsApi.submissions.getCustomRemarks(branch.id, Boolean(branch.enableGlobalRemarks)),
        atsApi.submissions.getCustomRemarks(undefined, true).catch(() => []),
      ]);
      setBranchRemarks(data || []);
      const filteredGlobals = (allGlobals || []).filter((r: any) => !r.branchId || r.isGlobal);
      setAvailableGlobalRemarks(filteredGlobals);

      if (!branch.selectedGlobalRemarkIds || branch.selectedGlobalRemarkIds === 'ALL') {
        setSelectedGlobalIds(filteredGlobals.map((r: any) => r.id));
      }
    } catch (err: any) {
      toast.error("Failed to load branch remarks: " + err.message);
    } finally {
      setLoadingRemarks(false);
    }
  };

  const handleToggleBranchGlobalRemarks = async () => {
    if (!selectedBranchForRemarks || !selectedBranchForRemarks.id) return;
    const currentState = Boolean(selectedBranchForRemarks.enableGlobalRemarks);
    const nextState = !currentState;
    setIsTogglingGlobalRemarks(true);
    try {
      const remarkIdsParam = nextState
        ? (selectedGlobalIds.length > 0 && selectedGlobalIds.length < availableGlobalRemarks.length
            ? JSON.stringify(selectedGlobalIds)
            : 'ALL')
        : undefined;

      const updatedBranch = await atsApi.branches.toggleGlobalRemarks(selectedBranchForRemarks.id, nextState, remarkIdsParam);
      setSelectedBranchForRemarks(updatedBranch);
      setBranches((prev) => prev.map((b) => b.id === updatedBranch.id ? updatedBranch : b));
      // Reload remarks for this branch with the updated flag
      const data = await atsApi.submissions.getCustomRemarks(selectedBranchForRemarks.id, nextState);
      setBranchRemarks(data || []);
      toast.success(nextState ? "Global remarks templates enabled for this branch." : "Global remarks templates disabled for this branch.");
    } catch (err: any) {
      toast.error("Failed to toggle global remarks: " + err.message);
    } finally {
      setIsTogglingGlobalRemarks(false);
    }
  };

  const handleSaveGlobalSelection = async (mode: 'ALL' | 'CUSTOM', customIds?: number[]) => {
    if (!selectedBranchForRemarks || !selectedBranchForRemarks.id) return;
    setSavingGlobalSelection(true);
    try {
      const isAll = mode === 'ALL';
      const idsToSave = isAll ? 'ALL' : JSON.stringify(customIds ?? selectedGlobalIds);

      const updatedBranch = await atsApi.branches.toggleGlobalRemarks(selectedBranchForRemarks.id, true, idsToSave);
      setSelectedBranchForRemarks(updatedBranch);
      setBranches((prev) => prev.map((b) => b.id === updatedBranch.id ? updatedBranch : b));

      if (isAll) {
        setSelectedGlobalIds(availableGlobalRemarks.map((r) => r.id));
      } else if (customIds) {
        setSelectedGlobalIds(customIds);
      }

      // Reload remarks for this branch
      const data = await atsApi.submissions.getCustomRemarks(selectedBranchForRemarks.id, true);
      setBranchRemarks(data || []);
      setIsGlobalSelectorOpen(false);
      toast.success(isAll ? "All global remarks templates enabled for this branch!" : `Saved ${customIds?.length ?? selectedGlobalIds.length} global templates for this branch!`);
    } catch (err: any) {
      toast.error("Failed to save selection: " + err.message);
    } finally {
      setSavingGlobalSelection(false);
    }
  };

  const handleAddDirectRemark = async (type: "ACCEPT" | "REJECT", text: string) => {
    if (!selectedBranchForRemarks || !text.trim()) return;
    const items = text
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (items.length === 0) return;

    try {
      setAddingBranchRemark(true);
      const stage = remarksStageFilter === "all" ? "review" : remarksStageFilter;
      const isGlobal = isGlobalRemarksMode || !selectedBranchForRemarks.id;
      const branchId = isGlobal ? undefined : selectedBranchForRemarks.id;

      const createdList = await Promise.all(
        items.map((itemText) =>
          atsApi.submissions.createCustomRemark({
            stage: stage,
            remarkText: itemText,
            remarkType: type,
            branchId: branchId,
            isGlobal: isGlobal,
          })
        )
      );
      setBranchRemarks((prev) => [...prev, ...(Array.isArray(createdList) ? createdList.flat() : [createdList])]);
      if (type === "ACCEPT") setNewAcceptText("");
      if (type === "REJECT") setNewRejectText("");
      if (items.length === 1) {
        toast.success(`✓ ${type === "ACCEPT" ? "Acceptance" : "Rejection"} template added!`);
      } else {
        toast.success(`✓ Added ${items.length} ${type === "ACCEPT" ? "acceptance" : "rejection"} templates!`);
      }
    } catch (err: any) {
      toast.error("Failed to add remark: " + err.message);
    } finally {
      setAddingBranchRemark(false);
    }
  };

  const handleDeleteBranchRemark = async (id: number) => {
    try {
      await atsApi.submissions.deleteCustomRemark(id);
      setBranchRemarks((prev) => prev.filter((r) => r.id !== id));
      toast.success(isGlobalRemarksMode ? "Global remark template removed!" : "Remark template removed!");
    } catch (err: any) {
      toast.error("Failed to delete remark: " + err.message);
    }
  };

  const visibleBranches = isTenantManager 
    ? branches 
    : branches.filter(b => b.id === sessionUser?.branchId);

  const filteredBranches = visibleBranches.filter((b) =>
    (b.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.city || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.code || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableRolesList = [
    { key: "BRANCH_ADMIN", label: "Branch Admin (Branch Manager)", desc: "Full administrative access within this branch" },
    { key: "ACCOUNT_MANAGER", label: "Account Manager (Sales)", desc: "Manages client relationships & job orders" },
    { key: "POD_LEAD", label: "Pod Lead", desc: "Leads a recruitment pod & assigns jobs" },
    { key: "RECRUITER", label: "Recruiter", desc: "Sourcing & candidate submissions" },
    { key: "DELIVERY_HEAD", label: "Delivery Head", desc: "Monitors overall branch delivery metrics" },
  ];

  if (loading) {
    return (
      <div className="p-6 w-full max-w-full space-y-6">
        <div className="animate-pulse">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm mb-6">
            <div className="space-y-2">
              <div className="h-7 w-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-4 w-96 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
              <div className="h-9 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl overflow-hidden mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-neutral-50/50 dark:bg-slate-850/50 text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 w-10"><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div></th>
                    <th className="py-3.5 px-4"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                    <th className="py-3.5 px-4"><div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                    <th className="py-3.5 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                    <th className="py-3.5 px-4"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                    <th className="py-3.5 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                    <th className="py-3.5 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                    <th className="py-3.5 px-4 text-right"><div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx}>
                      <td className="py-4 px-4 text-center"><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div></td>
                      <td className="py-4 px-4"><div className="flex items-center gap-2"><div className="h-6 w-6 rounded-md bg-slate-200 dark:bg-slate-700"></div><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div></div></td>
                      <td className="py-4 px-4"><div className="h-5 w-12 bg-blue-100 dark:bg-blue-900/40 rounded"></div></td>
                      <td className="py-4 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                      <td className="py-4 px-4"><div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full border border-slate-300 dark:border-slate-600"></div></td>
                      <td className="py-4 px-4"><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                      <td className="py-4 px-4"><div className="flex items-center gap-1"><div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700"></div><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div></div></td>
                      <td className="py-4 px-4 text-right"><div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-full space-y-6">
      {ownBranchSettings && (
        <div className="flex items-center justify-between gap-4">
          <div><h1 className="text-xl font-bold">Branch Settings</h1><p className="text-xs text-neutral-500 mt-1">{selectedBranch?.name || 'Your assigned branch'} — operating hours, job routing, and stage remarks.</p></div>
          {selectedBranch && canEditBranchFunc(selectedBranch.id) && <Button variant="outline" onClick={() => openBranchRemarksModal(selectedBranch)}><MessageSquare className="h-4 w-4 mr-2" />Add / Manage Remarks</Button>}
        </div>
      )}
      {loading && <p className="text-xs text-neutral-500">Loading branch settings...</p>}
      {!loading && ownBranchSettings && !selectedBranch && <p role="alert" className="text-sm text-neutral-600">{formError || 'No branch is assigned to your account.'}</p>}
      {!loading && isTenantManager && <>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
              Branch &amp; Office Locations
            </h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Configure dynamic branch structures, branch admins, staff allocations, and branch units.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* VIEW MODE TOGGLE */}
          <div className="flex items-center bg-neutral-100 dark:bg-slate-800 p-1 rounded-lg border border-neutral-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                viewMode === "tree"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400"
              }`}
            >
              <GitFork className="h-3.5 w-3.5" /> Visual Tree
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400"
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> Cards Grid
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push("/management/units")}
              variant="outline"
              className="h-8 px-3 text-xs font-semibold border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:bg-slate-900 dark:text-neutral-300 dark:border-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Layers className="h-3.5 w-3.5 text-neutral-500" /> Branch Units ({totalUnitsCount})
            </Button>
            {canManageBranches && (
              <Button
                onClick={() => router.push("/management/branch/new")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add New Branch
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* SEARCH TOOLBAR */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branches by name or city..."
            className="pl-9 h-9 text-xs bg-white dark:bg-slate-900 rounded-lg border-neutral-300 dark:border-slate-700"
          />
        </div>
        <div className="text-xs font-medium text-neutral-500">
          Total Configured Branches: <span className="text-neutral-900 dark:text-white font-bold">{branches.length}</span>
        </div>
      </div>

      {/* CONTENT AREA */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl overflow-hidden mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-neutral-50/50 dark:bg-slate-850/50 text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-10"><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div></th>
                  <th className="py-3.5 px-4"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3.5 px-4"><div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3.5 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3.5 px-4"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3.5 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3.5 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3.5 px-4"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3.5 px-4 text-right"><div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4 text-center"><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="flex items-center gap-2"><div className="h-6 w-6 rounded-md bg-slate-200 dark:bg-slate-700"></div><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div></div></td>
                    <td className="py-4 px-4"><div className="h-5 w-12 bg-blue-100 dark:bg-blue-900/40 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full border border-slate-300 dark:border-slate-600"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="py-4 px-4"><div className="flex items-center gap-1"><div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700"></div><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* ─── UNIVERSAL TABLE VIEW (DEFAULT) ─────────────────────────── */
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 dark:bg-slate-800/40 border-b border-neutral-200 dark:border-slate-800 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                  <th className="py-3.5 px-4 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-neutral-300 dark:border-slate-600 cursor-pointer"
                      checked={filteredBranches.length > 0 && selectedBranchIds.length === filteredBranches.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBranchIds(filteredBranches.map((b) => b.id));
                        } else {
                          setSelectedBranchIds([]);
                        }
                      }}
                    />
                  </th>
                  <th className="py-3.5 px-4">Branch Name</th>
                  <th className="py-3.5 px-4">Branch Code</th>
                  <th className="py-3.5 px-4">Office Location</th>
                  <th className="py-3.5 px-4">Branch Units</th>
                  <th className="py-3.5 px-4">Branch Admin</th>
                  <th className="py-3.5 px-4">Staff Members</th>
                  <th className="py-3.5 px-4">Requisitions</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800 text-xs">
                {filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <Building2 className="h-10 w-10 text-neutral-300 dark:text-neutral-600" />
                        <p className="font-semibold text-neutral-700 dark:text-neutral-200 text-sm">
                          {searchQuery ? "No matching branches found" : "No branch locations configured"}
                        </p>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {searchQuery
                            ? "Try clearing your search query to see all configured branches."
                            : "Create your first operating branch location to manage staff and jobs."}
                        </p>
                        {!searchQuery && canManageBranches && (
                          <Button
                            onClick={() => router.push("/management/branch/new")}
                            className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add New Branch
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map((b) => {
                    const branchHier = (hierarchyData?.branches || []).find((h: any) => String(h.id) === String(b.id));
                    const members = (b.members && b.members.length > 0)
                      ? b.members
                      : (branchHier?.members && branchHier.members.length > 0)
                      ? branchHier.members
                      : [];
                    const unitCount = b.businessUnits?.length || 0;

                    return (
                      <tr key={b.id} className="hover:bg-neutral-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        {/* CHECKBOX */}
                        <td className="py-3.5 px-4">
                          <input 
                            type="checkbox" 
                            className="rounded border-neutral-300 dark:border-slate-600 cursor-pointer"
                            checked={selectedBranchIds.includes(b.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBranchIds((prev) => [...prev, b.id]);
                              } else {
                                setSelectedBranchIds((prev) => prev.filter((id) => id !== b.id));
                              }
                            }}
                          />
                        </td>
                        {/* BRANCH NAME */}
                        <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            {canEditBranchFunc(b.id) ? (
                              <button
                                onClick={() => router.push(`/management/branch/${b.id}/edit`)}
                                className="font-bold text-xs text-neutral-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition-colors cursor-pointer"
                              >
                                {b.name}
                              </button>
                            ) : (
                              <span className="font-bold text-xs text-neutral-900 dark:text-white">
                                {b.name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* BRANCH CODE */}
                        <td className="py-3.5 px-4">
                          {b.code ? (
                            <span className="px-1.5 py-0.5 rounded text-[10.5px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                              {b.code}
                            </span>
                          ) : (
                            <span className="text-neutral-400 text-[10.5px] italic">No code</span>
                          )}
                        </td>

                        {/* OFFICE LOCATION */}
                        <td className="py-3.5 px-4">
                          <p className="text-[11.5px] text-neutral-600 dark:text-neutral-400 font-medium">
                            {b.city || "City Unspecified"}, {b.country || "India"}
                          </p>
                        </td>

                        {/* OPERATING UNITS COLUMN (Scalable for 100+ Units) */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => openManageUnitsModal(b)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800 transition-colors cursor-pointer group shadow-2xs"
                            title={`View and filter all ${unitCount} branch units for ${b.name}`}
                          >
                            <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                            <span>{unitCount} {unitCount === 1 ? 'Unit' : 'Units'}</span>
                            <ChevronRight className="h-3 w-3 text-blue-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          {b.managers && b.managers.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                                {b.managers.map((m: any) => m.fullName).join(", ")}
                              </span>
                              {canAssignManager && (
                                <button
                                  onClick={() => openChangeManagerModal(b)}
                                  className="text-[10.5px] font-medium text-neutral-500 hover:text-indigo-600 hover:underline cursor-pointer ml-1"
                                >
                                  (Change)
                                </button>
                              )}
                            </div>
                          ) : canAssignManager ? (
                            <button
                              onClick={() => openChangeManagerModal(b)}
                              className="text-xs font-medium text-neutral-400 hover:text-indigo-600 italic cursor-pointer"
                            >
                              Unassigned (Assign)
                            </button>
                          ) : (
                            <span className="text-xs font-medium text-neutral-400 italic">
                              Unassigned
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => openMembersModal(b)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-slate-700 font-medium text-[11px] transition cursor-pointer"
                            title="View assigned staff members"
                          >
                            <Users className="h-3.5 w-3.5 text-neutral-500" />
                            <span>{b.usersCount || members.length} Staff</span>
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                          {b.jobsCount || 0} Requisitions
                        </td>

                        {/* ACTIONS COLUMN - UNIVERSAL THREE-DOT DROPDOWN MENU */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end">
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="p-1 hover:bg-[#1a4fa0]/10 dark:hover:bg-slate-800 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-[#1a4fa0] dark:hover:text-blue-400 transition-colors cursor-pointer"
                                  title="Actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                sideOffset={4}
                                className="w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-neutral-200/90 dark:border-slate-800 rounded-xl shadow-xl shadow-slate-900/10 dark:shadow-black/50 p-1.5 animate-in fade-in-0 zoom-in-95 z-[100] font-sans"
                              >
                                <div className="px-2.5 pt-1 pb-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                  Branch Operations
                                </div>

                                {canEditBranchFunc(b.id) && (
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/management/branch/${b.id}/edit`)}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  >
                                    <div className="h-6 w-6 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </div>
                                    <span>Edit Branch</span>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() => openManageUnitsModal(b)}
                                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <div className="h-6 w-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                                    <Layers className="h-3.5 w-3.5" />
                                  </div>
                                  <span>View Units ({unitCount})</span>
                                </DropdownMenuItem>

                                {canManageBranches && (
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/management/units/new?branchId=${b.id}`)}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                                  >
                                    <div className="h-6 w-6 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                                      <Plus className="h-3.5 w-3.5" />
                                    </div>
                                    <span>Add Branch Unit</span>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator className="my-1 border-neutral-100 dark:border-slate-800" />

                                <div className="px-2.5 pt-1 pb-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                  Management &amp; Staff
                                </div>

                                <DropdownMenuItem
                                  onClick={() => openMembersModal(b)}
                                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                                    <Users className="h-3.5 w-3.5" />
                                  </div>
                                  <span>Manage Staff ({b.usersCount || members.length})</span>
                                </DropdownMenuItem>

                                {canAssignManager && (
                                  <DropdownMenuItem
                                    onClick={() => openChangeManagerModal(b)}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  >
                                    <div className="h-6 w-6 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
                                      <Crown className="h-3.5 w-3.5" />
                                    </div>
                                    <span>{b.managers && b.managers.length > 0 ? "Change Branch Admins" : "Assign Branch Admins"}</span>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() => openBranchRemarksModal(b)}
                                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <div className="h-6 w-6 rounded-md bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 shadow-2xs">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </div>
                                  <span>Remarks Templates</span>
                                </DropdownMenuItem>

                                {canManageBranches && (
                                  <>
                                    <DropdownMenuSeparator className="my-1 border-neutral-100 dark:border-slate-800" />
                                    {b.usersCount > 0 || (b.jobsCount || 0) > 0 || members.length > 0 ? (
                                      <div
                                        className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-neutral-400 dark:text-neutral-500 italic"
                                        title="Branch deletion locked: contains active staff or requisitions"
                                      >
                                        <Lock className="h-3 w-3 shrink-0" />
                                        <span>Deletion locked (active)</span>
                                      </div>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => setBranchToDelete(b)}
                                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                      >
                                        <div className="h-6 w-6 rounded-md bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-2xs">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </div>
                                        <span>Delete Branch</span>
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : viewMode === "tree" ? (
        /* ─── VISUAL HIERARCHY TREE VIEW ─────────────────────────────── */
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-sm p-6">
          <div className="space-y-6">
            {/* ROOT NODE: TENANT HQ */}
            <div className="p-4 rounded-xl bg-neutral-50/80 dark:bg-slate-850 border border-neutral-200 dark:border-slate-800">
              <div>
                <span className="px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-neutral-200 dark:bg-slate-800 text-neutral-700 dark:text-neutral-300">
                  Tenant Organization HQ
                </span>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white mt-1">
                  {hierarchyData?.tenant?.name || "Company Tenant Workspace"}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Domain: <span className="font-mono text-neutral-700 dark:text-neutral-300 font-semibold">{hierarchyData?.tenant?.domain || "workspace"}</span>
                </p>
              </div>
            </div>

            {/* BRANCH NODES CONTAINER */}
            <div className="pl-6 border-l-2 border-neutral-200 dark:border-slate-800 space-y-6 ml-6">
              {filteredBranches.length === 0 ? (
                <div className="py-6 text-xs text-neutral-400 italic border border-dashed border-neutral-300 dark:border-slate-800 p-4 rounded-lg text-center">
                  No branches configured under this tenant yet. Click <strong>"Add New Branch"</strong> above to create your first operating location.
                </div>
              ) : (
                filteredBranches.map((b) => {
                  const branchHier = (hierarchyData?.branches || []).find((h: any) => String(h.id) === String(b.id));
                  const members = (b.members && b.members.length > 0)
                    ? b.members
                    : (branchHier?.members && branchHier.members.length > 0)
                    ? branchHier.members
                    : [];

                  return (
                    <div key={b.id} className="relative pl-6 space-y-3">
                      {/* CONNECTOR LINE */}
                      <div className="absolute -left-[25px] top-4 w-6 h-[2px] bg-neutral-200 dark:border-slate-800" />
                      
                      {/* BRANCH CARD NODE */}
                      <div className="bg-neutral-50/80 dark:bg-slate-850 p-4 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <span className="text-sm font-bold text-neutral-900 dark:text-white">{b.name}</span>
                            <p className="text-[11px] text-neutral-500">{b.city || "City Unspecified"}, {b.country || "Country"}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10.5px] font-medium font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-slate-700">
                              {b.market === "US" ? "US IT Market" : "Domestic India"}
                            </span>

                            <Button
                              onClick={() => openBranchRemarksModal(b)}
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] font-semibold border-neutral-300 dark:border-slate-700 rounded flex items-center gap-1 cursor-pointer"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" /> Stage Remarks
                            </Button>

                            {canEditBranchFunc(b.id) && (
                              <Button
                                onClick={() => router.push(`/management/branch/${b.id}/edit`)}
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] font-semibold border-neutral-300 dark:border-slate-700 rounded flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="h-3 w-3 mr-1" /> Edit Branch
                              </Button>
                            )}

                            <Button
                              onClick={() => openMembersModal(b)}
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] font-semibold border-neutral-300 dark:border-slate-700 rounded flex items-center gap-1 cursor-pointer"
                            >
                              Manage Users ({b.usersCount || 0})
                            </Button>
                          </div>
                        </div>

                        {/* OPERATING HOURS & SHIFT BADGE */}
                        <div className="bg-neutral-100/80 dark:bg-slate-800/60 border border-neutral-200/80 dark:border-slate-700 p-2.5 rounded-lg flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-neutral-600 dark:text-neutral-400 shrink-0" />
                            <div>
                              <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-white">
                                <span>{formatTime12(b.workStartTime)} - {formatTime12(b.workEndTime)}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-slate-700 text-neutral-700 dark:text-neutral-300 font-mono font-medium">
                                  {b.timezone ? b.timezone.split("/").pop()?.replace(/_/g, " ") : "IST"}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-neutral-500 font-normal">
                                {b.shiftTiming || (b.market === "US" ? "US Shift" : "General Shift")} {"\u2022"} {Array.isArray(b.workingDays) && b.workingDays.length > 0 ? (b.workingDays.length === 5 ? "Mon - Fri" : b.workingDays.map((d: string) => d.slice(0, 3)).join(", ")) : "Mon - Fri"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* BRANCH MANAGER STRIP */}
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-neutral-200 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-amber-500" />
                            <span className="text-xs font-bold text-neutral-800 dark:text-white">
                              Branch Admins: {b.managers && b.managers.length > 0 ? b.managers.map((m: any) => m.fullName).join(", ") : <span className="text-neutral-400 font-normal italic">Unassigned</span>}
                            </span>
                          </div>
                          {canManageBranches && (
                            <button
                              onClick={() => openChangeManagerModal(b)}
                              className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                              {b.managers && b.managers.length > 0 ? "Change Heads" : "Assign Heads"}
                            </button>
                          )}
                        </div>

                        {/* MEMBERS NESTED NODES */}
                        <div className="pl-6 border-l-2 border-dashed border-neutral-300 dark:border-slate-700 space-y-2 pt-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Assigned Team ({members.length})</p>
                          
                          {members.length === 0 ? (
                            <p className="text-xs text-neutral-400 italic">No staff members assigned to this branch yet.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {members.map((m: any) => {
                                const memberRoles = getDisplayRoles(m.roles);
                                const isManager = (b.managers || []).some((mgr: any) => mgr.id === m.id);
                                return (
                                  <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 text-xs shadow-2xs">
                                    <div className="space-y-0.5 min-w-0 pr-2">
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-bold text-neutral-800 dark:text-white truncate">{m.fullName || m.email}</p>
                                        {isManager && (
                                          <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shrink-0 flex items-center gap-0.5">
                                            <Crown className="h-2.5 w-2.5" /> Head
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10.5px] text-neutral-450 truncate">{m.email}</p>
                                    </div>
                                    <div className="shrink-0 flex flex-wrap gap-1">
                                      {memberRoles.map((r: string) => (
                                        <span key={r} className="px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-slate-700">
                                          {r}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      ) : (
        /* ─── CARDS GRID VIEW ────────────────────────────────────────── */
        filteredBranches.length === 0 ? (
          <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xs rounded-xl p-16 text-center">
            <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
              <Building2 className="h-10 w-10 text-neutral-300 dark:text-neutral-600" />
              <p className="font-semibold text-neutral-700 dark:text-neutral-200 text-sm">
                {searchQuery ? "No matching branches found" : "No branch locations configured"}
              </p>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {searchQuery
                  ? "Try clearing your search query to see all configured branches."
                  : "Create your first operating branch location to manage staff and jobs."}
              </p>
              {!searchQuery && canManageBranches && (
                <Button
                  onClick={() => {
                    resetForm();
                    setIsCreateOpen(true);
                  }}
                  className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add New Branch
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBranches.map((b) => (
            <Card key={b.id} className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-sm hover:shadow transition-all">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-base font-bold text-neutral-800 dark:text-white">
                      {b.name}
                    </span>
                    <div className="text-xs text-neutral-500">
                      <span>{b.city || "Unspecified"}, {b.country || "India"}</span>
                    </div>
                  </div>

                  {b.code && (
                    <span className="text-[10.5px] font-medium font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-slate-700">
                      {b.code}
                    </span>
                  )}
                </div>

                {/* BRANCH MANAGER BADGE */}
                <div className="bg-neutral-50 dark:bg-slate-850 p-2.5 rounded-lg border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Branch Admins</p>
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100">
                        {b.managers && b.managers.length > 0 ? b.managers.map((m: any) => m.fullName).join(", ") : <span className="text-neutral-400 font-normal italic">Unassigned</span>}
                      </p>
                    </div>
                  </div>
                  {canManageBranches && (
                    <button
                      onClick={() => openChangeManagerModal(b)}
                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      {b.managers && b.managers.length > 0 ? "Change" : "Assign"}
                    </button>
                  )}
                </div>

                {/* OPERATING UNITS BANNER */}
                <div className="bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800 p-2.5 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Branch Units</p>
                      <p className="text-xs font-bold text-neutral-900 dark:text-white">
                        {b.businessUnits?.length || 0} {b.businessUnits?.length === 1 ? 'Unit Configured' : 'Units Configured'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => openManageUnitsModal(b)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    View Units <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                {/* STATS STRIP */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-neutral-50 dark:bg-slate-850 p-2 rounded text-center">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Assigned Staff</span>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">{b.usersCount || 0}</span>
                  </div>
                  <div className="bg-neutral-50 dark:bg-slate-850 p-2 rounded text-center">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Active Requisitions</span>
                    <span className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{b.jobsCount || 0}</span>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-slate-800 gap-1.5 flex-wrap">
                  <Button
                    onClick={() => openMembersModal(b)}
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] font-semibold border-neutral-300 dark:border-slate-700 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Users className="h-3.5 w-3.5" /> Users ({b.usersCount || 0})
                  </Button>

                  <Button
                    onClick={() => openBranchRemarksModal(b)}
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] font-semibold border-neutral-300 dark:border-slate-700 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" /> Remarks
                  </Button>

                  {canEditBranchFunc(b.id) && (
                    <Button
                      onClick={() => router.push(`/management/branch/${b.id}/edit`)}
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] font-semibold border-neutral-300 dark:border-slate-700 rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  )}

                  {canManageBranches && (
                    <Button
                      onClick={() => setBranchToDelete(b)}
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] font-semibold border-neutral-300 dark:border-slate-700 rounded text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )
      )}
      </>}

      {/* CREATE BRANCH MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                  <Plus className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Create New Branch Location
                  </h3>
                  <p className="text-[11px] text-neutral-400">Establish a new operating office location and work shift schedule</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Branch Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        name: val,
                        // Auto-suggest 3-letter code if code is currently empty or untouched
                        code: prev.code ? prev.code : val.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase(),
                      }));
                    }}
                    placeholder="e.g. Bhubaneswar (Domestic IT), New York Hub..."
                    className="h-10 text-xs font-medium rounded-lg border-neutral-300 dark:border-slate-700"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Branch Code (Job Prefix) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. BBS, NY, CHI, VIZ..."
                    className="h-10 text-xs font-mono font-bold uppercase rounded-lg border-neutral-300 dark:border-slate-700"
                    required
                  />
                  <span className="text-[10px] text-neutral-400 block">Used for Job IDs (e.g. BBS-260212-N0001)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    City <span className="text-red-500">*</span>
                  </label>
                  <CityAutocomplete
                    value={formData.city}
                    onChange={(city, state, country) => {
                      setFormData((prev) => ({
                        ...prev,
                        city: city || "",
                        state: state !== undefined ? state : prev.state,
                        country: country !== undefined ? country : prev.country,
                      }));
                    }}
                    placeholder="Search city (auto-fills state/country)..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Market Segment <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.market}
                    onChange={(e) => {
                      const m = e.target.value;
                      setFormData({
                        ...formData,
                        market: m,
                        country: m === "US" ? "United States" : "India",
                        timezone: m === "US" ? "America/New_York" : "Asia/Kolkata",
                        shiftTiming: m === "US" ? "US Shift" : "General Shift",
                      });
                    }}
                    className="w-full h-10 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 font-semibold text-neutral-900 dark:text-white cursor-pointer"
                  >
                    <option value="INDIA">Domestic India Segment</option>
                    <option value="US">US IT Segment</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Street Address / Office Premises
                  </label>
                  <Input
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="e.g. Infocity, Patia, Suite 400"
                    className="h-10 text-xs rounded-lg border-neutral-300 dark:border-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Postal / Zip Code
                  </label>
                  <Input
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g. 751024, 75001"
                    className="h-10 text-xs rounded-lg border-neutral-300 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Operating Hours & Shift Timing Section */}
              <div className="p-4 bg-neutral-50 dark:bg-slate-850 rounded-xl border border-neutral-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      Initial Branch Unit Shift Defaults
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">Default Practice Unit</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Timezone</label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full h-9 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium text-neutral-900 dark:text-white cursor-pointer"
                    >
                      {getDynamicTimezoneOptions().map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Shift Name</label>
                    <Input
                      value={formData.shiftTiming}
                      onChange={(e) => setFormData({ ...formData, shiftTiming: e.target.value })}
                      placeholder="e.g. General Shift, Night Shift..."
                      className="h-9 text-xs rounded-lg border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Start Time</label>
                    <Input
                      type="time"
                      value={formData.workStartTime}
                      onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                      className="h-9 text-xs font-mono rounded-lg border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">End Time</label>
                    <Input
                      type="time"
                      value={formData.workEndTime}
                      onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                      className="h-9 text-xs font-mono rounded-lg border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Working Days</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                      const isSel = formData.workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const updated = isSel
                              ? formData.workingDays.filter((d) => d !== day)
                              : [...formData.workingDays, day];
                            setFormData({ ...formData, workingDays: updated });
                          }}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition cursor-pointer ${
                            isSel
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white dark:bg-slate-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-slate-700 hover:border-neutral-300"
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-9 text-xs font-bold px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 shadow-xs cursor-pointer"
                >
                  Save Branch Location
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      {!loading && (isEditOpen || ownBranchSettings) && selectedBranch && (
        <div className={ownBranchSettings ? '' : 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto'}>
          <div className={ownBranchSettings ? 'bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl w-full overflow-hidden' : 'bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto'}>
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200/80 dark:border-slate-800 bg-neutral-50/80 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-neutral-300">
                  <Edit2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {ownBranchSettings ? 'Branch Office Details' : 'Edit Branch Office Details'}
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Configure office location parameters, city, address, and view operating branch units.
                  </p>
                </div>
              </div>
              {!ownBranchSettings && <button
                onClick={() => setIsEditOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>}
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleUpdateBranch} className="flex flex-col flex-1 overflow-hidden">
              <fieldset disabled={!canEditBranchFunc(selectedBranch.id) || isSubmittingBranch} className="contents">
              <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                {formError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-900/60 flex items-center gap-2">
                    <X className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* 1. Branch Physical Identity & Office Address */}
                <div className="bg-neutral-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-neutral-200/80 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-slate-700/60 pb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      Branch Office Location &amp; Address
                    </span>
                    <span className="text-[10.5px] text-neutral-400">
                      Physical Location Shell
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Branch Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Bhubaneswar Office, Dallas Hub"
                        className="h-8.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700 font-semibold bg-white dark:bg-slate-900"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Branch Code (Prefix)
                      </label>
                      <Input
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="e.g. BBS, VIZ, DAL, NY"
                        className="h-8.5 text-xs font-mono rounded-lg border-neutral-300 dark:border-slate-700 uppercase font-semibold bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Office City <span className="text-red-500">*</span>
                      </label>
                      <CityAutocomplete
                        value={formData.city}
                        onChange={(city, state, country) => {
                          setFormData((prev) => ({
                            ...prev,
                            city: city || "",
                            state: state !== undefined ? state : prev.state,
                            country: country !== undefined ? country : prev.country,
                          }));
                        }}
                        placeholder="Search city (auto-fills state/country)..."
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Street Address / Premises
                      </label>
                      <Input
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        placeholder="e.g. Infocity, Patia, Suite 400"
                        className="h-8.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        State / Province
                      </label>
                      <Input
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="State / Region"
                        className="h-8.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700 bg-neutral-100/60 dark:bg-slate-800 text-neutral-700 dark:text-neutral-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Country
                      </label>
                      <Input
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        placeholder="Country"
                        className="h-8.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700 bg-neutral-100/60 dark:bg-slate-800 text-neutral-700 dark:text-neutral-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Postal / Zip Code
                      </label>
                      <Input
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        placeholder="e.g. 751024, 75001"
                        className="h-8.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Branch Units (Branch Units) in Branch */}
                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200/70 dark:border-blue-900/60 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200/50 dark:border-blue-900/40 pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <div>
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-300 block">
                          Operating Practice Units ({selectedBranchUnits.length})
                        </span>
                        <span className="text-[10px] text-blue-700/70 dark:text-blue-400/70 font-normal">
                          Operational shifts, timings, timezone, working days, and currency are managed per unit.
                        </span>
                      </div>
                    </div>
                    {canManageBranches && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openCreateUnitModal(selectedBranch)}
                        className="h-7 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Unit
                      </Button>
                    )}
                  </div>

                  {selectedBranchUnits.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic">No operating branch units created for this branch yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedBranchUnits.map((u: any) => (
                        <div
                          key={u.id}
                          className="p-3.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between gap-2.5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">{u.name}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase ${
                                  u.market === "US" 
                                    ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800" 
                                    : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                }`}>
                                  {u.market === "US" ? "US IT" : "Domestic IT"} {"\u2022"} {u.currency || "INR"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {canEditUnitFunc(u.id) && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditUnitModal(u)}
                                    className="h-6 px-2 text-[10.5px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-neutral-200 dark:border-slate-700"
                                  >
                                    <Pencil className="h-3 w-3 mr-1" /> Edit
                                  </Button>
                                )}
                                {canManageBranches && (
                                  (u.usersCount > 0 || u.jobsCount > 0) ? (
                                    <span title="Protected: contains active staff or open jobs" className="text-neutral-400 p-1">
                                      <Lock className="h-3 w-3" />
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUnit(u)}
                                      className="text-neutral-400 hover:text-red-500 cursor-pointer p-1"
                                      title="Delete unused unit"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                            <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                <Clock className="h-3 w-3 inline mr-1 text-amber-500" />
                                {u.shiftTiming || "General Shift"} ({formatTime12(u.workStartTime)} - {formatTime12(u.workEndTime)})
                              </span>
                              <span>{"\u2022"}</span>
                              <span>{u.timezone ? u.timezone.split("/").pop()?.replace(/_/g, " ") : "IST"}</span>
                            </p>
                            <p className="text-[10px] text-neutral-400">
                              Days: {Array.isArray(u.workingDays) && u.workingDays.length > 0 ? (u.workingDays.length === 5 ? "Mon–Fri" : u.workingDays.map((d: string) => d.slice(0, 3)).join(", ")) : "Mon–Fri"} {"\u2022"} Break: {u.breakDurationMinutes ?? 60}m
                            </p>
                          </div>
                          <div className="flex items-center gap-3 pt-2 border-t border-neutral-100 dark:border-slate-800 text-[10.5px] text-neutral-500 dark:text-neutral-400">
                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">{u.usersCount || 0} Staff</span>
                            <span>{"\u2022"}</span>
                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">{u.jobsCount || 0} Jobs</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer (Sticky at Bottom) */}
              <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-neutral-200/80 dark:border-slate-800 bg-neutral-50/80 dark:bg-slate-850 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => ownBranchSettings ? openEditModal(selectedBranch) : setIsEditOpen(false)}
                  className="h-9 text-xs font-semibold px-5 rounded-lg border-neutral-300 dark:border-slate-700"
                >
                  {ownBranchSettings ? 'Reset Changes' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingBranch}
                  className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingBranch ? (
                    <>
                      <Loader2 className="animate-spin h-3.5 w-3.5" />
                      Updating...
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}

      {/* MEMBER ROSTER & MULTI-ROLE MODAL */}
      {isMembersOpen && selectedBranch && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0"
          onClick={(e) => { if (e.target === e.currentTarget) setIsMembersOpen(false); }}
        >
          <div className="bg-white dark:bg-slate-900 border border-neutral-200/90 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            {/* MODAL HEADER */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200/80 dark:border-slate-800 bg-neutral-50/80 dark:bg-slate-850/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1a4fa0] dark:text-blue-400 flex items-center justify-center border border-blue-200/70 dark:border-blue-900/50 shadow-2xs shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Branch Team Roster
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#1a4fa0]/10 text-[#1a4fa0] dark:bg-blue-400/10 dark:text-blue-300 border border-[#1a4fa0]/20">
                      {selectedBranch.name}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {branchMembers.filter((u: any) => u.isActive !== false && u.is_active !== false).length} active staff members assigned to this location
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMembersOpen(false)}
                className="w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {membersLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-400 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1a4fa0]" />
                  <span className="text-xs font-medium">Loading staff members...</span>
                </div>
              ) : branchMembers.filter((u: any) => u.isActive !== false && u.is_active !== false).length === 0 ? (
                <div className="text-center py-12 border border-dashed border-neutral-200 dark:border-slate-800 rounded-xl bg-neutral-50/50 dark:bg-slate-850/40 p-6 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-400 mx-auto flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    No active staff members currently assigned to this branch.
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Assign users from the Users & Roles management screen to see them listed here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-slate-800/80 rounded-xl border border-neutral-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                  {branchMembers
                    .filter((u: any) => u.isActive !== false && u.is_active !== false)
                    .map((user) => {
                      const isManager = selectedBranch.managers?.some((m: any) => m.id === user.id);
                      const rolesArray: string[] = getDisplayRoles(user.roles);
                      const initials = getInitials(user.fullName, user.email);
                      const online = isUserOnline(user.id) || isUserOnline(user.email);

                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3.5 hover:bg-neutral-50/80 dark:hover:bg-slate-850/60 transition-colors gap-4"
                        >
                          {/* Left: User Avatar & Info */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="relative shrink-0">
                              <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-br from-[#1a4fa0] to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                                {initials}
                              </div>
                              {/* Real-time online/offline indicator */}
                              <span
                                title={online ? "Online" : "Offline"}
                                className={`w-2 h-2 rounded-full ring-1.5 ring-white dark:ring-slate-900 absolute -bottom-0.5 -right-0.5 ${
                                  online ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600"
                                }`}
                              />
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                                  {user.fullName || user.email}
                                </p>
                                {isManager && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
                                    <Crown className="h-3 w-3 text-amber-600 dark:text-amber-400" /> Branch Admin
                                  </span>
                                )}
                                {(user.businessUnitName || user.businessUnit?.name) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                                    <Layers className="h-2.5 w-2.5" />
                                    {user.businessUnitName || user.businessUnit?.name}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                                <Mail className="h-3 w-3 text-neutral-400 shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </p>
                            </div>
                          </div>

                          {/* Center: Roles */}
                          <div className="flex items-center justify-center shrink-0 px-2 min-w-[120px]">
                            {rolesArray.length === 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-neutral-100 text-neutral-600 dark:bg-slate-800 dark:text-neutral-300">
                                Staff Member
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 items-center justify-center">
                                {rolesArray.map((r) => (
                                  <React.Fragment key={r}>
                                    {getRoleBadge(r)}
                                  </React.Fragment>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Right: Admin Action Buttons (if permitted) */}
                          {(canAssignManager || canAssignUserRoles) ? (
                            <div className="flex items-center gap-1.5 shrink-0 sm:pl-3 justify-end min-w-[130px]">
                              {!isManager && canAssignManager && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    setSavingManager(true);
                                    try {
                                      await atsApi.branches.updateManagers(selectedBranch.id, [user.id]);
                                      toast.success("Branch Admin assigned successfully!");
                                      await loadBranchesAndHierarchy();
                                    } catch(e: any) {
                                      toast.error(e.message || "Failed to assign head");
                                    } finally {
                                      setSavingManager(false);
                                    }
                                  }}
                                  className="h-7 px-2.5 text-[10.5px] font-bold border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"
                                >
                                  Set as Branch Admin
                                </Button>
                              )}
                              {canAssignUserRoles && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditMemberRolesModal(user)}
                                  className="h-7 px-2.5 text-[10.5px] font-bold border-neutral-300 dark:border-slate-700 hover:border-[#1a4fa0] text-neutral-700 dark:text-neutral-200"
                                >
                                  <Shield className="h-3 w-3 mr-1 text-[#1a4fa0] dark:text-blue-400" /> Configure Roles
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="w-8 shrink-0 hidden sm:block" />
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="px-6 py-3.5 bg-neutral-50 dark:bg-slate-850 border-t border-neutral-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="text-[11.5px] text-neutral-500 dark:text-neutral-400 font-medium">
                Total Team: <span className="font-bold text-neutral-900 dark:text-white">{branchMembers.filter((u: any) => u.isActive !== false && u.is_active !== false).length} active staff</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsMembersOpen(false)}
                className="h-8 px-4 text-xs font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED CHANGE / ASSIGN BRANCH ADMIN MODAL (CLEAN USER LIST ONLY) */}
      {isChangeManagerOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in-0 zoom-in-95">
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Assign Branch Admin: {selectedBranch.name}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Select a user to assign as the Branch Admin
                </p>
              </div>
              <button
                onClick={() => setIsChangeManagerOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search filter */}
            <div className="p-3.5 border-b border-neutral-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                <Input
                  value={managerSearchQuery}
                  onChange={(e) => setManagerSearchQuery(e.target.value)}
                  placeholder="Search user by name or email..."
                  className="pl-9 h-8 text-xs bg-neutral-50 dark:bg-slate-800 border-neutral-300 dark:border-slate-700"
                />
              </div>
            </div>
            {/* Granular Role Eligibility Filter Toggle */}
            <div className="px-3.5 py-2 bg-neutral-50 dark:bg-slate-850/80 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                {(() => {
                  const belongsToBranch = (u: any) => {
                    const perms: string[] = Array.isArray(u.permissions) ? u.permissions : [];
                    const hasGlobalTenantManage = perms.includes('tenant:settings') || perms.includes('tenant:manage');
                    if (hasGlobalTenantManage) return true;
                    if (u.branchId && u.branchId === selectedBranch.id) return true;
                    if (Array.isArray(u.assignedBranchIds) && u.assignedBranchIds.includes(selectedBranch.id)) return true;
                    return false;
                  };

                  const isEligible = (u: any) => {
                    const perms: string[] = Array.isArray(u.permissions) ? u.permissions : [];
                    return (
                      perms.includes('branch_admin:manage') ||
                      perms.includes('user:manage') ||
                      perms.includes('branch:assign_manager') ||
                      perms.includes('tenant:settings')
                    );
                  };
                  const count = allTenantUsers.filter((u) => {
                    if (!belongsToBranch(u)) return false;
                    if (showOnlyAdmins && !isEligible(u)) return false;
                    if (!managerSearchQuery.trim()) return true;
                    const q = managerSearchQuery.toLowerCase();
                    return (u.fullName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
                  }).length;
                  return showOnlyAdmins ? `Eligible Branch Admins (${count})` : `Branch Staff Members (${count})`;
                })()}
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-indigo-600 dark:text-indigo-400 font-bold select-none text-[11px]">
                <input
                  type="checkbox"
                  checked={showOnlyAdmins}
                  onChange={(e) => setShowOnlyAdmins(e.target.checked)}
                  className="h-3.5 w-3.5 accent-indigo-600 cursor-pointer rounded"
                />
                <span>Branch Admins Only</span>
              </label>
            </div>

            {/* User List */}
            <div className="p-3.5 space-y-2 max-h-[360px] overflow-y-auto">
              {/* Option to clear / unassign manager */}
              {selectedBranch.managerId && (
                <div
                  onClick={() => setSelectedManagerIds([])}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-dashed border-neutral-300 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-slate-800 flex items-center justify-center text-neutral-400 text-xs font-bold">
                      ∅
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Unassign Branch Admin</p>
                      <p className="text-[10px] text-neutral-400">Leave branch without assigned manager</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 text-[10.5px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold px-2">
                    Unassign
                  </Button>
                </div>
              )}

              {membersLoading ? (
                <div className="text-center py-8 text-xs text-neutral-400">Loading user list...</div>
              ) : (() => {
                const belongsToBranch = (u: any) => {
                  const perms: string[] = Array.isArray(u.permissions) ? u.permissions : [];
                  const hasGlobalTenantManage = perms.includes('tenant:settings') || perms.includes('tenant:manage');
                  if (hasGlobalTenantManage) return true;
                  if (u.branchId && u.branchId === selectedBranch.id) return true;
                  if (Array.isArray(u.assignedBranchIds) && u.assignedBranchIds.includes(selectedBranch.id)) return true;
                  return false;
                };

                const isUserEligible = (u: any) => {
                  const perms: string[] = Array.isArray(u.permissions) ? u.permissions : [];
                  return (
                    perms.includes('branch_admin:manage') ||
                    perms.includes('user:manage') ||
                    perms.includes('branch:assign_manager') ||
                    perms.includes('tenant:settings')
                  );
                };

                const eligibleList = allTenantUsers.filter((u) => {
                  if (!belongsToBranch(u)) return false;
                  if (showOnlyAdmins && !isUserEligible(u)) return false;
                  if (!managerSearchQuery.trim()) return true;
                  const q = managerSearchQuery.toLowerCase();
                  return (u.fullName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
                });

                if (eligibleList.length === 0) {
                  return (
                    <div className="text-center py-6 px-4 space-y-2 bg-neutral-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-neutral-200 dark:border-slate-700">
                      <ShieldAlert className="h-6 w-6 text-amber-500 mx-auto" />
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {showOnlyAdmins ? "No users with Branch Admin permissions found" : "No users found"}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                        {showOnlyAdmins 
                          ? "Assign the Branch Admin role in Role Management, or uncheck 'Branch Admins Only' to view all staff."
                          : "No users matched your search query."}
                      </p>
                      {showOnlyAdmins && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowOnlyAdmins(false)}
                          className="h-7 text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-slate-800"
                        >
                          Show All Staff Members
                        </Button>
                      )}
                    </div>
                  );
                }

                return eligibleList.map((user) => {
                  const isCurrentManager = selectedManagerIds.includes(user.id);
                  const initials = (user.fullName || user.email || "U")
                    .split(" ")
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleManagerSelection(user.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                        isCurrentManager
                          ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 cursor-default"
                          : "bg-white dark:bg-slate-850 border-neutral-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          isCurrentManager
                            ? "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200"
                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                        }`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                              {user.fullName || user.email}
                            </p>
                            {isCurrentManager && (
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shrink-0 flex items-center gap-0.5">
                                <Crown className="h-2.5 w-2.5" /> Current Head
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                            {(user.roleName || user.primaryRole || user.systemRole) && (
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-slate-700">
                                {user.roleName || user.primaryRole || user.systemRole}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 ml-2">
                        {isCurrentManager ? (
                          <span className="text-[10.5px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Selected
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingManager}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleManagerSelection(user.id);
                            }}
                            className="h-6 text-[10.5px] font-semibold border-neutral-300 hover:border-indigo-500 hover:text-indigo-650 px-2"
                          >
                            Set as Head
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="p-3 bg-neutral-50 dark:bg-slate-850 border-t border-neutral-100 dark:border-slate-800 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsChangeManagerOpen(false)}
                className="h-7 text-xs font-bold px-4"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveManagers}
                disabled={savingManager}
                className="h-7 text-xs font-bold px-4 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {savingManager ? "Saving..." : "Save Branch Admins"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-ROLE ASSIGNMENT MODAL (CUSTOM ROLES & BRANCH ADMIN ONLY) */}
      {isAssignUserOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in-0 zoom-in-95 my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-650" /> Configure Roles: {selectedMember.fullName || selectedMember.email}
                </h3>
                <p className="text-[11px] text-neutral-400">Assign custom staffing profiles and branch administrative roles</p>
              </div>
              <button onClick={() => setIsAssignUserOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberRoles} className="p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* 1. Branch Administrative Governance */}
              <div className="space-y-2">
                <label className="text-[10.5px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                  Branch Administration Governance
                </label>
                <div 
                  onClick={() => {
                    const isChecked = selectedRoles.includes("BRANCH_ADMIN");
                    if (isChecked) setSelectedRoles(selectedRoles.filter(r => r !== "BRANCH_ADMIN"));
                    else setSelectedRoles([...selectedRoles, "BRANCH_ADMIN"]);
                  }}
                  className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                    selectedRoles.includes("BRANCH_ADMIN")
                      ? "bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700 shadow-xs"
                      : "bg-white dark:bg-slate-850 border-neutral-200 dark:border-slate-750 hover:bg-neutral-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes("BRANCH_ADMIN")}
                    onChange={() => {}} // handled by parent div
                    className="h-4 w-4 accent-amber-600 cursor-pointer mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1">
                        <Crown className="h-3.5 w-3.5 text-amber-500" /> Branch Admin (Branch Manager)
                      </p>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                        Governance
                      </span>
                    </div>
                    <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Grants full administrative control, recruiter assignment, and delivery management for this branch.
                    </p>
                  </div>
                </div>

                {/* Unit Admin */}
                <div 
                  onClick={() => {
                    const isChecked = selectedRoles.includes("UNIT_ADMIN");
                    if (isChecked) setSelectedRoles(selectedRoles.filter(r => r !== "UNIT_ADMIN"));
                    else setSelectedRoles([...selectedRoles, "UNIT_ADMIN"]);
                  }}
                  className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                    selectedRoles.includes("UNIT_ADMIN")
                      ? "bg-violet-50/80 border-violet-300 dark:bg-violet-950/40 dark:border-violet-700 shadow-xs"
                      : "bg-white dark:bg-slate-850 border-neutral-200 dark:border-slate-750 hover:bg-neutral-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes("UNIT_ADMIN")}
                    onChange={() => {}}
                    className="h-4 w-4 accent-violet-600 cursor-pointer mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1">
                        <Shield className="h-3.5 w-3.5 text-violet-500" /> Unit Admin (Branch Unit Manager)
                      </p>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-violet-100 text-violet-900 dark:bg-violet-900/60 dark:text-violet-200">
                        Unit Level
                      </span>
                    </div>
                    <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Restricted to their assigned branch unit. Can manage unit operational timings, staff, and unit-scoped pods.
                    </p>
                  </div>
                </div>
              </div>

              {/* Operating Division / Unit Assignment */}
              <div className="space-y-1.5 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    Branch Unit (Branch Unit)
                  </label>
                  <span className="text-[10.5px] text-blue-600 dark:text-blue-400 font-medium">
                    Office: {selectedBranch?.name}
                  </span>
                </div>
                {selectedBranchUnits.length > 0 ? (
                  <select
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select Branch Unit --</option>
                    {selectedBranchUnits.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.shiftTiming || "General Shift"} {"\u2022"} {u.market || "Domestic"} {"\u2022"} {u.currency || "INR"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-neutral-400 italic">No branch units configured for this branch.</p>
                )}
                <p className="text-[10px] text-neutral-400">
                  The recruiter inherits requisition visibility, shift hours, and candidate talent pools from their assigned branch unit.
                </p>
              </div>

              {/* 2. Workspace Custom Staffing Roles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                    Custom Staffing Profiles
                  </label>
                  <a 
                    href="/utility/roles-permissions" 
                    target="_blank" 
                    className="text-[10.5px] font-bold text-indigo-650 hover:underline flex items-center gap-0.5"
                  >
                    + Manage Roles <ArrowRight className="h-3 w-3" />
                  </a>
                </div>

                {(() => {
                  const customRolesList = tenantRoles.filter(
                    (r: any) => !r.isSystem && !["TENANT_ADMIN", "SUPER_ADMIN", "BRANCH_ADMIN"].includes(r.name)
                  );

                  if (customRolesList.length === 0) {
                    return (
                      <div className="p-4 border border-dashed border-neutral-300 dark:border-slate-750 rounded-xl text-center space-y-2 bg-neutral-50/50 dark:bg-slate-850/50">
                        <ShieldAlert className="h-6 w-6 text-amber-500 mx-auto" />
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">No Custom Roles Configured</p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            System roles are abstract templates. Create custom roles in <strong>Role Management</strong> before assigning staff.
                          </p>
                        </div>
                        <Button 
                          type="button" 
                          size="sm" 
                          onClick={() => window.open("/utility/roles-permissions", "_blank")}
                          className="h-7 text-xs bg-indigo-650 hover:bg-indigo-700 text-white font-bold"
                        >
                          Configure Roles in Settings
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 border border-neutral-200 dark:border-slate-800 p-2.5 rounded-xl bg-neutral-50/40 dark:bg-slate-850/40 max-h-[220px] overflow-y-auto">
                      {customRolesList.map((r: any) => {
                        const isChecked = selectedRoles.includes(r.name) || selectedRoles.includes(r.id);
                        return (
                          <div 
                            key={r.id || r.name} 
                            onClick={() => {
                              if (isChecked) {
                                setSelectedRoles(selectedRoles.filter((role) => role !== r.name && role !== r.id));
                              } else {
                                setSelectedRoles([...selectedRoles, r.name]);
                              }
                            }}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all border ${
                              isChecked 
                                ? "bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-700 shadow-2xs" 
                                : "bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-750 hover:bg-neutral-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by parent div
                              className="h-4 w-4 accent-indigo-600 cursor-pointer mt-0.5 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-bold text-neutral-900 dark:text-white capitalize">{r.name}</p>
                                {r.systemRole && (
                                  <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-neutral-100 text-neutral-600 dark:bg-slate-800 dark:text-neutral-300 border border-neutral-200 dark:border-slate-700">
                                    Base: {r.systemRole.replace(/_/g, " ")}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10.5px] text-neutral-450 mt-0.5 truncate">
                                {r.description || "Custom operational staffing role"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-slate-800 shrink-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAssignUserOpen(false)} 
                  className="h-8 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  className="h-8 text-xs bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-4 shadow-xs cursor-pointer"
                >
                  Save Roles &amp; Permissions
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── BRANCH-SPECIFIC STAGE REMARKS MODAL (THEME MATCHED ENTERPRISE DESIGN) ── */}
      {isRemarksOpen && selectedBranchForRemarks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 my-auto">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold border ${
                  isGlobalRemarksMode 
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                    : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50"
                }`}>
                  {isGlobalRemarksMode ? <Globe className="h-4.5 w-4.5" /> : <MessageSquare className="h-4.5 w-4.5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {isGlobalRemarksMode ? "Global Stage Remarks Templates" : `Stage Remarks: ${selectedBranchForRemarks.name}`}
                    </h3>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                      isGlobalRemarksMode 
                        ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold" 
                        : "bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}>
                      {isGlobalRemarksMode ? "GLOBAL TEMPLATES" : (selectedBranchForRemarks.market || "INDIA")}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                    {isGlobalRemarksMode 
                      ? "Universal standard quick-pick templates available across all stages for branches"
                      : "Standard quick-pick templates for approving or rejecting candidates across hiring stages"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Global Remarks Toggle - only when managing a specific branch */}
                {!isGlobalRemarksMode && (
                  <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-indigo-500" />
                      Include Global Remarks:
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleBranchGlobalRemarks}
                      disabled={isTogglingGlobalRemarks}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                        selectedBranchForRemarks.enableGlobalRemarks ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                      title={selectedBranchForRemarks.enableGlobalRemarks ? "Click to disable global remarks" : "Click to enable global remarks (Default: Disabled)"}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-xs ${
                          selectedBranchForRemarks.enableGlobalRemarks ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                      selectedBranchForRemarks.enableGlobalRemarks ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                    }`}>
                      {selectedBranchForRemarks.enableGlobalRemarks ? 'Enabled' : 'Disabled'}
                    </span>
                    {selectedBranchForRemarks.enableGlobalRemarks && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsGlobalSelectorOpen(true)}
                        className="ml-1 h-6 px-2 text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200/80 dark:border-indigo-800 rounded flex items-center gap-1 cursor-pointer"
                        title="Choose which global remarks templates are active for this branch"
                      >
                        <ListChecks className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        {(!selectedBranchForRemarks.selectedGlobalRemarkIds || selectedBranchForRemarks.selectedGlobalRemarkIds === 'ALL' || (availableGlobalRemarks.length > 0 && selectedGlobalIds.length === availableGlobalRemarks.length))
                          ? 'All Templates'
                          : `${selectedGlobalIds.length}/${availableGlobalRemarks.length} Selected`}
                      </Button>
                    )}
                  </div>
                )}

                <button 
                  onClick={() => {
                    setIsRemarksOpen(false);
                    setSelectedBranchForRemarks(null);
                    setIsGlobalRemarksMode(false);
                  }} 
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Stage Navigation Tabs */}
            <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1.5 shrink-0">Stage:</span>
              {[
                { key: "review", label: "Internal Review Gate", count: branchRemarks.filter(r => r.stage === "review" || r.stage === "internal_review").length },
                { key: "l1", label: "Round 1 (L1)", count: branchRemarks.filter(r => r.stage === "l1").length },
                { key: "l2", label: "Round 2 (L2)", count: branchRemarks.filter(r => r.stage === "l2").length },
                { key: "l3", label: "Round 3 (L3)", count: branchRemarks.filter(r => r.stage === "l3").length },
                { key: "final", label: "Final Milestone", count: branchRemarks.filter(r => r.stage === "final").length },
                { key: "all", label: "All Stages", count: branchRemarks.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setRemarksStageFilter(tab.key)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    remarksStageFilter === tab.key
                      ? "bg-indigo-600 text-white font-semibold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                    remarksStageFilter === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Modal Body - 2 Columns */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/40 dark:bg-slate-900/40">
              {loadingRemarks ? (
                <div className="p-12 text-center text-xs text-slate-400 italic">
                  <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading templates...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  
                  {/* ── LEFT COLUMN: ACCEPTANCE REMARKS ── */}
                  <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
                    
                    {/* Header */}
                    <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-6 w-6 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center font-bold text-xs">
                          ✓
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Acceptance / Approval Templates
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Predefined remarks when approving or clearing candidates
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                        {
                          branchRemarks.filter(r => 
                            (remarksStageFilter === "all" || r.stage === remarksStageFilter || (remarksStageFilter === "review" && r.stage === "internal_review")) &&
                            r.remarkType === "ACCEPT"
                          ).length
                        } items
                      </span>
                    </div>

                    {/* Quick Add Bar */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddDirectRemark("ACCEPT", newAcceptText);
                      }} 
                      className="p-3 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex gap-2"
                    >
                      <Input
                        placeholder="Type remark(s) — separate multiple with comma (,)..."
                        value={newAcceptText}
                        onChange={(e) => setNewAcceptText(e.target.value)}
                        className="h-9 text-xs bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-lg flex-1 text-slate-900 dark:text-white placeholder:text-slate-400"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={addingBranchRemark || !newAcceptText.trim()}
                        className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shrink-0 cursor-pointer shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                      </Button>
                    </form>

                    {/* Items List */}
                    <div className="p-3 space-y-2 max-h-[380px] overflow-y-auto">
                      {branchRemarks.filter(r => 
                        (remarksStageFilter === "all" || r.stage === remarksStageFilter || (remarksStageFilter === "review" && r.stage === "internal_review")) &&
                        r.remarkType === "ACCEPT"
                      ).length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 italic">
                          No acceptance remarks added yet for this stage. Type above to add (comma-separated supported).
                        </div>
                      ) : (
                        branchRemarks
                          .filter(r => 
                            (remarksStageFilter === "all" || r.stage === remarksStageFilter || (remarksStageFilter === "review" && r.stage === "internal_review")) &&
                            r.remarkType === "ACCEPT"
                          )
                          .map((rem) => (
                            <div 
                              key={rem.id}
                              className="p-2.5 bg-slate-50/60 dark:bg-slate-800/50 rounded-lg border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-2.5 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-xs"
                            >
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <span className="text-emerald-600 font-bold text-xs mt-0.5">✓</span>
                                <span className="text-slate-800 dark:text-slate-200 font-normal leading-relaxed">
                                  {rem.remarkText}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {remarksStageFilter === "all" && (
                                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded uppercase bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                    {rem.stage}
                                  </span>
                                )}
                                {rem.branchId ? (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                                    Branch
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                                    Global
                                  </span>
                                )}
                                {(rem.branchId ? canEditBranchFunc(rem.branchId) : isGlobalAdmin) && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBranchRemark(rem.id)}
                                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                    title="Delete template"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* ── RIGHT COLUMN: REJECTION REMARKS ── */}
                  <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
                    
                    {/* Header */}
                    <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-6 w-6 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center font-bold text-xs">
                          ✕
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Rejection / Issue Templates
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Predefined feedback reasons when candidate does not qualify
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                        {
                          branchRemarks.filter(r => 
                            (remarksStageFilter === "all" || r.stage === remarksStageFilter || (remarksStageFilter === "review" && r.stage === "internal_review")) &&
                            r.remarkType === "REJECT"
                          ).length
                        } items
                      </span>
                    </div>

                    {/* Quick Add Bar */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddDirectRemark("REJECT", newRejectText);
                      }} 
                      className="p-3 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex gap-2"
                    >
                      <Input
                        placeholder="Type rejection reason(s) — separate multiple with comma (,)..."
                        value={newRejectText}
                        onChange={(e) => setNewRejectText(e.target.value)}
                        className="h-9 text-xs bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-lg flex-1 text-slate-900 dark:text-white placeholder:text-slate-400"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={addingBranchRemark || !newRejectText.trim()}
                        className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shrink-0 cursor-pointer shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                      </Button>
                    </form>

                    {/* Items List */}
                    <div className="p-3 space-y-2 max-h-[380px] overflow-y-auto">
                      {branchRemarks.filter(r => 
                        (remarksStageFilter === "all" || r.stage === remarksStageFilter || (remarksStageFilter === "review" && r.stage === "internal_review")) &&
                        r.remarkType === "REJECT"
                      ).length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 italic">
                          No rejection remarks added yet for this stage. Type above to add (comma-separated supported).
                        </div>
                      ) : (
                        branchRemarks
                          .filter(r => 
                            (remarksStageFilter === "all" || r.stage === remarksStageFilter || (remarksStageFilter === "review" && r.stage === "internal_review")) &&
                            r.remarkType === "REJECT"
                          )
                          .map((rem) => (
                            <div 
                              key={rem.id}
                              className="p-2.5 bg-slate-50/60 dark:bg-slate-800/50 rounded-lg border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-2.5 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-xs"
                            >
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <span className="text-rose-500 font-bold text-xs mt-0.5">✕</span>
                                <span className="text-slate-800 dark:text-slate-200 font-normal leading-relaxed">
                                  {rem.remarkText}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {remarksStageFilter === "all" && (
                                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded uppercase bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                    {rem.stage}
                                  </span>
                                )}
                                {rem.branchId ? (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                                    Branch
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                                    Global
                                  </span>
                                )}
                                {(rem.branchId ? canEditBranchFunc(rem.branchId) : isGlobalAdmin) && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBranchRemark(rem.id)}
                                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                    title="Delete template"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex justify-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsRemarksOpen(false);
                  setSelectedBranchForRemarks(null);
                  setIsGlobalRemarksMode(false);
                }}
                className="text-xs font-semibold px-5 rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
              >
                Close &amp; Finish
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* ── GLOBAL REMARKS SELECTION PICKER MODAL (Allows branch admin to pick specific or all global remarks) ── */}
      {isGlobalSelectorOpen && selectedBranchForRemarks && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden my-auto animate-in fade-in-0 zoom-in-95">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <ListChecks className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Select Global Remarks for {selectedBranchForRemarks.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose which global templates recruiters in this branch can use during candidate reviews.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGlobalSelectorOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter & Bulk Selection Controls */}
            <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Stage:</span>
                {[
                  { key: "all", label: "All" },
                  { key: "review", label: "Review" },
                  { key: "l1", label: "L1" },
                  { key: "l2", label: "L2" },
                  { key: "l3", label: "L3" },
                  { key: "final", label: "Final" },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setGlobalSelectorStageFilter(s.key)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                      globalSelectorStageFilter === s.key
                        ? "bg-indigo-600 text-white font-semibold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const visibleIds = availableGlobalRemarks
                      .filter((r) => globalSelectorStageFilter === "all" || r.stage === globalSelectorStageFilter || (globalSelectorStageFilter === "review" && r.stage === "internal_review"))
                      .map((r) => r.id);
                    setSelectedGlobalIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
                  }}
                  className="h-7 text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-2 cursor-pointer"
                >
                  Select Filtered
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedGlobalIds(availableGlobalRemarks.map((r) => r.id));
                  }}
                  className="h-7 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 cursor-pointer"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedGlobalIds([])}
                  className="h-7 text-[11px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-2 cursor-pointer"
                >
                  Deselect All
                </Button>
              </div>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
              {availableGlobalRemarks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  No global templates exist yet. A Global Admin can create them in the Global Remarks Templates view.
                </div>
              ) : (
                (() => {
                  const filtered = availableGlobalRemarks.filter(
                    (r) => globalSelectorStageFilter === "all" || r.stage === globalSelectorStageFilter || (globalSelectorStageFilter === "review" && r.stage === "internal_review")
                  );
                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-xs text-slate-400 italic">
                        No global templates found for stage &quot;{globalSelectorStageFilter}&quot;.
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {filtered.map((rem) => {
                        const isChecked = selectedGlobalIds.includes(rem.id);
                        return (
                          <div
                            key={rem.id}
                            onClick={() => {
                              setSelectedGlobalIds((prev) =>
                                isChecked ? prev.filter((id) => id !== rem.id) : [...prev, rem.id]
                              );
                            }}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                              isChecked
                                ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/80 shadow-2xs"
                                : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // handled by parent div onClick
                                className="h-4 w-4 accent-indigo-600 rounded cursor-pointer mt-0.5 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {rem.remarkType === "ACCEPT" ? (
                                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                                      <span>✓</span> Accept
                                    </span>
                                  ) : (
                                    <span className="text-rose-700 dark:text-rose-400 font-semibold text-[10px] bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                                      <span>✕</span> Reject
                                    </span>
                                  )}
                                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                                    {rem.stage}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                                  {rem.remarkText}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedGlobalIds.length}</span> of {availableGlobalRemarks.length} selected
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGlobalSelectorOpen(false)}
                  disabled={savingGlobalSelection}
                  className="h-8 text-xs font-semibold px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveGlobalSelection('ALL')}
                  disabled={savingGlobalSelection}
                  className="h-8 text-xs font-semibold px-4 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                >
                  Enable All ({availableGlobalRemarks.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSaveGlobalSelection('CUSTOM')}
                  disabled={savingGlobalSelection}
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {savingGlobalSelection && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Selection ({selectedGlobalIds.length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK CREATE POD MODAL (Allows creating a pod on the spot to unblock Pod Routing) ── */}
      {isQuickCreatePodOpen && selectedBranch && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto animate-in fade-in-0 zoom-in-95">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200/80 dark:border-slate-800 bg-neutral-50/80 dark:bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Create Recruitment Pod
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Enable pod routing for <span className="font-semibold text-neutral-700 dark:text-neutral-200">{selectedBranch.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCreatePodOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreatePod} className="p-6 space-y-4">
              {/* Scope Banner */}
              <div className="p-3 rounded-xl bg-neutral-100/70 dark:bg-slate-800/60 border border-neutral-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-neutral-600 dark:text-neutral-300 shrink-0" />
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-white block">
                      {quickPodUnitId ? (editingUnit?.name || "Operating Practice Unit") : selectedBranch?.name}
                    </span>
                    <span className="text-[10.5px] text-neutral-500 font-mono">
                      {selectedBranch?.name ? `${selectedBranch.name} {"\u2022"} ` : ""}{selectedBranch?.city || "Location"}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  quickPodUnitId
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                    : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                }`}>
                  {quickPodUnitId ? "Unit Isolated" : "Branch Isolated"}
                </span>
              </div>

              {/* Pod Name Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Pod Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={quickPodName}
                  onChange={(e) => setQuickPodName(e.target.value)}
                  placeholder="e.g. IT Sourcing Pod Alpha"
                  className="h-9 text-xs rounded-lg border-neutral-300 dark:border-slate-700 font-semibold bg-white dark:bg-slate-900"
                  required
                  autoFocus
                />
                <p className="text-[10.5px] text-neutral-400">
                  Descriptive pod label visible during job routing and candidate submission workflows.
                </p>
              </div>

              {/* Pod Head / Lead Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Designated Pod Head (Optional)
                </label>
                <select
                  value={quickPodHeadId}
                  onChange={(e) => setQuickPodHeadId(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium text-neutral-900 dark:text-white cursor-pointer"
                >
                  <option value="">Unassigned (Select Pod Head Later)</option>
                  {availableBranchRecruiters.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.email} — {u.roleName || u.systemRole}
                    </option>
                  ))}
                </select>
                <p className="text-[10.5px] text-neutral-400">
                  Pod Heads oversee job distribution and review internal submissions.
                </p>
              </div>

              {/* Assigned Recruiters Multi-select */}
              {availableBranchRecruiters.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Assign Branch Recruiters ({quickPodRecruiterIds.length} selected)
                    </label>
                    <span className="text-[10px] text-neutral-400">Optional</span>
                  </div>
                  <div className="p-2.5 max-h-36 overflow-y-auto rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-900/50 space-y-1.5">
                    {availableBranchRecruiters.map((rec: any) => {
                      const isChecked = quickPodRecruiterIds.includes(rec.id);
                      return (
                        <label
                          key={rec.id}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer text-xs transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setQuickPodRecruiterIds([...quickPodRecruiterIds, rec.id]);
                              } else {
                                setQuickPodRecruiterIds(quickPodRecruiterIds.filter((id) => id !== rec.id));
                              }
                            }}
                            className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate flex-1">
                            {rec.fullName || rec.email}
                          </span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300">
                            {rec.roleName || rec.systemRole}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Pod Description (Optional)
                </label>
                <Input
                  value={quickPodDesc}
                  onChange={(e) => setQuickPodDesc(e.target.value)}
                  placeholder="e.g. Dedicated to domestic Java & Cloud requisition sourcing"
                  className="h-9 text-xs rounded-lg border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-slate-800">
                <a
                  href={`/utility/pods?branch=${selectedBranch.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  Manage Pods in Directory ↗
                </a>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQuickCreatePodOpen(false)}
                    className="h-8.5 text-xs font-semibold px-3.5 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isCreatingQuickPod || !quickPodName.trim()}
                    className="h-8.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isCreatingQuickPod ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        Create Pod &amp; Enable Routing
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE BRANCH CONFIRMATION MODAL ── */}
      {branchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Delete Branch: {branchToDelete.name}
              </h3>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                Are you sure you want to permanently delete this branch location? Staff and jobs assigned to this branch should be reassigned first.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBranchToDelete(null)}
                className="text-xs font-bold px-4 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isDeletingBranch}
                onClick={handleDeleteBranchConfirm}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 shadow-xs cursor-pointer"
              >
                {isDeletingBranch ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / CREATE OPERATING PRACTICE UNIT MODAL */}
      {isCreateUnitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200/80 dark:border-slate-800 bg-neutral-50/80 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                  <Layers className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Add Branch Unit / Branch Unit
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Create a specialized business division within an office branch
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateUnitOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {unitFormError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-900/60 flex items-center gap-2">
                  <X className="h-4 w-4 shrink-0" />
                  <span>{unitFormError}</span>
                </div>
              )}

              {/* Target Office Branch */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Parent Office Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={unitFormData.branchId}
                  onChange={(e) => {
                    const bId = e.target.value;
                    const bObj = branches.find((b) => b.id === bId);
                    setUnitBranch(bObj || null);
                    const isUs = bObj?.market === "US";
                    setUnitFormData({
                      ...unitFormData,
                      branchId: bId,
                      market: isUs ? "US" : "INDIA",
                      currency: isUs ? "USD" : "INR",
                      shiftTiming: isUs ? "US Shift" : "General Shift",
                      workStartTime: isUs ? "20:00" : "09:30",
                      workEndTime: isUs ? "05:00" : "18:30",
                      timezone: bObj?.timezone || (isUs ? "America/New_York" : "Asia/Kolkata"),
                    });
                  }}
                  className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-semibold text-neutral-800 dark:text-neutral-200 outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select Branch Office --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city || "Unspecified"}, {b.country || "India"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Branch Unit Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={unitFormData.name}
                  onChange={(e) => setUnitFormData({ ...unitFormData, name: e.target.value })}
                  placeholder="e.g. US IT Staffing, Domestic IT, Healthcare, BFSI"
                  className="h-8.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700 font-semibold bg-white dark:bg-slate-900"
                  required
                />
                <p className="text-[10px] text-neutral-400">
                  Example: Bhubaneswar Branch can have "US IT Staffing" (night shift) and "Domestic IT" (day shift).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Market Segment */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Market Segment Focus
                  </label>
                  <select
                    value={unitFormData.marketSegmentId || ""}
                    onChange={(e) => {
                      const msId = e.target.value;
                      const ms = marketSegments.find((m) => m.id === msId);
                      setUnitFormData({
                        ...unitFormData,
                        marketSegmentId: msId,
                        market: ms ? ms.code : "INDIA",
                        code: ms ? ms.code : "", // Auto-populate unit code
                        currency: ms ? ms.defaultCurrency : "INR"
                      });
                    }}
                    className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-semibold text-neutral-800 dark:text-neutral-200 outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Select Market Segment --</option>
                    {marketSegments.map((ms) => (
                      <option key={ms.id} value={ms.id}>{ms.name} ({ms.defaultCurrency})</option>
                    ))}
                  </select>
                </div>

                {/* Currency */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Billing Currency
                  </label>
                  <select
                    value={unitFormData.currency}
                    onChange={(e) => setUnitFormData({ ...unitFormData, currency: e.target.value })}
                    className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-semibold text-neutral-800 dark:text-neutral-200 outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="INR">INR (₹ Indian Rupee)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                    <option value="GBP">GBP (£ British Pound)</option>
                    <option value="EUR">EUR (€ Euro)</option>
                    <option value="CAD">CAD ($ Canadian Dollar)</option>
                    <option value="AED">AED (Dirham)</option>
                  </select>
                </div>
              </div>

              {/* Shift Timing */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Shift Timing Preset
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUnitFormData({
                      ...unitFormData,
                      shiftTiming: "General Shift (Day)",
                      workStartTime: "09:30",
                      workEndTime: "18:30",
                    })}
                    className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      unitFormData.shiftTiming.includes("General")
                        ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold"
                        : "border-neutral-200 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <Sun className="h-3.5 w-3.5 text-amber-500" /> Day Shift
                    </div>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">09:30 AM - 06:30 PM</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUnitFormData({
                      ...unitFormData,
                      shiftTiming: "US Shift (Night)",
                      workStartTime: "20:00",
                      workEndTime: "05:00",
                    })}
                    className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      unitFormData.shiftTiming.includes("US") || unitFormData.shiftTiming.includes("Night")
                        ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold"
                        : "border-neutral-200 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <Moon className="h-3.5 w-3.5 text-indigo-500" /> Night Shift
                    </div>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">08:00 PM - 05:00 AM</span>
                  </button>
                </div>
              </div>

              {/* Work Hours & Timezone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={unitFormData.workStartTime}
                    onChange={(e) => setUnitFormData({ ...unitFormData, workStartTime: e.target.value })}
                    className="h-8 text-xs rounded-lg border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={unitFormData.workEndTime}
                    onChange={(e) => setUnitFormData({ ...unitFormData, workEndTime: e.target.value })}
                    className="h-8 text-xs rounded-lg border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                  Operational Timezone
                </label>
                <select
                  value={unitFormData.timezone}
                  onChange={(e) => setUnitFormData({ ...unitFormData, timezone: e.target.value })}
                  className="w-full h-8 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-semibold text-neutral-800 dark:text-neutral-200 outline-none"
                >
                  {getDynamicTimezoneOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateUnitOpen(false)}
                  className="text-xs font-bold px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingUnit}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 shadow-xs cursor-pointer"
                >
                  {isSubmittingUnit ? "Creating..." : "Create Branch Unit"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE OPERATING UNITS MODAL */}
      {isManageUnitsOpen && unitBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200/80 dark:border-slate-800 bg-neutral-50/80 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                  <Layers className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Branch Units in {unitBranch.name}
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Manage business divisions, work shifts, currency, and recruiter staffing allocations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManageUnitsOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Configured Units ({selectedBranchUnits.length})
                </span>
                {canManageBranches && (
                  <Button
                    onClick={() => {
                      setIsManageUnitsOpen(false);
                      openCreateUnitModal(unitBranch);
                    }}
                    size="sm"
                    className="h-7 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add New Unit
                  </Button>
                )}
              </div>

              {selectedBranchUnits.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-neutral-200 dark:border-slate-800 rounded-xl space-y-2">
                  <Layers className="h-8 w-8 text-neutral-400 mx-auto" />
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">No Branch Units Configured</p>
                  <p className="text-[11px] text-neutral-400">Add branch units (e.g., US IT, Domestic IT) to segment requisitions and shifts.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedBranchUnits.map((u: any) => (
                    <div
                      key={u.id}
                      className="p-4 rounded-xl border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850/50 hover:bg-white dark:hover:bg-slate-850 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-neutral-900 dark:text-white">{u.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                              {u.market || "Domestic"} {"\u2022"} {u.currency || "INR"}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                            <span><Clock className="h-3 w-3 inline mr-1 text-amber-500" />{u.shiftTiming || "General Shift"} ({u.workStartTime || "09:30"} - {u.workEndTime || "18:30"})</span>
                            <span>{"\u2022"}</span>
                            <span>{u.timezone ? u.timezone.split("/").pop()?.replace(/_/g, " ") : "IST"}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {canEditUnitFunc(u.id) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                openEditUnitModal(u);
                              }}
                              className="h-7 px-2.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-neutral-200 dark:border-slate-700"
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Button>
                          )}
                          {canManageBranches && (
                            (u.usersCount > 0 || u.jobsCount > 0) ? (
                              <span
                                title="Unit is actively protected: contains staff or jobs"
                                className="h-7 px-2 rounded-md border border-neutral-200 dark:border-slate-800 text-neutral-400 flex items-center gap-1 text-[10px] font-medium"
                              >
                                <Lock className="h-3 w-3 text-neutral-400" /> Active
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteUnit(u)}
                                disabled={isDeletingUnit}
                                className="h-7 px-2.5 text-[11px] font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-neutral-200 dark:border-slate-700"
                              >
                                <Trash2 className="h-3 w-3 mr-1" /> Delete
                              </Button>
                            )
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pt-2 border-t border-neutral-100 dark:border-slate-800/80 text-[11px] text-neutral-600 dark:text-neutral-400">
                        <span className="font-semibold text-neutral-900 dark:text-white">{u.usersCount || 0} Staff Assigned</span>
                        <span>{"\u2022"}</span>
                        <span className="font-semibold text-neutral-900 dark:text-white">{u.jobsCount || 0} Active Requisitions</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-neutral-50 dark:bg-slate-850 border-t border-neutral-200/80 dark:border-slate-800 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsManageUnitsOpen(false)}
                className="text-xs font-bold px-4"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT OPERATING UNIT MODAL */}
      {isEditUnitOpen && editingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Layers className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Edit Branch Unit: {editingUnit.name}
                  </h3>
                  <p className="text-[11px] text-neutral-400">Configure operational parameters, shift timings, working days, and recruiter routing policy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditUnitOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUnit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Unit Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={editUnitFormData.name}
                  onChange={(e) => setEditUnitFormData({ ...editUnitFormData, name: e.target.value })}
                  placeholder="e.g. US IT Staffing, Domestic IT"
                  className="h-9 text-xs rounded-lg border-neutral-300 dark:border-slate-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Global Market Segment
                  </label>
                  <select
                    value={editUnitFormData.marketSegmentId || ""}
                    onChange={(e) => {
                      const msId = e.target.value;
                      const ms = marketSegments.find((m) => m.id === msId);
                      setEditUnitFormData({
                        ...editUnitFormData,
                        marketSegmentId: msId,
                        market: ms ? ms.code : "INDIA",
                        code: ms ? ms.code : "", // Auto-populate unit code
                        currency: ms ? ms.defaultCurrency : "INR"
                      });
                    }}
                    className="w-full h-9 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-medium text-neutral-900 dark:text-white cursor-pointer"
                  >
                    <option value="">-- Select Market Segment --</option>
                    {marketSegments.map((ms) => (
                      <option key={ms.id} value={ms.id}>{ms.name} ({ms.defaultCurrency})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Operating Currency
                  </label>
                  <select
                    value={editUnitFormData.currency}
                    onChange={(e) => setEditUnitFormData({ ...editUnitFormData, currency: e.target.value })}
                    className="w-full h-9 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-medium text-neutral-900 dark:text-white cursor-pointer"
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Shift Timing Preset / Label
                </label>
                <Input
                  value={editUnitFormData.shiftTiming}
                  onChange={(e) => setEditUnitFormData({ ...editUnitFormData, shiftTiming: e.target.value })}
                  placeholder="e.g. General Shift, US EST Night Shift"
                  className="h-9 text-xs rounded-lg border-neutral-300 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                    <Sun className="h-3 w-3 text-amber-500" /> Start Time
                  </label>
                  <Input
                    type="time"
                    value={editUnitFormData.workStartTime}
                    onChange={(e) => setEditUnitFormData({ ...editUnitFormData, workStartTime: e.target.value })}
                    className="h-8.5 text-xs font-mono rounded-lg border-neutral-300 dark:border-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                    <Moon className="h-3 w-3 text-indigo-500" /> End Time
                  </label>
                  <Input
                    type="time"
                    value={editUnitFormData.workEndTime}
                    onChange={(e) => setEditUnitFormData({ ...editUnitFormData, workEndTime: e.target.value })}
                    className="h-8.5 text-xs font-mono rounded-lg border-neutral-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                    <Globe className="h-3 w-3 text-neutral-400" /> Timezone
                  </label>
                  <select
                    value={editUnitFormData.timezone}
                    onChange={(e) => setEditUnitFormData({ ...editUnitFormData, timezone: e.target.value })}
                    className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-semibold text-neutral-800 dark:text-neutral-200 outline-none"
                  >
                    {getDynamicTimezoneOptions().map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                    Break Duration (Minutes)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={180}
                    value={editUnitFormData.breakDurationMinutes}
                    onChange={(e) => setEditUnitFormData({ ...editUnitFormData, breakDurationMinutes: Number(e.target.value) || 0 })}
                    className="h-8.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Working Days Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-neutral-400" /> Operating Working Days
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                    const isSelected = editUnitFormData.workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? editUnitFormData.workingDays.filter((d) => d !== day)
                            : [...editUnitFormData.workingDays, day];
                          setEditUnitFormData({ ...editUnitFormData, workingDays: updated });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-white dark:bg-slate-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-slate-700 hover:bg-neutral-100"
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Job Assignment & Routing Policy (Branch Unit Level) */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-700/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-650 dark:text-indigo-400">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                        Job Assignment Policy
                      </h4>
                      <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400">
                        Control how job orders are assigned and broadcast to recruitment personnel within this branch unit.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Unit Isolated
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {([
                    ["allowNone", "Direct Recruiter Assignment"],
                    ["allowPods", "Recruitment Pods"],
                    ["allowUnassigned", "Allow Unassigned Requisitions"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer border-neutral-200 dark:border-slate-750">
                      <input type="checkbox" checked={editUnitFormData[key]}
                        onChange={(e) => setEditUnitFormData({ ...editUnitFormData, [key]: e.target.checked })}
                        className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500" />
                      {label}
                    </label>
                  ))}
                  {editUnitFormData.allowPods && (
                    <label className="flex items-center gap-2 text-xs">
                      Pod Distribution Strategy
                      <select value={editUnitFormData.podDistributionStrategy}
                        onChange={(e) => setEditUnitFormData({ ...editUnitFormData, podDistributionStrategy: e.target.value as "AUTO" | "MANUAL" })}
                        className="rounded border p-2 bg-white dark:bg-slate-900">
                        <option value="AUTO">Automatic Round-Robin</option>
                        <option value="MANUAL">Manual Lead Selection</option>
                      </select>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditUnitOpen(false)}
                  className="text-xs font-bold px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingEditUnit}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 shadow-xs cursor-pointer"
                >
                  {isSubmittingEditUnit ? "Saving Changes..." : "Save Branch Unit"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function BranchManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-xs text-neutral-500 mt-2 font-medium">Loading branch management...</p>
        </div>
      }
    >
      <BranchManagementPageContent />
    </Suspense>
  );
}
