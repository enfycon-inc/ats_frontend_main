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
    // Allow SUPER_ADMIN or tenant ADMIN to access this panel
    const hasAccess = user?.roles?.includes("ADMIN") || user?.roles?.includes("SUPER_ADMIN") || user?.permissions?.includes("user:manage");
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
      const [rolesData, permsData, usersData, profileData] = await Promise.all([
        atsApi.auth.listRoles(),
        atsApi.auth.listAllPermissions(),
        atsApi.auth.listUsers(),
        atsApi.auth.me()
      ]);

      setRoles(rolesData);
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

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this custom role? Users holding this role will be reverted to 'RECRUITER'.")) return;
    try {
      setSubmitting(true);
      await atsApi.auth.deleteCustomRole(roleId);
      toast.success("Role deleted successfully.");
      
      // Reload everything to sync users
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
                      <option value="ADMIN">Admin Template</option>
                      <option value="DELIVERY_HEAD">Delivery Head Template</option>
                      <option value="TRACKER">Tracker Template</option>
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
                  const staffCount = users.filter((u) => u.roleId === role.id || (role.isSystem && u.roleName === role.name)).length;
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
                            {role.isSystem && (
                              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 text-[9px] uppercase tracking-wider font-semibold border-0">
                                System
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
                                  handleDeleteRole(role.id);
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
           RIGHT COLUMN: CONFIGURATION PANEL
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

                {/* Sub Tab switcher */}
                <div className="flex bg-default-100 dark:bg-slate-800 p-0.5 rounded-lg border border-default-250 w-fit">
                  <button
                    onClick={() => setActiveSubTab("permissions")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      activeSubTab === "permissions"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-default-500 hover:text-default-800"
                    }`}
                  >
                    <Icon icon="heroicons:adjustments-horizontal" className="h-3.5 w-3.5" />
                    Permission Matrix
                  </button>
                  <button
                    onClick={() => setActiveSubTab("users")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      activeSubTab === "users"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-default-500 hover:text-default-800"
                    }`}
                  >
                    <Icon icon="heroicons:users" className="h-3.5 w-3.5" />
                    Assign Staff ({users.filter(u => u.roleId === selectedRole.id || (selectedRole.isSystem && u.roleName === selectedRole.name)).length})
                  </button>
                  {selectedRole?.name === "ADMIN" && (
                    <button
                      onClick={() => setActiveSubTab("settings")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                        activeSubTab === "settings"
                          ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-default-500 hover:text-default-800"
                      }`}
                    >
                      <Icon icon="heroicons:cog-6-tooth" className="h-3.5 w-3.5" />
                      Workspace Settings
                    </button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                {activeSubTab === "permissions" && (
                  /* ========================================================
                     SUB TAB 1: PERMISSION MATRIX GRID
                     ======================================================== */
                  <div className="p-4 space-y-6">
                    {selectedRole.isSystem && (
                      <div className="border border-indigo-100 dark:border-slate-800 bg-indigo-50/20 p-3 rounded-lg text-xs text-indigo-700 flex items-start gap-2">
                        <Icon icon="heroicons:information-circle" className="h-5 w-5 shrink-0 mt-0.5" />
                        <p>
                          **System Role Notice**: This is a default system role. System roles have locked permissions to ensure core SaaS workflows remain stable. To define custom permission layouts, create a new dynamic role using the **Add Role** button.
                        </p>
                      </div>
                    )}

                    <div className="space-y-6 max-h-[480px] overflow-y-auto pr-1">
                      {Object.entries(permissionGroups).map(([groupName, groupPerms]) => (
                        <div key={groupName} className="space-y-2 border-b border-default-100 pb-4 last:border-b-0 last:pb-0">
                          <h3 className="text-xs font-bold text-default-800 uppercase tracking-wider">{groupName}</h3>
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
                      ))}
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
                )}

                {activeSubTab === "users" && (
                  /* ========================================================
                     SUB TAB 2: STAFF ROLE ASSIGNMENTS
                     ======================================================== */
                  <div className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border border-default-100 bg-slate-50 dark:bg-slate-800/20 p-3.5 rounded-xl">
                      <div>
                        <h3 className="text-sm font-semibold text-default-900">Manage Tenant Staff</h3>
                        <p className="text-xs text-default-500 mt-0.5">
                          Configure user access credentials and assign custom roles.
                        </p>
                      </div>
                      
                      {/* License Usage indicator */}
                      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-default-200 px-3.5 py-2 rounded-lg shadow-xs">
                        <div className="flex items-center gap-2">
                          <Icon icon="heroicons:key" className="text-indigo-600 h-5 w-5" />
                          <div>
                            <div className="text-[10px] text-default-500 font-bold uppercase tracking-wider">Seats/Licenses</div>
                            <div className="text-sm font-bold text-default-900">
                              {users.filter(u => u.isActive).length} / {userLimit} Active
                            </div>
                          </div>
                        </div>
                        <div className="h-8 w-[1px] bg-default-200" />
                        <div>
                          <div className="text-[10px] text-default-500 font-bold uppercase tracking-wider">Remaining</div>
                          <div className="text-sm font-bold text-emerald-600">
                            {Math.max(0, userLimit - users.filter(u => u.isActive).length)} Available
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          const activeCount = users.filter(u => u.isActive).length;
                          if (activeCount >= userLimit) {
                            toast.error(`Seat limit reached! You have used all ${userLimit} licenses. Deactivate a user first or contact support to purchase more seats.`);
                            return;
                          }
                          setShowAddMember(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-750 text-white font-semibold flex items-center gap-1 shrink-0"
                      >
                        <Icon icon="heroicons:user-plus" className="h-4 w-4" /> Add Member
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-default-50 dark:bg-slate-800/50 border-b border-default-100">
                            <th className="py-3 px-4 text-xs font-semibold text-default-700">Staff Member</th>
                            <th className="py-3 px-4 text-xs font-semibold text-default-700">Current Role</th>
                            <th className="py-3 px-4 text-xs font-semibold text-default-700">Status</th>
                            <th className="py-3 px-4 text-xs font-semibold text-default-700 text-right">Assign Custom Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-default-100">
                          {users.map((user) => {
                            return (
                              <tr key={user.id} className="hover:bg-default-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                <td className="py-3 px-4">
                                  <div>
                                    <div className="font-semibold text-default-900 text-xs">{user.fullName}</div>
                                    <div className="text-[10px] text-default-500">{user.email}</div>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-wrap gap-1">
                                    {(user.roles && user.roles.length > 0 ? user.roles : [user.roleName]).map((roleName) => (
                                      <Badge 
                                        key={roleName} 
                                        className="border border-indigo-100 bg-indigo-50/30 text-indigo-700 capitalize text-[10px] border-0 px-2 py-0.5"
                                      >
                                        {roleName}
                                      </Badge>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={user.isActive}
                                      onCheckedChange={() => handleUserStatusToggle(user.id, user.isActive)}
                                      disabled={submittingId === user.id}
                                    />
                                    <span className={`text-[11px] font-semibold ${user.isActive ? 'text-emerald-600' : 'text-default-450'}`}>
                                      {user.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="inline-flex items-center gap-2 justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setAssigningUser(user);
                                        const currentRoleIds = roles
                                          .filter((r) => user.roles ? user.roles.includes(r.name) : (user.roleName === r.name || user.roleId === r.id))
                                          .map((r) => r.id);
                                        setModalRoleIds(currentRoleIds);
                                      }}
                                      disabled={submittingId === user.id}
                                      className="text-xs font-semibold cursor-pointer border-indigo-100 text-indigo-600 hover:bg-indigo-50/50"
                                    >
                                      <Icon icon="heroicons:pencil-square" className="h-3.5 w-3.5 mr-1" />
                                      Manage Roles
                                    </Button>
                                    {submittingId === user.id && (
                                      <div className="h-4.5 w-4.5 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full shrink-0"></div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeSubTab === "settings" && (
                  /* ========================================================
                     SUB TAB 3: WORKSPACE CONFIGURATIONS
                     ======================================================== */
                  <div className="p-6 space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-default-900">Tenant Workspace Configurations</h3>
                      <p className="text-xs text-default-500">
                        Manage global operational preferences for this tenant workspace.
                      </p>
                    </div>

                    <div className="flex items-start justify-between gap-4 p-4 border border-indigo-100 bg-indigo-50/20 dark:border-slate-800/80 rounded-xl">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-850 dark:text-neutral-200 block">
                          Enable Recruitment Pod System
                        </label>
                        <span className="text-[10.5px] text-neutral-500 block leading-relaxed max-w-lg">
                          When <strong>Enabled</strong>, all new job requirements must map to a pod, and unassigned jobs route automatically via round-robin. 
                          When <strong>Disabled</strong>, job postings remain unassigned by default (shared recruiter pool). Only Delivery Heads or Administrators can override and assign them.
                        </span>
                      </div>
                      <div className="flex items-center shrink-0 pt-1">
                        <input
                          type="checkbox"
                          checked={podSystemEnabled}
                          disabled={savingSettings}
                          onChange={(e) => handleTogglePodSystem(e.target.checked)}
                          className="h-4 w-4 rounded border-neutral-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-600/20 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-[400px] border border-dashed border-default-200 rounded-xl flex items-center justify-center text-default-500 text-sm">
              Select a custom role from the left panel to begin layout configuration.
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
         ADD MEMBER MODAL (Ceipal style)
         ========================================== */}
      {showAddMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <Card className="w-full max-w-md border border-default-100 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-default-100 p-4">
              <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                <Icon icon="heroicons:user-plus" className="text-indigo-600 h-5 w-5" />
                Add New Staff Member
              </CardTitle>
              <CardDescription className="text-xs">
                Create a new user account under your company workspace.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateMember} autoComplete="off">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-default-700">Full Name</label>
                  <Input
                    placeholder="e.g. John Doe"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-default-700">Work Email</label>
                  <div className="flex items-center border border-default-250 dark:border-slate-700 rounded-md overflow-hidden bg-transparent">
                    <Input
                      type="text"
                      placeholder="e.g. john"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                      required
                      className="border-0 shadow-none focus-visible:ring-0 focus-visible:border-0 focus-visible:ring-offset-0 bg-transparent text-default-850 w-full"
                      autoComplete="new-username"
                    />
                    <span className="text-xs font-semibold text-default-500 bg-default-100 dark:bg-slate-800 px-3 py-2 border-l border-default-200 whitespace-nowrap">
                      @{tenantDomain}.com
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-default-700">Login Password</label>
                  <Input
                    type="password"
                    placeholder="Min. 8 characters"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-default-700">Workspace Role</label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    className="w-full text-sm border border-default-250 dark:border-slate-700 rounded-md p-2 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
              <div className="border-t border-default-100 p-4 bg-default-50/50 dark:bg-slate-800/10 flex justify-end gap-2">
                <Button size="sm" variant="outline" type="button" onClick={() => {
                  setMemberName("");
                  setMemberEmail("");
                  setMemberPassword("");
                  setMemberRole("RECRUITER");
                  setShowAddMember(false);
                }}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-750 text-white font-semibold">
                  {submitting ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {assigningUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <Card className="w-full max-w-md border border-default-100 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-default-100 p-4">
              <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                <Icon icon="heroicons:shield-check" className="text-indigo-600 h-5 w-5" />
                Assign Roles: {assigningUser.fullName}
              </CardTitle>
              <CardDescription className="text-xs">
                Select one or more roles to assign to this staff member.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 max-h-60 overflow-y-auto">
              {roles.map((role) => {
                const isAssigned = modalRoleIds.includes(role.id);
                return (
                  <label
                    key={role.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-default-100 hover:bg-default-50/50 cursor-pointer select-none transition"
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={() => {
                        if (isAssigned) {
                          setModalRoleIds(prev => prev.filter(id => id !== role.id));
                        } else {
                          setModalRoleIds(prev => [...prev, role.id]);
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-semibold text-default-900">{role.name}</div>
                      {role.description && <div className="text-[10px] text-default-500">{role.description}</div>}
                    </div>
                  </label>
                );
              })}
            </CardContent>
            <div className="border-t border-default-100 p-4 bg-default-50/50 dark:bg-slate-800/10 flex justify-end gap-2">
              <Button size="sm" variant="outline" type="button" onClick={() => setAssigningUser(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (modalRoleIds.length === 0) {
                    toast.error("A user must have at least one role assigned.");
                    return;
                  }
                  await handleAssignUserRoles(assigningUser.id, modalRoleIds);
                  setAssigningUser(null);
                }}
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-750 text-white font-semibold"
              >
                Apply Roles
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
