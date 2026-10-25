import { atsApi, activeRoleHeaders } from '@/lib/ats-api';
// Short-lived initialization reuse only. Backend mutations still recheck live access/settings.
const entries = new Map<string, { expires: number; promise: Promise<any> }>();
function shared<T>(kind: string, load: () => Promise<T>): Promise<T> {
  if (typeof window === 'undefined') return load();
  const scope = JSON.stringify([localStorage.getItem('ats_access_token'), localStorage.getItem('tenant_id'), localStorage.getItem('active_branch_id'), activeRoleHeaders()]);
  const key = `${scope}:${kind}`;
  const existing = entries.get(key);
  if (existing && existing.expires > Date.now()) return existing.promise;
  const promise = load().catch(error => { entries.delete(key); throw error; });
  entries.set(key, { expires: Date.now() + 5000, promise });
  if (entries.size > 12) for (const [k, entry] of entries) if (entry.expires <= Date.now()) entries.delete(k);
  return promise;
}
export const jobFormContext = {
  profile: () => shared('profile', () => atsApi.auth.me()),
  units: () => shared('units', () => atsApi.businessUnits.list()),
  branches: () => shared('branches', () => atsApi.branches.list()),
};
