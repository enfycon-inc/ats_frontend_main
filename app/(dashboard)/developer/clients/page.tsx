"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, Clipboard, Code2, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { atsApi, type CareerOauthClient } from "@/lib/ats-api";
import toast from "react-hot-toast";

type Scope = CareerOauthClient["scope"];

function scopeLabel(scope: Scope) {
  return scope === "TENANT" ? "Tenant" : scope === "BRANCH" ? "Branch" : "Business unit";
}

export default function PublicCareersApiPage() {
  const { data: session, status } = useSession();
  const user = session?.user as { permissions?: string[] } | undefined;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = permissions.includes("tenant:settings") || permissions.includes("tenant:manage");
  const [keys, setKeys] = useState<CareerOauthClient[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [createdSecret, setCreatedSecret] = useState("");
  const [name, setName] = useState("");
  const [scope, setScope] = useState<Scope>("TENANT");
  const [branchId, setBranchId] = useState("");
  const [businessUnitId, setBusinessUnitId] = useState("");
  const [originText, setOriginText] = useState("");
  const [expiryMonths, setExpiryMonths] = useState("12");
  const [clientId, setClientId] = useState("");

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const [keyList, branchList, unitList] = await Promise.all([
        atsApi.careerOauthClients.list(),
        atsApi.branches.list(),
        atsApi.businessUnits.list(),
      ]);
      setKeys(keyList);
      setBranches(Array.isArray(branchList) ? branchList : []);
      setUnits(Array.isArray(unitList) ? unitList : []);
    } catch (error: any) {
      toast.error(error?.message || "Could not load public careers API settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && canManage) void loadPage();
    else if (status === "unauthenticated" || (status === "authenticated" && !canManage)) setLoading(false);
  }, [status, canManage, loadPage]);

  const selectedUnits = useMemo(() => units.filter((unit) => branchId && unit.branchId === branchId), [units, branchId]);
  const branchNames = useMemo(() => new Map(branches.map((branch) => [branch.id, branch.name || branch.branchName || branch.label || "Branch"])), [branches]);
  const unitNames = useMemo(() => new Map(units.map((unit) => [unit.id, unit.name || unit.businessUnitName || unit.label || "Business unit"])), [units]);

  function resetForm() {
    setName(""); setScope("TENANT"); setBranchId(""); setBusinessUnitId(""); setOriginText(""); setExpiryMonths("12");
  }

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const allowedOrigins = originText.split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
    if (!name.trim()) return toast.error("Enter a name for this client credentials.");
    if (scope === "BRANCH" && !branchId) return toast.error("Select a branch for this key.");
    if (scope === "BUSINESS_UNIT" && (!branchId || !businessUnitId)) return toast.error("Select a business unit for this key.");
    setSaving(true);
    try {
      const created = await atsApi.careerOauthClients.create({
        name: name.trim(), scope, ...(scope !== "TENANT" ? { branchId } : {}),
        ...(scope === "BUSINESS_UNIT" ? { businessUnitId } : {}), allowedOrigins,
        expiryMonths: expiryMonths === "none" ? null : Number(expiryMonths),
      });
      setCreatedSecret(created.client_secret);
      setClientId(created.client_id);
      setShowForm(false);
      resetForm();
      await loadPage();
    } catch (error: any) {
      toast.error(error?.message || "Could not create client credentials.");
    } finally {
      setSaving(false);
    }
  }

  async function revokeKey(key: CareerOauthClient) {
    if (!window.confirm(`Revoke “${key.name}”? Any website using this key will lose access immediately.`)) return;
    try {
      await atsApi.careerOauthClients.revoke(key.id);
      toast.success("client credentials revoked.");
      await loadPage();
    } catch (error: any) {
      toast.error(error?.message || "Could not revoke client credentials.");
    }
  }

  async function copySecret() {
    try { await navigator.clipboard.writeText(createdSecret); toast.success("client credentials copied."); }
    catch { toast.error("Copy failed. Select and copy the key manually."); }
  }

  if (status === "loading" || loading) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-indigo-600" aria-label="Loading" /></div>;
  if (!canManage) return <Card className="max-w-2xl"><CardHeader><CardTitle className="text-base">Tenant administrator access required</CardTitle><CardDescription>Only users with tenant settings or tenant management permission can manage public careers API clients.</CardDescription></CardHeader></Card>;

  return (
    <div className="mx-auto w-full space-y-5 pb-10">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs text-neutral-500">Developer / API Clients</p>

          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Manage website access to published jobs and candidate applications.</p>
        </div>
        <Button onClick={() => { setCreatedSecret(""); setShowForm((value) => !value); }} className="h-9 bg-indigo-600 text-xs hover:bg-indigo-700">
          <Plus className="mr-1.5 h-4 w-4" /> Create client credentials
        </Button>
      </div>

      {createdSecret && <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-amber-600" /> Copy your new client secret now</CardTitle><CardDescription>The full secret is shown only once. It cannot be recovered later; if lost, revoke this key and create another.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs font-semibold">Client ID: <code>{clientId}</code></p><div className="flex gap-2"><Input readOnly value={createdSecret} className="font-mono text-xs" aria-label="New client credentials secret"/><Button variant="outline" onClick={copySecret} className="shrink-0"><Clipboard className="mr-1.5 h-4 w-4"/>Copy</Button></div>
          <p className="text-xs text-amber-900 dark:text-amber-200">Store this secret on your website server. Never put it in browser JavaScript, HTML, or a public repository.</p>
          <Button variant="outline" size="sm" onClick={() => setCreatedSecret("")}>I have stored the key</Button>
        </CardContent>
      </Card>}

      {showForm && <Card>
        <CardHeader><CardTitle className="text-sm">Create a website client credentials</CardTitle><CardDescription>Choose the narrowest scope that serves your careers site. The secret is displayed once after creation.</CardDescription></CardHeader>
        <CardContent><form onSubmit={createKey} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-semibold">Client name<Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Main careers website" required className="h-9 text-xs"/></label>
          <label className="space-y-1.5 text-xs font-semibold">Access scope<select value={scope} onChange={(event) => { setScope(event.target.value as Scope); setBranchId(""); setBusinessUnitId(""); }} className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="TENANT">Entire tenant</option><option value="BRANCH">One branch</option><option value="BUSINESS_UNIT">Branch, then one business unit</option></select></label>
          {scope !== "TENANT" && <label className="space-y-1.5 text-xs font-semibold">Branch<select value={branchId} onChange={(event) => { setBranchId(event.target.value); setBusinessUnitId(""); }} required className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="">Select branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name || branch.branchName || branch.label || branch.id}</option>)}</select></label>}
          {scope === "BUSINESS_UNIT" && <label className="space-y-1.5 text-xs font-semibold">Business unit<select value={businessUnitId} disabled={!branchId} onChange={(event) => setBusinessUnitId(event.target.value)} required className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="">Select business unit</option>{selectedUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name || unit.businessUnitName || unit.label || unit.id}</option>)}</select></label>}
          <label className="space-y-1.5 text-xs font-semibold">Client expiration<select value={expiryMonths} onChange={event => setExpiryMonths(event.target.value)} className="h-9 w-full rounded-md border px-3 text-xs dark:bg-slate-900"><option value="none">No expiry</option><option value="1">1 month</option><option value="6">6 months</option><option value="12">1 year</option><option value="24">2 years</option></select></label>
          <label className="space-y-1.5 text-xs font-semibold sm:col-span-2">Allowed website origins <span className="font-normal text-neutral-500">(optional; enter HTTPS origins or * for any origin, separated by commas or new lines)</span><textarea value={originText} onChange={(event) => setOriginText(event.target.value)} placeholder={'https://careers.example.com'} rows={2} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-900"/><span className="block font-normal text-neutral-500">Origin checks are an additional browser control, not a substitute for keeping the key server-side.</span></label>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button><Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Generate client credentials</Button></div>
        </form></CardContent>
      </Card>}

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-neutral-100 dark:border-slate-800"><CardTitle className="text-sm">API clients</CardTitle><CardDescription>Secrets are never stored in recoverable form. Only the client ID and configuration are shown here.</CardDescription></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-neutral-50 text-[10.5px] uppercase tracking-wider text-neutral-600 dark:bg-slate-800/40 dark:text-neutral-400"><tr>{["Name", "Scope", "Allowed origins", "Client ID", "Expires", "Status", ""].map((label) => <th key={label} className="px-4 py-3 font-bold">{label}</th>)}</tr></thead><tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
          {keys.map((key) => { const expired = Boolean(key.expiresAt && new Date(key.expiresAt) <= new Date()); const revoked = Boolean(key.revokedAt); const active = !expired && !revoked; const scopeDetail = key.scope === "BRANCH" ? branchNames.get(key.branchId || "") : key.scope === "BUSINESS_UNIT" ? unitNames.get(key.businessUnitId || "") : "All tenant jobs"; return <tr key={key.id} className="hover:bg-neutral-50/60 dark:hover:bg-slate-800/20"><td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">{key.name}</td><td className="px-4 py-3"><span className="font-semibold">{scopeLabel(key.scope)}</span><span className="mt-0.5 block text-[10px] text-neutral-500">{scopeDetail || "Scoped access"}</span></td><td className="max-w-48 truncate px-4 py-3 text-neutral-600">{key.allowedOrigins.length ? key.allowedOrigins.join(", ") : "Any origin"}</td><td className="px-4 py-3 font-mono text-[10px] text-neutral-600">{key.id}</td><td className="whitespace-nowrap px-4 py-3">{key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : "No expiry"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{revoked ? "Revoked" : expired ? "Expired" : "Active"}</span></td><td className="px-4 py-3">{active && <Button variant="outline" size="sm" onClick={() => void revokeKey(key)} className="h-7 border-red-200 px-2 text-[10px] text-red-700 hover:bg-red-50"><Trash2 className="mr-1 h-3 w-3"/>Revoke</Button>}</td></tr>; })}
          {!keys.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-neutral-500">No API clients created yet.</td></tr>}
        </tbody></table></div></CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20"><CardContent className="flex gap-3 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300"/><div className="space-y-1.5"><h2 className="text-xs font-bold text-neutral-900 dark:text-white">Use the API securely</h2><p className="text-xs text-neutral-600 dark:text-neutral-300">Exchange client credentials at /api/oauth/token using HTTP Basic authentication and grant_type=client_credentials. Then send the token as <code className="rounded bg-white px-1 py-0.5 font-mono dark:bg-slate-900">Authorization: Bearer &lt;access_token&gt;</code>. Do not call the API directly from public browser code.</p><p className="text-xs text-neutral-600 dark:text-neutral-300">Available public routes list published jobs, show one published job, and submit an application. They do not modify or delete jobs.</p><details className="pt-1"><summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300"><Code2 className="h-3.5 w-3.5"/>View endpoint paths</summary><pre className="mt-2 overflow-x-auto rounded-md border border-blue-100 bg-white p-3 text-[10px] leading-5 text-neutral-700 dark:border-slate-700 dark:bg-slate-900 dark:text-neutral-200">GET  /api/public/jobs{`\n`}GET  /api/public/jobs/:slug{`\n`}POST /api/public/jobs/:slug/applications</pre></details></div></CardContent></Card>
    </div>
  );
}
