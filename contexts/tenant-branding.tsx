"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { atsApi } from "@/lib/ats-api";
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { getTenantIdentifier } from '@/utils/subdomain-helper';
import type { TenantBranding as Branding } from '@/lib/tenant-branding-contract';

const BrandingContext = createContext<{ branding: Branding; brandingReady: boolean; updateBranding: (saved: Branding) => void }>({
  branding: {}, brandingReady: false, updateBranding: () => {},
});
export const useTenantBranding = () => useContext(BrandingContext);

type Props = { initialBranding?: Branding; children: ReactNode };
export function TenantBrandingProvider(props: Props) {
  const { data: session } = useSession();
  const sessionTenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId;
  const identity = `${session?.user?.id || ''}:${sessionTenantId || ''}:${getTenantIdentifier()}`;
  return <TenantBrandingState key={identity} {...props} identity={session?.user?.id ? identity : null} />;
}

function TenantBrandingState({ initialBranding, children, identity }: Props & { identity: string | null }) {
  const revision = useRef(0);
  const currentBranding = useRef<Branding>(initialBranding || {});
  const pathname = usePathname();
  const { data, mutate } = useSWR(identity ? ['tenant-branding', identity] : null, async () => {
    const startedAt = revision.current;
    const profile = await atsApi.auth.me();
    if (!profile?.tenant) throw new Error('Company branding is unavailable');
    // A save is authoritative over an older request, including its cache entry.
    if (startedAt !== revision.current) return currentBranding.current;
    const knownFields = Object.fromEntries(Object.entries(profile.tenant).filter(([, value]) => value !== undefined));
    return { ...currentBranding.current, ...knownFields } as Branding;
  }, { errorRetryCount: 3, errorRetryInterval: 2000, dedupingInterval: 5000,
    revalidateOnFocus: true, revalidateOnReconnect: true });

  const branding: Branding = { ...initialBranding, ...data };
  useEffect(() => { currentBranding.current = { ...initialBranding, ...data }; }, [initialBranding, data]);
  const updateBranding = useCallback((saved: Branding) => {
    revision.current += 1;
    currentBranding.current = { ...currentBranding.current, ...saved };
    void mutate(currentBranding.current, { revalidate: false });
  }, [mutate]);

  useEffect(() => {
    document.title = branding.siteTitle || "Enfysync - ATS Recruitment Platform";
  }, [branding.siteTitle, pathname]);

  const brandingReady = branding.logoUrl !== undefined;
  return <BrandingContext.Provider value={{ branding, brandingReady, updateBranding }}>{children}</BrandingContext.Provider>;
}
