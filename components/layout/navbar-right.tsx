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

import { useNotifications } from "@/contexts/NotificationContext";
import { useSocket } from "@/contexts/SocketContext";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  Volume2,
  VolumeX,
  CheckCheck,
  Megaphone,
  Briefcase,
  UserCheck,
  ChevronRight,
  FileText,
  ExternalLink,
  Building2,
  Tag,
  Eye,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Notification dropdown ────────────────────────────────────────────────────
function NotificationDropdownNav() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD" | "JOBS" | "REVIEWS">("ALL");
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    settings,
    setSoundEnabled,
  } = useNotifications();
  const { isConnected } = useSocket();

  const sessionUser = (session as any)?.user;
  const userPerms: string[] = sessionUser?.permissions || [];
  const userRoles: string[] = sessionUser?.roles || [sessionUser?.systemRole || "RECRUITER"];
  const canViewActivityStream =
    userRoles.some((r: string) => ["ADMIN", "SUPER_ADMIN", "BRANCH_ADMIN", "DELIVERY_HEAD"].includes(r)) ||
    userPerms.includes("notification:view_all") ||
    userPerms.includes("notification:broadcast") ||
    userPerms.includes("audit:view");

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedNotification(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === "UNREAD") return !n.isRead;
      if (activeTab === "JOBS") return n.type.includes("JOB") || n.type === "NEW_JOB";
      if (activeTab === "REVIEWS") return n.type === "JOB_PENDING_APPROVAL" || n.type === "REVIEWER_ASSIGNED";
      return true;
    });
  }, [notifications, activeTab]);

  const getIcon = (type: string) => {
    switch (type) {
      case "JOB_PENDING_APPROVAL":
        return <Briefcase className="w-4 h-4 text-amber-500" />;
      case "JOB_APPROVED":
        return <CircleCheck className="w-4 h-4 text-green-500" />;
      case "JOB_REJECTED":
        return <X className="w-4 h-4 text-red-500" />;
      case "JOB_NEW":
        return <Briefcase className="w-4 h-4 text-blue-500" />;
      case "ANNOUNCEMENT":
        return <Megaphone className="w-4 h-4 text-purple-500" />;
      case "REVIEWER_ASSIGNED":
        return <UserCheck className="w-4 h-4 text-teal-500" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "JOB_PENDING_APPROVAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
            <Briefcase className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Pending Approval
          </span>
        );
      case "JOB_APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
            <CircleCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Approved
          </span>
        );
      case "JOB_REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">
            <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            Rejected
          </span>
        );
      case "JOB_NEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
            <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            New Job
          </span>
        );
      case "ANNOUNCEMENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50">
            <Megaphone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Announcement
          </span>
        );
      case "REVIEWER_ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900/50">
            <UserCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Reviewer Assigned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Bell className="w-3.5 h-3.5 text-slate-500" />
            {type.replace(/_/g, " ")}
          </span>
        );
    }
  };

  const handleNotificationClick = (n: any) => {
    if (!n.isRead) {
      markAsRead(n.id);
    }
    setSelectedNotification({ ...n, isRead: true });
  };

  return (
    <div ref={ref} className="relative h-full flex items-center">
      <NavIconBtn
        id="navbar-notifications"
        aria-label="Notifications"
        aria-expanded={open}
        badge={unreadCount > 0 ? unreadCount : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="w-4 h-4" />
      </NavIconBtn>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications Panel"
          className="
            absolute right-0 top-full z-[300]
            mt-1 w-[380px] max-w-[calc(100vw-24px)]
            bg-white dark:bg-neutral-900
            border border-neutral-200 dark:border-neutral-800
            rounded-xl shadow-2xl
            overflow-hidden
            animate-in fade-in-0 slide-in-from-top-2
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#1a4fa0] dark:bg-[#122f70]">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="
                  min-w-[20px] h-5 px-1.5 rounded-full
                  bg-amber-400 text-neutral-950 text-[10.5px] font-bold
                  flex items-center justify-center
                ">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSoundEnabled(!settings.soundEnabled)}
                title={settings.soundEnabled ? "Mute notification sounds" : "Enable notification sounds"}
                className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                {settings.soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-amber-300" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-white/50" />
                )}
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead()}
                  title="Mark all as read"
                  className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-white" />
                </button>
              )}

              <button
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="text-white/70 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/50 px-3 py-1.5 gap-1 text-[11.5px]">
            {(["ALL", "UNREAD", "REVIEWS", "JOBS"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`
                  px-2.5 py-1 rounded font-medium transition-colors
                  ${activeTab === tab
                    ? "bg-[#1a4fa0] text-white font-semibold"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800"
                  }
                `}
              >
                {tab === "ALL" && `All (${notifications.length})`}
                {tab === "UNREAD" && `Unread (${unreadCount})`}
                {tab === "REVIEWS" && "Reviews"}
                {tab === "JOBS" && "Jobs"}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {filteredNotifications.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 dark:text-neutral-500 text-xs">
                No notifications to display
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`
                    px-4 py-3 transition-colors cursor-pointer flex gap-3 items-start group
                    ${!n.isRead
                      ? "bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/30"
                      : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                    }
                  `}
                >
                  <div className="mt-0.5 p-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex-shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-[12.5px] leading-tight truncate ${!n.isRead ? "font-semibold text-neutral-900 dark:text-white" : "font-medium text-neutral-700 dark:text-neutral-300"}`}>
                        {n.title}
                      </p>
                      {!n.isRead ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1a4fa0] dark:bg-blue-400 flex-shrink-0" />
                      ) : (
                        <Eye className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 leading-snug line-clamp-2">
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[10.5px] text-neutral-400">
                      <span>{formatDistanceToNow(parseISO(n.createdAt || n.timestamp || new Date().toISOString()), { addSuffix: true })}</span>
                      {n.data?.jobCode && (
                        <span className="font-semibold text-[#1a4fa0] dark:text-blue-400">
                          {n.data.jobCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-2 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center justify-between text-[11.5px]">
            <Link
              href="/utility/settings-notifications"
              onClick={() => setOpen(false)}
              className="text-neutral-600 dark:text-neutral-300 font-medium hover:text-[#1a4fa0] dark:hover:text-blue-400 flex items-center gap-1"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Sound & Tone Preferences</span>
            </Link>

            {canViewActivityStream && (
              <Link
                href="/utility/notifications"
                onClick={() => setOpen(false)}
                className="text-[#1a4fa0] dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
              >
                <span>Live Activity Stream</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ─── FULL NOTIFICATION DETAILS MODAL ────────────────────────────── */}
      {selectedNotification && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNotification(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-detail-title"
            className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#1a4fa0] dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900/50 shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="notification-detail-title" className="text-sm font-bold text-neutral-900 dark:text-white">
                    Notification Details
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    ID: <span className="font-mono">{selectedNotification.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Subject Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-neutral-50/80 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700/60">
                <div className="space-y-1">
                  <span className="text-[10.5px] font-semibold text-neutral-500 uppercase tracking-wider">Subject</span>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white leading-snug">
                    {selectedNotification.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getEventBadge(selectedNotification.type)}
                </div>
              </div>

              {/* Message Content Box */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#1a4fa0] dark:text-blue-400" /> Full Message Content
                </span>
                <div className="p-4 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[13px] text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed shadow-2xs font-sans">
                  {selectedNotification.message}
                </div>
              </div>

              {/* Metadata Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Time Received */}
                <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/20 space-y-1">
                  <span className="text-[10.5px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#1a4fa0] dark:text-blue-400" /> Received At
                  </span>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">
                    {selectedNotification.createdAt || selectedNotification.timestamp
                      ? formatDistanceToNow(parseISO(selectedNotification.createdAt || selectedNotification.timestamp), { addSuffix: true })
                      : "Just now"}
                  </p>
                  {(selectedNotification.createdAt || selectedNotification.timestamp) && (
                    <p className="text-[10.5px] text-neutral-500 font-mono">
                      {new Date(selectedNotification.createdAt || selectedNotification.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Sender / Initiator */}
                <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/20 space-y-1">
                  <span className="text-[10.5px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3 text-[#1a4fa0] dark:text-blue-400" /> Initiator / Source
                  </span>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {selectedNotification.initiatorName || selectedNotification.data?.initiatorName || selectedNotification.data?.sender || "System Notification"}
                  </p>
                  {selectedNotification.initiatorEmail && (
                    <p className="text-[10.5px] text-neutral-500 font-mono truncate">
                      {selectedNotification.initiatorEmail}
                    </p>
                  )}
                </div>

                {/* Job Requisition Reference (if available) */}
                {(selectedNotification.data?.jobCode || selectedNotification.data?.jobTitle) && (
                  <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/20 space-y-1 sm:col-span-2">
                    <span className="text-[10.5px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-[#1a4fa0] dark:text-blue-400" /> Associated Requisition
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        {selectedNotification.data?.jobCode && (
                          <span className="font-mono text-xs font-bold text-[#1a4fa0] dark:text-blue-400 mr-2">
                            {selectedNotification.data.jobCode}
                          </span>
                        )}
                        {selectedNotification.data?.jobTitle && (
                          <span className="text-xs text-neutral-800 dark:text-neutral-200 font-medium">
                            {selectedNotification.data.jobTitle}
                          </span>
                        )}
                      </div>
                      {selectedNotification.data?.clientName && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                          {selectedNotification.data.clientName}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedNotification(null)}
                className="h-8 px-4 text-xs font-semibold"
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                {(selectedNotification.data?.jobId || selectedNotification.data?.jobCode) && (
                  <Link
                    href={`/job-posting/${selectedNotification.data.jobId || selectedNotification.data.jobCode}`}
                    onClick={() => {
                      setSelectedNotification(null);
                      setOpen(false);
                    }}
                  >
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-4 text-xs font-semibold bg-[#1a4fa0] hover:bg-[#153f80] text-white"
                    >
                      <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                      View Job Requisition
                      <ExternalLink className="w-3 h-3 ml-1.5" />
                    </Button>
                  </Link>
                )}

                {selectedNotification.data?.submissionId && (
                  <Link
                    href="/utility/submissions"
                    onClick={() => {
                      setSelectedNotification(null);
                      setOpen(false);
                    }}
                  >
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-4 text-xs font-semibold bg-[#1a4fa0] hover:bg-[#153f80] text-white"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                      View Submissions
                      <ExternalLink className="w-3 h-3 ml-1.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
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
  const [liveUserLoaded, setLiveUserLoaded] = useState(false);

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
    if (upper === "BDM") {
      return "BDM";
    }
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
      } else if (uUpper === "BDM") {
        key = "BDM";
        name = "BDM";
        icon = "💼";
        replacesSystemRole = "ACCOUNT_MANAGER";
      } else if (uUpper === "ACCOUNT_MANAGER" || uUpper === "BD_MANAGER" || uUpper === "BD MANAGER") {
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

  // Auto-clear invalid override_role ONLY after BOTH live user profile AND roles list have fully loaded.
  // Critical: if we run this before liveUser resolves, userAssignedRoles only contains the cached
  // localStorage roles (e.g. ["RECRUITER"]) and will incorrectly clear a valid Branch Admin override.
  useEffect(() => {
    if (!rolesLoaded || !liveUserLoaded || !overrideRole) return;
    // Also skip clearing if the user has no assigned roles yet (roles are still resolving)
    if (userAssignedRoles.length === 0 && assignedRoleOptions.length === 0) return;

    const overrideNorm = overrideRole.toUpperCase().replace(/[\s\-_]/g, "");
    const isValidOverride =
      assignedRoleOptions.some(
        (opt: { key: string; name: string; replacesSystemRole?: string }) =>
          opt.key.toUpperCase().replace(/[\s\-_]/g, "") === overrideNorm ||
          opt.name.toUpperCase().replace(/[\s\-_]/g, "") === overrideNorm ||
          (opt.replacesSystemRole &&
            opt.replacesSystemRole.toUpperCase().replace(/[\s\-_]/g, "") === overrideNorm)
      ) ||
      userAssignedRoles.some(
        (r: string) => r.toUpperCase().replace(/[\s\-_]/g, "") === overrideNorm
      );
    if (!isValidOverride) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("override_role");
      }
      setOverrideRole(null);
    }
  }, [rolesLoaded, liveUserLoaded, overrideRole, assignedRoleOptions, userAssignedRoles]);

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
