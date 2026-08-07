"use client";

import Link from "next/link";
import Image from "next/image";

export function NavbarLogo() {
  return (
    <Link
      href="/dashboard"
      id="navbar-logo"
      aria-label="enfySync – go to Dashboard"
      className="
        flex items-center gap-2.5
        px-3 py-1.5
        hover:bg-slate-100 dark:hover:bg-slate-800/60
        rounded-lg
        transition-colors duration-150
        no-underline
        group
        w-full
      "
    >
      {/* Brand Logo Icon */}
      <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 p-1 shadow-xs">
        <Image
          src="/assets/images/asset/logo/enfysync.ico"
          alt="enfySync Logo"
          width={24}
          height={24}
          unoptimized
          className="object-contain"
        />
      </div>

      {/* Brand text */}
      <div className="flex flex-col leading-tight select-none">
        <span className="text-slate-900 dark:text-white font-black text-[16px] tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          enfy<span className="text-indigo-600 dark:text-indigo-400">Sync</span>
        </span>
        <span className="text-[9.5px] text-indigo-600/90 dark:text-indigo-300 font-bold tracking-wider uppercase">
          AI Recruitment
        </span>
      </div>
    </Link>
  );
}

