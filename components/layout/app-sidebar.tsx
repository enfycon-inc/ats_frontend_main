"use client";

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
import { usePathname } from "next/navigation";
import { NavbarLogo } from "./navbar-logo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [overrideRole, setOverrideRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOverrideRole(localStorage.getItem("override_role"));
      const handleStorage = () => {
        setOverrideRole(localStorage.getItem("override_role"));
      };
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    }
  }, []);

  const systemRole = useMemo(() => {
    return overrideRole || (session as any)?.user?.systemRole || "RECRUITER";
  }, [session, overrideRole]);

  const filteredPrimaryNav = useMemo(() => {
    if (systemRole === "SUPER_ADMIN") {
      return GLOBAL_ADMIN_NAV_ITEMS;
    }

    return PRIMARY_NAV_ITEMS.filter(item => {
      // Recruiter filters
      if (systemRole === "RECRUITER") {
        const allowed = ["dashboard", "job-posting", "applicants", "submissions-tracker"];
        return allowed.includes(item.id);
      }
      
      // Pod Lead filters
      if (systemRole === "POD_LEAD") {
        const allowed = ["dashboard", "job-posting", "applicants", "submissions-tracker", "reports"];
        return allowed.includes(item.id);
      }
      
      // Account Manager filters
      if (systemRole === "ACCOUNT_MANAGER") {
        const allowed = ["dashboard", "job-posting", "applicants", "submissions-tracker", "clients", "placements"];
        return allowed.includes(item.id);
      }

      // Other roles (Admin, Delivery Head, etc.) see everything
      return true;
    });
  }, [systemRole]);

  const filteredMoreNav = useMemo(() => {
    if (systemRole === "SUPER_ADMIN") {
      return GLOBAL_ADMIN_MORE_ITEMS;
    }

    return MORE_NAV_ITEMS.filter(item => {
      // Recruiter filters
      if (systemRole === "RECRUITER") {
        const allowed = ["email", "calendar", "documents", "settings", "help"];
        return allowed.includes(item.id);
      }
      
      // Pod Lead filters
      if (systemRole === "POD_LEAD") {
        const allowed = ["email", "calendar", "documents", "pod-management", "settings", "help"];
        return allowed.includes(item.id);
      }
      
      // Account Manager filters
      if (systemRole === "ACCOUNT_MANAGER") {
        const allowed = ["email", "calendar", "documents", "settings", "help"];
        return allowed.includes(item.id);
      }

      // Other roles see everything
      return true;
    });
  }, [systemRole]);

  return (
    <Sidebar collapsible="icon" className="border-r border-default-200 dark:border-slate-800">
      <SidebarHeader className="p-4 border-b border-default-200 dark:border-slate-800 flex items-center justify-center">
        <NavbarLogo />
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredPrimaryNav.map((item) => (
                item.children ? (
                  <Collapsible
                    key={item.id}
                    asChild
                    defaultOpen={pathname?.startsWith(item.href)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.label} isActive={pathname === item.href || pathname?.startsWith(item.href)}>
                          {item.icon && <item.icon />}
                          <span>{item.label}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.label}>
                              <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
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
                    <SidebarMenuButton asChild tooltip={item.label} isActive={pathname === item.href}>
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
          <SidebarGroupLabel>More Options</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMoreNav.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild tooltip={item.label} isActive={pathname === item.href}>
                    <Link href={item.href}>
                      {item.icon && <item.icon />}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarRail />
    </Sidebar>
  );
}
