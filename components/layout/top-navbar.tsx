"use client";

import { Menu, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { atsApi } from "@/lib/ats-api";
import { MobileNavbar } from "./mobile-navbar";
import { NavbarMenu } from "./navbar-menu";
import { NavbarRight } from "./navbar-right";
import { NavbarLogo } from "./navbar-logo";
import { NavbarSearch } from "./navbar-search";
import { getFilteredPrimaryNav, getFilteredMoreNav, CustomRoleDefinition } from "@/lib/role-permissions";
import { getDashboardRoleSelection } from "@/lib/dashboard-role";

export function TopNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [overrideRole, setOverrideRole] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<CustomRoleDefinition[]>([]);
  const [liveProfile, setLiveProfile] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([atsApi.auth.me(), atsApi.auth.listRoles(undefined, true)]).then(([profile, roles]) => {
      if (cancelled) return;
      setAvailableRoles(Array.isArray(roles) ? roles : []);
      setLiveProfile(profile);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOverrideRole(localStorage.getItem("override_role"));
      const handleStorage = () => {
        setOverrideRole(localStorage.getItem("override_role"));
      };
      window.addEventListener("storage", handleStorage);
      window.addEventListener("overrideRoleChanged", handleStorage);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("overrideRoleChanged", handleStorage);
      };
    }
  }, []);
  
  const user = liveProfile;
  const { active } = getDashboardRoleSelection(user, availableRoles, overrideRole);
  const activeRoleName = active.id || active.name;

  const navItems = useMemo(() => {
    return user ? getFilteredPrimaryNav(activeRoleName, availableRoles, user) : [];
  }, [activeRoleName, availableRoles, user]);

  const navMoreItems = useMemo(() => {
    return user ? getFilteredMoreNav(activeRoleName, availableRoles, user) : [];
  }, [activeRoleName, availableRoles, user]);

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
