"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, UserPlus, Search, Edit2, Key, Shield, Building2, MapPin, 
  CheckCircle2, XCircle, RefreshCw, Mail, Lock, Sparkles, Filter, ShieldAlert, X, ChevronRight, Loader2,
  MoreVertical, Trash2, UserCheck, UserX
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  assignedBranchIds?: string[];
  branchRoles?: Record<string, string[]>;
  branchName: string | null;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export default function UserManagementPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

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

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Multi-select bulk action state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkRoleModalOpen, setIsBulkRoleModalOpen] = useState(false);
  const [bulkSelectedRoleIds, setBulkSelectedRoleIds] = useState<string[]>([]);
  const [isBulkMoveBranchModalOpen, setIsBulkMoveBranchModalOpen] = useState(false);
  const [targetMoveBranchId, setTargetMoveBranchId] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [branchRoleModalState, setBranchRoleModalState] = useState<{ branchId: string; branchName: string; isAddForm?: boolean } | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Add Member Form
  const [addForm, setAddForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    roles: ["RECRUITER"],
    branchId: "",
    assignedBranchIds: [] as string[],
    branchRoles: {} as Record<string, string[]>,
    sendEmailInvite: false,
  });

  // Debounced Email availability state
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [emailCheckMsg, setEmailCheckMsg] = useState("");

  useEffect(() => {
    const rawEmail = (addForm?.email || "").trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes("@")) {
      setEmailStatus("idle");
      setEmailCheckMsg("");
      return;
    }

    setEmailStatus("checking");
    const timer = setTimeout(() => {
      const isTaken = users.some((u) => (u.email || "").toLowerCase() === rawEmail);

      if (isTaken) {
        setEmailStatus("taken");
        setEmailCheckMsg(`Email ${rawEmail} is already registered.`);
      } else {
        setEmailStatus("available");
        setEmailCheckMsg(`Email ${rawEmail} is available!`);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [addForm.email, users]);

  // Role checkbox toggle function — independent selection for every system and custom role
  const handleRoleToggle = (currentRoles: string[], targetRole: string, isChecking: boolean) => {
    const upperTarget = targetRole.toUpperCase();
    let updated = currentRoles.filter(r => r.toUpperCase() !== upperTarget);
    if (isChecking) {
      updated.push(targetRole);
    }
    return updated;
  };

  // Edit Member Form
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    branchId: "",
    assignedBranchIds: [] as string[],
    branchRoles: {} as Record<string, string[]>,
    roles: ["RECRUITER"],
  });

  // Password Reset Form
  const [newPassword, setNewPassword] = useState("");



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
      toast.error("Failed to load users: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstName = (addForm.firstName || "").trim();
    const lastName = (addForm.lastName || "").trim();
    const trimmedName = `${firstName} ${lastName}`.trim();
    const fullEmail = (addForm.email || "").trim().toLowerCase();
    const password = addForm.password || "";

    if (!firstName || !lastName || !fullEmail || !password) {
      return toast.error("Please fill in First Name, Last Name, Email, and Password.");
    }
    if (!fullEmail.includes("@") || !fullEmail.includes(".")) {
      return toast.error("Please enter a valid email address.");
    }
    if (trimmedName.length < 2) {
      return toast.error("Name must be at least 2 characters.");
    }
    if (password.length < 8) {
      return toast.error("Password must be at least 8 characters.");
    }
    if (password !== addForm.confirmPassword) {
      return toast.error("Passwords do not match. Please verify confirmation password.");
    }

    const activeCount = users.filter(u => u.isActive).length;
    if (activeCount >= userLimit) {
      return toast.error(`Seat limit reached! (${userLimit} active licenses). Deactivate an inactive user first or upgrade plan.`);
    }

    try {
      setSubmitting(true);
      const tenantId = profile?.tenantId || currentUser?.tenantId || "";

      await atsApi.auth.registerUser({
        email: fullEmail,
        fullName: trimmedName,
        password: password,
        role: addForm.roles?.[0] || "RECRUITER",
        tenantId: tenantId,
        isApproved: true,
        sendEmailInvite: true,
      });

      // Update full roles and branch location after creation
      const freshUsers = await atsApi.auth.listUsers();
      const createdUser = freshUsers.find((u: any) => u.email === fullEmail);
      if (createdUser) {
        const allBranchRoleValues = Object.values(addForm.branchRoles || {}).flat();
        const combinedRoles = Array.from(new Set([...allBranchRoleValues, ...(addForm.roles || [])]));
        const finalRoles = combinedRoles.length > 0 ? combinedRoles : (addForm.roles || ["RECRUITER"]);

        await atsApi.auth.updateUserDetail(createdUser.id, {
          branchId: addForm.branchId || undefined,
          assignedBranchIds: addForm.assignedBranchIds || [],
          branchRoles: addForm.branchRoles || {},
          roles: finalRoles,
        });
      }

      toast.success(`Successfully added ${trimmedName} (${fullEmail})!`);
      setIsAddModalOpen(false);
      setAddForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        roles: ["RECRUITER"],
        branchId: "",
        assignedBranchIds: [],
        branchRoles: {},
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
    const firstName = (editForm.firstName || "").trim();
    const lastName = (editForm.lastName || "").trim();
    const trimmedName = `${firstName} ${lastName}`.trim();
    const editEmail = (editForm.email || "").trim().toLowerCase();

    if (!firstName || !lastName || !editEmail) {
      return toast.error("First Name, Last Name, and Work Email are required.");
    }

    try {
      setSubmitting(true);
      const assignedBranchIds = editForm.assignedBranchIds || [];
      const cleanBranchRoles: Record<string, string[]> = {};
      assignedBranchIds.forEach((bId) => {
        if (editForm.branchRoles?.[bId]) {
          cleanBranchRoles[bId] = editForm.branchRoles[bId];
        }
      });
      const finalRoles = Array.isArray(editForm.roles) && editForm.roles.length > 0 ? editForm.roles : ["RECRUITER"];

      await atsApi.auth.updateUserDetail(selectedUser.id, {
        fullName: trimmedName,
        email: editEmail,
        branchId: editForm.branchId || undefined,
        assignedBranchIds: assignedBranchIds,
        branchRoles: cleanBranchRoles,
        roles: finalRoles,
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

  const handleDeleteUser = async (user: UserItem) => {
    if (profile?.id === user.id) {
      return toast.error("You cannot delete your own account.");
    }
    const confirmDelete = window.confirm(
      `Are you sure you want to deactivate and remove ${user.fullName} (${user.email}) from active team access?`
    );
    if (!confirmDelete) return;

    try {
      setSubmittingId(user.id);
      await atsApi.auth.setUserStatus(user.id, false);
      toast.success(`User ${user.fullName} deactivated successfully.`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate user.");
    } finally {
      setSubmittingId(null);
    }
  };

  // Bulk Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectRow = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleBulkStatusChange = async (targetActiveState: boolean) => {
    if (selectedUserIds.length === 0) return;
    try {
      setLoading(true);
      await Promise.all(
        selectedUserIds.map((id) => {
          if (profile?.id === id && !targetActiveState) return Promise.resolve();
          return atsApi.auth.setUserStatus(id, targetActiveState).catch(() => null);
        })
      );
      toast.success(
        `Successfully ${targetActiveState ? "activated" : "deactivated"} ${selectedUserIds.length} user(s)!`
      );
      setSelectedUserIds([]);
      loadData();
    } catch (err: any) {
      toast.error("Failed bulk status update.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMoveBranch = async (targetBranchId: string) => {
    if (selectedUserIds.length === 0 || !targetBranchId) return;
    try {
      setLoading(true);
      const branchObj = branches.find((b) => b.id === targetBranchId);
      await Promise.all(
        selectedUserIds.map((id) =>
          atsApi.auth.updateUserDetail(id, { branchId: targetBranchId }).catch(() => null)
        )
      );
      toast.success(
        `Moved ${selectedUserIds.length} user(s) to ${branchObj?.name || "selected branch"}!`
      );
      setSelectedUserIds([]);
      loadData();
    } catch (err: any) {
      toast.error("Failed bulk branch relocation.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to de-register and deactivate ${selectedUserIds.length} selected team member(s)?`
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      await Promise.all(
        selectedUserIds.map((id) => {
          if (profile?.id === id) return Promise.resolve();
          return atsApi.auth.setUserStatus(id, false).catch(() => null);
        })
      );
      toast.success(`Successfully deactivated ${selectedUserIds.length} user(s)!`);
      setSelectedUserIds([]);
      loadData();
    } catch (err: any) {
      toast.error("Failed bulk deletion.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssignRoles = async () => {
    if (selectedUserIds.length === 0) return;
    if (bulkSelectedRoleIds.length === 0) {
      return toast.error("Please select at least one system role to assign.");
    }
    try {
      setLoading(true);
      await Promise.all(
        selectedUserIds.map((id) =>
          atsApi.auth.updateUserDetail(id, { roles: bulkSelectedRoleIds }).catch(() => null)
        )
      );
      toast.success(
        `Successfully assigned ${bulkSelectedRoleIds.length} role(s) to ${selectedUserIds.length} selected user(s)!`
      );
      setIsBulkRoleModalOpen(false);
      setBulkSelectedRoleIds([]);
      setSelectedUserIds([]);
      loadData();
    } catch (err: any) {
      toast.error("Failed bulk role assignment.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const listToExport = selectedUserIds.length > 0
      ? filteredUsers.filter((u) => selectedUserIds.includes(u.id))
      : filteredUsers;

    if (listToExport.length === 0) {
      toast.error("No user data available to export.");
      return;
    }

    const headers = ["User ID", "Full Name", "Email", "Roles", "Branch Location", "Status", "Last Login"];
    const rows = listToExport.map((u) => [
      `"${u.id || ""}"`,
      `"${(u.fullName || "").replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      `"${((u.roles && u.roles.length > 0 ? u.roles.join(", ") : u.roleName) || "").replace(/"/g, '""')}"`,
      `"${(u.branchName || "HQ Shared").replace(/"/g, '""')}"`,
      `"${u.isActive ? "Active" : "Inactive"}"`,
      `"${u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `users_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${listToExport.length} user records to CSV!`);
  };

  interface BranchRoleGroup {
    branchId?: string;
    branchName?: string;
    roles: string[];
  }

  // Helper function to resolve effective assigned role groups with single branch identification tag
  const getUserEffectiveRoleGroups = (u: UserItem, selectedBranchFilter: string = "ALL"): BranchRoleGroup[] => {
    if (!u) return [];
    const resolveBranchName = (bId: string) => {
      const bObj = branches.find((b) => b.id === bId);
      return bObj ? bObj.name : (u.branchName || bId);
    };

    if (selectedBranchFilter !== "ALL" && selectedBranchFilter !== "UNASSIGNED") {
      const targetBranchObj = branches.find(b => b.id === selectedBranchFilter || b.name === selectedBranchFilter);
      const targetBranchId = targetBranchObj ? targetBranchObj.id : selectedBranchFilter;
      const bName = resolveBranchName(targetBranchId);

      if (u.branchRoles && u.branchRoles[targetBranchId] && Array.isArray(u.branchRoles[targetBranchId]) && u.branchRoles[targetBranchId].length > 0) {
        return [{
          branchId: targetBranchId,
          branchName: bName,
          roles: Array.from(new Set(u.branchRoles[targetBranchId].filter(Boolean)))
        }];
      }
    }

    if (u.branchRoles && Object.keys(u.branchRoles).length > 0) {
      const groups: BranchRoleGroup[] = [];
      Object.entries(u.branchRoles).forEach(([bId, rList]) => {
        if (Array.isArray(rList) && rList.length > 0) {
          const bName = resolveBranchName(bId);
          groups.push({
            branchId: bId,
            branchName: bName,
            roles: Array.from(new Set(rList.filter(Boolean)))
          });
        }
      });
      if (groups.length > 0) return groups;
    }

    const defaultRoles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles.filter(Boolean) : [u.roleName || "RECRUITER"];
    const singleBranchName = u.branchId ? resolveBranchName(u.branchId) : undefined;
    return [{
      branchId: u.branchId || undefined,
      branchName: singleBranchName,
      roles: Array.from(new Set(defaultRoles))
    }];
  };

  const getUserEffectiveRoles = (u: UserItem, selectedBranchFilter: string = "ALL") => {
    if (!u) return [];
    const groups = getUserEffectiveRoleGroups(u, selectedBranchFilter);
    return Array.from(new Set(groups.flatMap((g) => g.roles || []))).filter(Boolean);
  };

  const openEditModal = (user: UserItem) => {
    if (!user) return;
    setSelectedUser(user);
    const nameParts = (user.fullName || "").trim().split(" ");
    const fName = nameParts[0] || "";
    const lName = nameParts.slice(1).join(" ") || "";
    const rawRoles = getUserEffectiveRoles(user, "ALL");
    const initialAssigned = Array.isArray(user.assignedBranchIds) && user.assignedBranchIds.length > 0
      ? user.assignedBranchIds
      : (user.branchId ? [user.branchId] : []);

    setEditForm({
      firstName: fName,
      lastName: lName,
      email: user.email || "",
      branchId: user.branchId || "",
      assignedBranchIds: initialAssigned,
      branchRoles: user.branchRoles || {},
      roles: [...rawRoles],
    });
    setIsEditModalOpen(true);
  };

  const openPasswordModal = (user: UserItem) => {
    if (!user) return;
    setSelectedUser(user);
    setNewPassword("");
    setIsPasswordModalOpen(true);
  };

  // Filtering
  const filteredUsers = users.filter((u) => {
    if (!u) return false;
    const query = (searchQuery || "").trim().toLowerCase();
    const userRolesList = getUserEffectiveRoles(u, branchFilter);

    const matchesSearch =
      !query ||
      (u.fullName || "").toLowerCase().includes(query) ||
      (u.email || "").toLowerCase().includes(query) ||
      (u.roleName || "").toLowerCase().includes(query) ||
      (u.branchName || "").toLowerCase().includes(query) ||
      userRolesList.some(r => typeof r === "string" && r.toLowerCase().includes(query));

    const matchesRole =
      roleFilter === "ALL" ||
      userRolesList.some(r => typeof r === "string" && r.toUpperCase() === roleFilter.toUpperCase());

    const matchesBranch =
      branchFilter === "ALL" ||
      (branchFilter === "UNASSIGNED"
        ? !u.branchId
        : (u.assignedBranchIds && u.assignedBranchIds.includes(branchFilter)) || u.branchId === branchFilter || u.branchName === branchFilter);

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
    <div className="p-6 w-full max-w-full space-y-5">
      
      {/* STANDARD PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-default-200">
        <div>
          <h1 className="text-xl font-bold text-default-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" /> Users & Teams
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

          {/* ALWAYS VISIBLE DROPDOWN FILTERS & AITTUDE ACTIONS BUTTON */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* ROLE FILTER */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 text-xs rounded-md border border-default-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 font-medium text-default-700 dark:text-neutral-200 outline-none hover:border-indigo-500"
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
              className="h-9 text-xs rounded-md border border-default-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 font-medium text-default-700 dark:text-neutral-200 outline-none hover:border-indigo-500"
            >
              <option value="ALL">All Branch Offices</option>
              <option value="UNASSIGNED">Unassigned (HQ Shared)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* STATUS FILTER */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs rounded-md border border-default-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 font-medium text-default-700 dark:text-neutral-200 outline-none hover:border-indigo-500"
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

            {/* FILTER FUNNEL ICON BUTTON (Aittude style) */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-md border-default-200 dark:border-slate-700 text-default-600 dark:text-neutral-300 hover:text-indigo-600 hover:border-indigo-500"
              title="Toggle Filter Options"
            >
              <Filter className="h-4 w-4" />
            </Button>

            {/* PRIMARY ACTIONS DROPDOWN BUTTON (Aittude style) */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-md flex items-center gap-1.5 cursor-pointer shadow-sm ml-1"
                >
                  Actions ▾
                  {selectedUserIds.length > 0 && (
                    <span className="bg-white text-indigo-700 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                      {selectedUserIds.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xl rounded-lg p-1.5 text-xs">
                {selectedUserIds.length > 0 ? (
                  <>
                    <div className="px-2 py-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 rounded mb-1 flex items-center justify-between">
                      <span>{selectedUserIds.length} Users Selected</span>
                      <button onClick={() => setSelectedUserIds([])} className="text-[10px] text-neutral-500 hover:text-neutral-900 cursor-pointer">Clear</button>
                    </div>

                    <DropdownMenuItem
                      onClick={() => {
                        setBulkSelectedRoleIds(["RECRUITER"]);
                        setIsBulkRoleModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-neutral-800 dark:text-neutral-200 font-semibold"
                    >
                      <Shield className="h-3.5 w-3.5 text-indigo-600" /> Assign System Roles...
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => {
                        setTargetMoveBranchId("");
                        setIsBulkMoveBranchModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-neutral-800 dark:text-neutral-200 font-semibold"
                    >
                      <Building2 className="h-3.5 w-3.5 text-indigo-600" /> Move to Branch...
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => handleBulkStatusChange(true)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-700 font-semibold"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Activate Selected
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => handleBulkStatusChange(false)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/50 text-amber-700 font-semibold"
                    >
                      <UserX className="h-3.5 w-3.5 text-amber-600" /> Deactivate & Revoke
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1 border-neutral-100 dark:border-slate-800" />

                    <DropdownMenuItem
                      onClick={handleExportCSV}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800 font-medium"
                    >
                      <Mail className="h-3.5 w-3.5 text-neutral-500" /> Export Selected to CSV
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        if (activeSeats >= userLimit) {
                          toast.error(`Seat limit reached! (${userLimit} active licenses). Deactivate a user first.`);
                          return;
                        }
                        setIsAddModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-semibold"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Add New Member
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => window.location.href = "/utility/roles-permissions"}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-800 dark:text-neutral-200 font-medium"
                    >
                      <Shield className="h-3.5 w-3.5 text-neutral-500" /> Role & Permission Settings
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => window.location.href = "/utility/branches"}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-800 dark:text-neutral-200 font-medium"
                    >
                      <Building2 className="h-3.5 w-3.5 text-neutral-500" /> Manage Office Branches
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1 border-neutral-100 dark:border-slate-800" />

                    <DropdownMenuItem
                      onClick={handleExportCSV}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-800 dark:text-neutral-200 font-medium"
                    >
                      <Mail className="h-3.5 w-3.5 text-neutral-500" /> Export Users (CSV)
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* STANDARD DATA TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-default-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-xs text-default-500 mt-2 font-medium">Loading users...</p>
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
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </th>
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
                    <tr key={user.id} className={`transition-colors ${selectedUserIds.includes(user.id) ? "bg-indigo-50/40 dark:bg-indigo-950/20" : "hover:bg-default-50/60 dark:hover:bg-slate-800/40"}`}>
                      {/* Checkbox Column */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => handleSelectRow(user.id)}
                          className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer"
                        />
                      </td>

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
                        <div className="flex flex-wrap gap-1.5">
                          {(() => {
                            const groups = getUserEffectiveRoleGroups(user, branchFilter);
                            const hasMultipleBranches = (user.assignedBranchIds && user.assignedBranchIds.length > 1) ||
                              (user.branchRoles && Object.keys(user.branchRoles).length > 1);

                            const formatRoleLabel = (r: string) => {
                              if (!r || typeof r !== "string") return "Recruiter";
                              const upper = r.toUpperCase();
                              if (upper === "ACCOUNT_MANAGER") return "Account Manager";
                              if (upper === "POD_LEAD") return "Pod Lead";
                              if (upper === "BRANCH_ADMIN") return "Branch Admin";
                              if (upper === "DELIVERY_HEAD") return "Delivery Head";
                              if (upper === "RECRUITER") return "Recruiter";
                              if (upper === "ADMIN") return "Tenant Admin";
                              return r.replace(/_/g, " ");
                            };

                            return groups.map((group, idx) => {
                              const roleLabels = group.roles.map((r) => formatRoleLabel(r));
                              return (
                                <span
                                  key={`${group.branchId || idx}`}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-slate-800 dark:text-indigo-300 border border-indigo-200 dark:border-slate-700 shadow-2xs"
                                >
                                  <span>{roleLabels.join(", ")}</span>
                                  {hasMultipleBranches && group.branchName && branchFilter === "ALL" && (
                                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-1 py-0.2 rounded border border-indigo-200/80 dark:border-slate-700">
                                      🏢 {group.branchName}
                                    </span>
                                  )}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      </td>

                      {/* Branch Location — Plain Comma-Separated Text */}
                      <td className="py-3 px-4 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        {(() => {
                          const assignedIds = (user.assignedBranchIds && user.assignedBranchIds.length > 0)
                            ? user.assignedBranchIds
                            : (user.branchId ? [user.branchId] : []);

                          if (assignedIds.length === 0) {
                            return <span className="text-neutral-400 font-normal">-- Unassigned (HQ Shared) --</span>;
                          }

                          const branchNames = assignedIds.map((id) => {
                            const bObj = branches.find((b) => b.id === id);
                            if (!bObj) return user.branchName || id;
                            return bObj.name;
                          });

                          return (
                            <span className="truncate max-w-[280px] inline-block font-medium" title={branchNames.join(", ")}>
                              🏢 {branchNames.join(", ")}
                            </span>
                          );
                        })()}
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

                      {/* Floating Actions Menu (Triple Dot) */}
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 rounded-full hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                              title="User Actions Menu"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xl rounded-lg p-1 text-xs">
                            <DropdownMenuItem
                              onClick={() => openEditModal(user)}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-neutral-800 dark:text-neutral-200 font-medium"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-indigo-600" /> Edit Profile & Roles
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => openPasswordModal(user)}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/50 text-neutral-800 dark:text-neutral-200 font-medium"
                            >
                              <Key className="h-3.5 w-3.5 text-amber-500" /> Reset Password
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 border-neutral-100 dark:border-slate-800" />

                            {user.isActive ? (
                              <DropdownMenuItem
                                onClick={() => handleStatusToggle(user)}
                                disabled={isCurrent}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/50 text-amber-700 font-medium"
                              >
                                <UserX className="h-3.5 w-3.5" /> Deactivate & Revoke Access
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleStatusToggle(user)}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-700 font-medium"
                              >
                                <UserCheck className="h-3.5 w-3.5" /> Reactivate Account
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 shrink-0">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-indigo-650" /> Add Team Member
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* FIRST NAME + LAST NAME GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">First Name *</label>
                  <Input
                    value={addForm.firstName}
                    onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                    placeholder="e.g. Rajesh"
                    className="h-8 text-xs rounded border-neutral-300"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Last Name *</label>
                  <Input
                    value={addForm.lastName}
                    onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                    placeholder="e.g. Kumar"
                    className="h-8 text-xs rounded border-neutral-300"
                    required
                  />
                </div>
              </div>

              {/* WORK EMAIL & PRIMARY BRANCH */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Work Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="e.g. rajesh.kumar@company.com"
                    className={`h-8 text-xs rounded-lg ${
                      emailStatus === "taken"
                        ? "border-red-500 bg-red-50/40 dark:bg-red-950/20 text-red-600 font-semibold"
                        : emailStatus === "available"
                        ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 font-semibold"
                        : "border-neutral-300 dark:border-slate-700"
                    }`}
                    required
                  />

                  {/* Debounced Inline Availability Message */}
                  {Boolean((addForm?.email || "").trim()) && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold pt-0.5">
                      {emailStatus === "checking" && (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin text-amber-500" /> Checking...
                        </span>
                      )}
                      {emailStatus === "taken" && (
                        <span className="text-red-600 dark:text-red-400 flex items-center gap-1 font-bold">
                          <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" /> Registered
                        </span>
                      )}
                      {emailStatus === "available" && (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Available!
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">
                    Primary Office Branch (Home Office) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addForm.branchId}
                    onChange={(e) => {
                      const newPrimary = e.target.value;
                      const nextAssigned = newPrimary && !addForm.assignedBranchIds.includes(newPrimary)
                        ? [...addForm.assignedBranchIds, newPrimary]
                        : addForm.assignedBranchIds;
                      setAddForm({
                        ...addForm,
                        branchId: newPrimary,
                        assignedBranchIds: nextAssigned,
                      });
                    }}
                    className="w-full h-8 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-semibold text-neutral-900 dark:text-white"
                    required
                  >
                    <option value="">Select Primary Branch...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MULTI-BRANCH ASSIGNMENT CHECKBOXES WITH POPUP ROLE ASSIGNMENT */}
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block">
                  🏢 Office Branch Assignments &amp; Branch-Wise Roles
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/70 dark:bg-slate-900/60 p-3.5 rounded-xl border border-neutral-200 dark:border-slate-800">
                  {branches.map((b) => {
                    const isAssigned = addForm.assignedBranchIds.includes(b.id) || addForm.branchId === b.id;
                    const bRoles = addForm.branchRoles[b.id] || addForm.roles || [];

                    return (
                      <div
                        key={b.id}
                        className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-[11px] transition-all shadow-2xs ${
                          isAssigned
                            ? "bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-500/10"
                            : "bg-neutral-50/80 dark:bg-slate-850 border-neutral-200/80 dark:border-slate-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                        }`}
                      >
                        <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0 select-none pt-0.5">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              let nextAssigned = addForm.assignedBranchIds.filter((id) => id !== b.id);
                              let nextBranchRoles = { ...addForm.branchRoles };

                              if (checked) {
                                nextAssigned.push(b.id);
                                if (!nextBranchRoles[b.id]) {
                                  nextBranchRoles[b.id] = addForm.roles.length > 0 ? [...addForm.roles] : ["RECRUITER"];
                                }
                              } else {
                                delete nextBranchRoles[b.id];
                              }

                              setAddForm({
                                ...addForm,
                                assignedBranchIds: nextAssigned,
                                branchRoles: nextBranchRoles,
                              });
                            }}
                            className="h-4 w-4 mt-0.5 accent-indigo-600 rounded cursor-pointer shrink-0"
                          />
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-bold text-xs ${isAssigned ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300"}`}>
                                🏢 {b.name}
                              </span>
                              {b.id === addForm.branchId && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                                  Primary Home
                                </span>
                              )}
                            </div>
                            {isAssigned && (
                              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                <span className="text-[10px] font-semibold text-neutral-500">Roles:</span>
                                {bRoles.length > 0 ? (
                                  bRoles.map((r: string) => (
                                    <span key={r} className="text-[9.5px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-200/80">
                                      {r.replace("_", " ")}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[9.5px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-200/80">
                                    Recruiter
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </label>

                          {isAssigned && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setBranchRoleModalState({ branchId: b.id, branchName: b.name, isAddForm: true })}
                              className="h-7 text-[11px] px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-indigo-600 flex items-center gap-1.5 rounded-lg cursor-pointer shrink-0 ml-1 shadow-2xs whitespace-nowrap"
                            >
                              <Shield className="h-3 w-3 text-indigo-200" /> Assign Roles <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              {/* PASSWORD + CONFIRM PASSWORD GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Confirm Password *</label>
                  <Input
                    type="password"
                    value={addForm.confirmPassword}
                    onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    className={`h-8 text-xs rounded font-mono ${
                      addForm.confirmPassword && addForm.confirmPassword !== addForm.password
                        ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                        : "border-neutral-300"
                    }`}
                    required
                  />
                </div>
              </div>
              {addForm.confirmPassword && addForm.confirmPassword !== addForm.password && (
                <p className="text-[10px] font-semibold text-red-500 -mt-2">Passwords do not match</p>
              )}



              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 z-10">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)} className="h-8 text-xs cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || emailStatus === "taken"} size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer disabled:opacity-50">
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
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 shrink-0">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-indigo-650" /> Edit Member Details
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* FIRST NAME + LAST NAME + EMAIL GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">First Name *</label>
                  <Input
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    placeholder="e.g. Rajesh"
                    className="h-8 text-xs rounded border-neutral-300"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Last Name *</label>
                  <Input
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    placeholder="e.g. Kumar"
                    className="h-8 text-xs rounded border-neutral-300"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Work Email *</label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="e.g. rajesh.kumar@company.com"
                    className="h-8 text-xs rounded border-neutral-300 font-mono"
                    required
                  />
                </div>
              </div>

              {/* MULTI-BRANCH ASSIGNMENT & BRANCH-WISE ROLE MATRIX */}
              <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-indigo-600" /> Office Branch Assignments &amp; Branch-Wise Roles
                  </label>
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                    {editForm.assignedBranchIds.length} Branch(es) Selected
                  </span>
                </div>

                {/* PRIMARY HOME BRANCH DROPDOWN */}
                <div className="space-y-1 bg-neutral-50 dark:bg-slate-850 p-2.5 rounded-lg border border-neutral-200 dark:border-slate-800">
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">
                    Primary Office Branch (Home Office) *
                  </label>
                  <select
                    value={editForm.branchId}
                    onChange={(e) => {
                      const newPrimary = e.target.value;
                      const nextAssigned = newPrimary && !editForm.assignedBranchIds.includes(newPrimary)
                        ? [...editForm.assignedBranchIds, newPrimary]
                        : editForm.assignedBranchIds;
                      setEditForm({
                        ...editForm,
                        branchId: newPrimary,
                        assignedBranchIds: nextAssigned,
                      });
                    }}
                    className="w-full h-8 text-xs rounded border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 font-semibold"
                  >
                    <option value="">Select Primary Branch...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* MULTI-BRANCH ASSIGNMENT CHECKBOXES WITH POPUP ROLE ASSIGNMENT */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block">
                    🏢 Office Branch Assignments &amp; Branch-Wise Roles
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/70 dark:bg-slate-900/60 p-3.5 rounded-xl border border-neutral-200 dark:border-slate-800">
                    {branches.map((b) => {
                      const isAssigned = editForm.assignedBranchIds.includes(b.id) || editForm.branchId === b.id;
                      const bRoles = editForm.branchRoles[b.id] || editForm.roles || [];

                      return (
                        <div
                          key={b.id}
                          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-[11px] transition-all shadow-2xs ${
                            isAssigned
                              ? "bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-500/10"
                              : "bg-neutral-50/80 dark:bg-slate-850 border-neutral-200/80 dark:border-slate-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                          }`}
                        >
                          <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0 select-none pt-0.5">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                let nextAssigned = editForm.assignedBranchIds.filter((id) => id !== b.id);
                                let nextBranchRoles = { ...editForm.branchRoles };

                                if (checked) {
                                  nextAssigned.push(b.id);
                                  if (!nextBranchRoles[b.id]) {
                                    nextBranchRoles[b.id] = editForm.roles.length > 0 ? [...editForm.roles] : ["RECRUITER"];
                                  }
                                } else {
                                  delete nextBranchRoles[b.id];
                                }

                                setEditForm({
                                  ...editForm,
                                  assignedBranchIds: nextAssigned,
                                  branchRoles: nextBranchRoles,
                                });
                              }}
                              className="h-4 w-4 mt-0.5 accent-indigo-600 rounded cursor-pointer shrink-0"
                            />
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-bold text-xs ${isAssigned ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300"}`}>
                                  🏢 {b.name}
                                </span>
                                {b.id === editForm.branchId && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                                    Primary Home
                                  </span>
                                )}
                              </div>
                              {isAssigned && (
                                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                  <span className="text-[10px] font-semibold text-neutral-500">Roles:</span>
                                  {bRoles.length > 0 ? (
                                    bRoles.map((r: string) => (
                                      <span key={r} className="text-[9.5px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-200/80">
                                        {r.replace('_', ' ')}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[9.5px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-200/80">
                                      Recruiter
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </label>

                          {isAssigned && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setBranchRoleModalState({ branchId: b.id, branchName: b.name, isAddForm: false })}
                              className="h-7 text-[11px] px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-indigo-600 flex items-center gap-1.5 rounded-lg cursor-pointer shrink-0 ml-1 shadow-2xs whitespace-nowrap"
                            >
                              <Shield className="h-3 w-3 text-indigo-200" /> Assign Roles <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>



              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 z-10">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)} className="h-8 text-xs cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer">
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

      {/* BULK ASSIGN ROLES MODAL */}
      {isBulkRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in-0">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" /> Assign System Roles ({selectedUserIds.length} Users)
              </h3>
              <button onClick={() => setIsBulkRoleModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-72 overflow-y-auto">
              <p className="text-xs text-neutral-500 mb-2">
                Select one or more system roles to assign simultaneously to the <strong>{selectedUserIds.length} selected team members</strong>:
              </p>

              {rolesList.map((r) => {
                const roleKey = r.name || r.id;
                const isChecked = bulkSelectedRoleIds.includes(roleKey);
                return (
                  <label
                    key={r.id || r.name}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition ${
                      isChecked ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30" : "border-neutral-200 dark:border-slate-800 hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setBulkSelectedRoleIds(prev => prev.filter(item => item !== roleKey));
                        } else {
                          setBulkSelectedRoleIds(prev => [...prev, roleKey]);
                        }
                      }}
                      className="h-4 w-4 accent-indigo-600 rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block">{r.name}</span>
                      {r.description && <span className="text-[10px] text-neutral-500 block">{r.description}</span>}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="border-t border-neutral-100 dark:border-slate-800 p-4 bg-neutral-50 dark:bg-slate-850 flex justify-end gap-2">
              <Button size="sm" variant="outline" type="button" onClick={() => setIsBulkRoleModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleBulkAssignRoles}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                {loading ? "Assigning..." : `Apply Roles to ${selectedUserIds.length} Users`}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* BULK MOVE BRANCH MODAL */}
      {isBulkMoveBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in-0">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" /> Relocate {selectedUserIds.length} Selected Users
              </h3>
              <button onClick={() => setIsBulkMoveBranchModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-neutral-500">
                Select the target office branch for the <strong>{selectedUserIds.length} selected team members</strong>:
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Target Office Branch *</label>
                <select
                  value={targetMoveBranchId}
                  onChange={(e) => setTargetMoveBranchId(e.target.value)}
                  className="w-full h-9 text-xs font-medium rounded-md border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-neutral-900 dark:text-neutral-100 outline-none"
                >
                  <option value="">-- Unassigned (HQ Shared) --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-neutral-100 dark:border-slate-800 p-4 bg-neutral-50 dark:bg-slate-850 flex justify-end gap-2">
              <Button size="sm" variant="outline" type="button" onClick={() => setIsBulkMoveBranchModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  await handleBulkMoveBranch(targetMoveBranchId);
                  setIsBulkMoveBranchModalOpen(false);
                }}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                {loading ? "Relocating..." : `Move ${selectedUserIds.length} Users`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED BRANCH ROLE ASSIGNMENT POPUP MODAL */}
      {branchRoleModalState && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <h3 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" /> Assign Roles for 🏢 {branchRoleModalState.branchName}
              </h3>
              <button
                onClick={() => setBranchRoleModalState(null)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <p className="text-xs text-neutral-500">
                Configure specific system & custom roles assigned to this employee under <strong className="text-neutral-800 dark:text-neutral-200">{branchRoleModalState.branchName}</strong>:
              </p>

              {/* TENANT CUSTOM ROLES */}
              {(rolesList || []).some((r) => !r.isSystem) && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                    🎨 Tenant Custom Roles (Aliases)
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-200/60 dark:border-indigo-900/50">
                    {(rolesList || [])
                      .filter((r) => !r.isSystem)
                      .map((r) => {
                        const isAdd = branchRoleModalState.isAddForm;
                        const targetForm = isAdd ? addForm : editForm;
                        const bRoles = targetForm.branchRoles[branchRoleModalState.branchId] || targetForm.roles || ["RECRUITER"];
                        const isChecked = bRoles.some((item: string) => item.toUpperCase() === r.name.toUpperCase());

                        return (
                          <label
                            key={r.name}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[11px] cursor-pointer transition-colors ${
                              isChecked
                                ? "bg-indigo-600 text-white font-bold border-indigo-600 shadow-2xs"
                                : "bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                let updated = bRoles.filter((item: string) => item.toUpperCase() !== r.name.toUpperCase());
                                if (checked) updated.push(r.name);
                                if (isAdd) {
                                  setAddForm((prev) => ({
                                    ...prev,
                                    branchRoles: {
                                      ...prev.branchRoles,
                                      [branchRoleModalState.branchId]: updated,
                                    },
                                  }));
                                } else {
                                  setEditForm((prev) => ({
                                    ...prev,
                                    branchRoles: {
                                      ...prev.branchRoles,
                                      [branchRoleModalState.branchId]: updated,
                                    },
                                  }));
                                }
                              }}
                              className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer"
                            />
                            <span className="truncate">{r.name} {r.isExactSubstitution ? `(Alias: ${r.replacesSystemRole || r.systemRole})` : ''}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* STANDARD SYSTEM ROLES */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block">
                  ⚙️ Standard System Roles
                </label>
                <div className="grid grid-cols-2 gap-2 bg-neutral-50 dark:bg-slate-850 p-3 rounded-lg border border-neutral-200 dark:border-slate-800">
                  {[
                    { key: "RECRUITER", label: "Recruiter" },
                    { key: "ACCOUNT_MANAGER", label: "Account Manager" },
                    { key: "POD_LEAD", label: "Pod Lead" },
                    { key: "BRANCH_ADMIN", label: "Branch Admin" },
                    { key: "DELIVERY_HEAD", label: "Delivery Head" },
                    { key: "ADMIN", label: "Tenant Admin" },
                  ].map((r) => {
                    const isAdd = branchRoleModalState.isAddForm;
                    const targetForm = isAdd ? addForm : editForm;
                    const setTargetForm = isAdd ? setAddForm : setEditForm;
                    const bRoles = targetForm.branchRoles[branchRoleModalState.branchId] || targetForm.roles || ["RECRUITER"];
                    const isChecked = bRoles.some((item: string) => item.toUpperCase() === r.key.toUpperCase());

                    return (
                      <label
                        key={r.key}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[11px] cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-indigo-600 text-white font-bold border-indigo-600 shadow-2xs"
                            : "bg-white dark:bg-slate-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-slate-700 hover:bg-neutral-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            let updated = bRoles.filter((item: string) => item.toUpperCase() !== r.key.toUpperCase());
                            if (checked) updated.push(r.key);
                            if (isAdd) {
                              setAddForm((prev) => ({
                                ...prev,
                                branchRoles: {
                                  ...prev.branchRoles,
                                  [branchRoleModalState.branchId]: updated,
                                },
                              }));
                            } else {
                              setEditForm((prev) => ({
                                ...prev,
                                branchRoles: {
                                  ...prev.branchRoles,
                                  [branchRoleModalState.branchId]: updated,
                                },
                              }));
                            }
                          }}
                          className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer"
                        />
                        <span className="truncate">{r.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end px-5 py-3 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <Button
                onClick={() => setBranchRoleModalState(null)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-4 rounded-md cursor-pointer"
              >
                Done / Save Roles
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
