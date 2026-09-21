"use client";

import React, { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
        "h-[50px] min-h-[50px] px-6 md:px-8 bg-white dark:bg-[#151c24] border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-4 select-none shrink-0 z-30",
        className
      )}
    >
      {/* Left side: Back Button & Page Title with EnfySync typography */}
      <div className="flex items-center gap-2.5 min-w-0">
        {routeInfo.showBackButton && !isDashboard ? (
          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 -ml-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}

        <h1 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate max-w-[280px] sm:max-w-[420px] md:max-w-[600px]">
          {displayTitle}
        </h1>
      </div>

      {/* Right side: EnfySync-Style Clean Breadcrumb Trail */}
      <div className="flex items-center shrink-0">
        <SiteBreadcrumbPill breadcrumbs={routeInfo.breadcrumbs} />
      </div>
    </header>
  );
}

export default SitePageHeader;
