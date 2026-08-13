import { ClientRoot } from "@/app/client-root";
import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

// Fetch session with a timeout so a slow auth provider never hangs the route
async function getSessionSafe() {
  try {
    const session = await Promise.race([
      auth(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
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
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");

  let currentSub = "";
  if (hostname.includes("localhost")) {
    if (parts.length > 1 && parts[0] !== "localhost") {
      currentSub = parts[0];
    }
  } else {
    if (parts.length > 2 && parts[0] !== "www") {
      currentSub = parts[0];
    }
  }

  if (session && (session as any).user) {
    const user = (session as any).user;
    const isSuperAdmin = user.roles?.includes("SUPER_ADMIN");

    if (isSuperAdmin) {
      // Enforce Super Admin domain boundary: Super Admin must log in/operate on the main domain only
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const mainDomainHost = siteUrl.replace(/^https?:\/\//, "").split("/")[0];
      const currentHostLower = host.toLowerCase();
      const mainHostLower = mainDomainHost.toLowerCase();

      if (currentHostLower !== mainHostLower && currentHostLower !== `www.${mainHostLower}`) {
        const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
        redirect(`${protocol}://${mainDomainHost}/dashboard`);
      }
    } else {
      const userSub = (user as any).tenantDomain;
      const isMasterTenant = !userSub || userSub === "enfycon" || userSub === "www" || userSub === "localhost";

      if (userSub && !isMasterTenant) {
        // Preserve the actual dev-server port so local dev works off port 3000 too.
        const localBase = `localhost:${host.split(":")[1] || "3000"}`;

        // Redirect if current subdomain doesn't match user's tenant subdomain
        if (currentSub && currentSub !== userSub) {
          const base = hostname.includes("localhost") ? localBase : parts.slice(1).join(".");
          const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
          redirect(`${protocol}://${userSub}.${base}/dashboard`);
        }

        // Redirect if user is at root domain but belongs to a secondary tenant
        if (!currentSub) {
          const base = hostname.includes("localhost") ? localBase : hostname;
          const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
          redirect(`${protocol}://${userSub}.${base}/dashboard`);
        }
      } else if (isMasterTenant && currentSub === "enfycon") {
        const localBase = `localhost:${host.split(":")[1] || "3000"}`;
        const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
        redirect(`${protocol}://${localBase}/dashboard`);
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
