"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, status, reload } = useDashboardContext();
  if (pathname === '/dashboard') return children;
  if (status === 'loading') return <Skeleton className="h-64 w-full" aria-label="Loading dashboard access" />;
  if (status === 'error') return <div role="alert" className="space-y-3 text-xs">Could not load dashboard access.<Button size="sm" onClick={reload}>Retry</Button></div>;
  if (!profile?.permissions?.includes('unit_admin:manage')) return <p role="alert" className="text-sm">You do not have access to this unit dashboard.</p>;
  const tabs = [{ href: '/dashboard/overview', label: 'Overview' }, { href: '/dashboard/account-managers', label: 'Account Managers' }, { href: '/dashboard/recruiters', label: 'Recruiters' }];
  return <div className="min-w-0 space-y-4"><div>
    <nav aria-label="Delivery dashboard views" className="flex gap-5 border-b border-slate-200 dark:border-slate-700">
      {tabs.filter(tab => tab.href === '/dashboard/overview' || profile.permissions.includes('user:manage')).map(tab => <Link key={tab.href} href={tab.href} aria-current={pathname === tab.href || pathname.startsWith(`${tab.href}/`) ? 'page' : undefined}
        className={`border-b-2 px-1 pb-3 text-sm font-semibold ${pathname === tab.href || pathname.startsWith(`${tab.href}/`) ? 'border-[#1a4fa0] text-[#1a4fa0] dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>{tab.label}</Link>)}
    </nav></div>{children}</div>;
}
