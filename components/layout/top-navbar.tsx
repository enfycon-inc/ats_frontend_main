"use client";

import {
  PRIMARY_NAV_ITEMS,
  MORE_NAV_ITEMS,
  GLOBAL_ADMIN_NAV_ITEMS,
  GLOBAL_ADMIN_MORE_ITEMS,
} from "@/constants/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { atsApi } from "@/lib/ats-api";
import { MobileNavbar } from "./mobile-navbar";
import { NavbarMenu } from "./navbar-menu";
import { NavbarRight } from "./navbar-right";
import { NavbarLogo } from "./navbar-logo";
import { NavbarSearch } from "./navbar-search";

export function TopNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  
  const currentUser = typeof window !== 'undefined' ? atsApi.auth.getCurrentUser() : null;
  const user = session?.user || currentUser;
  const isSuperAdmin = 
    (user as any)?.roles?.includes("SUPER_ADMIN") || 
    (user as any)?.systemRole === "SUPER_ADMIN";

  const navItems = isSuperAdmin ? GLOBAL_ADMIN_NAV_ITEMS : PRIMARY_NAV_ITEMS;
  const navMoreItems = isSuperAdmin ? GLOBAL_ADMIN_MORE_ITEMS : MORE_NAV_ITEMS;

  return (
    <>
      {/* ── Sticky top bar ── */}
      <header
        id="top-navbar"
        className="
          sticky top-0 z-50
          h-[46px] min-h-[46px]
          flex items-stretch
          bg-[#1a4fa0] dark:bg-[#0f2d6b]
          border-b border-[#1545a0]/40 dark:border-[#0a2050]/60
          shadow-[0_1px_4px_rgba(0,0,0,0.35)]
          overflow-visible
        "
      >
        {/* ─── Left: Logo ─── */}
        <div className="flex items-center flex-shrink-0 border-r border-white/10">
          <NavbarLogo />
        </div>

        {/* ─── Center: Primary nav + search ─── */}
        <div className="flex-1 flex items-stretch min-w-0 overflow-visible">
          {/* Primary menu — scrollable on smaller desktops */}
          <nav
            aria-label="Primary navigation"
            className="
              hidden md:flex items-stretch
              overflow-visible
              border-r border-white/10
            "
          >
            <NavbarMenu
              items={navItems}
              moreItems={navMoreItems}
            />
          </nav>

          {/* Search bar */}
          <div className="flex items-center flex-1 px-3">
            <NavbarSearch />
          </div>
        </div>

        {/* ─── Right: icon actions ─── */}
        <div className="flex items-center flex-shrink-0 border-l border-white/10 px-2 gap-0.5">
          <NavbarRight />
        </div>

        {/* ─── Mobile hamburger ─── */}
        <button
          id="mobile-menu-toggle"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="
            md:hidden flex items-center justify-center
            w-10 h-full
            text-white/80 hover:text-white hover:bg-white/10
            transition-colors duration-150
            border-l border-white/10
            cursor-pointer
          "
        >
          {mobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </header>

      {/* ─── Mobile drawer ─── */}
      <MobileNavbar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        primaryItems={navItems}
        moreItems={navMoreItems}
      />
    </>
  );
}
