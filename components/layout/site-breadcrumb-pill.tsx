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
        "flex items-center gap-1.5 sm:gap-2 text-xs md:text-sm select-none",
        className
      )}
    >
      {/* Unified Root Link: Home Icon + ATS (EnfySync Reference) */}
      <Link
        href="/dashboard"
        className="flex items-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors shrink-0 group"
        title="Go to ATS Dashboard"
      >
        <Home className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300 transition-colors" />
      </Link>

      {/* Subsequent Breadcrumb Segments */}
      {cleanCrumbs.map((crumb, idx) => {
        const isLast = idx === cleanCrumbs.length - 1;

        return (
          <React.Fragment key={`${crumb.label}-${idx}`}>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400/80 dark:text-slate-500 shrink-0 mx-0.5" />

            <div className="shrink-0 flex items-center">
              {isLast ? (
                <span
                  className="font-normal text-slate-700 dark:text-slate-200 truncate max-w-[240px] text-xs md:text-[13px]"
                  title={crumb.label}
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors truncate max-w-[180px] text-xs md:text-[13px]"
                  title={crumb.label}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-500 dark:text-slate-400 truncate max-w-[180px] text-xs md:text-[13px]">
                  {crumb.label}
                </span>
              )}
            </div>
          </React.Fragment>
        );
      })}

      {/* Refresh Button - separated with generous margin, exactly like EnfySync */}
      <button
        type="button"
        onClick={handleRefresh}
        title="Reload current page data"
        className="ml-3 sm:ml-4 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
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
