"use client";
import { PendingUserReview } from './pending-user-review';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Activity, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, ShieldAlert, X, MoreVertical, Edit2, Key, LogOut, Trash2, UserCheck, UserX, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { atsApi } from '@/lib/ats-api';
import { userManagementApi } from '@/lib/user-management-api';
import type { ManagementRow, UserView } from '@/lib/user-management.contract';
import { UsersNavigation, USER_PAGES, canOpenUserPage } from './users-navigation';
import { useManagementProfile } from './use-management-profile';
import { UserPageSkeleton } from './user-page-skeleton';
import { enterpriseGrid } from '@/components/shared/enterprise-grid';
import { isAutomaticPodLeadRole } from '@/lib/pod-lead-role-policy';

const date = (value?: string | null) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';
export function UsersDirectory({ view }: { view: UserView }) {
  const profile = useManagementProfile();
  const permissions = profile.permissions;
  const has = (...keys: string[]) => permissions.some(p => ['*', 'platform:manage', ...keys].includes(p));
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(params.get('search') || '');
  const [checked, setChecked] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const selectAll = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<ManagementRow | null>(null);
  const [editing, setEditing] = useState<ManagementRow | null>(null);
  const [editorMode, setEditorMode] = useState<'profile' | 'roles' | 'manager'>('profile');
  const [reviewing, setReviewing] = useState<ManagementRow | null>(null);
  const [decision, setDecision] = useState<ManagementRow | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const allowed = canOpenUserPage(view, permissions);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const query = new URLSearchParams({ state: view, page: String(page), pageSize: params.get('pageSize') || '25', search: params.get('search') || '', city: params.get('city') || '', role: params.get('role') || '', sort: params.get('sort') || 'name', direction: params.get('direction') || 'asc' });
  const { data, error, isLoading, isValidating, mutate } = useSWR(allowed && profile.scope ? ['users-directory', profile.scope, query.toString()] : null,
    () => userManagementApi.list(query.toString()), { refreshInterval: has('user:presence:view') ? 30_000 : 60_000, revalidateOnFocus: true });
  const queryKey = query.toString();
  useEffect(() => { setSelected(null); setReviewing(null); setChecked([]); }, [profile.scope, view, queryKey]);
  useEffect(() => { setChecked(current => current.filter(key => data?.items.some(user => `${user.kind}:${user.id}` === key))); }, [data]);
  const allChecked = !!data?.items.length && data.items.every(user => checked.includes(`${user.kind}:${user.id}`));
  useEffect(() => { if (selectAll.current) selectAll.current.indeterminate = checked.length > 0 && !allChecked; }, [checked, allChecked]);
  const setFilter = (key: string, value: string) => { const next = new URLSearchParams(params.toString()); next.delete('page'); value ? next.set(key, value) : next.delete(key); router.replace(`${pathname}?${next}`, { scroll: false }); };
  const sortColumn = (key: string) => { const next = new URLSearchParams(params.toString()); next.delete('page'); next.set('sort', key); next.set('direction', (params.get('sort') || 'name') === key && params.get('direction') !== 'desc' ? 'desc' : 'asc'); router.replace(`${pathname}?${next}`, { scroll: false }); };
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
  const columns = ['Select', 'Staff member', 'City', 'Assigned role(s)', 'Branch / Unit', 'Manager', 'Account status',
    ...(has('user:presence:view') ? ['Online status'] : []),
    ...(view === 'activity' && has('user:sessions:view') ? ['Sessions'] : []),
    ...(view === 'activity' && has('user:login_logs:view') ? ['Last login'] : []), 'Actions'];
  const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  const cityName: Record<string, string> = { BBSR: 'Bhubaneswar', PUNE: 'Pune', BENGALURU: 'Bengaluru', VIZAG: 'Vizag', HYDERABAD: 'Hyderabad' };
  return <div className="space-y-4 p-4 md:p-6">
    <UsersNavigation permissions={permissions} counts={data?.counts} />
    {!profile.data ? <UserPageSkeleton /> : !allowed ? <p role="alert" className="text-sm text-neutral-600">You do not have permission to open this page.</p> : <>
      <div className={enterpriseGrid.filters}>
        <label className="min-w-56 flex-1 space-y-1 text-xs font-semibold">Search<div className="relative"><Search className="absolute left-3 top-3 h-3.5 w-3.5 text-neutral-400" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or email" className="h-9 pl-9 text-xs" /></div></label>
        <label className="space-y-1 text-xs font-semibold">City<select className={`${enterpriseGrid.control} block min-w-36`} value={params.get('city') || ''} onChange={e => setFilter('city', e.target.value)}><option value="">All cities</option>{data?.filters?.cities.map(city => <option key={city} value={city}>{cityName[city] || city}</option>)}</select></label>
        <label className="space-y-1 text-xs font-semibold">Role<select className={`${enterpriseGrid.control} block min-w-40`} value={params.get('role') || ''} onChange={e => setFilter('role', e.target.value)}><option value="">All roles</option>{data?.filters?.roles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>
        <Button variant="outline" size="sm" onClick={() => { setSearch(''); router.replace(pathname, { scroll: false }); }}>Reset filters</Button>
        <Button variant="outline" size="sm" onClick={() => void mutate()} disabled={isValidating}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${isValidating ? 'animate-spin' : ''}`} />Refresh</Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm">Columns</Button></DropdownMenuTrigger><DropdownMenuContent>{columns.filter(label => !['Select', 'Staff member', 'Actions'].includes(label)).map(label => <DropdownMenuItem key={label} onSelect={event => { event.preventDefault(); setHiddenColumns(current => current.includes(label) ? current.filter(item => item !== label) : [...current, label]); }}><input type="checkbox" tabIndex={-1} checked={!hiddenColumns.includes(label)} readOnly className="mr-2" />{label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
        <span className="text-[11px] text-neutral-500">{data ? `Updated ${date(data.asOf)}` : ''}</span>
      </div>
      {checked.length > 0 && <div role="status" className="border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800">{checked.length} selected on this page</div>}
      {has('user:presence:view') && data && !data.telemetryEnabled && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Live activity is currently unavailable. Your account directory remains available. Contact your workspace administrator.</p>}
      {error && <div role="alert" className="rounded-lg border border-red-200 p-3 text-xs text-red-700">{error instanceof Error ? error.message : 'Unable to load users.'} <button className="underline" onClick={() => void mutate()}>Try again</button></div>}
      <div className={`${enterpriseGrid.surface} users-directory-grid overflow-x-auto`}>
        <style>{hiddenColumns.map(label => { const index = columns.indexOf(label) + 1; return index > 0 ? `.users-directory-grid th:nth-child(${index}),.users-directory-grid td:nth-child(${index}){display:none}` : ''; }).join('')}</style>
        <table className={`${enterpriseGrid.table} min-w-[1050px]`}>
        <thead className={enterpriseGrid.header}><tr>
          {columns.map(label => { const sortKey = ({ 'Staff member': 'name', City: 'city', 'Branch / Unit': 'branch' } as Record<string, string>)[label]; return <th key={label} className={`${enterpriseGrid.heading} whitespace-nowrap`} aria-sort={sortKey && (params.get('sort') || 'name') === sortKey ? params.get('direction') === 'desc' ? 'descending' : 'ascending' : undefined}>{label === 'Select' ? <input ref={selectAll} type="checkbox" aria-label="Select all users on this page" checked={allChecked} disabled={!data?.items.length || !!error || isLoading} onChange={e => setChecked(e.target.checked ? (data?.items || []).map(user => `${user.kind}:${user.id}`) : [])} /> : sortKey ? <button onClick={() => sortColumn(sortKey)}>{label} ↕</button> : label}</th>; })}
        </tr></thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
          {isLoading && Array.from({ length: 7 }, (_, row) => <tr key={`skeleton-${row}`} aria-hidden="true">{columns.map((column, index) => <td key={`${column}-${index}`} className="px-3 py-3"><div className={`h-4 animate-pulse rounded bg-neutral-200 dark:bg-slate-700 ${index === 0 ? 'w-44' : 'w-20'}`} /></td>)}</tr>)}
          {!isLoading && !error && !data?.items.length && <tr><td colSpan={columns.length} className="p-10 text-center text-neutral-500">{search || params.get('city') || params.get('role') ? 'No users match your filters.' : 'No users in this view.'}</td></tr>}
          {!error && data?.items.map(user => <tr key={`${user.kind}:${user.id}`} aria-selected={checked.includes(`${user.kind}:${user.id}`)} className={`${enterpriseGrid.row} ${checked.includes(`${user.kind}:${user.id}`) ? '!bg-blue-50 dark:!bg-blue-950/40' : ''}`}>
            <td className={enterpriseGrid.cell}><input type="checkbox" aria-label={`Select ${user.fullName}`} checked={checked.includes(`${user.kind}:${user.id}`)} onChange={e => setChecked(current => e.target.checked ? [...current, `${user.kind}:${user.id}`] : current.filter(key => key !== `${user.kind}:${user.id}`))} /></td>
            <td className={`${enterpriseGrid.cell} whitespace-nowrap`}><div className="flex items-center gap-2.5"><Avatar className="size-8 border border-blue-100 dark:border-slate-700"><AvatarImage src={user.avatar || undefined} alt="" /><AvatarFallback className="bg-blue-50 text-[10px] font-semibold text-[#1a4fa0] dark:bg-blue-950/50 dark:text-blue-300">{initials(user.fullName)}</AvatarFallback></Avatar><div className="min-w-0"><span className="block font-semibold text-neutral-800 dark:text-neutral-100">{user.fullName}</span><span className="block text-[10.5px] text-neutral-500">{user.email}</span></div></div></td>
            <td className={`${enterpriseGrid.cell} whitespace-nowrap`}>{user.city ? <span className="inline-flex items-center gap-1 text-neutral-700 dark:text-neutral-300"><MapPin className="h-3 w-3 text-indigo-600" />{cityName[user.city] || user.city}</span> : '—'}</td>
            <td className={enterpriseGrid.cell}><div className="flex max-w-56 flex-wrap items-center gap-1">{(user.assignedRoles?.length ? user.assignedRoles : user.roleName ? [user.roleName] : []).map(role => <span key={role} className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-1 text-[9.5px] font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">{role}</span>)}{user.kind === 'user' && user.allowedActions?.edit && <button type="button" onClick={() => { setEditing(user); setEditorMode('roles'); }} aria-label={`Assign roles to ${user.fullName}`} className="rounded border border-neutral-200 px-1.5 text-xs text-neutral-600 hover:bg-neutral-50">+</button>}</div></td>
            <td className={`${enterpriseGrid.cell} whitespace-nowrap`}><span className="block font-semibold">{user.branchName || 'Unassigned'}</span><span className="block text-xs text-neutral-500">{user.businessUnitName || '—'}</span></td>
            <td className={`${enterpriseGrid.cell} whitespace-nowrap`}>{user.managerName ? <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{user.managerName}</span> : <span className="text-neutral-400">Unassigned</span>}{user.kind === 'user' && user.allowedActions?.assignManager && <button type="button" onClick={() => { setEditing(user); setEditorMode('manager'); }} className="ml-2 text-[10px] font-semibold text-indigo-700 hover:underline">Assign</button>}</td>
            <td className={`${enterpriseGrid.cell} whitespace-nowrap`}>{view === 'pending' ? <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">{user.invitationStatus === 'expired' ? 'Invite expired' : user.invitationStatus ? 'Invited' : 'Awaiting approval'}</span> : <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${user.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}><span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />{user.isActive ? 'Active' : 'Blocked'}</span>}{view === 'blocked' && <span className="mt-1 block max-w-48 whitespace-normal text-[10px] text-neutral-500">{user.blockReason || 'Reason not recorded'}</span>}</td>
            {has('user:presence:view') && <><td className={`${enterpriseGrid.cell} whitespace-nowrap`}>{user.kind === 'user' ? <><PresenceBadge value={user.presence || 'unknown'} /><span className="mt-1 block text-[10.5px] text-neutral-500">Last seen {date(user.lastSeenAt)}</span>{user.officeNetwork && <span className="mt-1 block max-w-44 text-[9.5px] text-neutral-500">{user.officeNetwork}<span className="block">Seen {date(user.officeObservedAt)}</span></span>}</> : <span className="text-neutral-400">—</span>}</td></>}
            {view === 'activity' && has('user:sessions:view') && <td className={enterpriseGrid.cell}>{user.sessions ?? '—'}</td>}
            {view === 'activity' && has('user:login_logs:view') && <td className="whitespace-nowrap px-3 py-2.5 text-[10.5px]">{date(user.lastLoginAt)}</td>}
            <td className="whitespace-nowrap px-3 py-2.5 text-right"><div className="flex items-center justify-end gap-2">{view === 'pending' && user.kind === 'user' && !user.isApproved && user.requestedRole && user.allowedActions?.review && <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setReviewing(user)}><ShieldAlert className="h-3.5 w-3.5" />Review</Button>}{user.kind === 'user' && view === 'activity' && has('user:sessions:view', 'user:login_logs:view') && <button aria-label={`View activity for ${user.fullName}`} onClick={() => setSelected(user)} className="font-semibold text-indigo-700 hover:underline dark:text-indigo-300">Details</button>}{(user.allowedActions?.edit || user.allowedActions?.review || user.allowedActions?.changeAccess || user.allowedActions?.resetPassword || user.allowedActions?.endSessions || user.allowedActions?.deleteUser || user.allowedActions?.resendInvitation) && <DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button aria-label={`Actions for ${user.fullName}`} variant="ghost" size="sm" className="h-8 w-8 p-0 text-neutral-500"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56 bg-white text-xs dark:bg-slate-900">

              {user.allowedActions?.edit && <DropdownMenuItem onSelect={() => { setEditing(user); setEditorMode('profile'); }}><Edit2 className="h-3.5 w-3.5" />Edit Profile & Roles</DropdownMenuItem>}
              {user.allowedActions?.assignManager && <DropdownMenuItem onSelect={() => { setEditing(user); setEditorMode('manager'); }}><UserCheck className="h-3.5 w-3.5" />Assign Manager</DropdownMenuItem>}
              {user.allowedActions?.resendInvitation && <DropdownMenuItem disabled={saving} onSelect={async () => { setSaving(true); try { const result = await atsApi.auth.resendInvitation(user.id); toast.success(result.message); await mutate(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Invitation could not be sent.'); } finally { setSaving(false); } }}>Resend invitation</DropdownMenuItem>}
              {user.allowedActions?.resetPassword && <DropdownMenuItem onSelect={async () => { if (!window.confirm(`Send a password reset link to ${user.email}?`)) return; try { const result = await atsApi.auth.sendUserResetLink(user.id); toast.success(result.message || 'Password reset link sent.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to send password reset link.'); } }}><Key className="h-3.5 w-3.5" />Reset Password</DropdownMenuItem>}
              {user.allowedActions?.endSessions && <DropdownMenuItem onSelect={async () => { if (!window.confirm(`End all active sessions for ${user.fullName}?`)) return; try { const result = await atsApi.auth.logoutUserSessions(user.id); toast.success(result.message || 'User sessions ended.'); await mutate(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to end sessions.'); } }}><LogOut className="h-3.5 w-3.5" />End All User Sessions</DropdownMenuItem>}
              {user.allowedActions?.changeAccess && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => { setDecision(user); setReason(''); }} className={user.isActive ? 'text-amber-700' : 'text-emerald-700'}>{user.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}{user.isActive ? 'Deactivate & Revoke Access' : 'Reactivate Account'}</DropdownMenuItem></>}
              {user.allowedActions?.deleteUser && <><DropdownMenuSeparator /><DropdownMenuItem className="text-rose-600" onSelect={async () => { if (window.prompt(`Permanently delete ${user.fullName} and account history? Independent business records will be retained. This cannot be undone. Type DELETE to confirm.`) !== 'DELETE') return; try { await atsApi.auth.deleteUser(user.id); toast.success('Team member deleted.'); await mutate(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to delete team member.'); } }}><Trash2 className="h-3.5 w-3.5" />Delete Team Member</DropdownMenuItem></>}
            </DropdownMenuContent></DropdownMenu>}</div></td>
          </tr>)}
        </tbody>
      </table></div>
      <footer className="flex items-center justify-between text-xs text-neutral-500"><span>{data?.total ? `${(page - 1) * (data?.pageSize || 25) + 1}–${Math.min(page * (data?.pageSize || 25), data.total)} of ${data.total}` : '0 users'}</span><div className="flex items-center gap-2"><Button aria-label="Previous page" variant="outline" size="sm" disabled={page <= 1} onClick={() => changePage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button><label>Rows per page <select aria-label="Rows per page" value={params.get('pageSize') || '25'} onChange={e => setFilter('pageSize', e.target.value)} className={enterpriseGrid.control}>{[25, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label><span>Page {page}</span><Button aria-label="Next page" variant="outline" size="sm" disabled={!data || page * (data?.pageSize || 25) >= data.total} onClick={() => changePage(page + 1)}><ChevronRight className="h-4 w-4" /></Button></div></footer>
    </>}
    {reviewing && profile.data && <PendingUserReview key={`${profile.scope}:${reviewing.id}`} user={reviewing} scope={profile.scope} profile={profile.data} permissions={permissions} onClose={() => setReviewing(null)} onChanged={() => { setChecked([]); void mutate(); }} />}
    {selected && <UserActivityDrawer user={selected} scope={profile.scope} has={has} onClose={() => setSelected(null)} onChanged={() => void mutate()} />}
    {editing && <DirectoryMemberEditor user={editing} mode={editorMode} activeRole={profile.systemRole} permissions={permissions} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void mutate(); }} />}
    {decision && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="access-title" className="w-full max-w-md space-y-4 rounded-xl border bg-white p-5 dark:bg-slate-900"><h2 id="access-title" className="text-sm font-bold">{decision.isActive ? 'Block' : 'Unblock'} {decision.fullName}?</h2><p className="text-xs text-neutral-500">{decision.isActive ? 'This ends access to this workspace. Business records are preserved.' : 'The user will need to sign in again. Previously ended sessions remain revoked.'}</p><label className="block text-xs font-semibold">Reason<Input value={reason} maxLength={500} onChange={e => setReason(e.target.value)} className="mt-2 text-xs" /></label><div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={() => setDecision(null)}>Cancel</Button><Button disabled={saving || reason.trim().length < 3} onClick={() => void changeAccess()}>{saving ? 'Saving…' : 'Confirm'}</Button></div></section></div>}
  </div>;
}
export function PresenceBadge({ value }: { value: string }) {
  const color = value === 'active' ? 'bg-emerald-50 text-emerald-700' : value === 'away' ? 'bg-amber-50 text-amber-800' : 'bg-neutral-100 text-neutral-600';
  return <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10.5px] font-semibold capitalize ${color}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{value === 'active' ? 'Online' : value}</span>;
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
    {tab === 'sessions' ? sessions.data?.map(session => <article key={session.id} className="space-y-2 rounded-lg border border-neutral-200 p-4 text-xs dark:border-slate-700"><div className="flex justify-between font-semibold"><span>{session.device}{session.current ? ' · Current session' : ''}</span><span>{session.revokedAt ? 'Ended' : new Date(session.expiresAt) < new Date() ? 'Expired' : 'Signed in'}</span></div><dl className="grid grid-cols-2 gap-2 text-neutral-500"><dt>Login method</dt><dd>{session.loginMethod}</dd><dt>Started</dt><dd>{date(session.startedAt)}</dd><dt>Last seen</dt><dd>{date(session.lastSeenAt)}</dd>{'ipAddress' in session && <><dt>Latest observed IP</dt><dd className="break-all font-mono">{session.ipAddress || 'Not recorded'}</dd></>}{has('user:location:view') && <><dt>Office location check</dt><dd>{session.officeLocation ? `${session.officeLocation.result} · ${date(session.officeLocation.checkedAt)}` : 'Not recorded'}</dd>{session.officeLocation && <><dt>Accuracy</dt><dd>±{Math.round(session.officeLocation.accuracyMetres)} m · {session.officeLocation.source === 'post_login' ? 'At sign-in' : 'Manual check'}</dd></>}</>}</dl>
      {!session.revokedAt && new Date(session.expiresAt) > new Date() && has('user:sessions:revoke') && (confirmId === session.id ? <div className="space-y-2 rounded border border-red-200 p-2"><p>End this workspace session?</p><Button size="sm" disabled={!!busy} onClick={() => void revoke(session.id)}>Confirm end session</Button><button className="ml-3" onClick={() => setConfirmId(null)}>Cancel</button></div> : <button className="font-semibold text-red-600" onClick={() => setConfirmId(session.id)}>End session</button>)}</article>) : events.data?.map(event => <article key={event.id} className="space-y-1 border-b py-3 text-xs"><p className="font-semibold">{event.action.replaceAll('.', ' ')} · {event.outcome}</p><p className="text-neutral-500">{date(event.createdAt)}{event.actorName ? ` · ${event.actorName}` : ''}</p>{'ipAddress' in event && <p className="font-mono text-neutral-500">{event.ipAddress || 'IP not recorded'}</p>}</article>)}
    <div className="flex justify-between text-xs"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page}</span><Button variant="outline" size="sm" disabled={(current.data?.length || 0) < 50} onClick={() => setPage(page + 1)}>Next</Button></div>
    <p className="text-[11px] text-neutral-500">Presence measures application activity. It does not establish attendance or physical location.</p>
  </SheetContent></Sheet>;
}

function DirectoryMemberEditor({ user, mode, activeRole, permissions, onClose, onSaved }: { user: ManagementRow; mode: 'profile' | 'roles' | 'manager'; activeRole: string | null; permissions: string[]; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [city, setCity] = useState(user.city || '');
  const [roleIds, setRoleIds] = useState<string[]>(user.assignedRoleIds || []);
  const [managerId, setManagerId] = useState(user.jobReviewerId || '');
  const canAdmin = permissions.some(p => ['*', 'platform:manage', 'tenant:settings', 'tenant:manage', 'branch_admin:manage'].includes(p));
  useEffect(() => {
    let live = true;
    Promise.all([atsApi.auth.listUsers(), atsApi.auth.listRoles('ALL', true)]).then(([userList, roleList]) => {
      if (!live) return;
      const target = userList.find((item: any) => item.id === user.id);
      setMembers(userList);
      setRoles(roleList || []);
      if (target) {
        setFullName(target.fullName || user.fullName);
        setEmail(target.email || user.email);
        setCity(target.city || user.city || '');
        setRoleIds(target.assignedRoleIds || (target.roleId ? [target.roleId] : user.assignedRoleIds || []));
        setManagerId(target.jobReviewerId || user.jobReviewerId || '');
      }
    }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Unable to load user details.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [user.id]);
  const eligibleRoles = roles.filter(role => {
    const unitId = role.businessUnitId || role.business_unit_id;
    const branchId = role.branchId || role.branch_id;
    if (unitId && unitId !== user.businessUnitId) return false;
    if (branchId && branchId !== user.branchId) return false;
    const roleSystem = String(role.systemRole || role.system_role || '').toUpperCase();
    const adminRole = ['TENANT_ADMIN', 'SUPER_ADMIN', 'BRANCH_ADMIN', 'UNIT_ADMIN', 'DELIVERY_HEAD'].includes(roleSystem);
    const rolePermissions = Array.isArray(role.permissions) ? role.permissions : [];
    if (isAutomaticPodLeadRole(role)) return false;
    if (String(activeRole || '').toUpperCase() === 'DELIVERY_HEAD' && (adminRole || rolePermissions.some((p: string) => ['*', 'platform:manage', 'tenant:settings', 'tenant:manage', 'branch_admin:manage', 'unit_admin:manage'].includes(p)))) return false;
    return canAdmin || (!adminRole && !rolePermissions.some((p: string) => ['*', 'platform:manage', 'tenant:settings', 'tenant:manage', 'branch_admin:manage', 'unit_admin:manage'].includes(p)));
  });
  const managers = members.filter(member => {
    if (!member.isActive || member.id === user.id) return false;
    const values = [member.roleName, ...(member.roles || [])].map((value: string) => String(value).toUpperCase().replace(/[\s_-]/g, ''));
    return member.canReview || (member.permissions || []).some((p: string) => ['submission:internal_screening', 'job:approve', 'job:reject', 'job:publish_direct', 'branch_admin:manage', 'tenant:settings'].includes(p)) || values.some((value: string) => ['TENANTADMIN', 'SUPERADMIN', 'BRANCHADMIN', 'DELIVERYHEAD', 'ACCOUNTMANAGER', 'PODLEAD', 'BDM'].includes(value));
  });
  const save = async () => {
    if (mode !== 'manager' && (fullName.trim().length < 2 || !email.trim() || !roleIds.length)) { setError('Name, email, and at least one role are required.'); return; }
    setSaving(true); setError('');
    try {
      const body = mode === 'manager' ? { jobReviewerId: managerId || null } : mode === 'roles' ? { assignedRoleIds: roleIds } : { fullName: fullName.trim(), email: email.trim(), city: city || null, assignedRoleIds: roleIds };
      await atsApi.auth.updateUserDetail(user.id, body);
      toast.success('User details updated.'); onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update user.'); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="member-editor-title" className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
    <header className="flex items-start justify-between"><div><h2 id="member-editor-title" className="text-sm font-bold">{mode === 'manager' ? 'Assign Manager' : mode === 'roles' ? 'Assign Role(s)' : 'Edit user'} · {user.fullName}</h2><p className="mt-1 text-xs text-neutral-500">{mode === 'manager' ? 'Choose a designated manager for this user.' : mode === 'roles' ? 'Assign permitted business roles.' : 'Update profile details and business roles.'}</p></div><button type="button" onClick={onClose} aria-label="Close editor"><X className="h-4 w-4" /></button></header>
    {loading ? <div className="space-y-3 py-8"><div className="h-4 w-48 animate-pulse rounded bg-neutral-200" /><div className="h-9 animate-pulse rounded bg-neutral-200" /><div className="h-9 animate-pulse rounded bg-neutral-200" /></div> : <>
      {mode === 'profile' && <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs font-semibold">Full name<Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-9 text-xs" /></label><label className="space-y-1 text-xs font-semibold">Email<Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-9 text-xs" /></label><label className="space-y-1 text-xs font-semibold">City<select value={city} onChange={e => setCity(e.target.value)} className="h-9 w-full rounded-md border bg-white px-2 text-xs dark:bg-slate-800"><option value="">No city assigned</option>{[['BBSR','Bhubaneswar'],['PUNE','Pune'],['BENGALURU','Bengaluru'],['VIZAG','Vizag'],['HYDERABAD','Hyderabad']].map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>}
      {mode === 'manager' && <label className="block space-y-1 text-xs font-semibold">Designated manager<select value={managerId} onChange={e => setManagerId(e.target.value)} className="h-9 w-full rounded-md border bg-white px-2 text-xs dark:bg-slate-800"><option value="">Auto (Hierarchy)</option>{managers.map(member => <option key={member.id} value={member.id}>{member.fullName} · {member.roleName || 'Manager'}</option>)}</select></label>}
      {mode !== 'manager' && <fieldset className="space-y-2"><legend className="text-xs font-semibold">Assign role(s)</legend><div className="grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">{eligibleRoles.map(role => <label key={role.id} className="flex items-center gap-2 rounded-md border border-neutral-200 p-2 text-xs dark:border-slate-700"><input type="checkbox" checked={roleIds.includes(role.id)} onChange={e => setRoleIds(current => e.target.checked ? [...current, role.id] : current.filter(id => id !== role.id))} />{role.name}</label>)}{!eligibleRoles.length && <p className="text-xs text-neutral-500">No eligible roles are configured for this branch or unit.</p>}</div></fieldset>}
    </>}
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</p>}
    <footer className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button><Button type="button" size="sm" disabled={loading || saving} onClick={() => void save()}>{saving ? 'Saving…' : mode === 'manager' ? 'Save manager' : mode === 'roles' ? 'Assign roles' : 'Save changes'}</Button></footer>
  </section></div>;
}
