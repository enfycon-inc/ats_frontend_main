"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { atsApi } from "@/lib/ats-api";

type Branding = { name?: string; siteTitle?: string; logoUrl?: string };
const BrandingContext = createContext({ branding: {} as Branding, updateBranding: (_: Branding) => {} });
export const useTenantBranding = () => useContext(BrandingContext);

export function TenantBrandingProvider({ initialBranding, children }: { initialBranding?: Branding; children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(initialBranding || {});
  const revision = useRef(0);
  const updateBranding = useCallback((saved: Branding) => {
    revision.current += 1;
    setBranding(saved);
  }, []);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const startedAt = revision.current;
    // Revalidate even a partial server snapshot. Use the same token recovery
    // as the settings form instead of silently abandoning a stale session token.
    atsApi.auth.me().then(profile => {
      if (!cancelled && revision.current === startedAt && profile?.tenant) {
        setBranding(profile.tenant);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [initialBranding]);

  useEffect(() => {
    document.title = branding.siteTitle || "Enfysync - ATS Recruitment Platform";
  }, [branding.siteTitle, pathname]);

  return <BrandingContext.Provider value={{ branding, updateBranding }}>{children}</BrandingContext.Provider>;
}
