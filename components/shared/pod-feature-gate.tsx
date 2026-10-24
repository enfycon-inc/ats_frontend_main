"use client";
import type { ReactNode } from 'react';
import { useStaffProfile } from '@/hooks/use-staff-profile';
export function PodFeatureGate({ children }: { children: ReactNode }) {
  const { data, loading, error } = useStaffProfile();
  if (loading || !data && !error) return <p role="status" className="p-4 text-xs">Loading workspace settings…</p>;
  if (error) return <p role="alert" className="p-4 text-xs">Could not verify workspace settings. Refresh to try again.</p>;
  if (data?.features?.podsEnabled !== true) return <p role="alert" className="p-4 text-xs">Recruitment pods are disabled for your workspace or operating unit.</p>;
  return children;
}
