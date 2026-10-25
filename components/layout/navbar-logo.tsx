"use client";

import { APP_BRAND } from "@/lib/app-brand";
import Link from "next/link";
import Image from "next/image";
import { useTenantBranding } from "@/contexts/tenant-branding";
import { CompanyLogoImage } from "@/components/shared/company-logo-image";

export function NavbarLogo({ className }: { className?: string }) {
  const { branding, brandingReady } = useTenantBranding();
  const companyName = branding.name?.trim() || APP_BRAND.name;
  const initials = companyName.split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toLocaleUpperCase();
  const compactFallback = <span role="img" aria-label={`${companyName} logo`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/15 text-xs font-bold text-white">{initials}</span>;
  return (
    <Link
      href="/dashboard"
      id="navbar-logo"
      aria-label={`${branding.name || APP_BRAND.name} – go to Dashboard`}
      className={`
        flex items-center gap-2.5
        px-2 py-0 h-[34px]
        hover:bg-white/10
        rounded-lg
        transition-colors duration-150
        no-underline
        group/logo
        w-full
        group-data-[collapsible=icon]:px-0
        group-data-[collapsible=icon]:py-0
        group-data-[collapsible=icon]:justify-center
        ${className || ""}
      `}
    >
      <span className="hidden h-8 w-8 shrink-0 items-center justify-center group-data-[collapsible=icon]:flex">
        {branding.compactLogoUrl ? <CompanyLogoImage key={branding.compactLogoUrl} src={branding.compactLogoUrl} alt={`${companyName} logo`} className="h-8 w-8" fallback={compactFallback} /> : compactFallback}
      </span>
      <span className="flex w-full min-w-0 items-center gap-2.5 group-data-[collapsible=icon]:hidden">
      {!brandingReady ? (
        <span aria-label="Loading company branding" className="flex h-[34px] w-[240px] max-w-full items-center text-xs text-white">{branding.name || "Workspace"}</span>
      ) : branding.logoUrl ? (
        <CompanyLogoImage src={branding.logoUrl} alt={`${branding.name || 'Company'} Logo`}
          className="h-[34px] w-[240px] max-w-full min-w-0" />
      ) : <>
      {/* Brand Logo Icon */}
      <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-md bg-white/15 border border-white/20 p-1 shadow-xs transition-transform duration-150 group-hover/logo:scale-105">
        <Image
          src="/assets/images/asset/logo/enfysync.ico"
          alt={`${APP_BRAND.name} logo`}
          width={20}
          height={20}
          unoptimized
          className="object-contain"
        />
      </div>

      {/* Brand text (Hidden cleanly in collapsed icon mode) */}
      <div className="flex flex-col leading-tight select-none min-w-0 group-data-[collapsible=icon]:hidden">
        <span className="text-white font-extrabold text-[15px] tracking-tight transition-colors truncate">
          {APP_BRAND.name}
        </span>
        <span className="text-[8.5px] text-blue-100 font-bold tracking-wider uppercase truncate">
          AI Recruitment
        </span>
      </div>
      </>}
      </span>
    </Link>
  );
}

