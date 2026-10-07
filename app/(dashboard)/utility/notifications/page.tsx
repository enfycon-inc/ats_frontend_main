"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { activeRoleHeaders } from "@/lib/ats-api";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { useSocket } from "@/contexts/SocketContext";
import {
  Bell,
  RefreshCw,
  Search,
  Filter,
  Megaphone,
  CheckCircle2,
  XCircle,
  Briefcase,
  UserCheck,
  Send,
  Loader2,
  SlidersHorizontal,
  ArrowRight,
  Activity,
  Building2,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Clock,
  User,
  Mail,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import { formatDistanceToNow, parseISO } from "date-fns";

interface AdminNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
  branchName?: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    roles: string[];
  };
  initiator?: {
    fullName: string;
    email: string;
    roles: string[];
  } | null;
}

export default function AdminNotificationsPage() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken || (session as any)?.user?.accessToken || (session as any)?.token;
  const { socket, isConnected } = useSocket();

  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  // Selected Notification for Detail Modal
  const [selectedItemForModal, setSelectedItemForModal] = useState<AdminNotificationItem | null>(null);

  // Broadcast Modal
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<"ALL" | "BRANCH" | "ROLE">("ALL");
  const [broadcastTargetId, setBroadcastTargetId] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Fetch branches for filter and broadcast
  useEffect(() => {
    if (!token) return;
    fetch(`${apiUrl}/api/branches`, {
      headers: { ...activeRoleHeaders(), Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setBranches(data.map((b) => ({ id: b.id, name: b.name })));
        }
      })
      .catch(() => {});
  }, [token, apiUrl]);

  // Fetch global admin notifications feed
  const fetchAdminNotifications = useCallback(
    async (pageNum = 1, isSilent = false) => {
      if (!token) return;
      try {
        if (!isSilent) setIsLoading(true);
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(limit),
        });
        if (selectedType !== "ALL") params.append("type", selectedType);
        if (selectedBranch !== "ALL") params.append("branchId", selectedBranch);
        if (searchQuery.trim()) params.append("search", searchQuery.trim());

        const res = await fetch(`${apiUrl}/api/notifications/admin/all?${params.toString()}`, {
          headers: { ...activeRoleHeaders(), Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          setNotifications(json.data || []);
          setTotalPages(json.totalPages || 1);
          setTotalCount(json.total || 0);
          setPage(json.page || pageNum);
        }
      } catch (e) {
        console.error("Failed to load admin notifications:", e);
        toast.error("Failed to load notifications feed");
      } finally {
        setIsLoading(false);
      }
    },
    [token, apiUrl, selectedType, selectedBranch, searchQuery, limit]
  );

  useEffect(() => {
    fetchAdminNotifications(1);
  }, [fetchAdminNotifications]);

  // Dynamic toggle read status handler
  const handleToggleReadStatus = async (item: AdminNotificationItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStatus = !item.isRead;

    // Optimistic UI state update
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: nextStatus } : n))
    );
    if (selectedItemForModal && selectedItemForModal.id === item.id) {
      setSelectedItemForModal((prev) => (prev ? { ...prev, isRead: nextStatus } : null));
    }

    try {
      const res = await fetch(`${apiUrl}/api/notifications/${item.id}/toggle-read`, {
        method: "PATCH",
        headers: {
          ...activeRoleHeaders(), Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: nextStatus }),
      });
      if (res.ok) {
        toast.success(nextStatus ? "Marked as Read" : "Marked as Unread", { id: `toast-${item.id}` });
      } else {
        // Fallback to standard read endpoint if toggle-read isn't available
        await fetch(`${apiUrl}/api/notifications/${item.id}/read`, {
          method: "PATCH",
          headers: { ...activeRoleHeaders(), Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error("Failed to toggle read status:", err);
    }
  };

  // Open modal and automatically mark notification as read if unread
  const handleOpenViewModal = async (item: AdminNotificationItem) => {
    setSelectedItemForModal({ ...item, isRead: true });
    if (!item.isRead) {
      // Optimistically update notifications list
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      try {
        const res = await fetch(`${apiUrl}/api/notifications/${item.id}/toggle-read`, {
          method: "PATCH",
          headers: {
            ...activeRoleHeaders(), Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isRead: true }),
        });
        if (!res.ok) {
          await fetch(`${apiUrl}/api/notifications/${item.id}/read`, {
            method: "PATCH",
            headers: { ...activeRoleHeaders(), Authorization: `Bearer ${token}` },
          });
        }
      } catch (err) {
        console.error("Failed to mark as read on view:", err);
      }
    }
  };

  // Real-time listener for admin notification stream
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleAdminFeed = (newNotif: AdminNotificationItem) => {
      console.log("[AdminNotifications] Live event received:", newNotif);
      setNotifications((prev) => [newNotif, ...prev]);
      setTotalCount((c) => c + 1);
    };

    socket.on("admin_notification", handleAdminFeed);

    return () => {
      socket.off("admin_notification", handleAdminFeed);
    };
  }, [socket, isConnected]);

  // Handle Broadcast submit
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error("Please provide both a title and message.");
      return;
    }

    setIsBroadcasting(true);
    try {
      const res = await fetch(`${apiUrl}/api/notifications/admin/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...activeRoleHeaders(), Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          target: broadcastTarget,
          targetId: broadcastTargetId || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to dispatch broadcast");
      const data = await res.json();
      toast.success(`Announcement broadcast to ${data.recipientsCount || 0} user(s)!`);
      setIsBroadcastModalOpen(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
      fetchAdminNotifications(1, true);
    } catch (err: any) {
      toast.error(err.message || "Failed to broadcast announcement");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "JOB_PENDING_APPROVAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
            <Briefcase className="w-3 h-3" />
            Pending Review
          </span>
        );
      case "JOB_APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
            <CheckCircle2 className="w-3 h-3" />
            Job Approved
          </span>
        );
      case "SUBMISSION_APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            Submission Approved
          </span>
        );
      case "JOB_REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
            <XCircle className="w-3 h-3" />
            Job Rejected
          </span>
        );
      case "SUBMISSION_REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
            <XCircle className="w-3 h-3" />
            Submission Rejected
          </span>
        );
      case "SUBMISSION_PENDING_APPROVAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
            <Briefcase className="w-3 h-3" />
            Pending Review
          </span>
        );
      case "INTERVIEW_SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300">
            <Clock className="w-3 h-3" />
            Interview Scheduled
          </span>
        );
      case "SUBMISSION_OFFER":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
            <UserCheck className="w-3 h-3" />
            Offer Extended
          </span>
        );
      case "SUBMISSION_PLACED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            Placed / Joined
          </span>
        );
      case "JOB_NEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            <Briefcase className="w-3 h-3" />
            New Job
          </span>
        );
      case "ANNOUNCEMENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
            <Megaphone className="w-3 h-3" />
            Announcement
          </span>
        );
      case "REVIEWER_ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
            <UserCheck className="w-3 h-3" />
            Reviewer Assigned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            <Bell className="w-3 h-3" />
            {type.replace(/_/g, " ")}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <DashboardBreadcrumb title="Live Activity Stream" text="Operations & Logs" />

      {/* ─── ENTERPRISE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#1a4fa0] dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                Live Activity Stream
              </h1>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live WS Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Reconnecting...
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Real-time operational activity stream of recruitment events, job status transitions, and branch announcements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAdminNotifications(page, true)}
            className="text-xs font-semibold h-9 px-3.5 border-neutral-200 dark:border-slate-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Feed
          </Button>

          <Button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="bg-[#1a4fa0] hover:bg-[#153f80] text-white text-xs font-semibold px-4 py-2 h-9 rounded-lg shadow-xs cursor-pointer"
          >
            <Megaphone className="w-4 h-4 mr-1.5" />
            Broadcast Alert
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-[#1a233a] rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search title, message, user, sender..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700
                bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100
                focus:outline-none focus:ring-2 focus:ring-[#1a4fa0]
              "
            />
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="
                w-full py-2 px-3 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700
                bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100
                focus:outline-none focus:ring-2 focus:ring-[#1a4fa0]
              "
            >
              <option value="ALL">All Event Types</option>
              <option value="JOB_PENDING_APPROVAL">Pending Approval (Review Gate)</option>
              <option value="JOB_APPROVED">Job Approved</option>
              <option value="JOB_REJECTED">Job Rejected</option>
              <option value="JOB_NEW">New Job Assigned</option>
              <option value="ANNOUNCEMENT">Admin Announcement</option>
              <option value="REVIEWER_ASSIGNED">Reviewer Assigned</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-neutral-400 shrink-0" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="
                w-full py-2 px-3 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700
                bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100
                focus:outline-none focus:ring-2 focus:ring-[#1a4fa0]
              "
            >
              <option value="ALL">All Branch Offices</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between bg-neutral-50/50 dark:bg-slate-900/50">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#1a4fa0]" />
            Audit Stream ({totalCount} total events)
          </p>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
            Page {page} of {totalPages}
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#1a4fa0]" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading notification audit stream...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 space-y-2">
            <Bell className="w-10 h-10 mx-auto opacity-40 text-neutral-400" />
            <p className="text-sm font-medium">No notification events match your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-slate-800/60 text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Sender / Initiator</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Subject & Message</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800 text-xs">
                {notifications.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Initiator */}
                    <td className="py-3 px-4">
                      {item.initiator ? (
                        <div>
                          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                            {item.initiator.fullName}
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                            {item.initiator.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400 font-mono">System Workflow</span>
                      )}
                    </td>

                    {/* Recipient */}
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          {item.user?.fullName || "Staff Member"}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                          {item.user?.email || ""}
                        </p>
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.branchName ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#1a4fa0] dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                          <Building2 className="w-3.5 h-3.5 text-[#1a4fa0] dark:text-blue-400 shrink-0" />
                          {item.branchName}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400 font-mono">—</span>
                      )}
                    </td>

                    {/* Created At */}
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                          {item.createdAt
                            ? formatDistanceToNow(parseISO(item.createdAt), { addSuffix: true })
                            : "Just now"}
                        </span>
                        {item.createdAt && (
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">{getEventBadge(item.type)}</td>

                    {/* Title & Message */}
                    <td className="py-3 px-4 max-w-sm">
                      <p 
                        onClick={() => handleOpenViewModal(item)}
                        className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate hover:text-[#1a4fa0] dark:hover:text-blue-400 cursor-pointer"
                      >
                        {item.title}
                      </p>
                      <p 
                        onClick={() => handleOpenViewModal(item)}
                        className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1 mt-0.5 hover:text-neutral-900 dark:hover:text-neutral-200 cursor-pointer"
                        title="Click to view full message summary"
                      >
                        {item.message}
                      </p>
                    </td>

                    {/* Dynamic Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => handleToggleReadStatus(item, e)}
                        title={`Click to mark as ${item.isRead ? "Unread" : "Read"}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer shadow-2xs ${
                          item.isRead
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                            : "bg-blue-50 dark:bg-blue-950/50 text-[#1a4fa0] dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isRead ? "bg-slate-400 dark:bg-slate-500" : "bg-[#1a4fa0] dark:bg-blue-400 animate-pulse"
                          }`}
                        />
                        {item.isRead ? "Read" : "Unread"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenViewModal(item)}
                        className="h-7 px-2.5 text-xs font-semibold border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-neutral-200 hover:bg-[#1a4fa0] hover:text-white hover:border-[#1a4fa0] transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── FULL PAGINATION FOOTER ────────────────────────────────────── */}
        <div className="p-4 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <span>
              Showing {totalCount === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} events
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-neutral-400">Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  fetchAdminNotifications(1);
                }}
                className="h-7 px-2 text-xs rounded border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-700 dark:text-neutral-200 outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAdminNotifications(page - 1)}
              disabled={page <= 1 || isLoading}
              className="h-8 px-2.5 text-xs font-semibold border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-neutral-200 hover:bg-[#1a4fa0] hover:text-white hover:border-[#1a4fa0] disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Previous
            </Button>

            {/* Page number buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => {
                const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="px-1 text-xs text-neutral-400">...</span>}
                    <Button
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => fetchAdminNotifications(p)}
                      disabled={isLoading}
                      className={`h-8 w-8 p-0 text-xs font-semibold ${
                        p === page
                          ? "bg-[#1a4fa0] hover:bg-[#153f80] text-white border-[#1a4fa0]"
                          : "border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-neutral-200 hover:bg-[#1a4fa0] hover:text-white hover:border-[#1a4fa0]"
                      }`}
                    >
                      {p}
                    </Button>
                  </React.Fragment>
                );
              })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAdminNotifications(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="h-8 px-2.5 text-xs font-semibold border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-neutral-200 hover:bg-[#1a4fa0] hover:text-white hover:border-[#1a4fa0] disabled:opacity-40"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* ─── VIEW NOTIFICATION DETAILS MODAL ──────────────────────────────── */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-neutral-50 dark:bg-slate-800/80 border-b border-neutral-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#1a4fa0] dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900/50 shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Activity Event Summary
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Event ID: <span className="font-mono">{selectedItemForModal.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Subject */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-neutral-50/80 dark:bg-slate-800/40 border border-neutral-200/80 dark:border-slate-700/60">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Subject</span>
                  <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                    {selectedItemForModal.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getEventBadge(selectedItemForModal.type)}
                </div>
              </div>

              {/* Full Message Box */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#1a4fa0]" /> Full Message Content
                </span>
                <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed shadow-2xs font-sans">
                  {selectedItemForModal.message}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Sender / Initiator */}
                <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/40 dark:bg-slate-800/20 space-y-1">
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3 text-[#1a4fa0]" /> Sender / Initiator
                  </span>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">
                    {selectedItemForModal.initiator?.fullName || "System Workflow"}
                  </p>
                  {selectedItemForModal.initiator?.email && (
                    <p className="text-[11px] text-neutral-500 font-mono">
                      {selectedItemForModal.initiator.email}
                    </p>
                  )}
                </div>

                {/* Recipient */}
                <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/40 dark:bg-slate-800/20 space-y-1">
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[#1a4fa0]" /> Recipient
                  </span>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">
                    {selectedItemForModal.user?.fullName || "Staff Member"}
                  </p>
                  {selectedItemForModal.user?.email && (
                    <p className="text-[11px] text-neutral-500 font-mono">
                      {selectedItemForModal.user.email}
                    </p>
                  )}
                </div>

                {/* Branch Office */}
                <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/40 dark:bg-slate-800/20 space-y-1">
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#1a4fa0]" /> Branch Office
                  </span>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">
                    {selectedItemForModal.branchName || "Global / Company-wide"}
                  </p>
                </div>

                {/* Timestamp */}
                <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/40 dark:bg-slate-800/20 space-y-1">
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#1a4fa0]" /> Received At
                  </span>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white font-mono">
                    {selectedItemForModal.createdAt ? new Date(selectedItemForModal.createdAt).toLocaleString() : "Just now"}
                  </p>
                </div>
              </div>

              {/* Related Job Requisition / Entity Details */}
              {selectedItemForModal.data && (selectedItemForModal.data.jobCode || selectedItemForModal.data.jobTitle || selectedItemForModal.data.jobId) && (
                <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#1a4fa0] dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" /> Associated Job Requisition
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedItemForModal.data.jobCode && (
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-[#1a4fa0] dark:text-blue-300">
                          {selectedItemForModal.data.jobCode}
                        </span>
                      )}
                      {selectedItemForModal.data.jobTitle && (
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                          {selectedItemForModal.data.jobTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedItemForModal.data.jobId && (
                    <a
                      href={`/job-posting/${selectedItemForModal.data.jobId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a4fa0] hover:bg-[#153f80] text-white text-xs font-semibold transition-colors shrink-0"
                    >
                      Open Job Requisition
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
          <div className="bg-white dark:bg-[#1a233a] rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 bg-[#1a4fa0] text-white flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-300" />
                Broadcast Live Announcement
              </h3>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="p-6 space-y-4">
              {/* Target Audience */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Target Audience
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastTarget("ALL");
                      setBroadcastTargetId("");
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                      broadcastTarget === "ALL"
                        ? "border-[#1a4fa0] bg-[#1a4fa0]/10 text-[#1a4fa0] dark:text-blue-400"
                        : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    All Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastTarget("BRANCH")}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                      broadcastTarget === "BRANCH"
                        ? "border-[#1a4fa0] bg-[#1a4fa0]/10 text-[#1a4fa0] dark:text-blue-400"
                        : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    Specific Branch
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastTarget("ROLE")}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                      broadcastTarget === "ROLE"
                        ? "border-[#1a4fa0] bg-[#1a4fa0]/10 text-[#1a4fa0] dark:text-blue-400"
                        : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    Specific Role
                  </button>
                </div>
              </div>

              {/* Branch / Role dropdown if applicable */}
              {broadcastTarget === "BRANCH" && (
                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    Select Target Branch
                  </label>
                  <select
                    value={broadcastTargetId}
                    onChange={(e) => setBroadcastTargetId(e.target.value)}
                    required
                    className="w-full py-2 px-3 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900"
                  >
                    <option value="">Choose a branch...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {broadcastTarget === "ROLE" && (
                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    Select Target Role
                  </label>
                  <select
                    value={broadcastTargetId}
                    onChange={(e) => setBroadcastTargetId(e.target.value)}
                    required
                    className="w-full py-2 px-3 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900"
                  >
                    <option value="">Choose a role...</option>
                    <option value="RECRUITER">Recruiters</option>
                    <option value="ACCOUNT_MANAGER">Account Managers / BDMs</option>
                    <option value="POD_LEAD">Pod Leads</option>
                    <option value="DELIVERY_HEAD">Delivery Heads</option>
                    <option value="BRANCH_ADMIN">Branch Admins</option>
                  </select>
                </div>
              )}

              {/* Announcement Title */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Critical Requirement - Immediate Submissions Needed"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  required
                  className="w-full py-2 px-3 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900"
                />
              </div>

              {/* Announcement Message */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Message Content
                </label>
                <textarea
                  rows={4}
                  placeholder="Type the message details here..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  required
                  className="w-full py-2 px-3 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="
                    flex items-center gap-2 px-5 py-2 rounded-lg bg-[#1a4fa0] hover:bg-[#153f80]
                    text-white font-semibold text-xs transition-all disabled:opacity-50
                  "
                >
                  <Send className="w-3.5 h-3.5" />
                  {isBroadcasting ? "Sending..." : "Dispatch Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
