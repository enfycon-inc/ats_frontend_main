"use client";

import { QUICK_ACTIONS, APP_LAUNCHER_ITEMS } from "@/constants/navigation";
import Logout from "@/components/auth/logout";
import {
  Bell,
  MessageSquare,
  History,
  Calendar,
  Grid3X3,
  User,
  Settings,
  Mail,
  Zap,
  ChevronDown,
  CircleCheck,
  X,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import userImg from "@/public/assets/images/user.png";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { atsApi } from "@/lib/ats-api";
import { isRoleAdmin } from "@/lib/role-permissions";
import { OfficeClock } from "./office-clock";

// ─── Shared icon button base ─────────────────────────────────────────────────
function NavIconBtn({
  id,
  "aria-label": ariaLabel,
  "aria-expanded": ariaExpanded,
  badge,
  onClick,
  children,
}: {
  id: string;
  "aria-label": string;
  "aria-expanded"?: boolean;
  badge?: number;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      onClick={onClick}
      className={`
        relative flex items-center justify-center
        w-8 h-8 rounded
        text-white/75 hover:text-white
        hover:bg-white/12
        transition-colors duration-150
        cursor-pointer
        ${ariaExpanded ? "bg-white/14 text-white" : ""}
      `}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          aria-label={`${badge} unread`}
          className="
            absolute -top-0.5 -right-0.5
            min-w-[14px] h-[14px] px-[3px]
            rounded-full
            bg-red-500 text-white
            text-[9px] font-bold leading-[14px]
            flex items-center justify-center
            pointer-events-none
          "
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

// ─── Notification dropdown ────────────────────────────────────────────────────
function NotificationDropdownNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const notifications = [
    {
      id: 1,
      type: "success",
      title: "Application Received",
      desc: "John Smith applied for Senior Developer",
      time: "5 min ago",
    },
    {
      id: 2,
      type: "info",
      title: "Interview Scheduled",
      desc: "Interview with Sarah Lee at 3:00 PM today",
      time: "1 hr ago",
    },
    {
      id: 3,
      type: "warning",
      title: "Offer Pending",
      desc: "Offer letter for Alex Brown awaiting signature",
      time: "2 hrs ago",
    },
    {
      id: 4,
      type: "success",
      title: "Placement Confirmed",
      desc: "Michael Davis placed at Acme Corp",
      time: "Yesterday",
    },
    {
      id: 5,
      type: "info",
      title: "New Job Requisition",
      desc: "Tech Lead position opened by Client Solutions",
      time: "Yesterday",
    },
  ];

  const typeColors: Record<string, string> = {
    success: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
    info: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
    warning: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
  };

  return (
    <div ref={ref} className="relative">
      <NavIconBtn
        id="navbar-notifications"
        aria-label="Notifications"
        aria-expanded={open}
        badge={5}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="w-4 h-4" />
      </NavIconBtn>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications panel"
          className="
            absolute top-full right-0 mt-1 z-[300]
            w-[360px]
            bg-white dark:bg-[#1e2d50]
            border border-neutral-200 dark:border-white/10
            rounded shadow-xl shadow-black/25
            overflow-hidden
            animate-in fade-in-0 slide-in-from-top-2
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#1a4fa0] dark:bg-[#122f70]">
            <h3 className="text-[13px] font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              <span className="
                min-w-[20px] h-5 px-1.5 rounded-full
                bg-white/20 text-white text-[11px] font-bold
                flex items-center justify-center
              ">
                5
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="text-white/70 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-neutral-100 dark:divide-white/5">
            {notifications.map((n) => (
              <Link
                key={n.id}
                href="#"
                onClick={() => setOpen(false)}
                className="
                  flex items-start gap-3 px-4 py-3
                  hover:bg-blue-50/70 dark:hover:bg-white/5
                  transition-colors duration-100
                "
              >
                <div
                  className={`
                    flex-shrink-0 w-8 h-8 rounded-full
                    flex items-center justify-center mt-0.5
                    ${typeColors[n.type]}
                  `}
                >
                  <CircleCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-neutral-800 dark:text-white truncate">
                    {n.title}
                  </p>
                  <p className="text-[11.5px] text-neutral-500 dark:text-white/50 truncate">
                    {n.desc}
                  </p>
                </div>
                <span className="flex-shrink-0 text-[10.5px] text-neutral-400 dark:text-white/30 mt-0.5 whitespace-nowrap">
                  {n.time}
                </span>
              </Link>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-100 dark:border-white/8 px-4 py-2 text-center">
            <Link
              href="#"
              onClick={() => setOpen(false)}
              className="text-[12px] text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Messages icon (simple link) ─────────────────────────────────────────────
function MessagesIcon() {
  return (
    <Link href="/email" aria-label="Messages">
      <NavIconBtn id="navbar-messages" aria-label="Messages" badge={3}>
        <MessageSquare className="w-4 h-4" />
      </NavIconBtn>
    </Link>
  );
}

// ─── Activity history (simple link) ──────────────────────────────────────────
function ActivityIcon() {
  return (
    <Link href="#" aria-label="Activity history">
      <NavIconBtn id="navbar-activity" aria-label="Activity history">
        <History className="w-4 h-4" />
      </NavIconBtn>
    </Link>
  );
}

// ─── Calendar (simple link) ──────────────────────────────────────────────────
function CalendarIcon() {
  return (
    <Link href="/calendar" aria-label="Calendar">
      <NavIconBtn id="navbar-calendar" aria-label="Calendar">
        <Calendar className="w-4 h-4" />
      </NavIconBtn>
    </Link>
  );
}

// ─── Quick Actions dropdown ───────────────────────────────────────────────────
function QuickActionsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        id="navbar-quick-actions"
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`
          flex items-center gap-1.5
          h-7 px-2.5 rounded
          text-[11.5px] font-semibold
          transition-colors duration-150
          cursor-pointer whitespace-nowrap select-none
          ${open
            ? "bg-white text-[#1a4fa0]"
            : "bg-white/15 text-white hover:bg-white/22 border border-white/20"
          }
        `}
      >
        <Zap className="w-3.5 h-3.5 flex-shrink-0" />
        Quick Actions
        <ChevronDown
          className={`
            w-3 h-3 opacity-70
            transition-transform duration-200
            ${open ? "rotate-180" : ""}
          `}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Quick actions"
          className="
            absolute top-full right-0 mt-1 z-[300]
            w-[220px]
            bg-white dark:bg-[#1e2d50]
            border border-neutral-200 dark:border-white/10
            rounded shadow-xl shadow-black/20
            py-1
            animate-in fade-in-0 slide-in-from-top-2
          "
        >
          <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/30">
            Create New
          </p>
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="
                flex items-center gap-3 px-3 py-2
                text-[12.5px] text-neutral-700 dark:text-white/80
                hover:bg-blue-50 dark:hover:bg-white/8
                hover:text-blue-700 dark:hover:text-white
                transition-colors duration-100
              "
            >
              <div className="
                w-7 h-7 rounded
                bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400
                flex items-center justify-center flex-shrink-0
              ">
                <action.icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate leading-tight">{action.label}</p>
                {action.description && (
                  <p className="text-[10.5px] text-neutral-400 dark:text-white/30 truncate">
                    {action.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Apps launcher dropdown ───────────────────────────────────────────────────
function AppsLauncherDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <NavIconBtn
        id="navbar-apps"
        aria-label="App launcher"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Grid3X3 className="w-4 h-4" />
      </NavIconBtn>

      {open && (
        <div
          role="dialog"
          aria-label="App launcher"
          className="
            absolute top-full right-0 mt-1 z-[300]
            w-[260px]
            bg-white dark:bg-[#1e2d50]
            border border-neutral-200 dark:border-white/10
            rounded shadow-xl shadow-black/25
            overflow-hidden
            animate-in fade-in-0 slide-in-from-top-2
          "
        >
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-neutral-100 dark:border-white/8">
            <p className="text-[12px] font-semibold text-neutral-600 dark:text-white/70">
              enfySync Apps
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-4 gap-0.5 p-2">
            {APP_LAUNCHER_ITEMS.map((app) => (
              <Link
                key={app.id}
                href={app.href}
                onClick={() => setOpen(false)}
                className="
                  flex flex-col items-center gap-1.5 p-2
                  rounded
                  hover:bg-neutral-100 dark:hover:bg-white/8
                  transition-colors duration-100
                  text-center
                "
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: app.color + "20" }}
                >
                  <app.icon
                    className="w-4.5 h-4.5"
                    style={{ color: app.color }}
                  />
                </div>
                <span className="text-[10px] text-neutral-600 dark:text-white/60 leading-tight truncate w-full">
                  {app.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profile dropdown ─────────────────────────────────────────────────────────
// ─── Profile dropdown ─────────────────────────────────────────────────────────
function ProfileDropdownNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const [overrideRole, setOverrideRole] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);

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
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOverrideRole(localStorage.getItem("override_role"));
      const handleStorage = () => {
        setOverrideRole(localStorage.getItem("override_role"));
      };
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
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

  const userName = currentUser?.fullName || session?.user?.name || "Sahadeb";
  const userRoles = currentUser?.roles || (session as any)?.user?.roles || [];
  const systemRole = (session as any)?.user?.systemRole || userRoles[0];

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
    ADMIN: "Tenant Admin",
    BRANCH_ADMIN: "Branch Admin",
    ACCOUNT_MANAGER: "Account Manager",
    POD_LEAD: "Pod Lead",
    DELIVERY_HEAD: "Delivery Head",
    RECRUITER: "Recruiter",
  };

  // Dynamically resolve display label for any system role or tenant custom role alias
  const getDynamicRoleLabel = (roleStr: string): string => {
    if (!roleStr) return "User";
    if (isTechnicalKeycloakRole(roleStr)) return "Recruiter";
    const upper = roleStr.toUpperCase();
    if (systemRoleLabels[upper]) {
      return systemRoleLabels[upper];
    }
    const customRole = availableRoles.find(
      (r) => r.name.toUpperCase() === upper || r.id === roleStr
    );
    if (customRole) {
      return customRole.name;
    }
    if (upper === "ACCOUNT_MANAGER" || upper === "BDM" || upper === "BD_MANAGER" || upper === "BD MANAGER") {
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

  const assignedRoleOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { key: string; name: string; icon: string; replacesSystemRole?: string }[] = [];

    for (const uRole of userAssignedRoles) {
      if (!uRole || typeof uRole !== "string") continue;
      if (isTechnicalKeycloakRole(uRole)) continue;
      const uUpper = uRole.trim().toUpperCase();

      // 1. Check for matching custom role (prefer active branch if set)
      const customRole = availableRoles.find(
        (r) => !r.isSystem && (
          (!activeBranchId || !r.branchId || r.branchId === activeBranchId) &&
          (r.name.toUpperCase() === uUpper || r.id === uRole || (r.systemRole && r.systemRole.toUpperCase() === uUpper))
        )
      ) || availableRoles.find(
        (r) => !r.isSystem && (
          r.name.toUpperCase() === uUpper || r.id === uRole || (r.systemRole && r.systemRole.toUpperCase() === uUpper)
        )
      );

      let key = uRole;
      let name = uRole;
      let icon = "👤";
      let replacesSystemRole: string | undefined = undefined;

      if (customRole) {
        key = customRole.name;
        name = customRole.name;
        icon = "🎨";
        replacesSystemRole = customRole.systemRole || customRole.replacesSystemRole;
      } else if (uUpper === "ACCOUNT_MANAGER" || uUpper === "BDM" || uUpper === "BD_MANAGER" || uUpper === "BD MANAGER") {
        key = "Account Manager";
        name = "Account Manager";
        icon = "💼";
      } else if (systemRoleLabels[uUpper]) {
        key = uUpper;
        name = systemRoleLabels[uUpper];
        icon = uUpper === "ADMIN" || uUpper === "SUPER_ADMIN" ? "⚙️" : (uUpper === "ACCOUNT_MANAGER" ? "💼" : "👤");
      } else {
        key = uRole;
        name = uRole.replace(/_/g, " ");
      }

      const dedupeKey = name.trim().toUpperCase();
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        options.push({ key, name, icon, replacesSystemRole });
      }
    }

    return options;
  }, [userAssignedRoles, availableRoles, activeBranchId, systemRoleLabels]);

  // Auto-clear invalid override_role from localStorage ONLY AFTER availableRoles has finished loading
  useEffect(() => {
    if (rolesLoaded && overrideRole && assignedRoleOptions.length > 0) {
      const overrideUpper = overrideRole.toUpperCase();
      const isValidOverride = assignedRoleOptions.some(
        (opt: { key: string; name: string; replacesSystemRole?: string }) =>
          opt.key.toUpperCase() === overrideUpper ||
          opt.name.toUpperCase() === overrideUpper ||
          (opt.replacesSystemRole && opt.replacesSystemRole.toUpperCase() === overrideUpper)
      );
      if (!isValidOverride) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("override_role");
        }
        setOverrideRole(null);
      }
    }
  }, [rolesLoaded, overrideRole, assignedRoleOptions]);

  const handleSwitchRole = (roleName: string | null) => {
    if (typeof window !== "undefined") {
      if (roleName) {
        localStorage.setItem("override_role", roleName);
      } else {
        localStorage.removeItem("override_role");
      }
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("overrideRoleChanged", { detail: { role: roleName } }));
      window.location.reload();
    }
    setOpen(false);
  };

  const currentActiveRole = overrideRole || (assignedRoleOptions.length > 0 ? assignedRoleOptions[0].key : (userAssignedRoles[0] || "RECRUITER"));
  const displayRole = getDynamicRoleLabel(currentActiveRole);
  const isAdminActive = isRoleAdmin(currentActiveRole, availableRoles, currentUser);

  return (
    <div ref={ref} className="relative">
      <button
        id="navbar-profile"
        type="button"
        aria-label="User profile menu"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`
          flex items-center gap-2 px-2 h-8 rounded
          cursor-pointer
          transition-colors duration-150
          ${open ? "bg-white/14" : "hover:bg-white/10"}
        `}
      >
        {/* Avatar */}
        <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/30 bg-white/20 text-white flex items-center justify-center font-bold text-xs">
          {userName.charAt(0).toUpperCase()}
        </div>

        <div className="hidden xl:flex flex-col items-start leading-none min-w-0">
          <span className="text-[12px] font-semibold text-white truncate max-w-[100px]">
            {userName.split(" ")[0]}
          </span>
          <span className="text-[9.5px] text-blue-100/90 font-medium truncate max-w-[100px]">
            {displayRole}
          </span>
        </div>
        <ChevronDown
          className={`
            w-3 h-3 text-white/60
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
            absolute top-full right-0 mt-1 z-[300]
            w-[260px]
            bg-white dark:bg-[#182542]
            border border-neutral-200 dark:border-white/10
            rounded-lg shadow-xl shadow-black/20
            overflow-hidden
            animate-in fade-in-0 slide-in-from-top-2
          "
        >
          {/* User header */}
          <div className="px-4 py-3 bg-[#1a4fa0] dark:bg-[#0f2d6b] border-b border-[#143e80] dark:border-[#091d45]">
            <p className="text-[13px] font-semibold text-white">{userName}</p>
            <p className="text-[11px] text-blue-100/90 font-medium flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>{displayRole}</span>
            </p>
          </div>

          {/* DYNAMIC ASSIGNED ROLE SWITCHER SECTION */}
          {assignedRoleOptions.length > 1 && (
            <div className="p-2 border-b border-neutral-100 dark:border-white/10 bg-neutral-50/90 dark:bg-[#14223d]">
              <div className="px-2 pb-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-white/40">
                Switch Active Perspective
              </div>
              <div className="space-y-0.5 max-h-[160px] overflow-y-auto">
                {assignedRoleOptions.map((r: { key: string; name: string; icon: string }) => {
                  const isActive = currentActiveRole.toUpperCase() === r.key.toUpperCase() ||
                                   currentActiveRole.toUpperCase() === r.name.toUpperCase();
                  return (
                    <button
                      key={r.key}
                      onClick={() => handleSwitchRole(r.key)}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-[11.5px] transition-colors cursor-pointer flex justify-between items-center ${
                        isActive
                          ? "bg-[#1a4fa0] dark:bg-[#1f5bc0] text-white font-semibold shadow-xs"
                          : "text-neutral-700 dark:text-white/85 hover:bg-neutral-200/60 dark:hover:bg-white/10 font-normal"
                      }`}
                    >
                      <span className="truncate">{r.name}</span>
                      {isActive && <CircleCheck className="w-3.5 h-3.5 flex-shrink-0 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/view-profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="
                flex items-center gap-2.5 px-4 py-2
                text-[12.5px] text-neutral-700 dark:text-white/80
                hover:bg-blue-50 dark:hover:bg-white/8
                hover:text-blue-700 dark:hover:text-white
                transition-colors duration-100 font-medium
              "
            >
              <User className="w-3.5 h-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
              My Profile
            </Link>

            <Link
              href="/email"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="
                flex items-center gap-2.5 px-4 py-2
                text-[12.5px] text-neutral-700 dark:text-white/80
                hover:bg-blue-50 dark:hover:bg-white/8
                hover:text-blue-700 dark:hover:text-white
                transition-colors duration-100 font-medium
              "
            >
              <Mail className="w-3.5 h-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
              Inbox
            </Link>

            {isAdminActive && (
              <Link
                href="/utility/roles-permissions"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="
                  flex items-center gap-2.5 px-4 py-2
                  text-[12.5px] text-neutral-700 dark:text-white/80
                  hover:bg-blue-50 dark:hover:bg-white/8
                  hover:text-blue-700 dark:hover:text-white
                  transition-colors duration-100 font-medium
                "
              >
                <Settings className="w-3.5 h-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                Workspace Settings & RBAC
              </Link>
            )}

            <div className="border-t border-neutral-100 dark:border-white/8 mt-1 pt-1 px-4 pb-2">
              <Logout />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sandbox Switcher dropdown ────────────────────────────────────────────────
function SandboxSwitcher() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    atsApi.auth.listRoles().then(data => {
      if (Array.isArray(data) && data.length > 0) {
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

  const currentOverride = mounted ? localStorage.getItem("override_role") : null;

  const handleSelectRole = (role: string | null) => {
    if (typeof window !== "undefined") {
      if (role) {
        localStorage.setItem("override_role", role);
      } else {
        localStorage.removeItem("override_role");
      }
      window.location.reload();
    }
    setOpen(false);
  };

  const displayLabel = currentOverride ? `VIEW: ${currentOverride.replace("_", " ")}` : "VIEW: DEFAULT";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="
          flex items-center gap-1.5
          h-7 px-2.5 rounded
          text-[11px] font-bold uppercase tracking-wider
          bg-amber-500 hover:bg-amber-600 text-white
          transition-colors duration-150
          cursor-pointer whitespace-nowrap select-none
          shadow-sm
        "
      >
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{displayLabel}</span>
        <ChevronDown className={`w-3 h-3 opacity-80 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Sandbox role override"
          className="
            absolute top-full right-0 mt-1.5 z-[350]
            w-[200px]
            bg-white dark:bg-[#1e2d50]
            border border-neutral-200 dark:border-white/10
            rounded-lg shadow-xl shadow-black/25
            py-1 max-h-[300px] overflow-y-auto
            animate-in fade-in-0 slide-in-from-top-2
          "
        >
          <p className="px-3 pt-1 pb-1.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/30">
            Select Role View
          </p>
          <button
            onClick={() => handleSelectRole(null)}
            role="menuitem"
            className="w-full text-left px-3 py-1.5 text-[12px] text-neutral-700 dark:text-white/80 hover:bg-blue-50 dark:hover:bg-white/8 hover:text-blue-700 dark:hover:text-white transition-colors cursor-pointer font-medium"
          >
            🔄 System Default
          </button>
          {(() => {
            const seen = new Set<string>();
            const list: { key: string; name: string; icon: string }[] = [];
            const baseRoles = [
              { key: "ADMIN", name: "Tenant Admin", icon: "⚙️" },
              { key: "ACCOUNT_MANAGER", name: "Account Manager", icon: "💼" },
              { key: "BRANCH_ADMIN", name: "Branch Admin", icon: "🏢" },
              { key: "DELIVERY_HEAD", name: "Delivery Head", icon: "🚀" },
              { key: "POD_LEAD", name: "Pod Lead", icon: "👑" },
              { key: "RECRUITER", name: "Recruiter", icon: "👤" },
              ...availableRoles.filter((r) => !r.isSystem).map((r) => ({
                key: r.name,
                name: r.name,
                icon: "🎨",
              })),
            ];
            for (const item of baseRoles) {
              const k = item.name.toUpperCase();
              if (!seen.has(k)) {
                seen.add(k);
                list.push(item);
              }
            }
            return list.map((r) => (
              <button
                key={r.key}
                onClick={() => handleSelectRole(r.key)}
                role="menuitem"
                className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors cursor-pointer font-medium flex justify-between items-center ${
                  currentOverride?.toUpperCase() === r.key.toUpperCase() || currentOverride?.toUpperCase() === r.name.toUpperCase()
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold"
                    : "text-neutral-700 dark:text-white/80 hover:bg-blue-50 dark:hover:bg-white/8 hover:text-blue-700 dark:hover:text-white"
                }`}
              >
                <span className="truncate">{r.icon} {r.name}</span>
                {(currentOverride?.toUpperCase() === r.key.toUpperCase() || currentOverride?.toUpperCase() === r.name.toUpperCase()) && (
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                )}
              </button>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

function BranchSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const [overrideRole, setOverrideRole] = useState<string | null>(null);
  const [activeBranch, setActiveBranch] = useState<string>("Loading Branch...");
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOverrideRole(localStorage.getItem("override_role"));
    }
    loadLiveBranches();
  }, []);

  const loadLiveBranches = async () => {
    let currentUser = atsApi.auth.getCurrentUser() || (session as any)?.user;

    if (currentUser?.id) {
      try {
        const freshProfile = await atsApi.auth.getProfile(currentUser.id);
        if (freshProfile) {
          currentUser = { ...currentUser, ...freshProfile };
          if (typeof window !== "undefined") {
            atsApi.auth.setCurrentUser(currentUser);
          }
        }
      } catch (e) {
        // Fall back to cached user
      }
    }

    const fallbackBranchName = currentUser?.branchName || "Domestic Branch";

    try {
      const data = await atsApi.branches.list();
      if (Array.isArray(data) && data.length > 0) {
        const sysRole = overrideRole || currentUser?.systemRole || (currentUser?.roles && currentUser.roles[0]) || "RECRUITER";
        const isTenantAdmin = sysRole === "ADMIN" || sysRole === "SUPER_ADMIN";

        // Extract user's assigned branch IDs
        const assignedIds: string[] = Array.isArray(currentUser?.assignedBranchIds) && currentUser.assignedBranchIds.length > 0
          ? currentUser.assignedBranchIds
          : currentUser?.branchId ? [currentUser.branchId] : [];

        // Access Control Rule:
        // Tenant Admin sees ALL branches in the tenant.
        // Non-tenant admin users ONLY see the branches they are explicitly assigned to.
        let allowedBranches = data;
        if (!isTenantAdmin) {
          if (assignedIds.length > 0) {
            allowedBranches = data.filter((b: any) =>
              assignedIds.includes(b.id) ||
              (currentUser?.branchId && b.id === currentUser.branchId) ||
              (currentUser?.branchName && b.name.toLowerCase() === currentUser.branchName.toLowerCase())
            );
          } else if (currentUser?.branchId) {
            allowedBranches = data.filter((b: any) => b.id === currentUser.branchId);
          } else {
            allowedBranches = data.slice(0, 1);
          }
        }

        setBranches(allowedBranches);

        let match = null;

        const savedId = typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
        if (savedId) {
          match = allowedBranches.find((b: any) => b.id === savedId);
        }

        if (!match) {
          const savedName = typeof window !== "undefined" ? localStorage.getItem("active_branch_name") : null;
          if (savedName) {
            match = allowedBranches.find((b: any) => b.name === savedName);
          }
        }

        if (!match && currentUser?.branchId) {
          match = allowedBranches.find((b: any) => b.id === currentUser.branchId);
        }

        if (!match && currentUser?.branchName) {
          match = allowedBranches.find((b: any) => b.name?.toLowerCase() === currentUser.branchName.toLowerCase());
        }

        if (!match) {
          match = allowedBranches[0];
        }

        if (match) {
          setActiveBranch(match.name);
          if (typeof window !== "undefined") {
            localStorage.setItem("active_branch_id", match.id);
            localStorage.setItem("active_branch_name", match.name);
            localStorage.setItem("active_branch_market", match.market || "INDIA");
            localStorage.setItem("active_branch_timezone", match.timezone || (match.market === "US" ? "America/New_York" : "Asia/Kolkata"));
            localStorage.setItem("active_branch_start_time", match.workStartTime || match.work_start_time || (match.market === "US" ? "09:00 AM" : "09:30 AM"));
            localStorage.setItem("active_branch_end_time", match.workEndTime || match.work_end_time || (match.market === "US" ? "06:00 PM" : "06:30 PM"));
            window.dispatchEvent(new Event("branchChanged"));
          }
        }
      } else {
        setActiveBranch(fallbackBranchName);
      }
    } catch (err) {
      console.warn("Could not fetch branches:", err);
      setActiveBranch(fallbackBranchName);
    }
  };

  const currentUser = typeof window !== "undefined" ? atsApi.auth.getCurrentUser() : null;
  const systemRole = overrideRole || currentUser?.systemRole || (session as any)?.user?.systemRole || "RECRUITER";
  const isTenantAdmin = systemRole === "ADMIN" || systemRole === "SUPER_ADMIN";

  // Rule: Only Tenant Admin or users assigned to multiple branches can switch branch context.
  const canSwitchBranch = isTenantAdmin || branches.length > 1;

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const handleSelectBranch = (b: any) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("active_branch_id", b.id);
      localStorage.setItem("active_branch_name", b.name);
      localStorage.setItem("active_branch_market", b.market || "INDIA");
      localStorage.setItem("active_branch_timezone", b.timezone || (b.market === "US" ? "America/New_York" : "Asia/Kolkata"));
      localStorage.setItem("active_branch_start_time", b.workStartTime || b.work_start_time || (b.market === "US" ? "09:00 AM" : "09:30 AM"));
      localStorage.setItem("active_branch_end_time", b.workEndTime || b.work_end_time || (b.market === "US" ? "06:00 PM" : "06:30 PM"));
      window.dispatchEvent(new Event("branchChanged"));
      setActiveBranch(b.name);
      window.location.reload();
    }
    setOpen(false);
  };

  if (!canSwitchBranch) {
    return (
      <div 
        title="Your branch context is assigned to your home office. Contact Tenant Admin for multi-branch access."
        className="
          flex items-center gap-1.5
          h-7 px-2.5 rounded-lg
          text-[11px] font-bold tracking-wide
          bg-white/10 text-white/90
          border border-white/15 shadow-2xs
          cursor-default select-none
        "
      >
        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-indigo-200" />
        <span>Office: {activeBranch}</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="
          flex items-center gap-1.5
          h-7 px-2.5 rounded-lg
          text-[11px] font-bold tracking-wide
          bg-white/12 hover:bg-white/20 text-white
          transition-all duration-150
          cursor-pointer whitespace-nowrap select-none
          shadow-2xs border border-white/20 backdrop-blur-xs
        "
      >
        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-indigo-200" />
        <span>Office: {activeBranch}</span>
        <ChevronDown className={`w-3 h-3 text-indigo-200 opacity-90 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Select Active Branch Context"
          className="
            absolute top-full right-0 mt-1.5 z-[350]
            w-[230px]
            bg-white dark:bg-slate-900
            border border-neutral-200 dark:border-slate-800
            rounded-xl shadow-xl shadow-black/20
            py-1.5 overflow-hidden
            animate-in fade-in-0 slide-in-from-top-2
          "
        >
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => handleSelectBranch(b)}
              role="menuitem"
              className={`
                w-full text-left px-3 py-2 text-[12px] transition-all cursor-pointer flex justify-between items-center
                ${activeBranch === b.name
                  ? "bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold border-l-2 border-indigo-600 dark:border-indigo-400"
                  : "text-neutral-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-800/80 font-medium"
                }
              `}
            >
              <div className="flex flex-col">
                <span className="font-bold">🏢 {b.name}</span>
                <span className="text-[9.5px] text-neutral-400 font-normal">{b.city} • {b.market === "US" ? "US IT" : "Domestic India"}</span>
              </div>
              {activeBranch === b.name && (
                <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Exported Right Section ───────────────────────────────────────────────────
export function NavbarRight() {
  return (
    <div className="flex items-center gap-1.5">
      <OfficeClock />

      <BranchSwitcher />

      {/* Divider */}
      <div className="w-px h-5 bg-white/15 mx-0.5 flex-shrink-0" />

      <QuickActionsDropdown />

      {/* Divider */}
      <div className="w-px h-5 bg-white/15 mx-1 flex-shrink-0" />

      <NotificationDropdownNav />
      <MessagesIcon />
      <ActivityIcon />
      <CalendarIcon />
      <AppsLauncherDropdown />

      {/* Divider */}
      <div className="w-px h-5 bg-white/15 mx-1 flex-shrink-0" />

      {/* Theme toggle – adapted for dark navbar */}
      <div className="navbar-theme-toggle [&_button]:!bg-white/10 [&_button]:!text-white/75 [&_button:hover]:!bg-white/18 [&_button:hover]:!text-white [&_button]:!border-0 [&_button]:!rounded [&_button]:!w-8 [&_button]:!h-8 [&_svg]:!text-white/75">
        <ModeToggle />
      </div>

      <ProfileDropdownNav />
    </div>
  );
}
