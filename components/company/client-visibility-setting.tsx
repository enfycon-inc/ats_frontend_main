"use client";

import { useEffect, useState } from "react";
import { atsApi } from "@/lib/ats-api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";

export function ClientVisibilitySetting({ canManage }: { canManage: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setReady(false);
    setError(null);
    if (!canManage) return;
    atsApi.clients.getVisibilityPolicy().then(policy => {
      if (active) { setEnabled(policy.clientsVisibleAcrossUnits); setReady(true); }
    }).catch(() => { if (active) setError("Unable to load client access settings. Reload to try again."); });
    return () => { active = false; };
  }, [canManage]);
  if (!canManage) return null;
  async function change(value: boolean) {
    setSaving(true);
    try {
      const saved = await atsApi.clients.setVisibilityPolicy(value);
      setEnabled(saved.clientsVisibleAcrossUnits);
      toast.success("Client access settings saved.");
    } catch { toast.error("Could not save client access settings."); }
    finally { setSaving(false); }
  }
  return <Card>
    <CardHeader>
      <CardTitle>Client Access</CardTitle>
      <CardDescription>Control client and POC visibility across your company.</CardDescription>
    </CardHeader>
    <CardContent>
      <label className="flex items-center justify-between gap-4 text-sm font-medium">
        Allow client access across all branches and units
        <Switch checked={enabled} onCheckedChange={change} disabled={!ready || saving} aria-label="Allow client access across all branches and units" />
      </label>
      <p className="mt-3 text-xs text-neutral-500">When enabled, staff with client viewing permission can see clients and POCs across the tenant. When disabled, client access is restricted to ownership and administrative scope. Editing and job access retain their own permissions.</p>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </CardContent>
  </Card>;
}
