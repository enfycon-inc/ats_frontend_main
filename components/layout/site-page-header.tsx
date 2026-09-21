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
        "h-[38px] min-h-[38px] px-3 md:px-4 bg-white dark:bg-[#151c24] border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3 shadow-2xs select-none shrink-0 z-30",
        className
      )}
    >
      {/* Left side: Back Button & Page Title with refined, softer typography */}
      <div className="flex items-center gap-2 min-w-0">
        {routeInfo.showBackButton && !isDashboard ? (
          <button
            type="button"
            onClick={handleBack}
            className="p-1 -ml-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        ) : isDashboard ? (
          <div className="flex items-center text-slate-400 dark:text-slate-500 shrink-0">
            <LayoutDashboard className="h-3.5 w-3.5" />
          </div>
        ) : null}

        <h1 className="text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-300 tracking-normal truncate max-w-[220px] sm:max-w-[320px] md:max-w-[450px]">
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
