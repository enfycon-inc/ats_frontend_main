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
        px-4 h-full
        hover:bg-white/8
        transition-colors duration-150
        no-underline
        group
        min-w-[130px]
      "
    >
      {/* Brand Logo Icon */}
      <div className="flex-shrink-0 flex items-center justify-center">
        <Image
          src="/assets/images/asset/logo/enfysync.ico"
          alt="enfySync Logo"
          width={28}
          height={28}
          unoptimized
          className="object-contain"
        />
      </div>

      {/* Brand text */}
      <div className="flex flex-col leading-none select-none">
        <span className="text-white font-bold text-[15px] tracking-tight group-hover:text-white/95 transition-colors duration-150">
          enfySync
        </span>
        <span className="text-[9px] text-blue-200/80 font-medium tracking-widest uppercase mt-px">
          AI Recruitment
        </span>
      </div>
    </Link>
  );
}

