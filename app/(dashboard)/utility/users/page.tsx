"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, UserPlus, Search, Edit2, Key, Shield, Building2, MapPin, Briefcase,
  CheckCircle2, XCircle, RefreshCw, Mail, Lock, Sparkles, Filter, ShieldAlert, X, ChevronRight, Loader2,
  MoreVertical, Trash2, UserCheck, UserX, ChevronDown, Check, Eye, EyeOff, Info, Clock
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { atsApi } from "@/lib/ats-api";
import { getTenantIdentifier } from "@/utils/subdomain-helper";
import { getSelectedMemberRoleIds } from "@/lib/member-role-selection";

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  roleId: string | null;
  roleName: string;
  roles?: string[];
  branchId: string | null;
  businessUnitId?: string | null;
  businessUnitName?: string | null;
  assignedBranchIds?: string[];
  branchRoles?: Record<string, string[]>;
  branchName: string | null;
  jobReviewerId?: string | null;
  jobReviewerName?: string | null;
  permissions?: string[];
  canReview?: boolean;
  isActive: boolean;
  isApproved?: boolean;
  requestedRole?: string | null;
  lastLoginAt?: string;
  createdAt: string;
}

function ReviewerSelect({
  value,
  onChange,
  eligibleUsers,
  excludeUserId,
  rolesList,
}: {
  value: string;
  onChange: (val: string) => void;
  eligibleUsers: UserItem[];
  excludeUserId?: string;
  rolesList?: any[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const candidates = useMemo(() => {
    return eligibleUsers.filter((u) => u.id !== excludeUserId);
  }, [eligibleUsers, excludeUserId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return candidates;
    const q = search.toLowerCase().trim();
    return candidates.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.roleName?.toLowerCase().includes(q) ||
        (u.roles && u.roles.some((r) => r.toLowerCase().includes(q)))
    );
  }, [candidates, search]);

  const selectedUser = candidates.find((u) => u.id === value);

  const getRoleBadgeStyle = (roleName: string = "") => {
    const BADGE_PALETTES = [
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    ];
    let hash = 0;
    for (let i = 0; i < roleName.length; i++) {
      hash = roleName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % BADGE_PALETTES.length;
    return BADGE_PALETTES[idx];
  };

  const getDisplayRole = (u: UserItem) => {
    return u.roleName || (u.roles && u.roles.length > 0 ? u.roles[0] : "Team Member");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-2.5 rounded-lg border text-left cursor-pointer transition flex items-center justify-between gap-2 select-none ${
          isOpen
            ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20"
            : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-neutral-300 dark:hover:border-slate-600 shadow-2xs"
        }`}
      >
        {selectedUser ? (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {selectedUser.fullName ? selectedUser.fullName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  {selectedUser.fullName}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${getRoleBadgeStyle(getDisplayRole(selectedUser))}`}>
                  {getDisplayRole(selectedUser)}
                </span>
              </div>
              <span className="text-[10.5px] text-neutral-500 font-mono block truncate">
                {selectedUser.email}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-7 w-7 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold text-xs">
              ⚡
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Auto
                </span>
                <span className="text-[9.5px] px-1.5 py-0.2 rounded font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Recommended
                </span>
              </div>
              <span className="text-[10px] text-neutral-500 block truncate">
                Auto-routes approvals based on branch hierarchy
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0 text-neutral-400">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-1 hover:text-red-500 rounded-md transition cursor-pointer"
              title="Reset to default inheritance"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180 text-indigo-600" : ""}`} />
        </div>
      </div>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
          {/* Search Input */}
          <div className="p-2 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search managers by name, role or email..."
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
            </div>
          </div>

          {/* Reviewer Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {/* Option: Inherit from Default (Auto) */}
            <div
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className={`flex items-center justify-between gap-2 p-2 rounded-lg cursor-pointer transition select-none ${
                !value
                  ? "bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800"
                  : "hover:bg-neutral-50 dark:hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Auto
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Recommended
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 block">
                    Auto-routes based on branch organizational hierarchy
                  </span>
                </div>
              </div>
              {!value && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
            </div>

            {filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-400">
                No eligible managers found matching &quot;{search}&quot;
              </div>
            ) : (
              filtered.map((u) => {
                const isSelected = value === u.id;
                const displayRole = getDisplayRole(u);
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      onChange(u.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between gap-2 p-2 rounded-lg cursor-pointer transition select-none ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800"
                        : "hover:bg-neutral-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                        {u.fullName ? u.fullName.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                            {u.fullName}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${getRoleBadgeStyle(displayRole)}`}>
                            {displayRole}
                          </span>
                        </div>
                        <span className="text-[10.5px] text-neutral-500 font-mono block truncate">
                          {u.email}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// In-memory Stale-While-Revalidate cache for instantaneous zero-delay page transitions
let cachedUsersData: {
  users: UserItem[];
  branches: any[];
  rolesList: any[];
  profile: any;
  timestamp: number;
} | null = null;



export default function UserManagementPage() {
  const [addModalTab, setAddModalTab] = useState("STAFF");
  const [editModalTab, setEditModalTab] = useState("STAFF");
  const [loading, setLoading] = useState(() => !cachedUsersData);
  const [users, setUsers] = useState<UserItem[]>(() => cachedUsersData?.users || []);
  const [branches, setBranches] = useState<any[]>(() => cachedUsersData?.branches || []);
  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>(() => cachedUsersData?.rolesList || []);
  const [profile, setProfile] = useState<any>(() => cachedUsersData?.profile || null);

  const currentUser = typeof window !== 'undefined' ? atsApi.auth.getCurrentUser() : null;
  const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
  const [overrideRole, setOverrideRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('override_role');
    return null;
  });

  useEffect(() => {
    const handleRole = () => {
      if (typeof window !== 'undefined') {
        setOverrideRole(localStorage.getItem('override_role'));
      }
    };
    window.addEventListener('storage', handleRole);
    window.addEventListener('overrideRoleChanged', handleRole);
    return () => {
      window.removeEventListener('storage', handleRole);
      window.removeEventListener('overrideRoleChanged', handleRole);
    };
  }, []);

  // Granular permission-based access flags for the logged-in user
  const sessionPerms: string[] = useMemo(() => {
    if (Array.isArray(profile?.permissions) && profile.permissions.length > 0) {
      return profile.permissions;
    }
    if (Array.isArray(currentUser?.permissions) && currentUser.permissions.length > 0) {
      return currentUser.permissions;
    }
    return [];
  }, [profile, currentUser]);

  // Branch Admin: has branch_admin:manage but NOT tenant:settings (tenant-level admin)
  const isBranchAdmin = useMemo(() => {
    if (overrideRole) {
      const norm = overrideRole.toUpperCase().replace(/[\s-_]/g, "");
      if (norm === "BRANCHADMIN") return true;
      if (norm === "TENANT_ADMIN" || norm === "SUPERADMIN" || norm === "TENANTADMIN") return false;
    }
    if (sessionPerms.length > 0) {
      return sessionPerms.includes('branch_admin:manage') && !sessionPerms.includes('tenant:settings');
    }
    const userRole = (currentUser?.systemRole || currentUser?.roles?.[0] || "").toUpperCase().replace(/[\s-_]/g, "");
    return userRole === "BRANCHADMIN";
  }, [overrideRole, sessionPerms, currentUser]);

  const isTenantAdmin = sessionPerms.includes('tenant:settings') || (!isBranchAdmin && (overrideRole === 'TENANT_ADMIN' || overrideRole === 'Tenant Admin'));

  // The branches the current user is assigned to (for filtering dropdowns)
  const assignedBranches = useMemo(() => {
    if (!isBranchAdmin) return branches;
    const ids: string[] = Array.isArray(currentUser?.assignedBranchIds) && currentUser.assignedBranchIds.length > 0
      ? currentUser.assignedBranchIds
      : (currentUser?.branchId ? [currentUser.branchId] : []);
    if (ids.length === 0) return branches;
    return branches.filter((b) => ids.includes(b.id));
  }, [isBranchAdmin, branches, currentUser]);

  const assignedBusinessUnits = useMemo(() => {
    if (sessionPerms.includes('tenant:settings') || sessionPerms.includes('branch_admin:manage')) return businessUnits;
    if (currentUser?.businessUnitId) {
      return businessUnits.filter((bu) => bu.id === currentUser.businessUnitId);
    }
    return businessUnits;
  }, [businessUnits, sessionPerms, currentUser]);

  const isUnitAdmin = useMemo(() => {
    if (overrideRole) return false;
    return !sessionPerms.includes('tenant:settings') && !sessionPerms.includes('branch_admin:manage') && !!currentUser?.businessUnitId;
  }, [overrideRole, sessionPerms, currentUser]);

  // Can the current user manage (edit/delete/status) a given target user?
  const canManageUser = (targetUser: any): boolean => {
    const isTenantAdmin = sessionPerms.includes('tenant:settings');
    if (isTenantAdmin) return true;

    const targetBranchId = targetUser?.branchId || targetUser?.branch_id;
    const targetBusinessUnitId = targetUser?.businessUnitId || targetUser?.business_unit_id;

    if (isBranchAdmin) {
      if (!targetBranchId) return false;
      return assignedBranches.some((b) => b.id === targetBranchId);
    }

    if (isUnitAdmin) {
      if (!targetBusinessUnitId) return false;
      return targetBusinessUnitId === currentUser?.businessUnitId;
    }

    return false; // Default to false if no administrative role
  };

  const getDomainSuffix = () => {
    const userEmail = profile?.email || currentUser?.email;
    if (userEmail?.toLowerCase().endsWith("@csm.com")) return "csm";
    const currentSub = typeof window !== 'undefined' ? getTenantIdentifier() : "";
    const rawDomain = currentSub || profile?.tenantDomain || currentUser?.tenantDomain || "enfycon";
    return rawDomain.toLowerCase().endsWith(".com") ? rawDomain.slice(0, -4) : rawDomain;
  };
  const tenantDomain = getDomainSuffix();
  const userLimit = profile?.userLimit || 10;

  // Filter reviewers who have internal screening & review permissions enabled or managerial roles
  const eligibleReviewers = useMemo(() => {
    return users.filter((u) => {
      if (!u || !u.isActive) return false;
      if (u.canReview) return true;
      const perms = u.permissions || [];
      if (
        perms.includes("submission:internal_screening") ||
        perms.includes("job:approve") ||
        perms.includes("job:reject") ||
        perms.includes("job:publish_direct") ||
        perms.includes("branch_admin:manage") ||
        perms.includes("tenant:settings")
      ) {
        return true;
      }
      const rawRoles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.roleName || ""];
      const upperRoles = rawRoles.map((r) => String(r).toUpperCase().replace(/[\s-_]/g, ""));
      const managerRoles = ["TENANT_ADMIN", "TENANTADMIN", "SUPERADMIN", "BRANCHADMIN", "DELIVERYHEAD", "ACCOUNTMANAGER", "PODLEAD", "BDM"];
      return upperRoles.some((r) => managerRoles.includes(r));
    });
  }, [users]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  // Branch Admins see only their own branch (backend-scoped), so lock the branch filter
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pure dynamic role options from database (without any hardcoded role names or archetype if/else ladders)
  const roleFilterOptions = useMemo(() => {
    const effectiveBranch = isBranchAdmin
      ? (profile?.branchId || currentUser?.branchId || activeBranchId)
      : (branchFilter !== "ALL" && branchFilter !== "UNASSIGNED" ? branchFilter : null);

    // 1. Identify custom roles for the effective branch
    const branchCustomRoles = effectiveBranch
      ? rolesList.filter(
          (r) =>
            !r.isSystem &&
            r.branchId &&
            String(r.branchId).toLowerCase() === String(effectiveBranch).toLowerCase()
        )
      : [];

    const coveredArchetypes = new Set<string>();
    branchCustomRoles.forEach((cr) => {
      if (cr.systemRole) coveredArchetypes.add(cr.systemRole.toUpperCase().replace(/[\s-_]/g, ""));
      if (cr.baseRoleName) coveredArchetypes.add(cr.baseRoleName.toUpperCase().replace(/[\s-_]/g, ""));
      if (cr.name) coveredArchetypes.add(cr.name.toUpperCase().replace(/[\s-_]/g, ""));
    });

    // 2. Filter candidate roles
    const scopedRoles = rolesList.filter((r) => {
      if (effectiveBranch) {
        // If it's a custom role of this branch, keep it
        if (!r.isSystem && r.branchId && String(r.branchId).toLowerCase() === String(effectiveBranch).toLowerCase()) {
          return true;
        }
        // If it's a system role, check if covered by custom roles in this branch
        if (r.isSystem) {
          const sysNorm = (r.systemRole || "").toUpperCase().replace(/[\s-_]/g, "");
          const nameNorm = (r.name || "").toUpperCase().replace(/[\s-_]/g, "");
          if (coveredArchetypes.has(sysNorm) || coveredArchetypes.has(nameNorm)) return false;
          if (nameNorm === "TENANT_ADMIN" || nameNorm === "SUPERADMIN" || nameNorm === "TENANTADMIN") return false;
          return true;
        }
        return false;
      }

      if (branchFilter === "UNASSIGNED") {
        return !r.branchId;
      }

      return true;
    });

    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];

    for (const r of scopedRoles) {
      if (!r.name) continue;
      const rawName = r.name.trim();
      const norm = rawName.toUpperCase().replace(/[\s-_]/g, "");
      if (norm.startsWith("DEFAULTROLES") || norm === "OFFLINEACCESS" || norm === "UMAAUTHORIZATION" || norm === "SUPERADMIN") continue;

      let label = rawName;
      if (r.branchName && !effectiveBranch && branchFilter === "ALL") {
        label = `${rawName} (${r.branchName})`;
      }

      if (!seen.has(norm)) {
        seen.add(norm);
        options.push({ value: rawName, label });
      }
    }

    return options;
  }, [rolesList, isBranchAdmin, branchFilter, profile?.branchId, currentUser?.branchId, activeBranchId]);

  // Multi-select bulk action state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkRoleModalOpen, setIsBulkRoleModalOpen] = useState(false);
  const [bulkSelectedRoleIds, setBulkSelectedRoleIds] = useState<string[]>([]);
  const [isBulkMoveBranchModalOpen, setIsBulkMoveBranchModalOpen] = useState(false);
  const [targetMoveBranchId, setTargetMoveBranchId] = useState("");
  const [isBulkReviewerModalOpen, setIsBulkReviewerModalOpen] = useState(false);
  const [targetBulkReviewerId, setTargetBulkReviewerId] = useState("");

  // Dedicated Single Reviewer Assignment Modal State
  const [isReviewerModalOpen, setIsReviewerModalOpen] = useState(false);
  const [reviewerTargetUser, setReviewerTargetUser] = useState<UserItem | null>(null);
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>("");
  const [reviewerSearch, setReviewerSearch] = useState<string>("");

  // Active tab state: ALL members or PENDING role requests
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING">("ALL");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [branchRoleModalState, setBranchRoleModalState] = useState<{ branchId: string; branchName: string; isAddForm?: boolean } | null>(null);

  // Review & Approve Role Request Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewUser, setReviewUser] = useState<UserItem | null>(null);
  const [reviewForm, setReviewForm] = useState({
    roleCategory: "",
      roleId: "",
    roles: [] as string[],
    branchId: "",
    businessUnitId: "",
  });

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Add Member Form
  const [addForm, setAddForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    roles: [] as string[],
    branchId: "",
      businessUnitId: "",
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
      businessUnitId: "",
      jobReviewerId: "",
      roles: [] as string[],
  });

  // Password Reset Form
  const [newPassword, setNewPassword] = useState("");



  useEffect(() => {
    loadData(false);
  }, []);

  const loadData = async (showLoading: boolean | any = true) => {
    try {
      const shouldShowLoading = typeof showLoading === "boolean" ? showLoading : true;
      if (shouldShowLoading && !cachedUsersData) {
        setLoading(true);
      }
      const [usersData, branchesData, businessUnitsData, rolesData, profileData] = await Promise.all([
        atsApi.auth.listUsers().then((u) => { if (u) setUsers(u); return u; }).catch(() => []),
        atsApi.branches.list().then((b) => { if (b) setBranches(b); return b; }).catch(() => []),
          atsApi.businessUnits.list().then((bu) => { if (bu) setBusinessUnits(bu); return bu; }).catch(() => []),
        atsApi.auth.listRoles("ALL", true).then((r) => { if (r) setRolesList(r); return r; }).catch(() => []),
        atsApi.auth.me().then((p) => { if (p) setProfile(p); return p; }).catch(() => null),
      ]);
      setUsers(usersData || []);
      setBranches(branchesData || []);
      setRolesList(rolesData || []);
      setProfile(profileData);
      cachedUsersData = {
        users: usersData || [],
        branches: branchesData || [],
        rolesList: rolesData || [],
        profile: profileData,
        timestamp: Date.now(),
      };
      if (branchesData && branchesData.length > 0) {
        // Branch admins should default to their own branch, not the first branch in the list
        const userBranchId = profileData?.branchId || currentUser?.branchId;
        const defaultBranchId = (isBranchAdmin && userBranchId) ? userBranchId : branchesData[0].id;
        setAddForm((prev) => ({ ...prev, branchId: prev.branchId || defaultBranchId }));
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

    let addSysKey = "NONE";
    for (const r of addForm.roles) {
      const sr = rolesList.find(rl => rl.id === r || rl.name === r);
      if (sr && sr.isSystem) {
        const sysId = sr.systemRole || sr.system_role;
        if (sysId === "TENANT_ADMIN" || sysId === "SUPER_ADMIN") addSysKey = "TENANT_ADMIN";
        else if (sysId === "BRANCH_ADMIN") addSysKey = "BRANCH_ADMIN";
        else if (sysId === "UNIT_ADMIN") addSysKey = "UNIT_ADMIN";
      }
    }
    const isTenantOrBranchAdminAdd = addSysKey === 'TENANT_ADMIN' || addSysKey === 'BRANCH_ADMIN';
    
    if (!isTenantOrBranchAdminAdd && !addForm.businessUnitId) {
      return toast.error('Branch Unit is mandatory for staffing roles.');
    }

    try {
      setSubmitting(true);
      const tenantId = profile?.tenantId || currentUser?.tenantId || "";
      const primaryBranchId = addForm.branchId || (branches.length > 0 ? branches[0].id : "");
      const selectedRoles = Array.isArray(addForm.roles) && addForm.roles.length > 0 
        ? addForm.roles 
        : (rolesList.length > 0 ? [rolesList[0].name] : []);

      await atsApi.auth.registerUser({
        email: fullEmail,
        fullName: trimmedName,
        password: password,
        role: selectedRoles[0] || undefined,
        roles: selectedRoles,
        branchId: primaryBranchId || undefined,
              businessUnitId: addForm.businessUnitId || undefined,
        tenantId: tenantId,
        isApproved: true,
        sendEmailInvite: true,
      });

      // Synchronize full profile & branch roles
      try {
        const freshUsers = await atsApi.auth.listUsers();
        const createdUser = freshUsers.find((u: any) => u.email === fullEmail);
        if (createdUser) {
          await atsApi.auth.updateUserDetail(createdUser.id, {
            branchId: primaryBranchId || undefined,
              businessUnitId: addForm.businessUnitId || undefined,
            assignedRoleIds: getSelectedMemberRoleIds(addForm, rolesList),
          });
        }
      } catch (syncErr) {
        console.warn("Follow-up user details sync warning:", syncErr);
      }

      toast.success(`Successfully added ${trimmedName} (${fullEmail})!`);
      setIsAddModalOpen(false);
      setAddForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        roles: [],
        branchId: branches[0]?.id || "",
        businessUnitId: "",
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

    let editSysKey = "NONE";
    for (const r of editForm.roles) {
      const sr = rolesList.find(rl => rl.id === r || rl.name === r);
      if (sr && sr.isSystem) {
        const sysId = sr.systemRole || sr.system_role;
        if (sysId === "TENANT_ADMIN" || sysId === "SUPER_ADMIN") editSysKey = "TENANT_ADMIN";
        else if (sysId === "BRANCH_ADMIN") editSysKey = "BRANCH_ADMIN";
        else if (sysId === "UNIT_ADMIN") editSysKey = "UNIT_ADMIN";
      }
    }
    const isTenantOrBranchAdminEdit = editSysKey === 'TENANT_ADMIN' || editSysKey === 'BRANCH_ADMIN';
    
    if (!isTenantOrBranchAdminEdit && !editForm.businessUnitId) {
      return toast.error('Branch Unit is mandatory for staffing roles.');
    }

    try {
      setSubmitting(true);
      const finalRoles = getSelectedMemberRoleIds(editForm, rolesList);

      await atsApi.auth.updateUserDetail(selectedUser.id, {
        fullName: trimmedName,
        email: editEmail,
        branchId: editForm.branchId || undefined,
        businessUnitId: editForm.businessUnitId || undefined,
        jobReviewerId: editForm.jobReviewerId || null,
        assignedRoleIds: finalRoles,
      });

      const chosenReviewer = editForm.jobReviewerId
        ? users.find((u) => u.id === editForm.jobReviewerId)
        : null;

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                fullName: trimmedName,
                email: editEmail,
                branchId: editForm.branchId || null,
                businessUnitId: editForm.businessUnitId || null,
                jobReviewerId: editForm.jobReviewerId || null,
                jobReviewerName: chosenReviewer ? chosenReviewer.fullName : null,
                roles: finalRoles,
              }
            : u
        )
      );

      toast.success("User details updated successfully!");
      setIsEditModalOpen(false);
      setSelectedUser(null);
      await loadData();
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
      `Are you sure you want to permanently delete ${user.fullName} (${user.email})? This will remove all their access and credentials. This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      setSubmittingId(user.id);
      await atsApi.auth.deleteUser(user.id);
      toast.success(`User ${user.fullName} deleted successfully.`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user.");
    } finally {
      setSubmittingId(null);
    }
  };


  const availableReviewRoles = useMemo(() => {
    // 1. Tenant Admin (No Branch)
    if (reviewForm.branchId === "none") {
      const tenantRole = rolesList.find(r => r.isSystem && (r.name === 'Tenant Admin' || r.name === 'TENANT_ADMIN' || r.systemRole === 'TENANT_ADMIN'));
      return [{ id: tenantRole?.id || 'TENANT_ADMIN', name: 'Tenant Admin', systemRole: 'TENANT_ADMIN' }];
    }

    if (!reviewForm.branchId) {
      return [];
    }

    // 2. Branch Admin (Branch selected, No Unit)
    if (reviewForm.businessUnitId === "none") {
      const branchAdminRole = rolesList.find(r => (r.name?.toUpperCase() === 'BRANCH ADMIN' || r.systemRole === 'BRANCH_ADMIN'));
      const branchWideCustom = rolesList.filter(r => !r.isSystem && (r.branchId === reviewForm.branchId || r.branch_id === reviewForm.branchId) && (!r.businessUnitId && !r.business_unit_id));
      const list: any[] = [];
      list.push(branchAdminRole ? { id: branchAdminRole.id, name: 'Branch Admin', systemRole: 'BRANCH_ADMIN' } : { id: 'BRANCH_ADMIN', name: 'Branch Admin', systemRole: 'BRANCH_ADMIN' });
      branchWideCustom.forEach(r => list.push({ id: r.id, name: r.name, systemRole: r.systemRole }));
      return list;
    }

    if (!reviewForm.businessUnitId) {
      return [];
    }

    // 3. Branch Unit Admin & Staff Roles (Branch and Unit both selected)
    const unitAdminRole = rolesList.find(r => (r.name?.toUpperCase() === 'UNIT ADMIN' || r.systemRole === 'UNIT_ADMIN'));
    const unitHeadOption = unitAdminRole ? { id: unitAdminRole.id, name: 'Branch Unit Admin', systemRole: 'UNIT_ADMIN' } : { id: 'UNIT_ADMIN', name: 'Branch Unit Admin', systemRole: 'UNIT_ADMIN' };

    const unitCustomRoles = rolesList.filter(r => {
      if (r.isSystem) return false;
      const bId = r.branchId || r.branch_id;
      const uId = r.businessUnitId || r.business_unit_id;
      return bId === reviewForm.branchId && uId === reviewForm.businessUnitId;
    });

    const list: any[] = [unitHeadOption];
    unitCustomRoles.forEach(r => list.push({ id: r.id, name: r.name, systemRole: r.systemRole }));
    return list;
  }, [rolesList, reviewForm.branchId, reviewForm.businessUnitId]);

  const openReviewModal = (user: UserItem) => {
    setReviewUser(user);
    const reqUpper = (user.requestedRole || "").toUpperCase();
    const isReqTenant = reqUpper === 'TENANT_ADMIN' || reqUpper === 'TENANT_ADMIN' || reqUpper === 'TENANT ADMIN' || reqUpper === 'WORKSPACE_ADMIN' || reqUpper === 'WORKSPACE ADMINISTRATOR';
    const isReqBranchAdmin = reqUpper === 'BRANCH_ADMIN' || reqUpper === 'BRANCH ADMIN' || reqUpper === 'BRANCH ADMINISTRATOR';

    const initialBranchId = user.branchId || (isReqTenant ? 'none' : (branches[0]?.id || ''));
    const initialUnitId = user.businessUnitId || (isReqTenant || isReqBranchAdmin ? 'none' : '');

    // Resolve matching role
    let matchedRoleId = user.roleId || '';
    if (isReqTenant) {
      matchedRoleId = 'TENANT_ADMIN';
    } else if (isReqBranchAdmin) {
      matchedRoleId = 'BRANCH_ADMIN';
    } else if (reqUpper === 'UNIT_ADMIN' || reqUpper === 'UNIT ADMIN') {
      matchedRoleId = 'UNIT_ADMIN';
    } else if (user.requestedRole) {
      const match = rolesList.find(r => 
        r.name?.toUpperCase() === reqUpper || r.systemRole?.toUpperCase() === reqUpper
      );
      matchedRoleId = match?.id || user.requestedRole;
    }

    setReviewForm({
      roleId: matchedRoleId,
      roles: user.requestedRole ? [user.requestedRole] : (user.roles || []),
        roleCategory: isReqTenant ? "TENANT_ADMIN" : isReqBranchAdmin ? "BRANCH_ADMIN" : (reqUpper === "UNIT_ADMIN" || reqUpper === "UNIT ADMIN") ? "UNIT_ADMIN" : "EMPLOYEE",
      branchId: initialBranchId,
      businessUnitId: initialUnitId,
    });
    setIsReviewModalOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!reviewUser) return;

    const isTenantAdmin = reviewForm.branchId === "none" || reviewForm.roles.some(r => r.toUpperCase() === "TENANT_ADMIN" || r.toUpperCase() === "TENANT ADMIN");
    const isBranchAdmin = reviewForm.businessUnitId === "none" || reviewForm.roles.some(r => r.toUpperCase() === "BRANCH_ADMIN" || r.toUpperCase() === "BRANCH ADMIN");
    const isUnitAdminOrEmployee = !isTenantAdmin && !isBranchAdmin;

    if (!isTenantAdmin && (!reviewForm.branchId || reviewForm.branchId === "none")) {
      toast.error("Branch Office is mandatory.");
      return;
    }
    if (isBranchAdmin && (!reviewForm.branchId || reviewForm.branchId === "none")) {
      toast.error("Branch Office is mandatory for Branch Admin.");
      return;
    }
    if (isUnitAdminOrEmployee) {
      if (!reviewForm.branchId || reviewForm.branchId === "none") {
        toast.error("Branch Office is mandatory.");
        return;
      }
      if (!reviewForm.businessUnitId || reviewForm.businessUnitId === "none") {
        toast.error("Branch Unit is mandatory for staffing and unit head roles.");
        return;
      }
    }
    if (!reviewForm.roles || reviewForm.roles.length === 0) {
      toast.error("Please select at least one role to assign.");
      return;
    }

    try {
      setSubmittingId(reviewUser.id);
      
      const finalBranchId = reviewForm.branchId === "none" ? undefined : reviewForm.branchId;
      const finalUnitId = (reviewForm.branchId === "none" || reviewForm.businessUnitId === "none") ? undefined : reviewForm.businessUnitId;

      await atsApi.auth.approveUser(reviewUser.id, {
        roleId: reviewForm.roleId || undefined,
        roles: reviewForm.roles,
        branchId: finalBranchId,
        businessUnitId: finalUnitId,
      });
      toast.success(`User ${reviewUser.fullName || reviewUser.email} approved and activated!`);
      setIsReviewModalOpen(false);
      setReviewUser(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve user.");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleApproveUser = async (user: UserItem) => {
    openReviewModal(user);
  };

  const handleRejectUser = async (user: UserItem) => {
    const confirmReject = window.confirm(
      `Are you sure you want to reject the registration request for ${user.fullName || user.email}? This will remove their pending registration.`
    );
    if (!confirmReject) return;

    try {
      setSubmittingId(user.id);
      await atsApi.auth.rejectUser(user.id);
      toast.success(`Registration request for ${user.email} was rejected.`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject user.");
    } finally {
      setSubmittingId(null);
    }
  };

  // Bulk Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(filteredUsers.filter((u) => canManageUser(u)).map((u) => u.id));
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
      `Are you sure you want to permanently delete ${selectedUserIds.length} selected team member(s)? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      await Promise.all(
        selectedUserIds.map((id) => {
          if (profile?.id === id) return Promise.resolve();
          return atsApi.auth.deleteUser(id).catch(() => null);
        })
      );
      toast.success(`Successfully deleted ${selectedUserIds.length} user(s)!`);
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
      return toast.error("Please select at least one role to assign.");
    }
    try {
      setLoading(true);
      await Promise.all(
        selectedUserIds.map((id) =>
          atsApi.auth.assignUserRoles(id, bulkSelectedRoleIds, false).catch(() => null)
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

  const handleBulkAssignReviewer = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      setLoading(true);
      await atsApi.auth.bulkSetJobReviewer(selectedUserIds, targetBulkReviewerId || null);
      toast.success(`Updated Manager for ${selectedUserIds.length} user(s)!`);
      setIsBulkReviewerModalOpen(false);
      setSelectedUserIds([]);
      setTargetBulkReviewerId("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed bulk reviewer assignment.");
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

  // Helper to dedupe roles case-insensitively and space/underscore-insensitively
  const dedupeCaseInsensitiveRoles = (roleList: (string | undefined | null)[], bId?: string): string[] => {
    const seen = new Set<string>();
    const res: string[] = [];
    for (const r of roleList) {
      if (!r || typeof r !== "string") continue;
      const formatted = formatRoleLabel(r, bId);
      const canonicalKey = formatted.trim().toUpperCase().replace(/[\s-_]+/g, "");
      if (!seen.has(canonicalKey)) {
        seen.add(canonicalKey);
        res.push(formatted);
      }
    }
    return res;
  };

  // Unified helper to resolve human-readable labels from dynamic custom roles
  const formatRoleLabel = (r: string, bId?: string): string => {
    if (!r || typeof r !== "string") return "";
    const upper = r.trim().toUpperCase();

    // 1. Dynamic lookup from database rolesList
    const customRole = (rolesList || []).find(
      (cr) =>
        (!bId || !cr.branchId || cr.branchId === bId) &&
        (cr.id === r || cr.name?.toUpperCase() === upper || (cr.systemRole && cr.systemRole.toUpperCase() === upper))
    ) || (rolesList || []).find(
      (cr) =>
        cr.id === r || cr.name?.toUpperCase() === upper || (cr.systemRole && cr.systemRole.toUpperCase() === upper)
    );

    if (customRole) {
      return customRole.name;
    }

    if (upper === "TENANT_ADMIN" || upper === "SUPER_ADMIN" || upper === "TENANT ADMIN") {
      return "Tenant Admin";
    }
    if (upper === "RECRUITER") return "Recruiter";
    if (upper === "ACCOUNT_MANAGER" || upper === "ACCOUNT MANAGER") return "Account Manager";
    if (upper === "DELIVERY_HEAD" || upper === "DELIVERY HEAD") return "Delivery Head";
    if (upper === "BRANCH_ADMIN" || upper === "BRANCH ADMIN") return "Branch Admin";
    if (upper === "POD_LEAD" || upper === "POD LEAD") return "Pod Lead";

    // If string is a raw UUID and not yet matched
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(r)) {
      return "Recruiter";
    }

    return r.replace(/_/g, " ");
  };

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
          roles: dedupeCaseInsensitiveRoles(u.branchRoles[targetBranchId])
        }];
      }
    }

    if (u.branchRoles && Object.keys(u.branchRoles).length > 0) {
      const groups: BranchRoleGroup[] = [];
      Object.entries(u.branchRoles).forEach(([bId, rList]) => {
        if (Array.isArray(rList) && rList.length > 0) {
          const bName = resolveBranchName(bId);
          const deduped = dedupeCaseInsensitiveRoles(rList);
          if (deduped.length > 0) {
            groups.push({
              branchId: bId,
              branchName: bName,
              roles: deduped
            });
          }
        }
      });
      if (groups.length > 0) return groups;
    }

    const defaultRoles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.roleName || "RECRUITER"];
    const singleBranchName = u.branchId ? resolveBranchName(u.branchId) : undefined;
    return [{
      branchId: u.branchId || undefined,
      branchName: singleBranchName,
      roles: dedupeCaseInsensitiveRoles(defaultRoles)
    }];
  };

  const getUserEffectiveRoles = (u: UserItem, selectedBranchFilter: string = "ALL") => {
    if (!u) return [];
    const groups = getUserEffectiveRoleGroups(u, selectedBranchFilter);
    return dedupeCaseInsensitiveRoles(groups.flatMap((g) => g.roles || []));
  };

  const modalFilteredReviewers = useMemo(() => {
    const list = eligibleReviewers.filter(
      (u) => reviewerTargetUser && u.id !== reviewerTargetUser.id
    );
    if (!reviewerSearch.trim()) return list;
    const q = reviewerSearch.toLowerCase().trim();
    return list.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.roleName?.toLowerCase().includes(q) ||
        (u.roles && u.roles.some((r) => r.toLowerCase().includes(q))) ||
        (u.branchName && u.branchName.toLowerCase().includes(q))
    );
  }, [eligibleReviewers, reviewerTargetUser, reviewerSearch]);

  // Dynamic role names for target user's branch hierarchy
  const dynamicHierarchyText = useMemo(() => {
    if (!reviewerTargetUser) return "Delivery Head, Pod Lead, or Branch Admin";
    const userBranchId = reviewerTargetUser.branchId || (reviewerTargetUser as any)?.branch_id;

    // 1. Discover roles configured for this branch
    const branchRoles = rolesList.filter(
      (r) => r.branchId && userBranchId && String(r.branchId).toLowerCase() === String(userBranchId).toLowerCase()
    );

    const leaderNames: string[] = [];
    const targetArchetypes = ["POD_LEAD", "DELIVERY_HEAD", "BRANCH_ADMIN", "ACCOUNT_MANAGER", "BDM"];

    targetArchetypes.forEach((arch) => {
      const match = branchRoles.find((r) => {
        const sys = (r.systemRole || "").toUpperCase().replace(/[\s-_]/g, "");
        const base = (r.baseRoleName || "").toUpperCase().replace(/[\s-_]/g, "");
        const name = (r.name || "").toUpperCase().replace(/[\s-_]/g, "");
        const target = arch.replace(/_/g, "");
        return sys === target || base === target || name.includes(target);
      });
      if (match?.name && !leaderNames.includes(match.name)) {
        leaderNames.push(match.name);
      }
    });

    // 2. Fallback to rolesList if no branch custom roles
    if (leaderNames.length === 0) {
      rolesList.forEach((r) => {
        const nameUpper = (r.name || "").toUpperCase();
        if (
          nameUpper.includes("POD LEAD") ||
          nameUpper.includes("DELIVERY HEAD") ||
          nameUpper.includes("BRANCH ADMIN")
        ) {
          if (!leaderNames.includes(r.name)) leaderNames.push(r.name);
        }
      });
    }

    // 3. Find tenant admin dynamic name
    const adminRole =
      rolesList.find(
        (r) =>
          r.isSystem &&
          (r.systemRole === "TENANT_ADMIN" ||
            r.name?.toLowerCase().includes("tenant admin") ||
            r.name?.toLowerCase().includes("administrator"))
      )?.name || "Tenant Admin";

    if (!leaderNames.some((n) => n.toLowerCase().includes("admin"))) {
      leaderNames.push(adminRole);
    }

    if (leaderNames.length === 0) {
      return `Delivery Head, Pod Lead, or ${adminRole}`;
    }

    if (leaderNames.length === 1) return leaderNames[0];
    if (leaderNames.length === 2) return `${leaderNames[0]} or ${leaderNames[1]}`;
    return `${leaderNames.slice(0, -1).join(", ")}, or ${leaderNames[leaderNames.length - 1]}`;
  }, [reviewerTargetUser, rolesList]);

  const openReviewerModal = (user: UserItem) => {
    if (!user) return;
    setReviewerTargetUser(user);
    const existingReviewerId = user.jobReviewerId || (user as any).job_reviewer_id || "";
    setSelectedReviewerId(existingReviewerId);
    setReviewerSearch("");
    setIsReviewerModalOpen(true);
  };

  const handleSaveSingleReviewer = async (customId?: string | null) => {
    if (!reviewerTargetUser) return;
    const finalReviewerId = customId !== undefined ? customId : (selectedReviewerId || null);

    try {
      setSubmitting(true);
      await atsApi.auth.updateUserDetail(reviewerTargetUser.id, {
        jobReviewerId: finalReviewerId,
      });
      toast.success(
        finalReviewerId
          ? `Designated manager assigned for ${reviewerTargetUser.fullName}!`
          : `Manager reset to Auto (Hierarchy) for ${reviewerTargetUser.fullName}!`
      );
      setIsReviewerModalOpen(false);
      setReviewerTargetUser(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update designated manager.");
    } finally {
      setSubmitting(false);
    }
  };

  const openAddModal = async () => {
    try {
      const freshRoles = await atsApi.auth.listRoles("ALL", true);
      if (freshRoles && Array.isArray(freshRoles)) {
        setRolesList(freshRoles);
      }
    } catch (e) {}

    const userBranchId = profile?.branchId || currentUser?.branchId;
    const defaultBranchId = (isBranchAdmin && userBranchId) ? userBranchId : (branches[0]?.id || "");
    setAddForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      roles: [],
        branchId: defaultBranchId,
        businessUnitId: "",
        sendEmailInvite: false,
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setEmailStatus("idle");
    setEmailCheckMsg("");
    setIsAddModalOpen(true);
  };



  const openEditModal = (user: UserItem) => {
    if (!user) return;
    atsApi.auth.listRoles("ALL", true).then((freshRoles) => {
      if (freshRoles && Array.isArray(freshRoles)) {
        setRolesList(freshRoles);
      }
    }).catch(() => {});

    setSelectedUser(user);
    const nameParts = (user.fullName || "").trim().split(" ");
    const fName = nameParts[0] || "";
    const lName = nameParts.slice(1).join(" ") || "";
    const rawRoles = getUserEffectiveRoles(user, "ALL");
    setEditForm({
      firstName: fName,
      lastName: lName,
      email: user.email || "",
      branchId: user.branchId || "",
      businessUnitId: user.businessUnitId || (user as any).business_unit_id || "",
      jobReviewerId: user.jobReviewerId || (user as any).job_reviewer_id || "",
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
      userRolesList.some((r) => {
        if (typeof r !== "string") return false;
        const rNorm = r.toUpperCase().replace(/[\s-_]/g, "");
        const filterNorm = roleFilter.toUpperCase().replace(/[\s-_]/g, "");
        if (rNorm === filterNorm || r.toUpperCase() === roleFilter.toUpperCase()) return true;
        if ((filterNorm === "TENANTADMIN" || filterNorm === "TENANT_ADMIN") && (rNorm === "TENANTADMIN" || rNorm === "TENANT_ADMIN")) return true;
        return false;
      });

    const matchesBranch =
      branchFilter === "ALL" ||
      (branchFilter === "UNASSIGNED"
        ? !u.branchId
        : (u.assignedBranchIds && u.assignedBranchIds.includes(branchFilter)) || u.branchId === branchFilter || u.branchName === branchFilter);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PENDING"
        ? u.isApproved === false
        : statusFilter === "ACTIVE"
        ? u.isActive && u.isApproved !== false
        : !u.isActive && u.isApproved !== false);

    const matchesTab = activeTab === "ALL" || u.isApproved === false;

    return matchesSearch && matchesRole && matchesBranch && matchesStatus && matchesTab;
  }).sort((a, b) => {
    const aPending = a.isApproved === false ? 1 : 0;
    const bPending = b.isApproved === false ? 1 : 0;
    if (aPending !== bPending) return bPending - aPending; // Pending role requests ALWAYS appear at the top!
    return 0;
  });

  const activeSeats = users.filter((u) => u.isActive).length;
  const pendingApprovalsCount = users.filter((u) => u.isApproved === false).length;
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
            <span className="font-bold text-indigo-600">
              {loading && users.length === 0 ? <span className="animate-pulse">...</span> : activeSeats}
            </span>
            <span className="text-default-600 font-semibold"> / {userLimit} Seats</span>
          </div>

          <Button
            onClick={() => {
              if (activeSeats >= userLimit) {
                toast.error(`Seat limit reached! (${userLimit} active licenses). Deactivate a user first or upgrade plan.`);
                return;
              }
              openAddModal();
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="h-4 w-4" /> Add Team Member
          </Button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-default-200 dark:border-slate-800 pb-0">
        <button
          type="button"
          onClick={() => {
            setActiveTab("ALL");
            if (statusFilter === "PENDING") setStatusFilter("ALL");
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer",
            activeTab === "ALL"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-default-500 hover:text-default-800 dark:hover:text-neutral-200"
          )}
        >
          <Users className="w-3.5 h-3.5" />
          All Team Members
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-default-100 dark:bg-slate-800 text-default-600 dark:text-neutral-300 font-semibold">
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("PENDING");
            setStatusFilter("ALL");
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer relative",
            activeTab === "PENDING"
              ? "border-amber-500 text-amber-700 dark:text-amber-400"
              : "border-transparent text-default-500 hover:text-default-800 dark:hover:text-neutral-200"
          )}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          Pending Role Requests
          {pendingApprovalsCount > 0 ? (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              ({pendingApprovalsCount})
            </span>
          ) : (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-default-100 text-default-400 font-medium">
              (0)
            </span>
          )}
        </button>
      </div>

      {/* STANDARD FILTER & SEARCH TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 border border-default-200 dark:border-slate-800 rounded-lg p-3 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* SEARCH BOX */}
          <div className="relative flex-1 min-w-[240px]">
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
              {roleFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* BRANCH FILTER — hidden for Branch Admins (backend already scopes to their branch) */}
            {!isBranchAdmin && !isUnitAdmin && (
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
            )}

            {/* STATUS FILTER */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs rounded-md border border-default-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 font-medium text-default-700 dark:text-neutral-200 outline-none hover:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">
                Pending Approval ${pendingApprovalsCount > 0 ? `(${pendingApprovalsCount})` : ""}
              </option>
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
                        setBulkSelectedRoleIds([]);
                        setIsBulkRoleModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-neutral-800 dark:text-neutral-200 font-semibold"
                    >
                      <Shield className="h-3.5 w-3.5 text-indigo-600" /> Roles...
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
                      onClick={() => {
                        setTargetBulkReviewerId("");
                        setIsBulkReviewerModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-neutral-800 dark:text-neutral-200 font-semibold"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-indigo-600" /> Assign Manager...
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
                      onClick={openAddModal}
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
                      onClick={() => window.location.href = "/settings/branch"}
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
                <a href="/settings/branch">
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
                      checked={
                        filteredUsers.filter((u) => canManageUser(u)).length > 0 &&
                        selectedUserIds.length === filteredUsers.filter((u) => canManageUser(u)).length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Work Email</th>
                  <th className="py-3 px-4">Assigned Role(s)</th>
                  {!isUnitAdmin && <th className="py-3 px-4">Branch Location</th>}
                  {!isUnitAdmin && <th className="py-3 px-4">Branch Unit</th>}
                  <th className="py-3 px-4">Manager</th>
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
                        {canManageUser(user) ? (
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => handleSelectRow(user.id)}
                            className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer"
                          />
                        ) : (
                          <span className="inline-block w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600">-</span>
                        )}
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
                              {user.isApproved === false && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                  Pending Approval
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
                        {user.isApproved === false ? (
                          <div className="flex items-center">
                            {canManageUser(user) && (
                              <Button
                                size="sm"
                                onClick={() => openReviewModal(user)}
                                disabled={submittingId === user.id}
                                className="h-7 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                              >
                                <Shield className="w-3.5 h-3.5" />
                                Review
                              </Button>
                            )}
                          </div>
                        ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {(() => {
                            const groups = getUserEffectiveRoleGroups(user, branchFilter);
                            const hasMultipleBranches = (user.assignedBranchIds && user.assignedBranchIds.length > 1) ||
                              (user.branchRoles && Object.keys(user.branchRoles).length > 1);

                            const groupEls = groups.map((group, idx) => {
                              const roleLabels = dedupeCaseInsensitiveRoles(group.roles, group.branchId);
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
                            return (
                              <>
                                {groupEls}
                                {canManageUser(user) && (
                                  <button
                                    type="button"
                                    onClick={() => { setEditModalTab("STAFF"); openEditModal(user); }}
                                    className="inline-flex items-center justify-center h-5 w-5 rounded text-sm font-medium text-neutral-500 bg-neutral-100/80 border border-neutral-200/80 hover:bg-neutral-200 hover:text-neutral-700 dark:bg-slate-800 dark:border-slate-700 dark:text-neutral-400 dark:hover:bg-slate-700 dark:hover:text-neutral-200 transition-colors cursor-pointer shrink-0 mt-0.5"
                                    title="Assign Staff Role"
                                  >
                                    +
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        )}
                      </td>

                      {/* Branch Location — Plain Comma-Separated Text */}
                      {(!isUnitAdmin) && <td className="py-3 px-4 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        {(() => {
                          const assignedIds = (user.assignedBranchIds && user.assignedBranchIds.length > 0)
                            ? user.assignedBranchIds
                            : (user.branchId ? [user.branchId] : []);

                          const branchNames = assignedIds.map((id) => {
                            const bObj = branches.find((b) => b.id === id);
                            if (!bObj) return user.branchName || id;
                            return bObj.name;
                          });

                          return assignedIds.length === 0 ? (
                            <span className="text-neutral-400 font-normal">-- Unassigned (HQ Shared) --</span>
                          ) : (
                            <span className="truncate max-w-[220px] inline-block font-medium text-neutral-800 dark:text-neutral-200" title={branchNames.join(", ")}>
                              🏢 {branchNames.join(", ")}
                            </span>
                          );
                        })()}
                      </td>}

                      {/* Branch Unit */}
                      {(!isUnitAdmin) && <td className="py-3 px-4 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        {user.businessUnitName ? (
                          <span className="truncate max-w-[150px] inline-block font-medium">
                            {user.businessUnitName}
                          </span>
                        ) : (
                          <span className="text-neutral-400 font-normal">--</span>
                        )}
                      </td>}

                      {/* Designated Job Reviewer */}
                      <td className="py-3 px-4 text-xs font-semibold">
                        {(() => {
                          const reviewerId = user.jobReviewerId || (user as any).job_reviewer_id;
                          const reviewerUser = reviewerId ? users.find((u) => u.id === reviewerId) : null;
                          const reviewerName = user.jobReviewerName || (user as any).job_reviewer_name || reviewerUser?.fullName;

                          if (reviewerName) {
                            return (
                              <button
                                type="button"
                                onClick={() => openReviewerModal(user)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                                title="Click to change designated Manager"
                              >
                                <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>{reviewerName}</span>
                              </button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={() => openReviewerModal(user)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 transition-colors cursor-pointer"
                              title="Assign a Manager"
                            >
                              + Assign
                            </button>
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
                        {canManageUser(user) ? (
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-full hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-500 hover:text-neutral-900 dark:hover:white cursor-pointer"
                                title="User Actions Menu"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xl rounded-lg p-1 text-xs">
                              
                              {user.isApproved === false && canManageUser(user) && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => openReviewModal(user)}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold"
                                  >
                                    <Shield className="h-3.5 w-3.5 text-indigo-600" /> Review & Approve Request
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleRejectUser(user)}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 font-medium"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Reject Registration
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="my-1 border-neutral-100 dark:border-slate-800" />
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => openEditModal(user)}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-neutral-800 dark:text-neutral-200 font-medium"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-indigo-600" /> Edit Profile & Roles
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => openReviewerModal(user)}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-neutral-800 dark:text-neutral-200 font-medium"
                              >
                                <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Assign Manager
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

                              <DropdownMenuSeparator className="my-1 border-neutral-100 dark:border-slate-800" />

                              <DropdownMenuItem
                                onClick={() => handleDeleteUser(user)}
                                disabled={isCurrent}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-medium"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete Team Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-[10px] text-neutral-400 italic px-2 py-0.5 bg-neutral-50 dark:bg-slate-800 rounded border border-neutral-200 dark:border-slate-700">
                            View Only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REVIEW & APPROVE ROLE REQUEST MODAL */}
      {isReviewModalOpen && reviewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between bg-neutral-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Review & Approve Role Request
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Review request details, configure branch office and unit, then approve access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReviewModalOpen(false);
                  setReviewUser(null);
                }}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* User Summary Card */}
              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {reviewUser.fullName || "User"}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-200">
                      Pending Request
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {reviewUser.email}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px]">
                  <div>
                    <span className="text-neutral-400 block text-[10px] font-medium">Requested Role:</span>
                    <span className="font-bold text-amber-800 dark:text-amber-300">
                      {reviewUser.requestedRole ? reviewUser.requestedRole.replace(/_/g, " ") : "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] font-medium">Requested Branch:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {branches.find(b => b.id === reviewUser.branchId)?.name || (reviewUser.requestedRole?.toUpperCase() === 'TENANT_ADMIN' ? "None (HQ)" : "None")}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] font-medium">Requested Unit:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {businessUnits.find(u => u.id === reviewUser.businessUnitId)?.name || (reviewUser.requestedRole?.toUpperCase() === 'BRANCH_ADMIN' ? "Branch-Wide" : "None")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Controls */}
<div className="space-y-4">
  {/* 1. Select Role Category */}
  <div>
    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
      1. Select Role Category
    </label>
    <div className="grid grid-cols-2 gap-2.5">
      {[
        { id: "EMPLOYEE", title: "Branch Employee", icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40" },
        { id: "BRANCH_ADMIN", title: "Branch Admin", icon: Building2, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/40" },
        { id: "UNIT_ADMIN", title: "Branch Unit Admin", icon: Briefcase, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
        { id: "TENANT_ADMIN", title: "Workspace Admin", icon: Shield, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/40" }
      ].map((cat) => {
        const isSelected = reviewForm.roleCategory === cat.id;
        const Icon = cat.icon;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setReviewForm(prev => {
                const updates: { roleCategory: string; roles: string[]; roleId: string; branchId?: string; businessUnitId?: string } = { roleCategory: cat.id, roles: [], roleId: "" };
                if (cat.id === "TENANT_ADMIN") {
                  updates.branchId = "none";
                  updates.businessUnitId = "none";
                  updates.roles = ["Tenant Admin"];
                  updates.roleId = "TENANT_ADMIN";
                } else if (cat.id === "BRANCH_ADMIN") {
                  updates.businessUnitId = "none";
                  updates.roles = ["Branch Admin"];
                  updates.roleId = "BRANCH_ADMIN";
                  if (prev.branchId === "none") updates.branchId = "";
                } else if (cat.id === "UNIT_ADMIN") {
                  updates.roles = ["Unit Admin"];
                  updates.roleId = "UNIT_ADMIN";
                  if (prev.branchId === "none") updates.branchId = "";
                  if (prev.businessUnitId === "none") updates.businessUnitId = "";
                } else {
                  if (prev.branchId === "none") updates.branchId = "";
                  if (prev.businessUnitId === "none") updates.businessUnitId = "";
                }
                return { ...prev, ...updates };
              });
            }}
            className={cn(
              "relative flex flex-col items-start p-3 rounded-xl transition-all duration-200 border-2 text-left group cursor-pointer",
              isSelected
                ? "border-indigo-600 bg-white dark:bg-slate-800 shadow-md ring-2 ring-indigo-600/10"
                : "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("p-1.5 rounded-lg", cat.bg, cat.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs text-neutral-900 dark:text-white leading-tight">
                {cat.title}
              </h4>
            </div>
          </button>
        );
      })}
    </div>
  </div>

  {reviewForm.roleCategory !== "TENANT_ADMIN" && (
    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
      <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
        2. Branch & Unit Selection
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">Office Branch *</label>
          {isBranchAdmin || isUnitAdmin ? (
             <div className="flex items-center gap-2 h-9 px-3 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>
                   {(() => {
                      const b = branches.find((b) => b.id === reviewForm.branchId);
                      return b ? b.name : "Assigned Branch";
                   })()}
                </span>
             </div>
          ) : (
          <Select
            value={reviewForm.branchId || undefined}
            onValueChange={(val) => {
              setReviewForm(prev => ({ ...prev, branchId: val, businessUnitId: prev.roleCategory === "BRANCH_ADMIN" ? "none" : "" }));
            }}
          >
            <SelectTrigger className="h-9 text-xs rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <SelectValue placeholder="Select Office Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}{b.city ? ` - ${b.city}` : ""}{b.state ? `, ${b.state}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
        </div>
        {reviewForm.roleCategory !== "BRANCH_ADMIN" && (
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">Branch Unit *</label>
            {isUnitAdmin ? (
               <div className="flex items-center gap-2 h-9 px-3 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  <span>
                     {(() => {
                        const bu = businessUnits.find((u) => u.id === reviewForm.businessUnitId);
                        return bu ? bu.name : "Assigned Unit";
                     })()}
                  </span>
               </div>
            ) : (
            <select
              value={reviewForm.businessUnitId}
              onChange={(e) => setReviewForm(prev => ({ ...prev, businessUnitId: e.target.value }))}
              className="w-full h-9 px-3 text-xs rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              disabled={!reviewForm.branchId || reviewForm.branchId === "none"}
            >
              <option value="">-- Select Branch Unit --</option>
              {businessUnits.filter(u => u.branchId === reviewForm.branchId || u.branch_id === reviewForm.branchId).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            )}
          </div>
        )}
      </div>
    </div>
  )}

  {reviewForm.roleCategory === "EMPLOYEE" && reviewForm.branchId && reviewForm.businessUnitId && reviewForm.branchId !== "none" && reviewForm.businessUnitId !== "none" && (
    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
      <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
        3. Assign Role <span className="text-rose-500">*</span>
      </label>
      {availableReviewRoles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {availableReviewRoles.map((r) => {
            const isChecked = reviewForm.roles.includes(r.name) || reviewForm.roles.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  const checked = !isChecked;
                  let nextRoles = reviewForm.roles.filter((x) => x !== r.name && x !== r.id);
                  if (checked) nextRoles.push(r.name);
                  setReviewForm({ 
                    ...reviewForm, 
                    roles: nextRoles, 
                    roleId: checked ? r.id : (nextRoles.length > 0 ? reviewForm.roleId : "") 
                  });
                }}
                className={cn(
                  "p-2 rounded-xl border text-left transition-all duration-200 flex items-start gap-2 cursor-pointer select-none",
                  isChecked ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-600/10" : "border-slate-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800/60"
                )}
              >
                <span className={cn(
                  "w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                  isChecked ? "border-indigo-600 bg-indigo-600 text-white" : "border-neutral-300 dark:border-slate-600"
                )}>
                  {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>
                <div>
                  <div className="text-[11px] font-bold text-neutral-900 dark:text-white leading-tight">{r.name}</div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-3 text-center text-[11px] text-neutral-500 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-800">
          No roles configured for this unit yet.
        </div>
      )}
    </div>
  )}
</div>

              </div>
              {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-neutral-200 dark:border-slate-800 flex items-center justify-between bg-neutral-50/80 dark:bg-slate-800/50">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  if (reviewUser) {
                    setIsReviewModalOpen(false);
                    handleRejectUser(reviewUser);
                  }
                }}
                className="text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
              >
                Reject Request
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setIsReviewModalOpen(false);
                    setReviewUser(null);
                  }}
                  className="text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="button"
                  onClick={handleConfirmApproval}
                  disabled={submittingId === reviewUser.id}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingId === reviewUser.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Approve & Activate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-indigo-600" /> Add Team Member
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Create a new staff account with their primary office branch and assigned roles.
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} autoComplete="off" className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* FIRST NAME + LAST NAME GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">First Name *</label>
                  <Input
                    value={addForm.firstName}
                    onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                    placeholder="e.g. Rajesh"
                    className="h-8.5 text-xs rounded border-neutral-300 dark:border-slate-700"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Last Name *</label>
                  <Input
                    value={addForm.lastName}
                    onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                    placeholder="e.g. Kumar"
                    className="h-8.5 text-xs rounded border-neutral-300 dark:border-slate-700"
                    required
                  />
                </div>
              </div>

              {/* WORK EMAIL & PRIMARY BRANCH */}
              <div className="grid grid-cols-1  gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Work Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="e.g. rajesh.kumar@company.com"
                    className={`h-8.5 text-xs rounded-lg ${
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

                {/* --- END OF WORK EMAIL GRID --- */}
              </div>

              {/* TABS FOR ADD MODAL */}
              <div className="flex border-b border-neutral-200 dark:border-slate-800 mb-4 pt-4">
                <button type="button" onClick={() => setAddModalTab("STAFF")} className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${addModalTab === "STAFF" ? "border-indigo-600 text-indigo-600" : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"}`}>Staff & Business Roles</button>
                <button type="button" onClick={() => setAddModalTab("TENANT_ADMIN")} className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${addModalTab === "TENANT_ADMIN" ? "border-indigo-600 text-indigo-600" : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"}`}>Administrative Access</button>
              </div>

              {/* ADMINISTRATIVE ACCESS & STAFF ROLES LOGIC */}
              {(() => {
                const getAdminSysKey = (rolesArray: string[]) => {
  for (const r of rolesArray) {
    const sr = rolesList.find(rl => rl.id === r);
    if (sr && sr.isSystem) {
      const sysId = sr.systemRole || sr.system_role;
      if (sysId === "TENANT_ADMIN" || sysId === "SUPER_ADMIN") return "TENANT_ADMIN";
      if (sysId === "BRANCH_ADMIN") return "BRANCH_ADMIN";
      if (sysId === "UNIT_ADMIN") return "UNIT_ADMIN";
    }
  }
  return "NONE";
};

                const addFormAdminRole = getAdminSysKey(addForm.roles);

                const handleAddAdminRoleChange = (targetSysKey: string) => {
                  let nextRoles = addForm.roles.filter(r => {
                    const sr = rolesList.find(rl => rl.id === r);
                    return !(sr && sr.isSystem);
                  });

                  if (targetSysKey !== "NONE") {
                    const newAdminRole = rolesList.find(rl => {
                      if (!rl.isSystem) return false;
                      const sysId = rl.systemRole || rl.system_role;
                      if (targetSysKey === "TENANT_ADMIN") return sysId === "TENANT_ADMIN" || sysId === "SUPER_ADMIN";
                      if (targetSysKey === "BRANCH_ADMIN") return sysId === "BRANCH_ADMIN";
                      if (targetSysKey === "UNIT_ADMIN") return sysId === "UNIT_ADMIN";
                      return false;
                    });
                    if (newAdminRole) {
                      nextRoles.push(newAdminRole.id);
                    } else {
                      alert("Error: Could not find system role ID for " + targetSysKey + ". Available: " + rolesList.filter(r => r.isSystem).map(r => r.name + ":" + (r.systemRoleId || r.system_role_id)).join(", "));
                    }
                  }
                  
                  // Retain business unit for Branch Admin so they can also have custom roles (like Recruiter)
                  setAddForm(prev => ({
                    ...prev, 
                    roles: nextRoles,
                    branchId: targetSysKey === "TENANT_ADMIN" ? "" : prev.branchId,
                    businessUnitId: targetSysKey === "TENANT_ADMIN" ? "" : prev.businessUnitId
                  }));
                };

                const branchRolesForAdd = (rolesList || []).filter((r) => {
                  if (r.isSystem) return false;
                  if (!addForm.businessUnitId) return false;
                  const rBUId = r.businessUnitId || (r as any).business_unit_id;
                  if (!rBUId) return false;
                  return String(rBUId).toLowerCase() === String(addForm.businessUnitId).toLowerCase();
                });

                return (
                  <div>
                    {addModalTab === "TENANT_ADMIN" && (
                      <div className="space-y-4 mb-4">
                        <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-2">Select Administrative Level</label>
                        <div className="flex flex-wrap gap-4">
                          {[
                            { key: "TENANT_ADMIN", label: "Tenant Admin", show: isTenantAdmin },
                            { key: "BRANCH_ADMIN", label: "Branch Admin", show: isTenantAdmin || isBranchAdmin },
                            { key: "UNIT_ADMIN", label: "Branch Unit Admin", show: isTenantAdmin || isBranchAdmin || isUnitAdmin }
                          ].filter(r => r.show).map((role) => {
                            const isChecked = addFormAdminRole === role.key;
                            return (
                              <label key={role.key} className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={isChecked} 
                                  onChange={() => {
                                    if (isChecked) handleAddAdminRoleChange("NONE");
                                    else handleAddAdminRoleChange(role.key);
                                  }} 
                                  className="h-4 w-4 accent-indigo-600 cursor-pointer rounded" 
                                />
                                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 select-none">{role.label}</span>
                              </label>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2">Administrative roles grant system-wide permissions across the entire scope (Tenant, Branch, or Unit).</p>

                        {(addFormAdminRole === "BRANCH_ADMIN" || addFormAdminRole === "UNIT_ADMIN") && (
                           <div className="space-y-3 pt-3 mt-4 border-t border-neutral-100 dark:border-slate-800">
                             <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Assign Administrative Scope</label>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Office Branch *</label>
                                  {isBranchAdmin || isUnitAdmin ? (
                                    <div className="flex items-center gap-2 h-8.5 px-3 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                      <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                                      <span>
                                        {(() => {
                                          const b = assignedBranches.find((b) => b.id === addForm.branchId) || branches.find((b) => b.id === addForm.branchId);
                                          if (!b) return "Assigned Branch";
                                          return `${b.name}${b.city ? ` - ${b.city}` : ""}${b.state ? `, ${b.state}` : ""}`;
                                        })()}
                                      </span>
                                    </div>
                                  ) : (
                                    <Select value={addForm.branchId || ""} onValueChange={(val) => setAddForm((prev) => ({ ...prev, branchId: val, businessUnitId: "" }))} required>
                                      <SelectTrigger className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-semibold text-neutral-900 dark:text-white outline-none hover:border-indigo-500">
                                        <SelectValue placeholder="Select Primary Branch..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {assignedBranches.map((b) => (
                                          <SelectItem key={b.id} value={b.id} className="text-xs">
                                            <div className="flex flex-col text-left">
                                              <span className="font-semibold text-neutral-900 dark:text-white">{b.name}</span>
                                              {(b.city || b.state) && (
                                                <span className="text-[9.5px] font-normal text-neutral-500 dark:text-neutral-400 -mt-0.5">{b.city}{b.city && b.state ? ', ' : ''}{b.state}</span>
                                              )}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                                {addFormAdminRole === "UNIT_ADMIN" && (
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">Branch Unit *</label>
                                  {!addForm.branchId ? (
                                    <select disabled className="w-full h-8.5 text-xs rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-100 dark:bg-slate-800/40 px-2.5 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"><option>-- Select a Branch Office First --</option></select>
                                  ) : (
                                    <select value={addForm.businessUnitId} onChange={(e) => setAddForm((prev) => ({ ...prev, businessUnitId: e.target.value }))} className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-semibold text-neutral-900 dark:text-white outline-none hover:border-indigo-500 cursor-pointer" required>
                                      <option value="">-- Select a Unit --</option>
                                      {assignedBusinessUnits.filter((bu) => bu.branchId === addForm.branchId || bu.branch_id === addForm.branchId).map((bu) => (<option key={bu.id} value={bu.id}>{bu.name}</option>))}
                                    </select>
                                  )}
                                </div>
                                )}
                             </div>
                           </div>
                        )}
                      </div>
                    )}

                    {addModalTab === "STAFF" && (
                      <div className="space-y-4 mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {addFormAdminRole === "TENANT_ADMIN" ? (
                            <div className="space-y-1 opacity-50">
                              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Office Branch</label>
                              <div className="text-[10px] py-2">Not Applicable (Tenant Scope)</div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Office Branch *</label>
                              {isBranchAdmin || isUnitAdmin ? (
                                <div className="flex items-center gap-2 h-8.5 px-3 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                  <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                                  <span>
                                        {(() => {
                                          const b = assignedBranches.find((b) => b.id === addForm.branchId) || branches.find((b) => b.id === addForm.branchId);
                                          if (!b) return "Assigned Branch";
                                          return `${b.name}${b.city ? ` - ${b.city}` : ""}${b.state ? `, ${b.state}` : ""}`;
                                        })()}
                                      </span>
                                </div>
                              ) : (
                                <Select value={addForm.branchId || ""} onValueChange={(val) => setAddForm((prev) => ({ ...prev, branchId: val, businessUnitId: "" }))} required>
                                  <SelectTrigger className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-semibold text-neutral-900 dark:text-white outline-none hover:border-indigo-500">
                                    <SelectValue placeholder="Select Primary Branch..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {assignedBranches.map((b) => (
                                      <SelectItem key={b.id} value={b.id} className="text-xs">
                                        <div className="flex flex-col text-left py-0.5">
                                          <span className="font-semibold text-neutral-900 dark:text-white">{b.name}</span>
                                          {(b.city || b.state) && (
                                            <span className="text-[10.5px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">{b.city}{b.city && b.state ? ', ' : ''}{b.state}</span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          )}

                          {addFormAdminRole === "TENANT_ADMIN" ? (
                            <div className="space-y-1 opacity-50">
                              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Branch Unit</label>
                              <div className="text-[10px] py-2">Not Applicable (Tenant Scope)</div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                                Branch Unit {addFormAdminRole !== "BRANCH_ADMIN" && "*"}
                              </label>
                              {!addForm.branchId ? (
                                <select disabled className="w-full h-8.5 text-xs rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-100 dark:bg-slate-800/40 px-2.5 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"><option>-- Select a Branch Office First --</option></select>
                              ) : isUnitAdmin ? (
                                <div className="flex items-center gap-2 h-8.5 px-3 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                   <span>
                                     {(() => {
                                        const bu = assignedBusinessUnits.find((u) => u.id === addForm.businessUnitId);
                                        return bu ? bu.name : "Assigned Unit";
                                     })()}
                                   </span>
                                </div>
                              ) : (
                                <select value={addForm.businessUnitId} onChange={(e) => setAddForm((prev) => ({ ...prev, businessUnitId: e.target.value }))} className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-semibold text-neutral-900 dark:text-white outline-none hover:border-indigo-500 cursor-pointer" required>
                                  <option value="">-- Select a Unit{addFormAdminRole === "BRANCH_ADMIN" ? " (Optional for Custom Roles)" : ""} --</option>
                                  {assignedBusinessUnits.filter((bu) => bu.branchId === addForm.branchId || bu.branch_id === addForm.branchId).map((bu) => (<option key={bu.id} value={bu.id}>{bu.name}</option>))}
                                </select>
                              )}
                            </div>
                          )}
                        </div>

                        {addFormAdminRole !== "TENANT_ADMIN" && (
                          <div className="space-y-2 pt-4 border-t border-neutral-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-indigo-600" /><label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Custom / Business Roles</label></div>
                              {addForm.businessUnitId && (<a href={`/utility/roles-permissions?branch=${addForm.branchId}`} className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">+ Manage Custom Roles</a>)}
                            </div>
                            {!addForm.branchId || !addForm.businessUnitId ? (
                              <div className="p-3 bg-neutral-50 dark:bg-slate-850 border border-neutral-200 dark:border-slate-800 rounded-lg text-xs text-neutral-500 text-center">Please select a Branch Unit above to view and assign custom staffing roles.</div>
                            ) : branchRolesForAdd.length === 0 ? (
                              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div><span className="font-bold block">No custom roles configured for this unit yet.</span><span className="text-[10.5px] text-amber-700/80 dark:text-amber-400">Custom roles are isolated per Branch Unit.</span></div>
                                <a href={`/utility/roles-permissions?branch=${addForm.branchId}`} className="font-bold underline text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800/80 px-2.5 py-1 rounded text-xs shrink-0 self-start sm:self-auto hover:bg-amber-100/50 transition-colors shadow-2xs">+ Create Role for Branch &rarr;</a>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-neutral-50 dark:bg-slate-850 p-3 rounded-lg border border-neutral-200 dark:border-slate-800">
                                {branchRolesForAdd.map((r) => {
                                  const isChecked = addForm.roles.includes(r.id) || addForm.roles.includes(r.name);
                                  return (
                                    <label key={r.id || r.name} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[11px] font-semibold cursor-pointer transition-colors select-none ${isChecked ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" : "bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800"}`}>
                                      <input type="checkbox" checked={isChecked} onChange={(e) => { const checked = e.target.checked; let nextRoles = addForm.roles.filter((x) => x !== r.id && x !== r.name); if (checked) nextRoles.push(r.id || r.name); setAddForm({ ...addForm, roles: nextRoles }); }} className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer" />
                                      <span className="truncate">{r.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* PASSWORD + CONFIRM PASSWORD GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Initial Password *</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className="h-8.5 text-xs rounded border-neutral-300 dark:border-slate-700 font-mono pr-8"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Confirm Password *</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={addForm.confirmPassword}
                      onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      className={`h-8.5 text-xs rounded font-mono pr-8 ${
                        addForm.confirmPassword && addForm.confirmPassword !== addForm.password
                          ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                          : "border-neutral-300 dark:border-slate-700"
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                      tabIndex={-1}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              {addForm.confirmPassword && addForm.confirmPassword !== addForm.password && (
                <p className="text-[10px] font-semibold text-red-500 -mt-2">Passwords do not match</p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 z-10">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)} className="h-8.5 text-xs cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || emailStatus === "taken"} size="sm" className="h-8.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer disabled:opacity-50">
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

              {/* OFFICE BRANCH SELECTION */}
              {/* TABS FOR EDIT MODAL */}
              <div className="flex border-b border-neutral-200 dark:border-slate-800 mb-4 pt-4">
                <button type="button" onClick={() => setEditModalTab("STAFF")} className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${editModalTab === "STAFF" ? "border-indigo-600 text-indigo-600" : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"}`}>Staff & Business Roles</button>
                <button type="button" onClick={() => setEditModalTab("TENANT_ADMIN")} className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${editModalTab === "TENANT_ADMIN" ? "border-indigo-600 text-indigo-600" : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"}`}>Administrative Access</button>
              </div>

              {/* ADMINISTRATIVE ACCESS & STAFF ROLES LOGIC */}
              {(() => {
                const getAdminSysKey = (rolesArray: string[]) => {
  for (const r of rolesArray) {
    const sr = rolesList.find(rl => rl.id === r);
    if (sr && sr.isSystem) {
      const sysId = sr.systemRole || sr.system_role;
      if (sysId === "TENANT_ADMIN" || sysId === "SUPER_ADMIN") return "TENANT_ADMIN";
      if (sysId === "BRANCH_ADMIN") return "BRANCH_ADMIN";
      if (sysId === "UNIT_ADMIN") return "UNIT_ADMIN";
    }
  }
  return "NONE";
};

                const editFormAdminRole = getAdminSysKey(editForm.roles);

                const handleEditAdminRoleChange = (targetSysKey: string) => {
                  let nextRoles = editForm.roles.filter(r => {
                    const sr = rolesList.find(rl => rl.id === r);
                    return !(sr && sr.isSystem);
                  });

                  if (targetSysKey !== "NONE") {
                    const newAdminRole = rolesList.find(rl => {
                      if (!rl.isSystem) return false;
                      const sysId = rl.systemRole || rl.system_role;
                      if (targetSysKey === "TENANT_ADMIN") return sysId === "TENANT_ADMIN" || sysId === "SUPER_ADMIN";
                      if (targetSysKey === "BRANCH_ADMIN") return sysId === "BRANCH_ADMIN";
                      if (targetSysKey === "UNIT_ADMIN") return sysId === "UNIT_ADMIN";
                      return false;
                    });
                    if (newAdminRole) {
                      nextRoles.push(newAdminRole.id);
                    } else {
                      alert("Error: Could not find system role ID for " + targetSysKey + ". Available: " + rolesList.filter(r => r.isSystem).map(r => r.name + ":" + (r.systemRoleId || r.system_role_id)).join(", "));
                    }
                  }
                  
                  // Retain business unit for Branch Admin so they can also have custom roles (like Recruiter)
                  setEditForm(prev => ({
                    ...prev, 
                    roles: nextRoles,
                    branchId: targetSysKey === "TENANT_ADMIN" ? "" : prev.branchId,
                    businessUnitId: targetSysKey === "TENANT_ADMIN" ? "" : prev.businessUnitId
                  }));
                };

                const branchRolesForEdit = (rolesList || []).filter((r) => {
                  if (r.isSystem) return false;
                  if (!editForm.businessUnitId) return false;
                  const rBUId = r.businessUnitId || (r as any).business_unit_id;
                  if (!rBUId) return false;
                  return String(rBUId).toLowerCase() === String(editForm.businessUnitId).toLowerCase();
                });

                return (
                  <div>
                    {editModalTab === "TENANT_ADMIN" && (
                      <div className="space-y-4 mb-4">
                        <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-2">Select Administrative Level</label>
                        <div className="flex flex-wrap gap-4">
                          {[
                            { key: "TENANT_ADMIN", label: "Tenant Admin", show: isTenantAdmin },
                            { key: "BRANCH_ADMIN", label: "Branch Admin", show: isTenantAdmin || isBranchAdmin },
                            { key: "UNIT_ADMIN", label: "Branch Unit Admin", show: isTenantAdmin || isBranchAdmin || isUnitAdmin }
                          ].filter(r => r.show).map((role) => {
                            const isChecked = editFormAdminRole === role.key;
                            return (
                              <label key={role.key} className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={isChecked} 
                                  onChange={() => {
                                    if (isChecked) handleEditAdminRoleChange("NONE");
                                    else handleEditAdminRoleChange(role.key);
                                  }} 
                                  className="h-4 w-4 accent-indigo-600 cursor-pointer rounded" 
                                />
                                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 select-none">{role.label}</span>
                              </label>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2">Administrative roles grant system-wide permissions across the entire scope (Tenant, Branch, or Unit).</p>
                        
                        {(editFormAdminRole === "BRANCH_ADMIN" || editFormAdminRole === "UNIT_ADMIN") && (
                           <div className="space-y-3 pt-3 mt-4 border-t border-neutral-100 dark:border-slate-800">
                             <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Assign Administrative Scope</label>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Office Branch *</label>
                                  {isBranchAdmin || isUnitAdmin ? (
                                    <div className="flex items-center gap-2 h-8.5 px-3 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                      <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                                      <span>
                                        {(() => {
                                          const b = assignedBranches.find((b) => b.id === editForm.branchId) || branches.find((b) => b.id === editForm.branchId);
                                          if (!b) return "Assigned Branch";
                                          return `${b.name}${b.city ? ` - ${b.city}` : ""}${b.state ? `, ${b.state}` : ""}`;
                                        })()}
                                      </span>
                                    </div>
                                  ) : (
                                    <Select value={editForm.branchId || ""} onValueChange={(val) => setEditForm((prev) => ({ ...prev, branchId: val, businessUnitId: "" }))} required>
                                      <SelectTrigger className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-semibold text-neutral-900 dark:text-white outline-none hover:border-indigo-500">
                                        <SelectValue placeholder="Select Primary Branch..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {assignedBranches.map((b) => (
                                          <SelectItem key={b.id} value={b.id} className="text-xs">
                                            <div className="flex flex-col text-left">
                                              <span className="font-semibold text-neutral-900 dark:text-white">{b.name}</span>
                                              {(b.city || b.state) && (
                                                <span className="text-[9.5px] font-normal text-neutral-500 dark:text-neutral-400 -mt-0.5">{b.city}{b.city && b.state ? ', ' : ''}{b.state}</span>
                                              )}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                                {editFormAdminRole === "UNIT_ADMIN" && (
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">Branch Unit *</label>
                                  {!editForm.branchId ? (
                                    <select disabled className="w-full h-8.5 text-xs rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-100 dark:bg-slate-800/40 px-2.5 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"><option>-- Select a Branch Office First --</option></select>
                                  ) : (
                                    <select value={editForm.businessUnitId} onChange={(e) => setEditForm((prev) => ({ ...prev, businessUnitId: e.target.value }))} className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-semibold text-neutral-900 dark:text-white outline-none hover:border-indigo-500 cursor-pointer" required>
                                      <option value="">-- Select a Unit --</option>
                                      {assignedBusinessUnits.filter((bu) => bu.branchId === editForm.branchId || bu.branch_id === editForm.branchId).map((bu) => (<option key={bu.id} value={bu.id}>{bu.name}</option>))}
                                    </select>
                                  )}
                                </div>
                                )}
                             </div>
                           </div>
                        )}
                      </div>
                    )}

                    {editModalTab === "STAFF" && (
                      <div className="space-y-4 mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {editFormAdminRole === "TENANT_ADMIN" ? (
                            <div className="space-y-1 opacity-50">
                              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Office Branch</label>
                              <div className="text-[10px] py-2">Not Applicable (Tenant Scope)</div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Office Branch *</label>
                              {isBranchAdmin || isUnitAdmin ? (
                                <div className="flex items-center gap-2 h-8.5 px-3 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                  <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                                  <span>
                                        {(() => {
                                          const b = assignedBranches.find((b) => b.id === editForm.branchId) || branches.find((b) => b.id === editForm.branchId);
                                          if (!b) return "Assigned Branch";
                                          return `${b.name}${b.city ? ` - ${b.city}` : ""}${b.state ? `, ${b.state}` : ""}`;
                                        })()}
                                      </span>
                                </div>
                              ) : (
                                <Select value={editForm.branchId || ""} onValueChange={(val) => setEditForm((prev) => ({ ...prev, branchId: val, businessUnitId: "" }))} required>
                                  <SelectTrigger className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-semibold text-neutral-900 dark:text-white outline-none hover:border-indigo-500">
                                    <SelectValue placeholder="Select Primary Branch..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {assignedBranches.map((b) => (
                                      <SelectItem key={b.id} value={b.id} className="text-xs">
                                        <div className="flex flex-col text-left py-0.5">
                                          <span className="font-semibold text-neutral-900 dark:text-white">{b.name}</span>
                                          {(b.city || b.state) && (
                                            <span className="text-[10.5px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">{b.city}{b.city && b.state ? ', ' : ''}{b.state}</span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          )}

                          {editFormAdminRole === "TENANT_ADMIN" ? (
                            <div className="space-y-1 opacity-50">
                              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Branch Unit</label>
                              <div className="text-[10px] py-2">Not Applicable (Tenant Scope)</div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                                Branch Unit {editFormAdminRole !== "BRANCH_ADMIN" && "*"}
                              </label>
                              {!editForm.branchId ? (
                                <select disabled className="w-full h-8.5 text-xs rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-100 dark:bg-slate-800/40 px-2.5 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"><option>-- Select a Branch Office First --</option></select>
                              ) : isUnitAdmin ? (
                                <div className="flex items-center gap-2 h-8.5 px-3 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                   <span>
                                     {(() => {
                                        const bu = assignedBusinessUnits.find((u) => u.id === editForm.businessUnitId);
                                        return bu ? bu.name : "Assigned Unit";
                                     })()}
                                   </span>
                                </div>
                              ) : (
                                <select value={editForm.businessUnitId} onChange={(e) => setEditForm((prev) => ({ ...prev, businessUnitId: e.target.value }))} className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-semibold text-neutral-900 dark:text-white outline-none hover:border-indigo-500 cursor-pointer" required>
                                  <option value="">-- Select a Unit{editFormAdminRole === "BRANCH_ADMIN" ? " (Optional for Custom Roles)" : ""} --</option>
                                  {assignedBusinessUnits.filter((bu) => bu.branchId === editForm.branchId || bu.branch_id === editForm.branchId).map((bu) => (<option key={bu.id} value={bu.id}>{bu.name}</option>))}
                                </select>
                              )}
                            </div>
                          )}
                        </div>

                        {editFormAdminRole !== "TENANT_ADMIN" && (
                          <div className="space-y-2 pt-4 border-t border-neutral-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-indigo-600" /><label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Custom / Business Roles</label></div>
                              {editForm.businessUnitId && (<a href={`/utility/roles-permissions?branch=${editForm.branchId}`} className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">+ Manage Custom Roles</a>)}
                            </div>
                            {!editForm.branchId || !editForm.businessUnitId ? (
                              <div className="p-3 bg-neutral-50 dark:bg-slate-850 border border-neutral-200 dark:border-slate-800 rounded-lg text-xs text-neutral-500 text-center">Please select a Branch Unit above to view and assign custom staffing roles.</div>
                            ) : branchRolesForEdit.length === 0 ? (
                              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div><span className="font-bold block">No custom roles configured for this unit yet.</span><span className="text-[10.5px] text-amber-700/80 dark:text-amber-400">Custom roles are isolated per Branch Unit.</span></div>
                                <a href={`/utility/roles-permissions?branch=${editForm.branchId}`} className="font-bold underline text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800/80 px-2.5 py-1 rounded text-xs shrink-0 self-start sm:self-auto hover:bg-amber-100/50 transition-colors shadow-2xs">+ Create Role for Branch &rarr;</a>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-neutral-50 dark:bg-slate-850 p-3 rounded-lg border border-neutral-200 dark:border-slate-800">
                                {branchRolesForEdit.map((r) => {
                                  const isChecked = editForm.roles.includes(r.id) || editForm.roles.includes(r.name);
                                  return (
                                    <label key={r.id || r.name} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[11px] font-semibold cursor-pointer transition-colors select-none ${isChecked ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" : "bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800"}`}>
                                      <input type="checkbox" checked={isChecked} onChange={(e) => { const checked = e.target.checked; let nextRoles = editForm.roles.filter((x) => x !== r.id && x !== r.name); if (checked) nextRoles.push(r.id || r.name); setEditForm({ ...editForm, roles: nextRoles }); }} className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer" />
                                      <span className="truncate">{r.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* DESIGNATED MANAGER */}
              <div className="space-y-2 pt-3 border-t border-neutral-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-indigo-600" /> Designated Manager (Approvals & Reviews)
                  </label>
                  <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                    Reporting Manager
                  </span>
                </div>
                <ReviewerSelect
                  value={editForm.jobReviewerId || ""}
                  onChange={(val) => setEditForm({ ...editForm, jobReviewerId: val })}
                  eligibleUsers={eligibleReviewers}
                  excludeUserId={selectedUser?.id}
                  rolesList={rolesList}
                />
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
                <div className="relative">
                  <Input
                    type={showResetPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="h-8 text-xs rounded border-neutral-300 font-mono pr-8"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    tabIndex={-1}
                    title={showResetPassword ? "Hide password" : "Show password"}
                  >
                    {showResetPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
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
                <Shield className="h-4 w-4 text-indigo-600" /> Roles ({selectedUserIds.length} Users)
              </h3>
              <button onClick={() => setIsBulkRoleModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-72 overflow-y-auto">
              <p className="text-xs text-neutral-500 mb-2">
                Select roles to assign to the <strong>{selectedUserIds.length} selected team members</strong>:
              </p>

              {rolesList.map((r) => {
                const roleKey = r.id;
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">{r.name}</span>
                        {r.branchName && (
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                            🏢 {r.branchName}
                          </span>
                        )}
                      </div>
                      {r.description && <span className="text-[10px] text-neutral-500 block mt-0.5">{r.description}</span>}
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
                  {!isBranchAdmin && <option value="">-- Unassigned (HQ Shared) --</option>}
                  {assignedBranches.map((b) => (
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

      {/* BULK ASSIGN MANAGER MODAL */}
      {isBulkReviewerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in-0">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-600" /> Assign Manager ({selectedUserIds.length} Selected)
              </h3>
              <button onClick={() => setIsBulkReviewerModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-neutral-500">
                Choose the designated manager who reviews and approves work for the <strong>{selectedUserIds.length} selected team members</strong>:
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Designated Manager *</label>
                <ReviewerSelect
                  value={targetBulkReviewerId || ""}
                  onChange={(val) => setTargetBulkReviewerId(val)}
                  eligibleUsers={eligibleReviewers}
                  rolesList={rolesList}
                />
              </div>
            </div>

            <div className="border-t border-neutral-100 dark:border-slate-800 p-4 bg-neutral-50 dark:bg-slate-850 flex justify-end gap-2">
              <Button size="sm" variant="outline" type="button" onClick={() => setIsBulkReviewerModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleBulkAssignReviewer}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                {loading ? "Updating..." : `Set Manager for ${selectedUserIds.length} Users`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED SINGLE USER ASSIGN MANAGER MODAL */}
      {isReviewerModalOpen && reviewerTargetUser && (() => {
        const selectedManagerUser = selectedReviewerId
          ? (eligibleReviewers.find((u) => u.id === selectedReviewerId) || users.find((u) => u.id === selectedReviewerId) || null)
          : null;

        const currentReviewerName = reviewerTargetUser.jobReviewerName || 
          users.find((u) => u.id === reviewerTargetUser.jobReviewerId)?.fullName || null;

        const isUnchanged = selectedReviewerId === (reviewerTargetUser.jobReviewerId || "");

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in zoom-in-95">
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-850">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900 shrink-0">
                    <UserCheck className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Assign Manager
                    </h3>
                    <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400">
                      Select a manager to review candidate submissions and job postings.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsReviewerModalOpen(false);
                    setReviewerTargetUser(null);
                  }}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Target User Info Summary */}
              <div className="px-6 pt-4 pb-1">
                <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8.5 w-8.5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {reviewerTargetUser.fullName ? reviewerTargetUser.fullName.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {reviewerTargetUser.fullName}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                          {reviewerTargetUser.roleName || "Recruiter"}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                        {reviewerTargetUser.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-3">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">Current Routing</span>
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {currentReviewerName || "Auto (Hierarchy)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Manager Search & Selection List */}
              <div className="px-6 py-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Select Manager from Team
                  </span>
                  {selectedReviewerId && (
                    <button
                      type="button"
                      onClick={() => setSelectedReviewerId("")}
                      className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                    >
                      Clear (Reset to Auto)
                    </button>
                  )}
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    value={reviewerSearch}
                    onChange={(e) => setReviewerSearch(e.target.value)}
                    placeholder="Search manager by name, role, or email..."
                    className="w-full h-9 pl-9 pr-8 text-xs rounded-md border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    autoFocus
                  />
                  {reviewerSearch && (
                    <button
                      type="button"
                      onClick={() => setReviewerSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Manager Selection List */}
                <div className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg shadow-xs overflow-hidden">
                  <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
                    {modalFilteredReviewers.length === 0 ? (
                      <div className="py-6 text-center text-xs text-neutral-400 space-y-1">
                        <p>No matching managers found for &quot;{reviewerSearch}&quot;.</p>
                        <p className="text-[10.5px] text-neutral-500">Only team members with managerial or approval roles appear here.</p>
                      </div>
                    ) : (
                      modalFilteredReviewers.map((u) => {
                        const isSelected = selectedReviewerId === u.id;
                        const displayRole = u.roleName || (u.roles && u.roles.length > 0 ? u.roles[0] : "Manager");

                        return (
                          <div
                            key={u.id}
                            onClick={() => {
                              setSelectedReviewerId(isSelected ? "" : u.id);
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition select-none ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs"
                                : "border-transparent hover:border-neutral-200 dark:hover:border-slate-700 hover:bg-neutral-50/80 dark:hover:bg-slate-800/60"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                                  isSelected
                                    ? "bg-indigo-600 text-white"
                                    : "bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-slate-700"
                                }`}
                              >
                                {u.fullName ? u.fullName.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs truncate ${isSelected ? "font-bold text-indigo-950 dark:text-white" : "font-semibold text-neutral-900 dark:text-white"}`}>
                                    {u.fullName}
                                  </span>
                                  <span className="text-[9.5px] px-1.5 py-0.2 rounded font-medium bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-slate-700">
                                    {displayRole}
                                  </span>
                                </div>
                                <span className="text-[10.5px] text-neutral-500 font-mono block truncate">
                                  {u.email}
                                </span>
                              </div>
                            </div>

                            {/* Radio / Check indicator */}
                            <div className="shrink-0 ml-3">
                              <div
                                className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "border-indigo-600 bg-indigo-600 text-white shadow-2xs"
                                    : "border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="px-3.5 py-2 bg-neutral-50/80 dark:bg-slate-850 border-t border-neutral-100 dark:border-slate-800 text-[11px] text-neutral-500 flex items-center justify-between">
                    <span>{modalFilteredReviewers.length} eligible manager(s)</span>
                    <span className="text-[10.5px] text-neutral-400">Click a manager to select or deselect</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-neutral-100 dark:border-slate-800 px-6 py-3.5 bg-neutral-50/60 dark:bg-slate-850 flex items-center justify-between">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {selectedManagerUser ? (
                    <span>Assigning: <strong className="text-indigo-600 dark:text-indigo-400">{selectedManagerUser.fullName}</strong></span>
                  ) : reviewerTargetUser.jobReviewerId ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Reverting to Auto (Hierarchy)</span>
                  ) : (
                    <span>Default: <strong className="text-neutral-700 dark:text-neutral-300">Auto (Hierarchy)</strong></span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setIsReviewerModalOpen(false);
                      setReviewerTargetUser(null);
                    }}
                    className="h-8.5 px-3.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveSingleReviewer(selectedReviewerId || null)}
                    disabled={submitting || (isUnchanged && !reviewerTargetUser.jobReviewerId && !selectedReviewerId)}
                    className="h-8.5 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : selectedReviewerId ? "Assign Manager" : "Save as Auto"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
