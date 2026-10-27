"use client";
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { atsApi, activeRoleHeaders } from '@/lib/ats-api';

export function useManagementProfile() {
  const [scope, setScope] = useState('');
  useEffect(() => {
    const refresh = () => { const user = atsApi.auth.getCurrentUser(); setScope(`${user?.tenantId || ''}:${JSON.stringify(activeRoleHeaders())}`); };
    refresh();
    ['atsProfileChanged', 'overrideRoleChanged', 'storage'].forEach(event => window.addEventListener(event, refresh));
    return () => { ['atsProfileChanged', 'overrideRoleChanged', 'storage'].forEach(event => window.removeEventListener(event, refresh)); };
  }, []);
  const result = useSWR(scope ? ['user-management-profile', scope] : null, () => atsApi.auth.me(), { refreshInterval: 60_000, revalidateOnFocus: true });
  return { ...result, scope, permissions: (result.data?.permissions || []) as string[], systemRole: result.data?.systemRole || result.data?.roleName || null };
}
