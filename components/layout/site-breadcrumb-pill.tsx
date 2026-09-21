"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ChevronRight, RotateCw } from "lucide-react";
import { BreadcrumbItem } from "@/lib/route-breadcrumb-map";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface SiteBreadcrumbPillProps {
  breadcrumbs: BreadcrumbItem[];
  className?: string;
  onRefresh?: () => void;
}

export function SiteBreadcrumbPill({
  breadcrumbs,
  className,
  onRefresh,
}: SiteBreadcrumbPillProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      if (onRefresh) {
        onRefresh();
      } else {
        router.refresh();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("app:refresh"));
        }
      }
      toast.success("Page data reloaded", { id: "page-refresh", duration: 1500 });
    } catch (e) {
      console.error("Failed to refresh page data:", e);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 650);
    }
  };

  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs text-xs font-medium text-slate-600 dark:text-slate-300 max-w-full overflow-x-auto select-none",
        className
      )}
    >
      {/* Home Icon */}
      <Link
        href="/dashboard"
        className="flex items-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0"
        title="Go to ATS Dashboard"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {/* Breadcrumb Segments */}
      {breadcrumbs.map((crumb, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === breadcrumbs.length - 1;

        return (
          <React.Fragment key={`${crumb.label}-${idx}`}>
            {/* Show separator if not the first item, OR if first item is ATS right after Home icon */}
            <ChevronRight className="h-3 w-3 text-slate-350 dark:text-slate-600 shrink-0" />

            <div className="shrink-0">
              {isLast ? (
                <span
                  className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px] inline-block align-bottom"
                  title={crumb.label}
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors truncate max-w-[140px] inline-block align-bottom"
                  title={crumb.label}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-500 dark:text-slate-400 truncate max-w-[140px] inline-block align-bottom">
                  {crumb.label}
                </span>
              )}
            </div>
          </React.Fragment>
        );
      })}

      {/* Divider and Refresh Button */}
      <div className="h-3.5 w-[1px] bg-slate-200 dark:bg-slate-800 ml-1 shrink-0" />
      <button
        type="button"
        onClick={handleRefresh}
        title="Reload current page data"
        className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
      >
        <RotateCw
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-500",
            isRefreshing && "animate-spin text-indigo-600 dark:text-indigo-400"
          )}
        />
      </button>
    </nav>
  );
}

export default SiteBreadcrumbPill;
