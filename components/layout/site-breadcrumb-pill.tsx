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

  // Filter out any redundant "ATS" from crumbs since the unified root link already displays [Home] ATS
  const cleanCrumbs = (breadcrumbs || []).filter((c) => c.label !== "ATS");

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50/80 hover:bg-slate-50 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-2xs text-xs font-medium text-slate-500 dark:text-slate-400 max-w-full overflow-x-auto select-none transition-colors",
        className
      )}
    >
      {/* Unified Root Link: Home Icon + ATS */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors shrink-0 group"
        title="Go to ATS Dashboard"
      >
        <Home className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400 transition-colors" />
        <span className="font-medium text-xs">ATS</span>
      </Link>

      {/* Subsequent Breadcrumb Segments */}
      {cleanCrumbs.map((crumb, idx) => {
        const isLast = idx === cleanCrumbs.length - 1;

        return (
          <React.Fragment key={`${crumb.label}-${idx}`}>
            <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0 mx-0.5" />

            <div className="shrink-0">
              {isLast ? (
                <span
                  className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[200px] inline-block align-bottom"
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

      {/* Subtle Divider and Refresh Button */}
      <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />
      <button
        type="button"
        onClick={handleRefresh}
        title="Reload current page data"
        className="p-0.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
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
