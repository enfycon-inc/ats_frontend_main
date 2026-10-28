"use client";
import { OfficeLocationConsentControls } from "./office-location-consent";
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/ats-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Policy { enabled: boolean; networks: { network: string; kind: string; expiresAt: string }[] }
interface Geofence { latitude: number; longitude: number; radiusMetres: number }
export function OfficePolicySettings({ scope }: { scope: string }) {
  const branches = useSWR(['office-branches', scope], () => apiFetch<{ id: string; name: string }[]>('/api/user-management/office-branches'));
  const [branch, setBranch] = useState('');
  const policy = useSWR(branch ? ['office-policy', scope, branch] : null, () => apiFetch<Policy>(`/api/user-management/branches/${branch}/office-policy`), { revalidateOnFocus: false });
  const candidates = useSWR(['office-candidates', scope], () => apiFetch<{ branch_id: string; network: string; employees: number; ratio: number }[]>('/api/user-management/office-network-candidates'));
  const [networks, setNetworks] = useState<Policy['networks']>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!policy.data) return;
    setNetworks(policy.data.networks);
  }, [policy.data]);
  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/user-management/branches/${branch}/office-policy`, { method: 'PUT', body: JSON.stringify({ networks }) });
      toast.success('Office networks saved.'); await policy.mutate();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to save office policy.'); }
    finally { setSaving(false); }
  };
  return <details className="rounded-xl border border-neutral-200 bg-white p-4 text-xs dark:border-slate-700 dark:bg-slate-900"><summary className="cursor-pointer font-semibold">Office network settings</summary><div className="mt-4 space-y-4">
    <p className="text-neutral-500">Register verified office and VPN internet addresses separately. Dynamic addresses require re-verification; shared provider addresses cannot prove office presence.</p>
    {branches.error && <p role="alert" className="text-red-600">Unable to load permitted offices.</p>}
    <label className="block font-semibold">Office<select value={branch} onChange={e => setBranch(e.target.value)} className="mt-1 block h-9 w-full rounded border bg-transparent px-2 font-normal"><option value="">Select office</option>{branches.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {policy.error && <p role="alert" className="text-red-600">Unable to load office settings.</p>}
    {policy.data && <>
      {!policy.data.enabled && <p className="rounded border border-amber-200 p-2 text-amber-800">Office evidence collection is currently disabled. You can prepare settings before enabling collection.</p>}
      <div className="space-y-2"><h3 className="font-semibold">Verified public networks</h3>{networks.map((network, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_120px_150px_auto]">
        <Input aria-label={`Network ${index + 1}`} placeholder="Public IP or CIDR" value={network.network} onChange={e => setNetworks(items => items.map((item, i) => i === index ? { ...item, network: e.target.value } : item))} className="h-9 text-xs" />
        <select aria-label={`Network ${index + 1} type`} className="rounded border bg-transparent px-2" value={network.kind} onChange={e => setNetworks(items => items.map((item, i) => i === index ? { ...item, kind: e.target.value } : item))}><option value="office">Office</option><option value="vpn">Company VPN</option></select>
        <Input aria-label={`Network ${index + 1} verification expiry`} type="date" value={network.expiresAt.slice(0, 10)} onChange={e => setNetworks(items => items.map((item, i) => i === index ? { ...item, expiresAt: e.target.value ? `${e.target.value}T23:59:59Z` : '' } : item))} className="h-9 text-xs" />
        <button onClick={() => setNetworks(items => items.filter((_, i) => i !== index))} className="text-red-600">Remove</button>
      </div>)}<Button size="sm" variant="outline" disabled={networks.length >= 10} onClick={() => setNetworks(items => [...items, { network: '', kind: 'office', expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() }])}>Add network</Button><p className="text-neutral-500">The date is when the network must be verified again. Register both Jio and Airtel uplinks where applicable.</p></div>
      <Button size="sm" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save office networks'}</Button>
    </>}
    {!!candidates.data?.length && <div className="space-y-2 border-t pt-3"><h3 className="text-sm font-semibold">Unverified network suggestions</h3><p className="text-neutral-500">Repeated public-IP patterns are suggestions only. Check the office router and VPN configuration before adding a mapping.</p>{candidates.data.filter(item => !branch || item.branch_id === branch).map(item => <p key={`${item.branch_id}:${item.network}`} className="font-mono">{item.network} · {item.employees} employees · {Math.round(item.ratio * 100)}%</p>)}</div>}
  </div></details>;
}

export function UnitGeofenceSettings({ scope }: { scope: string }) {
  const units = useSWR(['geofence-units', scope], () => apiFetch<{ id: string; name: string; branchId: string; branchName: string }[]>('/api/user-management/geofence-units'));
  const [unitId, setUnitId] = useState('');
  const policy = useSWR(unitId ? ['unit-geofence', scope, unitId] : null, () => apiFetch<{ enabled: boolean; geofence: Geofence | null }>(`/api/user-management/business-units/${unitId}/geofence`), { revalidateOnFocus: false });
  const [enabled, setEnabled] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('150');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!policy.data) return;
    setEnabled(!!policy.data.geofence);
    setLatitude(String(policy.data.geofence?.latitude ?? ''));
    setLongitude(String(policy.data.geofence?.longitude ?? ''));
    setRadius(String(policy.data.geofence?.radiusMetres ?? 150));
  }, [policy.data]);
  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/user-management/business-units/${unitId}/geofence`, { method: 'PUT', body: JSON.stringify({ geofence: enabled ? { latitude: Number(latitude), longitude: Number(longitude), radiusMetres: Number(radius) } : null }) });
      toast.success('Unit geofence saved.'); await policy.mutate();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to save unit geofence.'); }
    finally { setSaving(false); }
  };
  return <section className="rounded-xl border border-neutral-200 bg-white p-4 text-xs dark:border-slate-700 dark:bg-slate-900">
    <div><h2 className="text-sm font-semibold">Operating unit geofence</h2><p className="mt-1 text-neutral-500">Each unit can have its own office boundary. Employees verify it from My Sessions; browser location is approximate and can be spoofed.</p></div>
    {units.error && <p role="alert" className="mt-3 text-red-600">Unable to load units in your authorised scope.</p>}
    <label className="mt-4 block font-semibold">Operating unit<select value={unitId} onChange={e => setUnitId(e.target.value)} className="mt-1 block h-9 w-full rounded border bg-transparent px-2 font-normal"><option value="">Select operating unit</option>{units.data?.map(unit => <option key={unit.id} value={unit.id}>{unit.name} · {unit.branchName}</option>)}</select></label>
    {policy.error && <p role="alert" className="mt-3 text-red-600">Unable to load this unit’s geofence.</p>}
    {policy.data && <div className="mt-4 space-y-4">
      {!policy.data.enabled && <p className="rounded border border-amber-200 p-2 text-amber-800">Office evidence collection is disabled. You can prepare this setting before enabling collection.</p>}
      <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />Enable geofence for this unit</label>
      {enabled && <div className="grid gap-3 sm:grid-cols-3"><label>Latitude<Input type="number" step="any" min="-90" max="90" value={latitude} onChange={e => setLatitude(e.target.value)} className="mt-1 text-xs" /></label><label>Longitude<Input type="number" step="any" min="-180" max="180" value={longitude} onChange={e => setLongitude(e.target.value)} className="mt-1 text-xs" /></label><label>Radius in metres<Input type="number" min="25" max="5000" value={radius} onChange={e => setRadius(e.target.value)} className="mt-1 text-xs" /></label></div>}
      <Button size="sm" disabled={saving || !unitId || (enabled && (!latitude || !longitude))} onClick={() => void save()}>{saving ? 'Saving…' : 'Save unit geofence'}</Button>
    </div>}
  </section>;
}

export function VerifyOfficeLocation({ scope }: { scope: string }) {
  return <OfficeLocationConsentControls scope={scope} />;
}
