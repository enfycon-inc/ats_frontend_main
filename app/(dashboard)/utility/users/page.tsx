"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, UserPlus, Search, Edit2, Key, Shield, Building2, MapPin, 
  CheckCircle2, XCircle, RefreshCw, Mail, Lock, Sparkles, Filter, ShieldAlert, X, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";
import { getTenantIdentifier } from "@/utils/subdomain-helper";

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  roleId: string | null;
  roleName: string;
  roles?: string[];
  branchId: string | null;
  branchName: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function UserManagementPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Add Member Form
  const [addForm, setAddForm] = useState({
    fullName: "",
    emailPrefix: "",
    password: "",
    role: "RECRUITER",
    branchId: "",
    sendEmailInvite: false,
  });

  // Edit Member Form
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    branchId: "",
    roles: ["RECRUITER"],
  });

  // Password Reset Form
  const [newPassword, setNewPassword] = useState("");

  const currentUser = typeof window !== 'undefined' ? atsApi.auth.getCurrentUser() : null;

  const getDomainSuffix = () => {
    const userEmail = profile?.email || currentUser?.email;
    if (userEmail?.toLowerCase().endsWith("@csm.com")) return "csm";
    const currentSub = typeof window !== 'undefined' ? getTenantIdentifier() : "";
    const rawDomain = currentSub || profile?.tenantDomain || currentUser?.tenantDomain || "enfycon";
    return rawDomain.toLowerCase().endsWith(".com") ? rawDomain.slice(0, -4) : rawDomain;
  };
  const tenantDomain = getDomainSuffix();
  const userLimit = profile?.userLimit || 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, branchesData, rolesData, profileData] = await Promise.all([
        atsApi.auth.listUsers().catch(() => []),
        atsApi.branches.list().catch(() => []),
        atsApi.auth.listRoles().catch(() => []),
        atsApi.auth.me().catch(() => null),
      ]);
      setUsers(usersData || []);
      setBranches(branchesData || []);
      setRolesList(rolesData || []);
      setProfile(profileData);
      if (branchesData && branchesData.length > 0) {
        setAddForm((prev) => ({ ...prev, branchId: prev.branchId || branchesData[0].id }));
      }
    } catch (err: any) {
      toast.error("Failed to load user roster: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = addForm.fullName.trim();
    const trimmedPrefix = addForm.emailPrefix.trim().toLowerCase();
    const password = addForm.password;

    if (!trimmedName || !trimmedPrefix || !password) {
      return toast.error("Please fill in all required fields.");
    }
    if (trimmedName.length < 2) {
      return toast.error("Full Name must be at least 2 characters.");
    }
    if (password.length < 8) {
      return toast.error("Password must be at least 8 characters.");
    }

    const activeCount = users.filter(u => u.isActive).length;
    if (activeCount >= userLimit) {
      return toast.error(`Seat limit reached! (${userLimit} active licenses). Deactivate an inactive user first or upgrade plan.`);
    }

    try {
      setSubmitting(true);
      const fullEmail = `${trimmedPrefix}@${tenantDomain}.com`;
      const tenantId = profile?.tenantId || currentUser?.tenantId || "";

      await atsApi.auth.registerUser({
        email: fullEmail,
        fullName: trimmedName,
        password: password,
        role: addForm.role,
        tenantId: tenantId,
        isApproved: true,
      });

      // If branch selected, assign branch
      if (addForm.branchId) {
        const freshUsers = await atsApi.auth.listUsers();
        const createdUser = freshUsers.find((u: any) => u.email === fullEmail);
        if (createdUser) {
          await atsApi.auth.updateUserDetail(createdUser.id, { branchId: addForm.branchId });
        }
      }

      toast.success(`Successfully added ${trimmedName} (${fullEmail})!`);
      setIsAddModalOpen(false);
      setAddForm({
        fullName: "",
        emailPrefix: "",
        password: "",
        role: "RECRUITER",
        branchId: "",
        sendEmailInvite: false,
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create team member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      await atsApi.auth.updateUserDetail(selectedUser.id, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim().toLowerCase(),
        branchId: editForm.branchId || undefined,
        roles: editForm.roles,
      });

      toast.success("User details updated successfully!");
      setIsEditModalOpen(false);
      setSelectedUser(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user details.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword.length < 8) {
      return toast.error("Password must be at least 8 characters.");
    }

    try {
      setSubmitting(true);
      await atsApi.auth.updateUserDetail(selectedUser.id, {
        password: newPassword,
      });

      toast.success(`Password updated for ${selectedUser.fullName}!`);
      setIsPasswordModalOpen(false);
      setSelectedUser(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (user: UserItem) => {
    if (profile?.id === user.id && user.isActive) {
      return toast.error("You cannot deactivate your own account.");
    }
    try {
      setSubmittingId(user.id);
      const nextState = !user.isActive;
      await atsApi.auth.setUserStatus(user.id, nextState);
      toast.success(`User ${user.fullName} is now ${nextState ? "Active" : "Inactive"}.`);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: nextState } : u));
    } catch (err: any) {
      toast.error(err.message || "Failed to update user status.");
    } finally {
      setSubmittingId(null);
    }
  };

  const openEditModal = (user: UserItem) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName || "",
      email: user.email || "",
      branchId: user.branchId || "",
      roles: user.roles && user.roles.length > 0 ? user.roles : [user.roleName || "RECRUITER"],
    });
    setIsEditModalOpen(true);
  };

  const openPasswordModal = (user: UserItem) => {
    setSelectedUser(user);
    setNewPassword("");
    setIsPasswordModalOpen(true);
  };

  // Filtering
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (u.fullName || "").toLowerCase().includes(query) ||
      (u.email || "").toLowerCase().includes(query) ||
      (u.roleName || "").toLowerCase().includes(query) ||
      (u.branchName || "").toLowerCase().includes(query);

    const matchesRole =
      roleFilter === "ALL" ||
      (u.roles ? u.roles.includes(roleFilter) : u.roleName === roleFilter);

    const matchesBranch =
      branchFilter === "ALL" ||
      (branchFilter === "UNASSIGNED" ? !u.branchId : u.branchId === branchFilter || u.branchName === branchFilter);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? u.isActive : !u.isActive);

    return matchesSearch && matchesRole && matchesBranch && matchesStatus;
  });

  const activeSeats = users.filter((u) => u.isActive).length;
  const isFiltered = searchQuery !== "" || roleFilter !== "ALL" || branchFilter !== "ALL" || statusFilter !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("ALL");
    setBranchFilter("ALL");
    setStatusFilter("ALL");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      
      {/* STANDARD PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-default-200">
        <div>
          <h1 className="text-xl font-bold text-default-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" /> User & Team Roster
          </h1>
          <p className="text-xs text-default-500 mt-1">
            Manage employee profiles, branch office assignments, and seat licensing for <span className="font-semibold text-default-800">{profile?.tenant?.name || "your company workspace"}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg border border-default-200 bg-default-50 text-xs">
            <span className="text-default-500 font-medium">License Usage: </span>
            <span className="font-bold text-indigo-600">{activeSeats}</span>
            <span className="text-default-600 font-semibold"> / {userLimit} Seats</span>
          </div>

          <Button
            onClick={() => {
              if (activeSeats >= userLimit) {
                toast.error(`Seat limit reached! (${userLimit} active licenses). Deactivate a user first or upgrade plan.`);
                return;
              }
              setIsAddModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="h-4 w-4" /> Add Team Member
          </Button>
        </div>
      </div>

      {/* STANDARD FILTER & SEARCH TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 border border-default-200 dark:border-slate-800 rounded-lg p-3 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* SEARCH INPUT */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team members by name, email, or role..."
              className="pl-9 h-9 text-xs bg-white dark:bg-slate-800 rounded-md border-default-200 dark:border-slate-700"
            />
          </div>

          {/* DROPDOWN FILTERS */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* ROLE FILTER */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 text-xs rounded-md border border-default-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 font-medium text-default-700 dark:text-neutral-200 outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Tenant Admin</option>
              <option value="BRANCH_ADMIN">Branch Admin</option>
              <option value="RECRUITER">Recruiter</option>
              <option value="ACCOUNT_MANAGER">Account Manager (BDM)</option>
              <option value="POD_LEAD">Pod Lead</option>
              <option value="DELIVERY_HEAD">Delivery Head</option>
            </select>

            {/* BRANCH FILTER */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-9 text-xs rounded-md border border-default-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 font-medium text-default-700 dark:text-neutral-200 outline-none"
            >
              <option value="ALL">All Branch Offices</option>
              <option value="UNASSIGNED">Unassigned (HQ Shared)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.market === "US" ? "US IT" : "Domestic"})
                </option>
              ))}
            </select>

            {/* STATUS FILTER */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs rounded-md border border-default-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 font-medium text-default-700 dark:text-neutral-200 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 font-medium"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* STANDARD DATA TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-default-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-xs text-default-500 mt-2 font-medium">Loading user roster...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="h-10 w-10 rounded-full bg-default-100 dark:bg-slate-800 text-default-400 flex items-center justify-center mx-auto">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-default-800">No team members match your current filter settings.</p>
              <p className="text-xs text-default-400 mt-0.5">
                {branchFilter !== "ALL"
                  ? "No recruiters are currently assigned to this specific branch office location."
                  : "Try adjusting your search keywords or active filters."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              {isFiltered && (
                <Button size="sm" variant="outline" onClick={clearFilters} className="text-xs h-8">
                  Reset All Filters
                </Button>
              )}
              {branchFilter !== "ALL" && (
                <a href="/utility/branches">
                  <Button size="sm" className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                    Assign Staff to Branch →
                  </Button>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-default-50 dark:bg-slate-800/60 border-b border-default-200 dark:border-slate-800 text-[11px] font-semibold text-default-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Work Email</th>
                  <th className="py-3 px-4">Assigned Role(s)</th>
                  <th className="py-3 px-4">Branch Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100 dark:divide-slate-800 text-xs">
                {filteredUsers.map((user) => {
                  const isCurrent = profile?.id === user.id;
                  const rolesDisplay = user.roles && user.roles.length > 0 ? user.roles : [user.roleName || "RECRUITER"];

                  return (
                    <tr key={user.id} className="hover:bg-default-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Name */}
                      <td className="py-3 px-4 font-semibold text-default-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
                            {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{user.fullName}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 font-mono text-default-700 dark:text-neutral-300">
                        {user.email}
                      </td>

                      {/* Roles */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {rolesDisplay.map((r) => (
                            <span
                              key={r}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-default-100 text-default-700 dark:bg-slate-800 dark:text-neutral-300 border border-default-200 dark:border-slate-700"
                            >
                              {r === "BRANCH_ADMIN" ? "Branch Admin" : r.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Branch Location — Interactive 1-Click Assignment */}
                      <td className="py-3 px-4">
                        <select
                          value={user.branchId || ""}
                          onChange={async (e) => {
                            const newBranchId = e.target.value;
                            try {
                              setSubmittingId(user.id);
                              await atsApi.auth.updateUserDetail(user.id, {
                                branchId: newBranchId || undefined,
                              });
                              toast.success(`Updated branch for ${user.fullName}`);
                              setUsers((prev) =>
                                prev.map((item) =>
                                  item.id === user.id
                                    ? {
                                        ...item,
                                        branchId: newBranchId || null,
                                        branchName:
                                          branches.find((b) => b.id === newBranchId)?.name || null,
                                      }
                                    : item
                                )
                              );
                            } catch (err: any) {
                              toast.error(err.message || "Failed to update branch");
                            } finally {
                              setSubmittingId(null);
                            }
                          }}
                          className="h-8 text-xs font-medium rounded-md border border-default-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-default-800 dark:text-neutral-200 outline-none hover:border-indigo-500 cursor-pointer transition-colors"
                        >
                          <option value="">-- Unassigned (HQ Shared) --</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.market === "US" ? "US IT" : "Domestic"})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={() => handleStatusToggle(user)}
                            disabled={submittingId === user.id || isCurrent}
                          />
                          <span className={`text-[11px] font-semibold ${user.isActive ? "text-emerald-600" : "text-default-400"}`}>
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(user)}
                            className="h-7 px-2.5 text-[11px] font-medium border-default-200 hover:border-indigo-500 hover:text-indigo-600 rounded-md"
                            title="Edit Member / Fix Email Typo"
                          >
                            <Edit2 className="h-3 w-3 mr-1" /> Edit Profile
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPasswordModal(user)}
                            className="h-7 px-2.5 text-[11px] font-medium border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100 rounded-md"
                            title="Reset User Password"
                          >
                            <Key className="h-3 w-3 mr-1" /> Password
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD MEMBER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-indigo-650" /> Add Team Member
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Full Name *</label>
                <Input
                  value={addForm.fullName}
                  onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                  placeholder="e.g. Rajesh Kumar"
                  className="h-8 text-xs rounded border-neutral-300"
                  required
                />
              </div>

              {/* DOMAIN SUFFIX AUTO-LOCKING */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Work Email Username *</label>
                <div className="flex items-center">
                  <Input
                    value={addForm.emailPrefix}
                    onChange={(e) => setAddForm({ ...addForm, emailPrefix: e.target.value })}
                    placeholder="e.g. rajesh"
                    className="h-8 text-xs rounded-l border-neutral-300 font-mono"
                    required
                  />
                  <span className="h-8 px-3 text-xs font-mono font-bold bg-neutral-100 dark:bg-slate-800 border border-l-0 border-neutral-300 dark:border-slate-700 rounded-r text-indigo-650 flex items-center">
                    @{tenantDomain}.com
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400">Locked to your company's verified domain suffix.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Initial Password *</label>
                <Input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="At least 8 characters"
                  className="h-8 text-xs rounded border-neutral-300 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Assign Role *</label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full h-8 text-xs rounded border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 font-semibold"
                  >
                    <option value="RECRUITER">Recruiter</option>
                    <option value="POD_LEAD">Pod Lead</option>
                    <option value="ACCOUNT_MANAGER">Account Manager (BDM)</option>
                    <option value="BRANCH_ADMIN">Branch Admin</option>
                    <option value="DELIVERY_HEAD">Delivery Head</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Office Branch *</label>
                  <select
                    value={addForm.branchId}
                    onChange={(e) => setAddForm({ ...addForm, branchId: e.target.value })}
                    className="w-full h-8 text-xs rounded border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 font-semibold"
                    required
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.market === 'US' ? 'US IT' : 'Domestic'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} size="sm" className="h-8 text-xs bg-indigo-650 hover:bg-indigo-700 text-white font-bold">
                  {submitting ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL (FIX EMAIL TYPOS / BRANCH) */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-indigo-650" /> Edit Member Details
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Full Name *</label>
                <Input
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="h-8 text-xs rounded border-neutral-300"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Work Email Address (Fix Typo) *</label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="h-8 text-xs rounded border-neutral-300 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Office Branch Location</label>
                <select
                  value={editForm.branchId}
                  onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                  className="w-full h-8 text-xs rounded border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 font-semibold"
                >
                  <option value="">Unassigned (HQ Shared)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.market === 'US' ? 'US IT' : 'Domestic'})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} size="sm" className="h-8 text-xs bg-indigo-650 hover:bg-indigo-700 text-white font-bold">
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-500" /> Reset Password
              </h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <p className="text-xs text-neutral-500">
                Enter a new password for <span className="font-bold text-neutral-800 dark:text-white">{selectedUser.fullName}</span>:
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">New Password *</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="h-8 text-xs rounded border-neutral-300 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsPasswordModalOpen(false)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} size="sm" className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold">
                  {submitting ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
