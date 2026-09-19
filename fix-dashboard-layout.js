
const fs = require("fs");
const path = require("path");

const layoutPath = path.join(__dirname, "app/(dashboard)/dashboard/layout.tsx");

const newLayoutContent = `import { DashboardProvider } from "@/contexts/DashboardContext";
import { loadNavigationBootstrap } from "@/lib/navigation-bootstrap";
import { getApiBase } from "@/lib/ats-api";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { dashboardPreferenceCookie } from "@/lib/dashboard-preference";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let session = null;
  try {
    session = await Promise.race([
      auth(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
  } catch {}

  const initialNavigation = await loadNavigationBootstrap(getApiBase(), (session as any)?.user?.accessToken || "");
  const cookieStore = await cookies();
  
  if (initialNavigation) {
    const key = dashboardPreferenceCookie(initialNavigation.profile);
    const saved = key ? cookieStore.get(key)?.value : null;
    if (saved) {
      try { initialNavigation.overrideRole = decodeURIComponent(saved); } catch { /* Ignore malformed preferences. */ }
    }
  }

  return <DashboardProvider initialNavigation={initialNavigation}>{children}</DashboardProvider>;
}
`;

fs.writeFileSync(layoutPath, newLayoutContent);
console.log("Updated dashboard/layout.tsx");

