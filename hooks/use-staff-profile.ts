"use client";

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { atsApi } from '@/lib/ats-api';
import type { StaffProfile } from '@/lib/profile-contract';

const confirmedProfiles = new Set<string>();

export function useStaffProfile() {
  const { data: session, status } = useSession();
  const user = session?.user as { id?: string; tenantId?: string } | undefined;
  // Identity-scoped key prevents cached profile data crossing accounts or workspaces.
  const identity = status === 'authenticated' && user?.id && user?.tenantId
    ? `${user.id}:${user.tenantId}`
    : null;
  const key = identity ? ['staff-profile', user?.id, user?.tenantId] : null;
  const fetchProfile = useCallback(async () => {
    const data = await atsApi.profile.get();
    if (identity && data?.id === user?.id && data?.tenantId === user?.tenantId) {
      confirmedProfiles.add(identity);
    }
    return data;
  }, [identity, user?.id, user?.tenantId]);
  // Profile/role data changes through explicit profile events and navigation.
  // Avoid periodic requests that briefly replaced the visible role with a
  // loading state and could trigger unnecessary session renewal.
  const profile = useSWR<StaffProfile>(key, fetchProfile, { dedupingInterval: 15000, revalidateOnFocus: false, revalidateOnReconnect: true, refreshInterval: 0 });
  const mutate = profile.mutate;
  useEffect(() => {
    const changed = (event: Event) => {
      const data = (event as CustomEvent<StaffProfile>).detail;
      if (data?.id === user?.id && data?.tenantId === user?.tenantId) void mutate(data, false);
    };
    const settingsChanged = () => { void mutate(); };
    window.addEventListener('atsProfileChanged', changed);
    window.addEventListener('atsWorkspaceSettingsChanged', settingsChanged);
    return () => { window.removeEventListener('atsProfileChanged', changed); window.removeEventListener('atsWorkspaceSettingsChanged', settingsChanged); };
  }, [mutate, user?.id, user?.tenantId]);
  const confirmed = Boolean(
    identity && confirmedProfiles.has(identity) &&
    profile.data?.id === user?.id && profile.data?.tenantId === user?.tenantId
  );
  return { ...profile, loading: status === 'loading' || profile.isLoading, confirmed };
}
