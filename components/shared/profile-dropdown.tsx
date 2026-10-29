"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
import { saveDashboardRole } from "@/lib/dashboard-preference";
import { getDashboardRoleSelection } from "@/lib/dashboard-role";
import { useStaffProfile } from '@/hooks/use-staff-profile';
import { UserAvatar } from '@/components/shared/user-identity';

export default function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const [overrideRole, setOverrideRole] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const { data: liveUser, confirmed: profileConfirmed } = useStaffProfile();
  const roleProfile = profileConfirmed ? liveUser : null;
  const currentUser = liveUser || (typeof window !== "undefined" ? atsApi.auth.getCurrentUser() : null);


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
      if (Array.isArray(data)) {
        setAvailableRoles(data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const userName = currentUser?.fullName || (session as any)?.user?.name || "My account";
  const userAvatar = currentUser ? (currentUser.avatar || currentUser.profilePicture || null) : ((session as any)?.user?.image || null);
  const userEmail = liveUser?.email || (session as any)?.user?.email || currentUser?.email || "";

  // Role icon and color styling resolver based on canonical system archetype
  const getRoleIconAndColor = (roleObjOrStr?: any) => {
    const rawSys = typeof roleObjOrStr === "object"
      ? (roleObjOrStr?.systemRole || roleObjOrStr?.name || "")
      : (roleObjOrStr || "");
    const u = rawSys.toUpperCase().replace(/[\s\-_]/g, "");

    // Admin / Super Admin / Branch Admin
    if (u.includes("TENANT_ADMIN")) {
      return {
        Icon: ShieldCheck,
        colorClass:
          "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/40",
      };
    }
    // Account Manager / BDM / Client
    if (u === "ACCOUNTMANAGER" || u === "BDM" || u.includes("ACCOUNT")) {
      return {
        Icon: Briefcase,
        colorClass:
          "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200/80 dark:border-teal-800/40",
      };
    }
    // Delivery Head / Operations
    if (u === "DELIVERYHEAD" || u.includes("DELIVERY")) {
      return {
        Icon: Home,
        colorClass:
          "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/40",
      };
    }
    // Pod Lead / Team Lead
    if (u === "PODLEAD" || u.includes("POD")) {
      return {
        Icon: Home,
        colorClass:
          "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/40",
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
    // Finance / Payroll
    if (u === "FINANCEADMIN" || u.includes("FINANCE")) {
      return {
        Icon: CreditCard,
        colorClass:
          "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/40",
      };
    }
    // Recruiter / TA / Sourcing (default)
    return {
      Icon: Home,
      colorClass:
        "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40",
    };
  };

  // Dashboard roles are exposed only after the current /me response is confirmed.
  const dashboardRoleOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: {
      id: string;
      key: string;
      name: string;
      Icon: any;
      colorClass: string;
      replacesSystemRole?: string;
    }[] = [];

    for (const role of getDashboardRoleSelection(roleProfile, availableRoles, overrideRole).options) {
      if (!role || seen.has(role.id)) continue;
      seen.add(role.id);

      const { Icon, colorClass } = getRoleIconAndColor(role);
      options.push({
        id: role.id,
        key: role.name || role.systemRole || role.id,
        name: role.name,
        Icon,
        colorClass,
        replacesSystemRole: role.systemRole || role.replacesSystemRole || undefined,
      });
    }

    return options;
  }, [roleProfile, overrideRole, availableRoles]);

  const activeRoleOption = useMemo(() => {
    const selection = getDashboardRoleSelection(roleProfile, availableRoles, overrideRole);
    return dashboardRoleOptions.find((opt) => opt.id === selection.active.id) || null;
  }, [overrideRole, dashboardRoleOptions, availableRoles, roleProfile]);

  const displayRole = roleProfile && activeRoleOption?.name ? activeRoleOption.name : "Loading…";
  const rolesSubtitle = displayRole;

  const isItemActive = (key: string, id?: string) => {
    if (overrideRole) {
      const oNorm = overrideRole.toUpperCase().replace(/[\s\-_]/g, "");
      const kNorm = key.toUpperCase().replace(/[\s\-_]/g, "");
      if (overrideRole === id || overrideRole === key || oNorm === kNorm) return true;
      return false;
    }
    if (id && roleProfile?.roleId && id === roleProfile.roleId) return true;
    if (activeRoleOption && (activeRoleOption.id === id || activeRoleOption.key === key)) return true;
    return false;
  };

  const handleSwitchRole = (roleName: string | null) => {
    if (typeof window !== "undefined") {
      if (!roleProfile) return;
      saveDashboardRole(roleProfile, roleName);
      if (roleName) {
        localStorage.setItem("override_role", roleName);
      } else {
        localStorage.removeItem("override_role");
      }
      setOverrideRole(roleName);
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("overrideRoleChanged", { detail: { role: roleName } }));
      window.location.assign("/dashboard");
    }
    setOpen(false);
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      try {
        await atsApi.auth.logout();
      } catch (logoutErr) {
        console.error("Local token clear failed:", logoutErr);
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("ats_access_token");
        localStorage.removeItem("ats_current_user");
        localStorage.removeItem("override_role");
      }

      // Provider cleanup runs server-side in the Auth.js signOut event; no browser redirect to Keycloak.
      await signOut({ redirectTo: "/auth/login" });
    } catch (error) {
      console.error("Logout error:", error);
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    } finally {
      setLogoutLoading(false);
    }
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
          <UserAvatar user={{ fullName: userName, avatar: userAvatar }} className="h-7 w-7" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
        </div>

        <div className="hidden lg:flex flex-col items-start leading-none min-w-0 text-left">
          <span className="text-[12.5px] font-bold text-slate-800 dark:text-white truncate max-w-[120px] tracking-tight">
            {userName}
          </span>
          <span className="text-[10px] font-semibold text-purple-600 dark:text-fuchsia-300 flex items-center gap-1 leading-none mt-0.5">
            <Sparkles className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate max-w-[95px]">{displayRole}</span>
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
              <UserAvatar user={{ fullName: userName, avatar: userAvatar }} className="h-11 w-11" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h4 className="text-[14px] font-bold text-slate-900 dark:text-slate-100 leading-snug truncate">
                {userName}
              </h4>
              {userEmail && (
                <p
                  className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5"
                  title={userEmail}
                >
                  {userEmail}
                </p>
              )}
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
            {!roleProfile || !activeRoleOption || dashboardRoleOptions.length === 0 ? (
              <div role="status" className="px-2.5 py-2 text-[12px] text-slate-500 dark:text-slate-400">
                Loading assigned roles…
              </div>
            ) : dashboardRoleOptions.map((opt) => {
              const isActive = isItemActive(opt.key, opt.id);
              const OptionIcon = opt.Icon;
              return (
                <button
                  key={opt.id || opt.key}
                  type="button"
                  onClick={() => handleSwitchRole(opt.id)}
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
            <Link href="/view-profile/security" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><ShieldCheck className="h-4 w-4" />My Sessions</Link>

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
