"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, MapPin, Plus, Edit2, Users, CheckCircle2, XCircle, 
  Search, ShieldAlert, Sparkles, X, Globe, UserPlus, Briefcase, Crown, Shield,
  GitFork, ChevronRight, ChevronDown, Layers, Rocket, ArrowRight, MessageSquare, ListChecks, Trash2,
  Clock, Calendar, Sun, Moon, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";

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

export default function BranchManagementPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "cards">("tree");
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isAssignUserOpen, setIsAssignUserOpen] = useState(false);
  const [isChangeManagerOpen, setIsChangeManagerOpen] = useState(false);
  const [managerSearchQuery, setManagerSearchQuery] = useState("");
  const [savingManager, setSavingManager] = useState(false);

  // Branch Stage Remarks Modal State
  const [isRemarksOpen, setIsRemarksOpen] = useState(false);
  const [selectedBranchForRemarks, setSelectedBranchForRemarks] = useState<any>(null);
  const [branchRemarks, setBranchRemarks] = useState<any[]>([]);
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [branchRemarkStage, setBranchRemarkStage] = useState("review");
  const [branchRemarkText, setBranchRemarkText] = useState("");
  const [addingBranchRemark, setAddingBranchRemark] = useState(false);
  const [remarksStageFilter, setRemarksStageFilter] = useState("all");

  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [branchMembers, setBranchMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [tenantRoles, setTenantRoles] = useState<any[]>([]);

  // Multi-role state for staff assignment
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["RECRUITER"]);
  const [allTenantUsers, setAllTenantUsers] = useState<any[]>([]);
  const [selectedUserToAssign, setSelectedUserToAssign] = useState<string>("");

  // Form states (Blank by default - zero hardcoding)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    city: "",
    state: "",
    country: "India",
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
      const [listData, hierData, rolesData] = await Promise.all([
        atsApi.branches.list().catch(() => []),
        atsApi.branches.getHierarchy().catch(() => null),
        atsApi.auth.listRoles().catch(() => []),
      ]);
      setBranches(listData || []);
      setHierarchyData(hierData);
      setTenantRoles(rolesData || []);
    } catch (err: any) {
      console.error("Failed to load branches:", err);
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
      setFormError("");
      await atsApi.branches.update(selectedBranch.id, {
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
        allowNone: formData.allowNone,
        allowPods: formData.allowNone ? false : formData.allowPods,
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
      toast.success("Branch details, operating hours & routing policy updated successfully!");
      setIsEditOpen(false);
      resetForm();
      await loadBranchesAndHierarchy();
    } catch (err: any) {
      setFormError(err.message || "Failed to update branch");
      toast.error(err.message || "Failed to update branch");
    }
  };

  const handleAssignManager = async (managerId: string | null) => {
    if (!selectedBranch) return;
    try {
      setSavingManager(true);
      await atsApi.branches.updateManager(selectedBranch.id, managerId);
      toast.success(managerId ? "Branch Head assigned successfully!" : "Branch Head unassigned.");
      setIsChangeManagerOpen(false);
      await loadBranchesAndHierarchy();
      if (isMembersOpen && selectedBranch) openMembersModal(selectedBranch);
    } catch (err: any) {
      toast.error(err.message || "Failed to set Branch Manager");
    } finally {
      setSavingManager(false);
    }
  };

  const handleSelectManager = handleAssignManager;

  const openChangeManagerModal = async (b: any) => {
    setSelectedBranch(b);
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
      await atsApi.branches.assignUser(selectedBranch.id, selectedMember.id, selectedRoles);
      setIsAssignUserOpen(false);
      openMembersModal(selectedBranch);
      await loadBranchesAndHierarchy();
    } catch (err: any) {
      alert(err.message || "Failed to update staff roles");
    }
  };

  const openEditModal = (b: any) => {
    setSelectedBranch(b);
    const allowNone = Boolean(b.allowNone);
    setFormData({
      name: b.name || "",
      code: b.code || "",
      city: b.city || "",
      state: b.state || "",
      country: b.country || "India",
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
      allowPods: allowNone ? false : b.allowPods !== false,
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
  };

  const openMembersModal = async (b: any) => {
    setSelectedBranch(b);
    setIsMembersOpen(true);
    setSelectedUserToAssign("");
    try {
      setMembersLoading(true);
      const [members, users] = await Promise.all([
        atsApi.branches.getMembers(b.id).catch(() => []),
        atsApi.auth.listUsers().catch(() => []),
      ]);
      setBranchMembers(members || []);
      setAllTenantUsers(users || []);
    } catch (err) {
      console.error("Failed to load members:", err);
      setBranchMembers([]);
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
    setIsAssignUserOpen(true);
  };

  const openCreateWithPreset = (presetMarket: string) => {
    resetForm();
    setFormData((prev) => ({
      ...prev,
      country: presetMarket === "US" ? "United States" : "India",
      market: presetMarket,
      timezone: presetMarket === "US" ? "America/New_York" : "Asia/Kolkata",
      shiftTiming: presetMarket === "US" ? "US Shift" : "General Shift",
    }));
    setIsCreateOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      city: "",
      state: "",
      country: "India",
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

  const openBranchRemarksModal = async (branch: any) => {
    setSelectedBranchForRemarks(branch);
    setIsRemarksOpen(true);
    setLoadingRemarks(true);
    try {
      const data = await atsApi.submissions.getCustomRemarks(branch.id);
      setBranchRemarks(data || []);
    } catch (err: any) {
      toast.error("Failed to load branch remarks: " + err.message);
    } finally {
      setLoadingRemarks(false);
    }
  };

  const handleAddBranchRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchForRemarks || !branchRemarkText.trim()) return;
    try {
      setAddingBranchRemark(true);
      const created = await atsApi.submissions.createCustomRemark({
        stage: branchRemarkStage,
        remarkText: branchRemarkText.trim(),
        branchId: selectedBranchForRemarks.id,
      });
      setBranchRemarks((prev) => [...prev, created]);
      setBranchRemarkText("");
      toast.success("Branch remark template added!");
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
      toast.success("Branch remark removed!");
    } catch (err: any) {
      toast.error("Failed to delete remark: " + err.message);
    }
  };

  const filteredBranches = branches.filter((b) =>
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

  return (
    <div className="p-6 w-full max-w-full space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-650">
              <GitFork className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
              Organizational Hierarchy & Branch Management
            </h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Define dynamic branch structures, assign Branch Managers (`BRANCH_ADMIN`), and visualize your entire organizational tree.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* VIEW MODE TOGGLE */}
          <div className="flex items-center bg-neutral-100 dark:bg-slate-800 p-1 rounded-lg border border-neutral-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode("tree")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                viewMode === "tree"
                  ? "bg-white dark:bg-slate-900 text-indigo-650 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400"
              }`}
            >
              <GitFork className="h-3.5 w-3.5" /> Visual Tree
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                viewMode === "cards"
                  ? "bg-white dark:bg-slate-900 text-indigo-650 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400"
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> Cards Grid
            </button>
          </div>

          <Button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 shadow"
          >
            <Plus className="h-4 w-4" /> Add New Branch
          </Button>
        </div>
      </div>

      {/* DYNAMIC HERO BANNER WHEN 0 BRANCHES */}
      {branches.length === 0 && !loading && (
        <div className="p-6 rounded-xl bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 text-white border border-indigo-700/50 shadow-lg space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 max-w-2xl">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1 w-fit">
                <Rocket className="h-3 w-3" /> Initial Workspace Setup
              </span>
              <h2 className="text-lg font-bold text-white">
                Configure Your First Operating Branch Location
              </h2>
              <p className="text-xs text-indigo-200 leading-relaxed">
                Your company workspace currently has no operating branches configured. Establish your primary branch (e.g., Main Office, Regional Hub, or US Staffing Branch) to start assigning recruiters, pods, and jobs.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={() => openCreateWithPreset("INDIA")}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-2 shadow"
            >
              <Building2 className="h-4 w-4" /> + Add Domestic India Branch <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={() => openCreateWithPreset("US")}
              variant="outline"
              className="border-indigo-400/50 text-indigo-100 hover:bg-indigo-800/50 font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-2"
            >
              <Globe className="h-4 w-4" /> + Add US IT Staffing Branch
            </Button>
          </div>
        </div>
      )}

      {/* SEARCH TOOLBAR */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branches by name, city, or code..."
            className="pl-9 h-9 text-xs bg-white dark:bg-slate-900 rounded-lg border-neutral-300 dark:border-slate-700"
          />
        </div>
        <div className="text-xs font-semibold text-neutral-500">
          Total Configured Branches: <span className="text-indigo-650 font-bold">{branches.length}</span>
        </div>
      </div>

      {/* CONTENT AREA */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-650 mx-auto"></div>
          <p className="text-xs text-neutral-500 mt-2 font-medium">Loading organization hierarchy...</p>
        </div>
      ) : viewMode === "tree" ? (
        /* VISUAL HIERARCHY TREE VIEW */
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-sm p-6">
          <div className="space-y-6">
            {/* ROOT NODE: TENANT HQ */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
              <div className="p-3 bg-indigo-650 text-white rounded-lg shadow">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  Tenant Organization HQ
                </span>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                  {hierarchyData?.tenant?.name || "Company Tenant Workspace"}
                </h2>
                <p className="text-xs text-neutral-500">
                  Domain: <span className="font-mono text-indigo-650 font-semibold">{hierarchyData?.tenant?.domain || "workspace"}</span>
                </p>
              </div>
            </div>

            {/* BRANCH NODES CONTAINER */}
            <div className="pl-6 border-l-2 border-indigo-200 dark:border-slate-800 space-y-6 ml-6">
              {filteredBranches.length === 0 ? (
                <div className="py-6 text-xs text-neutral-450 italic border border-dashed border-neutral-300 p-4 rounded-lg text-center">
                  No branches configured under this tenant yet. Click <strong>"+ Add New Branch"</strong> above to create your first operating location.
                </div>
              ) : (
                filteredBranches.map((b) => {
                  const branchHier = (hierarchyData?.branches || []).find((h: any) => h.id === b.id);
                  const members = branchHier?.members || [];

                  return (
                    <div key={b.id} className="relative pl-6 space-y-3">
                      {/* CONNECTOR LINE */}
                      <div className="absolute -left-[25px] top-4 w-6 h-[2px] bg-indigo-200 dark:bg-slate-800" />
                      
                      {/* BRANCH CARD NODE */}
                      <div className="bg-neutral-50/80 dark:bg-slate-850 p-4 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-indigo-650 border border-neutral-200 dark:border-slate-700 shadow-xs">
                              <MapPin className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-neutral-900 dark:text-white">{b.name}</span>
                                {b.code && (
                                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-neutral-200 dark:bg-slate-700 text-neutral-700 dark:text-slate-300">
                                    {b.code}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-500">{b.city || "City Unspecified"}, {b.country || "Country"}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              b.market === "US" 
                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                            }`}>
                              {b.market === "US" ? "US IT Market" : "Domestic India"}
                            </span>

                            <Button
                              onClick={() => openBranchRemarksModal(b)}
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] font-semibold border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300 rounded flex items-center gap-1"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" /> Stage Remarks
                            </Button>

                            <Button
                              onClick={() => openEditModal(b)}
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] font-semibold border-neutral-300 text-indigo-650 hover:bg-indigo-50"
                            >
                              <Edit2 className="h-3 w-3 mr-1" /> Edit Branch
                            </Button>

                            <Button
                              onClick={() => openMembersModal(b)}
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] font-semibold border-neutral-300"
                            >
                              Manage Users ({b.usersCount || 0})
                            </Button>
                          </div>
                        </div>

                        {/* OPERATING HOURS & SHIFT BADGE */}
                        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 p-2.5 rounded-lg flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-amber-950 dark:text-amber-200">
                                <span>{formatTime12(b.workStartTime)} - {formatTime12(b.workEndTime)}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 font-mono font-bold">
                                  {b.timezone ? b.timezone.split("/").pop()?.replace(/_/g, " ") : "IST"}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-amber-800/80 dark:text-amber-400/80 font-medium">
                                {b.shiftTiming || (b.market === "US" ? "US Shift" : "General Shift")} • {Array.isArray(b.workingDays) && b.workingDays.length > 0 ? (b.workingDays.length === 5 ? "Mon - Fri" : b.workingDays.map((d: string) => d.slice(0, 3)).join(", ")) : "Mon - Fri"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* BRANCH MANAGER STRIP */}
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-neutral-200 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-amber-500" />
                            <span className="text-xs font-bold text-neutral-800 dark:text-white">
                              Branch Head: {b.managerName ? b.managerName : <span className="text-neutral-400 font-normal italic">Unassigned (Click Assign)</span>}
                            </span>
                          </div>
                          <button
                            onClick={() => openChangeManagerModal(b)}
                            className="text-[11px] font-bold text-indigo-650 hover:underline cursor-pointer"
                          >
                            {b.managerName ? "Change Manager" : "Assign Manager"}
                          </button>
                        </div>

                        {/* MEMBERS NESTED NODES */}
                        <div className="pl-6 border-l-2 border-dashed border-neutral-300 dark:border-slate-700 space-y-2 pt-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Assigned Team</p>
                          
                          {members.length === 0 ? (
                            <p className="text-xs text-neutral-400 italic">No recruiters assigned to this branch yet.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {members.map((m: any) => (
                                <div key={m.id} className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800">
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-neutral-800 dark:text-white">{m.fullName}</p>
                                    <p className="text-[10px] text-neutral-450">{m.email}</p>
                                  </div>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                                    {Array.isArray(m.roles) ? m.roles.join(", ") : "Recruiter"}
                                  </span>
                                </div>
                              ))}
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
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBranches.map((b) => (
            <Card key={b.id} className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-sm hover:shadow transition-all">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-neutral-800 dark:text-white">
                        {b.name}
                      </span>
                      {b.code && (
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-700">
                          {b.code}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                      <span>{b.city || "Unspecified"}, {b.country || "India"}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    b.market === "US" 
                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                  }`}>
                    {b.market === "US" ? "US IT Segment" : "Domestic India"}
                  </span>
                </div>

                {/* BRANCH MANAGER BADGE */}
                <div className="bg-neutral-50 dark:bg-slate-850 p-2.5 rounded-lg border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Branch Head / Manager</p>
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100">
                        {b.managerName ? b.managerName : <span className="text-neutral-400 font-normal italic">Unassigned</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => openChangeManagerModal(b)}
                    className="text-[10px] font-bold text-indigo-650 hover:underline cursor-pointer"
                  >
                    {b.managerName ? "Change" : "Assign"}
                  </button>
                </div>

                {/* OPERATING HOURS & SHIFT BADGE */}
                <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 p-2.5 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-amber-950 dark:text-amber-200">
                        <span>{formatTime12(b.workStartTime)} - {formatTime12(b.workEndTime)}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 font-mono font-bold">
                          {b.timezone ? b.timezone.split("/").pop()?.replace(/_/g, " ") : "IST"}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-amber-800/80 dark:text-amber-400/80 font-medium">
                        {b.shiftTiming || (b.market === "US" ? "US Shift" : "General Shift")} • {Array.isArray(b.workingDays) && b.workingDays.length > 0 ? (b.workingDays.length === 5 ? "Mon - Fri" : b.workingDays.map((d: string) => d.slice(0, 3)).join(", ")) : "Mon - Fri"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* STATS STRIP */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-neutral-50 dark:bg-slate-850 p-2 rounded text-center">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Assigned Staff</span>
                    <span className="text-sm font-bold text-indigo-650 dark:text-indigo-400">{b.usersCount || 0}</span>
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
                    className="h-7 text-[11px] font-semibold border-neutral-300 rounded flex items-center gap-1"
                  >
                    <Users className="h-3.5 w-3.5 text-indigo-650" /> Users ({b.usersCount || 0})
                  </Button>

                  <Button
                    onClick={() => openBranchRemarksModal(b)}
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] font-semibold border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300 rounded flex items-center gap-1"
                  >
                    <MessageSquare className="h-3 w-3" /> Remarks
                  </Button>

                  <Button
                    onClick={() => openEditModal(b)}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] font-semibold text-neutral-600 hover:text-indigo-650"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE BRANCH MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-indigo-650" /> Create New Branch
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded border border-red-200">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Branch Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Primary Branch, Main Office, Tech Hub"
                  className="h-8 text-xs rounded border-neutral-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Branch Code (Job Prefix)</label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. BBS, VIZ, NY"
                    className="h-8 text-xs font-mono rounded border-neutral-300"
                  />
                  <span className="text-[10px] text-neutral-400 block">Used for Job Code (e.g. BBS-260212-N0001)</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. City Name"
                    className="h-8 text-xs rounded border-neutral-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Market Segment *</label>
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
                  className="w-full h-8 text-xs rounded border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 font-semibold"
                >
                  <option value="INDIA">Domestic India Segment</option>
                  <option value="US">US IT Segment</option>
                </select>
              </div>

              {/* Operating Hours & Shift Timing Section */}
              <div className="p-3.5 bg-neutral-50 dark:bg-slate-850 rounded-xl border border-neutral-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                      Working Hours &amp; Shift Schedule
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">Snapshot on Job Post</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">Timezone</label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full h-8 text-xs rounded border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-semibold"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                      <option value="America/New_York">America/New_York (EST -5:00)</option>
                      <option value="America/Chicago">America/Chicago (CST -6:00)</option>
                      <option value="America/Denver">America/Denver (MST -7:00)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST -8:00)</option>
                      <option value="Europe/London">Europe/London (GMT +0:00)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                      <option value="Australia/Sydney">Australia/Sydney (AEST +10:00)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">Shift Name</label>
                    <Input
                      value={formData.shiftTiming}
                      onChange={(e) => setFormData({ ...formData, shiftTiming: e.target.value })}
                      placeholder="e.g. Day Shift (09:00 - 18:00)"
                      className="h-8 text-xs rounded border-neutral-300 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">Start Time</label>
                    <Input
                      type="time"
                      value={formData.workStartTime}
                      onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                      className="h-8 text-xs font-mono rounded border-neutral-300 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">End Time</label>
                    <Input
                      type="time"
                      value={formData.workEndTime}
                      onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                      className="h-8 text-xs font-mono rounded border-neutral-300 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">Working Days</label>
                  <div className="flex flex-wrap gap-1">
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
                          className={`px-2 py-0.5 rounded text-[10.5px] font-semibold border ${
                            isSel
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white dark:bg-slate-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-slate-700"
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-4">
                  Save Branch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      {isEditOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200/80 dark:border-slate-800 bg-neutral-50/80 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
                  <Edit2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Edit Branch Details &amp; Routing Policy
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Configure office location parameters, recruiter assignment strategies, and job approval rules.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleUpdateBranch} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                {formError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-900/60 flex items-center gap-2">
                    <X className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* 1. Branch Identity & Region Info */}
                <div className="bg-neutral-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-neutral-200/80 dark:border-slate-700/80 space-y-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                    Branch General Information
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Branch Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-8.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700 font-semibold bg-white dark:bg-slate-900"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Market Segment <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.market}
                        onChange={(e) => setFormData({ ...formData, market: e.target.value })}
                        className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-semibold text-neutral-800 dark:text-neutral-200 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="INDIA">Domestic India Segment (INR)</option>
                        <option value="US">US IT Segment (USD)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Branch Code (Prefix)
                      </label>
                      <Input
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="e.g. BBS, VIZ, NY"
                        className="h-8.5 text-xs font-mono rounded-lg border-neutral-300 dark:border-slate-700 uppercase font-semibold bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Office City
                      </label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g. Bhubaneswar"
                        className="h-8.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Branch Working Hours & Shift Timing */}
                <div className="bg-neutral-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-neutral-200/80 dark:border-slate-700/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-slate-700/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                        Branch Operating Hours &amp; Shift Schedule
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      Captured on Job Postings
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {/* Timezone */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                        <Globe className="h-3 w-3 text-neutral-400" /> Office Timezone
                      </label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-semibold text-neutral-800 dark:text-neutral-200 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="Asia/Kolkata">India Standard Time (IST) • UTC+05:30</option>
                        <option value="America/New_York">US Eastern Time (EST/EDT) • UTC-05:00</option>
                        <option value="America/Chicago">US Central Time (CST/CDT) • UTC-06:00</option>
                        <option value="America/Denver">US Mountain Time (MST/MDT) • UTC-07:00</option>
                        <option value="America/Los_Angeles">US Pacific Time (PST/PDT) • UTC-08:00</option>
                        <option value="Europe/London">UK / London (GMT/BST) • UTC+00:00</option>
                        <option value="Asia/Dubai">Gulf Standard Time (GST) • UTC+04:00</option>
                        <option value="Asia/Singapore">Singapore / SGT • UTC+08:00</option>
                        <option value="Australia/Sydney">Australia Sydney (AEST) • UTC+10:00</option>
                        <option value="UTC">UTC (Universal)</option>
                      </select>
                    </div>

                    {/* Work Start Time */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                        <Sun className="h-3 w-3 text-amber-500" /> Work Start Time
                      </label>
                      <Input
                        type="time"
                        value={formData.workStartTime}
                        onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                        className="h-8.5 text-xs font-mono rounded-lg border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    {/* Work End Time */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                        <Moon className="h-3 w-3 text-indigo-500" /> Work End Time
                      </label>
                      <Input
                        type="time"
                        value={formData.workEndTime}
                        onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                        className="h-8.5 text-xs font-mono rounded-lg border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    {/* Shift Name / Timing */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Shift Schedule Label / Name
                      </label>
                      <Input
                        value={formData.shiftTiming}
                        onChange={(e) => setFormData({ ...formData, shiftTiming: e.target.value })}
                        placeholder="e.g. Day Shift (09:00 - 18:00 IST) or Night US Shift"
                        className="h-8.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                      />
                    </div>

                    {/* Break Duration */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Break Duration (Minutes)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={180}
                        value={formData.breakDurationMinutes}
                        onChange={(e) => setFormData({ ...formData, breakDurationMinutes: Number(e.target.value) || 0 })}
                        className="h-8.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  {/* Working Days Selector */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-neutral-400" /> Working Days
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                        const isSelected = formData.workingDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? formData.workingDays.filter((d) => d !== day)
                                : [...formData.workingDays, day];
                              setFormData({ ...formData, workingDays: updated });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                : "bg-white dark:bg-slate-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-slate-700 hover:bg-neutral-100"
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-lg border border-amber-200/70 dark:border-amber-900/40 flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-300">
                    <span className="font-bold">🛡️ Timing Policy:</span>
                    <span>
                      Modifying this branch schedule will immediately take effect for all future job postings created in this branch. Previously created jobs will securely retain their original timing snapshot.
                    </span>
                  </div>
                </div>

                {/* 3. Job Assignment & Routing Policy */}
                <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-700/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-650 dark:text-indigo-400">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                          Job Assignment &amp; Routing Policies
                        </h4>
                        <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400">
                          Control how job orders are assigned and broadcast to recruitment personnel.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Branch Isolated
                    </span>
                  </div>

                  {/* Standard Assignment Modes 1 - 4 (Clean 2x2 Grid) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Option 1: None / Direct */}
                    <label className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      formData.allowNone
                        ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800"
                        : "bg-neutral-50/50 dark:bg-slate-800/40 border-neutral-200 dark:border-slate-750 hover:bg-neutral-50"
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.allowNone}
                        onChange={(e) => {
                          const isNone = e.target.checked;
                          setFormData({
                            ...formData,
                            allowNone: isNone,
                            ...(isNone
                              ? { allowPods: false, allowAll: false, allowUnassigned: false }
                              : { allowPods: true, allowAll: true, allowUnassigned: true }),
                          });
                        }}
                        className="mt-0.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900 dark:text-white">1. Direct Assignment Only</span>
                          {formData.allowNone && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200">
                              Exclusive
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400">
                          Direct individual recruiter assignment only. Pod and pooled routing options are disabled.
                        </p>
                      </div>
                    </label>

                    {/* Option 3: All Branch Recruiters */}
                    <label className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs transition-all ${
                      formData.allowNone
                        ? "opacity-40 cursor-not-allowed bg-neutral-100 dark:bg-slate-900"
                        : "cursor-pointer bg-neutral-50/50 dark:bg-slate-800/40 border-neutral-200 dark:border-slate-750 hover:bg-neutral-50"
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.allowAll}
                        disabled={formData.allowNone}
                        onChange={(e) => setFormData({ ...formData, allowAll: e.target.checked })}
                        className="mt-0.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900 dark:text-white">3. All Branch Recruiters (Pool)</span>
                        </div>
                        <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400">
                          Allow broadcast to all active recruiters belonging to this branch office.
                        </p>
                      </div>
                    </label>

                    {/* Option 2: Pod System (with sub-strategy) */}
                    <div className={`space-y-2.5 p-3 rounded-xl border text-xs transition-all ${
                      formData.allowNone
                        ? "opacity-40 pointer-events-none bg-neutral-100 dark:bg-slate-900 border-neutral-200"
                        : "bg-neutral-50/50 dark:bg-slate-800/40 border-neutral-200 dark:border-slate-750"
                    }`}>
                      <label className={`flex items-start gap-2.5 ${formData.allowNone ? "cursor-not-allowed" : "cursor-pointer"}`}>
                        <input
                          type="checkbox"
                          checked={formData.allowPods}
                          disabled={formData.allowNone}
                          onChange={(e) => setFormData({ ...formData, allowPods: e.target.checked })}
                          className="mt-0.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900 dark:text-white">2. Recruitment Pod System</span>
                          </div>
                          <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400">
                            Allow selecting and routing jobs to recruitment pods.
                          </p>
                        </div>
                      </label>

                      {formData.allowPods && !formData.allowNone && (
                        <div className="ml-5 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold text-indigo-900 dark:text-indigo-300 block">Pod Strategy:</span>
                          <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                            <label className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer ${
                              formData.podDistributionStrategy === "AUTO"
                                ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 text-indigo-900 dark:text-indigo-200 font-bold"
                                : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-neutral-600"
                            }`}>
                              <input
                                type="radio"
                                name="podStrategy"
                                value="AUTO"
                                checked={formData.podDistributionStrategy === "AUTO"}
                                onChange={() => setFormData({ ...formData, podDistributionStrategy: "AUTO" })}
                                className="sr-only"
                              />
                              <span>⚡ Auto Broadcast</span>
                            </label>
                            <label className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer ${
                              formData.podDistributionStrategy === "MANUAL"
                                ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 text-indigo-900 dark:text-indigo-200 font-bold"
                                : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-neutral-600"
                            }`}>
                              <input
                                type="radio"
                                name="podStrategy"
                                value="MANUAL"
                                checked={formData.podDistributionStrategy === "MANUAL"}
                                onChange={() => setFormData({ ...formData, podDistributionStrategy: "MANUAL" })}
                                className="sr-only"
                              />
                              <span>👤 Manual Lead</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Option 4: Unassigned */}
                    <label className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs transition-all ${
                      formData.allowNone
                        ? "opacity-40 cursor-not-allowed bg-neutral-100 dark:bg-slate-900"
                        : "cursor-pointer bg-neutral-50/50 dark:bg-slate-800/40 border-neutral-200 dark:border-slate-750 hover:bg-neutral-50"
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.allowUnassigned}
                        disabled={formData.allowNone}
                        onChange={(e) => setFormData({ ...formData, allowUnassigned: e.target.checked })}
                        className="mt-0.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900 dark:text-white">4. Unassigned Allocation</span>
                        </div>
                        <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400">
                          Hold job in unassigned queue for Delivery Head or Pod Lead manual assignment.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Sticky at Bottom) */}
              <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-neutral-200/80 dark:border-slate-800 bg-neutral-50/80 dark:bg-slate-850 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  className="h-9 text-xs font-semibold px-5 rounded-lg border-neutral-300 dark:border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-lg shadow-sm"
                >
                  Update Branch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEMBER ROSTER & MULTI-ROLE MODAL */}
      {isMembersOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-650" /> Branch Team: {selectedBranch.name}
                </h3>
                <p className="text-[11px] text-neutral-400">Staff members & custom multi-role assignments</p>
              </div>
              <button onClick={() => setIsMembersOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[460px] overflow-y-auto">
              {/* ASSIGN TEAM MEMBER STRIP */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5 text-indigo-650" /> Add / Assign Staff Member to Branch
                  </span>
                  <a
                    href="/utility/users"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10.5px] font-bold text-indigo-650 hover:underline"
                  >
                    Manage All Users →
                  </a>
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedUserToAssign}
                    onChange={(e) => setSelectedUserToAssign(e.target.value)}
                    className="flex-1 h-8 text-xs rounded border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 font-semibold text-neutral-800 dark:text-neutral-200 outline-none"
                  >
                    <option value="">-- Select Recruiter / Staff Member --</option>
                    {allTenantUsers
                      .filter((u) => u.branchId !== selectedBranch.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.email}) {u.branchName ? `[Currently in ${u.branchName}]` : "[Unassigned]"}
                        </option>
                      ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!selectedUserToAssign}
                    onClick={() => handleAssignUserToBranch(selectedUserToAssign)}
                    className="h-8 text-xs bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-3"
                  >
                    Assign
                  </Button>
                </div>
              </div>

              {membersLoading ? (
                <div className="text-center py-6 text-xs text-neutral-450">Loading staff members...</div>
              ) : branchMembers.length === 0 ? (
                <div className="text-center py-6 text-xs text-neutral-450 italic">
                  No recruiters currently assigned to this branch.
                </div>
              ) : (
                branchMembers.map((user) => {
                  const isManager = selectedBranch.managerId === user.id;
                  const rolesArray: string[] = getDisplayRoles(user.roles);

                  return (
                    <div key={user.id} className="flex items-center justify-between p-3.5 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-neutral-800 dark:text-white">{user.fullName || user.email}</p>
                          {isManager && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <Crown className="h-3 w-3" /> Branch Head
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500">{user.email}</p>
                        
                        {/* ROLES BADGES - CLEAN BUSINESS ROLES ONLY */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {rolesArray.length === 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-neutral-100 text-neutral-600 dark:bg-slate-800 dark:text-neutral-300 border border-neutral-200 dark:border-slate-700">
                              Staff Member
                            </span>
                          ) : (
                            rolesArray.map((r) => (
                              <span key={r} className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                                {r === "BRANCH_ADMIN" ? "Branch Admin" : r.replace(/_/g, " ")}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isManager && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignManager(user.id)}
                            className="h-7 text-[10px] font-bold border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
                          >
                            Set as Branch Head
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditMemberRolesModal(user)}
                          className="h-7 text-[10px] font-bold border-neutral-300"
                        >
                          <Shield className="h-3 w-3 mr-1 text-indigo-650" /> Configure Roles
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-slate-850 border-t border-neutral-100 dark:border-slate-800 text-right">
              <Button size="sm" variant="outline" onClick={() => setIsMembersOpen(false)} className="h-8 text-xs font-bold">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED CHANGE / ASSIGN BRANCH HEAD MODAL (CLEAN USER LIST ONLY) */}
      {isChangeManagerOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in-0 zoom-in-95">
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Assign Branch Head: {selectedBranch.name}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Select a user to assign as the Branch Head
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

            {/* User List */}
            <div className="p-3.5 space-y-2 max-h-[360px] overflow-y-auto">
              {/* Option to clear / unassign manager */}
              {selectedBranch.managerId && (
                <div
                  onClick={() => handleSelectManager(null)}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-dashed border-neutral-300 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-slate-800 flex items-center justify-center text-neutral-400 text-xs font-bold">
                      ∅
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Unassign Branch Head</p>
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
              ) : allTenantUsers.filter((u) => {
                  if (!managerSearchQuery.trim()) return true;
                  const q = managerSearchQuery.toLowerCase();
                  return (u.fullName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
                }).length === 0 ? (
                <div className="text-center py-8 text-xs text-neutral-400 italic">No users found.</div>
              ) : (
                allTenantUsers
                  .filter((u) => {
                    if (!managerSearchQuery.trim()) return true;
                    const q = managerSearchQuery.toLowerCase();
                    return (u.fullName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
                  })
                  .map((user) => {
                    const isCurrentManager = selectedBranch.managerId === user.id;
                    const initials = (user.fullName || user.email || "U")
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={user.id}
                        onClick={() => !isCurrentManager && handleSelectManager(user.id)}
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
                            <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
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
                                handleSelectManager(user.id);
                              }}
                              className="h-6 text-[10.5px] font-semibold border-neutral-300 hover:border-indigo-500 hover:text-indigo-650 px-2"
                            >
                              Set as Head
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-neutral-50 dark:bg-slate-850 border-t border-neutral-100 dark:border-slate-800 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsChangeManagerOpen(false)}
                className="h-7 text-xs font-bold px-4"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-ROLE ASSIGNMENT MODAL */}
      {isAssignUserOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-650" /> Configure Roles: {selectedMember.fullName}
                </h3>
                <p className="text-[11px] text-neutral-400">Assign single or multiple operational roles to this staff member</p>
              </div>
              <button onClick={() => setIsAssignUserOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberRoles} className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                  Select Assigned System Roles
                </label>
                <div className="space-y-2 border border-neutral-200 dark:border-slate-800 p-3 rounded-lg bg-neutral-50/50">
                  {availableRolesList.map((r) => {
                    const isChecked = selectedRoles.includes(r.key);
                    return (
                      <div 
                        key={r.key} 
                        onClick={() => {
                          if (isChecked) setSelectedRoles(selectedRoles.filter(role => role !== r.key));
                          else setSelectedRoles([...selectedRoles, r.key]);
                        }}
                        className={`flex items-start gap-2.5 p-2 rounded cursor-pointer transition-colors border ${
                          isChecked ? "bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/40" : "bg-white border-neutral-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent div
                          className="h-4 w-4 accent-indigo-600 cursor-pointer mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-800 dark:text-white leading-none">{r.label}</p>
                          <p className="text-[10px] text-neutral-450 mt-0.5">{r.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignUserOpen(false)} className="h-8 text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-4">
                  Save Roles & Permissions
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── BRANCH-SPECIFIC STAGE REMARKS MODAL (CLEAN & WIDE) ── */}
      {isRemarksOpen && selectedBranchForRemarks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 my-auto">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-150 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Stage Remarks Templates: {selectedBranchForRemarks.name}
                  </h3>
                </div>
              </div>

              <button 
                onClick={() => {
                  setIsRemarksOpen(false);
                  setSelectedBranchForRemarks(null);
                }} 
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stage Filter Navigation Tabs */}
            <div className="px-6 pt-3 pb-2 border-b border-neutral-150 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
              {[
                { key: "all", label: "All Stages", count: branchRemarks.length },
                { key: "review", label: "Internal Review Gate", count: branchRemarks.filter(r => r.stage === "review").length },
                { key: "l1", label: "Round 1 (L1)", count: branchRemarks.filter(r => r.stage === "l1").length },
                { key: "l2", label: "Round 2 (L2)", count: branchRemarks.filter(r => r.stage === "l2").length },
                { key: "l3", label: "Round 3 (L3)", count: branchRemarks.filter(r => r.stage === "l3").length },
                { key: "final", label: "Final Milestone", count: branchRemarks.filter(r => r.stage === "final").length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setRemarksStageFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    remarksStageFilter === tab.key
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    remarksStageFilter === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-neutral-200 text-neutral-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Add New Template Form Card */}
              <form onSubmit={handleAddBranchRemark} className="p-4 bg-neutral-50/80 dark:bg-slate-850 border border-neutral-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-indigo-600" />
                  Add New Template
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                      Target Stage
                    </label>
                    <select
                      value={branchRemarkStage}
                      onChange={(e) => setBranchRemarkStage(e.target.value)}
                      className="w-full text-xs font-semibold border border-neutral-300 dark:border-slate-700 rounded-lg px-2.5 h-9 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="review">Internal Screening &amp; Review Gate</option>
                      <option value="l1">Round 1 (L1) — Interview Screening</option>
                      <option value="l2">Round 2 (L2) — Technical Vetting</option>
                      <option value="l3">Round 3 (L3) — Commercial &amp; HR</option>
                      <option value="final">Final Client Placement Milestone</option>
                    </select>
                  </div>

                  <div className="sm:col-span-8 space-y-1">
                    <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                      Remark Text / Template
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type standard template remark text..."
                        value={branchRemarkText}
                        onChange={(e) => setBranchRemarkText(e.target.value)}
                        className="h-9 text-xs bg-white dark:bg-slate-800 rounded-lg flex-1"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={addingBranchRemark || !branchRemarkText.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 rounded-lg shadow-xs shrink-0 cursor-pointer"
                      >
                        {addingBranchRemark ? "Saving..." : "+ Add Template"}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Active Configured Remarks List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-indigo-600" />
                    Active Templates
                  </span>
                  <span className="text-xs text-neutral-500">
                    Showing {
                      branchRemarks.filter(r => remarksStageFilter === "all" || r.stage === remarksStageFilter).length
                    } of {branchRemarks.length} templates
                  </span>
                </div>

                {loadingRemarks ? (
                  <div className="p-8 text-center text-xs text-neutral-400 italic">
                    <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading templates...
                  </div>
                ) : branchRemarks.filter(r => remarksStageFilter === "all" || r.stage === remarksStageFilter).length === 0 ? (
                  <div className="p-8 border border-dashed border-neutral-200 dark:border-slate-800 rounded-xl text-center space-y-1.5 bg-neutral-50/40 dark:bg-slate-850/40">
                    <div className="h-9 w-9 rounded-full bg-neutral-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-neutral-400">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      No custom templates configured for {remarksStageFilter === "all" ? "this branch" : `this stage`}.
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Use the form above to add custom pre-defined remarks.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {branchRemarks
                      .filter(r => remarksStageFilter === "all" || r.stage === remarksStageFilter)
                      .map((rem) => {
                        const stageMeta: Record<string, { label: string; bg: string; text: string; border: string }> = {
                          review: { label: "Review Gate", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-800 dark:text-amber-300", border: "border-amber-200 dark:border-amber-900" },
                          l1: { label: "Round 1 (L1)", bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-800 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-900" },
                          l2: { label: "Round 2 (L2)", bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-800 dark:text-cyan-300", border: "border-cyan-200 dark:border-cyan-900" },
                          l3: { label: "Round 3 (L3)", bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-800 dark:text-purple-300", border: "border-purple-200 dark:border-purple-900" },
                          final: { label: "Final Outcome", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-800 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-900" },
                        };
                        const meta = stageMeta[rem.stage] || { label: rem.stage.toUpperCase(), bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200" };

                        return (
                          <div 
                            key={rem.id} 
                            className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between gap-2 group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${meta.bg} ${meta.text} ${meta.border}`}>
                                {meta.label}
                              </span>

                              <div className="flex items-center gap-1">
                                {rem.branchId ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    Branch Custom
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 dark:bg-slate-800">
                                    Global
                                  </span>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteBranchRemark(rem.id)}
                                  className="text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-6 w-6 p-0 rounded cursor-pointer"
                                  title="Delete template"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            <p className="text-xs text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed">
                              {rem.remarkText}
                            </p>

                            <div className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-100 dark:border-slate-700/60 flex items-center justify-between">
                              <span>Added by: {rem.createdBy || 'Admin'}</span>
                              {rem.createdAt && <span>{new Date(rem.createdAt).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-neutral-150 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 flex justify-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsRemarksOpen(false);
                  setSelectedBranchForRemarks(null);
                }}
                className="text-xs font-bold px-5 rounded-lg cursor-pointer"
              >
                Close &amp; Finish
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
