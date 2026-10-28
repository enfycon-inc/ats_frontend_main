"use client";

import { useEffect, useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useManagementProfile } from './use-management-profile';
import { officeConsentRequest, officeConsentAction, browserLocationPermission, OFFICE_LOCATION_RETRY_EVENT } from '@/lib/office-location-consent';
import type { OfficeConsentContext, OfficeConsentClaim, OfficeConsentResult } from '@/lib/user-management.contract';

const keyFor = (scope: string) => ['office-location-consent', scope];
function useOfficeConsent(scope: string) {
  return useSWR(scope ? keyFor(scope) : null, () => officeConsentRequest<OfficeConsentContext>('context'), {
    revalidateOnMount: true, revalidateOnFocus: true, shouldRetryOnError: false,
  });
}
type Notice = { context: OfficeConsentContext; leaseToken: string; permission: PermissionState | 'unknown' };

export function OfficeLocationConsentCoordinator() {
  const profile = useManagementProfile();
  const scope = profile.data ? profile.scope : '';
  const context = useOfficeConsent(scope);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attempted = useRef(new Set<string>());
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const liveScope = useRef(scope);
  const { mutate } = useSWRConfig();
  liveScope.current = scope;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const refresh = async () => { await mutate(keyFor(liveScope.current)); };
  const collect = async (leaseToken: string, expectedScope: string) => {
    const stillHere = () => mounted.current && liveScope.current === expectedScope;
    try {
      if (!stillHere()) return;
      if (!navigator.geolocation || !window.isSecureContext) throw new Error('Location checks require HTTPS and a supported browser.');
      const { challenge } = await officeConsentRequest<{ challenge: string }>('challenge', { leaseToken });
      if (!stillHere()) return;
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
      });
      if (!stillHere()) return;
      const result = await officeConsentRequest<OfficeConsentResult>('check', {
        leaseToken, challenge, latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, timestamp: position.timestamp,
      });
      if (stillHere()) toast.success(`${result.result === 'within' ? 'Within office area' : result.result === 'outside' ? 'Outside office area' : 'Location uncertain'} · Observed ${new Date(result.checkedAt).toLocaleTimeString()} · Accuracy ±${Math.round(result.accuracyMetres)} m`);
    } catch (e: any) {
      if (stillHere()) {
        await officeConsentRequest('outcome', { leaseToken, status: e?.code === 1 ? 'browser_denied' : 'unavailable' }).catch(() => {});
        toast(e?.code === 1 ? 'Location permission was denied. You can continue using ATS.' : 'Location verification is unavailable. You can continue using ATS.');
      }
    } finally { if (stillHere()) await refresh(); }
  };

  const begin = async (value: OfficeConsentContext, manual = false) => {
    if (!value.eligible || inFlight.current || notice) return;
    const attemptKey = `${scope}:${value.loginId}`;
    if (!manual && attempted.current.has(attemptKey)) return;
    if (!manual && value.handled) return;
    attempted.current.add(attemptKey);
    inFlight.current = true;
    const expectedScope = scope;
    try {
      const permission = await browserLocationPermission();
      if (manual && permission === 'denied') {
        toast('Location is blocked by this browser. Allow it in the site settings, then try again.');
        return;
      }
      const action = officeConsentAction({ ...value, handled: manual ? false : value.handled }, permission);
      if (action === 'none' || !mounted.current || liveScope.current !== expectedScope) return;
      const claim = await officeConsentRequest<OfficeConsentClaim>('claim', { mode: action, manual });
      if (!claim.claimed || !claim.leaseToken || !mounted.current || liveScope.current !== expectedScope) return;
      if (action === 'collect') await collect(claim.leaseToken, expectedScope);
      else { setError(''); setNotice({ context: value, leaseToken: claim.leaseToken, permission }); }
    } catch {
      if (manual) toast('Office verification is unavailable. You can continue using ATS.');
    } finally { inFlight.current = false; }
  };

  useEffect(() => { setNotice(null); }, [scope]);
  useEffect(() => { if (context.data) void begin(context.data); }, [context.data, scope]);
  useEffect(() => {
    const retry = () => { if (context.data) void begin(context.data, true); };
    window.addEventListener(OFFICE_LOCATION_RETRY_EVENT, retry);
    return () => window.removeEventListener(OFFICE_LOCATION_RETRY_EVENT, retry);
  }, [context.data, scope, notice]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setInterval(() => {
      void officeConsentRequest<OfficeConsentClaim>('claim', { mode: 'notice', leaseToken: notice.leaseToken }).then(value => {
        if (!value.claimed) setNotice(null);
      }).catch(() => {});
    }, 40000);
    return () => window.clearInterval(timer);
  }, [notice]);

  const decide = async (choice: 'accepted' | 'declined') => {
    if (!notice || busy) return;
    const current = notice;
    const expectedScope = scope;
    setBusy(true); setError('');
    if (choice === 'declined') setNotice(null);
    try {
      await officeConsentRequest('decision', { choice, leaseToken: current.leaseToken, noticeVersion: current.context.noticeVersion });
      if (choice === 'accepted') { setNotice(null); await collect(current.leaseToken, expectedScope); }
      else await refresh();
    } catch (e) {
      if (choice === 'accepted' && mounted.current) setError(e instanceof Error ? e.message : 'Unable to save this preference. You can continue without sharing.');
    } finally { if (mounted.current) setBusy(false); }
  };

  return <Dialog open={!!notice} onOpenChange={open => { if (!open && !busy) void decide('declined'); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>Verify your office location</DialogTitle><DialogDescription>{notice?.context.unitName || 'Your operating unit'}</DialogDescription></DialogHeader>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <p>With your permission, ATS will check your device location after sign-in to see whether it is within your unit&apos;s configured office area.</p>
        <p>Your browser sends coordinates and accuracy for this check. We store the result, accuracy and time with your session, not the precise coordinates. Authorized administrators may view this evidence according to their permissions and your workspace&apos;s retention policy.</p>
        <p>This is optional. Declining will not block sign-in or restrict your account. We will ask again at your next login.</p>
        <p>If you accept, we remember your choice for this workspace and browser. Future checks run only while browser permission remains granted. You can withdraw consent in My Sessions. This is not continuous tracking or attendance verification.</p>
        {notice?.permission === 'denied' && <p className="rounded border border-amber-200 p-3 text-amber-800 dark:text-amber-300">Your browser currently blocks location. To share it, enable location in this site&apos;s browser settings. ATS cannot override that setting.</p>}
        {error && <p role="alert" className="text-red-600">{error}</p>}
      </div>
      <div className="flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => void decide('declined')}>Not now</Button><Button disabled={busy} onClick={() => void decide('accepted')}>{busy ? 'Saving…' : 'Accept & continue'}</Button></div>
      <p className="text-xs text-slate-500">Your browser may ask for location permission next.</p>
    </DialogContent>
  </Dialog>;
}

export function OfficeLocationConsentControls({ scope }: { scope: string }) {
  const { data, error, isLoading, mutate } = useOfficeConsent(scope);
  const [busy, setBusy] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<PermissionState | 'unknown'>('unknown');
  useEffect(() => { void browserLocationPermission().then(setBrowserPermission); }, []);
  const reasons: Record<OfficeConsentContext['reason'], string> = {
    ready: 'Office verification is configured for your unit.', disabled: 'Office location collection is disabled for this deployment.',
    no_unit: 'Your account has no operating unit assignment.', no_geofence: 'No geofence is configured for your assigned unit.',
    new_login_required: 'Sign out and sign in again to start the new optional location-consent flow.',
  };
  const withdraw = async () => {
    setBusy(true);
    try { await officeConsentRequest('withdraw', {}); await mutate(); toast.success('Automatic location checks stopped for this browser. We will ask again at your next login.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to update preference.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3 rounded-xl border p-4 text-xs"><h2 className="text-sm font-semibold">Office location preference</h2>
    {isLoading && <div aria-label="Loading office location settings" className="h-9 animate-pulse rounded bg-slate-100" />}
    {error && <p role="alert">Unable to load office verification. You can continue using ATS. <button className="underline" onClick={() => void mutate()}>Retry</button></p>}
    {data && <><p>{reasons[data.reason]}</p><p>Remembered choice: {data.consent === 'accepted' ? 'Accepted for this browser and workspace' : data.consent === 'declined' ? 'Declined' : 'Not chosen'}. Browser location permission is controlled separately.</p>
      <div className="flex flex-wrap gap-2"><Button size="sm" disabled={!data.eligible || busy} onClick={() => window.dispatchEvent(new Event(OFFICE_LOCATION_RETRY_EVENT))}>Verify office location</Button>
        {data.consent === 'accepted' && <Button size="sm" variant="outline" disabled={busy} onClick={() => void withdraw()}>Stop automatic checks</Button>}</div>
      {data.consent === 'accepted' && browserPermission === 'denied' && <p className="text-amber-700 dark:text-amber-300">Automatic checks are paused because this browser blocks location. Allow location in the site settings to resume them.</p>}
      <p className="text-slate-500">Checks are optional and never restrict account access. No precise coordinates are retained.</p></>}
  </section>;
}
