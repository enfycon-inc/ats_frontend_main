"use client";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { PRIMARY_NAV_ITEMS, MORE_NAV_ITEMS, GLOBAL_ADMIN_NAV_ITEMS, GLOBAL_ADMIN_MORE_ITEMS } from "@/constants/navigation";
import Link from "next/link";

import { usePathname, useSearchParams } from "next/navigation";
import { NavbarLogo } from "./navbar-logo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { useEffect, useState, useMemo } from "react";
import { atsApi } from "@/lib/ats-api";
import { getFilteredPrimaryNav, getFilteredMoreNav, CustomRoleDefinition } from "@/lib/role-permissions";
import { getDashboardRoleSelection } from "@/lib/dashboard-role";
import { getSavedDashboardRole, saveDashboardRole } from "@/lib/dashboard-preference";
import type { NavigationBootstrap } from "@/lib/navigation-bootstrap";

export function AppSidebar({ initialNavigation = null }: { initialNavigation?: NavigationBootstrap | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const checkActive = (href: string) => {
    if (!href) return false;
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    if (currentUrl === href) return true;
    if (!href.includes("?")) {
      return pathname === href || pathname?.startsWith(href + "/");
    }
    return false;
  };
  const [overrideRole, setOverrideRole] = useState<string | null>(initialNavigation?.overrideRole ?? null);
  const [availableRoles, setAvailableRoles] = useState<CustomRoleDefinition[]>(() => {
    if (initialNavigation?.roles && initialNavigation.roles.length > 0) return initialNavigation.roles;
    if (typeof window !== "undefined") {
      const cached = atsApi.auth.getCurrentUser();
      if (Array.isArray(cached?.assignedRoles) && cached.assignedRoles.length > 0) {
        return cached.assignedRoles;
      }
    }
    return [];
  });
  const [liveProfile, setLiveProfile] = useState<any>(() => {
    if (initialNavigation?.profile) return initialNavigation.profile;
    if (typeof window !== "undefined") {
      return atsApi.auth.getCurrentUser();
    }
    return null;
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(() => {
    if (initialNavigation?.profile) return false;
    if (typeof window !== "undefined" && atsApi.auth.getCurrentUser()) return false;
    return true;
  });

  useEffect(() => {
    if (initialNavigation?.profile) return;
    let cancelled = false;
    Promise.all([atsApi.auth.me(), atsApi.auth.listRoles(undefined, true)]).then(([profile, roles]) => {
      if (cancelled) return;
      setAvailableRoles(Array.isArray(roles) ? roles : []);
      if (profile) {
        setLiveProfile(profile);
        try { localStorage.setItem("ats_current_user", JSON.stringify(profile)); } catch {}
      }
      setIsLoadingProfile(false);
    }).catch(() => {
      if (!cancelled) setIsLoadingProfile(false);
    });
    return () => { cancelled = true; };
  }, [initialNavigation]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = getSavedDashboardRole(liveProfile);
      // Migrate existing browser-only preferences for subsequent server renders.
      if (savedRole) saveDashboardRole(liveProfile, savedRole);
      setOverrideRole(savedRole ?? initialNavigation?.overrideRole ?? null);
      const handleStorage = () => {
        setOverrideRole(getSavedDashboardRole(liveProfile));
      };
      window.addEventListener("storage", handleStorage);
      window.addEventListener("overrideRoleChanged", handleStorage);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("overrideRoleChanged", handleStorage);
      };
    }
  }, [liveProfile]);

  const userProfile = liveProfile;
  const { active } = getDashboardRoleSelection(userProfile, availableRoles, overrideRole, false);
  // Prefer systemRole (e.g. "ADMIN") over the UUID so that resolveActiveSystemRole can
  // always resolve the correct sidebar even when availableRoles hasn't loaded yet.
  // UUID lookup only works when availableRoles is populated; systemRole works unconditionally.
  const activeRoleName = active.name || active.systemRole || active.id;

  const filteredPrimaryNav = useMemo(() => {
    return userProfile ? getFilteredPrimaryNav(activeRoleName, availableRoles, userProfile) : [];
  }, [activeRoleName, availableRoles, userProfile]);

  const filteredMoreNav = useMemo(() => {
    return userProfile ? getFilteredMoreNav(activeRoleName, availableRoles, userProfile) : [];
  }, [activeRoleName, availableRoles, userProfile]);

  const isPrimaryLoading = isLoadingProfile || filteredPrimaryNav.length === 0;
  const isMoreLoading = isLoadingProfile || filteredMoreNav.length === 0;

  return (
    <Sidebar collapsible="icon" className="border-r border-default-200 dark:border-slate-800">
      <SidebarHeader className="h-[46px] min-h-[46px] max-h-[46px] px-3 bg-[#1a4fa0] dark:bg-[#0f2d6b] border-b border-[#1545a0]/40 dark:border-[#0a2050]/60 flex items-center justify-center group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:h-[46px] transition-colors">
        <NavbarLogo />
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          {!isPrimaryLoading && <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {isPrimaryLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <SidebarMenuItem key={`skel-${i}`}>
                    <div className="flex items-center gap-3 px-3 py-2">
                      <Skeleton className="h-5 w-5 rounded-md bg-default-200 dark:bg-slate-800" />
                      <Skeleton className="h-4 w-32 rounded bg-default-200 dark:bg-slate-800" />
                    </div>
                  </SidebarMenuItem>
                )) : filteredPrimaryNav.map((item) => (
                item.children ? (
                  <Collapsible
                    key={item.id}
                    asChild
                    defaultOpen={pathname?.startsWith(item.href) || item.children.some((c) => pathname?.startsWith(c.href))}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.label}
                          isActive={
                            pathname === item.href ||
                            pathname?.startsWith(item.href) ||
                            item.children.some((c) => pathname === c.href || pathname?.startsWith(c.href))
                          }
                        >
                          {item.icon && <item.icon />}
                          <span>{item.label}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.label}>
                              <SidebarMenuSubButton asChild isActive={checkActive(subItem.href)}>
                                <Link href={subItem.href}>
                                  <span>{subItem.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild tooltip={item.label} isActive={checkActive(item.href)}>
                      <Link href={item.href}>
                        {item.icon && <item.icon />}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!isMoreLoading && <SidebarGroupLabel>More Options</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {isMoreLoading ? Array.from({ length: 3 }).map((_, i) => (
                  <SidebarMenuItem key={`skel-more-${i}`}>
                    <div className="flex items-center gap-3 px-3 py-2">
                      <Skeleton className="h-5 w-5 rounded-md bg-default-200 dark:bg-slate-800" />
                      <Skeleton className="h-4 w-24 rounded bg-default-200 dark:bg-slate-800" />
                    </div>
                  </SidebarMenuItem>
                )) : filteredMoreNav.map((item) => (
                item.children && item.children.length > 0 ? (
                  <Collapsible
                    key={item.id}
                    asChild
                    defaultOpen={pathname?.startsWith(item.href) || item.children.some(c => pathname?.startsWith(c.href))}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.label} isActive={pathname === item.href || item.children.some(c => pathname === c.href || pathname?.startsWith(c.href))}>
                          {item.icon && <item.icon />}
                          <span>{item.label}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.label}>
                              <SidebarMenuSubButton asChild isActive={checkActive(subItem.href)}>
                                <Link href={subItem.href}>
                                  <span>{subItem.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild tooltip={item.label} isActive={checkActive(item.href)}>
                      <Link href={item.href}>
                        {item.icon && <item.icon />}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarRail />
    </Sidebar>
  );
}
