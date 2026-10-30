"use client";

import { useEffect, useRef, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { ChevronDown, ChevronUp, ChevronsUpDown, Columns3, RefreshCw } from 'lucide-react';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { atsApi } from '@/lib/ats-api';
import type { ManagerDashboard, ManagerDashboardFilters, ManagerSort } from '@/lib/delivery-dashboard-contract';
import { availableManagerColumns, normalizeManagerColumns, managerPeriod, customManagerPeriod, managerNumber, MANAGER_ROW_HEIGHT } from '@/lib/account-manager-presentation';
import { enterpriseGrid as grid } from '@/components/shared/enterprise-grid';
import { UserIdentity } from '@/components/shared/user-identity';
import ColumnDrawer from '@/components/shared/column-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { managerDetailHref, readManagerComparisonState, saveManagerComparisonState } from '@/lib/manager-detail-navigation';
import AccountManagerCharts from './account-manager-charts';

export default function AccountManagerComparison() {
  const { profile, selection } = useDashboardContext();
  if (!profile?.permissions?.includes('user:manage')) return <p role="alert">User management permission is required to compare account managers.</p>;
  const scope = [profile.id, profile.tenantId, profile.branchId, profile.businessUnitId, selection?.active.id, [...profile.permissions].sort().join(',')].join(':');
  return <ScopedComparison key={scope} scope={scope} permissions={profile.permissions} />;
}

function ScopedComparison({ scope, permissions }: { scope: string; permissions: string[] }) {
  const [saved] = useState(() => readManagerComparisonState(scope));
  const available = availableManagerColumns(permissions);
  const preferenceKey = `ats:manager-columns:${scope}`;
  const [selectedColumns, setSelectedColumns] = useState<ManagerSort[]>(() => {
    try { return normalizeManagerColumns(JSON.parse(localStorage.getItem(preferenceKey) || 'null'), available); }
    catch { return normalizeManagerColumns(null, available); }
  });
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [search, setSearch] = useState(saved?.search ?? '');
  const [period, setPeriod] = useState(saved?.period ?? 'all');
  const [startDate, setStartDate] = useState(saved?.startDate ?? '');
  const [endDate, setEndDate] = useState(saved?.endDate ?? '');
  const [dateError, setDateError] = useState('');
  const [filters, setFilters] = useState<ManagerDashboardFilters>(saved?.filters ?? { sort: permissions.includes('submission:view') ? 'joined' : 'name', direction: permissions.includes('submission:view') ? 'desc' : 'asc' });
  const [revision, setRevision] = useState(0);
  const [expanded, setExpanded] = useState(saved?.expanded ?? false);
  const [scrollTop, setScrollTop] = useState(saved?.scrollTop ?? 0);
  const restoredScroll = useRef(false);
  const [metadata, setMetadata] = useState<Pick<ManagerDashboard, 'unit' | 'managers'>>();
  const [dragged, setDragged] = useState<ManagerSort | null>(null);
  const scrollContainer = useRef<HTMLDivElement>(null);
  const { data, error, size, setSize, isValidating } = useSWRInfinite<ManagerDashboard>(
    (index, previous: ManagerDashboard | null) => {
      if (index && previous?.nextOffset === null) return null;
      return ['account-manager-comparison', scope, revision, filters, index === 0 ? 0 : previous?.nextOffset, index === 0 ? 10 : 100, index === 0 ? undefined : previous?.snapshot];
    },
    ([, , , query, offset, limit, snapshot]: [string, string, number, ManagerDashboardFilters, number, number, string | undefined]) => atsApi.businessUnits.accountManagerDashboard({ ...query, offset, limit, snapshot }),
    { revalidateOnFocus: false, revalidateFirstPage: false, revalidateIfStale: false, shouldRetryOnError: false, persistSize: false,
      onSuccess: pages => { const page = pages[0]; if (page) setMetadata({ unit: page.unit, managers: page.managers }); } },
  );
  const first = data?.[0];
  const last = data?.[data.length - 1];
  useEffect(() => {
    if (!restoredScroll.current && first && (!expanded || last?.nextOffset === null)) {
      if (scrollContainer.current) scrollContainer.current.scrollTop = saved?.scrollTop ?? 0;
      restoredScroll.current = true;
    }
  }, [first, last, expanded, saved]);
  useEffect(() => {
    if (search.trim() === (filters.search || '')) return;
    const timer = setTimeout(() => {
      setFilters(current => current.search === search.trim() ? current : { ...current, search: search.trim() });
      setExpanded(false); setScrollTop(0);
      if (scrollContainer.current) scrollContainer.current.scrollTop = 0;
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filters.search]);
  useEffect(() => {
    const refresh = () => { setExpanded(false); setScrollTop(0); setRevision(value => value + 1); };
    window.addEventListener('app:refresh', refresh);
    return () => window.removeEventListener('app:refresh', refresh);
  }, []);
  useEffect(() => {
    if (expanded && last && last.nextOffset !== null && data?.length === size && !isValidating && !error) void setSize(size + 1);
  }, [expanded, last, data?.length, size, isValidating, error, setSize]);

  function changeFilters(patch: Partial<ManagerDashboardFilters>) {
    setExpanded(false); setScrollTop(0); setFilters(current => ({ ...current, ...patch }));
    if (scrollContainer.current) scrollContainer.current.scrollTop = 0;
  }
  function saveColumns(ids: string[]) {
    const normalized = normalizeManagerColumns(ids, available);
    setSelectedColumns(normalized);
    try { localStorage.setItem(preferenceKey, JSON.stringify(normalized)); } catch { /* This view still works without browser storage. */ }
  }
  function sortColumn(id: ManagerSort) { changeFilters({ sort: id, direction: filters.sort === id ? filters.direction === 'desc' ? 'asc' : 'desc' : id === 'name' ? 'asc' : 'desc' }); }
  function reset() {
    setSearch(''); setPeriod('all'); setStartDate(''); setEndDate(''); setDateError('');
    setExpanded(false); setScrollTop(0);
    setFilters({ sort: permissions.includes('submission:view') ? 'joined' : 'name', direction: permissions.includes('submission:view') ? 'desc' : 'asc' });
  }
  function applyDates() {
    try { const range = customManagerPeriod(startDate, endDate); setDateError(''); changeFilters(range); }
    catch (failure) { setDateError(failure instanceof Error ? failure.message : 'Choose valid dates.'); }
  }
  function rememberComparison() { saveManagerComparisonState(scope, { filters, search, period, startDate, endDate, expanded, scrollTop }); }
  const roster = first?.managers ?? metadata?.managers ?? [];
  const unit = first?.unit ?? metadata?.unit;
  const allRows = data?.flatMap(page => page.rows) ?? [];
  const rows = expanded ? allRows : allRows.slice(0, 10);
  const virtual = rows.length > 100;
  const start = virtual ? Math.max(0, Math.floor(Math.max(0, scrollTop - 64) / MANAGER_ROW_HEIGHT) - 5) : 0;
  const end = virtual ? Math.min(rows.length, start + 25) : rows.length;
  const columns = selectedColumns.map(id => available.find(column => column.id === id)).filter((column): column is typeof available[number] => Boolean(column));
  const refresh = () => { setExpanded(false); setScrollTop(0); setRevision(value => value + 1); };
  return <section className="min-w-0 space-y-4 font-sans text-slate-900 dark:text-slate-100" aria-label="Account manager performance">
    <p className="text-[13px] text-slate-500 dark:text-slate-400">{unit ? `${unit.branchName} / ${unit.name}` : 'Your current branch and unit'} · {filters.from && filters.to ? `${new Date(filters.from).toLocaleDateString()} – ${new Date(Date.parse(filters.to) - 1).toLocaleDateString()}` : 'All time'}</p>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
      ['Account managers', first?.total], ['Total posted', first?.summary.postedJobs], ['Active', first?.summary.activeJobs], ['Closures', first?.summary.joined],
    ].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-[13px] text-slate-500 dark:text-slate-400">{label}</p>{value === undefined ? <Skeleton className="mt-2 h-8 w-14" /> : <p className="mt-2 text-2xl font-semibold tabular-nums">{managerNumber(value as number | null)}</p>}</div>)}</div>
    <AccountManagerCharts charts={first?.charts} loading={!first && !error} failed={Boolean(error && !first)} selectedPeriod={Boolean(filters.from)} managerHref={id => managerDetailHref(id, filters)} onSelectManager={rememberComparison} />
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Could not load the latest comparison. Data may have changed while expanding.<Button size="sm" variant="outline" onClick={refresh}>Reload comparison</Button></div>}
    <div className={grid.surface}>
      <div className={grid.toolbar}>
        <span aria-live="polite">{first ? `${expanded ? 'All' : 'Top'} ${expanded ? rows.length : Math.min(10, first.total)} of ${first.total} managers` : 'Loading managers…'}</span>
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4" />Refresh</Button><Button variant="outline" size="sm" onClick={() => setColumnsOpen(true)}><Columns3 className="h-4 w-4" />Columns</Button></div>
      </div>
      <div className={grid.filters} aria-label="Account manager filters">
        <label className="flex min-w-52 flex-1 flex-col gap-1.5"><span>Name or email</span><Input aria-label="Search account managers" maxLength={100} placeholder="Search name or email…" value={search} onChange={event => setSearch(event.target.value)} className="h-9 text-[13px]" /></label>
        <label className="flex min-w-52 flex-1 flex-col gap-1.5"><span>Account manager</span><select aria-label="Account manager" className={grid.control} value={filters.accountManagerId || ''} onChange={event => changeFilters({ accountManagerId: event.target.value })}><option value="">All account managers</option>{roster.map(manager => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select></label>
        <label className="flex min-w-44 flex-col gap-1.5"><span>Time period</span><select aria-label="Time period" className={grid.control} value={period} onChange={event => { const next = event.target.value; setPeriod(next); setDateError(''); if (next !== 'custom') changeFilters({ from: undefined, to: undefined, ...managerPeriod(next) }); }}><option value="all">All time</option><option value="month">This month</option><option value="lastMonth">Last month</option><option value="30days">Last 30 days</option><option value="custom">Custom dates</option></select></label>
        {period === 'custom' && <><label className="flex flex-col gap-1.5"><span>From</span><input aria-label="From date" type="date" className={grid.control} value={startDate} onChange={event => setStartDate(event.target.value)} /></label><label className="flex flex-col gap-1.5"><span>Through</span><input aria-label="Through date" type="date" className={grid.control} value={endDate} onChange={event => setEndDate(event.target.value)} /></label><Button size="sm" variant="outline" onClick={applyDates}>Apply dates</Button></>}
        <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
        {dateError && <p role="alert" className="w-full text-sm text-red-700">{dateError}</p>}
      </div>
      <div ref={scrollContainer} className="max-h-[660px] overflow-auto" onScroll={event => setScrollTop(event.currentTarget.scrollTop)}>
        <table id="account-manager-table" className={cn(grid.table, 'table-fixed')} style={{ minWidth: 280 + (columns.length - 1) * 120 }} aria-rowcount={(first?.total ?? 0) + 1}>
          <thead className={grid.header}><tr style={{ height: 64 }}>{columns.map(column => <th key={column.id} scope="col" style={{ width: column.id === 'name' ? 280 : column.id === 'review' ? 160 : 120 }} aria-sort={filters.sort === column.id ? filters.direction === 'asc' ? 'ascending' : 'descending' : 'none'}
            draggable={column.id !== 'name'} onDragStart={() => setDragged(column.id)} onDragEnd={() => setDragged(null)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (dragged && column.id !== 'name' && dragged !== column.id) { const next = selectedColumns.filter(id => id !== dragged); next.splice(next.indexOf(column.id), 0, dragged); saveColumns(next); } setDragged(null); }}
            className={cn(grid.heading, column.id === 'name' && 'sticky left-0 z-30')}>
            <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => sortColumn(column.id)} title={`${column.description}. Click to sort; drag header to reorder.`}>{column.label}{filters.sort === column.id ? filters.direction === 'asc' ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronsUpDown className="h-3.5 w-3.5 shrink-0" />}</button>
          </th>)}</tr></thead>
          <tbody>
            {start > 0 && <tr aria-hidden="true"><td colSpan={columns.length} style={{ height: start * MANAGER_ROW_HEIGHT }} /></tr>}
            {rows.slice(start, end).map((row, index) => <tr key={row.id} style={{ height: MANAGER_ROW_HEIGHT }} aria-rowindex={start + index + 2} className={grid.row}>
              {columns.map(column => column.id === 'name' ? <th scope="row" key="name" className={cn(grid.cell, 'sticky left-0 z-10 bg-white text-left font-normal dark:bg-slate-900')}><Link href={managerDetailHref(row.id, filters)} onClick={rememberComparison} className="block rounded hover:text-[#1a4fa0] focus-visible:outline-2 focus-visible:outline-blue-600"><UserIdentity size="table" user={{ fullName: row.name, email: row.email, avatar: row.avatar }} /></Link></th>
                : <td key={column.id} className={cn(grid.cell, 'text-center tabular-nums')}><span className={column.id === 'review' && row.review ? 'rounded bg-amber-50 px-2 py-1 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : column.id === 'joined' && row.joined ? 'rounded bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200' : ''}>{managerNumber(row[column.id])}</span></td>)}
            </tr>)}
            {end < rows.length && <tr aria-hidden="true"><td colSpan={columns.length} style={{ height: (rows.length - end) * MANAGER_ROW_HEIGHT }} /></tr>}
            {!rows.length && <tr><td colSpan={columns.length} className="p-10 text-center text-sm text-slate-500">{!first ? error ? 'Comparison unavailable. Use Reload comparison to try again.' : 'Loading account managers…' : 'No account managers match these filters.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className={cn(grid.toolbar, 'border-b-0 border-t')}><span aria-live="polite">Showing {rows.length} of {first?.total ?? 0} account managers{expanded && last?.nextOffset !== null && !error ? ' · Loading remaining managers…' : ''}</span>
        {first && first.total > 10 && <Button variant="outline" size="sm" aria-expanded={expanded} aria-controls="account-manager-table" onClick={() => { setExpanded(value => !value); setScrollTop(0); if (scrollContainer.current) scrollContainer.current.scrollTop = 0; }}>{expanded ? <><ChevronUp className="h-4 w-4" />Show top 10</> : <><ChevronDown className="h-4 w-4" />Show all account managers ({first.total})</>}</Button>}
      </div>
    </div>
    {first && Boolean(filters.from) && ((first.undatedOutcomes ?? 0) > 0 || (first.undatedPostedJobs ?? 0) > 0) && <p role="status" className="text-[13px] text-amber-800 dark:text-amber-300">Period totals exclude {first.undatedPostedJobs ?? 0} jobs and {first.undatedOutcomes ?? 0} current outcomes with missing event dates. Current queues are still shown.</p>}
    {first && <details className="text-xs leading-5 text-slate-500"><summary className="cursor-pointer">Metric definitions · Updated {new Date(first.updatedAt).toLocaleTimeString()}</summary><p>Active, Closed and interview queues show the current portfolio. Total posted and Positions use recorded approval dates; Submissions received uses receipt dates. Offers and Closures use first recorded offer/join events for a selected period. All time also includes current outcomes without recorded dates. Counts belong to the current job owner. Only active, approved managers in this unit are included.</p>
      {first.undatedOutcomes !== null && first.undatedOutcomes > 0 && <p>{first.undatedOutcomes} current outcomes have no recorded milestone date and are excluded from period totals.</p>}
      {first.summary.unassignedJobs !== null && first.summary.unassignedJobs > 0 && <p>{first.summary.unassignedJobs} unassigned jobs are outside manager totals.</p>}
    </details>}
    <ColumnDrawer isOpen={columnsOpen} onClose={() => setColumnsOpen(false)} allColumns={available.map(column => ({ id: column.id, label: column.label }))} selectedColumns={selectedColumns} defaultColumns={available.map(column => column.id)} onApply={saveColumns} onResetToDefault={() => saveColumns(available.map(column => column.id))} />
  </section>;
}
