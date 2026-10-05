"use client";

import React from "react";
import PendingApprovalView from "@/components/auth/pending-approval-view";
import type { NavigationBootstrap } from "@/lib/navigation-bootstrap";
import { SocketProvider } from "@/contexts/SocketContext";

interface OnboardingNewUserClientProps {
  session: any;
  initialNavigation: NavigationBootstrap | null;
}

export default function OnboardingNewUserClient({
  session,
  initialNavigation,
}: OnboardingNewUserClientProps) {
  const requestedRole =
    initialNavigation?.profile?.requestedRole ||
    (session?.user as any)?.requestedRole ||
    null;

  const userEmail =
    (session?.user as any)?.email || initialNavigation?.profile?.email;
  const userName =
    (session?.user as any)?.name || initialNavigation?.profile?.fullName;
  const tenantName = initialNavigation?.profile?.tenant?.name;

  return (
    // Full-height scrollable container — the key fix for scroll being blocked
    <SocketProvider>
      <div className="flex-1 w-full overflow-y-auto">
        <div className="w-full py-8 md:py-16 px-4">
          <PendingApprovalView
            initialRequestedRole={requestedRole}
            userEmail={userEmail}
            userName={userName}
            tenantName={tenantName}
          />
        </div>
      </div>
    </SocketProvider>
  );
}
