"use client";

import React from "react";
import { AuthPolicyCard } from "@/components/company/auth-policy-card";

interface AuthTabProps {
  tenantId?: string | number;
  subdomain?: string;
  companyName?: string;
}

export function AuthTab({ tenantId, subdomain, companyName }: AuthTabProps) {
  return (
    <div className="w-full space-y-6">
      <AuthPolicyCard
        tenantId={tenantId ? String(tenantId) : undefined}
        subdomain={subdomain || ""}
        companyName={companyName || ""}
      />
    </div>
  );
}
