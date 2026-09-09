import { ClientRoot } from "@/app/client-root";
import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getBaseDomain, getCurrentSubdomain } from "@/utils/subdomain-helper";

// Fetch session with a safe timeout so a slow auth provider never hangs the route
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
        // Do NOT allow access to this host's dashboard — direct to /auth/login on the CURRENT host.
        // It remains in the same domain and does NOT redirect to another subdomain.
        if (currentSub !== userSub) {
          redirect("/auth/login");
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

  return (
    <SessionProvider session={session}>
      <ClientRoot>{children}</ClientRoot>
    </SessionProvider>
  );
}

