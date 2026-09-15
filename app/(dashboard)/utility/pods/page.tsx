"use client";

import React, { useEffect, useState } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    roles.includes("ADMIN") ||
    roles.includes("SUPER_ADMIN") ||
    sysRole === "ADMIN" ||
    sysRole === "SUPER_ADMIN" ||
    perms.includes("tenant:settings") ||
    perms.includes("tenant:manage")
  );
}

function getUserAssignedBranchIds(user: any): string[] {
  if (!user) return [];
  const list = [
    user.branchId,
    user.branch_id,
    ...(Array.isArray(user.assignedBranchIds) ? user.assignedBranchIds : []),
    ...(Array.isArray(user.assigned_branch_ids) ? user.assigned_branch_ids : []),
  ].filter(Boolean);
  return Array.from(new Set(list));
}

export default function PodsPage() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isTenantAdmin, setIsTenantAdmin] = useState<boolean>(false);
  const [allowedBranchIds, setAllowedBranchIds] = useState<string[]>([]);

  const [pods, setPods] = useState<Pod[]>([]);
  const [availableRecruiters, setAvailableRecruiters] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("all");

  const [activeView, setActiveView] = useState<"all" | "cycle">("all");

  // Modal Pop-up state (replacing sidebar)
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);

  // Form fields
  const [podName, setPodName] = useState("");
  const [podBranchId, setPodBranchId] = useState("");
  const [podHeadId, setPodHeadId] = useState("");
  const [podDescription, setPodDescription] = useState("");
  const [selectedRecruiterIds, setSelectedRecruiterIds] = useState<string[]>([]);
  const [recruiterSearch, setRecruiterSearch] = useState<string>("");

  useEffect(() => {
    const user = atsApi.auth.getCurrentUser();
    setCurrentUser(user);
    const tenantAdmin = checkIsTenantAdmin(user);
    setIsTenantAdmin(tenantAdmin);
    const allowedBranches = getUserAssignedBranchIds(user);
    setAllowedBranchIds(allowedBranches);

    const userRoles = Array.isArray(user?.roles) ? user.roles.map((r: string) => r.toUpperCase()) : [];
    const userPerms = Array.isArray(user?.permissions) ? user.permissions : [];
    const sysRole = (user?.systemRole || "").toUpperCase();

    const canAccess =
      tenantAdmin ||
      userRoles.includes("BRANCH_ADMIN") ||
      sysRole === "BRANCH_ADMIN" ||
      userPerms.includes("pod:view") ||
      userPerms.includes("pod:create") ||
      userPerms.includes("user:manage");

    setHasAccess(!!canAccess);

    if (canAccess) {
      let initialBranch = "all";
      if (!tenantAdmin) {
        initialBranch = user?.branchId || allowedBranches[0] || "";
      } else {
        const storedBranch = typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
        if (storedBranch) initialBranch = storedBranch;
      }

      setSelectedBranchFilter(initialBranch);
      loadData(initialBranch, user, tenantAdmin, allowedBranches);

      const handleBranchChanged = () => {
        const updatedBranch = typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
        if (tenantAdmin) {
          const b = updatedBranch || "all";
          setSelectedBranchFilter(b);
          loadData(b, user, tenantAdmin, allowedBranches);
        } else {
          if (updatedBranch && allowedBranches.includes(updatedBranch)) {
            setSelectedBranchFilter(updatedBranch);
            loadData(updatedBranch, user, tenantAdmin, allowedBranches);
          }
        }
      };
      window.addEventListener("branchChanged", handleBranchChanged);
      return () => window.removeEventListener("branchChanged", handleBranchChanged);
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async (
    branchFilter = selectedBranchFilter,
    userParam?: any,
    isTenantParam?: boolean,
    allowedBranchesParam?: string[]
  ) => {
    try {
      setLoading(true);
      const user = userParam !== undefined ? userParam : (currentUser || atsApi.auth.getCurrentUser());
      const tenantAdmin = isTenantParam !== undefined ? isTenantParam : checkIsTenantAdmin(user);
      const allowedIds = allowedBranchesParam !== undefined ? allowedBranchesParam : getUserAssignedBranchIds(user);

      let effectiveBranchFilter = branchFilter;
      if (!tenantAdmin) {
        if (!effectiveBranchFilter || effectiveBranchFilter === "all" || !allowedIds.includes(effectiveBranchFilter)) {
          effectiveBranchFilter = user?.branchId || allowedIds[0] || "";
        }
        if (selectedBranchFilter !== effectiveBranchFilter) {
          setSelectedBranchFilter(effectiveBranchFilter);
        }
      }

      const bid = effectiveBranchFilter && effectiveBranchFilter !== "all" ? effectiveBranchFilter : undefined;
      const [podsData, availRecruitersData, usersData, branchesData, rolesData] = await Promise.all([
        atsApi.pods.list(bid),
        atsApi.pods.getAvailableRecruiters(bid),
        atsApi.auth.listUsers(),
        atsApi.branches.list().catch(() => []),
        atsApi.auth.listRoles(bid, true).catch(() => []),
      ]);

      let visibleBranches = branchesData || [];
      if (!tenantAdmin) {
        visibleBranches = visibleBranches.filter((b: any) =>
          allowedIds.includes(b.id) ||
          (user?.branchId && b.id === user.branchId) ||
          (user?.branchName && b.name.toLowerCase() === user.branchName.toLowerCase())
        );
        if (visibleBranches.length === 0 && (user?.branchId || user?.branchName)) {
          visibleBranches = [{
            id: user?.branchId || allowedIds[0] || "assigned-branch",
            name: user?.branchName || "My Branch Office"
          }];
        }
      }

      setBranches(visibleBranches);
      setPods(podsData || []);
      setAvailableRecruiters(availRecruitersData || []);

      let activeUsers = (usersData || []).filter((u: any) => u.isActive !== false && u.is_active !== false);
      if (!tenantAdmin) {
        activeUsers = activeUsers.filter((u: any) => {
          const userBranch = u.branchId || u.branch_id;
          const uAssigned: string[] = Array.isArray(u.assignedBranchIds)
            ? u.assignedBranchIds
            : Array.isArray(u.assigned_branch_ids)
            ? u.assigned_branch_ids
            : [];
          return (
            (userBranch && allowedIds.includes(userBranch)) ||
            uAssigned.some((id) => allowedIds.includes(id)) ||
            (u.branchName && user?.branchName && u.branchName.toLowerCase() === user.branchName.toLowerCase())
          );
        });
      }
      setAllUsers(activeUsers);
      setRoles(rolesData || []);
    } catch (err: any) {
      toast.error("Failed to load recruitment pods: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchFilterChange = async (branchId: string) => {
    setSelectedBranchFilter(branchId);
    await loadData(branchId);
  };

  const openCreateModal = () => {
    setPodName("");
    let defaultBranch = "";
    if (!isTenantAdmin) {
      defaultBranch = branches[0]?.id || currentUser?.branchId || allowedBranchIds[0] || "";
    } else {
      defaultBranch = (selectedBranchFilter !== "all" ? selectedBranchFilter : null) || branches[0]?.id || "";
    }
    setPodBranchId(defaultBranch);
    setPodHeadId("");
    setPodDescription("");
    setSelectedRecruiterIds([]);
    setRecruiterSearch("");
    setSelectedPod(null);
    setModalMode("create");
  };

  const openEditModal = (pod: Pod) => {
    setSelectedPod(pod);
    setPodName(pod.name);
    let effectiveBranch = pod.branchId || "";
    if (!isTenantAdmin) {
      effectiveBranch = branches[0]?.id || currentUser?.branchId || allowedBranchIds[0] || pod.branchId || "";
    } else if (!effectiveBranch) {
      effectiveBranch = branches[0]?.id || "";
    }
    setPodBranchId(effectiveBranch);
    setPodHeadId(pod.podHeadId || "");
    setPodDescription(pod.description || "");
    setSelectedRecruiterIds(pod.members.map((m) => m.id));
    setRecruiterSearch("");
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
    try {
      setSubmitting(true);
      await atsApi.pods.create({
        name: podName.trim(),
        branchId: podBranchId || undefined,
        podHeadId: podHeadId || undefined,
        description: podDescription.trim() || undefined,
        recruiterIds: selectedRecruiterIds,
      });
      toast.success(`Recruitment pod "${podName}" created successfully!`);
      closeModal();
      await loadData(selectedBranchFilter);
    } catch (err: any) {
      toast.error("Failed to create pod: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPod) return;
    if (!podName.trim()) return toast.error("Please provide a pod name.");
    try {
      setSubmitting(true);
      await atsApi.pods.update(selectedPod.id, {
        name: podName.trim(),
        branchId: podBranchId || null,
        podHeadId: podHeadId || null,
        description: podDescription.trim() || null,
        recruiterIds: selectedRecruiterIds,
      });
      toast.success(`Recruitment pod "${podName}" updated successfully!`);
      closeModal();
      await loadData(selectedBranchFilter);
    } catch (err: any) {
      toast.error("Failed to update pod: " + err.message);
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
      await loadData(selectedBranchFilter);
    } catch (err: any) {
      toast.error("Failed to delete pod: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetRR = async () => {
    if (!confirm("Reset the round-robin cycle? All pods will become available for assignment again.")) return;
    try {
      setSubmitting(true);
      const bid = (!isTenantAdmin && branches[0]?.id)
        ? branches[0].id
        : (selectedBranchFilter !== "all" ? selectedBranchFilter : undefined);
      await atsApi.pods.resetCycle(bid);
      toast.success("Round-robin cycle reset successfully!");
      await loadData(selectedBranchFilter);
    } catch (err: any) {
      toast.error("Failed to reset cycle: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRecruiter = (id: string) => {
    setSelectedRecruiterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ── Loading / No-access states ──────────────────────────────────────
  if (loading) {
    return (
      <div>
        <SiteBreadcrumb />
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          <p className="mt-4 text-sm text-default-500 font-semibold">Loading Recruitment Pods…</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div>
        <SiteBreadcrumb />
        <Card className="border border-red-500/20 bg-red-950/10 max-w-2xl mx-auto mt-10">
          <div className="p-8 text-center">
            <div className="inline-flex h-12 w-12 rounded-full bg-red-500/10 text-red-500 items-center justify-center text-2xl mb-4">
              <Icon icon="heroicons:shield-exclamation" />
            </div>
            <h2 className="text-xl font-bold text-red-500 mb-2">Access Denied</h2>
            <p className="text-sm text-default-600">Only workspace Administrators or Delivery Heads can view and manage recruitment teams (pods).</p>
          </div>
        </Card>
      </div>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────
  // Pod Lead Candidates: ONLY users assigned roles created from the POD_LEAD template
  // who are not already leading another pod (a user can lead only one pod at a time)
  const recruiterUsersForHead = allUsers.filter((u) => {
    const matchBranch =
      !podBranchId ||
      u.branchId === podBranchId ||
      u.branch_id === podBranchId ||
      (Array.isArray(u.assignedBranchIds) && u.assignedBranchIds.includes(podBranchId)) ||
      (Array.isArray(u.assigned_branch_ids) && u.assigned_branch_ids.includes(podBranchId));

    if (!matchBranch) return false;

    // At a time a pod lead can be pod lead of a single pod only.
    // If they are currently the head of another pod, exclude them from the dropdown.
    const isHeadOfAnotherPod = pods.some(
      (p) => p.podHeadId === u.id && (!selectedPod || p.id !== selectedPod.id)
    );
    if (isHeadOfAnotherPod) return false;

    // Check if the user's role was created from the POD_LEAD template
    const userRoleObj = roles.find((r) => r.id === u.roleId);
    const baseArchetype = (
      userRoleObj?.systemRole ||
      userRoleObj?.replacesSystemRole ||
      u.systemRole ||
      (u.roles && u.roles[0]) ||
      u.roleName ||
      ""
    ).toUpperCase();

    const isPodLeadTemplate =
      baseArchetype === "POD_LEAD" ||
      u.roles?.includes("POD_LEAD") ||
      (selectedPod && selectedPod.podHeadId === u.id);

    return isPodLeadTemplate && !u.roles?.includes("ADMIN") && !u.roles?.includes("SUPER_ADMIN");
  });

  const formatDisplayRoleName = (roleName?: string) => {
    if (!roleName) return "Recruiter";
    switch (roleName.toUpperCase()) {
      case "ACCOUNT_MANAGER":
        return "Account Manager (System Role)";
      case "POD_LEAD":
        return "Pod Lead (System Role)";
      case "RECRUITER":
        return "Recruiter (System Role)";
      case "DELIVERY_HEAD":
        return "Delivery Head (System Role)";
      case "BRANCH_ADMIN":
        return "Branch Admin (System Role)";
      case "ADMIN":
        return "Admin (System Role)";
      default:
        return roleName;
    }
  };

  // Recruiters for the pod checklist: Recruiters in the same branch
  const recruitersForModal = allUsers.filter((u) => {
    // 1. Must be an active user
    if (u.isActive === false || u.is_active === false) return false;

    const matchBranch =
      !podBranchId ||
      u.branchId === podBranchId ||
      u.branch_id === podBranchId ||
      (Array.isArray(u.assignedBranchIds) && u.assignedBranchIds.includes(podBranchId)) ||
      (Array.isArray(u.assigned_branch_ids) && u.assigned_branch_ids.includes(podBranchId));

    if (!matchBranch) return false;

    const userRoleObj = roles.find((r) => r.id === u.roleId);
    const baseArchetype = (
      userRoleObj?.systemRole ||
      userRoleObj?.replacesSystemRole ||
      u.systemRole ||
      (u.roles && u.roles[0]) ||
      u.roleName ||
      ""
    ).toUpperCase();

    const perms: string[] = Array.isArray(u.permissions) ? u.permissions : [];
    const hasSourcingPermission = perms.includes("submission:create") || perms.includes("candidate:create") || perms.includes("submission:view");

    const isRecruiterTemplate =
      hasSourcingPermission ||
      baseArchetype === "RECRUITER" ||
      baseArchetype === "POD_LEAD" ||
      u.roles?.includes("RECRUITER") ||
      u.roles?.includes("POD_LEAD");

    if (!isRecruiterTemplate || u.roles?.includes("ADMIN") || u.roles?.includes("SUPER_ADMIN")) {
      return false;
    }

    if (recruiterSearch.trim()) {
      const q = recruiterSearch.toLowerCase().trim();
      return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPodsCount = pods.length;
  const availablePodsCount = pods.filter((p) => p.isAvailableForAssignment).length;
  const usedPodsCount = pods.filter((p) => !p.isAvailableForAssignment).length;
  const cycleProgressPercent = totalPodsCount > 0 ? Math.round((usedPodsCount / totalPodsCount) * 100) : 0;

  return (
    <div className="space-y-5">
      <SiteBreadcrumb />

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-default-150 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-default-900 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
              <Icon icon="heroicons:users" className="h-6 w-6" />
            </div>
            Recruitment Pods Management
          </h1>
          <p className="text-xs text-default-500 mt-1">
            Create recruitment teams, assign heads, and review round-robin job assignment routing isolated to branch offices.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Branch Scope: Dropdown for Tenant Admins / Multi-branch, or Locked Badge for single-branch staff / Branch Admin */}
          {isTenantAdmin ? (
            branches.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-default-250 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-2xs">
                <Icon icon="heroicons:building-office-2" className="h-4 w-4 text-indigo-600 shrink-0" />
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => handleBranchFilterChange(e.target.value)}
                  className="bg-transparent text-xs font-bold text-default-800 dark:text-white outline-none cursor-pointer"
                >
                  <option value="all">All Branches ({pods.length})</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )
          ) : branches.length > 1 ? (
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-default-250 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-2xs">
              <Icon icon="heroicons:building-office-2" className="h-4 w-4 text-indigo-600 shrink-0" />
              <select
                value={selectedBranchFilter}
                onChange={(e) => handleBranchFilterChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-default-800 dark:text-white outline-none cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <Button
            onClick={handleResetRR}
            disabled={submitting}
            variant="outline"
            className="flex items-center gap-1.5 border-default-250 font-semibold text-xs h-9 px-3 text-default-700 hover:bg-default-100 dark:hover:bg-slate-800"
          >
            <Icon icon="heroicons:arrow-path" className="h-4 w-4" />
            Reset Cycle
          </Button>

          <Button
            onClick={openCreateModal}
            disabled={submitting}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm text-xs h-9 px-4 cursor-pointer"
          >
            <Icon icon="heroicons:plus" className="h-4 w-4" />
            Create Pod
          </Button>
        </div>
      </div>

      {/* VIEW TABS */}
      <div className="flex border-b border-default-200">
        {(["all", "cycle"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveView(tab)}
            className={`flex items-center gap-1.5 px-5 py-2.5 border-b-2 text-xs uppercase tracking-wider font-bold transition cursor-pointer ${
              activeView === tab
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-default-500 hover:text-default-800"
            }`}
          >
            <Icon
              icon={tab === "all" ? "heroicons:list-bullet" : "heroicons:arrow-path-20-solid"}
              className="h-4 w-4"
            />
            {tab === "all" ? "All Pods" : "Assignment Cycle Status"}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════
          TAB 1 — ALL PODS TABLE
          ═══════════════════════════════════════ */}
      {activeView === "all" ? (
        <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-default-50/70 dark:bg-slate-800/40 border-b border-default-150">
                  <th className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-wider text-default-600">Pod Name</th>
                  {isTenantAdmin && selectedBranchFilter === "all" && (
                    <th className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-wider text-default-600">Branch Office</th>
                  )}
                  <th className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-wider text-default-600">Pod Lead</th>
                  <th className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-wider text-default-600">Recruiters</th>
                  <th className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-wider text-default-600 text-center">Jobs Assigned</th>
                  <th className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-wider text-default-600 text-center">Status</th>
                  <th className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-wider text-default-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100 text-xs">
                {pods.length === 0 ? (
                  <tr>
                    <td colSpan={isTenantAdmin && selectedBranchFilter === "all" ? 7 : 6} className="py-16 text-center text-default-500 font-semibold italic">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 flex items-center justify-center">
                          <Icon icon="heroicons:users" className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-bold text-default-800 dark:text-white">
                          No recruitment pods found for this branch
                        </span>
                        <p className="text-xs text-default-450 max-w-sm">
                          Group recruiters into pods to automate round-robin job distribution and streamline candidate submissions.
                        </p>
                        <Button
                          size="sm"
                          onClick={openCreateModal}
                          className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 px-4 cursor-pointer"
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
                      className="hover:bg-indigo-50/20 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      {/* Pod Name */}
                      <td className="py-4 px-4 font-bold text-default-900 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${pod.isAvailableForAssignment ? "bg-emerald-500 ring-4 ring-emerald-500/20" : "bg-amber-500 ring-4 ring-amber-500/20"}`} />
                          <div>
                            <div className="font-bold text-xs text-default-900 hover:text-indigo-600 cursor-pointer" onClick={() => openEditModal(pod)}>
                              {pod.name}
                            </div>
                            {pod.description && (
                              <div className="text-[10px] text-default-450 font-normal mt-0.5 max-w-[200px] truncate">{pod.description}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Branch Office (Only if Tenant Admin has All Branches selected) */}
                      {isTenantAdmin && selectedBranchFilter === "all" && (
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-default-800 dark:text-default-200">
                            <Icon icon="heroicons:building-office" className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            {pod.branchName || "Default Office"}
                          </span>
                        </td>
                      )}

                      {/* Pod Lead */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {pod.podHeadName ? (
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {pod.podHeadName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-default-900">{pod.podHeadName}</div>
                              <div className="text-[9.5px] text-indigo-600 font-semibold">POD LEAD</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-default-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Recruiters */}
                      <td className="py-4 px-4">
                        {pod.members.length === 0 ? (
                          <span className="text-default-400 italic text-[11px]">No members</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {pod.members.slice(0, 3).map((m) => (
                              <Badge key={m.id} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[9px] px-1.5 py-0.5 border-0 font-medium">
                                {m.fullName.split(" ")[0]}
                              </Badge>
                            ))}
                            {pod.members.length > 3 && (
                              <Badge className="bg-indigo-50 text-indigo-700 text-[9px] px-1.5 py-0.5 border border-indigo-200 font-bold">
                                +{pod.members.length - 3} more
                              </Badge>
                            )}
                            <div className="w-full text-[9.5px] text-default-400 mt-0.5">{pod.members.length} recruiter{pod.members.length !== 1 ? "s" : ""} assigned</div>
                          </div>
                        )}
                      </td>

                      {/* Jobs */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 font-bold px-2 py-0.5 text-[11px]">
                          {pod.jobsCount} Jobs
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <Badge className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full ${
                          pod.isAvailableForAssignment
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                        }`}>
                          {pod.isAvailableForAssignment ? "Available" : "Assigned"}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(pod)}
                            className="p-1.5 rounded-lg border border-default-200 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-default-600 hover:text-indigo-600 transition cursor-pointer"
                            title="Edit Pod Details & Members"
                          >
                            <Icon icon="heroicons:pencil-square" className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePod(pod.id, pod.name)}
                            className="p-1.5 rounded-lg border border-default-200 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 text-default-400 hover:text-red-600 transition cursor-pointer"
                            title="Delete Pod"
                          >
                            <Icon icon="heroicons:trash" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
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
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Pods", value: totalPodsCount, icon: "heroicons:users", color: "indigo" },
              { label: "Available", value: availablePodsCount, icon: "heroicons:check-circle", color: "emerald" },
              { label: "Used This Cycle", value: usedPodsCount, icon: "heroicons:clock", color: "amber" },
              { label: "Cycle Progress", value: `${cycleProgressPercent}%`, icon: "heroicons:arrow-path-20-solid", color: "pink" },
            ].map(({ label, value, icon, color }) => (
              <Card key={label} className="border border-default-150 bg-white dark:bg-slate-900 p-4 flex items-center gap-3 shadow-xs rounded-xl">
                <div className={`h-10 w-10 rounded-lg bg-${color}-50 text-${color}-600 dark:bg-${color}-950/20 dark:text-${color}-400 flex items-center justify-center text-lg shrink-0`}>
                  <Icon icon={icon} />
                </div>
                <div>
                  <div className="text-[10px] text-default-450 font-bold uppercase tracking-wider">{label}</div>
                  <div className={`text-xl font-bold text-${color === "indigo" ? "default-900" : color + "-600"} mt-0.5`}>{value}</div>
                </div>
              </Card>
            ))}
          </div>

          {cycleProgressPercent === 100 && (
            <div className="border border-red-200 bg-red-50/30 p-3 rounded-lg text-xs text-red-700 font-bold flex items-center gap-2">
              <Icon icon="heroicons:exclamation-triangle" className="h-5 w-5 shrink-0" />
              Cycle Complete — All pods have been used. Click &quot;Reset Cycle&quot; to start a new round.
            </div>
          )}

          <div>
            <h2 className="text-sm font-bold text-default-800 uppercase tracking-wider mb-3">Pod Slot Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pods.length === 0 ? (
                <div className="col-span-full py-12 text-center text-default-500 italic">No pods configured.</div>
              ) : (
                pods.map((pod, idx) => (
                  <Card key={pod.id} className="border border-default-150 bg-white dark:bg-slate-900 p-4 shadow-xs hover:shadow-sm transition-all rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-[10px] text-default-400 font-bold uppercase tracking-wider">Pod {idx + 1}</div>
                        <div className="text-sm font-bold text-default-900 mt-0.5">{pod.name}</div>
                      </div>
                      <Badge className={`text-[9px] uppercase font-bold border-0 px-2 py-0.5 ${
                        pod.isAvailableForAssignment
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {pod.isAvailableForAssignment ? "Available" : "Used"}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-xs text-default-600">
                      <div className="flex justify-between py-1 border-b border-default-100">
                        <span>Pod Lead</span>
                        <span className="font-bold text-default-900">{pod.podHeadName || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-default-100">
                        <span>Recruiters</span>
                        <span className="font-bold text-default-900">{pod.members.length}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Jobs Assigned</span>
                        <span className="font-bold text-indigo-600">{pod.jobsCount}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                  <Icon icon={modalMode === "create" ? "heroicons:plus" : "heroicons:pencil-square"} className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {modalMode === "create" ? "Create Recruitment Pod" : `Edit Pod: ${selectedPod?.name}`}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Assemble recruitment team, assign Pod Lead, and configure branch round-robin routing
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
              >
                <Icon icon="heroicons:x-mark" className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form
              onSubmit={modalMode === "create" ? handleCreatePod : handleUpdatePod}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pod Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                      Pod Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Engineering Pod Alpha"
                      value={podName}
                      onChange={(e) => setPodName(e.target.value)}
                      required
                      className="text-xs h-10 font-medium"
                    />
                  </div>

                  {/* Branch Location */}
                  {branches.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                        Branch Office <span className="text-red-500">*</span>
                      </label>
                      {!isTenantAdmin && branches.length <= 1 ? (
                        <div className="w-full text-xs font-semibold border border-neutral-200 dark:border-slate-700 rounded-lg p-2.5 bg-neutral-100/70 dark:bg-slate-800 text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                          <Icon icon="heroicons:building-office-2" className="h-4 w-4 text-indigo-600 shrink-0" />
                          <span>{branches[0]?.name || currentUser?.branchName || "My Branch Office"}</span>
                        </div>
                      ) : (
                        <select
                          value={podBranchId}
                          onChange={(e) => setPodBranchId(e.target.value)}
                          className="w-full text-xs font-semibold border border-neutral-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          required
                        >
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {/* Pod Lead */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Assign Pod Lead (Team Lead)
                  </label>
                  <select
                    value={podHeadId}
                    onChange={(e) => setPodHeadId(e.target.value)}
                    className="w-full text-xs font-semibold border border-indigo-200 dark:border-indigo-900/60 rounded-lg p-2.5 bg-indigo-50/30 dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">— None (Unassigned) —</option>
                    {recruiterUsersForHead.length === 0 ? (
                      <option disabled value="">(No available staff with Pod Lead role in this branch)</option>
                    ) : (
                      recruiterUsersForHead.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({formatDisplayRoleName(u.roleName)}) — {u.email}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-[10.5px] text-default-450 leading-relaxed">
                    💡 Only staff assigned to roles created from the <strong>POD_LEAD</strong> template who are not already leading another pod are eligible as Pod Lead.
                  </p>
                </div>

                {/* Recruiters Multi-Select */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Assign Recruiters ({selectedRecruiterIds.length} selected)
                    </label>
                    {recruitersForModal.length > 5 && (
                      <div className="relative w-44">
                        <Input
                          placeholder="Search recruiters..."
                          value={recruiterSearch}
                          onChange={(e) => setRecruiterSearch(e.target.value)}
                          className="text-[11px] h-7 pl-2"
                        />
                      </div>
                    )}
                  </div>

                  {recruitersForModal.length === 0 ? (
                    <div className="border border-dashed border-default-200 dark:border-slate-800 rounded-xl p-4 text-center text-xs text-default-450 italic">
                      No recruiters available for this branch office.
                    </div>
                  ) : (
                    <div className="border border-default-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto divide-y divide-default-100 dark:divide-slate-800 shadow-2xs">
                      {recruitersForModal.map((r) => {
                        const isChecked = selectedRecruiterIds.includes(r.id);
                        const assignedPod = pods.find((p) => p.id === r.podId);
                        const inAnotherPod = assignedPod && (!selectedPod || selectedPod.id !== r.podId);

                        return (
                          <div
                            key={r.id}
                            onClick={() => toggleRecruiter(r.id)}
                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                              isChecked
                                ? "bg-indigo-50/60 dark:bg-indigo-950/30"
                                : "hover:bg-default-50/60 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="h-4 w-4 rounded border-default-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-default-900 truncate flex items-center gap-1.5">
                                <span>{r.fullName}</span>
                                {inAnotherPod && (
                                  <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-0 text-[9px] px-1 py-0 font-bold">
                                    in {assignedPod.name}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-default-400 truncate">{r.email}</div>
                            </div>
                            <Badge className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-0 font-semibold shrink-0">
                              {formatDisplayRoleName(r.roleName)}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[10px] text-default-400">Select recruiters to receive round-robin candidate and job dispatches.</p>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Pod Description & Objectives
                  </label>
                  <textarea
                    placeholder="Optional — describe this pod's industry focus, domain specialization, or goals..."
                    value={podDescription}
                    onChange={(e) => setPodDescription(e.target.value)}
                    className="w-full text-xs border border-neutral-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-normal"
                    rows={3}
                  />
                </div>

                {/* Danger Zone (Edit mode only) */}
                {modalMode === "edit" && selectedPod && (
                  <div className="border border-red-200 dark:border-red-900/30 rounded-xl p-3.5 bg-red-50/30 dark:bg-red-950/10 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1">
                        <Icon icon="heroicons:exclamation-triangle" className="h-4 w-4" />
                        Delete Pod
                      </div>
                      <p className="text-[10.5px] text-red-600/80">
                        Unassigns all recruiters and removes active cycle routing.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePod(selectedPod.id, selectedPod.name)}
                      disabled={submitting}
                      className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs font-bold h-8"
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="shrink-0 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 px-6 py-3.5 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeModal}
                  disabled={submitting}
                  className="text-xs h-9 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !podName.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 shadow-xs cursor-pointer"
                >
                  {submitting
                    ? (modalMode === "create" ? "Creating Pod..." : "Saving Changes...")
                    : (modalMode === "create" ? "Create Pod" : "Save Changes")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
