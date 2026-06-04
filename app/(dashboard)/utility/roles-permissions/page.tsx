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
  isActive: boolean;
  createdAt: string;
}

export default function RolesPermissionsPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Core Dynamic RBAC state
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  
  // Selection states
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"permissions" | "users">("permissions");

  // New Custom Role Form State
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

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
      const [rolesData, permsData, usersData] = await Promise.all([
        atsApi.auth.listRoles(),
        atsApi.auth.listAllPermissions(),
        atsApi.auth.listUsers()
      ]);

      setRoles(rolesData);
      setPermissions(permsData);
      setUsers(usersData);

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
        permissions: ["job:view", "candidate:view"] // Default initial permissions
      });

      toast.success(`Custom role "${newRole.name}" successfully created!`);
      setRoles((prev) => [...prev, newRole]);
      setSelectedRole(newRole);
      setSelectedPermissions(newRole.permissions);
      
      // Reset form
      setNewRoleName("");
      setNewRoleDesc("");
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

  const handleAssignUserRole = async (userId: string, roleId: string) => {
    try {
      setSubmittingId(userId);
      const res = await atsApi.auth.assignUserRole(userId, roleId);
      toast.success(res.message || "User role assigned successfully.");
      
      // Update local state
      const assignedRoleName = roles.find((r) => r.id === roleId)?.name || "User";
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, roleId, roleName: assignedRoleName } : u))
      );
    } catch (err: any) {
      toast.error("Failed to assign role: " + err.message);
    } finally {
      setSubmittingId(null);
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
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                {activeSubTab === "permissions" ? (
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
                ) : (
                  /* ========================================================
                     SUB TAB 2: STAFF ROLE ASSIGNMENTS
                     ======================================================== */
                  <div className="p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-default-50 dark:bg-slate-800/50 border-b border-default-100">
                            <th className="py-3 px-4 text-xs font-semibold text-default-700">Staff Member</th>
                            <th className="py-3 px-4 text-xs font-semibold text-default-700">Current Role</th>
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
                                  <Badge className="border border-indigo-100 bg-indigo-50/30 text-indigo-700 capitalize text-[10px] border-0 px-2 py-0.5">
                                    {user.roleName}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="inline-flex items-center gap-2">
                                    <select
                                      value={user.roleId || roles.find(r => r.name === user.roleName)?.id || ""}
                                      onChange={(e) => handleAssignUserRole(user.id, e.target.value)}
                                      disabled={submittingId === user.id}
                                      className="bg-transparent border border-default-250 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-default-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold"
                                    >
                                      <option value="" disabled>Select Role</option>
                                      {roles.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                      ))}
                                    </select>
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
              </CardContent>
            </Card>
          ) : (
            <div className="h-[400px] border border-dashed border-default-200 rounded-xl flex items-center justify-center text-default-500 text-sm">
              Select a custom role from the left panel to begin layout configuration.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
