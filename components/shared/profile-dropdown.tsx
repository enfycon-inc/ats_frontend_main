"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Home,
  Briefcase,
  CreditCard,
  User,
  Settings,
  LogOut,
  Sparkles,
  ChevronDown,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { atsApi } from "@/lib/ats-api";

export default function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const [overrideRole, setOverrideRole] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [liveUserLoaded, setLiveUserLoaded] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [liveUser, setLiveUser] = useState<any>(null);
  const currentUser = liveUser || (typeof window !== "undefined" ? atsApi.auth.getCurrentUser() : null);

  useEffect(() => {
    atsApi.auth.me().then(profile => {
      if (profile && profile.id) {
        setLiveUser(profile);
        if (typeof window !== "undefined") {
          localStorage.setItem("ats_current_user", JSON.stringify(profile));
        }
      }
    }).catch(() => {}).finally(() => {
      setLiveUserLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOverrideRole(localStorage.getItem("override_role"));
      const handleStorage = () => {
        setOverrideRole(localStorage.getItem("override_role"));
      };
      window.addEventListener("storage", handleStorage);
      window.addEventListener("overrideRoleChanged", handleStorage);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("overrideRoleChanged", handleStorage);
      };
    }
  }, []);

  useEffect(() => {
    atsApi.auth.listRoles(undefined, true).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setAvailableRoles(data);
      }
    }).catch(() => {}).finally(() => {
      setRolesLoaded(true);
    });
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const userName = currentUser?.fullName || (session as any)?.user?.name || "Mrutyunjay Rout";
  const userAvatar = currentUser?.avatar || (session as any)?.user?.image || null;
  const userRoles = currentUser?.roles || (session as any)?.user?.roles || [];
  const systemRole = (session as any)?.user?.systemRole || userRoles[0];

  const userInitials = useMemo(() => {
    if (!userName) return "U";
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return userName.slice(0, 2).toUpperCase();
  }, [userName]);

  const IGNORED_KEYCLOAK_ROLES = new Set([
    "DEFAULT_ROLES_ENFYCON_ATS",
    "DEFAULT_ROLES_ATS",
    "DEFAULT_ROLES",
    "OFFLINE_ACCESS",
    "UMA_AUTHORIZATION",
    "MANAGE_ACCOUNT",
    "MANAGE_ACCOUNT_LINKS",
    "VIEW_PROFILE",
    "ACCOUNT",
    "ADMIN_CLI",
    "BROKER",
    "REALM_ADMIN",
    "CREATE_CLIENT",
    "MANAGE_USERS",
    "MANAGE_REALM",
    "MANAGE_EVENTS",
    "MANAGE_CLIENTS",
    "MANAGE_AUTHORIZATION",
    "VIEW_USERS",
    "VIEW_REALM",
    "VIEW_EVENTS",
    "VIEW_CLIENTS",
    "VIEW_AUTHORIZATION",
    "IMPERSONATION",
    "USER",
  ]);

  const isTechnicalKeycloakRole = (r: string): boolean => {
    if (!r || typeof r !== "string") return true;
    const upper = r.trim().toUpperCase().replace(/[-\s]/g, "_");
    if (upper.startsWith("DEFAULT_ROLES_") || upper.startsWith("DEFAULT_ROLES")) return true;
    return IGNORED_KEYCLOAK_ROLES.has(upper);
  };

  const systemRoleLabels: Record<string, string> = {
    SUPER_ADMIN: "Global Admin",
    ADMIN: "Admin",
    TENANT_ADMIN: "Admin",
    BRANCH_ADMIN: "Branch Admin",
    ACCOUNT_MANAGER: "Account Manager",
    POD_LEAD: "Pod Lead",
    DELIVERY_HEAD: "Delivery Head",
    RECRUITER: "Recruiter",
    SENSE: "Sense",
    FINANCE_ADMIN: "Finance Admin",
  };

  const getDynamicRoleLabel = (roleStr: string): string => {
    if (!roleStr) return "User";
    if (isTechnicalKeycloakRole(roleStr)) return "Recruiter";
    const upper = roleStr.toUpperCase();
    if (systemRoleLabels[upper]) {
      return systemRoleLabels[upper];
    }
    const customRole = availableRoles.find(
      (r) => r.name?.toUpperCase() === upper || r.id === roleStr
    );
    if (customRole) {
      return customRole.name;
    }
    if (upper === "BDM") return "BDM";
    if (upper === "ACCOUNT_MANAGER" || upper === "BD_MANAGER" || upper === "BD MANAGER") {
      return "Account Manager";
    }
    return roleStr.replace(/_/g, " ");
  };

  const activeBranchId = typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
  const branchSpecificRoles: string[] = (activeBranchId && (currentUser as any)?.branchRoles?.[activeBranchId]) || [];
  const effectiveRoles = (branchSpecificRoles.length > 0 ? branchSpecificRoles : userRoles).filter((r: string) => !isTechnicalKeycloakRole(r));

  const userAssignedRoles: string[] = (effectiveRoles && effectiveRoles.length > 0)
    ? effectiveRoles
    : ((session as any)?.user?.roles && (session as any)?.user?.roles.length > 0
        ? (session as any).user.roles.filter((r: string) => !isTechnicalKeycloakRole(r))
        : (systemRole && !isTechnicalKeycloakRole(systemRole) ? [systemRole] : []));

  const isUserAdmin = useMemo(() => {
    const sRole = (systemRole || "").toUpperCase();
    if (sRole === "ADMIN" || sRole === "SUPER_ADMIN" || sRole === "TENANT_ADMIN") return true;
    return userAssignedRoles.some((r) => {
      const u = r.toUpperCase();
      return u === "ADMIN" || u === "SUPER_ADMIN" || u === "TENANT_ADMIN";
    });
  }, [systemRole, userAssignedRoles]);

  const currentActiveRole = overrideRole || (isUserAdmin ? "ADMIN" : (userAssignedRoles[0] || "RECRUITER"));
  const displayRole = getDynamicRoleLabel(currentActiveRole);

  const rolesSubtitle = useMemo(() => {
    const cleanRoles = userAssignedRoles
      .map((r) => getDynamicRoleLabel(r))
      .filter((v, i, a) => a.indexOf(v) === i);

    if (cleanRoles.length > 0) {
      return cleanRoles.join(" + ");
    }
    return displayRole || "User";
  }, [userAssignedRoles, displayRole, getDynamicRoleLabel]);

  // Role icon and color styling resolver
  const getRoleIconAndColor = (roleStr: string) => {
    const u = (roleStr || "").toUpperCase().replace(/[\s\-_]/g, "");

    // Recruiter / TA / Sourcing
    if (u === "RECRUITER" || u.includes("RECRUIT") || u.includes("SOURC") || u === "TA") {
      return {
        Icon: Home,
        colorClass:
          "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40",
      };
    }
    // Delivery Head / Operations
    if (u === "DELIVERYHEAD" || u.includes("DELIVERY") || u.includes("OPERATION")) {
      return {
        Icon: Home,
        colorClass:
          "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/40",
      };
    }
    // Sense
    if (u === "SENSE") {
      return {
        Icon: Home,
        colorClass:
          "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800/40",
      };
    }
    // Account Manager / BDM / Business Development / Sales / Client
    if (
      u === "ACCOUNTMANAGER" ||
      u === "BDM" ||
      u.includes("ACCOUNT") ||
      u.includes("BUSINESSDEVELOPMENT") ||
      u.includes("SALES")
    ) {
      return {
        Icon: Briefcase,
        colorClass:
          "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200/80 dark:border-teal-800/40",
      };
    }
    // Finance / Payroll
    if (u === "FINANCEADMIN" || u.includes("FINANCE") || u.includes("PAYROLL")) {
      return {
        Icon: CreditCard,
        colorClass:
          "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/40",
      };
    }
    // Pod Lead / Team Lead
    if (u === "PODLEAD" || u.includes("POD") || u.includes("LEAD")) {
      return {
        Icon: Home,
        colorClass:
          "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/40",
      };
    }
    // Admin / Super Admin
    if (
      u === "ADMIN" ||
      u === "SUPERADMIN" ||
      u === "GLOBALADMIN" ||
      u === "TENANTADMIN" ||
      u.includes("ADMIN")
    ) {
      return {
        Icon: ShieldCheck,
        colorClass:
          "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/40",
      };
    }
    // Fallback custom
    return {
      Icon: Home,
      colorClass:
        "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80",
    };
  };

  // Build the list of dashboard perspectives showing ONLY actual assigned roles (no dummy roles)
  const dashboardRoleOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: {
      key: string;
      name: string;
      Icon: any;
      colorClass: string;
      replacesSystemRole?: string;
    }[] = [];

    for (const uRole of userAssignedRoles) {
      if (!uRole || typeof uRole !== "string") continue;
      if (isTechnicalKeycloakRole(uRole)) continue;

      const uUpper = uRole.trim().toUpperCase();

      const customRole =
        availableRoles.find(
          (r) =>
            !r.isSystem &&
            ((!activeBranchId || !r.branchId || r.branchId === activeBranchId) &&
              (r.name?.toUpperCase() === uUpper ||
                r.id === uRole ||
                (r.systemRole && r.systemRole.toUpperCase() === uUpper)))
        ) ||
        availableRoles.find(
          (r) =>
            !r.isSystem &&
            (r.name?.toUpperCase() === uUpper ||
              r.id === uRole ||
              (r.systemRole && r.systemRole.toUpperCase() === uUpper))
        );

      const name = getDynamicRoleLabel(uRole);
      const key = customRole?.name || uRole;
      const dedupeKey = name.trim().toUpperCase();

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        const { Icon, colorClass } = getRoleIconAndColor(name);
        options.push({
          key,
          name,
          Icon,
          colorClass,
          replacesSystemRole: customRole?.systemRole || customRole?.replacesSystemRole || undefined,
        });
      }
    }

    if (options.length === 0 && systemRole && !isTechnicalKeycloakRole(systemRole)) {
      const name = getDynamicRoleLabel(systemRole);
      const { Icon, colorClass } = getRoleIconAndColor(name);
      options.push({
        key: systemRole,
        name,
        Icon,
        colorClass,
      });
    }

    return options;
  }, [userAssignedRoles, availableRoles, activeBranchId, getDynamicRoleLabel, systemRole]);

  const handleSwitchRole = (roleName: string | null) => {
    if (typeof window !== "undefined") {
      if (roleName) {
        localStorage.setItem("override_role", roleName);
      } else {
        localStorage.removeItem("override_role");
      }
      setOverrideRole(roleName);
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("overrideRoleChanged", { detail: { role: roleName } }));
    }
    setOpen(false);
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      try {
        atsApi.auth.logout();
      } catch (logoutErr) {
        console.error("Local token clear failed:", logoutErr);
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("ats_access_token");
        localStorage.removeItem("ats_current_user");
        localStorage.removeItem("active_branch_id");
        localStorage.removeItem("override_role");
      }

      await signOut({ redirect: false });

      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    } catch (error) {
      console.error("Logout error:", error);
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    } finally {
      setLogoutLoading(false);
    }
  };

  const isItemActive = (key: string) => {
    const currentNorm = (overrideRole || (isUserAdmin ? "ADMIN" : (systemRole || "RECRUITER"))).toUpperCase().replace(/[\s\-_]/g, "");
    const keyNorm = key.toUpperCase().replace(/[\s\-_]/g, "");
    if (currentNorm === keyNorm) return true;
    if (keyNorm === "ADMIN" && (currentNorm === "SUPERADMIN" || currentNorm === "TENANTADMIN")) return true;
    if (keyNorm === "RECRUITER" && (!overrideRole && systemRole === "RECRUITER")) return true;
    return false;
  };

  return (
    <div ref={ref} className="relative">
      <button
        id="shared-navbar-profile"
        type="button"
        aria-label="User profile menu"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`
          flex items-center gap-2 pl-1.5 pr-2 py-1 h-9 rounded-full
          cursor-pointer transition-all duration-150 select-none
          ${open ? "bg-slate-100 dark:bg-white/20 shadow-xs" : "hover:bg-slate-100/70 dark:hover:bg-white/10"}
        `}
      >
        <div className="relative w-7 h-7 rounded-full flex-shrink-0 ring-1.5 ring-slate-300 dark:ring-white/50 bg-slate-200 dark:bg-white/20 text-slate-700 dark:text-white flex items-center justify-center font-bold text-xs shadow-xs">
          {userAvatar ? (
            <Image
              src={userAvatar}
              alt={userName}
              width={28}
              height={28}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-[11px] font-bold tracking-tighter">
              {userInitials}
            </span>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
        </div>

        <div className="hidden lg:flex flex-col items-start leading-none min-w-0 text-left">
          <span className="text-[12.5px] font-bold text-slate-800 dark:text-white truncate max-w-[120px] tracking-tight">
            {userName}
          </span>
          <span className="text-[10px] font-semibold text-purple-600 dark:text-fuchsia-300 flex items-center gap-1 leading-none mt-0.5">
            <Sparkles className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate max-w-[95px]">{displayRole || "Admin"}</span>
          </span>
        </div>

        <ChevronDown
          className={`
            w-3.5 h-3.5 text-slate-500 dark:text-white/70 ml-0.5
            transition-transform duration-200
            ${open ? "rotate-180" : ""}
          `}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User profile menu"
          className="
            absolute top-full right-0 mt-2 z-[300]
            w-[285px] sm:w-[300px]
            bg-white dark:bg-[#182338]
            border border-slate-100 dark:border-slate-800
            rounded-[22px] shadow-2xl shadow-black/20
            p-3
            overflow-hidden
            animate-in fade-in-0 zoom-in-95 duration-150
          "
        >
          {/* Header Card */}
          <div className="p-3 bg-gradient-to-r from-purple-50/70 to-pink-50/40 dark:from-slate-800/90 dark:to-slate-800/60 rounded-2xl flex items-center gap-3 border border-purple-100/50 dark:border-slate-700/60">
            <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white dark:ring-slate-700 shadow-xs bg-slate-200 dark:bg-slate-700">
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt={userName}
                  width={44}
                  height={44}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-sm text-white bg-gradient-to-br from-indigo-500 to-purple-600">
                  {userInitials}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h4 className="text-[14px] font-bold text-slate-900 dark:text-slate-100 leading-snug truncate">
                {userName}
              </h4>
              <p
                className="text-[11px] font-medium text-slate-400 dark:text-slate-400 truncate leading-tight mt-0.5"
                title={rolesSubtitle}
              >
                {rolesSubtitle}
              </p>
            </div>
          </div>

          {/* SWITCH DASHBOARD Section */}
          <div className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
            SWITCH DASHBOARD
          </div>

          <div className="max-h-[220px] overflow-y-auto space-y-0.5 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            {dashboardRoleOptions.map((opt) => {
              const isActive = isItemActive(opt.key);
              const OptionIcon = opt.Icon;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSwitchRole(opt.key)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[13px] transition-all duration-150 cursor-pointer text-left group ${
                    isActive
                      ? "bg-slate-100/90 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${opt.colorClass}`}
                    >
                      <OptionIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                    </div>
                    <span className="truncate">{opt.name}</span>
                  </div>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 flex-shrink-0 mr-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1.5 mx-1" />

          {/* Bottom Menu Items */}
          <div className="space-y-0.5">
            <Link
              href="/view-profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-950/40 dark:group-hover:text-blue-400 transition-colors shadow-2xs">
                <User className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span>My Profile</span>
            </Link>

            <Link
              href="/utility/roles-permissions"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-950/40 dark:group-hover:text-blue-400 transition-colors shadow-2xs">
                <Settings className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span>Settings</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutLoading}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-[13px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors group cursor-pointer text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/60 transition-colors shadow-2xs">
                {logoutLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5 stroke-[2]" />
                )}
              </div>
              <span>{logoutLoading ? "Logging out..." : "Logout"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
