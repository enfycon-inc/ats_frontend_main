import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { headers } from "next/headers";
import { getApiBase } from "@/lib/ats-api";
import { loadNavigationBootstrap } from "@/lib/navigation-bootstrap";
import { getBaseDomain, getCurrentSubdomain } from "@/utils/subdomain-helper";
import { TenantBrandingProvider } from "@/contexts/tenant-branding";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";
import OnboardingNewUserClient from "./client";

async function getSessionSafe() {
  try {
    const session = await Promise.race([
      auth(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    return session;
  } catch {
    return null;
  }
}

export const metadata = {
  title: "Set Up Your Workspace | Enfycon ATS",
};

export default async function OnboardingNewUserPage() {
  const session = await getSessionSafe();

  if (!session || !(session as any).user) {
    redirect("/auth/login");
  }

  const user = (session as any).user;

  // Server-side subdomain boundary validation
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const baseDomain = getBaseDomain(host);
  const currentSub = getCurrentSubdomain(host);
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  const isSuperAdmin = user.roles?.includes("SUPER_ADMIN") || user.systemRole === "SUPER_ADMIN";
  if (isSuperAdmin) {
    // Super admins don't need onboarding
    redirect("/dashboard");
  }

  const rawUserSub = user.tenantDomain || "";
  const userSub = rawUserSub.split(".")[0].toLowerCase().trim();
  const isMasterTenant = !userSub || userSub === "enfy" || userSub === "www" || userSub === "localhost";

  if (userSub && !isMasterTenant && currentSub !== userSub) {
    redirect(`${protocol}://${userSub}.${baseDomain}/onboarding/new-user`);
  }

  // If user is already fully approved with no pending role, send them to dashboard
  const isApproved = user.isApproved !== false;
  const requestedRole = user.requestedRole || null;
  if (isApproved && !requestedRole) {
    redirect("/dashboard");
  }

  const initialNavigation = await loadNavigationBootstrap(getApiBase(), user.accessToken || "");

  return (
    <SessionProvider session={session}>
      <TenantBrandingProvider initialBranding={initialNavigation?.profile?.tenant}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="min-h-screen w-full bg-neutral-50 dark:bg-[#121820] flex flex-col">
            <OnboardingNewUserClient
              session={session}
              initialNavigation={initialNavigation}
            />
            <Toaster position="top-center" reverseOrder={false} />
          </div>
        </ThemeProvider>
      </TenantBrandingProvider>
    </SessionProvider>
  );
}
