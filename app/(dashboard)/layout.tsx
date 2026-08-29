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
      const userSub = (user as any).tenantDomain;
      const isMasterTenant = !userSub || userSub === "enfy" || userSub === "www" || userSub === "localhost";

      if (userSub && !isMasterTenant) {
        // If current subdomain doesn't match user's tenant subdomain, direct to login on current host
        if (currentSub && currentSub !== userSub) {
          redirect("/");
        }
      } else if (isMasterTenant && currentSub === "enfy") {
        redirect(`${protocol}://${baseDomain}/dashboard`);
      }
    }
  } else {
    // Session is missing — force redirect to login at the root
    redirect("/");
  }

  return (
    <SessionProvider session={session}>
      <ClientRoot>{children}</ClientRoot>
    </SessionProvider>
  );
}

