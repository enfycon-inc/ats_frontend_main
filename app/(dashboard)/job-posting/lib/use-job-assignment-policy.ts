"use client";
import { useEffect } from 'react';
import useSWR from 'swr';
import { atsApi } from '@/lib/ats-api';
import { effectiveJobAssignmentPolicy } from '@/lib/job-assignment-policy';

export function useJobAssignmentPolicy(profile: any, unitId?: string | null) {
  const { data, error, isLoading, mutate } = useSWR(profile?.tenantId && unitId ? ['job-assignment-policy', profile.tenantId, unitId] : null, async () => {
    const [fresh, unit] = await Promise.all([atsApi.auth.me(), atsApi.businessUnits.get(unitId!)]);
    if (fresh.tenantId !== profile.tenantId) throw new Error('Workspace changed. Refresh the job form.');
    return effectiveJobAssignmentPolicy(unit, fresh.podSystemEnabled === true);
  }, { revalidateOnFocus: true, revalidateOnReconnect: true, refreshInterval: 30000, keepPreviousData: false });
  useEffect(() => {
    const refresh = () => { void mutate(); };
    const events = ['atsWorkspaceSettingsChanged', 'workspaceSettingsChanged', 'businessUnitChanged'];
    events.forEach(event => window.addEventListener(event, refresh));
    return () => events.forEach(event => window.removeEventListener(event, refresh));
  }, [mutate]);
  return { policy: !error && !isLoading ? data : null, podsEnabled: !error && !isLoading && data?.allowPods === true };
}
