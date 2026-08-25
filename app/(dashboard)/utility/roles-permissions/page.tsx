"use client";

import React, { useEffect, useState } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";
import { getTenantIdentifier } from "@/utils/subdomain-helper";
import { isRoleAdmin } from "@/lib/role-permissions";

interface Permission {
  id: string;
  name: string;
  group: string;
}

interface CustomRole {
  id: string;
  name: string;
  description: string;
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
  isActive: boolean;
  createdAt: string;
}

export default function RolesPermissionsPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const currentUser = typeof window !== 'undefined' ? atsApi.auth.getCurrentUser() : null;
  const getDomainSuffix = () => {
    const userEmail = profile?.email || currentUser?.email;
    if (userEmail?.toLowerCase().endsWith("@csm.com")) {
      return "csm";
    }
    const currentSub = typeof window !== 'undefined' ? getTenantIdentifier() : "";
    const rawDomain = currentSub || profile?.tenantDomain || currentUser?.tenantDomain || "enfycon";
    return rawDomain.toLowerCase().endsWith(".com") ? rawDomain.slice(0, -4) : rawDomain;
  };
  const tenantDomain = getDomainSuffix();

  // Core Dynamic RBAC state
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [assignableRoles, setAssignableRoles] = useState<CustomRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  
  // Selection states
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"permissions" | "users" | "settings">("permissions");
  const [podSystemEnabled, setPodSystemEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // New Custom Role Form State
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleSystemRole, setNewRoleSystemRole] = useState("RECRUITER");

  // Add Member Modal State
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberRole, setMemberRole] = useState("RECRUITER");

  // Assign Roles Modal State
  const [assigningUser, setAssigningUser] = useState<TenantUser | null>(null);
  const [modalRoleIds, setModalRoleIds] = useState<string[]>([]);
  const [userLimit, setUserLimit] = useState<number>(5);

  useEffect(() => {
    const user = atsApi.auth.getCurrentUser();
    const override = typeof window !== "undefined" ? localStorage.getItem("override_role") : null;
    const activeRole = override || user?.systemRole || user?.roles?.[0];
    
    // Check if active role perspective has admin access
    const hasAccess = override
      ? isRoleAdmin(override, roles, user)
      : (user?.roles?.includes("ADMIN") || user?.roles?.includes("SUPER_ADMIN") || user?.permissions?.includes("user:manage"));
    
    setIsAdmin(hasAccess);

    if (hasAccess) {
      loadData();
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, assignableData, permsData, usersData, profileData] = await Promise.all([
        atsApi.auth.listRoles(),
        atsApi.auth.listAssignableRoles().catch(() => []),
        atsApi.auth.listAllPermissions(),
        atsApi.auth.listUsers(),
        atsApi.auth.me()
      ]);

      setRoles(rolesData);
      setAssignableRoles(assignableData.length > 0 ? assignableData : rolesData);
      setPermissions(permsData);
      setUsers(usersData);
      setProfile(profileData);
      if (profileData) {
        setPodSystemEnabled(profileData.podSystemEnabled !== false);
        if (profileData.userLimit) {
          setUserLimit(profileData.userLimit);
        }
      }

      // Default select the first role
      if (rolesData.length > 0) {
        const adminRole = rolesData.find((r: any) => r.name === "ADMIN") || rolesData[0];
        setSelectedRole(adminRole);
        setSelectedPermissions(adminRole.permissions || []);
      }
    } catch (err: any) {
      toast.error("Failed to load roles and permissions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role: CustomRole) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions || []);
  };

  const handlePermissionToggle = (permId: string) => {
    if (selectedRole?.isSystem) return; // Cannot modify core system roles

    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      setSubmitting(true);
      await atsApi.auth.updateRolePermissions(selectedRole.id, selectedPermissions);
      toast.success(`Successfully updated permissions for role "${selectedRole.name}"!`);
      
      // Update local state
      setRoles((prev) =>
        prev.map((r) => (r.id === selectedRole.id ? { ...r, permissions: selectedPermissions } : r))
      );
      setSelectedRole((prev) => (prev ? { ...prev, permissions: selectedPermissions } : null));
    } catch (err: any) {
      toast.error("Failed to save permissions: " + err.message);
    } finally {
      setSubmitting(false);
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
        permissions: ["job:view", "candidate:view"], // Default initial permissions
        systemRole: newRoleSystemRole
      });

      toast.success(`Custom role "${newRole.name}" successfully created!`);
      setRoles((prev) => [...prev, newRole]);
      setSelectedRole(newRole);
      setSelectedPermissions(newRole.permissions);
      
      // Reset form
      setNewRoleName("");
      setNewRoleDesc("");
      setNewRoleSystemRole("RECRUITER");
      setShowAddRole(false);
    } catch (err: any) {
      toast.error("Failed to create role: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Role Delete Modal State
  const [roleToDelete, setRoleToDelete] = useState<{ role: CustomRole; staffCount: number } | null>(null);
  const [targetRoleId, setTargetRoleId] = useState<string>("");

  const handleInitiateDeleteRole = (role: CustomRole) => {
    if (role.isSystem) return;
    const staffCount = users.filter((u) => {
      if (u.roleId === role.id) return true;
      const userRolesUpper = (u.roles && u.roles.length > 0 ? u.roles : [u.roleName || '']).map(r => r.toUpperCase());
      const roleNameUpper = role.name.toUpperCase();
      const sysRoleUpper = (role.replacesSystemRole || role.systemRole || '').toUpperCase();
      return userRolesUpper.includes(roleNameUpper) || (sysRoleUpper !== '' && userRolesUpper.includes(sysRoleUpper));
    }).length;

    const availableTargets = roles.filter(r => r.id !== role.id);
    const defaultTarget = availableTargets.find(r => r.name === "RECRUITER")?.id || availableTargets[0]?.id || "";

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


  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = memberName.trim();
    const trimmedEmail = memberEmail.trim().toLowerCase();
    const password = memberPassword;

    if (!trimmedName || !trimmedEmail || !password) {
      return toast.error("Please fill in all required fields.");
    }

    if (trimmedName.length < 2) {
      return toast.error("Full Name must be at least 2 characters.");
    }

    if (trimmedEmail.length < 2) {
      return toast.error("Work Email prefix must be at least 2 characters.");
    }

    const emailPrefixRegex = /^[a-z0-9._-]+$/;
    if (!emailPrefixRegex.test(trimmedEmail)) {
      return toast.error("Work Email prefix can only contain letters, numbers, dots, hyphens, and underscores.");
    }

    if (password.length < 8) {
      return toast.error("Password must be at least 8 characters.");
    }

    const activeCount = users.filter(u => u.isActive).length;
    if (activeCount >= userLimit) {
      return toast.error(`Seat limit reached! You have used all ${userLimit} licenses. Deactivate a user first or contact support to purchase more seats.`);
    }
    
    try {
      setSubmitting(true);
      const tenantId = profile?.tenantId || currentUser?.tenantId;
      const fullEmail = `${trimmedEmail}@${tenantDomain}.com`;
      
      await atsApi.auth.registerUser({
        email: fullEmail,
        fullName: trimmedName,
        password: password,
        role: memberRole,
        tenantId: tenantId || "",
        isApproved: true, // Auto-approved by tenant admin
      });
      
      toast.success(`Successfully added ${memberName} as ${memberRole}!`);
      
      // Clear form & close modal
      setMemberName("");
      setMemberEmail("");
      setMemberPassword("");
      setMemberRole("RECRUITER");
      setShowAddMember(false);
      
      // Reload data
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignUserRoles = async (userId: string, selectedRoleIds: string[]) => {
    if (selectedRoleIds.length === 0) {
      return toast.error("A user must have at least one role assigned.");
    }
    try {
      setSubmittingId(userId);
      const res = await atsApi.auth.assignUserRoles(userId, selectedRoleIds);
      toast.success(res.message || "User roles assigned successfully.");
      
      // Update local state: find the names of the assigned roles
      const assignedRoleNames = roles
        .filter((r) => selectedRoleIds.includes(r.id))
        .map((r) => r.name);
      
      const primaryRoleId = selectedRoleIds[0];
      const primaryRoleName = assignedRoleNames[0] || "User";

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                roleId: primaryRoleId,
                roleName: primaryRoleName,
                roles: assignedRoleNames,
              }
            : u
        )
      );
    } catch (err: any) {
      toast.error("Failed to assign roles: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleUserStatusToggle = async (userId: string, currentActive: boolean) => {
    // Protect against self-deactivation (Ceipal rule)
    const currentUserId = profile?.id || currentUser?.id;
    if (currentUserId === userId && currentActive) {
      toast.error("You cannot deactivate your own account.");
      return;
    }

    try {
      setSubmittingId(userId);
      const nextActive = !currentActive;
      await atsApi.auth.setUserStatus(userId, nextActive);
      toast.success(`User status updated to ${nextActive ? "Active" : "Inactive"}!`);
      
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: nextActive } : u))
      );
    } catch (err: any) {
      toast.error("Failed to update user status: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleTogglePodSystem = async (checked: boolean) => {
    try {
      setSavingSettings(true);
      await atsApi.auth.updateMySettings({ podSystemEnabled: checked });
      setPodSystemEnabled(checked);
      toast.success(`Recruitment Pod system ${checked ? "enabled" : "disabled (unassigned mode)"} successfully!`);
    } catch (err: any) {
      toast.error("Failed to update pod settings: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Group permissions by category
  const permissionGroups = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    const group = perm.group || "General";
    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {});

  if (loading) {
    return (
      <div>
        <SiteBreadcrumb />
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-sm text-default-500">Loading RBAC configurations...</p>
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
              Only workspace **Administrators** can view and manage roles, access permissions, and staff security levels.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SiteBreadcrumb />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-default-900 flex items-center gap-2">
          <Icon icon="heroicons:shield-check" className="text-indigo-600 h-7 w-7" />
          Roles & Permissions Workspace Settings
        </h1>
        <p className="text-sm text-default-600 mt-1">
          Decouple access privileges to build custom staffing roles. Define Ceipal-compatible security settings for recruiters and BDMs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ==========================================
           LEFT COLUMN: ROLES LIST
           ========================================== */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-default-100 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-default-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Custom Staffing Roles</CardTitle>
                <CardDescription className="text-xs">Define dynamic workspace profiles.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowAddRole(true)} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-750 text-white font-semibold">
                <Icon icon="heroicons:plus" className="h-4 w-4" /> Add Role
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Form to Add Custom Role */}
              {showAddRole && (
                <form onSubmit={handleCreateRole} className="border border-indigo-100 dark:border-slate-800 bg-indigo-50/20 dark:bg-slate-800/10 p-3 rounded-lg space-y-3 mb-2 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-default-700">Role Name</label>
                    <Input
                      placeholder="e.g. BDM, Sourcing Lead"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-default-700">Base Role Template ⚙️</label>
                    <select
                      value={newRoleSystemRole}
                      onChange={(e) => setNewRoleSystemRole(e.target.value)}
                      className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md p-2 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold"
                    >
                      <option value="RECRUITER">Recruiter Template</option>
                      <option value="ACCOUNT_MANAGER">Account Manager Template (BDM)</option>
                      <option value="BRANCH_ADMIN">Branch Admin Template (Branch Head)</option>
                      <option value="ADMIN">Admin Template</option>
                      <option value="DELIVERY_HEAD">Delivery Head Template</option>
                      <option value="POD_LEAD">Pod Lead Template</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-default-700">Description</label>
                    <textarea
                      placeholder="Role functions..."
                      value={newRoleDesc}
                      onChange={(e) => setNewRoleDesc(e.target.value)}
                      className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md p-2 bg-transparent focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" type="button" onClick={() => setShowAddRole(false)}>Cancel</Button>
                    <Button size="sm" type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-750 text-white font-semibold">
                      Create
                    </Button>
                  </div>
                </form>
              )}

              {/* Roles Cards */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {roles.map((role) => {
                  const isSelected = selectedRole?.id === role.id;
                  const staffCount = users.filter((u) => {
                    if (u.roleId === role.id) return true;
                    const userRolesUpper = (u.roles && u.roles.length > 0 ? u.roles : [u.roleName || '']).map(r => r.toUpperCase());
                    const roleNameUpper = role.name.toUpperCase();
                    const sysRoleUpper = (role.replacesSystemRole || role.systemRole || '').toUpperCase();
                    return userRolesUpper.includes(roleNameUpper) || (sysRoleUpper !== '' && userRolesUpper.includes(sysRoleUpper));
                  }).length;
                  return (
                    <div
                      key={role.id}
                      onClick={() => handleRoleSelect(role)}
                      className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20"
                          : "border-default-100 hover:bg-default-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-default-900">{role.name}</span>
                            {role.isSystem ? (
                              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 text-[9px] uppercase tracking-wider font-semibold border-0">
                                System
                              </Badge>
                            ) : role.isExactSubstitution ? (
                              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[9px] font-semibold border border-emerald-200">
                                Substitutes: {role.replacesSystemRole || role.systemRole || "System Role"}
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[9px] font-semibold border border-blue-200">
                                Custom (Base: {role.systemRole || "RECRUITER"})
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-default-500 mt-1 max-w-[280px]">
                            {role.description || "No description provided."}
                          </p>
                        </div>
                        
                        <div className="text-right flex flex-col items-end gap-1.5">
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-slate-800 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                            {staffCount} Staff
                          </span>
                          {!role.isSystem && (
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleInitiateDeleteRole(role);
                              }}
                              className="text-red-500 hover:text-red-700 text-xs p-1 mt-1 transition cursor-pointer"
                              title="Delete custom role"
                            >
                              <Icon icon="heroicons:trash" className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ==========================================
           RIGHT COLUMN: CONFIGURATION PANEL (PERMISSION MATRIX)
           ========================================== */}
        <div className="lg:col-span-3">
          {selectedRole ? (
            <Card className="border border-default-100 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-default-100 bg-default-50/50 dark:bg-slate-800/10 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Icon icon="heroicons:lock-open" className="text-indigo-600 h-5 w-5" />
                    Configure Role: {selectedRole.name}
                  </CardTitle>
                  <p className="text-xs text-default-500 mt-0.5">{selectedRole.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 text-xs font-semibold py-1 px-3 flex items-center gap-1.5">
                    <Icon icon="heroicons:users" className="h-3.5 w-3.5 text-indigo-600" />
                    {users.filter(u => u.roleId === selectedRole.id || (selectedRole.isSystem && u.roleName === selectedRole.name)).length} Staff Assigned
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
                <div className="p-4 space-y-6">
                  {selectedRole.isSystem && (
                    <div className="border border-indigo-100 dark:border-slate-800 bg-indigo-50/20 p-3 rounded-lg text-xs text-indigo-700 flex items-start gap-2">
                      <Icon icon="heroicons:information-circle" className="h-5 w-5 shrink-0 mt-0.5" />
                      <p>
                        <strong>System Role Notice</strong>: This is a default system role. System roles have locked permissions to ensure core SaaS workflows remain stable. To define custom permission layouts, create a new dynamic role using the <strong>Add Role</strong> button.
                      </p>
                    </div>
                  )}

                  <div className="space-y-6 max-h-[540px] overflow-y-auto pr-1">
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                            {groupPerms.map((perm) => {
                              const isChecked = selectedPermissions.includes(perm.id);
                              return (
                                <div
                                  key={perm.id}
                                  onClick={() => handlePermissionToggle(perm.id)}
                                  className={`flex items-start gap-3 p-2.5 rounded-lg border transition ${
                                    selectedRole.isSystem ? "cursor-default" : "cursor-pointer hover:bg-default-50/50"
                                  } ${isChecked ? "bg-emerald-50/10 border-emerald-500/20" : "border-default-100"}`}
                                >
                                  <Checkbox
                                    id={perm.id}
                                    checked={isChecked}
                                    disabled={selectedRole.isSystem}
                                    onCheckedChange={() => handlePermissionToggle(perm.id)}
                                    className="mt-0.5"
                                  />
                                  <div>
                                    <label htmlFor={perm.id} className="text-xs font-semibold text-default-900 cursor-pointer block leading-none">
                                      {perm.name}
                                    </label>
                                    <span className="text-[10px] text-default-400 mt-1 block">Permission Token: `{perm.id}`</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!selectedRole.isSystem && (
                    <div className="border-t border-default-100 pt-4 flex justify-end">
                      <Button
                        disabled={submitting}
                        onClick={handleSavePermissions}
                        className="bg-indigo-600 hover:bg-indigo-750 text-white font-semibold flex items-center gap-1.5"
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
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-[400px] border border-dashed border-default-200 rounded-xl flex items-center justify-center text-default-500 text-sm">
              Select a custom role from the left panel to begin layout configuration.
            </div>
          )}
        </div>
      </div>

      {/* ── Role Delete & Re-assignment Modal ───────────────────────── */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <Icon icon="heroicons:exclamation-triangle" className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Delete Custom Role & Reassign Staff
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
                      .filter((r) => r.id !== roleToDelete.role.id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.isSystem ? '(System Role)' : '(Custom Role)'}
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
                    Reassign & Delete Role
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

