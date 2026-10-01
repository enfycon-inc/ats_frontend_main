import { syncAssignedOffice } from "@/lib/assigned-office";
"use client";

import Footer from "@/components/layout/footer";
import { TenantBrandingProvider } from "@/contexts/tenant-branding";
import ThemeCustomizer from "@/components/theme-customizer/theme-customizer";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactNode, useEffect, useMemo, useState, Suspense } from "react";
import type { NavigationBootstrap } from "@/lib/navigation-bootstrap";
import { useRadixScrollLockFix } from "@/hooks/use-radix-scroll-lock-fix";
import { Toaster } from "react-hot-toast";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopNavbar } from "@/components/layout/top-navbar";
import { SitePageHeader } from "@/components/layout/site-page-header";
import { SocketProvider } from "@/contexts/SocketContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import dynamic from "next/dynamic";

// Lazy-loaded: these components fire multiple API calls on mount and are not
// needed for the first paint. Deferring them lets the sidebar and page content
// render first, then the navbar dropdowns hydrate in the background.
const NavbarRight = dynamic(
  () => import("@/components/layout/navbar-right").then(m => ({ default: m.NavbarRight })),
  { ssr: false, loading: () => <div className="flex items-center gap-1.5 h-8 w-40" /> }
);
const NotificationListener = dynamic(
  () => import("@/components/notifications/NotificationListener"),
  { ssr: false }
);
const GlobalErrorModal = dynamic(
  () => import("@/components/shared/global-error-modal").then(m => ({ default: m.GlobalErrorModal })),
  { ssr: false }
);

/** Immediately redirects to a given path on mount — used for client-side imperative navigation. */
function AutoRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => { router.replace(to); }, [to, router]);
  return null;
}

export function ClientRoot({
  children,
  defaultOpen = true,
  initialNavigation = null,
}: {
  defaultOpen?: boolean; 
  initialNavigation?: NavigationBootstrap | null;
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

  // Fix Radix UI scroll-lock padding-right injection on body
  useRadixScrollLockFix();

  
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Listen for local storage changes if they switch roles
            
      // Also listen to storage events to re-render immediately across components
      
    }
  }, []);


  // Run synchronously during initial render to prevent children from using stale storage in their initial fetch
  if (typeof window !== "undefined" && initialNavigation?.profile) {
    const permissions = initialNavigation.profile.permissions || [];
    if (!permissions.some((p: string) => ["tenant:settings", "tenant:manage", "platform:manage"].includes(p))) {
      syncAssignedOffice(initialNavigation.profile, window.localStorage);
    }
  }

  const isApproved = useMemo(() => {
    if (initialNavigation?.profile?.isApproved !== undefined) {
      return initialNavigation.profile.isApproved !== false;
    }
    if (session && (session as any).user) {
      return (session as any).user.isApproved !== false;
    }
    return true;
  }, [initialNavigation, session]);

  const requestedRole = useMemo(() => {
    return initialNavigation?.profile?.requestedRole || (session?.user as any)?.requestedRole || null;
  }, [initialNavigation, session]);

  const isSuperAdmin = useMemo(() => {
    if (!session || !(session as any).user) return false;
    const roles = (session as any).user.roles || [];
    const systemRole = (session as any).user.systemRole;
    return roles.includes("SUPER_ADMIN") || systemRole === "SUPER_ADMIN";
  }, [session]);

  const isViewportLocked = 
    (pathname?.startsWith("/job-posting") && !pathname.endsWith("/new") && !pathname.includes("/matches")) ||
    (pathname?.startsWith("/applicants") && !pathname.endsWith("/new")) ||
    (pathname?.startsWith("/clients") && !pathname.endsWith("/new"));

  // Main content block used by both layouts
  // Height offset: 46px (TopNavbar) + 50px (SitePageHeader) = 96px
  const MainContent = (
    <>
      {isViewportLocked ? (
        <div className="flex flex-col h-[calc(100vh-96px)] max-h-[calc(100vh-96px)] overflow-hidden min-w-0 max-w-full">
          <div className="dashboard-body bg-neutral-50 dark:bg-[#1e2734] md:p-3 p-2 flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            {children}
          </div>
        </div>
      ) : (
        <div className="flex flex-col min-w-0 max-w-full overflow-x-hidden min-h-[calc(100vh-96px)] bg-neutral-50 dark:bg-[#1e2734]">
          <div className="dashboard-body md:p-6 p-4 flex-1 min-w-0 flex flex-col">
            {children}
          </div>
          <Footer />
        </div>
      )}
    </>
  );


  if (!isApproved) {
    return (
      <div className="min-h-screen w-full bg-neutral-50 dark:bg-[#121820] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Redirecting to setup…</p>
        </div>
        <AutoRedirect to="/onboarding/new-user" />
      </div>
    );
  }

  return (
    <DashboardProvider initialNavigation={initialNavigation}>
    <TenantBrandingProvider initialBranding={initialNavigation?.profile?.tenant}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={150}>
        <SocketProvider>
          <NotificationProvider>
            <NotificationListener />
            <SidebarProvider defaultOpen={defaultOpen}>
              <AppSidebar initialNavigation={initialNavigation} />
              <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-y-auto max-h-screen h-screen">
                <header className="sticky top-0 z-40 flex h-[46px] min-h-[46px] shrink-0 items-center gap-2 border-b border-[#1a4fa0] dark:border-[#0f2d6b] bg-[#1a4fa0] dark:bg-[#0f2d6b] px-4 shadow-sm">
                  <SidebarTrigger className="-ml-1 text-white hover:bg-white/10 hover:text-white" />
                  <div className="flex-1" />
                  <div className="flex items-center gap-2">
                    <NavbarRight />
                  </div>
                </header>
                <Suspense fallback={<div className="h-[50px] min-h-[50px] bg-white dark:bg-[#151c24] border-b border-slate-200/70 dark:border-slate-800/70 shrink-0" />}>
                  <SitePageHeader />
                </Suspense>
                {MainContent}
              </SidebarInset>
            </SidebarProvider>

            {/* <ThemeCustomizer /> */}
            <Toaster position="top-center" reverseOrder={false} />
            <GlobalErrorModal />
          </NotificationProvider>
        </SocketProvider>
      </TooltipProvider>
    </ThemeProvider>
    </TenantBrandingProvider>
    </DashboardProvider>
  );
}
