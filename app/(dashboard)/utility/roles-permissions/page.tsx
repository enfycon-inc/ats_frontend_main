"use client";

import React, { useEffect, useState, useMemo } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";
import { isRoleAdmin } from "@/lib/role-permissions";
import Link from "next/link";

interface Permission {
  id: string;
  name: string;
  group: string;
  description?: string;
}

interface CustomRole {
  id: string;
  name: string;
  description: string;
  branchId?: string | null;
  branchName?: string | null;
  isSystem: boolean;
  systemRole?: string;
  isExactSubstitution?: boolean;
  replacesSystemRole?: string | null;
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
  createdById?: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
}

interface TenantUser {
  id: string;
  email: string;
  fullName: string;
  roleId: string | null;
  roleName: string;
  roles?: string[];
  branchId?: string | null;
  branch_id?: string | null;
  assignedBranchIds?: string[];
  assigned_branch_ids?: string[];
  isActive: boolean;
  createdAt: string;
}

const SYSTEM_ARCHETYPES = [
  {
    key: "RECRUITER",
    label: "Recruiter Template",
    badge: "Recruitment",
    desc: "Candidate sourcing, talent pipeline tracking, applicant creation, and pod assignment viewing.",
    perms: [
      "candidate:create", "candidate:view",
      "submission:create", "submission:view", "submission:edit",
      "job:view", "pod:view"
    ]
  },
  {
    key: "ACCOUNT_MANAGER",
    label: "Account Manager (BDM) Template",
    badge: "Business Development",
    desc: "Client relations, job requisition authoring, client approvals, interview scheduling, and placements.",
    perms: [
      "job:create", "job:edit", "job:view", "job:approve",
      "candidate:view", "candidate:create",
      "submission:view", "submission:create", "submission:audit_rounds", "submission:audit_l1", "submission:audit_l2", "submission:audit_l3", "submission:final_status", "submission:schedule_interview", "submission:edit_rate", "submission:edit",
      "pod:view", "client:view", "client:create", "client:edit",
      "placement:view", "placement:create", "report:view"
    ]
  },
  {
    key: "POD_LEAD",
    label: "Pod Lead Template",
    badge: "Team Lead",
    desc: "Recruitment pod leadership, candidate screening gate, requisition approvals, and team routing.",
    perms: [
      "job:view", "job:edit", "job:approve", "job:reject",
      "candidate:view", "candidate:create",
      "submission:view", "submission:create", "submission:internal_screening", "submission:schedule_interview", "submission:edit",
      "pod:view", "pod:edit", "report:view"
    ]
  },
  {
    key: "DELIVERY_HEAD",
    label: "Delivery Head Template",
    badge: "Delivery Governance",
    desc: "Branch delivery orchestration, recruiter & pod allocation, requisition activation, and audit gates.",
    perms: [
      "job:view", "job:edit", "job:approve", "job:reject",
      "job:assign", "job:assign_recruiter", "job:assign_pod",
      "candidate:view", "candidate:create",
      "submission:view", "submission:create", "submission:internal_screening", "submission:audit_rounds", "submission:audit_l1", "submission:audit_l2", "submission:audit_l3", "submission:final_status", "submission:approve_client", "submission:schedule_interview", "submission:edit_rate", "submission:edit",
      "pod:create", "pod:edit", "pod:delete", "pod:view", "pod:reset_cycle", "pod:overlap",
      "candidate:search_all_branches", "job:view_all_branches", "candidate:search_all_markets",
      "client:view", "placement:view", "report:view"
    ]
  },
  {
    key: "BRANCH_ADMIN",
    label: "Branch Admin Template",
    badge: "Branch Governance",
    desc: "Branch administrative authority, staff role configuration, and branch recruitment oversight.",
    perms: [
      "job:create", "job:view", "job:edit", "job:publish_direct", "job:approve", "job:reject",
      "job:assign", "job:assign_recruiter", "job:assign_pod",
      "candidate:create", "candidate:view",
      "submission:create", "submission:view", "submission:internal_screening", "submission:audit_rounds", "submission:audit_l1", "submission:audit_l2", "submission:audit_l3", "submission:final_status", "submission:approve_client", "submission:schedule_interview", "submission:edit_rate", "submission:edit",
      "branch_admin:manage", "user:manage", "pod:view", "pod:edit",
      "client:view", "placement:view", "report:view"
    ]
  },
  {
    key: "ADMIN",
    label: "Admin / Workspace Director Template",
    badge: "Full Admin",
    desc: "Full company administration privileges across jobs, clients, candidates, pods, users, and branch offices.",
    perms: [
      "job:create", "job:edit", "job:view", "job:publish_direct", "job:approve", "job:reject",
      "job:assign", "job:assign_recruiter", "job:assign_pod",
      "candidate:create", "candidate:view",
      "submission:view", "submission:create", "submission:internal_screening", "submission:audit_rounds", "submission:audit_l1", "submission:audit_l2", "submission:audit_l3", "submission:final_status", "submission:approve_client", "submission:schedule_interview", "submission:edit_rate", "submission:edit",
      "tenant:settings", "user:manage",
      "pod:create", "pod:edit", "pod:delete", "pod:view", "pod:reset_cycle", "pod:overlap",
      "branch_admin:manage", "candidate:search_all_branches", "job:view_all_branches", "candidate:search_all_markets",
      "client:view", "placement:view", "report:view"
    ]
  }
];

