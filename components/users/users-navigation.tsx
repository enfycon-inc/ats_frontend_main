"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserPlus, Users, Clock, ShieldOff, Activity } from 'lucide-react';
import type { DirectoryPage } from '@/lib/user-management.contract';
import { USER_PAGE_LINKS, canOpenUserPage } from '@/lib/user-management-navigation';
export { canOpenUserPage } from '@/lib/user-management-navigation';

const icons = { create: UserPlus, active: Users, pending: Clock, blocked: ShieldOff, activity: Activity };
export const USER_PAGES = USER_PAGE_LINKS.map(page => ({ ...page, icon: icons[page.key] }));
export function UsersNavigation({ permissions, counts }: { permissions: string[]; counts?: DirectoryPage['counts'] }) {
  const pathname = usePathname();
  return <nav aria-label="User management pages" className="flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-slate-700">
    {USER_PAGES.filter(page => canOpenUserPage(page.key, permissions)).map(page => {
      const selected = pathname === `/utility/users/${page.key}`;
      const count = counts?.[page.key as keyof typeof counts];
      return <Link key={page.key} href={`/utility/users/${page.key}`} aria-current={selected ? 'page' : undefined}
        className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold ${selected ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>
        <page.icon className="h-3.5 w-3.5" />{page.label}
        {count !== undefined && <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-800">{count}</span>}
      </Link>;
    })}
  </nav>;
}
