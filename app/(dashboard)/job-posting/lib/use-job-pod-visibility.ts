"use client";

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { atsApi } from '@/lib/ats-api';
import { visiblePodUnits } from '@/lib/job-pod-visibility';
import { getActiveRolePermissions } from '@/lib/role-permissions';

const EMPTY_UNITS: string[] = [];

export function useJobPodVisibility(profile: any, activeRoleId?: string) {
  const [branchId, setBranchId] = useState<string | null>(() => typeof window === 'undefined' ? null : localStorage.getItem('active_branch_id'));
  const { data, error, isLoading, isValidating, mutate } = useSWR(profile?.tenantId ? ['job-pod-policy', profile.tenantId, branchId, activeRoleId] : null, async () => {
    const results = await Promise.allSettled([atsApi.auth.getProfile(), atsApi.branches.list(), atsApi.businessUnits.list()]);
    for (const result of results) if (result.status === 'rejected') throw result.reason;
    const fresh = results[0].status === 'fulfilled' ? results[0].value : null;
    const branches = results[1].status === 'fulfilled' ? results[1].value : [];
    const units = results[2].status === 'fulfilled' ? results[2].value : [];
    if (!fresh || fresh.tenantId !== profile.tenantId) throw new Error('Workspace settings unavailable.');
    const permissions = getActiveRolePermissions(activeRoleId, fresh.assignedRoles || [], fresh);
    const broaderScope = permissions.some(key => ['*', 'platform:manage', 'tenant:settings', 'tenant:manage', 'branch_admin:manage'].includes(key));
    const selectedBranch = branchId === 'ALL' ? null : branchId || fresh.branchId;
    const unitId = broaderScope ? null : fresh.businessUnitId;
    return visiblePodUnits(fresh.podSystemEnabled === true, branches, units, selectedBranch, unitId);
  }, { revalidateOnFocus: true, keepPreviousData: false });

  useEffect(() => {
    const refresh = () => {
      const nextBranch = localStorage.getItem('active_branch_id');
      if (nextBranch !== branchId) setBranchId(nextBranch);
      else void mutate();
    };
    const events = ['branchChanged', 'businessUnitChanged', 'workspaceSettingsChanged', 'atsWorkspaceSettingsChanged'];
    events.forEach(event => window.addEventListener(event, refresh));
    return () => events.forEach(event => window.removeEventListener(event, refresh));
  }, [branchId, mutate]);

  const allowedUnitIds = !isLoading && !isValidating && !error && data ? data : EMPTY_UNITS;
  return { enabled: allowedUnitIds.length > 0, allowedUnitIds };
}
