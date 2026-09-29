"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Check, X, Shield, Lock, CheckSquare, Loader2, Sparkles } from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { atsApi } from "@/lib/ats-api";
import { Job } from "../../data/mock-jobs";
import { getAssignedPersonDisplay } from "../../lib/job-table-utils";

export interface JobAssignModalProps {
  job: Job | null;
  currentUser: any;
  currentUserBranchId: string | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedFields: Partial<Job>) => void;
}

export function JobAssignModal({
  job,
  currentUser,
  currentUserBranchId,
  isOpen,
  onClose,
  onSuccess,
}: JobAssignModalProps) {
  const [assignTab, setAssignTab] = useState<"pods" | "users">("pods");
  const [assignSearch, setAssignSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedPodIds, setSelectedPodIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [recruiterFilterMode, setRecruiterFilterMode] = useState<"all" | "podMembers">("all");

  // Assignment Context Data
  const [usersList, setUsersList] = useState<any[]>([]);
  const [podsList, setPodsList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);

  // Load context data when modal is open
  useEffect(() => {
    if (!isOpen) return;
    async function loadAssignmentData() {
      try {
        const [users, pods, branches, roles] = await Promise.all([
          atsApi.auth.listUsers().catch(() => []),
          atsApi.pods.list().catch(() => []),
          atsApi.branches.list().catch(() => []),
          atsApi.auth.listRoles(undefined, true).catch(() => []),
        ]);
        if (users && users.length > 0) setUsersList(users);
        if (pods && pods.length > 0) setPodsList(pods);
        if (branches && branches.length > 0) setBranchesList(branches);
        if (roles && roles.length > 0) setRolesList(roles);
      } catch (err) {
        console.warn("[JobAssignModal] Failed to fetch assignment context data:", err);
      }
    }
    loadAssignmentData();
  }, [isOpen]);

  const getUserRoleLabel = useCallback(
    (u: any, branchId?: string): string => {
      const activeBranchId =
        branchId || (typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null);

      // 1. Check branch-specific custom roles in active branch
      if (
        activeBranchId &&
        u.branchRoles &&
        u.branchRoles[activeBranchId] &&
        Array.isArray(u.branchRoles[activeBranchId]) &&
        u.branchRoles[activeBranchId].length > 0
      ) {
        const branchRoleIdOrName = u.branchRoles[activeBranchId][0];
        const matchedRole = (rolesList || []).find(
          (cr: any) =>
            cr.id === branchRoleIdOrName ||
            cr.name?.toUpperCase() === String(branchRoleIdOrName).toUpperCase()
        );
        if (matchedRole?.name) return matchedRole.name;
        if (typeof branchRoleIdOrName === "string" && !branchRoleIdOrName.includes("-"))
          return branchRoleIdOrName;
      }

      // 2. Check any branch roles if user has branch assignments
      if (u.branchRoles && typeof u.branchRoles === "object") {
        for (const bRoleArray of Object.values(u.branchRoles) as any[]) {
          if (Array.isArray(bRoleArray) && bRoleArray.length > 0) {
            const rItem = bRoleArray[0];
            const matchedRole = (rolesList || []).find(
              (cr: any) =>
                cr.id === rItem || cr.name?.toUpperCase() === String(rItem).toUpperCase()
            );
            if (matchedRole?.name) return matchedRole.name;
            if (typeof rItem === "string" && !rItem.includes("-")) return rItem;
          }
        }
      }

      // 3. Check customRoleName or roleName
      if (u.customRoleName) return u.customRoleName;
      if (u.roleName) {
        const matchedRole = (rolesList || []).find(
          (cr: any) =>
            cr.id === u.roleName || cr.name?.toUpperCase() === String(u.roleName).toUpperCase()
        );
        if (matchedRole?.name) return matchedRole.name;
        return u.roleName;
      }

      // 4. System role
      if (u.systemRole) {
        return u.systemRole.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      }

      // 5. Roles array
      if (Array.isArray(u.roles) && u.roles.length > 0) {
        const rItem = u.roles[0];
        const matchedRole = (rolesList || []).find(
          (cr: any) =>
            cr.id === rItem || cr.name?.toUpperCase() === String(rItem).toUpperCase()
        );
        if (matchedRole?.name) return matchedRole.name;
        return rItem;
      }

      return "Staff";
    },
    [rolesList]
  );

  // Target branch resolution for job
  const targetBranch = useMemo(() => {
    if (!job) return null;
    if (job.branchId) {
      const b = branchesList.find((x: any) => x.id === job.branchId);
      if (b) return b;
    }
    if ((job as any).businessUnit || 'N/A') {
      const b = branchesList.find(
        (x: any) => x.name?.toLowerCase() === (job as any).businessUnit || 'N/A'?.toLowerCase()
      );
      if (b) return b;
    }
    const activeId = typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
    if (activeId) {
      const b = branchesList.find((x: any) => x.id === activeId);
      if (b) return b;
    }
    return null;
  }, [job, branchesList]);

  // Target branch unit resolution for job
  const targetUnit = useMemo(() => {
    if (!job) return null;
    if ((job as any).businessUnit || 'N/A'Ref) return (job as any).businessUnit || 'N/A'Ref;
    const targetUnitId = (job as any).businessUnit || 'N/A'Id || (job as any).business_unit_id;
    if (targetUnitId && targetBranch?.businessUnits) {
      const u = targetBranch.businessUnits.find((x: any) => x.id === targetUnitId);
      if (u) return u;
    }
    return null;
  }, [job, targetBranch]);

  // ─── ROLE & PERMISSION SCOPING FOR ASSIGNMENT ─────────────────────────
  const userRoles = useMemo(() => {
    return (currentUser?.roles || []).map((r: string) => r.toUpperCase().replace(/[\s-_]+/g, ""));
  }, [currentUser]);

  const userPerms = useMemo(() => {
    return Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  }, [currentUser]);

  const isSuperOrTenantAdmin = useMemo(() => {
    return (
      currentUser?.systemRole === "TENANT_ADMIN" ||
      currentUser?.systemRole === "SUPER_ADMIN" ||
      userRoles.includes("TENANTADMIN") ||
      userRoles.includes("SUPERADMIN") ||
      userPerms.includes("tenant:manage") ||
      userPerms.includes("tenant:settings")
    );
  }, [currentUser, userRoles, userPerms]);

  const isBranchAdmin = useMemo(() => {
    return (
      userRoles.includes("BRANCHADMIN") ||
      userPerms.includes("branch_admin:manage") ||
      userPerms.includes("branch:assign_user")
    );
  }, [userRoles, userPerms]);

  const isDeliveryHead = useMemo(() => {
    return userRoles.includes("DELIVERYHEAD") || userRoles.includes("DELIVERY_HEAD");
  }, [userRoles]);

  const isHigherRole = isSuperOrTenantAdmin || isBranchAdmin || isDeliveryHead;

  // Pod Head role & active pod detection
  const myPod = useMemo(() => {
    if (!currentUser) return null;
    const uid = currentUser.id || (currentUser as any).dbId;
    const email = (currentUser.email || "").toLowerCase();
    return (
      podsList.find(
        (p: any) =>
          p.podHeadId === uid ||
          (p.podHeadEmail && p.podHeadEmail.toLowerCase() === email) ||
          p.id === currentUser.podId ||
          p.id === (currentUser as any).pod_id
      ) || null
    );
  }, [podsList, currentUser]);

  const isPodHead = useMemo(() => {
    if (isHigherRole) return false;
    if (
      userRoles.includes("PODHEAD") ||
      userRoles.includes("POD_HEAD") ||
      userRoles.includes("PODLEAD") ||
      userRoles.includes("POD_LEAD")
    ) {
      return true;
    }
    const uid = currentUser?.id || (currentUser as any)?.dbId;
    const email = (currentUser?.email || "").toLowerCase();
    return podsList.some(
      (p: any) => p.podHeadId === uid || (p.podHeadEmail && p.podHeadEmail.toLowerCase() === email)
    );
  }, [isHigherRole, userRoles, currentUser, podsList]);

  // ─── UNIT / BRANCH POLICY ENFORCEMENT ─────────────────────────────────
  const branchAllowsPods = useMemo(() => {
    const targetPolicy = targetUnit || targetBranch;
    if (!targetPolicy) return true;
    const allowNone = Boolean(targetPolicy.allowNone ?? targetPolicy.allow_none);
    if (allowNone) return false; // allowNone = Direct Assignment Only
    const allowPods = (targetPolicy.allowPods ?? targetPolicy.allow_pods) !== false;
    return allowPods;
  }, [targetUnit, targetBranch]);

  const branchAllowsDirectStaff = useMemo(() => {
    const targetPolicy = targetUnit || targetBranch;
    if (!targetPolicy) return true;
    const allowDirect = targetPolicy.allowDirect ?? targetPolicy.allow_direct;
    if (allowDirect === false) return false;
    const allowDirectStaff = targetPolicy.allowDirectStaff ?? targetPolicy.allow_direct_staff;
    if (allowDirectStaff === false) return false;
    return true;
  }, [targetUnit, targetBranch]);

  // ─── SCOPED PODS & USERS (Role Scoping) ─────────────────────────────────
  const targetBranchPods = useMemo(() => {
    const bId = targetBranch?.id;
    const uId = job?.businessUnitId || (job as any)?.business_unit_id || targetUnit?.id;
    let list = podsList;

    if (uId) {
      const unitPods = podsList.filter(
        (p: any) => p.businessUnitId === uId || p.business_unit_id === uId
      );
      if (unitPods.length > 0) {
        list = unitPods;
      }
    } else if (bId && bId !== "all") {
      const filtered = podsList.filter(
        (p: any) => !p.branchId || !p.branch_id || p.branchId === bId || p.branch_id === bId
      );
      list = filtered.length > 0 ? filtered : podsList;
    }

    // Role Scoping: If user is Pod Head (and not higher role), ONLY show their own pod!
    if (isPodHead && myPod) {
      return [myPod];
    }
    return list;
  }, [podsList, targetBranch, job, targetUnit, isPodHead, myPod]);

  const branchRecruiterUsers = useMemo(() => {
    const bId = targetBranch?.id;
    const targetUnitId = job?.businessUnitId || (job as any)?.business_unit_id || targetUnit?.id;
    let list = usersList.filter((u: any) => u.isActive !== false && u.is_active !== false);

    // Filter to only users who act as Recruiters (RECRUITER, POD_LEAD)
    list = list.filter((u: any) => {
      const rawSystemRole = u.systemRole || u.system_role;
      if (rawSystemRole && ["RECRUITER", "POD_LEAD"].includes(rawSystemRole.toUpperCase())) {
        return true;
      }
      const uRoles = u.roles || [];
      const userSysRoles = uRoles.map((r: string) => {
        const match = rolesList.find((cr: any) => cr.name === r || cr.id === r);
        return match?.systemRole || r;
      });
      return userSysRoles.some((sr: any) => {
        const upper = typeof sr === "string" ? sr.toUpperCase() : "";
        return ["RECRUITER", "POD_LEAD"].includes(upper);
      });
    });

    // Co-source scoping
    const isCoSourcedJob =
      (job as any)?.isCoSourced ||
      ((job as any)?.sharedBranchIds && (job as any).sharedBranchIds.length > 0);
    const isSharedBranchViewing = isCoSourcedJob && job?.branchId !== currentUserBranchId;

    if (targetUnitId) {
      const unitScoped = list.filter(
        (u: any) => (u.businessUnitId || u.business_unit_id) === targetUnitId
      );
      if (unitScoped.length > 0) {
        list = unitScoped;
      }
    } else if (isSharedBranchViewing && currentUserBranchId) {
      list = list.filter((u: any) => {
        const userBranchId = u.branchId || u.branch_id;
        if (userBranchId === currentUserBranchId) return true;
        const assignedBranches = Array.isArray(u.assignedBranchIds)
          ? u.assignedBranchIds
          : Array.isArray(u.assigned_branch_ids)
          ? u.assigned_branch_ids
          : [];
        return assignedBranches.includes(currentUserBranchId);
      });
    } else if (bId && bId !== "all") {
      const scoped = list.filter((u: any) => {
        const userBranchId = u.branchId || u.branch_id;
        if (userBranchId === bId) return true;
        const assignedBranches = Array.isArray(u.assignedBranchIds)
          ? u.assignedBranchIds
          : Array.isArray(u.assigned_branch_ids)
          ? u.assigned_branch_ids
          : [];
        if (assignedBranches.includes(bId)) return true;
        return false;
      });
      if (scoped.length > 0) list = scoped;
    }

    // Role Scoping: If user is Pod Head, ONLY show recruiters in their own pod!
    if (isPodHead && myPod) {
      const myPodId = myPod.id;
      const myPodMemberIds = new Set(
        (myPod.users || myPod.members || []).map((m: any) => m.id || m.userId).filter(Boolean)
      );
      return list.filter(
        (u: any) =>
          u.podId === myPodId ||
          u.pod_id === myPodId ||
          myPodMemberIds.has(u.id) ||
          u.id === myPod.podHeadId
      );
    }

    return list;
  }, [usersList, targetBranch, job, currentUserBranchId, isPodHead, myPod, rolesList, targetUnit]);

  // Synchronize initial selections on modal open
  useEffect(() => {
    if (!isOpen || !job) return;

    setAssignSearch("");
    setIsAssigning(false);
    setRecruiterFilterMode("all");

    // Initial selected pod IDs
    const initialPodIds: string[] = [];
    if (job.podId && job.podId !== "none" && job.podId !== "off") {
      const pIds = job.podId.split(",").map((s) => s.trim()).filter(Boolean);
      initialPodIds.push(...pIds);
    }
    const podStr =
      job.podName && job.podName !== "N/A" && job.podName.toLowerCase() !== "unassigned"
        ? job.podName
        : "";
    if (podStr) {
      const podNames = podStr.split(",").map((s) => s.trim().toLowerCase());
      for (const p of targetBranchPods) {
        const pName = (p.name || "").toLowerCase();
        if (podNames.includes(pName) && !initialPodIds.includes(p.id)) {
          initialPodIds.push(p.id);
        }
      }
    }
    setSelectedPodIds(initialPodIds);

    // Initial selected user IDs (recruiters)
    const initialSelected: string[] = [];
    if (job.primaryRecruiterId) {
      initialSelected.push(job.primaryRecruiterId);
    }

    if (
      (job as any).assignedTo || 'N/A' &&
      (job as any).assignedTo || 'N/A' !== "Unassigned" &&
      !(job as any).assignedTo || 'N/A'.toUpperCase().startsWith("ALL")
    ) {
      const names = (job as any).assignedTo || 'N/A'.split(",").map((s) => s.trim().toLowerCase());
      for (const u of usersList) {
        const uName = (u.fullName || u.name || "").toLowerCase();
        if (names.includes(uName) && !initialSelected.includes(u.id)) {
          initialSelected.push(u.id);
        }
      }
    }
    setSelectedUserIds(initialSelected);

    // Auto-select tab based on branch policy and current assignment
    if (!branchAllowsPods) {
      setAssignTab("users");
    } else if (!branchAllowsDirectStaff) {
      setAssignTab("pods");
    } else if (initialPodIds.length > 0) {
      setAssignTab("pods");
    } else if (initialSelected.length > 0) {
      setAssignTab("users");
    } else {
      setAssignTab(targetBranchPods.length > 0 ? "pods" : "users");
    }
  }, [isOpen, job, branchAllowsPods, branchAllowsDirectStaff, targetBranchPods, usersList]);

  const filteredPods = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return targetBranchPods;
    return targetBranchPods.filter((p: any) => {
      const name = (p.name || "").toLowerCase();
      const head = (p.podHeadName || "").toLowerCase();
      return name.includes(q) || head.includes(q);
    });
  }, [targetBranchPods, assignSearch]);

  const isUserInSelectedPods = useCallback(
    (userId: string, userPodId?: string) => {
      if (selectedPodIds.length === 0) return false;
      if (userPodId && selectedPodIds.includes(userPodId)) return true;
      for (const pid of selectedPodIds) {
        const pod =
          targetBranchPods.find((p: any) => p.id === pid) ||
          (podsList || []).find((p: any) => p.id === pid);
        if (pod) {
          if (pod.podHeadId === userId) return true;
          if (Array.isArray(pod.members) && pod.members.some((m: any) => (m.id || m.userId) === userId))
            return true;
          if (Array.isArray(pod.users) && pod.users.some((m: any) => (m.id || m.userId) === userId))
            return true;
        }
      }
      return false;
    },
    [selectedPodIds, targetBranchPods, podsList]
  );

  const filteredUsers = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    let list = branchRecruiterUsers;
    if (selectedPodIds.length > 0 && recruiterFilterMode === "podMembers") {
      list = list.filter((u: any) => isUserInSelectedPods(u.id, u.podId || u.pod_id));
    }
    if (!q) return list;
    return list.filter((u: any) => {
      const name = (u.fullName || u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = getUserRoleLabel(u, targetBranch?.id).toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [
    branchRecruiterUsers,
    assignSearch,
    getUserRoleLabel,
    targetBranch,
    selectedPodIds,
    recruiterFilterMode,
    isUserInSelectedPods,
  ]);

  const selectedPodMembersCount = useMemo(() => {
    return branchRecruiterUsers.filter((u: any) => isUserInSelectedPods(u.id, u.podId || u.pod_id))
      .length;
  }, [branchRecruiterUsers, isUserInSelectedPods]);

  const handleTogglePodSelection = (podId: string) => {
    setSelectedPodIds((prev) =>
      prev.includes(podId) ? prev.filter((id) => id !== podId) : [...prev, podId]
    );
  };

  const handleSelectAllFilteredPods = () => {
    const filteredIds = filteredPods.map((p: any) => p.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id: string) => selectedPodIds.includes(id));
    if (allSelected) {
      setSelectedPodIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedPodIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredUsers.map((u: any) => u.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id: string) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSaveCombinedAssignment = async (override?: { unassignAll?: boolean }) => {
    if (!job) return;
    setIsAssigning(true);
    try {
      const payload: Record<string, any> = {};

      if (override?.unassignAll) {
        payload.podId = "none";
        payload.podIds = [];
        payload.podName = "N/A";
        payload.assignedTo = "Unassigned";
        payload.primaryRecruiter = "N/A";
        payload.primaryRecruiterId = null;
      } else {
        // 1. Pods assignment:
        if (selectedPodIds.length > 0) {
          const allPods = [...podsList, ...targetBranchPods];
          const selectedPods = selectedPodIds
            .map((id) => allPods.find((p: any) => p.id === id))
            .filter(Boolean);
          const podNames = Array.from(new Set(selectedPods.map((p: any) => p.name || "Pod")));
          payload.podId = selectedPodIds[0];
          payload.podIds = selectedPodIds;
          payload.podName = podNames.join(", ");
        } else {
          payload.podId = "none";
          payload.podIds = [];
          payload.podName = "N/A";
        }

        // 2. Recruiters assignment:
        if (selectedUserIds.length > 0) {
          const selectedUsers = usersList.filter((u) => selectedUserIds.includes(u.id));
          const recruiterNames = selectedUsers.map((u) => u.fullName || u.name || u.email);
          payload.assignedTo = recruiterNames.join(", ");
          payload.primaryRecruiterId = selectedUserIds[0];
          payload.primaryRecruiter =
            selectedUsers[0]?.fullName || selectedUsers[0]?.name || recruiterNames[0];
        } else {
          payload.assignedTo = "Unassigned";
          payload.primaryRecruiter = "N/A";
          payload.primaryRecruiterId = null;
        }
      }

      await atsApi.jobs.update(job.id, payload);

      onSuccess({
        podId: payload.podId,
        podName: payload.podName,
        assignedTo: payload.assignedTo,
        primaryRecruiter: payload.primaryRecruiter,
        primaryRecruiterId: payload.primaryRecruiterId,
      } as any);

      const summaryParts: string[] = [];
      if (selectedPodIds.length > 0 && !override?.unassignAll) {
        summaryParts.push(`${selectedPodIds.length} Pod${selectedPodIds.length > 1 ? "s" : ""}`);
      }
      if (selectedUserIds.length > 0 && !override?.unassignAll) {
        summaryParts.push(
          `${selectedUserIds.length} Recruiter${selectedUserIds.length > 1 ? "s" : ""}`
        );
      }

      if (override?.unassignAll || summaryParts.length === 0) {
        toast.success("Job marked as Unassigned.");
      } else {
        toast.success(`Job successfully assigned to ${summaryParts.join(" & ")}.`);
      }

      onClose();
    } catch (err: any) {
      console.error("[JobAssignModal] Failed to update job assignment:", err);
      toast.error(err?.message || "Failed to update job assignment");
    } finally {
      setIsAssigning(false);
    }
  };

  if (!isOpen || !job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg md:max-w-[540px] w-full p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <DialogHeader className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0 border border-blue-100 dark:border-blue-900/50">
              <Icon icon="heroicons:user-group" className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
                Assign Recruiters
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Assign requirement to pods or individual recruiters
              </DialogDescription>
            </div>
          </div>

          {/* Selected Job Info Banner */}
          <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50/90 dark:bg-slate-850/70 border border-slate-200/80 dark:border-slate-750 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[280px]"
                  title={job.jobTitle || (job as any).title}
                >
                  {job.jobTitle || (job as any).title}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 font-semibold border border-rose-100 dark:border-rose-900/40">
                  {job.jobCode}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Client:{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {job.client || (job as any).clientName || (job as any).endClientName || 'N/A' || "Direct"}
                </span>
                {targetBranch?.name ? ` • Branch: ${targetBranch.name}` : ""}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[9.5px] uppercase font-semibold tracking-wider text-slate-400 block mb-0.5">
                Currently Assigned
              </span>
              {(() => {
                const curInfo = getAssignedPersonDisplay(job);
                if (curInfo.isUnassigned || curInfo.type === "unassigned") {
                  return (
                    <Badge
                      variant="outline"
                      className="text-[10.5px] font-normal px-2 py-0.5 text-neutral-400 dark:text-neutral-500 italic border-slate-200 dark:border-slate-700"
                    >
                      Unassigned
                    </Badge>
                  );
                }
                return (
                  <div className="flex flex-col items-end gap-1">
                    {curInfo.pods && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/70 max-w-[140px] truncate"
                        title={`Assigned Pods: ${curInfo.pods.names.join(", ")}`}
                      >
                        <Icon
                          icon="heroicons:squares-plus"
                          className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400 shrink-0"
                        />
                        {curInfo.pods.label}
                      </span>
                    )}
                    {curInfo.recruiters && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 max-w-[140px] truncate"
                        title={`Assigned Recruiters: ${curInfo.recruiters.names.join(", ")}`}
                      >
                        <Icon
                          icon="heroicons:user"
                          className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400 shrink-0"
                        />
                        {curInfo.recruiters.label}
                      </span>
                    )}
                    {curInfo.type === "all" && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
                        All recruiters
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </DialogHeader>

        {/* Pod Head Scope Notice */}
        {isPodHead && (
          <div className="mx-5 mt-2.5 px-3 py-1.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 flex items-center gap-2 text-[11.5px] text-blue-800 dark:text-blue-300">
            <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>Pod Lead Scope:</strong> Restricted to your pod{" "}
              {myPod ? `(${myPod.name})` : ""} and active members.
            </span>
          </div>
        )}

        {/* Branch Policy Alert */}
        {!branchAllowsDirectStaff ? (
          <div className="mx-5 mt-2.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-[11.5px] text-amber-800 dark:text-amber-300">
            <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Branch Policy Notice:</strong> Direct recruiter assignment is disabled.
              Requirements must be routed to Recruitment Pods.
            </span>
          </div>
        ) : !branchAllowsPods ? (
          <div className="mx-5 mt-2.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-[11.5px] text-amber-800 dark:text-amber-300">
            <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Branch Policy Notice:</strong> Recruitment Pods are disabled for this
              branch. Direct recruiter assignments only.
            </span>
          </div>
        ) : null}

        {/* Tab Selector */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 inline-flex items-center gap-1 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              disabled={!branchAllowsPods}
              onClick={() => {
                if (branchAllowsPods) {
                  setAssignTab("pods");
                  setAssignSearch("");
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all",
                !branchAllowsPods
                  ? "opacity-50 cursor-not-allowed text-slate-400"
                  : assignTab === "pods"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/70 dark:border-slate-700 cursor-pointer"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 cursor-pointer"
              )}
            >
              <Icon icon="heroicons:squares-plus" className="h-3.5 w-3.5" />
              Pods
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  assignTab === "pods"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold"
                    : "bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}
              >
                {targetBranchPods.length}
              </span>
              {!branchAllowsPods && <Lock className="h-3 w-3 ml-0.5 text-slate-400" />}
            </button>

            <button
              type="button"
              disabled={!branchAllowsDirectStaff}
              onClick={() => {
                if (branchAllowsDirectStaff) {
                  setAssignTab("users");
                  setAssignSearch("");
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all",
                !branchAllowsDirectStaff
                  ? "opacity-50 cursor-not-allowed text-slate-400"
                  : assignTab === "users"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/70 dark:border-slate-700 cursor-pointer"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 cursor-pointer"
              )}
            >
              <Icon icon="heroicons:user" className="h-3.5 w-3.5" />
              Recruiters
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  assignTab === "users"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold"
                    : "bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}
              >
                {branchRecruiterUsers.length}
              </span>
              {!branchAllowsDirectStaff && <Lock className="h-3 w-3 ml-0.5 text-slate-400" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selectedPodIds.length > 0 && (
              <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200/70 inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                {selectedPodIds.length} Pod{selectedPodIds.length !== 1 ? "s" : ""}
              </span>
            )}
            {selectedUserIds.length > 0 && (
              <span className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {selectedUserIds.length} Recruiters
              </span>
            )}
          </div>
        </div>

        {/* Staged Assignment Ribbon */}
        <div className="mx-5 my-2 p-2 rounded-lg bg-slate-50/80 dark:bg-slate-850/50 border border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-indigo-500" />
              <span>Staged Assignment</span>
              {(selectedPodIds.length > 0 || selectedUserIds.length > 0) && (
                <span className="text-[10.5px] text-slate-400 font-normal">
                  ({selectedPodIds.length} pod{selectedPodIds.length !== 1 ? "s" : ""},{" "}
                  {selectedUserIds.length} recruiter{selectedUserIds.length !== 1 ? "s" : ""})
                </span>
              )}
            </span>
            {(selectedPodIds.length > 0 || selectedUserIds.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPodIds([]);
                  setSelectedUserIds([]);
                }}
                className="text-[10px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer font-medium"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 min-h-[24px] max-h-[85px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            {selectedPodIds.length === 0 && selectedUserIds.length === 0 ? (
              <span className="text-[11px] text-slate-400 italic">
                No pods or recruiters selected. Pick from Pods and/or Recruiters tabs below.
              </span>
            ) : (
              <>
                {selectedPodIds.map((pId) => {
                  const pod = [...podsList, ...targetBranchPods].find((p: any) => p.id === pId);
                  const name = pod?.name || "Pod";
                  return (
                    <span
                      key={pId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 animate-in fade-in"
                    >
                      <Icon
                        icon="heroicons:squares-plus"
                        className="h-3 w-3 text-purple-600 dark:text-purple-400"
                      />
                      <span className="max-w-[130px] truncate">{name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePodSelection(pId);
                        }}
                        className="hover:text-purple-900 dark:hover:text-white rounded-full ml-0.5 p-0.5 cursor-pointer"
                        title="Remove pod"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  );
                })}
                {selectedUserIds.map((uId) => {
                  const u = usersList.find((usr: any) => usr.id === uId);
                  const name = u?.fullName || u?.name || u?.email || "Recruiter";
                  return (
                    <span
                      key={uId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 animate-in fade-in"
                    >
                      <Icon icon="heroicons:user" className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      <span className="max-w-[120px] truncate">{name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleUserSelection(uId);
                        }}
                        className="hover:text-blue-900 dark:hover:text-white rounded-full ml-0.5 p-0.5 cursor-pointer"
                        title="Remove recruiter"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Search Box & Multi-Select Toolbar */}
        <div className="px-5 pt-1 space-y-2">
          <div className="relative">
            <Icon
              icon="heroicons:magnifying-glass"
              className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400"
            />
            <Input
              placeholder={
                assignTab === "pods"
                  ? "Search pods by name or lead..."
                  : "Search recruiters by name, role, or email..."
              }
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              className="h-8 pl-8.5 text-xs bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-lg"
              autoFocus
            />
          </div>

          {/* Recruiter Tab: Sub-filter toggle */}
          {assignTab === "users" && selectedPodIds.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 rounded-md bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 text-[11px]">
              <span className="text-purple-800 dark:text-purple-300 font-medium px-1">Show:</span>
              <button
                type="button"
                onClick={() => setRecruiterFilterMode("all")}
                className={cn(
                  "px-2 py-0.5 rounded text-[10.5px] font-medium transition-all cursor-pointer",
                  recruiterFilterMode === "all"
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
              >
                All Recruiters ({branchRecruiterUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setRecruiterFilterMode("podMembers")}
                className={cn(
                  "px-2 py-0.5 rounded text-[10.5px] font-medium transition-all flex items-center gap-1 cursor-pointer",
                  recruiterFilterMode === "podMembers"
                    ? "bg-purple-600 text-white shadow-xs font-semibold"
                    : "text-purple-700 dark:text-purple-300 hover:bg-purple-100/60 dark:hover:bg-purple-900/40"
                )}
              >
                <Icon icon="heroicons:squares-plus" className="h-3 w-3" />
                Selected Pod Members Only ({selectedPodMembersCount})
              </button>
            </div>
          )}

          {/* Multi-select bar for PODS */}
          {assignTab === "pods" && (
            <div className="flex items-center justify-between text-xs py-1 px-0.5 border-b border-dashed border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSelectAllFilteredPods}
                  className="text-[11.5px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1.5"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  {filteredPods.length > 0 &&
                  filteredPods.every((p: any) => selectedPodIds.includes(p.id))
                    ? "Deselect All Filtered"
                    : `Select All (${filteredPods.length})`}
                </button>

                {selectedPodIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedPodIds([])}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                  <strong className="text-purple-600 dark:text-purple-400 font-bold">
                    {selectedPodIds.length}
                  </strong>{" "}
                  selected
                </span>
                <Button
                  size="sm"
                  disabled={
                    isAssigning || (selectedPodIds.length === 0 && selectedUserIds.length === 0)
                  }
                  onClick={() => handleSaveCombinedAssignment()}
                  className="h-6.5 px-2.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed rounded-md"
                >
                  {isAssigning
                    ? "Saving..."
                    : selectedUserIds.length > 0
                    ? `Save (${selectedPodIds.length} Pods + ${selectedUserIds.length} Recruiters)`
                    : `Assign Pods (${selectedPodIds.length})`}
                </Button>
              </div>
            </div>
          )}

          {/* Multi-select bar for RECRUITERS */}
          {assignTab === "users" && (
            <div className="flex items-center justify-between text-xs py-1 px-0.5 border-b border-dashed border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-[11.5px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1.5"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  {filteredUsers.length > 0 &&
                  filteredUsers.every((u: any) => selectedUserIds.includes(u.id))
                    ? "Deselect All Filtered"
                    : `Select All (${filteredUsers.length})`}
                </button>

                {selectedUserIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                  <strong className="text-blue-600 dark:text-blue-400 font-bold">
                    {selectedUserIds.length}
                  </strong>{" "}
                  selected
                </span>
                <Button
                  size="sm"
                  disabled={
                    isAssigning || (selectedPodIds.length === 0 && selectedUserIds.length === 0)
                  }
                  onClick={() => handleSaveCombinedAssignment()}
                  className="h-6.5 px-2.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed rounded-md"
                >
                  {isAssigning
                    ? "Saving..."
                    : selectedPodIds.length > 0
                    ? `Save (${selectedPodIds.length} Pods + ${selectedUserIds.length} Recruiters)`
                    : `Assign Recruiters (${selectedUserIds.length})`}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Selection List */}
        <div className="px-5 py-2 flex-1 overflow-y-auto max-h-[280px] space-y-1.5">
          {assignTab === "pods" ? (
            filteredPods.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                <Icon
                  icon="heroicons:squares-plus"
                  className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5"
                />
                <p className="font-semibold text-slate-600 dark:text-slate-300 text-xs">
                  No recruitment pods found.
                </p>
                <p className="text-[11px] mt-0.5">
                  You can assign to individual recruiters or create pods in Pods Manager.
                </p>
                <Link href="/utility/pods" className="inline-block mt-2.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    Go to Pods Manager →
                  </Button>
                </Link>
              </div>
            ) : (
              filteredPods.map((pod: any) => {
                const isSelected = selectedPodIds.includes(pod.id);
                const isCurrent =
                  job.podId === pod.id ||
                  (job as any).assignedTo || 'N/A'?.toLowerCase() === pod.name?.toLowerCase() ||
                  (job as any).assignedTo || 'N/A'?.toLowerCase().includes(pod.name?.toLowerCase()) ||
                  job.podName?.toLowerCase() === pod.name?.toLowerCase() ||
                  job.podName?.toLowerCase().includes(pod.name?.toLowerCase());

                return (
                  <div
                    key={pod.id}
                    onClick={() => handleTogglePodSelection(pod.id)}
                    className={cn(
                      "p-2.5 sm:px-3 sm:py-2 rounded-lg border flex items-center justify-between gap-3 text-xs transition-all cursor-pointer select-none",
                      isSelected
                        ? "border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 dark:border-purple-600 shadow-2xs ring-1 ring-purple-400/40"
                        : isCurrent
                        ? "border-slate-300 bg-slate-50/70 dark:bg-slate-800/40 dark:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-850"
                        : "border-neutral-200/90 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-850/80"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Checkbox Icon */}
                      <div
                        className={cn(
                          "h-4 w-4 rounded flex items-center justify-center shrink-0 transition-colors border",
                          isSelected
                            ? "bg-purple-600 border-purple-600 text-white shadow-2xs"
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-transparent hover:border-purple-400"
                        )}
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>

                      {/* Pod Icon Avatar */}
                      <div className="h-7 w-7 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                        <Icon icon="heroicons:squares-plus" className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                            {pod.name}
                          </span>
                          {isCurrent && (
                            <Badge
                              variant="outline"
                              className="text-[9.5px] font-semibold text-slate-500 border-slate-300 dark:border-slate-600 py-0 h-4 px-1.5"
                            >
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          Lead:{" "}
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {pod.podHeadName || "Unassigned"}
                          </span>
                          {pod.members && pod.members.length > 0 && (
                            <span>
                              {" "}
                              • {pod.members.length} Member{pod.members.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-[10.5px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 shrink-0">
                        Selected
                      </span>
                    )}
                  </div>
                );
              })
            )
          ) : filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              <Icon
                icon="heroicons:users"
                className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5"
              />
              <p className="font-semibold text-slate-600 dark:text-slate-300 text-xs">
                No recruiters matching "{assignSearch}".
              </p>
            </div>
          ) : (
            filteredUsers.map((u: any) => {
              const isSelected = selectedUserIds.includes(u.id);
              const isCurrent =
                job.primaryRecruiterId === u.id ||
                (job as any).assignedTo || 'N/A'?.toLowerCase().includes((u.fullName || u.name || "").toLowerCase()) ||
                (job as any).assignedTo || 'N/A'?.toLowerCase().includes((u.email || "").toLowerCase());
              const roleLabel = getUserRoleLabel(u, targetBranch?.id);
              const isPodMember = isUserInSelectedPods(u.id, u.podId || u.pod_id);

              return (
                <div
                  key={u.id}
                  onClick={() => handleToggleUserSelection(u.id)}
                  className={cn(
                    "p-2.5 sm:px-3 sm:py-2 rounded-lg border flex items-center justify-between gap-3 text-xs transition-all cursor-pointer select-none",
                    isSelected
                      ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-600 shadow-2xs ring-1 ring-blue-400/40"
                      : isCurrent
                      ? "border-slate-300 bg-slate-50/70 dark:bg-slate-800/40 dark:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-850"
                      : "border-neutral-200/90 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-850/80"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Checkbox Icon */}
                    <div
                      className={cn(
                        "h-4 w-4 rounded flex items-center justify-center shrink-0 transition-colors border",
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-transparent hover:border-blue-400"
                      )}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>

                    {/* User Avatar Initials */}
                    <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[11px] shrink-0 uppercase border border-slate-200 dark:border-slate-700">
                      {(u.fullName || u.name || u.email || "U").substring(0, 2)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                          {u.fullName || u.name}
                        </span>
                        <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200/80 dark:border-blue-800">
                          {roleLabel}
                        </span>
                        {isPodMember && (
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 flex items-center gap-0.5"
                            title="Member of currently selected pod"
                          >
                            <Icon
                              icon="heroicons:squares-plus"
                              className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400"
                            />
                            Pod Member
                          </span>
                        )}
                        {isCurrent && (
                          <Badge
                            variant="outline"
                            className="text-[9.5px] font-semibold text-slate-500 border-slate-300 dark:border-slate-600 py-0 h-4 px-1.5"
                          >
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-400 font-mono truncate mt-0.5">
                        {u.email}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="text-[10.5px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 shrink-0">
                      Selected
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-2.5 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50/70 dark:bg-slate-850/70 flex flex-row items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isAssigning}
            onClick={() => handleSaveCombinedAssignment({ unassignAll: true })}
            className="text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 cursor-pointer font-medium"
          >
            Clear Assignment
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isAssigning}
              onClick={onClose}
              className="text-xs h-8 px-3.5 cursor-pointer font-medium border-slate-200 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                isAssigning || (selectedPodIds.length === 0 && selectedUserIds.length === 0)
              }
              onClick={() => handleSaveCombinedAssignment()}
              className="h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isAssigning ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </span>
              ) : (
                <span>
                  Save Assignment
                  {(selectedPodIds.length > 0 || selectedUserIds.length > 0) && (
                    <span className="ml-1 opacity-90 font-normal">
                      (
                      {selectedPodIds.length > 0
                        ? `${selectedPodIds.length} Pod${selectedPodIds.length > 1 ? "s" : ""}`
                        : ""}
                      {selectedPodIds.length > 0 && selectedUserIds.length > 0 ? " + " : ""}
                      {selectedUserIds.length > 0
                        ? `${selectedUserIds.length} Recruiters`
                        : ""}
                      )
                    </span>
                  )}
                </span>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
