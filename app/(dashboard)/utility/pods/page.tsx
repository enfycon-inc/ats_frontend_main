"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";

interface PodMember {
  id: string;
  fullName: string;
  email: string;
  systemRole: string;
}

interface Pod {
  id: string;
  name: string;
  branchId?: string | null;
  branchName?: string | null;
  businessUnitId?: string | null;
  businessUnitName?: string | null;
  podHeadId: string | null;
  podHeadName: string | null;
  description: string | null;
  isAvailableForAssignment: boolean;
  members: PodMember[];
  jobsCount: number;
  createdAt: string;
}

type ModalMode = "create" | "edit" | null;

function checkIsTenantAdmin(user: any): boolean {
  if (!user) return false;
  const sysRole = (user.systemRole || "").toUpperCase();
  const roles: string[] = Array.isArray(user.roles) ? user.roles.map((r: string) => r.toUpperCase()) : [];
  const perms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
  return (
    roles.includes("TENANT_ADMIN") ||
    roles.includes("SUPER_ADMIN") ||
    sysRole === "TENANT_ADMIN" ||
    sysRole === "SUPER_ADMIN" ||
    perms.includes("tenant:settings") ||
    perms.includes("tenant:manage") ||
    perms.includes("platform:manage")
  );
}

function checkIsUnitScoped(user: any): boolean {
  if (!user || checkIsTenantAdmin(user)) return false;
  const sysRole = (user.systemRole || "").toUpperCase();
  const roles: string[] = Array.isArray(user.roles) ? user.roles.map((r: string) => r.toUpperCase()) : [];
  const perms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
  return (
    roles.includes("UNIT_ADMIN") ||
    roles.includes("DELIVERY_HEAD") ||
    sysRole === "UNIT_ADMIN" ||
    sysRole === "DELIVERY_HEAD" ||
    perms.includes("unit_admin:manage")
  );
}

