"use client";

import React from "react";
import { EmailDispatchCard } from "@/components/company/email-dispatch-card";

interface EmailTabProps {
  tenantId?: string | number;
  subdomain?: string;
  companyName?: string;
  userEmail?: string;
  permissions?: string[];
}

export function EmailTab({
  tenantId,
  subdomain,
  companyName,
  userEmail,
  permissions,
}: EmailTabProps) {
  return (
    <div className="w-full space-y-6">
      <EmailDispatchCard
        tenantId={tenantId ? String(tenantId) : undefined}
        subdomain={subdomain || ""}
        companyName={companyName || ""}
        userEmail={userEmail}
        permissions={permissions}
      />
    </div>
  );
}
