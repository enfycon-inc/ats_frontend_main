'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Columns3, RefreshCw, ArrowLeft } from 'lucide-react';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { atsApi } from '@/lib/ats-api';
import type {
  RecruiterDetailFilters,
  RecruiterPerformance,
  RecruiterDetailRow,
} from '@/lib/delivery-dashboard-contract';
import {
  customManagerPeriod,
  managerNumber,
  managerPeriod,
} from '@/lib/account-manager-presentation';
import { enterpriseGrid as grid } from '@/components/shared/enterprise-grid';
import { UserIdentity } from '@/components/shared/user-identity';
import ColumnDrawer from '@/components/shared/column-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ManagerPipeline,
  PerformanceTrend,
} from './manager-performance-visuals';

function dateInput(value: string) {
  if (!Number.isFinite(Date.parse(value))) return '';
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function RecruiterPerformancePage({
  recruiterId,
}: {
  recruiterId: string;
}) {
  const { profile, selection } = useDashboardContext(),
    query = useSearchParams();
  if (
    !profile?.permissions?.includes('unit_admin:manage') ||
    !profile.permissions.includes('user:manage')
  )
    return <p role="alert">You do not have access to recruiter performance.</p>;
  const scope = [
    profile.id,
    profile.tenantId,
    profile.branchId,
    profile.businessUnitId,
    selection?.active.id,
    [...profile.permissions].sort().join(','),
    recruiterId,
  ].join(':');
  return (
    <Detail
      key={scope}
      scope={scope}
      recruiterId={recruiterId}
      permissions={profile.permissions}
      from={query.get('from') ?? ''}
      to={query.get('to') ?? ''}
    />
  );
}
function Detail({
  scope,
  recruiterId,
  permissions,
  from,
  to,
}: {
  scope: string;
  recruiterId: string;
  permissions: string[];
  from: string;
  to: string;
}) {
  const canJobs = permissions.includes('job:view'),
    canSubs = permissions.includes('submission:view'),
    canReview =
      canSubs && permissions.includes('submission:internal_screening'),
    canClients = canSubs && permissions.includes('client:view');
  const tabs = [
    ...(canJobs ? [{ id: 'jobs' as const, label: 'Assigned Jobs' }] : []),
    ...(canSubs ? [{ id: 'submissions' as const, label: 'Submissions' }] : []),
    ...(canClients
      ? [{ id: 'clients' as const, label: 'Client Performance' }]
      : []),
  ];
  const [filters, setFilters] = useState<RecruiterDetailFilters>({
    from: from || undefined,
    to: to || undefined,
    tab: tabs[0]?.id ?? 'jobs',
    page: 1,
  });
  const [period, setPeriod] = useState(from ? 'custom' : 'all'),
    [startDate, setStart] = useState(
      dateInput(from),
    ),
    [endDate, setEnd] = useState(
      to && Number.isFinite(Date.parse(to))
        ? dateInput(new Date(Date.parse(to) - 1).toISOString())
        : '',
    );
  const [search, setSearch] = useState(''),
    [dateError, setDateError] = useState(''),
    [open, setOpen] = useState(false);
  const { data, error, isValidating, mutate } = useSWR<RecruiterPerformance>(
    ['recruiter-performance', scope, filters],
    () => atsApi.businessUnits.recruiterDetail(recruiterId, filters),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );
  useEffect(() => {
    if (search.trim() === (filters.search ?? '')) return;
    const t = setTimeout(
      () => setFilters((f) => ({ ...f, search: search.trim(), page: 1 })),
      300,
    );
    return () => clearTimeout(t);
  }, [search, filters.search]);
  useEffect(() => {
    const refresh = () => void mutate();
    window.addEventListener('app:refresh', refresh);
    return () => window.removeEventListener('app:refresh', refresh);
  }, [mutate]);
  const change = (patch: Partial<RecruiterDetailFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const columnsFor = (tab: RecruiterDetailFilters['tab']) => [
    {
      id: 'title',
      label:
        tab === 'jobs'
          ? 'Job / code'
          : tab === 'submissions'
            ? 'Candidate / job'
            : 'Client',
    },
    ...(tab !== 'clients' ? [{ id: 'clientName', label: 'Client' }] : []),
    ...(tab === 'jobs'
      ? [
          { id: 'assignment', label: 'Assignment' },
          { id: 'accountManager', label: 'Account manager' },
          { id: 'status', label: 'Job status' },
        ]
      : []),
    ...(tab === 'submissions'
      ? [
          { id: 'status', label: 'Stage' },
          { id: 'createdAt', label: 'Submitted' },
          { id: 'interviewAt', label: 'Interview date' },
        ]
      : []),
    ...(tab !== 'submissions' && canSubs
      ? [
          { id: 'submissions', label: 'Submissions' },
          ...(canReview ? [{ id: 'review', label: 'Pending review' }] : []),
          { id: 'offers', label: 'Offers' },
          { id: 'joined', label: 'Closures' },
        ]
      : []),
  ];
  const [preferences, setPreferences] = useState<Record<string, string[]>>(
    () => {
      try {
        const saved = JSON.parse(
            localStorage.getItem(`ats:recruiter-detail-columns:${scope}`) ||
              '{}',
          );
        return saved && typeof saved === 'object' ? saved : {};
      } catch {
        return {};
      }
    },
  );
  // Response carries its tab so cached rows always retain matching headings.
  const displayTab = data?.table.tab ?? filters.tab;
  const available = columnsFor(displayTab),
    stored = preferences[displayTab ?? 'jobs'];
  const selected = [
    'title',
    ...(Array.isArray(stored) ? stored : available.map((c) => c.id)).filter(
      (id) => id !== 'title' && available.some((c) => c.id === id),
    ),
  ];
  const cols = selected
    .map((id) => available.find((c) => c.id === id)!)
    .filter(Boolean);
  const save = (ids: string[]) => {
    const next = {
      ...preferences,
      [displayTab ?? 'jobs']: [
        'title',
        ...ids.filter(
          (id) => id !== 'title' && available.some((c) => c.id === id),
        ),
      ],
    };
    setPreferences(next);
    try {
      localStorage.setItem(
        `ats:recruiter-detail-columns:${scope}`,
        JSON.stringify(next),
      );
    } catch {
      /* Optional storage. */
    }
  };
  const cell = (row: RecruiterDetailRow, id: string) => {
    if (id === 'title')
      return (
        <>
          {displayTab === 'jobs' ? (
            <Link
              href={`/job-posting/${row.id}`}
              className="font-medium text-[#1a4fa0] hover:underline dark:text-blue-400"
            >
              {row.title || 'Name unavailable'}
            </Link>
          ) : displayTab === 'clients' ? (
            <Link
              href={`/clients/${row.id}`}
              className="font-medium text-[#1a4fa0] hover:underline dark:text-blue-400"
            >
              {row.title || 'Name unavailable'}
            </Link>
          ) : (
            <span className="font-medium">
              {row.title || 'Name unavailable'}
            </span>
          )}
          {row.code && <p className="text-xs text-slate-500">{row.code}</p>}
        </>
      );
    if (id === 'createdAt' || id === 'interviewAt')
      return row[id] ? new Date(row[id]!).toLocaleString() : '—';
    if (id === 'assignment')
      return row.assignment === 'direct'
        ? 'Direct'
        : row.assignment === 'shared'
          ? 'Shared pod'
          : '—';
    const value = row[id as keyof RecruiterDetailRow];
    return typeof value === 'number' ? managerNumber(value) : (value ?? '—');
  };
  const queue = (attention: RecruiterDetailFilters['attention']) => {
    setSearch('');
    change({
      tab: 'submissions',
      attention,
      search: '',
      status: undefined,
      assignment: undefined,
      clientId: undefined,
    });
  };
  return (
    <section className="min-w-0 space-y-4 font-sans text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/recruiters"
          className="inline-flex items-center gap-2 text-[#1a4fa0] hover:underline dark:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to recruiters
        </Link>
        <Button size="sm" variant="outline" onClick={() => void mutate()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded border border-amber-200 p-3 text-amber-800 dark:text-amber-300"
        >
          Could not load recruiter performance. Check access and filters, or use
          Refresh.
        </p>
      )}
      {!data && !error && <Skeleton className="h-56 w-full" />}
      {data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <UserIdentity size="table" user={data.recruiter} />
              <p className="mt-2 text-xs text-slate-500">
                {data.unit.branchName} / {data.unit.name}
                {data.recruiter.pod ? ` · ${data.recruiter.pod}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1.5">
                Time period
                <select
                  className={grid.control}
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value);
                    setDateError('');
                    if (e.target.value !== 'custom')
                      change({
                        from: undefined,
                        to: undefined,
                        ...managerPeriod(e.target.value),
                      });
                  }}
                >
                  <option value="all">All time</option>
                  <option value="month">This month</option>
                  <option value="lastMonth">Last month</option>
                  <option value="30days">Last 30 days</option>
                  <option value="custom">Custom dates</option>
                </select>
              </label>
              {period === 'custom' && (
                <>
                  <label className="flex flex-col gap-1.5">
                    From
                    <input
                      type="date"
                      className={grid.control}
                      value={startDate}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    Through
                    <input
                      type="date"
                      className={grid.control}
                      value={endDate}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      try {
                        change(customManagerPeriod(startDate, endDate));
                        setDateError('');
                      } catch (e) {
                        setDateError(
                          e instanceof Error
                            ? e.message
                            : 'Choose valid dates.',
                        );
                      }
                    }}
                  >
                    Apply dates
                  </Button>
                </>
              )}
            </div>
            {dateError && (
              <p role="alert" className="w-full text-red-700">
                {dateError}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {[
              { key: 'directActive', label: 'Direct active', current: true },
              { key: 'sharedJobs', label: 'Shared pod jobs', current: true },
              { key: 'submissions', label: 'Submissions' },
              { key: 'review', label: 'Pending review', current: true },
              { key: 'offers', label: 'Offers' },
              { key: 'joined', label: 'Closures' },
            ].map((c) => (
              <div
                key={c.key}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-sm text-slate-500">{c.label}</p>
                <p className="my-2 text-2xl font-semibold tabular-nums">
                  {managerNumber(
                    data.recruiter[c.key as 'directActive'] ?? null,
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {c.current
                    ? 'Current'
                    : filters.from
                      ? 'Selected period'
                      : 'All time'}
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <PerformanceTrend
              title="Weekly submissions"
              values={data.charts?.submissions ?? null}
              scope={data.charts?.scope ?? 'last-12-weeks'}
            />
            <PerformanceTrend
              title="Weekly closures"
              values={data.charts?.closuresWeekly ?? null}
              scope={data.charts?.scope ?? 'last-12-weeks'}
              bars
            />
            <ManagerPipeline pipeline={data.pipeline} />
          </div>
          {canSubs && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold">Needs attention</h2>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                {canReview && (
                  <button
                    className="text-left hover:underline"
                    onClick={() => queue('review')}
                  >
                    Pending internal review{' '}
                    <strong>{managerNumber(data.attention.review)}</strong>
                  </button>
                )}
                <button
                  className="text-left hover:underline"
                  onClick={() => queue('feedback')}
                >
                  Awaiting interview feedback{' '}
                  <strong>{managerNumber(data.attention.feedback)}</strong>
                </button>
                <button
                  className="text-left hover:underline"
                  onClick={() => queue('upcoming')}
                >
                  Upcoming interviews{' '}
                  <strong>{managerNumber(data.attention.upcoming)}</strong>
                </button>
              </div>
            </div>
          )}
          <div className={grid.surface}>
            <div className={grid.toolbar}>
              <nav
                className="flex flex-wrap gap-4"
                aria-label="Recruiter performance sections"
              >
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    aria-current={filters.tab === t.id ? 'page' : undefined}
                    className={
                      filters.tab === t.id
                        ? 'font-semibold text-[#1a4fa0] dark:text-blue-400'
                        : ''
                    }
                    onClick={() => {
                      setSearch('');
                      change({
                        tab: t.id,
                        search: '',
                        assignment: undefined,
                        status: undefined,
                        attention: undefined,
                      });
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
              <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
                <Columns3 className="h-4 w-4" />
                Columns
              </Button>
            </div>
            <div className={grid.filters} aria-label="Recruiter detail filters">
              <label className="flex min-w-48 flex-1 flex-col gap-1.5">
                Search
                <Input
                  value={search}
                  maxLength={100}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    filters.tab === 'clients'
                      ? 'Search clients…'
                      : filters.tab === 'submissions'
                        ? 'Search candidate or job…'
                        : 'Search job or code…'
                  }
                />
              </label>
              {filters.tab === 'jobs' && (
                <label className="flex flex-col gap-1.5">
                  Assignment
                  <select
                    className={grid.control}
                    value={filters.assignment ?? ''}
                    onChange={(e) =>
                      change({
                        assignment: e.target
                          .value as RecruiterDetailFilters['assignment'],
                      })
                    }
                  >
                    <option value="">All assignments</option>
                    <option value="direct">Direct</option>
                    {permissions.includes('pod:view') && (
                      <option value="shared">Shared pod</option>
                    )}
                  </select>
                </label>
              )}
              {filters.tab !== 'clients' && (
                <label className="flex flex-col gap-1.5">
                  {filters.tab === 'jobs' ? 'Job status' : 'Stage'}
                  <select
                    className={grid.control}
                    value={filters.status ?? ''}
                    onChange={(e) => change({ status: e.target.value })}
                  >
                    <option value="">All</option>
                    {(filters.tab === 'jobs'
                      ? [
                          'Active',
                          'Closed',
                          'Filled',
                          'On Hold',
                          'Hold by Client',
                          'Archived',
                        ]
                      : [
                          ...(canReview ? ['PENDING_APPROVAL'] : []),
                          'L1',
                          'L2',
                          'L3',
                          'DECISION',
                          'SELECTED',
                          'OFFER',
                          'JOIN',
                          'REJECTED',
                          'NOT_SELECTED',
                          'WITHDRAWN',
                        ]
                    ).map((s) => (
                      <option key={s} value={s}>
                        {s.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {canClients && (
                <label className="flex flex-col gap-1.5">
                  Client
                  <select
                    className={grid.control}
                    value={filters.clientId ?? ''}
                    onChange={(e) => change({ clientId: e.target.value })}
                  >
                    <option value="">All clients</option>
                    {data.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  change({
                    search: '',
                    assignment: undefined,
                    status: undefined,
                    clientId: undefined,
                    attention: undefined,
                  });
                }}
              >
                Reset filters
              </Button>
              {filters.attention && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => change({ attention: undefined })}
                >
                  Clear {filters.attention} queue
                </Button>
              )}
            </div>
            <p role="status" className="px-4 py-2 text-xs text-slate-500">
              {isValidating
                ? 'Updating results…'
                : `${data.table.total} matching records`}
              {filters.attention
                ? ' · Current queue; submission date filter is not applied.'
                : ''}
            </p>
            <div className="overflow-auto">
              <table
                className={`${grid.table} min-w-[850px]`}
                aria-label="Recruiter performance records"
              >
                <thead className={grid.header}>
                  <tr>
                    {cols.map((c) => (
                      <th key={c.id} scope="col" className={grid.heading}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.table.rows.map((r) => (
                    <tr key={r.id} className={grid.row}>
                      {cols.map((c) => (
                        <td key={c.id} className={grid.cell}>
                          {cell(r, c.id)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!data.table.rows.length && (
                    <tr>
                      <td
                        colSpan={cols.length}
                        className="p-10 text-center text-slate-500"
                      >
                        No records match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className={`${grid.toolbar} border-b-0 border-t`}>
              <span>
                Page {data.table.page} · {data.table.total} records
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isValidating || data.table.page <= 1}
                  onClick={() => change({ page: data.table.page - 1 })}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    isValidating ||
                    data.table.page * data.table.limit >= data.table.total
                  }
                  onClick={() => change({ page: data.table.page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Results belong to this recruiter’s submissions. Current assignments
            and shared pod jobs are not exclusive ownership. Client Performance
            shows delivery contribution, not clients added. Historical
            submissions remain available after reassignment.
          </p>
          {!!data.undatedOutcomes && (
            <p className="text-xs text-amber-800 dark:text-amber-300">
              {data.undatedOutcomes} current outcomes have no recorded milestone
              date and are excluded from period totals and trends.
            </p>
          )}
          <ColumnDrawer
            isOpen={open}
            onClose={() => setOpen(false)}
            allColumns={available}
            selectedColumns={selected}
            defaultColumns={available.map((c) => c.id)}
            onApply={save}
            onResetToDefault={() => save(available.map((c) => c.id))}
          />
        </>
      )}
    </section>
  );
}
