"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { atsApi } from '@/lib/ats-api';
import type { StaffProfile } from '@/lib/profile-contract';

export function useStaffProfile() {
  const { data: session, status } = useSession();
  const user = session?.user as { id?: string; tenantId?: string } | undefined;
  // Identity-scoped key prevents cached profile data crossing accounts or workspaces.
  const key = status === 'authenticated' ? ['staff-profile', user?.id, user?.tenantId] : null;
  const profile = useSWR<StaffProfile>(key, () => atsApi.profile.get(), { dedupingInterval: 15000, revalidateOnFocus: true });
  const mutate = profile.mutate;
  useEffect(() => {
    const changed = (event: Event) => {
      const data = (event as CustomEvent<StaffProfile>).detail;
      if (data?.id === user?.id && data?.tenantId === user?.tenantId) void mutate(data, false);
    };
    window.addEventListener('atsProfileChanged', changed);
    return () => window.removeEventListener('atsProfileChanged', changed);
  }, [mutate, user?.id, user?.tenantId]);
  return { ...profile, loading: status === 'loading' || profile.isLoading };
}
