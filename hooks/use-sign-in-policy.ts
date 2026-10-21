"use client";
import useSWR from 'swr';
import { atsApi } from '@/lib/ats-api';
import { getTenantIdentifier } from '@/utils/subdomain-helper';

export function useSignInPolicy(workspace?: string) {
  const identifier = workspace || getTenantIdentifier();
  return useSWR(['tenant-sign-in-policy', identifier], () => atsApi.auth.getTenantAuthPolicy(identifier), {
    revalidateOnFocus: true, dedupingInterval: 5000, shouldRetryOnError: false,
  });
}
