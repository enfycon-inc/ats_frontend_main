"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { DeliveryDashboardSkeleton } from "@/components/dashboard/delivery-dashboard-skeleton";
import { Button } from "@/components/ui/button";
import { useState } from 'react';
import { DeliveryToolbarContext } from '@/components/dashboard/delivery-toolbar';
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, status, reload } = useDashboardContext();
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  if (pathname === '/dashboard') return children;
  if (status === 'loading') return <DeliveryDashboardSkeleton />;
  if (status === 'error') return <div role="alert" className="space-y-3 text-xs">Could not load dashboard access.<Button size="sm" onClick={reload}>Retry</Button></div>;
  if (!profile?.permissions?.includes('unit_admin:manage')) return <p role="alert" className="text-sm">You do not have access to this unit dashboard.</p>;
  const tabs = [{ href: '/dashboard/overview', label: 'Overview' }, { href: '/dashboard/account-managers', label: 'Account Managers' }, { href: '/dashboard/recruiters', label: 'Recruiters' }];
  return <DeliveryToolbarContext.Provider value={toolbar}><div className="min-w-0 space-y-4"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700">
    <nav aria-label="Delivery dashboard views" className="flex shrink-0 gap-5">
      {tabs.filter(tab => tab.href === '/dashboard/overview' || profile.permissions.includes('user:manage')).map(tab => <Link key={tab.href} href={tab.href} aria-current={pathname === tab.href || pathname.startsWith(`${tab.href}/`) ? 'page' : undefined}
        className={`border-b-2 px-1 pb-3 text-sm font-semibold ${pathname === tab.href || pathname.startsWith(`${tab.href}/`) ? 'border-[#1a4fa0] text-[#1a4fa0] dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>{tab.label}</Link>)}
    </nav><div ref={setToolbar} className="ml-auto min-w-0 max-w-full shrink-0 pb-2" /></div>{children}</div></DeliveryToolbarContext.Provider>;
}
