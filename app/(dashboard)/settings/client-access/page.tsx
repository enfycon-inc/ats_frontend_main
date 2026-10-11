"use client";
import { useEffect, useState } from "react";
import { atsApi } from "@/lib/ats-api";
import { getActiveRolePermissions } from "@/lib/role-permissions";
import { getSavedDashboardRole } from "@/lib/dashboard-preference";
import { ClientVisibilitySetting } from "@/components/company/client-visibility-setting";
export default function ClientAccessPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    atsApi.auth.me().then(profile => {
      if (active) setAllowed(getActiveRolePermissions(getSavedDashboardRole(profile), [], profile).includes("tenant:settings"));
    }).catch(() => { if (active) setAllowed(false); });
    return () => { active = false; };
  }, []);
  return <main className="space-y-5 p-6"><div><h1 className="text-xl font-bold tracking-tight">Client &amp; POC Access</h1><p className="mt-1 text-xs text-neutral-500">Tenant settings for client visibility and POC privacy.</p></div>
    {allowed === null ? <p className="text-sm">Loading settings…</p> : allowed ? <ClientVisibilitySetting canManage /> : <p role="alert" className="text-sm">Tenant settings permission is required to manage client access.</p>}
  </main>;
}
