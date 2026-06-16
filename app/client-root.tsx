"use client";

import Footer from "@/components/layout/footer";
import { TopNavbar } from "@/components/layout/top-navbar";
import ThemeCustomizer from "@/components/theme-customizer/theme-customizer";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactNode, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function ClientRoot({
  children,
}: {
  defaultOpen?: boolean; // kept for API compatibility — unused with top navbar
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    if (session && (session as any).user) {
      const u = (session as any).user;
      if (u.accessToken) {
        const localToken = typeof window !== "undefined" ? localStorage.getItem("ats_access_token") : null;
        if (localToken !== u.accessToken && typeof window !== "undefined") {
          localStorage.setItem("ats_access_token", u.accessToken);
          localStorage.setItem(
            "ats_current_user",
            JSON.stringify({
              id: u.id,
              email: u.email,
              fullName: u.name,
              roles: u.roles,
              tenantId: u.tenantId,
            })
          );
        }
      }
    }
  }, [session]);
  const isViewportLocked = 
    (pathname?.startsWith("/job-posting") && !pathname.endsWith("/new")) ||
    (pathname?.startsWith("/applicants") && !pathname.endsWith("/new"));

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {/* ── Top Navbar (replaces sidebar) ── */}
      <TopNavbar />

      {/* ── Main content area — full width ── */}
      {isViewportLocked ? (
        <div className="flex flex-col h-[calc(100vh-46px)] max-h-[calc(100vh-46px)] overflow-hidden">
          {/* Page content */}
          <div className="dashboard-body bg-neutral-100 dark:bg-[#1e2734] md:p-3 p-2 flex-1 flex flex-col min-h-0 overflow-hidden">
            {children}
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Page content */}
          <div className="dashboard-body bg-neutral-100 dark:bg-[#1e2734] md:p-6 p-4 min-h-[calc(100vh-46px)] flex-1">
            {children}
          </div>

          <Footer />
        </div>
      )}

      {/* <ThemeCustomizer /> */}
      <Toaster position="top-center" reverseOrder={false} />
    </ThemeProvider>
  );
}
