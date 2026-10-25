"use client";
import { usePathname } from 'next/navigation';
import { PageLoadingSkeleton, type LoadingShape } from '@/components/page-loading-skeleton';
export default function DashboardLoading() {
  const path = usePathname() || '';
  const variant: LoadingShape = /\/(new|edit)$/.test(path) || path.includes('/settings') || path === '/company' ? 'form' : path === '/dashboard' ? 'dashboard' : /\/[a-f0-9-]{36}(?:\/|$)/i.test(path) || path === '/view-profile' ? 'detail' : 'table';
  return <PageLoadingSkeleton variant={variant} />;
}
