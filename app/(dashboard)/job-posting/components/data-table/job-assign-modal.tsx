// @ts-nocheck
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
import { UserAvatar } from '@/components/shared/user-identity';
import { Job } from "../../data/mock-jobs";
import { getAssignedPersonDisplay, canAssignRecruitersToJob } from "../../lib/job-table-utils";
import { PodLeadAssignModal } from "./pod-lead-assign-modal";
export { PodLeadAssignModal };

export type JobAssignmentMode = "combined" | "pods" | "users";

export interface JobAssignModalProps {
  job: Job | null;
  mode?: JobAssignmentMode;
  currentUser: any;
  currentUserBranchId: string | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedFields: Partial<Job>) => void;
}

export function JobAssignModal({
  job,
  mode = "combined",
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
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Assignment Context Data
  const [usersList, setUsersList] = useState<any[]>([]);
  const [staffingLoaded, setStaffingLoaded] = useState(false);
  const [podsList, setPodsList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);

  // Target branch resolution for job
  const targetBranch = useMemo(() => {
    if (!job) return null;
    if (job.branchId) {
      const b = branchesList.find((x: any) => x.id === job.branchId);
      if (b) return b;
    }
    if ((job as any).businessUnit || "N/A") {
      const b = branchesList.find(
        (x: any) => x.name?.toLowerCase() === ((job as any).businessUnit || "N/A")?.toLowerCase()
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
    if ((job as any).businessUnitRef) return (job as any).businessUnitRef;
    const targetUnitId = (job as any).businessUnitId || (job as any).business_unit_id;
    if (targetUnitId && targetBranch?.businessUnits) {
      const u = targetBranch.businessUnits.find((x: any) => x.id === targetUnitId);
      if (u) return u;
    }
    return null;
  }, [job, targetBranch]);

  const lastLoadedJobIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      lastLoadedJobIdRef.current = null;
    }
  }, [isOpen]);

  // Load context data when modal is open
  useEffect(() => {
    if (!isOpen || !job) return;
    if (lastLoadedJobIdRef.current === job.id) return;
    lastLoadedJobIdRef.current = job.id;
    setStaffingLoaded(false);
    setUsersList([]);

    async function loadAssignmentData() {
      try {
        const canAssign = currentUser?.permissions?.includes('job:assign_recruiter');
        const targetBranchId = job?.branchId || currentUserBranchId || undefined;
        const targetUnitId = (job as any)?.businessUnitId || (job as any)?.business_unit_id || (currentUser as any)?.businessUnitId || undefined;

        const [staff, pods, branches, roles] = await Promise.all([
          canAssign
            ? atsApi.jobs.staffingOptions(
                {
                  branchId: targetBranchId,
                  businessUnitId: targetUnitId,
                  jobId: job.id,
                },
                { silent: true }
              ).then(staff => { setStaffingLoaded(true); return staff; }).catch(error => { toast.error(error.message || 'Unable to load eligible recruiters for this job.'); return []; })
            : Promise.resolve([]),
          atsApi.pods.list().catch(() => []),
          atsApi.branches.list().catch(() => []),
          atsApi.auth.listRoles(undefined, true).catch(() => []),
        ]);
        setUsersList(staff || []);
        setPodsList(pods || []);
        if (branches && branches.length > 0) setBranchesList(branches);
        if (roles && roles.length > 0) setRolesList(roles);
      } catch (err) {
        console.warn("[JobAssignModal] Failed to fetch assignment context data:", err);
      }
    }
    loadAssignmentData();
  }, [isOpen, job?.id, currentUser, currentUserBranchId]);

  const getUserRoleLabel = useCallback(
    (u: any, branchId?: string): string => {
      if (u?.canRecruit !== undefined) {
        return u.canRecruit ? "Recruiter" : u.canReview ? "Reviewer" : "Staff";
      }

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

  // â”€â”€â”€ ROLE & PERMISSION SCOPING FOR ASSIGNMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  const isUnitAdmin = useMemo(() => {
    return userRoles.includes("UNITADMIN") || userPerms.includes("unit_admin:manage");
  }, [userRoles, userPerms]);

  const isDeliveryHead = useMemo(() => {
    return userRoles.includes("DELIVERYHEAD") || userRoles.includes("DELIVERY_HEAD");
  }, [userRoles]);

  const isHigherRole = isSuperOrTenantAdmin || isBranchAdmin || isUnitAdmin || isDeliveryHead || userPerms.includes("job:assign");

  const canAssignPods = userPerms.includes("job:assign_pod");
  const requiresAssignmentReason = userPerms.includes("job:override_assignment") && !userPerms.includes("job:assignment_reason_optional");

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
    const sysRole = (currentUser?.systemRole || currentUser?.system_role || "")
      .toUpperCase()
      .replace(/[\s-_]+/g, "");
    if (sysRole === "PODLEAD" || sysRole === "PODHEAD") return true;
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

  // â”€â”€â”€ UNIT / BRANCH POLICY ENFORCEMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const branchAllowsPods = useMemo(() => {
    if (!canAssignPods) return false;
    const targetPolicy = targetUnit || targetBranch;
    if (!targetPolicy) return true;
    const allowNone = Boolean(targetPolicy.allowNone ?? targetPolicy.allow_none);
    if (allowNone) return false; // allowNone = Direct Assignment Only
    const allowPods = (targetPolicy.allowPods ?? targetPolicy.allow_pods) !== false;
    return allowPods;
  }, [canAssignPods, targetUnit, targetBranch]);

  const branchAllowsDirectStaff = useMemo(() => {
    if (!userPerms.includes('job:assign_recruiter')) return false;
    const actorId = currentUser?.dbId || currentUser?.id;
    const assignedPodIds = job?.podIds || (job?.podId ? [job.podId] : []);
    const leadsAssignedPod = !!actorId && podsList.some(pod => pod.podHeadId === actorId && assignedPodIds.includes(pod.id));
    if (leadsAssignedPod) return true;
    const targetPolicy = targetUnit || targetBranch;
    if (!targetPolicy) return true;
    const allowDirect = targetPolicy.allowDirect ?? targetPolicy.allow_direct;
    if (allowDirect === false) return false;
    const allowDirectStaff = targetPolicy.allowDirectStaff ?? targetPolicy.allow_direct_staff;
    if (allowDirectStaff === false) return false;
    return true;
  }, [targetUnit, targetBranch, userPerms, currentUser, job, podsList]);

  const currentModeAllowed = assignTab === "pods" ? branchAllowsPods : branchAllowsDirectStaff;

  // â”€â”€â”€ SCOPED PODS & USERS (Role Scoping) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    // The staffing-options API is the source of truth; fail closed if eligibility is absent.
    return usersList.filter((u: any) => u.canRecruit === true);
  }, [usersList]);

  // Synchronize initial selections on modal open or when target job changes
  useEffect(() => {
    if (!isOpen || !job) {
      setHasUserInteracted(false);
      return;
    }

    setAssignSearch("");
    setIsAssigning(false);
    setRecruiterFilterMode("all");
    setHasUserInteracted(false);
    setAssignmentReason("");
    setAssignTab(mode === "pods" ? "pods" : mode === "users" ? "users" : branchAllowsPods ? "pods" : "users");

    // Initial selected pod IDs from job
    const initialPodIds: string[] = [];
    if (job.podId && job.podId !== "none" && job.podId !== "off") {
      const pIds = String(job.podId).split(",").map((s) => s.trim()).filter(Boolean);
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

    // Initial selected user IDs (recruiters) from job
    const initialSelected: string[] = [];
    if (Array.isArray((job as any).recruiterIds)) {
      for (const rid of (job as any).recruiterIds) {
        if (rid && !initialSelected.includes(rid)) {
          initialSelected.push(rid);
        }
      }
    }
    if (job.recruiterId && !initialSelected.includes(job.recruiterId)) {
      initialSelected.push(job.recruiterId);
    }

    // Fallback: match by recruiter names if provided
    const recruiterStr =
      job.recruiter && job.recruiter !== "N/A" && job.recruiter.toLowerCase() !== "unassigned"
        ? job.recruiter
        : (job as any).assignedTo && (job as any).assignedTo !== "N/A" && (job as any).assignedTo !== "Unassigned"
        ? (job as any).assignedTo
        : "";
    if (recruiterStr && !recruiterStr.toUpperCase().startsWith("ALL")) {
      const names = recruiterStr.split(",").map((s: string) => s.trim().toLowerCase());
      for (const u of usersList) {
        const uName = (u.fullName || u.name || "").toLowerCase();
        if (uName && names.includes(uName) && !initialSelected.includes(u.id)) {
          initialSelected.push(u.id);
        }
      }
    }
    setSelectedUserIds(initialSelected);

    // Dedicated entry points stay on the requested assignment type.
    if (mode !== "combined") {
      setAssignTab(mode);
      return;
    }

    // The combined entry point selects a useful tab based on branch policy and current assignment.
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
  }, [isOpen, job?.id, branchAllowsPods, branchAllowsDirectStaff, mode]);

  // When usersList or targetBranchPods loads asynchronously after modal is open,
  // resolve any missing name-based matches into selectedUserIds IF the user hasn't made manual edits yet
  useEffect(() => {
    if (!isOpen || !job || hasUserInteracted) return;

    // 1. Pods fallback matching
    if (targetBranchPods.length > 0 && job.podName && job.podName !== "N/A" && job.podName.toLowerCase() !== "unassigned") {
      const podNames = job.podName.split(",").map((s) => s.trim().toLowerCase());
      const matchedPodIds: string[] = [];
      for (const p of targetBranchPods) {
        const pName = (p.name || "").toLowerCase();
        if (podNames.includes(pName)) {
          matchedPodIds.push(p.id);
        }
      }
      if (matchedPodIds.length > 0) {
        setSelectedPodIds((prev) => Array.from(new Set([...prev, ...matchedPodIds])));
      }
    }

    // 2. Recruiters fallback matching
    const recruiterStr =
      job.recruiter && job.recruiter !== "N/A" && job.recruiter.toLowerCase() !== "unassigned"
        ? job.recruiter
        : (job as any).assignedTo && (job as any).assignedTo !== "N/A" && (job as any).assignedTo !== "Unassigned"
        ? (job as any).assignedTo
        : "";
    if (usersList.length > 0 && recruiterStr && !recruiterStr.toUpperCase().startsWith("ALL")) {
      const names = recruiterStr.split(",").map((s: string) => s.trim().toLowerCase());
      const matchedUserIds: string[] = [];
      for (const u of usersList) {
        const uName = (u.fullName || u.name || "").toLowerCase();
        if (uName && names.includes(uName)) {
          matchedUserIds.push(u.id);
        }
      }
      if (matchedUserIds.length > 0) {
        setSelectedUserIds((prev) => Array.from(new Set([...prev, ...matchedUserIds])));
      }
    }
  }, [usersList, targetBranchPods, isOpen, job?.id, hasUserInteracted]);

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
    let result = list;
    if (q) {
      result = list.filter((u: any) => {
        const name = (u.fullName || u.name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const role = getUserRoleLabel(u, targetBranch?.id).toLowerCase();
        return name.includes(q) || email.includes(q) || role.includes(q);
      });
    }
    
    // Sort: Available (not in selected pods) first, then Disabled (in selected pods)
    return [...result].sort((a: any, b: any) => {
      const aIsPodMember = isUserInSelectedPods(a.id, a.podId || a.pod_id);
      const bIsPodMember = isUserInSelectedPods(b.id, b.podId || b.pod_id);
      if (aIsPodMember === bIsPodMember) return 0;
      return aIsPodMember ? 1 : -1;
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
    if (!branchAllowsPods) return;
    setHasUserInteracted(true);
    // If we are selecting a pod, we should auto-remove any independent recruiters who are in this pod
    const isSelecting = !selectedPodIds.includes(podId);
    if (isSelecting) {
      const podUsers = (podsList.find(p => p.id === podId) || targetBranchPods.find(p => p.id === podId))?.users || [];
      const podUserIds = podUsers.map(u => u.id);
      setSelectedUserIds(prev => prev.filter(id => !podUserIds.includes(id)));
    }
    setSelectedPodIds((prev) =>
      prev.includes(podId) ? prev.filter((id) => id !== podId) : [...prev, podId]
    );
  };

  const handleSelectAllFilteredPods = () => {
    setHasUserInteracted(true);
    const filteredIds = filteredPods.map((p: any) => p.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id: string) => selectedPodIds.includes(id));
    if (allSelected) {
      setSelectedPodIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedPodIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    setHasUserInteracted(true);
    const filteredIds = filteredUsers.filter((u: any) => !isUserInSelectedPods(u.id, u.podId || u.pod_id)).map((u: any) => u.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id: string) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleUserSelection = (userId: string) => {
    if (!branchAllowsDirectStaff) return;
    setHasUserInteracted(true);
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };



  const [assignmentReason, setAssignmentReason] = useState("");
  const handleSaveCombinedAssignment = async (override?: { unassignAll?: boolean }) => {
    if (!job) return;
    if (!override?.unassignAll && !currentModeAllowed) {
      toast.error(assignTab === "pods" ? "Pod assignment is disabled for this branch or unit." : "Direct recruiter assignment is disabled for this branch or unit.");
      return;
    }
    if (!canAssignRecruitersToJob(job, currentUser)) {
      toast.error("You are only allowed to assign recruiters on your own created jobs.");
      return;
    }
    if (userPerms.includes('job:assign_recruiter') && !staffingLoaded) {
      toast.error('Eligible recruiters have not loaded. Close and reopen assignment to try again.');
      return;
    }
    setIsAssigning(true);
    try {
      const payload: Record<string, any> = {};
      if (requiresAssignmentReason) {
        if (!assignmentReason.trim()) { toast.error('Enter the emergency assignment reason.'); setIsAssigning(false); return; }
        payload.assignmentReason = assignmentReason.trim();
      }

      if (override?.unassignAll) {
        if (mode !== "users" && canAssignPods) {
          payload.podId = "none";
          payload.podIds = [];
          payload.podName = "N/A";
        }
        if (mode !== "pods" && userPerms.includes("job:assign_recruiter")) {
          payload.assignedTo = "Unassigned";
          payload.recruiter = "N/A";
          payload.recruiterId = null;
          payload.recruiterIds = [];
        }
      } else if (assignTab === "pods") {
        if (!canAssignPods) throw new Error("You do not have permission to assign pods.");
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
      } else {
        if (!userPerms.includes("job:assign_recruiter")) throw new Error("You do not have permission to assign recruiters.");
        if (selectedUserIds.length > 0) {
          const selectedUsers = usersList.filter((u) => selectedUserIds.includes(u.id) && u.canRecruit === true);
          if (selectedUsers.length !== selectedUserIds.length) {
            throw new Error("A current assignee is no longer eligible. Clear the existing recruiter assignment before assigning eligible recruiters.");
          }
          const recruiterNames = selectedUsers.map((u) => u.fullName || u.name || u.email);
          payload.assignedTo = recruiterNames.join(", ");
          payload.recruiterId = selectedUsers[0]?.id || null;
          payload.recruiterIds = selectedUsers.map(user => user.id);
          payload.recruiter = recruiterNames.join(", ");
        } else {
          payload.assignedTo = "Unassigned";
          payload.recruiter = "N/A";
          payload.recruiterId = null;
          payload.recruiterIds = [];
        }
      }

      if (!userPerms.includes('job:assign_recruiter')) {
        delete payload.recruiterId; delete payload.recruiterIds; delete payload.recruiter; delete payload.assignedTo;
      }
      await atsApi.jobs.update(job.id, payload);

      onSuccess({ ...payload, _alreadySaved: true } as any);

      const summaryParts: string[] = [];
      if (assignTab === "pods" && selectedPodIds.length > 0 && !override?.unassignAll) {
        summaryParts.push(`${selectedPodIds.length} Pod${selectedPodIds.length > 1 ? "s" : ""}`);
      }
      if (assignTab === "users" && selectedUserIds.length > 0 && !override?.unassignAll) {
        summaryParts.push(
          `${selectedUserIds.length} Recruiter${selectedUserIds.length > 1 ? "s" : ""}`
        );
      }

      if (override?.unassignAll) {
        toast.success(mode === "pods" ? "Pod assignment cleared." : mode === "users" ? "Recruiter assignment cleared." : "Job marked as Unassigned.");
      } else if (summaryParts.length === 0) {
        toast.success(assignTab === "pods" ? "Pod assignment cleared." : "Recruiter assignment cleared.");
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

  if (isPodHead) {
    return (
      <PodLeadAssignModal
        job={job}
        currentUser={currentUser}
        currentUserBranchId={currentUserBranchId}
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg md:max-w-xl w-full p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <DialogHeader className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0 border border-blue-100 dark:border-blue-900/50">
              <Icon icon="heroicons:user-group" className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
                {assignTab === "pods" ? "Assign to pod" : "Assign recruiters"}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {assignTab === "pods" ? "Choose a pod for this job" : "Choose recruiters for this job"}
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
                  {job.client || (job as any).clientName || (job as any).endClientName || "Direct"}
                </span>
                {targetBranch?.name ? ` \u2022 Branch: ${targetBranch.name}` : ""}
              </p>
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
        {((mode === "combined" || assignTab === "users") && !branchAllowsDirectStaff) ? (
          <div className="mx-5 mt-2.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-[11.5px] text-amber-800 dark:text-amber-300">
            <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Branch Policy Notice:</strong> Direct recruiter assignment is disabled.
              Requirements must be routed to Recruitment Pods.
            </span>
          </div>
        ) : (mode === "combined" || assignTab === "pods") && !branchAllowsPods && (canAssignPods || mode === "pods") ? (
          <div className="mx-5 mt-2.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-[11.5px] text-amber-800 dark:text-amber-300">
            <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Branch Policy Notice:</strong> Recruitment Pods are disabled for this
              branch. Direct recruiter assignments only.
            </span>
          </div>
        ) : null}

        {mode === "combined" && (
          <>
        {/* Tab Selector: shown only from the combined context-menu action */}
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

        </div>
          </>
        )}

        {/* Search Box & Multi-Select Toolbar */}
        <div className={cn("px-5 pt-1 space-y-2", !currentModeAllowed && "pointer-events-none opacity-50")} aria-disabled={!currentModeAllowed}>
          <div className="relative">
            <Icon
              icon="heroicons:magnifying-glass"
              className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400"
            />
            <Input
              placeholder={
                assignTab === "pods"
                  ? "Search pods by name or lead..."
                  : "Search recruiters by name or email..."
              }
              value={assignSearch}
              disabled={!currentModeAllowed}
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


        </div>

        {/* Minimal Select All Bar */}
        <div className={cn("px-6 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between", !currentModeAllowed && "pointer-events-none opacity-50")} aria-disabled={!currentModeAllowed}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!currentModeAllowed}
              onClick={assignTab === "pods" ? handleSelectAllFilteredPods : handleSelectAllFiltered}
              className="h-4 w-4 rounded flex items-center justify-center shrink-0 transition-colors border cursor-pointer border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-blue-400"
              title="Toggle Select All"
            >
              {(() => {
                const isAllSelected = assignTab === "pods" 
                  ? (filteredPods.length > 0 && filteredPods.every((p: any) => selectedPodIds.includes(p.id)))
                  : (filteredUsers.length > 0 && filteredUsers.every((u: any) => selectedUserIds.includes(u.id)));
                
                return isAllSelected ? (
                  <Check className="h-3 w-3 stroke-[3] text-blue-600" />
                ) : (
                  <CheckSquare className="h-3.5 w-3.5 text-transparent" />
                );
              })()}
            </button>
            <span className="text-[10.5px] font-medium text-slate-500">
              Select All
            </span>
          </div>
          
          {(selectedPodIds.length > 0 || selectedUserIds.length > 0) && (
            <span className="text-[10.5px] text-slate-400 font-medium">
              {assignTab === "pods" ? selectedPodIds.length : selectedUserIds.length} selected
            </span>
          )}
        </div>

        {/* Selection List */}
        <div className={cn("px-5 py-2 flex-1 overflow-y-auto max-h-[280px] space-y-1.5", !currentModeAllowed && "pointer-events-none opacity-50")} aria-disabled={!currentModeAllowed}>
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
                    Go to Pods Manager â†’
                  </Button>
                </Link>
              </div>
            ) : (
              filteredPods.map((pod: any) => {
                const isSelected = selectedPodIds.includes(pod.id);
                const currentPodIds = (job.podId && job.podId !== "none" && job.podId !== "off")
                  ? String(job.podId).split(",").map((s) => s.trim()).filter(Boolean)
                  : [];
                const currentPodNames = (job.podName && job.podName !== "N/A" && job.podName.toLowerCase() !== "unassigned")
                  ? job.podName.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
                  : [];
                const isCurrent =
                  currentPodIds.includes(pod.id) ||
                  Boolean(pod.name && currentPodNames.includes(pod.name.toLowerCase()));

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
                              {"\u2022"} {pod.members.length} Member{pod.members.length !== 1 ? "s" : ""}
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
              const currentRecruiterIds = Array.isArray((job as any).recruiterIds)
                ? (job as any).recruiterIds
                : job.recruiterId
                ? [job.recruiterId]
                : [];
              const recruiterStr =
                job.recruiter && job.recruiter !== "N/A" && job.recruiter.toLowerCase() !== "unassigned"
                  ? job.recruiter
                  : (job as any).assignedTo && (job as any).assignedTo !== "N/A" && (job as any).assignedTo !== "Unassigned"
                  ? (job as any).assignedTo
                  : "";
              const currentRecruiterNames = recruiterStr && !recruiterStr.toUpperCase().startsWith("ALL")
                ? recruiterStr.split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean)
                : [];
              const isCurrent =
                currentRecruiterIds.includes(u.id) ||
                Boolean(u.fullName && currentRecruiterNames.includes(u.fullName.toLowerCase())) ||
                Boolean(u.name && currentRecruiterNames.includes(u.name.toLowerCase()));
              const roleLabel = getUserRoleLabel(u, targetBranch?.id);
              const isPodMember = isUserInSelectedPods(u.id, u.podId || u.pod_id);
              const userPod = [...podsList, ...targetBranchPods].find(p => p.id === (u.podId || u.pod_id));
              const userPodName = userPod?.name || "Pod Member";

              // 2-letter uppercase avatar initials (e.g., SB, MR, SM)
              const avatarInitials = (() => {
                const name = (u.fullName || u.name || "").trim();
                if (name) {
                  const parts = name.split(/\s+/).filter(Boolean);
                  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
                  return name.substring(0, 2).toUpperCase();
                }
                return (u.email || "U").substring(0, 2).toUpperCase();
              })();

              return (
                <div
                  key={u.id}
                  onClick={() => { if (!isPodMember) handleToggleUserSelection(u.id); }}
                  className={cn(
                    "p-2.5 sm:px-3 sm:py-2 rounded-lg border flex items-center justify-between gap-3 text-xs transition-all cursor-pointer select-none",
                    isPodMember ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-800" : isSelected
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
                    <UserAvatar user={u} className="h-7 w-7" />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                          {u.fullName || u.name}
                        </span>

                        {isPodMember && (
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 flex items-center gap-0.5"
                            title="Member of currently selected pod"
                          >
                            <Icon
                              icon="heroicons:squares-plus"
                              className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400"
                            />{userPodName}</span>
                        )}
                        {isCurrent && (
                          <Badge
                            variant="outline"
                            className="text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 py-0 h-4 px-1.5"
                          >
                            Current
                          </Badge>
                        )}
                      </div>
                      {u.email && (
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                          {u.email}
                        </p>
                      )}
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
        {requiresAssignmentReason && <div className="px-6 pb-3"><label htmlFor="assignment-reason" className="text-xs font-semibold">Emergency assignment reason</label><Input id="assignment-reason" value={assignmentReason} onChange={event => setAssignmentReason(event.target.value)} maxLength={2000} placeholder="Why is this override needed?" className="mt-1 text-xs" /></div>}
        <DialogFooter className="px-5 py-2.5 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50/70 dark:bg-slate-850/70 flex flex-row items-center justify-between sm:justify-between">
          {!isPodHead && <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isAssigning}
            onClick={() => handleSaveCombinedAssignment({ unassignAll: true })}
            className="text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 cursor-pointer font-medium"
          >
            {mode === "pods" ? "Clear Pod Assignment" : mode === "users" ? "Clear Recruiter Assignment" : "Clear Assignment"}
          </Button>}

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
                isAssigning || !currentModeAllowed || (assignTab === "pods" ? selectedPodIds.length === 0 : selectedUserIds.length === 0)
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
                <span>Save Assignment</span>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
