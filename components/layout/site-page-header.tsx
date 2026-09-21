"use client";

import React, { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { getRouteBreadcrumbInfo } from "@/lib/route-breadcrumb-map";
import { SiteBreadcrumbPill } from "./site-breadcrumb-pill";
import { cn } from "@/lib/utils";

interface SitePageHeaderProps {
  className?: string;
  customTitle?: string;
}

export function SitePageHeader({ className, customTitle }: SitePageHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const routeInfo = useMemo(() => {
    return getRouteBreadcrumbInfo(pathname || "/", searchParams);
  }, [pathname, searchParams]);

  const displayTitle = customTitle || routeInfo.pageTitle;
  const isDashboard = pathname === "/" || pathname === "/dashboard";

  const handleBack = () => {
    if (routeInfo.backHref) {
      router.push(routeInfo.backHref);
    } else {
      router.back();
    }
  };

  return (
    <header
      className={cn(
        "h-[40px] min-h-[40px] px-3 md:px-4 bg-white dark:bg-[#151c24] border-b border-neutral-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2 md:gap-4 shadow-2xs select-none shrink-0 z-30",
        className
      )}
    >
      {/* Left side: Back Button & Page Title */}
      <div className="flex items-center gap-2 min-w-0">
        {routeInfo.showBackButton && !isDashboard ? (
          <button
            type="button"
            onClick={handleBack}
            className="p-1 -ml-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : isDashboard ? (
          <div className="flex items-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <LayoutDashboard className="h-4 w-4" />
          </div>
        ) : null}

        <h1 className="text-xs md:text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[220px] sm:max-w-[320px] md:max-w-[450px]">
          {displayTitle}
        </h1>
      </div>

      {/* Right side: EnfySync-Style Structured Breadcrumb Pill */}
      <div className="flex items-center shrink-0">
        <SiteBreadcrumbPill breadcrumbs={routeInfo.breadcrumbs} />
      </div>
    </header>
  );
}

export default SitePageHeader;
