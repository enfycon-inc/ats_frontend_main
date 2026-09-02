"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
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
} from "lucide-react";
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
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

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
      headers: { Authorization: `Bearer ${token}` },
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
          limit: "30",
        });
        if (selectedType !== "ALL") params.append("type", selectedType);
        if (selectedBranch !== "ALL") params.append("branchId", selectedBranch);
        if (searchQuery.trim()) params.append("search", searchQuery.trim());

        const res = await fetch(`${apiUrl}/api/notifications/admin/all?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          setNotifications(json.data || []);
          setTotalPages(json.totalPages || 1);
          setTotalCount(json.total || 0);
          setPage(json.page || 1);
        }
      } catch (e) {
        console.error("Failed to load admin notifications:", e);
        toast.error("Failed to load notifications feed");
      } finally {
        setIsLoading(false);
      }
    },
    [token, apiUrl, selectedType, selectedBranch, searchQuery]
  );

  useEffect(() => {
    fetchAdminNotifications(1);
  }, [fetchAdminNotifications]);

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
          Authorization: `Bearer ${token}`,
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
      case "JOB_REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
            <XCircle className="w-3 h-3" />
            Job Rejected
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
      <DashboardBreadcrumb title="Notification Management Hub" text="Live Notifications" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1a4fa0] to-[#0d2a57] rounded-xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">Organization Notification Hub</h2>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-400/30">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  Live WS Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Reconnecting...
                </span>
              )}
            </div>
            <p className="text-white/80 text-sm">
              Live audit stream of all role-based notifications, reviewer requests, and job status transitions across branches.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAdminNotifications(page, true)}
              className="
                flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20
                text-white font-semibold text-sm transition-all border border-white/20
              "
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="
                flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400
                text-neutral-950 font-semibold text-sm transition-all shadow
              "
            >
              <Megaphone className="w-4 h-4" />
              Broadcast Alert
            </button>
          </div>
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
      <div className="bg-white dark:bg-[#1a233a] rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Audit Stream ({totalCount} total events)
          </p>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
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
              <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Sender / Initiator</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Subject & Message</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {notifications.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors">
                    {/* Time */}
                    <td className="py-3 px-4 text-xs text-neutral-500 whitespace-nowrap">
                      {item.createdAt
                        ? formatDistanceToNow(parseISO(item.createdAt), { addSuffix: true })
                        : "Just now"}
                    </td>

                    {/* Initiator */}
                    <td className="py-3 px-4">
                      {item.initiator ? (
                        <div>
                          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                            {item.initiator.fullName}
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            {item.initiator.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">System Workflow</span>
                      )}
                    </td>

                    {/* Recipient */}
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          {item.user?.fullName || "Staff Member"}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {item.user?.email || ""} {item.branchName ? `(${item.branchName})` : ""}
                        </p>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">{getEventBadge(item.type)}</td>

                    {/* Title & Message */}
                    <td className="py-3 px-4 max-w-sm">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1 mt-0.5">
                        {item.message}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {item.isRead ? (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                          Read
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
                          Unread
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <button
              onClick={() => fetchAdminNotifications(page - 1)}
              disabled={page === 1}
              className="
                px-3 py-1.5 text-xs font-medium rounded border border-neutral-200 dark:border-neutral-700
                hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 transition-colors
              "
            >
              Previous
            </button>
            <span className="text-xs text-neutral-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchAdminNotifications(page + 1)}
              disabled={page === totalPages}
              className="
                px-3 py-1.5 text-xs font-medium rounded border border-neutral-200 dark:border-neutral-700
                hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 transition-colors
              "
            >
              Next
            </button>
          </div>
        )}
      </div>

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