export default function PodsPage() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isTenantAdmin, setIsTenantAdmin] = useState<boolean>(false);
  const [isUnitScoped, setIsUnitScoped] = useState<boolean>(false);

  const [pods, setPods] = useState<Pod[]>([]);
  const [availableRecruiters, setAvailableRecruiters] = useState<any[]>([]);
  const [modalRecruiters, setModalRecruiters] = useState<any[]>([]);
  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Filtering states
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>("all");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<"all" | "cycle">("all");

  const userPerms = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const canManage = isTenantAdmin || isUnitScoped || userPerms.includes("pod:manage") || userPerms.includes("pod:create") || userPerms.includes("pod:edit") || currentUser?.systemRole === "BRANCH_ADMIN";

  // Modal Pop-up state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);

  // Form fields
  const [podName, setPodName] = useState("");
  const [podUnitId, setPodUnitId] = useState("");
  const [podBranchId, setPodBranchId] = useState("");
  const [podHeadId, setPodHeadId] = useState("");
  const [podHeadOpen, setPodHeadOpen] = useState(false);
  const [podDescription, setPodDescription] = useState("");
  const [selectedRecruiterIds, setSelectedRecruiterIds] = useState<string[]>([]);
  const [recruiterSearch, setRecruiterSearch] = useState<string>("");

  useEffect(() => {
    async function initUser() {
      try {
        const cachedUser = atsApi.auth.getCurrentUser();
        let profile = null;
        try {
          profile = await atsApi.auth.getProfile();
        } catch (_) {}
        const user = profile || cachedUser;
        setCurrentUser(user);

        const tenantAdmin = checkIsTenantAdmin(user);
        const unitScoped = checkIsUnitScoped(user);
        setIsTenantAdmin(tenantAdmin);
        setIsUnitScoped(unitScoped);

        const userRoles = Array.isArray(user?.roles) ? user.roles.map((r: string) => r.toUpperCase()) : [];
        const userPerms = Array.isArray(user?.permissions) ? user.permissions : [];
        const sysRole = (user?.systemRole || "").toUpperCase();

        const canAccess =
          tenantAdmin ||
          unitScoped ||
          userRoles.includes("BRANCH_ADMIN") ||
          sysRole === "BRANCH_ADMIN" ||
          userPerms.includes("pod:view") ||
          userPerms.includes("pod:create") ||
          userPerms.includes("user:manage");

        setHasAccess(!!canAccess);

        if (canAccess) {
          const unitId = unitScoped ? (user?.businessUnitId || user?.business_unit_id || "") : "all";
          setSelectedUnitFilter(unitId);
          await loadData(user, tenantAdmin, unitScoped, unitId);
        } else {
          setLoading(false);
        }
      } catch (err: any) {
        toast.error("Initialization failed: " + err.message);
        setLoading(false);
      }
    }

    initUser();
  }, []);

  const loadData = async (
    userParam?: any,
    isTenantParam?: boolean,
    isUnitParam?: boolean,
    unitFilterParam?: string,
    branchFilterParam?: string,
  ) => {
    try {
      setLoading(true);
      const user = userParam !== undefined ? userParam : currentUser;
      const tenantAdmin = isTenantParam !== undefined ? isTenantParam : isTenantAdmin;
      const unitScoped = isUnitParam !== undefined ? isUnitParam : isUnitScoped;

      const userUnitId = user?.businessUnitId || user?.business_unit_id;
      let effectiveUnitId: string | undefined = undefined;
      let effectiveBranchId: string | undefined = undefined;

      if (unitScoped) {
        effectiveUnitId = userUnitId;
        effectiveBranchId = undefined; // Backend resolves branch from unit
      } else if (!tenantAdmin) {
        effectiveBranchId = user?.branchId || undefined;
      } else {
        const uFilter = unitFilterParam !== undefined ? unitFilterParam : selectedUnitFilter;
        const bFilter = branchFilterParam !== undefined ? branchFilterParam : selectedBranchFilter;
        if (uFilter && uFilter !== "all") effectiveUnitId = uFilter;
        if (bFilter && bFilter !== "all") effectiveBranchId = bFilter;
      }

      const scopeParams: { branchId?: string; businessUnitId?: string } = {};
      if (effectiveUnitId) scopeParams.businessUnitId = effectiveUnitId;
      if (effectiveBranchId) scopeParams.branchId = effectiveBranchId;

      const [podsData, availRecruitersData, unitsData, branchesData] = await Promise.all([
        atsApi.pods.list(scopeParams).catch(() => []),
        atsApi.pods.getAvailableRecruiters(scopeParams).catch(() => []),
        atsApi.businessUnits.list().catch(() => []),
        atsApi.branches.list().catch(() => []),
      ]);

      setPods(podsData || []);
      setAvailableRecruiters(availRecruitersData || []);
      setBusinessUnits(unitsData || []);
      setBranches(branchesData || []);
    } catch (err: any) {
      toast.error("Failed to load recruitment pods: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnitFilterChange = async (unitId: string) => {
    setSelectedUnitFilter(unitId);
    await loadData(currentUser, isTenantAdmin, isUnitScoped, unitId, selectedBranchFilter);
  };

  const handleBranchFilterChange = async (branchId: string) => {
    setSelectedBranchFilter(branchId);
    await loadData(currentUser, isTenantAdmin, isUnitScoped, selectedUnitFilter, branchId);
  };

  // Helper: Fetch available recruiters for a given business unit (used when selecting unit in modal)
  const fetchRecruitersForUnit = async (buId: string) => {
    if (!buId) {
      setModalRecruiters([]);
      return;
    }
    try {
      const recs = await atsApi.pods.getAvailableRecruiters({ businessUnitId: buId });
      setModalRecruiters(recs || []);
    } catch (err: any) {
      console.warn("Failed to fetch unit recruiters:", err);
      setModalRecruiters([]);
    }
  };

  const openCreateModal = async () => {
    setPodName("");
    setPodDescription("");
    setRecruiterSearch("");
    setSelectedPod(null);
    setPodHeadId("");

    let defaultUnitId = "";
    if (isUnitScoped) {
      defaultUnitId = currentUser?.businessUnitId || currentUser?.business_unit_id || "";
    } else if (selectedUnitFilter !== "all") {
      defaultUnitId = selectedUnitFilter;
    } else if (businessUnits.length > 0) {
      defaultUnitId = businessUnits[0].id;
    }

    setPodUnitId(defaultUnitId);
    setSelectedRecruiterIds([]);

    if (defaultUnitId) {
      await fetchRecruitersForUnit(defaultUnitId);
    } else {
      setModalRecruiters(availableRecruiters);
    }

    setModalMode("create");
  };

  const openEditModal = async (pod: Pod) => {
    setSelectedPod(pod);
    setPodName(pod.name);
    setPodDescription(pod.description || "");
    setPodHeadId(pod.podHeadId || "");
    setRecruiterSearch("");

    const targetUnitId = pod.businessUnitId || currentUser?.businessUnitId || "";
    setPodUnitId(targetUnitId);
    setSelectedRecruiterIds(pod.members.map((m) => m.id));

    // Fetch unassigned recruiters in this unit
    try {
      const unassigned = await atsApi.pods.getAvailableRecruiters({ businessUnitId: targetUnitId });
      // In edit mode: current pod members + unassigned recruiters
      const existingMembers = pod.members.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        roleName: m.systemRole || "Recruiter",
        systemRole: m.systemRole || "RECRUITER",
      }));

      const unassignedIds = new Set(unassigned.map((u: any) => u.id));
      const combined = [...existingMembers];
      unassigned.forEach((u: any) => {
        if (!existingMembers.some((m) => m.id === u.id)) {
          combined.push(u);
        }
      });

      setModalRecruiters(combined);
    } catch (_) {
      setModalRecruiters(pod.members);
    }

    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedPod(null);
    setRecruiterSearch("");
  };

  const handleCreatePod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podName.trim()) return toast.error("Please provide a pod name.");

    const effectiveUnitId = isUnitScoped
      ? currentUser?.businessUnitId || currentUser?.business_unit_id
      : podUnitId;

    if (!effectiveUnitId) {
      return toast.error("An operating unit is required to create a recruitment pod.");
    }

    try {
      setSubmitting(true);
      await atsApi.pods.create({
        name: podName.trim(),
        businessUnitId: effectiveUnitId,
        podHeadId: podHeadId || undefined,
        description: podDescription.trim() || undefined,
        recruiterIds: selectedRecruiterIds,
      });
      toast.success(`Recruitment pod "${podName}" created successfully!`);
      closeModal();
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create pod");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPod) return;
    if (!podName.trim()) return toast.error("Please provide a pod name.");

    const effectiveUnitId = isUnitScoped
      ? selectedPod.businessUnitId || currentUser?.businessUnitId
      : podUnitId || selectedPod.businessUnitId;

    try {
      setSubmitting(true);
      await atsApi.pods.update(selectedPod.id, {
        name: podName.trim(),
        businessUnitId: effectiveUnitId || undefined,
        podHeadId: podHeadId || null,
        description: podDescription.trim() || null,
        recruiterIds: selectedRecruiterIds,
      });
      toast.success(`Recruitment pod "${podName}" updated successfully!`);
      closeModal();
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update pod");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePod = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the pod "${name}"? Members will be unassigned.`)) return;
    try {
      setSubmitting(true);
      await atsApi.pods.delete(id);
      toast.success(`Pod "${name}" deleted successfully.`);
      if (selectedPod?.id === id) closeModal();
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete pod");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetRR = async () => {
    if (!confirm("Reset the round-robin cycle? All pods will become available for assignment again.")) return;
    try {
      setSubmitting(true);
      const effectiveUnitId = isUnitScoped
        ? currentUser?.businessUnitId || currentUser?.business_unit_id
        : selectedUnitFilter !== "all"
        ? selectedUnitFilter
        : undefined;

      await atsApi.pods.resetCycle(effectiveUnitId ? { businessUnitId: effectiveUnitId } : undefined);
      toast.success("Round-robin cycle reset successfully!");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reset cycle");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRecruiter = (id: string) => {
    setSelectedRecruiterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Pod Lead Candidates: Available recruiters in the modal who are not already leading another pod
  const podLeadCandidates = useMemo(() => {
    return modalRecruiters.filter((u) => {
      // Exclude users already heading another pod
      const isHeadOfAnotherPod = pods.some(
        (p) => p.podHeadId === u.id && (!selectedPod || p.id !== selectedPod.id)
      );
      return !isHeadOfAnotherPod;
    });
  }, [modalRecruiters, pods, selectedPod]);

  // Filtered recruiters checklist for modal
  const filteredModalRecruiters = useMemo(() => {
    if (!recruiterSearch.trim()) return modalRecruiters;
    const q = recruiterSearch.toLowerCase().trim();
    return modalRecruiters.filter(
      (r) => r.fullName?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
    );
  }, [modalRecruiters, recruiterSearch]);

  const assignedUnitName = useMemo(() => {
    const uId = currentUser?.businessUnitId || currentUser?.business_unit_id;
    if (!uId) return null;
    const found = businessUnits.find((b) => b.id === uId);
    return found?.name || currentUser?.businessUnitName || "My Operating Unit";
  }, [currentUser, businessUnits]);

  // ── Loading & Guard States ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        <p className="mt-3 text-xs text-neutral-500 font-semibold tracking-wide">Loading Recruitment Pods…</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <Card className="border border-red-500/20 bg-red-950/10 max-w-2xl mx-auto mt-10 p-6 text-center">
        <div className="inline-flex h-12 w-12 rounded-full bg-red-500/10 text-red-500 items-center justify-center text-2xl mb-3">
          <Icon icon="heroicons:shield-exclamation" className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-red-600 mb-1">Access Denied</h2>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          Only Workspace Administrators, Delivery Heads, or Unit Admins can view and configure recruitment pods.
        </p>
      </Card>
    );
  }

  // Delivery Head or Unit Admin without assigned business unit
  if (isUnitScoped && !currentUser?.businessUnitId && !currentUser?.business_unit_id) {
    return (
      <Card className="border border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/20 max-w-2xl mx-auto mt-10 p-6 text-center">
        <div className="inline-flex h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 items-center justify-center text-2xl mb-3">
          <Icon icon="heroicons:exclamation-triangle" className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-amber-800 dark:text-amber-400 mb-1">Operating Unit Assignment Required</h2>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
          Recruitment pods are strictly scoped to operating units. Your account is not currently assigned to an operating unit. Please ask a Workspace Administrator to assign your account to an operating unit.
        </p>
      </Card>
    );
  }

  const totalPodsCount = pods.length;
  const availablePodsCount = pods.filter((p) => p.isAvailableForAssignment).length;
  const usedPodsCount = pods.filter((p) => !p.isAvailableForAssignment).length;
  const cycleProgressPercent = totalPodsCount > 0 ? Math.round((usedPodsCount / totalPodsCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* HEADER TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2 tracking-tight">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
              <Icon icon="heroicons:users" className="h-5 w-5" />
            </div>
            Recruitment Pods Management
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Unit-level recruitment pods, Pod Lead coordination, and automated round-robin requisition distribution.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Unit Scope Display: Locked Badge for Unit Admins / Delivery Heads */}
          {!isTenantAdmin ? (
            <div className="flex items-center gap-1.5 bg-indigo-50/70 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-2xs">
              <Icon icon="heroicons:rectangle-group" className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Unit: <strong className="text-indigo-700 dark:text-indigo-400 font-bold">{assignedUnitName || "My Unit"}</strong>
              </span>
            </div>
          ) : (
            /* Dropdowns for Tenant Admins: Filter by Operating Unit & Branch */
            <div className="flex items-center gap-2">
              {businessUnits.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-lg px-2.5 py-1 shadow-2xs">
                  <Icon icon="heroicons:rectangle-group" className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <select
                    value={selectedUnitFilter}
                    onChange={(e) => handleUnitFilterChange(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer"
                  >
                    <option value="all">All Operating Units</option>
                    {businessUnits.map((bu) => (
                      <option key={bu.id} value={bu.id}>
                        {bu.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {branches.length > 1 && (
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-lg px-2.5 py-1 shadow-2xs">
                  <Icon icon="heroicons:building-office-2" className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                  <select
                    value={selectedBranchFilter}
                    onChange={(e) => handleBranchFilterChange(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer"
                  >
                    <option value="all">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {canManage && (
            <>
              <Button
                onClick={handleResetRR}
                disabled={submitting}
                variant="outline"
                className="flex items-center gap-1.5 border-neutral-300 dark:border-slate-700 font-semibold text-xs h-8.5 px-3 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800"
              >
                <Icon icon="heroicons:arrow-path" className="h-3.5 w-3.5" />
                Reset Cycle
              </Button>

              <Button
                onClick={openCreateModal}
                disabled={submitting}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs text-xs h-8.5 px-3.5 cursor-pointer"
              >
                <Icon icon="heroicons:plus" className="h-3.5 w-3.5" />
                Create Pod
              </Button>
            </</>
          )}
        </div>
      </div>

      {/* VIEW TABS */}
      <div className="flex border-b border-neutral-200 dark:border-slate-800">
        {(["all", "cycle"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveView(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 text-xs uppercase tracking-wider font-semibold transition cursor-pointer ${
              activeView === tab
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            }`}
          >
            <Icon
              icon={tab === "all" ? "heroicons:list-bullet" : "heroicons:arrow-path-20-solid"}
              className="h-3.5 w-3.5"
            />
            {tab === "all" ? "All Pods" : "Round-Robin Assignment Cycle"}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════
          TAB 1 — ALL PODS TABLE
          ═══════════════════════════════════════ */}
      {activeView === "all" ? (
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 dark:bg-slate-800/40 border-b border-neutral-200 dark:border-slate-800">
                  <th className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                    Pod Name
                  </th>
                  <th className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                    Operating Unit
                  </th>
                  <th className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                    Pod Lead
                  </th>
                  <th className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                    Recruiters
                  </th>
                  <th className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 text-center">
                    Jobs Assigned
                  </th>
                  <th className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 text-center">
                    Cycle Status
                  </th>
                  {canManage && (
                    <th className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800 text-xs">
                {pods.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-neutral-500 font-medium">
                      <div className="flex flex-col items-center gap-2.5">
                        <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                          <Icon icon="heroicons:users" className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-neutral-800 dark:text-white">
                          No recruitment pods found for this operating unit
                        </span>
                        <p className="text-[11px] text-neutral-400 max-w-sm">
                          Assemble recruiters into unit-level pods to automate round-robin job distribution.
                        </p>
                        <Button
                          size="sm"
                          onClick={openCreateModal}
                          className="mt-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 px-3 cursor-pointer"
                        >
                          <Icon icon="heroicons:plus" className="h-3.5 w-3.5 mr-1" />
                          Create First Pod
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pods.map((pod) => (
                    <tr
                      key={pod.id}
                      className="hover:bg-neutral-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Pod Name */}
                      <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                              pod.isAvailableForAssignment ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <div>
                            <span
                              className="font-bold text-xs text-neutral-900 dark:text-white hover:text-indigo-600 cursor-pointer"
                              onClick={() => openEditModal(pod)}
                            >
                              {pod.name}
                            </span>
                            {pod.description && (
                              <div className="text-[10px] text-neutral-400 font-normal max-w-[200px] truncate">
                                {pod.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Operating Unit */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          <Icon icon="heroicons:rectangle-group" className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          {pod.businessUnitName || assignedUnitName || "Operating Unit"}
                        </span>
                      </td>

                      {/* Pod Lead */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {pod.podHeadName ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {pod.podHeadName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-neutral-900 dark:text-white">{pod.podHeadName}</div>
                              <div className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold tracking-wide">POD LEAD</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Recruiters */}
                      <td className="py-3 px-4">
                        {pod.members.length === 0 ? (
                          <span className="text-neutral-400 italic text-[11px]">No recruiters</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {pod.members.slice(0, 3).map((m) => (
                              <Badge
                                key={m.id}
                                className="bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 text-[10px] px-1.5 py-0.5 border-0 font-medium"
                              >
                                {m.fullName.split(" ")[0]}
                              </Badge>
                            ))}
                            {pod.members.length > 3 && (
                              <Badge className="bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.5 border border-indigo-200 font-semibold">
                                +{pod.members.length - 3}
                              </Badge>
                            )}
                            <div className="w-full text-[10px] text-neutral-400 mt-0.5">
                              {pod.members.length} recruiter{pod.members.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Jobs Assigned */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 font-semibold px-2 py-0.5 text-[11px]">
                          {pod.jobsCount} Jobs
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge
                          className={`text-[10px] font-semibold border px-2 py-0.5 rounded-md ${
                            pod.isAvailableForAssignment
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                          }`}
                        >
                          {pod.isAvailableForAssignment ? "Available" : "Assigned"}
                        </Badge>
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(pod)}
                              className="p-1 rounded-md border border-neutral-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 transition cursor-pointer"
                              title="Edit Pod Details & Members"
                            >
                              <Icon icon="heroicons:pencil-square" className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePod(pod.id, pod.name)}
                              className="p-1 rounded-md border border-neutral-200 dark:border-slate-700 hover:border-red-500 hover:bg-red-50 dark:hover:bg-slate-800 text-neutral-400 hover:text-red-600 transition cursor-pointer"
                              title="Delete Pod"
                            >
                              <Icon icon="heroicons:trash" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* ═══════════════════════════════════════
           TAB 2 — CYCLE STATUS DASHBOARD
           ═══════════════════════════════════════ */
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Pods", value: totalPodsCount, icon: "heroicons:users", color: "indigo" },
              { label: "Available Next", value: availablePodsCount, icon: "heroicons:check-circle", color: "emerald" },
              { label: "Used This Cycle", value: usedPodsCount, icon: "heroicons:clock", color: "amber" },
              { label: "Cycle Progress", value: `${cycleProgressPercent}%`, icon: "heroicons:arrow-path-20-solid", color: "slate" },
            ].map(({ label, value, icon, color }) => (
              <Card
                key={label}
                className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center gap-3 shadow-xs rounded-xl"
              >
                <div
                  className={`h-9 w-9 rounded-lg bg-${color}-50 text-${color}-600 dark:bg-slate-800 flex items-center justify-center text-base shrink-0`}
                >
                  <Icon icon={icon} />
                </div>
                <div>
                  <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{label}</div>
                  <div className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">{value}</div>
                </div>
              </Card>
            ))}
          </div>

          {cycleProgressPercent === 100 && (
            <div className="border border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 p-3 rounded-lg text-xs text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-2">
              <Icon icon="heroicons:exclamation-triangle" className="h-4 w-4 shrink-0 text-amber-600" />
              Round-Robin Cycle Complete — All pods in this unit have received jobs. Click &quot;Reset Cycle&quot; to begin a new round.
            </div>
          )}

          <div>
            <h2 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2.5">
              Operating Unit Pod Slots
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pods.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-neutral-400 italic">No pods configured in this unit.</div>
              ) : (
                pods.map((pod, idx) => (
                  <Card
                    key={pod.id}
                    className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs rounded-xl"
                  >
                    <div className="flex items-start justify-between mb-2.5">
                      <div>
                        <div className="text-[9.5px] text-neutral-400 font-bold uppercase tracking-wider">Slot {idx + 1}</div>
                        <div className="text-xs font-bold text-neutral-900 dark:text-white mt-0.5">{pod.name}</div>
                      </div>
                      <Badge
                        className={`text-[9.5px] uppercase font-semibold border px-2 py-0.5 rounded-md ${
                          pod.isAvailableForAssignment
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {pod.isAvailableForAssignment ? "Available" : "Used"}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                      <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-slate-800">
                        <span>Pod Lead</span>
                        <span className="font-semibold text-neutral-900 dark:text-white">{pod.podHeadName || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-slate-800">
                        <span>Recruiters</span>
                        <span className="font-semibold text-neutral-900 dark:text-white">{pod.members.length}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Jobs Dispatched</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{pod.jobsCount}</span>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          CENTERED MODAL POP-UP — Create / Edit Pod
          ═══════════════════════════════════════════════════ */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                  <Icon
                    icon={modalMode === "create" ? "heroicons:plus" : "heroicons:pencil-square"}
                    className="h-4 w-4"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {modalMode === "create" ? "Create Recruitment Pod" : `Edit Pod: ${selectedPod?.name}`}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Unit-scoped pod configuration and recruiter round-robin routing
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
              >
                <Icon icon="heroicons:x-mark" className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form
              onSubmit={modalMode === "create" ? handleCreatePod : handleUpdatePod}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Pod Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                      Pod Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Domestic Healthcare Pod"
                      value={podName}
                      onChange={(e) => setPodName(e.target.value)}
                      required
                      className="text-xs h-9 font-medium"
                    />
                  </div>

                  {/* Operating Unit */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                      Operating Unit <span className="text-red-500">*</span>
                    </label>
                    {isUnitScoped ? (
                      <div className="w-full text-xs font-semibold border border-neutral-200 dark:border-slate-700 rounded-lg p-2.5 bg-neutral-100/70 dark:bg-slate-800 text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                        <Icon icon="heroicons:rectangle-group" className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span>{assignedUnitName}</span>
                      </div>
                    ) : (
                      <select
                        value={podUnitId}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setPodUnitId(val);
                          setPodHeadId("");
                          setSelectedRecruiterIds([]);
                          await fetchRecruitersForUnit(val);
                        }}
                        className="w-full text-xs font-semibold border border-neutral-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        required
                      >
                        <option value="">— Select Operating Unit —</option>
                        {businessUnits.map((bu) => (
                          <option key={bu.id} value={bu.id}>
                            {bu.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Pod Lead */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                    Designate Pod Lead (Team Lead)
                  </label>
                  <Popover open={podHeadOpen} onOpenChange={setPodHeadOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={podHeadOpen}
                        className="w-full justify-between h-9 px-3 text-xs font-medium border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white hover:bg-neutral-50"
                      >
                        {podHeadId && podLeadCandidates.find((u) => u.id === podHeadId) ? (
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {podLeadCandidates.find((u) => u.id === podHeadId)?.fullName}{" "}
                            <span className="font-normal text-neutral-500 text-[10px]">
                              ({podLeadCandidates.find((u) => u.id === podHeadId)?.email})
                            </span>
                          </span>
                        ) : (
                          <span className="font-normal text-neutral-400">— None (Unassigned) —</span>
                        )}
                        <Icon icon="heroicons:chevron-up-down" className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search eligible recruiters..." className="h-8.5 text-xs" />
                        <CommandList>
                          <CommandEmpty>No unassigned recruiters available.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="unassigned"
                              onSelect={() => {
                                setPodHeadId("");
                                setPodHeadOpen(false);
                              }}
                              className="text-xs italic text-neutral-500 cursor-pointer"
                            >
                              — None (Unassigned) —
                              {podHeadId === "" && (
                                <Icon icon="heroicons:check" className="ml-auto h-3.5 w-3.5 text-indigo-600" />
                              )}
                            </CommandItem>
                            {podLeadCandidates.map((u) => (
                              <CommandItem
                                key={u.id}
                                value={`${u.fullName} ${u.email}`}
                                onSelect={() => {
                                  setPodHeadId(u.id);
                                  // Auto-include pod head into members list
                                  if (!selectedRecruiterIds.includes(u.id)) {
                                    setSelectedRecruiterIds((prev) => [...prev, u.id]);
                                  }
                                  setPodHeadOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <div className="flex flex-col flex-1 truncate">
                                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                                    {u.fullName}
                                  </span>
                                  <span className="text-[10px] text-neutral-400 truncate">{u.email}</span>
                                </div>
                                {podHeadId === u.id && (
                                  <Icon icon="heroicons:check" className="ml-auto h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-[10px] text-neutral-500">
                    Only recruiters in this operating unit who are not leading another pod are shown.
                  </p>
                </div>

                {/* Recruiters Multi-Select */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Assign Pod Members ({selectedRecruiterIds.length} selected)
                    </label>
                    {modalRecruiters.length > 4 && (
                      <div className="relative w-44">
                        <Input
                          placeholder="Filter available..."
                          value={recruiterSearch}
                          onChange={(e) => setRecruiterSearch(e.target.value)}
                          className="text-[11px] h-7 pl-2"
                        />
                      </div>
                    )}
                  </div>

                  {modalRecruiters.length === 0 ? (
                    <div className="border border-dashed border-neutral-200 dark:border-slate-800 rounded-xl p-4 text-center text-xs text-neutral-400 italic">
                      No unassigned recruiters available in this operating unit.
                    </div>
                  ) : (
                    <div className="border border-neutral-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto divide-y divide-neutral-100 dark:divide-slate-800 shadow-2xs">
                      {filteredModalRecruiters.map((r) => {
                        const isChecked = selectedRecruiterIds.includes(r.id);
                        const isHead = podHeadId === r.id;

                        return (
                          <div
                            key={r.id}
                            onClick={() => toggleRecruiter(r.id)}
                            className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                              isChecked
                                ? "bg-indigo-50/50 dark:bg-indigo-950/20"
                                : "hover:bg-neutral-50/70 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="h-3.5 w-3.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-neutral-900 dark:text-white truncate flex items-center gap-1.5">
                                <span>{r.fullName}</span>
                                {isHead && (
                                  <Badge className="bg-indigo-50 text-indigo-700 text-[9px] px-1 py-0 border border-indigo-200 font-semibold">
                                    Pod Lead
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-neutral-400 truncate">{r.email}</div>
                            </div>
                            <Badge className="text-[9.5px] bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 border-0 font-medium shrink-0">
                              Recruiter
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[10px] text-neutral-400">
                    Displays only available recruiters in this unit. Recruiters assigned to other pods cannot be selected.
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                    Pod Description & Domain Focus
                  </label>
                  <textarea
                    placeholder="Optional — specify domain specializations, client requisition focus, or pod goals..."
                    value={podDescription}
                    onChange={(e) => setPodDescription(e.target.value)}
                    className="w-full text-xs border border-neutral-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-normal"
                    rows={2}
                  />
                </div>

                {/* Danger Zone (Edit mode only) */}
                {modalMode === "edit" && selectedPod && (
                  <div className="border border-red-200 dark:border-red-900/40 rounded-xl p-3 bg-red-50/30 dark:bg-red-950/10 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1">
                        <Icon icon="heroicons:exclamation-triangle" className="h-3.5 w-3.5" />
                        Delete Pod
                      </div>
                      <p className="text-[10px] text-red-600/80">
                        Unassigns all recruiters and removes this pod from cycle routing.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePod(selectedPod.id, selectedPod.name)}
                      disabled={submitting}
                      className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs font-semibold h-7 px-3"
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="shrink-0 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850 px-6 py-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeModal}
                  disabled={submitting}
                  className="text-xs h-8 px-3.5"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !podName.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 px-4 shadow-2xs cursor-pointer"
                >
                  {submitting
                    ? modalMode === "create"
                      ? "Creating Pod..."
                      : "Saving Changes..."
                    : modalMode === "create"
                    ? "Create Pod"
                    : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
