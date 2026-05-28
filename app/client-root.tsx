"use client";

import Footer from "@/components/layout/footer";
import { TopNavbar } from "@/components/layout/top-navbar";
import ThemeCustomizer from "@/components/theme-customizer/theme-customizer";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactNode } from "react";
import { Toaster } from "react-hot-toast";

export function ClientRoot({
  children,
}: {
  defaultOpen?: boolean; // kept for API compatibility — unused with top navbar
  children: ReactNode;
}) {
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
      <div className="flex flex-col min-h-[calc(100vh-46px)]">
        {/* Page content */}
        <div className="dashboard-body bg-neutral-100 dark:bg-[#1e2734] md:p-6 p-4 flex-1">
          {children}
        </div>

        <Footer />
      </div>

      <ThemeCustomizer />
      <Toaster position="top-center" reverseOrder={false} />
    </ThemeProvider>
  );
}