export default function RolesPermissionsPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Core Dynamic RBAC state
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("all");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Hover Popover States
  const [hoveredPermRoleId, setHoveredPermRoleId] = useState<string | null>(null);
  const [hoveredUsersRoleId, setHoveredUsersRoleId] = useState<string | null>(null);

  // Create Modal State
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleBranchId, setNewRoleBranchId] = useState("");
  const [newRoleSystemRole, setNewRoleSystemRole] = useState("RECRUITER");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>(SYSTEM_ARCHETYPES[0].perms);

  // Edit Modal State
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDesc, setEditRoleDesc] = useState("");
  const [editRoleBranchId, setEditRoleBranchId] = useState("");
  const [editRoleSystemRole, setEditRoleSystemRole] = useState("RECRUITER");
  const [editRolePermissions, setEditRolePermissions] = useState<string[]>([]);

  // Users Modal State (Table View & Dedicated Multi-User Assignment Modal)
  const [viewUsersRole, setViewUsersRole] = useState<CustomRole | null>(null);
  const [assignModalRole, setAssignModalRole] = useState<CustomRole | null>(null);
  const [selectedUserIdsToAssign, setSelectedUserIdsToAssign] = useState<string[]>([]);
  const [assignUserSearchQuery, setAssignUserSearchQuery] = useState("");
  const [isAssigningUser, setIsAssigningUser] = useState(false);

  // Direct Permissions Matrix Editor Modal State
  const [matrixEditingRole, setMatrixEditingRole] = useState<CustomRole | null>(null);
  const [matrixPermissions, setMatrixPermissions] = useState<string[]>([]);

  // Collapsed Permission Groups State (empty = all groups collapsed by default)
  const [expandedCreateGroups, setExpandedCreateGroups] = useState<Record<string, boolean>>({});
  const [expandedEditGroups, setExpandedEditGroups] = useState<Record<string, boolean>>({});
  const [expandedMatrixGroups, setExpandedMatrixGroups] = useState<Record<string, boolean>>({});

  // Delete Modal State
  const [roleToDelete, setRoleToDelete] = useState<{ role: CustomRole; staffCount: number } | null>(null);
  const [targetRoleId, setTargetRoleId] = useState<string>("");

  useEffect(() => {
    const user = atsApi.auth.getCurrentUser();
    const override = typeof window !== "undefined" ? localStorage.getItem("override_role") : null;

    const hasAccess = override
      ? isRoleAdmin(override, roles, user)
      : (user?.roles?.includes("ADMIN") || user?.roles?.includes("SUPER_ADMIN") || user?.roles?.includes("BRANCH_ADMIN") || user?.permissions?.includes("user:manage"));

    setIsAdmin(hasAccess);

    if (hasAccess) {
      const storedBranch = typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
      if (storedBranch) setSelectedBranchFilter(storedBranch);
      loadData(storedBranch || "all");

      const handleBranchChanged = () => {
        const updatedBranch = typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
        if (updatedBranch) {
          setSelectedBranchFilter(updatedBranch);
          loadData(updatedBranch);
        }
      };
      window.addEventListener("branchChanged", handleBranchChanged);
      return () => window.removeEventListener("branchChanged", handleBranchChanged);
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async (branchFilter = selectedBranchFilter) => {
    try {
      setLoading(true);
      const bid = branchFilter !== "all" ? branchFilter : undefined;
      const [rolesData, permsData, usersData, branchesData] = await Promise.all([
        atsApi.auth.listRoles(bid, true),
        atsApi.auth.listAllPermissions(),
        atsApi.auth.listUsers(),
        atsApi.branches.list().catch(() => []),
      ]);

      setRoles(rolesData || []);
      setPermissions(permsData || []);
      setUsers(usersData || []);
      setBranches(branchesData || []);
    } catch (err: any) {
      toast.error("Failed to load roles and permissions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchFilterChange = async (branchId: string) => {
    setSelectedBranchFilter(branchId);
    await loadData(branchId);
  };

  // Group permissions by category
  const permissionGroups = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
      const group = perm.group || "General Operations";
      if (!acc[group]) acc[group] = [];
      acc[group].push(perm);
      return acc;
    }, {});
  }, [permissions]);

  // Helper to get staff assigned to a role with strict branch isolation
  const getAssignedUsers = (role: CustomRole): TenantUser[] => {
    return users.filter((u) => {
      // 1. Strict branch matching:
      // If role belongs to a specific branch office, user MUST belong to that branch
      if (role.branchId) {
        const userBranches = [
          u.branchId,
          u.branch_id,
          ...(Array.isArray(u.assignedBranchIds) ? u.assignedBranchIds : []),
          ...(Array.isArray(u.assigned_branch_ids) ? u.assigned_branch_ids : [])
        ].filter(Boolean);

        if (!userBranches.includes(role.branchId)) {
          return false;
        }
      }

      // 2. Direct custom role ID match
      if (u.roleId === role.id) return true;

      // 3. Fallback name match strictly within the same branch
      const userRolesUpper = (u.roles && u.roles.length > 0 ? u.roles : [u.roleName || '']).map(r => r.toUpperCase());
      const roleNameUpper = role.name.toUpperCase();
      return userRolesUpper.includes(roleNameUpper);
    });
  };

  // Custom roles filtered for the view (strictly excluding system roles)
  const customRolesList = useMemo(() => {
    return roles.filter((r) => !r.isSystem);
  }, [roles]);

  const filteredRoles = useMemo(() => {
    let list = selectedBranchFilter === "all"
      ? customRolesList
      : customRolesList.filter((r) => r.branchId === selectedBranchFilter);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter((r) =>
        r.name.toLowerCase().includes(query) ||
        (r.systemRole && r.systemRole.toLowerCase().includes(query)) ||
        (r.branchName && r.branchName.toLowerCase().includes(query)) ||
        (r.createdByName && r.createdByName.toLowerCase().includes(query)) ||
        (r.description && r.description.toLowerCase().includes(query))
      );
    }
    return list;
  }, [customRolesList, selectedBranchFilter, searchQuery]);

  // Available staff members to assign to assignModalRole (supports multiple roles per user)
  const availableUsersToAssign = useMemo(() => {
    const targetRole = assignModalRole || viewUsersRole;
    if (!targetRole) return [];
    return users.filter((u) => {
      // 1. Strict branch filter
      if (targetRole.branchId) {
        const userBranches = [
          u.branchId,
          u.branch_id,
          ...(Array.isArray(u.assignedBranchIds) ? u.assignedBranchIds : []),
          ...(Array.isArray(u.assigned_branch_ids) ? u.assigned_branch_ids : [])
        ].filter(Boolean);

        if (!userBranches.includes(targetRole.branchId)) {
          return false;
        }
      }

      // 2. Exclude users who ALREADY have this role
      if (u.roleId === targetRole.id) return false;
      const userRolesUpper = (u.roles && u.roles.length > 0 ? u.roles : [u.roleName || '']).map((r) => r.toUpperCase());
      return !userRolesUpper.includes(targetRole.name.toUpperCase());
    });
  }, [users, assignModalRole, viewUsersRole]);

  const filteredAvailableUsers = useMemo(() => {
    if (!assignUserSearchQuery.trim()) return availableUsersToAssign;
    const q = assignUserSearchQuery.toLowerCase().trim();
    return availableUsersToAssign.filter(
      (u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [availableUsersToAssign, assignUserSearchQuery]);

  // ─── CREATE ROLE HANDLERS ───────────────────────────────────────
  const openAddRoleModal = () => {
    setNewRoleName("");
    setNewRoleDesc("");
    const defaultBranch = (selectedBranchFilter !== "all" ? selectedBranchFilter : null) || (typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null) || branches[0]?.id || "";
    setNewRoleBranchId(defaultBranch);
    setNewRoleSystemRole("RECRUITER");
    setNewRolePermissions(SYSTEM_ARCHETYPES[0].perms);
    setShowAddRole(true);
  };

  const handleCreateArchetypeChange = (archetypeKey: string) => {
    setNewRoleSystemRole(archetypeKey);
    const archetype = SYSTEM_ARCHETYPES.find((a) => a.key === archetypeKey);
    if (archetype) {
      setNewRolePermissions(archetype.perms);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return toast.error("Please provide a role name.");
    try {
      setSubmitting(true);
      const newRole = await atsApi.auth.createCustomRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
        systemRole: newRoleSystemRole,
        branchId: newRoleBranchId || undefined,
        permissions: newRolePermissions,
      });

      toast.success(`Custom role "${newRole.name}" created successfully!`);
      setShowAddRole(false);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to create custom role: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── EDIT ROLE HANDLERS ─────────────────────────────────────────
  const openEditRoleModal = (role: CustomRole) => {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDesc(role.description || "");
    setEditRoleBranchId(role.branchId || branches[0]?.id || "");
    setEditRoleSystemRole(role.systemRole || "RECRUITER");
    setEditRolePermissions(role.permissions || []);
  };

  const handleEditRoleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    if (!editRoleName.trim()) return toast.error("Role name cannot be empty.");

    try {
      setSubmitting(true);
      await atsApi.auth.updateCustomRole(editingRole.id, {
        name: editRoleName.trim(),
        description: editRoleDesc.trim(),
        systemRole: editRoleSystemRole,
        branchId: editRoleBranchId || undefined,
        permissions: editRolePermissions,
      });

      toast.success(`Role "${editRoleName}" updated successfully!`);
      setEditingRole(null);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to update role: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── DIRECT PERMISSIONS MATRIX MODAL HANDLERS ───────────────────
  const openPermissionsModal = (role: CustomRole) => {
    setMatrixEditingRole(role);
    setMatrixPermissions(role.permissions || []);
  };

  const handleToggleMatrixPermission = (permId: string) => {
    setMatrixPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleToggleMatrixGroup = (groupPerms: Permission[]) => {
    const groupPermIds = groupPerms.map((p) => p.id);
    const allEnabled = groupPermIds.every((id) => matrixPermissions.includes(id));
    if (allEnabled) {
      setMatrixPermissions((prev) => prev.filter((id) => !groupPermIds.includes(id)));
    } else {
      setMatrixPermissions((prev) => Array.from(new Set([...prev, ...groupPermIds])));
    }
  };

  const handleSaveMatrixPermissions = async () => {
    if (!matrixEditingRole) return;
    try {
      setSubmitting(true);
      await atsApi.auth.updateRolePermissions(matrixEditingRole.id, matrixPermissions);
      toast.success(`Permissions updated for role "${matrixEditingRole.name}"`);
      setMatrixEditingRole(null);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to update permissions: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── ASSIGN USER TO ROLE HANDLERS (DEDICATED POP-UP MODAL) ───
  const openAssignStaffPopup = (role: CustomRole) => {
    setAssignModalRole(role);
    setSelectedUserIdsToAssign([]);
    setAssignUserSearchQuery("");
  };

  const openAssignUserModal = (role: CustomRole) => {
    openAssignStaffPopup(role);
  };

  const toggleUserToAssign = (userId: string) => {
    setSelectedUserIdsToAssign((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllUsersToAssign = (availableUsers: TenantUser[]) => {
    const allIds = availableUsers.map((u) => u.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedUserIdsToAssign.includes(id));
    if (allSelected) {
      setSelectedUserIdsToAssign([]);
    } else {
      setSelectedUserIdsToAssign(allIds);
    }
  };

  const handleBatchAssignUsersSubmit = async (targetRole: CustomRole) => {
    if (selectedUserIdsToAssign.length === 0) {
      toast.error("Please select at least one staff member to assign.");
      return;
    }
    try {
      setIsAssigningUser(true);
      await atsApi.auth.batchAssignUsersToRole(targetRole.id, selectedUserIdsToAssign);
      toast.success(
        `Successfully assigned ${selectedUserIdsToAssign.length} staff member(s) to role "${targetRole.name}"!`
      );
      setSelectedUserIdsToAssign([]);
      setAssignUserSearchQuery("");
      setAssignModalRole(null);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to assign role to staff: " + err.message);
    } finally {
      setIsAssigningUser(false);
    }
  };

  const handleUnassignUser = async (userToUnassign: TenantUser, targetRole: CustomRole) => {
    if (!confirm(`Are you sure you want to remove ${userToUnassign.fullName} from the role "${targetRole.name}"?`)) return;
    try {
      setSubmitting(true);
      await atsApi.auth.unassignUserFromRole(targetRole.id, userToUnassign.id);
      toast.success(`Removed ${userToUnassign.fullName} from "${targetRole.name}".`);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to unassign user: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── DELETE ROLE HANDLERS ───────────────────────────────────────
  const handleInitiateDeleteRole = (role: CustomRole) => {
    if (role.isSystem) return;
    const assigned = getAssignedUsers(role);
    const availableTargets = roles.filter((r) => r.id !== role.id && !r.isSystem);
    const defaultTarget = availableTargets[0]?.id || "";

    setRoleToDelete({ role, staffCount: assigned.length });
    setTargetRoleId(defaultTarget);
  };

  const handleConfirmDeleteRole = async () => {
    if (!roleToDelete) return;
    const { role, staffCount } = roleToDelete;

    if (staffCount > 0 && !targetRoleId) {
      return toast.error("Please select a target replacement role for assigned staff.");
    }

    try {
      setSubmitting(true);
      const res = await atsApi.auth.deleteCustomRole(role.id, staffCount > 0 ? targetRoleId : undefined);
      toast.success(res?.message || `Custom role "${role.name}" deleted successfully.`);
      setRoleToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to delete role: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Format date + time WITH SECONDS
  const formatDateTimeWithSeconds = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + ", " + d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SiteBreadcrumb />
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-xs font-semibold text-default-500">Loading custom role registry...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div>
        <SiteBreadcrumb />
        <Card className="border border-red-500/20 bg-red-950/10 max-w-2xl mx-auto mt-10">
          <CardContent className="p-8 text-center">
            <div className="inline-flex h-12 w-12 rounded-full bg-red-500/10 text-red-500 items-center justify-center text-2xl mb-4">
              <Icon icon="heroicons:shield-exclamation" />
            </div>
            <h2 className="text-xl font-bold text-red-500 mb-2">Access Denied</h2>
            <p className="text-sm text-default-600">
              Only workspace <strong>Administrators</strong> or <strong>Branch Managers</strong> can view and configure custom staffing roles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SiteBreadcrumb />

      {/* ─── PAGE HEADER & TOOLBAR ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-default-150 pb-5">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
            Custom Staffing Roles
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Build and manage branch operational staffing roles, permission policies, and user assignments.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Branch Filter Dropdown */}
          {branches.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-2xs">
              <Icon icon="heroicons:building-office-2" className="h-4 w-4 text-neutral-400 shrink-0" />
              <select
                value={selectedBranchFilter}
                onChange={(e) => handleBranchFilterChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-neutral-800 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">All Branches ({customRolesList.length} Roles)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            className="h-9 px-3 text-xs border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Refresh Role Registry"
          >
            <Icon icon="heroicons:arrow-path" className="h-4 w-4" />
          </Button>

          {/* Primary Create Button */}
          <Button
            onClick={openAddRoleModal}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-xs cursor-pointer"
          >
            <Icon icon="heroicons:plus" className="h-4 w-4" />
            Create Custom Role
          </Button>
        </div>
      </div>

      {/* ─── TABLE FILTER / SEARCH BAR ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white dark:bg-slate-900 p-3 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-2xs">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Icon icon="heroicons:magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search roles by name, archetype, branch, author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9 bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          <span>Showing <strong>{filteredRoles.length}</strong> of <strong>{customRolesList.length}</strong> custom roles</span>
        </div>
      </div>

      {/* ─── UNIVERSAL ROLES TABLE ─────────────────────────────────────── */}
      <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 dark:bg-slate-800/40 border-b border-neutral-200 dark:border-slate-800">
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Role Name</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Base Role</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Branch Office</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 text-center">Permissions</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 text-center">Users Assigned</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Created By</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Created At</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Last Modified</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-slate-800 text-xs">
              {filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-neutral-500 font-semibold italic">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-500 flex items-center justify-center">
                        <Icon icon="heroicons:shield-check" className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-bold text-neutral-800 dark:text-white">
                        {searchQuery ? "No matching custom roles found" : "No custom roles defined for this branch"}
                      </span>
                      <p className="text-xs text-neutral-400 max-w-sm">
                        Custom roles inherit from abstract system archetypes (Recruiter, BDM, Pod Lead) and apply branch-isolated security policies.
                      </p>
                      <Button
                        size="sm"
                        onClick={openAddRoleModal}
                        className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 px-4"
                      >
                        <Icon icon="heroicons:plus" className="h-3.5 w-3.5 mr-1" />
                        Create First Custom Role
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => {
                  const assignedUsers = getAssignedUsers(role);
                  const rolePerms = role.permissions || [];
                  const isHoveredPerm = hoveredPermRoleId === role.id;
                  const isHoveredUsers = hoveredUsersRoleId === role.id;

                  return (
                    <tr
                      key={role.id}
                      className="hover:bg-neutral-50/60 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* 1. ROLE NAME */}
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        <div>
                          <div
                            className="font-bold text-xs text-neutral-900 dark:text-white hover:text-indigo-600 cursor-pointer"
                            onClick={() => openEditRoleModal(role)}
                          >
                            {role.name}
                          </div>
                          {role.description && (
                            <div className="text-[11px] text-neutral-400 dark:text-neutral-500 font-normal mt-0.5 max-w-[220px] truncate">
                              {role.description}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. BASE ROLE / ARCHETYPE */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[10.5px] font-medium font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-slate-700">
                          {role.systemRole || "RECRUITER"}
                        </span>
                      </td>

                      {/* 3. BRANCH OFFICE */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          {role.branchName || "Default Office"}
                        </span>
                      </td>

                      {/* 4. PERMISSIONS (INTERACTIVE BUTTON WITH HOVER PREVIEW) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap relative">
                        <div
                          className="inline-block relative"
                          onMouseEnter={() => setHoveredPermRoleId(role.id)}
                          onMouseLeave={() => setHoveredPermRoleId(null)}
                        >
                          <button
                            onClick={() => openPermissionsModal(role)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-slate-700 font-medium text-[11px] transition cursor-pointer"
                            title="Click to configure permissions matrix"
                          >
                            <Icon icon="heroicons:key" className="h-3 w-3 text-neutral-500" />
                            {rolePerms.length} Permissions
                          </button>

                          {/* Hover Popover showing categorized permission preview */}
                          {isHoveredPerm && (
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-40 w-72 p-3 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-xl shadow-xl text-left pointer-events-none animate-fadeIn">
                              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-1.5 mb-2">
                                <span className="text-[11px] font-bold text-neutral-900 dark:text-white flex items-center gap-1">
                                  <Icon icon="heroicons:shield-check" className="h-3.5 w-3.5 text-neutral-500" />
                                  Permissions ({rolePerms.length})
                                </span>
                                <span className="text-[9.5px] text-indigo-600 font-semibold">Click to configure</span>
                              </div>
                              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                {rolePerms.length === 0 ? (
                                  <p className="text-[10px] text-neutral-400 italic">No permissions assigned.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {rolePerms.map((perm) => (
                                      <span
                                        key={perm}
                                        className="inline-block bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 text-[9px] px-1.5 py-0.5 rounded font-mono"
                                      >
                                        {perm}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. USERS ASSIGNED (INTERACTIVE BUTTON WITH HOVER PREVIEW) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap relative">
                        <div
                          className="inline-block relative"
                          onMouseEnter={() => setHoveredUsersRoleId(role.id)}
                          onMouseLeave={() => setHoveredUsersRoleId(null)}
                        >
                          <button
                            onClick={() => setViewUsersRole(role)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-slate-700 font-medium text-[11px] transition cursor-pointer"
                            title="Click to view assigned staff"
                          >
                            <Icon icon="heroicons:users" className="h-3 w-3 text-neutral-500" />
                            {assignedUsers.length} Staff
                          </button>

                          {/* Hover Popover showing user previews */}
                          {isHoveredUsers && (
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-40 w-64 p-3 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-xl shadow-xl text-left pointer-events-none animate-fadeIn">
                              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-1.5 mb-2">
                                <span className="text-[11px] font-bold text-neutral-900 dark:text-white flex items-center gap-1">
                                  <Icon icon="heroicons:users" className="h-3.5 w-3.5 text-neutral-500" />
                                  Assigned Staff ({assignedUsers.length})
                                </span>
                                <span className="text-[9.5px] text-indigo-600 font-semibold">Click for table</span>
                              </div>
                              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                {assignedUsers.length === 0 ? (
                                  <p className="text-[10px] text-neutral-400 italic">No staff assigned to this role yet.</p>
                                ) : (
                                  assignedUsers.slice(0, 5).map((u) => (
                                    <div key={u.id} className="flex items-center gap-2 text-xs">
                                      <div className="h-5 w-5 rounded-full bg-neutral-200 dark:bg-slate-700 text-neutral-700 dark:text-neutral-200 font-bold text-[9px] flex items-center justify-center shrink-0">
                                        {u.fullName.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-neutral-900 dark:text-white text-[10.5px] truncate">{u.fullName}</div>
                                        <div className="text-[9px] text-neutral-400 truncate">{u.email}</div>
                                      </div>
                                    </div>
                                  ))
                                )}
                                {assignedUsers.length > 5 && (
                                  <p className="text-[9.5px] text-indigo-600 font-semibold text-center pt-1">
                                    + {assignedUsers.length - 5} more staff...
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. CREATED BY */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs text-neutral-600 dark:text-neutral-300 font-medium truncate max-w-[130px] block">
                          {role.createdByName || "System Admin"}
                        </span>
                      </td>

                      {/* 7. CREATED AT (WITH TIME AND SECONDS) */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-neutral-500 dark:text-neutral-400 font-medium text-[11px]">
                        {formatDateTimeWithSeconds(role.createdAt)}
                      </td>

                      {/* 8. LAST MODIFIED (WITH TIME AND SECONDS) */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-neutral-500 dark:text-neutral-400 font-medium text-[11px]">
                        {formatDateTimeWithSeconds(role.updatedAt || role.createdAt)}
                      </td>

                      {/* 9. ACTIONS (CLEAN, ESSENTIAL ACTIONS ONLY) */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Role Button */}
                          <button
                            onClick={() => openEditRoleModal(role)}
                            className="p-1.5 rounded-lg border border-neutral-200 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-600 dark:text-neutral-300 transition cursor-pointer"
                            title="Edit Role Details & Configuration"
                          >
                            <Icon icon="heroicons:pencil-square" className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Role Button */}
                          <button
                            onClick={() => handleInitiateDeleteRole(role)}
                            className="p-1.5 rounded-lg border border-neutral-200 dark:border-slate-700 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 text-neutral-400 hover:text-red-600 transition cursor-pointer"
                            title="Delete Custom Role"
                          >
                            <Icon icon="heroicons:trash" className="h-3.5 w-3.5" />
                          </button>
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

      {/* ─── MODAL 1: CREATE CUSTOM ROLE ───────────────────────────────── */}
      {showAddRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                  <Icon icon="heroicons:plus" className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Create Custom Staffing Role
                  </h3>
                  <p className="text-[11px] text-neutral-400">Define operational staffing profile and custom permission matrix</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddRole(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
              >
                <Icon icon="heroicons:x-mark" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Branch Selection */}
                {branches.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                      Target Branch Office <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newRoleBranchId}
                      onChange={(e) => setNewRoleBranchId(e.target.value)}
                      className="w-full text-xs font-semibold border border-neutral-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      required
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Role Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Custom Role Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Senior Recruiter, Lead BDM, Operations Head..."
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="text-xs h-10 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Description
                </label>
                <Input
                  placeholder="Role responsibilities and operational scope..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="text-xs h-9 font-normal"
                />
              </div>

              {/* Inherit from System Archetype Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Inherit Permissions from Base System Role
                </label>
                <select
                  value={newRoleSystemRole}
                  onChange={(e) => handleCreateArchetypeChange(e.target.value)}
                  className="w-full text-xs font-medium border border-neutral-300 dark:border-slate-700 rounded-lg p-2.5 bg-neutral-50/50 dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {SYSTEM_ARCHETYPES.map((arch) => (
                    <option key={arch.key} value={arch.key}>
                      {arch.label} — ({arch.badge})
                    </option>
                  ))}
                </select>
              </div>

              {/* Permissions Matrix Selector */}
              <div className="border border-neutral-200 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-neutral-50/40 dark:bg-slate-800/10">
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Custom Permissions Matrix</h4>
                    <p className="text-[10.5px] text-neutral-400">Toggle specific security tokens enabled for this role ({newRolePermissions.length} enabled)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedCreateGroups(
                        Object.keys(permissionGroups).reduce((acc, k) => ({ ...acc, [k]: true }), {})
                      )}
                      className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 hover:underline cursor-pointer"
                    >
                      Expand All
                    </button>
                    <span className="text-neutral-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setExpandedCreateGroups({})}
                      className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 hover:underline cursor-pointer"
                    >
                      Collapse All
                    </button>
                    <span className="text-neutral-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setNewRolePermissions(permissions.map(p => p.id))}
                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-neutral-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setNewRolePermissions([])}
                      className="text-[10px] font-bold text-neutral-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {Object.entries(permissionGroups).map(([groupName, groupPerms]) => {
                    const isExpanded = !!expandedCreateGroups[groupName];
                    const enabledInGroup = groupPerms.filter(p => newRolePermissions.includes(p.id)).length;
                    const totalInGroup = groupPerms.length;

                    return (
                      <div
                        key={groupName}
                        className="border border-neutral-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 transition-all shadow-2xs"
                      >
                        <div
                          onClick={() => setExpandedCreateGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                          className="flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-slate-850 hover:bg-neutral-100/80 dark:hover:bg-slate-800 cursor-pointer select-none transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Icon
                              icon={isExpanded ? "heroicons:chevron-down" : "heroicons:chevron-right"}
                              className="h-3.5 w-3.5 text-neutral-500 transition-transform"
                            />
                            <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                              {groupName}
                            </span>
                            <span
                              className={`text-[9.5px] px-2 py-0.5 rounded-full font-semibold ${
                                enabledInGroup > 0
                                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50"
                                  : "bg-neutral-100 dark:bg-slate-800 text-neutral-500 dark:text-neutral-400"
                              }`}
                            >
                              {enabledInGroup} / {totalInGroup} enabled
                            </span>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                const ids = groupPerms.map(p => p.id);
                                const all = ids.every(id => newRolePermissions.includes(id));
                                if (all) {
                                  setNewRolePermissions(prev => prev.filter(id => !ids.includes(id)));
                                } else {
                                  setNewRolePermissions(prev => Array.from(new Set([...prev, ...ids])));
                                }
                              }}
                              className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              {groupPerms.every(p => newRolePermissions.includes(p.id)) ? "Deselect Group" : "Select Group"}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2 border-t border-neutral-200 dark:border-slate-800 bg-neutral-50/20 dark:bg-slate-900/30">
                            {groupPerms.map((perm) => {
                              const isChecked = newRolePermissions.includes(perm.id);
                              return (
                                <label
                                  key={perm.id}
                                  className={`flex items-start gap-2 p-2 rounded-lg border transition cursor-pointer select-none text-xs ${
                                    isChecked
                                      ? "border-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/20 text-neutral-900 dark:text-white shadow-2xs"
                                      : "border-neutral-200 dark:border-slate-800 text-neutral-500 hover:border-neutral-300"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setNewRolePermissions(prev =>
                                        prev.includes(perm.id) ? prev.filter(p => p !== perm.id) : [...prev, perm.id]
                                      );
                                    }}
                                    className="mt-0.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 block text-[11px]">{perm.name}</span>
                                    {perm.description && (
                                      <span className="text-[9.5px] text-neutral-400 block line-clamp-1">{perm.description}</span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setShowAddRole(false)}
                  className="text-xs h-9 px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 shadow-xs cursor-pointer"
                >
                  {submitting ? "Creating Role..." : "Create Custom Role"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIT CUSTOM ROLE ─────────────────────────────────── */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                  <Icon icon="heroicons:pencil-square" className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Edit Role: {editingRole.name}
                  </h3>
                  <p className="text-[11px] text-neutral-400">Modify role name, archetype template, branch assignment, and permissions</p>
                </div>
              </div>
              <button
                onClick={() => setEditingRole(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
              >
                <Icon icon="heroicons:x-mark" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditRoleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Branch */}
                {branches.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                      Branch Office <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editRoleBranchId}
                      onChange={(e) => setEditRoleBranchId(e.target.value)}
                      className="w-full text-xs font-semibold border border-neutral-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      required
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Role Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Custom Role Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={editRoleName}
                    onChange={(e) => setEditRoleName(e.target.value)}
                    className="text-xs h-10 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Description
                </label>
                <Input
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  className="text-xs h-9 font-normal"
                />
              </div>

              {/* Base Archetype */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Base System Archetype Template
                </label>
                <select
                  value={editRoleSystemRole}
                  onChange={(e) => setEditRoleSystemRole(e.target.value)}
                  className="w-full text-xs font-medium border border-neutral-300 dark:border-slate-700 rounded-lg p-2.5 bg-neutral-50/50 dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {SYSTEM_ARCHETYPES.map((arch) => (
                    <option key={arch.key} value={arch.key}>
                      {arch.label} — ({arch.badge})
                    </option>
                  ))}
                </select>
              </div>

              {/* Permissions Matrix */}
              <div className="border border-neutral-200 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-neutral-50/40 dark:bg-slate-800/10">
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Custom Permissions Matrix</h4>
                    <p className="text-[10.5px] text-neutral-400">Configure access tokens for this role ({editRolePermissions.length} enabled)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedEditGroups(
                        Object.keys(permissionGroups).reduce((acc, k) => ({ ...acc, [k]: true }), {})
                      )}
                      className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 hover:underline cursor-pointer"
                    >
                      Expand All
                    </button>
                    <span className="text-neutral-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setExpandedEditGroups({})}
                      className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 hover:underline cursor-pointer"
                    >
                      Collapse All
                    </button>
                    <span className="text-neutral-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setEditRolePermissions(permissions.map(p => p.id))}
                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-neutral-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setEditRolePermissions([])}
                      className="text-[10px] font-bold text-neutral-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {Object.entries(permissionGroups).map(([groupName, groupPerms]) => {
                    const isExpanded = !!expandedEditGroups[groupName];
                    const enabledInGroup = groupPerms.filter(p => editRolePermissions.includes(p.id)).length;
                    const totalInGroup = groupPerms.length;

                    return (
                      <div
                        key={groupName}
                        className="border border-neutral-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 transition-all shadow-2xs"
                      >
                        <div
                          onClick={() => setExpandedEditGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                          className="flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-slate-850 hover:bg-neutral-100/80 dark:hover:bg-slate-800 cursor-pointer select-none transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Icon
                              icon={isExpanded ? "heroicons:chevron-down" : "heroicons:chevron-right"}
                              className="h-3.5 w-3.5 text-neutral-500 transition-transform"
                            />
                            <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                              {groupName}
                            </span>
                            <span
                              className={`text-[9.5px] px-2 py-0.5 rounded-full font-semibold ${
                                enabledInGroup > 0
                                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50"
                                  : "bg-neutral-100 dark:bg-slate-800 text-neutral-500 dark:text-neutral-400"
                              }`}
                            >
                              {enabledInGroup} / {totalInGroup} enabled
                            </span>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                const ids = groupPerms.map(p => p.id);
                                const all = ids.every(id => editRolePermissions.includes(id));
                                if (all) {
                                  setEditRolePermissions(prev => prev.filter(id => !ids.includes(id)));
                                } else {
                                  setEditRolePermissions(prev => Array.from(new Set([...prev, ...ids])));
                                }
                              }}
                              className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              {groupPerms.every(p => editRolePermissions.includes(p.id)) ? "Deselect Group" : "Select Group"}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2 border-t border-neutral-200 dark:border-slate-800 bg-neutral-50/20 dark:bg-slate-900/30">
                            {groupPerms.map((perm) => {
                              const isChecked = editRolePermissions.includes(perm.id);
                              return (
                                <label
                                  key={perm.id}
                                  className={`flex items-start gap-2 p-2 rounded-lg border transition cursor-pointer select-none text-xs ${
                                    isChecked
                                      ? "border-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/20 text-neutral-900 dark:text-white shadow-2xs"
                                      : "border-neutral-200 dark:border-slate-800 text-neutral-500 hover:border-neutral-300"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setEditRolePermissions(prev =>
                                        prev.includes(perm.id) ? prev.filter(p => p !== perm.id) : [...prev, perm.id]
                                      );
                                    }}
                                    className="mt-0.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 block text-[11px]">{perm.name}</span>
                                    {perm.description && (
                                      <span className="text-[9.5px] text-neutral-400 block line-clamp-1">{perm.description}</span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="text-xs h-9 px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 shadow-xs cursor-pointer"
                >
                  {submitting ? "Saving Changes..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: ASSIGNED USERS TABLE VIEW ─────────────────────────── */}
      {viewUsersRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                  <Icon icon="heroicons:users" className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    Staff Assigned to: <span className="text-indigo-600 font-extrabold">{viewUsersRole.name}</span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {getAssignedUsers(viewUsersRole).length} active user{getAssignedUsers(viewUsersRole).length !== 1 ? "s" : ""} in {viewUsersRole.branchName || "Default Office"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => openAssignStaffPopup(viewUsersRole)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Icon icon="heroicons:user-plus" className="h-3.5 w-3.5" />
                  + Assign Staff
                </Button>

                <button
                  onClick={() => setViewUsersRole(null)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
                >
                  <Icon icon="heroicons:x-mark" className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="border border-neutral-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/80 dark:bg-slate-800/40 border-b border-neutral-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Assigned Roles</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Joined / Created</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-slate-800 text-xs">
                    {getAssignedUsers(viewUsersRole).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-neutral-400 italic">
                          <div className="flex flex-col items-center gap-2">
                            <Icon icon="heroicons:user-group" className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                            <span>No staff members are currently assigned to this role.</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAssignStaffPopup(viewUsersRole)}
                              className="mt-1 text-xs h-7 text-indigo-600 border-indigo-300 hover:bg-indigo-50 cursor-pointer"
                            >
                              + Assign Staff
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      getAssignedUsers(viewUsersRole).map((u) => (
                        <tr key={u.id} className="hover:bg-neutral-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-slate-700 text-neutral-700 dark:text-neutral-200 font-bold text-xs flex items-center justify-center shrink-0">
                                {u.fullName.charAt(0).toUpperCase()}
                              </div>
                              <span>{u.fullName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">{u.email}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(u.roles && u.roles.length > 0 ? u.roles : [u.roleName || "Recruiter"]).map(
                                (roleItem, rIdx) => (
                                  <span
                                    key={rIdx}
                                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                                      roleItem.toUpperCase() === viewUsersRole.name.toUpperCase()
                                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                        : "bg-neutral-100 text-neutral-700 dark:bg-slate-800 dark:text-slate-300 border border-neutral-200/80 dark:border-slate-700"
                                    }`}
                                  >
                                    {roleItem}
                                  </span>
                                )
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-neutral-100 text-neutral-700 dark:bg-slate-800 dark:text-slate-300 border border-neutral-200/80 dark:border-slate-700 text-[10px] font-medium px-2 py-0.5 rounded">
                              Active
                            </span>
                          </td>
                          <td className="py-3 px-4 text-neutral-500 text-[11px]">
                            {formatDateTimeWithSeconds(u.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleUnassignUser(u, viewUsersRole)}
                                className="text-xs text-red-500 hover:text-red-700 hover:underline cursor-pointer font-medium"
                                title="Remove user from this role"
                              >
                                Remove
                              </button>
                              <span className="text-neutral-300">|</span>
                              <Link
                                href={`/utility/users?search=${encodeURIComponent(u.email)}`}
                                className="text-xs font-medium text-neutral-700 hover:text-indigo-600 hover:underline inline-flex items-center gap-1"
                              >
                                Manage User
                                <Icon icon="heroicons:arrow-top-right-on-square" className="h-3 w-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 flex justify-between items-center shrink-0">
              <span className="text-[11px] text-neutral-400">
                To manage comprehensive workspace permissions, visit <strong>Users & Teams</strong>.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewUsersRole(null)}
                className="text-xs h-8 px-4"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: DEDICATED ASSIGN STAFF POP-UP DIALOG ────────────── */}
      {assignModalRole && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                  <Icon icon="heroicons:user-plus" className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    Assign Staff: <span className="text-indigo-600 font-extrabold">{assignModalRole.name}</span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {assignModalRole.branchName || "Default Office"} • Multi-role assignment
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setAssignModalRole(null);
                  setSelectedUserIdsToAssign([]);
                }}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
              >
                <Icon icon="heroicons:x-mark" className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Select staff members to assign the <strong className="text-neutral-900 dark:text-white">{assignModalRole.name}</strong> role. Staff can hold multiple custom roles simultaneously.
                </p>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Icon
                    icon="heroicons:magnifying-glass"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400"
                  />
                  <input
                    type="text"
                    value={assignUserSearchQuery}
                    onChange={(e) => setAssignUserSearchQuery(e.target.value)}
                    placeholder="Search staff by name or email..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                    Available Staff ({filteredAvailableUsers.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-slate-800 dark:text-neutral-300 border border-neutral-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                      {selectedUserIdsToAssign.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllUsersToAssign(filteredAvailableUsers)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                    >
                      {filteredAvailableUsers.length > 0 &&
                      filteredAvailableUsers.every((u) => selectedUserIdsToAssign.includes(u.id))
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-neutral-100 dark:divide-slate-800">
                {filteredAvailableUsers.length === 0 ? (
                  <div className="py-8 text-center text-neutral-400 italic text-xs">
                    {availableUsersToAssign.length === 0
                      ? "All staff members in this branch already have this role."
                      : "No matching staff members found."}
                  </div>
                ) : (
                  filteredAvailableUsers.map((u) => {
                    const isSelected = selectedUserIdsToAssign.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-indigo-50/70 dark:bg-indigo-950/50"
                            : "hover:bg-neutral-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUserToAssign(u.id)}
                            className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer shrink-0"
                          />
                          <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-slate-700 text-neutral-700 dark:text-neutral-200 font-bold text-xs flex items-center justify-center shrink-0">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap truncate">
                              <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                                {u.fullName}
                              </span>
                              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                                ({(u.roles && u.roles.length > 0 ? u.roles : [u.roleName || "Recruiter"]).join(", ")})
                              </span>
                            </div>
                            <span className="text-[10.5px] text-neutral-400 font-mono block truncate">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 flex justify-end items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setAssignModalRole(null);
                  setSelectedUserIdsToAssign([]);
                }}
                className="text-xs h-9 px-4 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={selectedUserIdsToAssign.length === 0 || isAssigningUser}
                onClick={() => handleBatchAssignUsersSubmit(assignModalRole)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 cursor-pointer shadow-xs"
              >
                {isAssigningUser
                  ? "Assigning..."
                  : `Confirm Assignment (${selectedUserIdsToAssign.length})`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: DIRECT PERMISSIONS MATRIX MODAL ─────────────────── */}
      {matrixEditingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                  <Icon icon="heroicons:lock-open" className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Permissions Matrix: {matrixEditingRole.name}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Base Archetype: {matrixEditingRole.systemRole || "RECRUITER"} • {matrixPermissions.length} enabled permissions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMatrixEditingRole(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
              >
                <Icon icon="heroicons:x-mark" className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="flex items-center justify-between bg-neutral-50 dark:bg-slate-800/50 p-3 rounded-xl border border-neutral-200 dark:border-slate-700">
                <div className="text-xs text-neutral-700 dark:text-neutral-300">
                  Select and configure granular operation access tokens for staff holding this role.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedMatrixGroups(
                      Object.keys(permissionGroups).reduce((acc, k) => ({ ...acc, [k]: true }), {})
                    )}
                    className="text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 hover:underline cursor-pointer"
                  >
                    Expand All
                  </button>
                  <span className="text-neutral-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => setExpandedMatrixGroups({})}
                    className="text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 hover:underline cursor-pointer"
                  >
                    Collapse All
                  </button>
                  <span className="text-neutral-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => setMatrixPermissions(permissions.map(p => p.id))}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-neutral-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => setMatrixPermissions([])}
                    className="text-xs font-bold text-neutral-500 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(permissionGroups).map(([groupName, groupPerms]) => {
                  const isExpanded = !!expandedMatrixGroups[groupName];
                  const enabledInGroup = groupPerms.filter(p => matrixPermissions.includes(p.id)).length;
                  const totalInGroup = groupPerms.length;

                  return (
                    <div
                      key={groupName}
                      className="border border-neutral-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs transition-all"
                    >
                      <div
                        onClick={() => setExpandedMatrixGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                        className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-slate-850 hover:bg-neutral-100/80 dark:hover:bg-slate-800 cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            icon={isExpanded ? "heroicons:chevron-down" : "heroicons:chevron-right"}
                            className="h-4 w-4 text-neutral-500 transition-transform"
                          />
                          <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                            {groupName}
                          </h4>
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
                              enabledInGroup > 0
                                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50"
                                : "bg-neutral-100 dark:bg-slate-800 text-neutral-500 dark:text-neutral-400"
                            }`}
                          >
                            {enabledInGroup} / {totalInGroup} enabled
                          </span>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleToggleMatrixGroup(groupPerms)}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            {groupPerms.every(p => matrixPermissions.includes(p.id)) ? "Deselect Group" : "Select Group"}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-neutral-200 dark:border-slate-800 bg-neutral-50/20 dark:bg-slate-900/30">
                          {groupPerms.map((perm) => {
                            const isChecked = matrixPermissions.includes(perm.id);
                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-2.5 p-3 rounded-lg border transition cursor-pointer select-none ${
                                  isChecked
                                    ? "border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20 text-neutral-900 dark:text-white shadow-2xs"
                                    : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleMatrixPermission(perm.id)}
                                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-neutral-900 dark:text-white">{perm.name}</div>
                                  <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Token: &apos;{perm.id}&apos;</div>
                                  {perm.description && (
                                    <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">{perm.description}</p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 flex justify-end gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMatrixEditingRole(null)}
                className="text-xs h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                disabled={submitting}
                onClick={handleSaveMatrixPermissions}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {submitting ? "Saving Matrix..." : "Save Permissions Matrix"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 6: DELETE ROLE CONFIRMATION ──────────────────────────── */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto">
              <Icon icon="heroicons:trash" className="h-6 w-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Delete Custom Role &quot;{roleToDelete.role.name}&quot;?
              </h3>
              <p className="text-xs text-neutral-500 mt-1.5">
                This will permanently delete this operational staffing role definition.
              </p>
            </div>

            {roleToDelete.staffCount > 0 && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <Icon icon="heroicons:exclamation-triangle" className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>{roleToDelete.staffCount} Staff Member(s) Currently Assigned</span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">
                  Please select a replacement custom role to automatically re-assign these staff members before deleting:
                </p>
                <select
                  value={targetRoleId}
                  onChange={(e) => setTargetRoleId(e.target.value)}
                  className="w-full text-xs font-semibold border border-amber-300 dark:border-amber-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {roles
                    .filter((r) => r.id !== roleToDelete.role.id && !r.isSystem)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.branchName || "Current Office"})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRoleToDelete(null)}
                className="text-xs h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                disabled={submitting}
                onClick={handleConfirmDeleteRole}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 px-5 shadow-xs cursor-pointer"
              >
                {submitting ? "Deleting..." : "Confirm & Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
