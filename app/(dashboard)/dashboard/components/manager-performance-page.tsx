"use client";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { atsApi } from '@/lib/ats-api';
import type { ManagerDetailFilters, ManagerPerformanceDetail } from '@/lib/delivery-dashboard-contract';
import { customManagerPeriod, managerNumber, managerPeriod } from '@/lib/account-manager-presentation';
import { enterpriseGrid as grid } from '@/components/shared/enterprise-grid';
import { UserAvatar } from '@/components/shared/user-identity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientClosures, ManagerPipeline, PerformanceTrend } from './manager-performance-visuals';

const dateInput = (iso: string | null) => {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '';
  const date = new Date(iso); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function ManagerPerformancePage({ managerId }: { managerId: string }) {
  const { profile, selection } = useDashboardContext();
  const query = useSearchParams();
  if (!profile?.permissions?.includes('unit_admin:manage') || !profile.permissions.includes('user:manage')) return <p role="alert">You do not have access to manager performance.</p>;
  const scope = [profile.id, profile.tenantId, profile.branchId, profile.businessUnitId, selection?.active.id, [...profile.permissions].sort().join(','), managerId].join(':');
  return <ScopedManagerPage key={scope} scope={scope} managerId={managerId} permissions={profile.permissions} initialFrom={query.get('from')} initialTo={query.get('to')} />;
}

function ScopedManagerPage({ scope, managerId, permissions, initialFrom, initialTo }: { scope: string; managerId: string; permissions: string[]; initialFrom: string | null; initialTo: string | null }) {
  const [filters, setFilters] = useState<ManagerDetailFilters>({ ...(initialFrom && initialTo ? { from: initialFrom, to: initialTo } : {}), clientMode: 'added', jobPage: 1, clientPage: 1 });
  const [tab, setTab] = useState<'jobs' | 'clients'>('jobs');
  const [period, setPeriod] = useState(initialFrom && initialTo ? 'custom' : 'all');
  const [fromDate, setFromDate] = useState(dateInput(initialFrom));
  const [toDate, setToDate] = useState(dateInput(initialTo && Number.isFinite(Date.parse(initialTo)) ? new Date(Date.parse(initialTo) - 1).toISOString() : null));
  const [dateError, setDateError] = useState('');
  const [search, setSearch] = useState('');
  const { data, error, isLoading, mutate } = useSWR<ManagerPerformanceDetail>(['manager-performance-detail', scope, filters],
    () => atsApi.businessUnits.accountManagerDetail(managerId, filters), { keepPreviousData: true, shouldRetryOnError: false, revalidateOnFocus: true });
  const canJobs = permissions.includes('job:view'), canClients = permissions.includes('client:view');
  const change = (patch: Partial<ManagerDetailFilters>) => setFilters(current => ({ ...current, ...patch, jobPage: patch.jobPage ?? 1, clientPage: patch.clientPage ?? 1 }));
  useEffect(() => {
    if (search.trim() === (filters.jobSearch || '')) return;
    const timer = setTimeout(() => setFilters(current => ({ ...current, jobSearch: search.trim(), jobPage: 1 })), 300);
    return () => clearTimeout(timer);
  }, [search, filters.jobSearch]);
  useEffect(() => {
    const refresh = () => { void mutate(); };
    window.addEventListener('app:refresh', refresh); return () => window.removeEventListener('app:refresh', refresh);
  }, [mutate]);
  function applyDates() { try { change(customManagerPeriod(fromDate, toDate)); setDateError(''); } catch (failure) { setDateError(failure instanceof Error ? failure.message : 'Choose valid dates.'); } }
  const back = <Link href="/dashboard/account-managers" className="text-sm text-[#1a4fa0] hover:underline dark:text-blue-400">← Back to account managers</Link>;
  if (!data) return <div className="space-y-4">{back}{error ? <div role="alert" className="space-y-3 text-sm">This account manager is unavailable, access has changed, or the page could not be loaded.<Button variant="outline" onClick={() => void mutate()}>Retry</Button></div> : <Skeleton className="h-96 w-full" aria-label="Loading manager performance" />}</div>;
  const manager = data.manager;
  const attention = (value: 'review' | 'uncovered') => { setTab('jobs'); setSearch(''); change({ attention: value, jobSearch: '', jobStatus: '' }); };
  return <section className="min-w-0 space-y-4 font-sans text-slate-900 dark:text-slate-100" aria-label="Individual account manager performance">
    {back}
    {isLoading && <p role="status" className="text-sm text-slate-500">Updating performance… Previous results remain visible until loading completes.</p>}
    {error && <div role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Could not refresh. Showing the last loaded manager data.<Button variant="ghost" size="sm" onClick={() => void mutate()}>Retry</Button></div>}
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-3"><UserAvatar user={{ name: manager.name, avatar: manager.avatar }} className="h-12 w-12" /><div className="min-w-0"><h2 className="truncate text-lg font-semibold">{manager.name}</h2><p className="truncate text-sm text-slate-500 dark:text-slate-400">{manager.email}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{data.unit.branchName} / {data.unit.name}</p></div></div>
      <div className="flex flex-wrap items-end gap-2"><label className="flex flex-col gap-1 text-[13px]">Time period<select aria-label="Performance time period" className={grid.control} value={period} onChange={event => { const next = event.target.value; setPeriod(next); setDateError(''); if (next !== 'custom') change({ from: undefined, to: undefined, ...managerPeriod(next) }); }}><option value="all">All time</option><option value="month">This month</option><option value="lastMonth">Last month</option><option value="30days">Last 30 days</option><option value="custom">Custom dates</option></select></label>
        {period === 'custom' && <><label className="flex flex-col gap-1 text-xs">From<input type="date" aria-label="Performance from date" className={grid.control} value={fromDate} onChange={event => setFromDate(event.target.value)} /></label><label className="flex flex-col gap-1 text-xs">Through<input type="date" aria-label="Performance through date" className={grid.control} value={toDate} onChange={event => setToDate(event.target.value)} /></label><Button variant="outline" size="sm" onClick={applyDates}>Apply dates</Button></>}
        <Button variant="outline" size="sm" onClick={() => void mutate()}>Refresh</Button>
      </div>{dateError && <p role="alert" className="w-full text-sm text-red-700">{dateError}</p>}
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">{[
      ['Total posted', manager.postedJobs, 'Selected period'], ['Active', manager.activeJobs, 'Current portfolio'], ['Positions', manager.positions, 'Posted in period'],
      ['Submissions', manager.submissions, 'Received in period'], ['Offers', manager.offers, 'Milestone outcomes'], ['Closures', manager.joined, 'Joined candidates'],
    ].map(([label, value, caption]) => <div key={String(label)} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-[13px] text-slate-500 dark:text-slate-400">{label}</p><p className="my-2 text-2xl font-semibold tabular-nums">{managerNumber(value as number | null)}</p><p className="text-xs text-slate-500 dark:text-slate-400">{filters.from ? caption : label === 'Active' ? caption : 'All time'}</p></div>)}</div>
    <div className="grid gap-4 xl:grid-cols-3"><PerformanceTrend title="Weekly submissions" values={data.weekly.submissions} scope={data.weeklyScope} /><PerformanceTrend title="Weekly closures" values={data.weekly.closures} scope={data.weeklyScope} bars /><ManagerPipeline pipeline={data.pipeline} /></div>
    {((data.attention.uncoveredJobs ?? 0) > 0 || (data.attention.pendingReview ?? 0) > 0) && <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"><h2 className="text-sm font-semibold">Needs attention</h2>{(data.attention.uncoveredJobs ?? 0) > 0 && <span>{data.attention.uncoveredJobs} active jobs without submissions <Button size="sm" variant="link" onClick={() => attention('uncovered')}>View jobs</Button></span>}{(data.attention.pendingReview ?? 0) > 0 && <span>{data.attention.pendingReview} submissions awaiting internal review {canJobs && <Button size="sm" variant="link" onClick={() => attention('review')}>Review jobs</Button>}</span>}</div>}
    <div className={grid.surface}>
      <nav aria-label="Manager performance sections" className={grid.toolbar}><div className="flex gap-4"><button aria-current={tab === 'jobs' ? 'page' : undefined} className={tab === 'jobs' ? 'font-semibold text-[#1a4fa0] dark:text-blue-400' : ''} onClick={() => setTab('jobs')}>Jobs</button>{canClients && <button aria-current={tab === 'clients' ? 'page' : undefined} className={tab === 'clients' ? 'font-semibold text-[#1a4fa0] dark:text-blue-400' : ''} onClick={() => setTab('clients')}>Client Performance</button>}</div></nav>
      {tab === 'clients' && <div className="space-y-4 p-4"><div className="flex flex-wrap gap-6 text-sm"><span>Clients added in period: <strong>{managerNumber(data.clients.added)}</strong></span><span>Current delivery portfolio: <strong>{managerNumber(data.clients.portfolio)}</strong></span></div><div className="grid gap-4 xl:grid-cols-2"><PerformanceTrend title="Clients added over time" values={data.weekly.clientsAdded} scope={data.weeklyScope} /><ClientClosures rows={data.clients.closures} /></div></div>}
      <div className={grid.filters} aria-label="Manager detail filters">
        {tab === 'jobs' && <><Input aria-label="Search manager jobs" placeholder="Search job or code…" value={search} onChange={event => setSearch(event.target.value)} maxLength={100} className="h-9 max-w-xs text-[13px]" /><select aria-label="Job status" className={grid.control} value={filters.jobStatus ?? ''} onChange={event => change({ jobStatus: event.target.value })}><option value="">All job statuses</option>{['Active', 'Closed', 'Filled', 'On Hold', 'Hold by Client', 'Archived'].map(status => <option key={status}>{status}</option>)}</select></>}
        {tab === 'clients' && <select aria-label="Client attribution" className={grid.control} value={filters.clientMode} onChange={event => change({ clientMode: event.target.value as 'added' | 'portfolio' })}><option value="added">Added by this manager</option>{canJobs && <option value="portfolio">Current delivery portfolio</option>}</select>}
        {canJobs && canClients && <select aria-label="Client" className={grid.control} value={filters.clientId ?? ''} onChange={event => change({ clientId: event.target.value })}><option value="">All clients</option>{data.options.clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select>}
        {canJobs && <select aria-label="Employment type" className={grid.control} value={filters.employmentType ?? ''} onChange={event => change({ employmentType: event.target.value })}><option value="">All employment types</option>{data.options.employmentTypes.map(value => <option key={value}>{value}</option>)}</select>}
        <Button variant="ghost" size="sm" onClick={() => { setSearch(''); change({ jobSearch: '', jobStatus: '', clientId: '', employmentType: '', attention: undefined }); }}>Reset filters</Button>
        {filters.attention && <Button variant="outline" size="sm" onClick={() => change({ attention: undefined })}>Clear queue filter</Button>}
      </div>
      {tab === 'jobs' ? !canJobs ? <p className="p-8 text-sm">Job viewing permission is required.</p> : <div className="overflow-auto"><table className={`${grid.table} min-w-[950px]`} aria-label="Manager job performance"><thead className={grid.header}><tr>{['Job', 'Client', 'Status', 'Positions', 'Submissions', 'Pending review', 'Closures'].map(label => <th key={label} scope="col" className={grid.heading}>{label}</th>)}</tr></thead><tbody>{data.jobs.rows.map(job => <tr key={job.id} className={grid.row}><td className={grid.cell}><Link href={`/job-posting/${job.id}`} className="font-medium text-[#1a4fa0] hover:underline dark:text-blue-400">{job.title}</Link><p className="text-xs text-slate-500">{job.code}</p></td><td className={grid.cell}>{job.clientId ? <Link href={`/clients/${job.clientId}`} className="hover:underline">{job.clientName}</Link> : 'Client unavailable'}</td><td className={grid.cell}>{job.status}</td><td className={grid.cell}>{job.positions}</td><td className={grid.cell}>{managerNumber(job.submissions)}</td><td className={grid.cell}>{managerNumber(job.review)}</td><td className={grid.cell}>{managerNumber(job.joined)}</td></tr>)}{!data.jobs.rows.length && <tr><td colSpan={7} className="p-10 text-center text-slate-500">No jobs match these filters.</td></tr>}</tbody></table></div>
      : <><p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{filters.clientMode === 'added' ? 'Clients created by this manager during the selected period, including clients with no jobs.' : 'Clients on this manager’s current jobs, regardless of who originally added them.'} Delivery figures include only this manager’s jobs. Client visibility follows your directory permissions.</p><div className="overflow-auto"><table className={`${grid.table} min-w-[1300px]`} aria-label="Client performance added by manager"><thead className={grid.header}><tr>{['Client', 'Added', 'Total posted', 'Active', 'Closed', 'Positions', 'Submissions', 'Pending review', 'Offers', 'Closures'].map(label => <th key={label} scope="col" className={grid.heading}>{label}</th>)}</tr></thead><tbody>{data.clients.rows.map(client => <tr key={client.id} className={grid.row}><td className={grid.cell}><Link href={`/clients/${client.id}`} className="flex items-center gap-2 text-[#1a4fa0] hover:underline dark:text-blue-400"><UserAvatar user={{ name: client.name }} /><span className="font-medium">{client.name}</span></Link><p className="mt-1 text-xs text-slate-500">{client.addedByManager ? 'Added by this manager' : 'Delivery portfolio'} · {client.status}</p></td><td className={grid.cell}>{new Date(client.addedAt).toLocaleDateString()}</td>{(['postedJobs', 'activeJobs', 'closedJobs', 'positions', 'submissions', 'review', 'offers', 'joined'] as const).map(key => <td key={key} className={grid.cell}>{managerNumber(client[key])}</td>)}</tr>)}{!data.clients.rows.length && <tr><td colSpan={10} className="p-10 text-center text-slate-500">No visible clients match this attribution and period.</td></tr>}</tbody></table></div></>}
      <div className={grid.toolbar}><span>{isLoading ? 'Loading…' : `${tab === 'jobs' ? data.jobs.total : data.clients.total} matching ${tab === 'jobs' ? 'jobs' : 'clients'}`}</span><div className="flex items-center gap-3"><Button size="sm" variant="outline" disabled={(tab === 'jobs' ? data.jobs.page : data.clients.page) <= 1} onClick={() => change(tab === 'jobs' ? { jobPage: data.jobs.page - 1 } : { clientPage: data.clients.page - 1 })}>Previous</Button><span>Page {tab === 'jobs' ? data.jobs.page : data.clients.page}</span><Button size="sm" variant="outline" disabled={tab === 'jobs' ? data.jobs.page * data.jobs.limit >= data.jobs.total : data.clients.page * data.clients.limit >= data.clients.total} onClick={() => change(tab === 'jobs' ? { jobPage: data.jobs.page + 1 } : { clientPage: data.clients.page + 1 })}>Next</Button></div></div>
    </div>
    <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Status, job positions and pipeline show the current portfolio. Activity and posted positions use the selected period; All time includes current outcomes with unknown milestone dates. Reporting uses current job ownership; clients added uses the recorded creator. — means additional permission is required.</p>
    {filters.from && ((data.undatedOutcomes ?? 0) > 0 || (data.undatedPostedJobs ?? 0) > 0) && <p role="status" className="text-sm text-amber-800 dark:text-amber-300">Period totals exclude {data.undatedPostedJobs ?? 0} jobs and {data.undatedOutcomes ?? 0} outcomes with missing dates.</p>}
  </section>;
}
