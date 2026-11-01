"use client";

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Activity, ChevronDown, Clock3, Loader2, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useManagementProfile } from '@/components/users/use-management-profile';
import { useSocket } from '@/contexts/SocketContext';
import { userManagementApi } from '@/lib/user-management-api';
import type { Presence, PresenceSummary } from '@/lib/user-management.contract';

type Group = 'loggedInToday' | 'active' | 'away' | 'offline' | 'unknown';
const groupLabels: Record<Group, string> = { loggedInToday: 'Logged in today', active: 'Online', away: 'Away', offline: 'Offline', unknown: 'Unavailable' };
const presenceStyles: Record<Presence, string> = {
  active: 'bg-emerald-100 text-emerald-800', away: 'bg-amber-100 text-amber-800',
  offline: 'bg-slate-100 text-slate-700', unknown: 'bg-neutral-100 text-neutral-600',
};
function since(value?: string | null) {
  if (!value) return 'No recent activity';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'Active just now';
  if (minutes < 60) return `Last active · ${minutes}m ago`;
  if (minutes < 1440) return `Last active · ${Math.floor(minutes / 60)}h ago`;
  return `Last active · ${Math.floor(minutes / 1440)}d ago`;
}

export function TeamPresenceNavbar() {
  const profile = useManagementProfile();
  const { socket, isConnected } = useSocket();
  const canView = profile.permissions.some(permission => ['*', 'platform:manage', 'user:presence:view'].includes(permission));
  const [open, setOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [group, setGroup] = useState<Group>('active');
  const [listPage, setListPage] = useState(1);
  const { data, error, isLoading, mutate: refreshSummary } = useSWR<PresenceSummary>(canView && profile.scope ? ['team-presence-summary', profile.scope] : null,
    () => userManagementApi.presenceSummary(), { refreshInterval: 0, revalidateOnFocus: true, revalidateOnReconnect: true });
  const query = new URLSearchParams({ state: 'activity', page: String(listPage), pageSize: '25', presence: group === 'loggedInToday' ? '' : group, loginToday: group === 'loggedInToday' ? '1' : '' });
  const { data: list, error: listError, isLoading: listLoading, mutate: refreshList } = useSWR(open ? ['team-presence-list', profile.scope, group, listPage] : null,
    () => userManagementApi.list(query.toString()), { refreshInterval: 0, revalidateOnFocus: true, revalidateOnReconnect: true });
  useEffect(() => {
    if (!socket || !isConnected || !canView) return;
    const refresh = () => { void refreshSummary(); if (open) void refreshList(); };
    socket.on('presence_changed', refresh);
    return () => { socket.off('presence_changed', refresh); };
  }, [socket, isConnected, canView, open, refreshSummary, refreshList]);
  if (!canView) return null;
  const counts = data?.counts;
  const cards: Array<{ key: Group; count: number; color: string }> = [
    { key: 'loggedInToday', count: counts?.loggedInToday || 0, color: 'bg-sky-300' },
    { key: 'active', count: counts?.active || 0, color: 'bg-emerald-300' },
    { key: 'away', count: counts?.away || 0, color: 'bg-amber-300' },
    { key: 'offline', count: counts?.offline || 0, color: 'bg-slate-300' },
  ];
  const openGroup = (value: Group) => { setGroup(value); setListPage(1); setOpen(true); setSummaryOpen(false); };
  return <>
    <div className="relative">
      <div className="flex h-9 items-center rounded-lg border border-white/15 bg-white/10 text-white/90">
        <span className="flex h-full items-center px-2 text-indigo-100" title="Team presence"><Users className="h-4 w-4" /></span>
        <div className="hidden h-full items-center 2xl:flex">
          {cards.map(card => <button key={card.key} type="button" onClick={() => openGroup(card.key)} aria-label={`${groupLabels[card.key]}: ${card.count}`} title={groupLabels[card.key]} className="flex h-full items-center gap-1.5 border-l border-white/10 px-2 text-[10px] hover:bg-white/10 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            <span className={`h-1.5 w-1.5 rounded-full ${card.color}`} />
            <span className="text-white/75">{card.key === 'loggedInToday' ? 'Today' : card.key === 'active' ? 'Online' : card.key === 'away' ? 'Away' : 'Offline'}</span>
            <span className="min-w-3 font-bold text-white">{isLoading ? '–' : card.count}</span>
          </button>)}
        </div>
        <button type="button" onClick={() => setSummaryOpen(value => !value)} aria-expanded={summaryOpen} aria-label="Open team presence details" className="flex h-full items-center gap-1 border-l border-white/10 px-2 text-[10px] font-semibold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white 2xl:border-l-0">
          <span className="2xl:hidden">Team <span className="text-emerald-200">{isLoading ? '–' : counts?.active ?? 0}</span></span>
          <ChevronDown className="h-3.5 w-3.5 opacity-75" />
        </button>
      </div>
      {summaryOpen && <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-neutral-200 bg-white p-3 text-neutral-900 shadow-xl">
        <div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold">Team presence</p><span className="text-[10px] text-neutral-500">Live updates</span></div>
        {error && <p role="status" className="mb-2 rounded bg-amber-50 p-2 text-[10px] text-amber-800">Presence summary unavailable. Retry on focus.</p>}
        {data && !data.telemetryAvailable && <p role="status" className="mb-2 rounded bg-amber-50 p-2 text-[10px] text-amber-800">Live presence is unavailable; login totals remain available.</p>}
        <div className="grid grid-cols-2 gap-2">
          {cards.map(card => <button key={card.key} type="button" onClick={() => openGroup(card.key)} className="rounded-lg border border-neutral-200 px-2.5 py-2 text-left hover:border-blue-300 hover:bg-blue-50">
            <span className="block text-[10px] text-neutral-500">{groupLabels[card.key]}</span><span className={`text-base font-bold ${card.key === 'active' ? 'text-emerald-700' : card.key === 'away' ? 'text-amber-700' : card.key === 'offline' ? 'text-slate-700' : 'text-blue-700'}`}>{card.count}</span>
          </button>)}
        </div>
        {counts?.unknown ? <button onClick={() => openGroup('unknown')} className="mt-2 w-full rounded px-2 py-1 text-left text-[10px] text-neutral-500 hover:bg-neutral-50">{counts.unknown} status unavailable</button> : null}
        {data?.recent?.length ? <div className="mt-3 border-t pt-2"><p className="mb-1 text-[10px] font-semibold text-neutral-500">Recently active team</p>{data.recent.slice(0, 3).map(person => <div key={person.id} className="flex items-center justify-between py-1"><span className="truncate text-[11px] font-medium">{person.fullName}</span><span className={`rounded-full px-1.5 py-0.5 text-[9px] ${presenceStyles[person.presence]}`}>{groupLabels[person.presence]}</span></div>)}</div> : null}
      </div>}
    </div>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full overflow-y-auto bg-white p-0 text-neutral-900 sm:max-w-md">
        <header className="border-b px-5 py-4 pr-12"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-blue-700" /><SheetTitle className="text-sm font-bold">{groupLabels[group]}</SheetTitle></div><SheetDescription className="mt-1 text-xs">Users in your authorized branch and unit scope.</SheetDescription></header>
        <div className="flex items-center justify-between border-b bg-neutral-50 px-5 py-2 text-[10px] text-neutral-500"><span>{list?.total ?? 0} users</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />Updates live</span></div>
        {!data?.telemetryAvailable && group !== 'loggedInToday' && <p className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Presence tracking is unavailable, so current online status cannot be listed.</p>}
        {listLoading && <div className="flex items-center gap-2 p-5 text-xs text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" />Loading users…</div>}
        {listError && <p role="alert" className="m-4 rounded border border-red-200 p-3 text-xs text-red-700">Unable to load this status list.</p>}
        {!listLoading && !listError && list?.items.map(user => <article key={user.id} className="flex items-center justify-between gap-3 border-b px-5 py-3">
          <div className="min-w-0"><p className="truncate text-xs font-semibold">{user.fullName}</p><p className="truncate text-[10px] text-neutral-500">{user.email}</p><p className="mt-1 text-[10px] text-neutral-500">{since(user.lastSeenAt)}</p></div>
          <div className="shrink-0 text-right"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${presenceStyles[user.presence || 'unknown']}`}>{groupLabels[user.presence || 'unknown']}</span><p className="mt-1 text-[9px] text-neutral-500">{user.assignedRoles?.join(', ')}</p></div>
        </article>)}
        {!listLoading && !listError && !list?.items.length && <p className="p-8 text-center text-xs text-neutral-500">No users in this group.</p>}
        {!!list?.total && <footer className="flex items-center justify-between border-t px-5 py-3 text-xs"><span className="text-neutral-500">Page {listPage} of {Math.max(1, Math.ceil(list.total / 25))}</span><div className="flex gap-2"><button className="rounded border px-2 py-1 disabled:opacity-40" disabled={listPage <= 1} onClick={() => setListPage(page => page - 1)}>Previous</button><button className="rounded border px-2 py-1 disabled:opacity-40" disabled={listPage * 25 >= list.total} onClick={() => setListPage(page => page + 1)}>Next</button></div></footer>}
      </SheetContent>
    </Sheet>
  </>;
}
