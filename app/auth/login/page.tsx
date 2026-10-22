import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { safeLoginCallback } from '@/lib/safe-login-callback';
import LoginPageContent from '@/components/auth/login-page-content';
import { hasUsableEntrySession, requiresLoginFlow, type LoginEntryParams } from '@/lib/login-entry';
import { headers } from 'next/headers';
import { SWRConfig, unstable_serialize } from 'swr';
import { atsApi } from '@/lib/ats-api';
import { getTenantIdentifier } from '@/utils/subdomain-helper';

export default async function LoginPage({ searchParams }: { searchParams: Promise<LoginEntryParams> }) {
  const params = await searchParams;
  if (!requiresLoginFlow(params)) {
    let session;
    try { session = await auth(); } catch { session = null; }
    if (hasUsableEntrySession(session)) redirect(safeLoginCallback(typeof params.callbackUrl === 'string' ? params.callbackUrl : undefined));
  }
  const requestHeaders = await headers();
  const host = (requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || '').split(',')[0].trim();
  const tenantIdentifier = getTenantIdentifier(host);
  let initialPolicy = null;
  try {
    initialPolicy = await atsApi.auth.getTenantAuthPolicy(tenantIdentifier);
  } catch {
    // Let SWR retry in the browser; don't guess which tenant layout to render.
  }

  const policyKey = unstable_serialize(['tenant-sign-in-policy', tenantIdentifier]);
  return <SWRConfig value={{ fallback: initialPolicy ? { [policyKey]: initialPolicy } : {} }}>
    <LoginPageContent initialWorkspace={!!tenantIdentifier} />
  </SWRConfig>;
}
