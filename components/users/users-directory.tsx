"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Activity, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, ShieldAlert, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { atsApi } from '@/lib/ats-api';
import { userManagementApi } from '@/lib/user-management-api';
import type { ManagementRow, UserView } from '@/lib/user-management.contract';
import { UsersNavigation, USER_PAGES, canOpenUserPage } from './users-navigation';
import { useManagementProfile } from './use-management-profile';

const date = (value?: string | null) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';
export function UsersDirectory({ view }: { view: UserView }) {
  const profile = useManagementProfile();
  const permissions = profile.permissions;
  const has = (...keys: string[]) => permissions.some(p => ['*', 'platform:manage', ...keys].includes(p));
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(params.get('search') || '');
  const [selected, setSelected] = useState<ManagementRow | null>(null);
  const [decision, setDecision] = useState<ManagementRow | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const allowed = canOpenUserPage(view, permissions);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const query = new URLSearchParams({ state: view, page: String(page), pageSize: '25', search: params.get('search') || '' });
  const { data, error, isLoading, isValidating, mutate } = useSWR(allowed && profile.scope ? ['users-directory', profile.scope, query.toString()] : null,
    () => userManagementApi.list(query.toString()), { refreshInterval: view === 'activity' ? 30_000 : 60_000, revalidateOnFocus: true });
  useEffect(() => { setSelected(null); }, [profile.scope, view]);
  useEffect(() => { setSearch(params.get('search') || ''); }, [params]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search === (params.get('search') || '')) return;
      const next = new URLSearchParams(params.toString());
      next.delete('page'); search ? next.set('search', search) : next.delete('search');
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, params, pathname, router]);
  const changePage = (value: number) => { const next = new URLSearchParams(params.toString()); next.set('page', String(value)); router.push(`${pathname}?${next}`, { scroll: false }); };
  const changeAccess = async () => {
    if (!decision || reason.trim().length < 3) return;
    setSaving(true);
    try { await atsApi.auth.setUserStatus(decision.id, !decision.isActive, reason.trim()); setDecision(null); setReason(''); await mutate(); toast.success('Account access updated.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to update access.'); }
    finally { setSaving(false); }
  };
  if (profile.error) return <div role="alert" className="p-6 text-sm text-red-600">Unable to verify your access. Refresh to try again.</div>;
  const title = USER_PAGES.find(item => item.key === view)?.label || 'Users';
  return <div className="space-y-4 p-4 md:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-xl font-bold tracking-tight">{title}</h1><p className="mt-1 text-xs text-neutral-500">{view === 'active' ? 'Approved, enabled accounts. Live presence is shown separately.' : view === 'pending' ? 'Invitations and outstanding access requests within your scope.' : view === 'blocked' ? 'Disabled accounts retain their business records and history.' : 'Team availability and permission-controlled security history.'}</p></div>
      <Button variant="outline" size="sm" onClick={() => void mutate()} disabled={isValidating} className="h-9 text-xs"><RefreshCw className={`mr-2 h-3.5 w-3.5 ${isValidating ? 'animate-spin' : ''}`} />Refresh</Button>
    </header>
    <UsersNavigation permissions={permissions} counts={data?.counts} />
    {!profile.data ? <p className="flex items-center gap-2 text-xs"><Loader2 className="h-4 w-4 animate-spin" />Checking access…</p> : !allowed ? <p role="alert" className="text-sm text-neutral-600">You do not have permission to open this page.</p> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-3 h-3.5 w-3.5 text-neutral-400" /><Input aria-label="Search users by name or email" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…" className="h-9 pl-9 text-xs" /></div>
      <span className="text-[11px] text-neutral-500">{data ? `Updated ${date(data.asOf)}` : ''}</span></div>
      {view === 'activity' && data && !data.telemetryEnabled && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Live activity is currently unavailable. Your account directory remains available. Contact your workspace administrator.</p>}
      {error && <div role="alert" className="rounded-lg border border-red-200 p-3 text-xs text-red-700">{error instanceof Error ? error.message : 'Unable to load users.'} <button className="underline" onClick={() => void mutate()}>Try again</button></div>}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-slate-700 dark:bg-slate-900"><table className="w-full text-left text-xs">
        <thead className="border-b bg-neutral-50 text-[10.5px] uppercase tracking-wide text-neutral-500 dark:bg-slate-800"><tr>
          {['Name & email', 'Branch / unit', 'Role', view === 'pending' ? 'Request status' : 'Account', ...(has('user:presence:view') ? ['Presence', 'Last seen'] : []), ...(view === 'activity' && has('user:sessions:view') ? ['Sessions'] : []), ...(view === 'activity' && has('user:login_logs:view') ? ['Last login'] : []), 'Actions'].map(label => <th key={label} className="whitespace-nowrap px-4 py-3 font-bold">{label}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
          {isLoading && <tr><td colSpan={10} className="p-8 text-center text-neutral-500">Loading users…</td></tr>}
          {!isLoading && !error && !data?.items.length && <tr><td colSpan={10} className="p-10 text-center text-neutral-500">{search ? 'No users match your search.' : 'No users in this view.'}</td></tr>}
          {data?.items.map(user => <tr key={`${user.kind}:${user.id}`} className="hover:bg-neutral-50 dark:hover:bg-slate-800/40">
            <td className="px-4 py-3"><span className="block font-semibold">{user.fullName}</span><span className="text-[11px] text-neutral-500">{user.email}</span></td>
            <td className="px-4 py-3"><span className="block">{user.branchName || 'Unassigned'}</span><span className="text-[11px] text-neutral-500">{user.businessUnitName || '—'}</span></td>
            <td className="px-4 py-3">{user.roleName || 'Unassigned'}</td>
            <td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[10.5px] font-semibold ${view === 'pending' ? 'bg-amber-50 text-amber-800' : user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{view === 'pending' ? user.invitationStatus === 'expired' ? 'Invitation expired' : user.invitationStatus ? 'Invited' : 'Awaiting approval' : user.isActive ? 'Enabled' : 'Blocked'}</span>{view === 'blocked' && <span className="mt-1 block max-w-48 whitespace-normal text-[11px] text-neutral-500">{user.blockReason || 'Reason not recorded'}</span>}</td>
            {has('user:presence:view') && <><td className="px-4 py-3"><PresenceBadge value={user.presence || 'unknown'} />{user.officeNetwork && <span className="mt-2 block max-w-52 text-[10.5px] text-neutral-500">{user.officeNetwork}<span className="block">Last detected {date(user.officeObservedAt)}</span></span>}</td><td className="whitespace-nowrap px-4 py-3 text-neutral-500">{date(user.lastSeenAt)}</td></>}
            {view === 'activity' && has('user:sessions:view') && <td className="px-4 py-3">{user.sessions ?? 'Unavailable'}</td>}
            {view === 'activity' && has('user:login_logs:view') && <td className="whitespace-nowrap px-4 py-3">{date(user.lastLoginAt)}</td>}
            <td className="px-4 py-3"><div className="flex items-center gap-3 whitespace-nowrap">
              {user.kind === 'user' && view === 'activity' && has('user:sessions:view', 'user:login_logs:view') && <button onClick={() => setSelected(user)} className="font-semibold text-indigo-700 dark:text-indigo-300">Details</button>}
              {view !== 'activity' && (view === 'pending' ? user.allowedActions?.review : user.allowedActions?.edit) && <Link className="text-indigo-700 dark:text-indigo-300" href={view === 'pending' ? `/utility/users?requestId=${user.id}` : `/utility/users?editUser=${user.id}`}>{view === 'pending' ? 'Review request' : 'Edit'}</Link>}
              {user.allowedActions?.resendInvitation && view === 'pending' && <button className="text-indigo-700" disabled={saving} onClick={async () => { setSaving(true); try { const result = await atsApi.auth.resendInvitation(user.id); toast.success(result.message); await mutate(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Invitation could not be sent.'); } finally { setSaving(false); } }}>Resend invite</button>}
              {user.allowedActions?.changeAccess && view !== 'pending' && <button className={user.isActive ? 'text-red-600' : 'text-indigo-700'} onClick={() => { setDecision(user); setReason(''); }}>{user.isActive ? 'Block' : 'Unblock'}</button>}
            </div></td>
          </tr>)}
        </tbody>
      </table></div>
      <footer className="flex items-center justify-between text-xs text-neutral-500"><span>{data?.total ? `${(page - 1) * 25 + 1}–${Math.min(page * 25, data.total)} of ${data.total}` : '0 users'}</span><div className="flex items-center gap-2"><Button aria-label="Previous page" variant="outline" size="sm" disabled={page <= 1} onClick={() => changePage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button><span>Page {page}</span><Button aria-label="Next page" variant="outline" size="sm" disabled={!data || page * 25 >= data.total} onClick={() => changePage(page + 1)}><ChevronRight className="h-4 w-4" /></Button></div></footer>
    </>}
    {selected && <UserActivityDrawer user={selected} scope={profile.scope} has={has} onClose={() => setSelected(null)} onChanged={() => void mutate()} />}
    {decision && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="access-title" className="w-full max-w-md space-y-4 rounded-xl border bg-white p-5 dark:bg-slate-900"><h2 id="access-title" className="text-sm font-bold">{decision.isActive ? 'Block' : 'Unblock'} {decision.fullName}?</h2><p className="text-xs text-neutral-500">{decision.isActive ? 'This ends access to this workspace. Business records are preserved.' : 'The user will need to sign in again. Previously ended sessions remain revoked.'}</p><label className="block text-xs font-semibold">Reason<Input value={reason} maxLength={500} onChange={e => setReason(e.target.value)} className="mt-2 text-xs" /></label><div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={() => setDecision(null)}>Cancel</Button><Button disabled={saving || reason.trim().length < 3} onClick={() => void changeAccess()}>{saving ? 'Saving…' : 'Confirm'}</Button></div></section></div>}
  </div>;
}
export function PresenceBadge({ value }: { value: string }) {
  const color = value === 'active' ? 'bg-emerald-50 text-emerald-700' : value === 'away' ? 'bg-amber-50 text-amber-800' : 'bg-neutral-100 text-neutral-600';
  return <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10.5px] font-semibold capitalize ${color}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{value}</span>;
}
function UserActivityDrawer({ user, scope, has, onClose, onChanged }: { user: ManagementRow; scope: string; has: (...keys: string[]) => boolean; onClose: () => void; onChanged: () => void }) {
  const [tab, setTab] = useState(has('user:sessions:view') ? 'sessions' : 'history');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const sessions = useSWR(tab === 'sessions' && has('user:sessions:view') ? ['user-sessions', scope, user.id, page] : null, () => userManagementApi.sessions(user.id, page));
  const events = useSWR(tab === 'history' && has('user:login_logs:view') ? ['user-events', scope, user.id, page] : null, () => userManagementApi.events(user.id, page));
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const revoke = async (id: string) => { setBusy(id); try { const result = await userManagementApi.revoke(id); toast.success(result.message); setConfirmId(null); await sessions.mutate(); onChanged(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to end session.'); } finally { setBusy(null); } };
  const current = tab === 'sessions' ? sessions : events;
  const exportHistory = async () => {
    setBusy('export');
    try {
      const rows = await userManagementApi.exportEvents(user.id);
      const cell = (value: unknown) => { let text = String(value ?? ''); if (/^[=+@\-\t\r]/.test(text)) text = "'" + text; return '"' + text.replaceAll('"', '""') + '"'; };
      const includeIp = rows.some(row => 'ipAddress' in row);
      const csv = [['Time (UTC)', 'Event', 'Outcome', 'Actor', ...(includeIp ? ['IP address'] : [])], ...rows.map(row => [row.createdAt, row.action, row.outcome, row.actorName, ...(includeIp ? [row.ipAddress] : [])])].map(row => row.map(cell).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = `login-history-${user.id}.csv`; link.click(); URL.revokeObjectURL(url);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to export history.'); }
    finally { setBusy(null); }
  };
  return <Sheet open onOpenChange={open => { if (!open) onClose(); }}><SheetContent side="right" className="w-full space-y-4 overflow-y-auto bg-white p-5 sm:max-w-xl dark:bg-slate-900">
    <header><SheetTitle className="text-lg font-bold">{user.fullName}</SheetTitle><SheetDescription className="text-xs">{user.email}</SheetDescription></header>
    <div className="flex gap-4 border-b text-xs font-semibold">{[['sessions', 'Sessions', has('user:sessions:view')], ['history', 'Login history', has('user:login_logs:view')]].filter(item => item[2]).map(([key, label]) => <button key={String(key)} onClick={() => { setTab(String(key)); setPage(1); }} className={`border-b-2 py-3 ${tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-neutral-500'}`}>{label}</button>)}</div>
    {tab === 'history' && has('user:login_logs:export') && <Button variant="outline" size="sm" disabled={!!busy} onClick={() => void exportHistory()} className="text-xs">Export last 7 days</Button>}
    {current.error && <p role="alert" className="text-xs text-red-600">Unable to load details. <button onClick={() => void current.mutate()} className="underline">Try again</button></p>}
    {current.isLoading && <p className="text-xs">Loading…</p>}
    {!current.isLoading && !current.error && !current.data?.length && <p className="text-xs text-neutral-500">No recorded {tab === 'sessions' ? 'sessions' : 'events'}.</p>}
    {tab === 'sessions' ? sessions.data?.map(session => <article key={session.id} className="space-y-2 rounded-lg border border-neutral-200 p-4 text-xs dark:border-slate-700"><div className="flex justify-between font-semibold"><span>{session.device}{session.current ? ' · Current session' : ''}</span><span>{session.revokedAt ? 'Ended' : new Date(session.expiresAt) < new Date() ? 'Expired' : 'Signed in'}</span></div><dl className="grid grid-cols-2 gap-2 text-neutral-500"><dt>Login method</dt><dd>{session.loginMethod}</dd><dt>Started</dt><dd>{date(session.startedAt)}</dd><dt>Last seen</dt><dd>{date(session.lastSeenAt)}</dd>{'ipAddress' in session && <><dt>Latest observed IP</dt><dd className="break-all font-mono">{session.ipAddress || 'Not recorded'}</dd></>}</dl>
      {!session.revokedAt && new Date(session.expiresAt) > new Date() && has('user:sessions:revoke') && (confirmId === session.id ? <div className="space-y-2 rounded border border-red-200 p-2"><p>End this workspace session?</p><Button size="sm" disabled={!!busy} onClick={() => void revoke(session.id)}>Confirm end session</Button><button className="ml-3" onClick={() => setConfirmId(null)}>Cancel</button></div> : <button className="font-semibold text-red-600" onClick={() => setConfirmId(session.id)}>End session</button>)}</article>) : events.data?.map(event => <article key={event.id} className="space-y-1 border-b py-3 text-xs"><p className="font-semibold">{event.action.replaceAll('.', ' ')} · {event.outcome}</p><p className="text-neutral-500">{date(event.createdAt)}{event.actorName ? ` · ${event.actorName}` : ''}</p>{'ipAddress' in event && <p className="font-mono text-neutral-500">{event.ipAddress || 'IP not recorded'}</p>}</article>)}
    <div className="flex justify-between text-xs"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page}</span><Button variant="outline" size="sm" disabled={(current.data?.length || 0) < 50} onClick={() => setPage(page + 1)}>Next</Button></div>
    <p className="text-[11px] text-neutral-500">Presence measures application activity. It does not establish attendance or physical location.</p>
  </SheetContent></Sheet>;
}
