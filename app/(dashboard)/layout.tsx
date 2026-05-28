import { ClientRoot } from "@/app/client-root";
import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";

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

  return (
    <SessionProvider session={session}>
      <ClientRoot>{children}</ClientRoot>
    </SessionProvider>
  );
}
