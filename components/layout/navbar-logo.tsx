"use client";

import Link from "next/link";
import Image from "next/image";

export function NavbarLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      id="navbar-logo"
      aria-label="enfySync – go to Dashboard"
      className={`
        flex items-center gap-2.5
        px-2 py-1
        hover:bg-white/10
        rounded-lg
        transition-all duration-150
        no-underline
        group/logo
        w-full
        group-data-[collapsible=icon]:px-0
        group-data-[collapsible=icon]:py-0.5
        group-data-[collapsible=icon]:justify-center
        ${className || ""}
      `}
    >
      {/* Brand Logo Icon */}
      <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-md bg-white/15 border border-white/20 p-1 shadow-xs transition-transform duration-150 group-hover/logo:scale-105">
        <Image
          src="/assets/images/asset/logo/enfysync.ico"
          alt="enfySync Logo"
          width={20}
          height={20}
          unoptimized
          className="object-contain"
        />
      </div>

      {/* Brand text (Hidden cleanly in collapsed icon mode) */}
      <div className="flex flex-col leading-tight select-none min-w-0 group-data-[collapsible=icon]:hidden">
        <span className="text-white font-extrabold text-[15px] tracking-tight transition-colors truncate">
          enfy<span className="text-cyan-300">Sync</span>
        </span>
        <span className="text-[8.5px] text-blue-100 font-bold tracking-wider uppercase truncate">
          AI Recruitment
        </span>
      </div>
    </Link>
  );
}

