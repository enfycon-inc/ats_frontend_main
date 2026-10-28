import { activeRoleHeaders } from './ats-api';
import type { OfficeConsentContext } from './user-management.contract';

export async function officeConsentRequest<T>(action: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/office-location/${action}`, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...activeRoleHeaders() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.message === 'string' ? data.message : 'Office verification is unavailable. You can continue using ATS.');
  return data as T;
}

export function officeConsentAction(context: OfficeConsentContext, permission: PermissionState | 'unknown'): 'none' | 'collect' | 'notice' {
  if (!context.eligible || context.handled) return 'none';
  if (context.consent === 'accepted') return permission === 'denied' ? 'none' : 'collect';
  return 'notice';
}

export async function browserLocationPermission(): Promise<PermissionState | 'unknown'> {
  try { return (await navigator.permissions.query({ name: 'geolocation' })).state; }
  catch { return 'unknown'; }
}

export const OFFICE_LOCATION_RETRY_EVENT = 'atsOfficeLocationRetry';
