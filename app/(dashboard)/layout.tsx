import { ClientRoot } from "@/app/client-root";
import type { Metadata } from "next";
import { cache } from "react";
import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { getApiBase } from "@/lib/ats-api";
import { loadNavigationBootstrap } from "@/lib/navigation-bootstrap";
import { dashboardPreferenceCookie } from "@/lib/dashboard-preference";
import { getBaseDomain, getCurrentSubdomain } from "@/utils/subdomain-helper";

// Share one session read between metadata and layout within this server request.
const getSessionSafe = cache(async () => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const session = await Promise.race([
      auth(),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), 8000);
      }),
    ]);
    return session;
  } catch {
    return null;
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const session = await getSessionSafe();
  const navigation = await loadNavigationBootstrap(getApiBase(), (session as any)?.user?.accessToken || "");
  const title = navigation?.profile?.tenant?.siteTitle;
  return title ? { title: { absolute: title } } : {};
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionSafe();

  // Server-side subdomain boundary validation
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const baseDomain = getBaseDomain(host);
  const currentSub = getCurrentSubdomain(host);
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  if (session && (session as any).user) {
    const user = (session as any).user;
    const isSuperAdmin = user.roles?.includes("SUPER_ADMIN") || (user as any).systemRole === "SUPER_ADMIN";

    if (isSuperAdmin) {
      // Super Admin always operates on the root base domain
      if (currentSub) {
        redirect(`${protocol}://${baseDomain}/dashboard`);
      }
    } else {
      const rawUserSub = (user as any).tenantDomain || "";
      const userSub = rawUserSub.split(".")[0].toLowerCase().trim();
      const isMasterTenant = !userSub || userSub === "enfy" || userSub === "www" || userSub === "localhost";

      if (userSub && !isMasterTenant) {
        // A tenant user can ONLY access the dashboard on their own tenant subdomain (e.g. deb.localhost:3000).
        // If accessed from root domain (localhost:3000) or another tenant's subdomain:
        // Seamlessly route them to their designated tenant workspace dashboard.
        if (currentSub !== userSub) {
          redirect(`${protocol}://${userSub}.${baseDomain}/dashboard`);
        }
      } else if (isMasterTenant && currentSub && currentSub !== "enfy") {
        // Master tenant operates on the base root domain
        redirect(`${protocol}://${baseDomain}/dashboard`);
      }
    }
  } else {
    // Session is missing — direct to login
    redirect("/auth/login");
  }

  const initialNavigation = await loadNavigationBootstrap(getApiBase(), (session as any)?.user?.accessToken || "");
  const cookieStore = await cookies();
  if (initialNavigation) {
    const key = dashboardPreferenceCookie(initialNavigation.profile);
    const saved = key ? cookieStore.get(key)?.value : null;
    if (saved) {
      try { initialNavigation.overrideRole = decodeURIComponent(saved); } catch { /* Ignore malformed preferences. */ }
    }
  }

  return (
    <SessionProvider session={session}>
      <ClientRoot initialNavigation={initialNavigation} defaultOpen={cookieStore.get("sidebar_state")?.value !== "false"}>{children}</ClientRoot>
    </SessionProvider>
  );
}

