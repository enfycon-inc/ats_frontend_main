"use client";
import { useEffect, useState } from "react";
import { atsApi, type ClientAccessPolicy } from "@/lib/ats-api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export function ClientVisibilitySetting({ canManage }: { canManage: boolean }) {
  const [policy, setPolicy] = useState<ClientAccessPolicy | null>(null);
  const [saved, setSaved] = useState<ClientAccessPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setPolicy(null); setSaved(null); setError(null);
    if (canManage) atsApi.clients.getVisibilityPolicy().then(value => {
      if (active) { setPolicy(value); setSaved(value); }
    }).catch(() => { if (active) setError("Unable to load client access settings. Reload to try again."); });
    return () => { active = false; };
  }, [canManage]);
  if (!canManage) return null;
  async function save() {
    if (!policy) return;
    setSaving(true);
    try {
      const value = await atsApi.clients.setVisibilityPolicy(policy);
      setPolicy(value); setSaved(value); toast.success("Client access settings saved.");
    } catch { toast.error("Could not save client access settings."); }
    finally { setSaving(false); }
  }
  const controls: { key: keyof ClientAccessPolicy; label: string; description: string }[] = [
    { key: "bdmClientsTenantWide", label: "BDMs can view all tenant clients", description: "Allow BDMs across branches and units to view clients in this tenant. Editing retains its own permissions." },
    { key: "otherOwnerPocsVisible", label: "BDMs can view other owners’ POCs", description: "When disabled, only owned POCs can be seen or selected. The privacy rule also protects contacts from other staff in this tenant." },
    { key: "maskOtherOwnerPocDetails", label: "Mask other owners’ POC contact details", description: "Show names and ownership while hiding email, phone, LinkedIn and private notes. Owners retain full details." },
  ];
  return <Card>
    <CardHeader><CardTitle>Client and POC access</CardTitle><CardDescription>Manage client sharing and contact privacy within this tenant.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {controls.map(control => <div key={control.key} className="flex items-center justify-between gap-6 rounded-md border border-neutral-200 p-4 dark:border-slate-700">
        <div><label htmlFor={control.key} className="text-sm font-semibold">{control.label}</label><p className="mt-1 text-xs text-neutral-500">{control.description}</p></div>
        <Switch id={control.key} aria-label={control.label} checked={policy?.[control.key] ?? false} disabled={!policy || saving || (control.key === "maskOtherOwnerPocDetails" && !policy.otherOwnerPocsVisible)} onCheckedChange={value => setPolicy(current => current ? { ...current, [control.key]: value } : current)} />
      </div>)}
      <p className="text-xs text-neutral-500">Other tenants’ clients and POCs remain inaccessible. When POC sharing is off, masking is inactive and its saved preference is retained.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button onClick={save} disabled={!policy || saving || JSON.stringify(policy) === JSON.stringify(saved)}>{saving ? "Saving…" : "Save settings"}</Button>
    </CardContent>
  </Card>;
}
