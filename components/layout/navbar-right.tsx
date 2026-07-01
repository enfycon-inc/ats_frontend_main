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
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import userImg from "@/public/assets/images/user.png";
import { ModeToggle } from "@/components/shared/mode-toggle";

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
function ProfileDropdownNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const userName = session?.user?.name ?? "Sahadeb";
  const userRole = "Recruitment Admin";

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
        <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/30">
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt={userName}
              fill
              className="object-cover"
            />
          ) : (
            <Image
              src={userImg}
              alt={userName}
              fill
              className="object-cover"
            />
          )}
        </div>

        <div className="hidden xl:flex flex-col items-start leading-none min-w-0">
          <span className="text-[12px] font-semibold text-white truncate max-w-[100px]">
            {userName.split(" ")[0]}
          </span>
          <span className="text-[9.5px] text-white/50 truncate max-w-[100px]">
            {userRole}
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
            w-[240px]
            bg-white dark:bg-[#1e2d50]
            border border-neutral-200 dark:border-white/10
            rounded shadow-xl shadow-black/25
            overflow-hidden
            animate-in fade-in-0 slide-in-from-top-2
          "
        >
          {/* User header */}
          <div className="px-4 py-3 bg-[#1a4fa0] dark:bg-[#122f70]">
            <p className="text-[13.5px] font-semibold text-white">{userName}</p>
            <p className="text-[11px] text-blue-200/80">{userRole}</p>
          </div>

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
                transition-colors duration-100
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
                transition-colors duration-100
              "
            >
              <Mail className="w-3.5 h-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
              Inbox
            </Link>

            <Link
              href="/company"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="
                flex items-center gap-2.5 px-4 py-2
                text-[12.5px] text-neutral-700 dark:text-white/80
                hover:bg-blue-50 dark:hover:bg-white/8
                hover:text-blue-700 dark:hover:text-white
                transition-colors duration-100
              "
            >
              <Settings className="w-3.5 h-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
              Settings
            </Link>

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const currentOverride = typeof window !== "undefined" ? localStorage.getItem("override_role") : null;

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

  const displayLabel = currentOverride ? `View: ${currentOverride.replace("_", " ")}` : "Switch View";

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
            w-[180px]
            bg-white dark:bg-[#1e2d50]
            border border-neutral-200 dark:border-white/10
            rounded shadow-xl shadow-black/25
            py-1
            animate-in fade-in-0 slide-in-from-top-2
          "
        >
          <p className="px-3 pt-1 pb-1.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/30">
            Select Dashboard View
          </p>
          <button
            onClick={() => handleSelectRole(null)}
            role="menuitem"
            className="w-full text-left px-3 py-1.5 text-[12px] text-neutral-700 dark:text-white/80 hover:bg-blue-50 dark:hover:bg-white/8 hover:text-blue-700 dark:hover:text-white transition-colors cursor-pointer font-medium"
          >
            🔄 System Default
          </button>
          <button
            onClick={() => handleSelectRole("SUPER_ADMIN")}
            role="menuitem"
            className="w-full text-left px-3 py-1.5 text-[12px] text-neutral-700 dark:text-white/80 hover:bg-blue-50 dark:hover:bg-white/8 hover:text-blue-700 dark:hover:text-white transition-colors cursor-pointer font-medium"
          >
            🛡️ Global Admin
          </button>
          <button
            onClick={() => handleSelectRole("ADMIN")}
            role="menuitem"
            className="w-full text-left px-3 py-1.5 text-[12px] text-neutral-700 dark:text-white/80 hover:bg-blue-50 dark:hover:bg-white/8 hover:text-blue-700 dark:hover:text-white transition-colors cursor-pointer font-medium"
          >
            ⚙️ Tenant Admin
          </button>
          <button
            onClick={() => handleSelectRole("ACCOUNT_MANAGER")}
            role="menuitem"
            className="w-full text-left px-3 py-1.5 text-[12px] text-neutral-700 dark:text-white/80 hover:bg-blue-50 dark:hover:bg-white/8 hover:text-blue-700 dark:hover:text-white transition-colors cursor-pointer font-medium"
          >
            💼 Account Manager
          </button>
          <button
            onClick={() => handleSelectRole("POD_LEAD")}
            role="menuitem"
            className="w-full text-left px-3 py-1.5 text-[12px] text-neutral-700 dark:text-white/80 hover:bg-blue-50 dark:hover:bg-white/8 hover:text-blue-700 dark:hover:text-white transition-colors cursor-pointer font-medium"
          >
            👑 Pod Lead
          </button>
          <button
            onClick={() => handleSelectRole("RECRUITER")}
            role="menuitem"
            className="w-full text-left px-3 py-1.5 text-[12px] text-neutral-700 dark:text-white/80 hover:bg-blue-50 dark:hover:bg-white/8 hover:text-blue-700 dark:hover:text-white transition-colors cursor-pointer font-medium"
          >
            👤 Recruiter
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Exported Right Section ───────────────────────────────────────────────────
export function NavbarRight() {
  return (
    <div className="flex items-center gap-1.5">
      <SandboxSwitcher />

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
