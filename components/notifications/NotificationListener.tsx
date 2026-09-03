"use client";

import React, { useEffect } from "react";
import { useSocket } from "@/contexts/SocketContext";
import { useNotifications, NotificationItem } from "@/contexts/NotificationContext";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Bell, Briefcase, CheckCircle2, XCircle, Megaphone, ArrowRight } from "lucide-react";

export default function NotificationListener() {
  const { socket, isConnected } = useSocket();
  const { settings, markAsRead } = useNotifications();
  const router = useRouter();
  const seenIds = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleToastNotification = (notif: NotificationItem) => {
      if (!settings.toastEnabled) return;

      // 1. Deduplicate by notification ID
      if (notif.id) {
        if (seenIds.current.has(notif.id)) return;
        seenIds.current.add(notif.id);
        if (seenIds.current.size > 200) {
          const firstKey = seenIds.current.values().next().value;
          if (firstKey) seenIds.current.delete(firstKey);
        }
      }

      // 2. Suppress floating toast if current user initiated the action
      if (typeof window !== "undefined") {
        try {
          const userStr = localStorage.getItem("ats_current_user") || localStorage.getItem("ats_user");
          if (userStr) {
            const currentUser = JSON.parse(userStr);
            const myId = String(currentUser?.id || currentUser?.dbId || "").toLowerCase();
            const myEmail = String(currentUser?.email || "").toLowerCase();
            const initiator = String(notif.initiatorId || "").toLowerCase();
            if (initiator && (initiator === myId || initiator === myEmail)) {
              return;
            }
          }
        } catch {}
      }

      const getIcon = () => {
        switch (notif.type) {
          case "JOB_PENDING_APPROVAL":
            return <Briefcase className="w-5 h-5 text-amber-500 shrink-0" />;
          case "JOB_APPROVED":
            return <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />;
          case "JOB_REJECTED":
            return <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
          case "ANNOUNCEMENT":
            return <Megaphone className="w-5 h-5 text-blue-500 shrink-0" />;
          default:
            return <Bell className="w-5 h-5 text-primary shrink-0" />;
        }
      };

      const getActionUrl = () => {
        if (notif.data?.jobId) {
          return `/job-posting`;
        }
        if (notif.type === "ANNOUNCEMENT") {
          return `/utility/notifications`;
        }
        return `/job-posting`;
      };

      toast.custom(
        (t) => (
          <div
            className={`
              ${t.visible ? "animate-in fade-in-0 slide-in-from-top-2" : "animate-out fade-out-0"}
              max-w-md w-full bg-white dark:bg-[#1a233a] shadow-2xl rounded-lg pointer-events-auto
              border border-neutral-200 dark:border-neutral-700/80 p-4 flex items-start gap-3.5
              transition-all duration-200
            `}
          >
            {getIcon()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {notif.title}
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                {notif.message}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={() => {
                    markAsRead(notif.id);
                    toast.dismiss(t.id);
                    router.push(getActionUrl());
                  }}
                  className="
                    inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold
                    rounded bg-[#1a4fa0] text-white hover:bg-[#153f80] transition-colors
                  "
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    markAsRead(notif.id);
                    toast.dismiss(t.id);
                  }}
                  className="px-2 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ),
        {
          duration: 6000,
          position: "top-right",
        }
      );
    };

    socket.on("notification", handleToastNotification);

    return () => {
      socket.off("notification", handleToastNotification);
    };
  }, [socket, isConnected, settings.toastEnabled, markAsRead, router]);

  return null;
}
