"use client";

import React, { useEffect, useState } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";
import { getTenantIdentifier } from "@/utils/subdomain-helper";
import { isRoleAdmin } from "@/lib/role-permissions";

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
  }
];

export default function RolesPermissionsPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Core Dynamic RBAC state
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("all");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  
  // Selection states
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // New Custom Role Form State
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleBranchId, setNewRoleBranchId] = useState("");
  const [newRoleSystemRole, setNewRoleSystemRole] = useState("RECRUITER");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>(SYSTEM_ARCHETYPES[0].perms);

  // Role Delete Modal State
  const [roleToDelete, setRoleToDelete] = useState<{ role: CustomRole; staffCount: number } | null>(null);
  const [targetRoleId, setTargetRoleId] = useState<string>("");

  useEffect(() => {
    const user = atsApi.auth.getCurrentUser();
    const override = typeof window !== "undefined" ? localStorage.getItem("override_role") : null;
    
    // Check if active role perspective has admin access
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
      const [rolesData, permsData, usersData, branchesData, profileData] = await Promise.all([
        atsApi.auth.listRoles(bid, true),
        atsApi.auth.listAllPermissions(),
        atsApi.auth.listUsers(),
        atsApi.branches.list().catch(() => []),
        atsApi.auth.me().catch(() => null)
      ]);

      // Filter out system roles: show ONLY custom roles in the configuration page
      const customOnly = (rolesData || []).filter((r: any) => !r.isSystem);

      setRoles(rolesData || []);
      setPermissions(permsData || []);
      setUsers(usersData || []);
      setBranches(branchesData || []);
      setProfile(profileData);

      // Default select the first custom role if available
      if (customOnly.length > 0) {
        setSelectedRole(customOnly[0]);
        setSelectedPermissions(customOnly[0].permissions || []);
      } else {
        setSelectedRole(null);
        setSelectedPermissions([]);
      }
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

  const handleRoleSelect = (role: CustomRole) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions || []);
  };

  const handlePermissionToggle = (permId: string) => {
    if (selectedRole?.isSystem) return; // Cannot modify core system roles

    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    if (selectedRole.isSystem) {
      toast.error("System roles are abstract templates and cannot be directly modified.");
      return;
    }

    try {
      setSubmitting(true);
      await atsApi.auth.updateRolePermissions(selectedRole.id, selectedPermissions);
      toast.success(`Permissions updated for role "${selectedRole.name}"`);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to update permissions: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openAddRoleModal = () => {
    setNewRoleName("");
    setNewRoleDesc("");
    const defaultBranch = (selectedBranchFilter !== "all" ? selectedBranchFilter : null) || (typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null) || branches[0]?.id || "";
    setNewRoleBranchId(defaultBranch);
    setNewRoleSystemRole("RECRUITER");
    setNewRolePermissions(SYSTEM_ARCHETYPES[0].perms);
    setShowAddRole(true);
  };

  const handleArchetypeChange = (archetypeKey: string) => {
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

      toast.success(`Custom staffing role "${newRole.name}" created successfully!`);
      setShowAddRole(false);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to create custom role: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitiateDeleteRole = (role: CustomRole) => {
    if (role.isSystem) return;
    const staffCount = users.filter((u) => {
      if (u.roleId === role.id) return true;
      const userRolesUpper = (u.roles && u.roles.length > 0 ? u.roles : [u.roleName || '']).map(r => r.toUpperCase());
      const roleNameUpper = role.name.toUpperCase();
      const sysRoleUpper = (role.replacesSystemRole || role.systemRole || '').toUpperCase();
      return userRolesUpper.includes(roleNameUpper) || (sysRoleUpper !== '' && userRolesUpper.includes(sysRoleUpper));
    }).length;

    const availableTargets = roles.filter(r => r.id !== role.id && !r.isSystem);
    const defaultTarget = availableTargets[0]?.id || "";

    setRoleToDelete({ role, staffCount });
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

  // Group permissions by category
  const permissionGroups = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    const group = perm.group || "General";
    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {});

  // Custom roles filtered for the view (strictly excluding system roles)
  const customRolesList = roles.filter((r) => !r.isSystem);

  const filteredRoles = selectedBranchFilter === "all"
    ? customRolesList
    : customRolesList.filter((r) => r.branchId === selectedBranchFilter);

  const selectedArchetypeObj = SYSTEM_ARCHETYPES.find((a) => a.key === newRoleSystemRole) || SYSTEM_ARCHETYPES[0];

  if (loading) {
    return (
      <div>
        <SiteBreadcrumb />
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-sm text-default-500">Loading custom role configurations...</p>
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
              Only workspace **Administrators** or **Branch Managers** can view and configure custom staffing roles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SiteBreadcrumb />
      
      {/* HEADER WITH BRANCH SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-default-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-default-900 flex items-center gap-2">
            <Icon icon="heroicons:shield-check" className="text-indigo-600 h-7 w-7" />
            Custom Staffing Roles &amp; Permissions
          </h1>
          <p className="text-sm text-default-600 mt-1">
            Build custom branch staffing profiles inherited from abstract system archetypes (Recruiter, BDM, Delivery Head, etc.).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Branch Filter Dropdown */}
          {branches.length > 0 && (
            <div className="flex items-center gap-1.5 bg-default-50 dark:bg-slate-800 border border-default-250 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-2xs">
              <Icon icon="heroicons:building-office-2" className="h-4 w-4 text-indigo-600 shrink-0" />
              <select
                value={selectedBranchFilter}
                onChange={(e) => handleBranchFilterChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-default-800 dark:text-white outline-none cursor-pointer"
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

          <Button 
            onClick={openAddRoleModal} 
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 shadow-sm cursor-pointer"
          >
            <Icon icon="heroicons:plus" className="h-4 w-4" /> Create Custom Role
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ==========================================
           LEFT COLUMN: CUSTOM ROLES LIST ONLY
           ========================================== */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm overflow-hidden rounded-xl">
            <CardHeader className="border-b border-default-150 p-4 bg-default-50/50 dark:bg-slate-800/20">
              <CardTitle className="text-sm font-bold text-default-900 flex items-center gap-2">
                <Icon icon="heroicons:user-group" className="h-4 w-4 text-indigo-600" />
                Custom Roles
              </CardTitle>
              <CardDescription className="text-[11px] text-default-500">
                {filteredRoles.length} custom operational role{filteredRoles.length !== 1 ? "s" : ""} in current office
              </CardDescription>
            </CardHeader>

            <CardContent className="p-3 space-y-2">
              {filteredRoles.length === 0 ? (
                <div className="p-8 border border-dashed border-default-250 dark:border-slate-800 rounded-xl text-center space-y-2 bg-default-50/40 dark:bg-slate-800/10">
                  <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 flex items-center justify-center mx-auto">
                    <Icon icon="heroicons:shield-check" className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-default-800 dark:text-white">No Custom Roles Found</p>
                  <p className="text-[11px] text-default-450 leading-relaxed max-w-xs mx-auto">
                    Click <strong>Create Custom Role</strong> above to define a staffing role for this office.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                  {filteredRoles.map((role) => {
                    const isSelected = selectedRole?.id === role.id;
                    const staffCount = users.filter((u) => {
                      if (u.roleId === role.id) return true;
                      const userRolesUpper = (u.roles && u.roles.length > 0 ? u.roles : [u.roleName || '']).map(r => r.toUpperCase());
                      return userRolesUpper.includes(role.name.toUpperCase());
                    }).length;

                    return (
                      <div
                        key={role.id}
                        onClick={() => handleRoleSelect(role)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs ring-1 ring-indigo-500"
                            : "border-default-150 bg-white dark:bg-slate-850 hover:bg-default-50/60 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-default-900 capitalize truncate">
                                {role.name}
                              </span>
                              <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 text-[8.5px] font-bold border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.2">
                                Base: {role.systemRole || "RECRUITER"}
                              </Badge>
                            </div>
                            <p className="text-[10.5px] text-default-500 mt-1 line-clamp-2">
                              {role.description || "Custom operational staffing role"}
                            </p>
                          </div>
                          
                          <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                            <span className="text-[9.5px] font-bold text-indigo-600 bg-indigo-50 dark:bg-slate-800 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-150 dark:border-slate-700">
                              {staffCount} Staff
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInitiateDeleteRole(role);
                              }}
                              className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                              title="Delete custom role"
                            >
                              <Icon icon="heroicons:trash" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ==========================================
           RIGHT COLUMN: CONFIGURATION PANEL (PERMISSION MATRIX)
           ========================================== */}
        <div className="lg:col-span-3">
          {selectedRole ? (
            <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm overflow-hidden rounded-xl">
              <CardHeader className="border-b border-default-150 bg-default-50/50 dark:bg-slate-800/20 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-default-900">
                      <Icon icon="heroicons:lock-open" className="text-indigo-600 h-4.5 w-4.5" />
                      Configure Role: {selectedRole.name}
                    </CardTitle>
                    <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 text-[9px] font-bold border border-indigo-200">
                      Base Archetype: {selectedRole.systemRole || "RECRUITER"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-default-500 mt-0.5">{selectedRole.description || "Custom branch role"}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 text-xs font-semibold py-1 px-3 flex items-center gap-1.5">
                    <Icon icon="heroicons:users" className="h-3.5 w-3.5 text-indigo-600" />
                    {users.filter(u => u.roleId === selectedRole.id || (u.roles && u.roles.includes(selectedRole.name))).length} Staff Assigned
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.href = "/utility/users"}
                    className="h-8 text-xs font-semibold border-neutral-300 hover:border-indigo-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                  >
                    Manage Users
                    <Icon icon="heroicons:arrow-top-right-on-square" className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                {/* PERMISSION MATRIX GRID */}
                <div className="p-5 space-y-6">
                  <div className="space-y-6 max-h-[520px] overflow-y-auto pr-1">
                    {Object.entries(permissionGroups).map(([groupName, groupPerms]) => {
                      const getGroupIcon = (name: string) => {
                        if (name.includes("Jobs")) return "heroicons:briefcase";
                        if (name.includes("Candidates")) return "heroicons:users";
                        if (name.includes("Sourcing") || name.includes("Submissions")) return "heroicons:arrow-up-tray";
                        if (name.includes("Screening") || name.includes("Review Gate")) return "heroicons:shield-check";
                        if (name.includes("Interview") || name.includes("Audits")) return "heroicons:chat-bubble-left-right";
                        if (name.includes("Clients") || name.includes("Placements")) return "heroicons:building-office-2";
                        if (name.includes("Pods")) return "heroicons:user-group";
                        if (name.includes("Branch")) return "heroicons:map-pin";
                        return "heroicons:cog-6-tooth";
                      };

                      return (
                        <div key={groupName} className="space-y-2 border-b border-default-150 pb-5 last:border-b-0 last:pb-0">
                          <div className="flex items-center gap-2">
                            <Icon icon={getGroupIcon(groupName)} className="h-4 w-4 text-indigo-600" />
                            <h3 className="text-xs font-bold text-default-850 uppercase tracking-wider">{groupName}</h3>
                            <span className="text-[10px] text-default-400 font-medium ml-auto">
                              {groupPerms.filter(p => selectedPermissions.includes(p.id)).length} / {groupPerms.length} enabled
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
                            {groupPerms.map((perm) => {
                              const isChecked = selectedPermissions.includes(perm.id);
                              return (
                                <label
                                  key={perm.id}
                                  className={`flex items-start gap-2.5 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                                    isChecked
                                      ? "border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20 text-default-900"
                                      : "border-default-150 bg-default-50/20 dark:bg-slate-800/10 text-default-500 hover:border-default-300"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handlePermissionToggle(perm.id)}
                                    className="mt-0.5 h-4 w-4 rounded border-default-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold tracking-tight text-default-900">
                                      {perm.name}
                                    </div>
                                    <div className="text-[10px] text-default-400 font-mono mt-0.5">
                                      Token: &apos;{perm.id}&apos;
                                    </div>
                                    {perm.description && (
                                      <p className="text-[10.5px] text-default-500 mt-1 leading-snug">
                                        {perm.description}
                                      </p>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-default-150 pt-4 flex justify-end">
                    <Button
                      disabled={submitting}
                      onClick={handleSavePermissions}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      {submitting ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                      ) : (
                        <>
                          <Icon icon="heroicons:check-circle" className="h-4.5 w-4.5" />
                          Save Permissions Matrix
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-[400px] border border-dashed border-default-250 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6 space-y-3 bg-white dark:bg-slate-900">
              <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-600 flex items-center justify-center">
                <Icon icon="heroicons:shield-check" className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-default-800 dark:text-white">No Role Selected</p>
                <p className="text-xs text-default-450 mt-1 max-w-sm">
                  Select a custom role from the left panel to configure its granular security permissions matrix.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CREATE CUSTOM ROLE MODAL (INHERITS FROM SYSTEM ROLE ARCHETYPE) ── */}
      {showAddRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                  <Icon icon="heroicons:plus" className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Create Custom Staffing Role
                  </h3>
                  <p className="text-[11px] text-neutral-400">Inherits base permissions and workflow archetype from a system role</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddRole(false)} 
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg"
              >
                <Icon icon="heroicons:x-mark" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Branch Selection */}
              {branches.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Branch Office <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRoleBranchId}
                    onChange={(e) => setNewRoleBranchId(e.target.value)}
                    className="w-full text-xs font-semibold border border-neutral-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.market || "General"})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10.5px] text-neutral-450">
                    This custom staffing role will be isolated and available to staff in this branch office.
                  </p>
                </div>
              )}

              {/* Role Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Custom Role Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Senior Technical Recruiter, BDM - Enterprise..."
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="text-xs h-9 font-medium"
                  required
                />
              </div>

              {/* Inherit from System Archetype Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Inherit Permissions from Base System Role ⚙️
                </label>
                <select
                  value={newRoleSystemRole}
                  onChange={(e) => handleArchetypeChange(e.target.value)}
                  className="w-full text-xs font-bold border border-indigo-300 dark:border-indigo-800 rounded-lg p-2.5 bg-indigo-50/40 dark:bg-slate-800 text-indigo-900 dark:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {SYSTEM_ARCHETYPES.map((arch) => (
                    <option key={arch.key} value={arch.key}>
                      {arch.label} — ({arch.badge})
                    </option>
                  ))}
                </select>
              </div>

              {/* Archetype Preview Box */}
              <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Icon icon="heroicons:sparkles" className="h-4 w-4 text-indigo-600" />
                    {selectedArchetypeObj.label}
                  </span>
                  <Badge className="bg-indigo-600 text-white text-[9px] font-bold border-0 px-2 py-0.2">
                    {newRolePermissions.length} Permissions Inherited
                  </Badge>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-slate-300 leading-relaxed">
                  {selectedArchetypeObj.desc}
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Description / Operational Functions
                </label>
                <textarea
                  placeholder="Describe this role's scope, responsibilities, or specializations..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full text-xs border border-neutral-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-slate-800 shrink-0">
                <Button 
                  size="sm" 
                  variant="outline" 
                  type="button" 
                  onClick={() => setShowAddRole(false)}
                  className="h-8 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  type="submit" 
                  disabled={submitting || !newRoleName.trim()} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-5 shadow-xs cursor-pointer"
                >
                  {submitting ? "Creating..." : "Create Custom Role"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Role Delete & Re-assignment Modal ───────────────────────── */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <Icon icon="heroicons:exclamation-triangle" className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Delete Custom Role &amp; Reassign Staff
              </h3>
            </div>

            <p className="text-xs text-neutral-600 dark:text-slate-300">
              Are you sure you want to delete custom role <strong>"{roleToDelete.role.name}"</strong>?
            </p>

            {roleToDelete.staffCount > 0 ? (
              <div className="space-y-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3.5 rounded-lg">
                <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Icon icon="heroicons:users" className="h-4 w-4" />
                  {roleToDelete.staffCount} staff member(s) are currently assigned to this role.
                </div>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-slate-300">
                    Select Replacement Target Role:
                  </label>
                  <select
                    value={targetRoleId}
                    onChange={(e) => setTargetRoleId(e.target.value)}
                    className="w-full text-xs font-semibold border border-neutral-300 dark:border-slate-700 rounded-md p-2 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {roles
                      .filter((r) => r.id !== roleToDelete.role.id && !r.isSystem)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} (Custom Role)
                        </option>
                      ))}
                  </select>
                </div>
                <p className="text-[10px] text-neutral-500 dark:text-slate-400">
                  Staff assigned to "{roleToDelete.role.name}" will be transferred to the selected target role cleanly.
                </p>
              </div>
            ) : (
              <p className="text-xs text-neutral-500 dark:text-slate-400">
                No staff members are currently assigned to this custom role.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRoleToDelete(null)}
                disabled={submitting}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDeleteRole}
                disabled={submitting || (roleToDelete.staffCount > 0 && !targetRoleId)}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                {submitting ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                ) : (
                  <>
                    <Icon icon="heroicons:trash" className="h-4 w-4" />
                    Reassign &amp; Delete Role
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


