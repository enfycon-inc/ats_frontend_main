"use client";

import Footer from "@/components/layout/footer";
import ThemeCustomizer from "@/components/theme-customizer/theme-customizer";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Toaster } from "react-hot-toast";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NavbarRight } from "@/components/layout/navbar-right";
import { TopNavbar } from "@/components/layout/top-navbar";

export function ClientRoot({
  children,
  defaultOpen = true,
}: {
  defaultOpen?: boolean; 
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    if (session && (session as any).user) {
      const u = (session as any).user;
      if (u.accessToken) {
        const localToken = typeof window !== "undefined" ? localStorage.getItem("ats_access_token") : null;
        const localUser = typeof window !== "undefined" ? localStorage.getItem("ats_current_user") : null;
        if ((localToken !== u.accessToken || !localUser) && typeof window !== "undefined") {
          localStorage.setItem("ats_access_token", u.accessToken);
          localStorage.setItem(
            "ats_current_user",
            JSON.stringify({
              id: u.id,
              email: u.email,
              fullName: u.name,
              roles: u.roles,
              tenantId: u.tenantId,
              defaultMarket: u.defaultMarket,
              permissions: u.permissions || [],
              systemRole: u.systemRole || "RECRUITER",
              podId: u.podId || null,
            })
          );
        }
      }
    }
  }, [session]);

  const [overrideRole, setOverrideRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Listen for local storage changes if they switch roles
      const override = localStorage.getItem("override_role");
      setOverrideRole(override);
      
      // Also listen to storage events to re-render immediately across components
      const handleStorageChange = () => {
        setOverrideRole(localStorage.getItem("override_role"));
      };
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, []);

  const isSuperAdmin = useMemo(() => {
    if (overrideRole === "SUPER_ADMIN") return true;
    if (overrideRole && overrideRole !== "SUPER_ADMIN") return false;
    
    if (!session || !(session as any).user) return false;
    const roles = (session as any).user.roles || [];
    const systemRole = (session as any).user.systemRole;
    return roles.includes("SUPER_ADMIN") || systemRole === "SUPER_ADMIN";
  }, [session, overrideRole]);

  const isViewportLocked = 
    (pathname?.startsWith("/job-posting") && !pathname.endsWith("/new") && !pathname.includes("/matches")) ||
    (pathname?.startsWith("/applicants") && !pathname.endsWith("/new")) ||
    (pathname?.startsWith("/clients") && !pathname.endsWith("/new"));

  // Main content block used by both layouts
  const MainContent = (
    <>
      {isViewportLocked ? (
        <div className="flex flex-col h-[calc(100vh-46px)] max-h-[calc(100vh-46px)] overflow-hidden min-w-0 max-w-full">
          <div className="dashboard-body bg-neutral-50 dark:bg-[#1e2734] md:p-3 p-2 flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            {children}
          </div>
        </div>
      ) : (
        <div className="flex flex-col min-w-0 max-w-full overflow-x-hidden">
          <div className="dashboard-body bg-neutral-50 dark:bg-[#1e2734] md:p-6 p-4 min-h-[calc(100vh-46px)] flex-1 min-w-0">
            {children}
          </div>
          <Footer />
        </div>
      )}
    </>
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {isSuperAdmin ? (
        // Legacy Top Navbar Layout for Super Admin
        <>
          <TopNavbar />
          {MainContent}
        </>
      ) : (
        // Modern Sidebar Layout for Operational Roles
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar />
          <SidebarInset>
            <header className="sticky top-0 z-40 flex h-[46px] min-h-[46px] shrink-0 items-center gap-2 border-b border-[#1a4fa0] dark:border-[#0f2d6b] bg-[#1a4fa0] dark:bg-[#0f2d6b] px-4 shadow-sm">
              <SidebarTrigger className="-ml-1 text-white hover:bg-white/10 hover:text-white" />
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <NavbarRight />
              </div>
            </header>
            {MainContent}
          </SidebarInset>
        </SidebarProvider>
      )}

      {/* <ThemeCustomizer /> */}
      <Toaster position="top-center" reverseOrder={false} />
    </ThemeProvider>
  );
}
