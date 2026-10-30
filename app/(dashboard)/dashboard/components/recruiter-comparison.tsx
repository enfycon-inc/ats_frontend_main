'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';
import {
  ChevronsUpDown,
  ChevronDown,
  ChevronUp,
  Columns3,
  RefreshCw,
} from 'lucide-react';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { atsApi } from '@/lib/ats-api';
import type {
  RecruiterDashboard,
  RecruiterFilters,
  RecruiterSort,
} from '@/lib/delivery-dashboard-contract';
import {
  availableRecruiterColumns,
  readRecruiterState,
  saveRecruiterState,
  recruiterDetailHref,
} from '@/lib/recruiter-presentation';
import {
  managerNumber,
  managerPeriod,
  customManagerPeriod,
} from '@/lib/account-manager-presentation';
import { enterpriseGrid as grid } from '@/components/shared/enterprise-grid';
import { UserIdentity } from '@/components/shared/user-identity';
import ColumnDrawer from '@/components/shared/column-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RecruiterPerformanceCharts from './recruiter-performance-charts';

export default function RecruiterComparison() {
  const { profile, selection } = useDashboardContext();
  if (!profile?.permissions?.includes('user:manage'))
    return (
      <p role="alert">
        User management permission is required to compare recruiters.
      </p>
    );
  const scope = [
    profile.id,
    profile.tenantId,
    profile.branchId,
    profile.businessUnitId,
    selection?.active.id,
    [...profile.permissions].sort().join(','),
  ].join(':');
  return (
    <Comparison key={scope} scope={scope} permissions={profile.permissions} />
  );
}
function Comparison({
  scope,
  permissions,
}: {
  scope: string;
  permissions: string[];
}) {
  const [saved] = useState(() => readRecruiterState(scope));
  const available = availableRecruiterColumns(permissions),
    defaultFilters: RecruiterFilters = {
      sort: permissions.includes('submission:view') ? 'joined' : 'name',
      direction: permissions.includes('submission:view') ? 'desc' : 'asc',
    };
  const [filters, setFilters] = useState<RecruiterFilters>(
      saved?.filters ?? defaultFilters,
    ),
    [search, setSearch] = useState(saved?.search ?? ''),
    [period, setPeriod] = useState(saved?.period ?? 'all');
  const [startDate, setStart] = useState(saved?.startDate ?? ''),
    [endDate, setEnd] = useState(saved?.endDate ?? ''),
    [dateError, setDateError] = useState('');
  const [expanded, setExpanded] = useState(saved?.expanded ?? false),
    [revision, setRevision] = useState(0),
    [columnsOpen, setColumnsOpen] = useState(false);
  const key = `ats:recruiter-columns:${scope}`;
  const normalize = (ids: unknown): RecruiterSort[] =>
    [
      'name',
      ...(Array.isArray(ids) ? ids : available.map((c) => c.id)).filter(
        (id): id is RecruiterSort =>
          id !== 'name' && available.some((c) => c.id === id),
      ),
    ].filter((id, i, a) => a.indexOf(id) === i) as RecruiterSort[];
  const [columns, setColumns] = useState<RecruiterSort[]>(() => {
    try {
      return normalize(JSON.parse(localStorage.getItem(key) || 'null'));
    } catch {
      return normalize(null);
    }
  });
  const scroll = useRef<HTMLDivElement>(null),
    restored = useRef(false);
  const [options, setOptions] = useState<RecruiterDashboard['options']>();
  const { data, error, size, setSize, isValidating } =
    useSWRInfinite<RecruiterDashboard>(
      (index, prev: RecruiterDashboard | null) =>
        index && prev?.nextOffset === null
          ? null
          : [
              'recruiter-comparison',
              scope,
              revision,
              filters,
              index ? prev?.nextOffset : 0,
              index ? 100 : 10,
              index ? prev?.snapshot : undefined,
            ],
      ([, , , query, offset, limit, snapshot]: [
        string,
        string,
        number,
        RecruiterFilters,
        number,
        number,
        string | undefined,
      ]) =>
        atsApi.businessUnits.recruiterDashboard({
          ...query,
          offset,
          limit,
          snapshot,
        }),
      {
        revalidateOnFocus: false,
        revalidateFirstPage: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        persistSize: false,
        onSuccess: pages => { if (pages[0]) setOptions(pages[0].options); },
      },
    );
  const first = data?.[0],
    last = data?.[data.length - 1],
    rows = (expanded ? data?.flatMap((p) => p.rows) : first?.rows) ?? [];
  useEffect(() => {
    if (search.trim() === (filters.search ?? '')) return;
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: search.trim() }));
      setExpanded(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, filters.search]);
  useEffect(() => {
    if (
      expanded &&
      last?.nextOffset !== null &&
      last &&
      data?.length === size &&
      !isValidating &&
      !error
    )
      void setSize(size + 1);
  }, [expanded, last, data?.length, size, isValidating, error, setSize]);
  useEffect(() => {
    if (
      first &&
      !restored.current &&
      (!expanded || last?.nextOffset === null)
    ) {
      if (scroll.current) scroll.current.scrollTop = saved?.scrollTop ?? 0;
      restored.current = true;
    }
  }, [first, last, expanded, saved]);
  useEffect(() => {
    const refresh = () => {
      setExpanded(false);
      setRevision((n) => n + 1);
    };
    window.addEventListener('app:refresh', refresh);
    return () => window.removeEventListener('app:refresh', refresh);
  }, []);
  const change = (patch: Partial<RecruiterFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setExpanded(false);
    if (scroll.current) scroll.current.scrollTop = 0;
  };
  const remember = () =>
    saveRecruiterState(scope, {
      filters,
      search,
      period,
      startDate,
      endDate,
      expanded,
      scrollTop: scroll.current?.scrollTop ?? 0,
    });
  const saveColumns = (ids: string[]) => {
    const next = normalize(ids);
    setColumns(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* Optional storage. */
    }
  };
  const reset = () => {
    setSearch('');
    setPeriod('all');
    setStart('');
    setEnd('');
    setDateError('');
    setExpanded(false);
    setFilters(defaultFilters);
  };
  const visibleColumns = columns
    .map((id) => available.find((c) => c.id === id))
    .filter((c): c is (typeof available)[number] => Boolean(c));
  const [scrollTop, setScrollTop] = useState(0),
    height = 60,
    start = expanded ? Math.max(0, Math.floor(scrollTop / height) - 5) : 0,
    end = expanded ? Math.min(rows.length, start + 22) : rows.length;
  return (
    <section className="min-w-0 space-y-4 font-sans text-sm">
      <p className="text-sm text-slate-500">
        {first
          ? `${first.unit.branchName} / ${first.unit.name}`
          : 'Recruiter performance'}{' '}
        · {period === 'all' ? 'All time' : 'Selected period'}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Active assigned jobs',
            value: first?.summary.activeJobs,
            caption: 'Current · unique jobs',
          },
          {
            label: 'Submissions',
            value: first?.summary.submissions,
            caption: filters.from ? 'Selected period' : 'All time',
          },
          {
            label: 'Offers',
            value: first?.summary.offers,
            caption: filters.from ? 'Selected period' : 'All time',
          },
          {
            label: 'Closures',
            value: first?.summary.joined,
            caption: filters.from ? 'Selected period' : 'All time',
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="my-2 text-2xl font-semibold tabular-nums">
              {managerNumber(c.value ?? null)}
            </p>
            <p className="text-xs text-slate-500">{c.caption}</p>
          </div>
        ))}
      </div>
      <RecruiterPerformanceCharts
        charts={first?.charts}
        filters={filters}
        onNavigate={remember}
        loading={!first && !error}
      />
      {error && (
        <p
          role="alert"
          className="rounded border border-amber-200 p-3 text-amber-800 dark:text-amber-300"
        >
          Could not load the comparison. Data may have changed while expanding.
          Use Refresh to reload.
        </p>
      )}
      <div className={grid.surface}>
        <div className={grid.toolbar}>
          <span aria-live="polite">
            {first
              ? `${expanded ? 'Showing' : 'Top'} ${rows.length} of ${first.total} recruiters`
              : 'Loading recruiters…'}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setExpanded(false);
                setRevision((n) => n + 1);
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setColumnsOpen(true)}
            >
              <Columns3 className="h-4 w-4" />
              Columns
            </Button>
          </div>
        </div>
        <div className={grid.filters} aria-label="Recruiter filters">
          <label className="flex min-w-48 flex-1 flex-col gap-1.5">
            Name or email
            <Input
              aria-label="Search recruiters"
              value={search}
              maxLength={100}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
            />
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1.5">
            Recruiter
            <select
              className={grid.control}
              value={filters.recruiterId ?? ''}
              onChange={(e) => change({ recruiterId: e.target.value })}
            >
              <option value="">All recruiters</option>
              {(first?.options ?? options)?.recruiters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
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
          {!!(first?.options ?? options)?.pods.length && (
            <label className="flex flex-col gap-1.5">
              Pod
              <select
                className={grid.control}
                value={filters.podId ?? ''}
                onChange={(e) => change({ podId: e.target.value })}
              >
                <option value="">All pods</option>
                {(first?.options ?? options)?.pods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
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
                      e instanceof Error ? e.message : 'Choose valid dates.',
                    );
                  }
                }}
              >
                Apply dates
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={reset}>
            Reset
          </Button>
          {dateError && (
            <p role="alert" className="w-full text-red-700">
              {dateError}
            </p>
          )}
        </div>
        <div
          className="max-h-[660px] overflow-auto"
          ref={scroll}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
          <table
            id="recruiter-table"
            className={grid.table}
            style={{ minWidth: 280 + (visibleColumns.length - 1) * 120 }}
            aria-rowcount={(first?.total ?? 0) + 1}
          >
            <thead className={grid.header}>
              <tr>
                {visibleColumns.map((c) => (
                  <th
                    key={c.id}
                    scope="col"
                    aria-sort={
                      filters.sort === c.id
                        ? filters.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className={`${grid.heading} ${c.id === 'name' ? 'sticky left-0 z-30 min-w-72' : ''}`}
                  >
                    <button
                      className="flex w-full items-center justify-between gap-2 text-left"
                      title={c.description}
                      onClick={() =>
                        change({
                          sort: c.id,
                          direction:
                            filters.sort === c.id &&
                            filters.direction === 'desc'
                              ? 'asc'
                              : c.id === 'name' && filters.sort !== c.id
                                ? 'asc'
                                : 'desc',
                        })
                      }
                    >
                      {c.label}
                      {filters.sort === c.id ? (
                        filters.direction === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3" />
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {start > 0 && (
                <tr aria-hidden="true">
                  <td
                    colSpan={visibleColumns.length}
                    style={{ height: start * height }}
                  />
                </tr>
              )}
              {rows.slice(start, end).map((r, i) => (
                <tr
                  key={r.id}
                  className={grid.row}
                  style={{ height }}
                  aria-rowindex={start + i + 2}
                >
                  {visibleColumns.map((c) =>
                    c.id === 'name' ? (
                      <th
                        key={c.id}
                        scope="row"
                        className={`${grid.cell} sticky left-0 z-10 bg-white font-normal dark:bg-slate-900`}
                      >
                        <Link
                          href={recruiterDetailHref(r.id, filters)}
                          onClick={remember}
                          className="block rounded hover:text-blue-700"
                        >
                          <UserIdentity size="table" user={r} />
                        </Link>
                      </th>
                    ) : (
                      <td
                        key={c.id}
                        className={`${grid.cell} text-center tabular-nums`}
                      >
                        <span
                          className={
                            c.id === 'review' && r.review
                              ? 'rounded bg-amber-50 px-2 py-1 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                              : ''
                          }
                        >
                          {managerNumber(r[c.id])}
                        </span>
                      </td>
                    ),
                  )}
                </tr>
              ))}
              {end < rows.length && (
                <tr aria-hidden="true">
                  <td
                    colSpan={visibleColumns.length}
                    style={{ height: (rows.length - end) * height }}
                  />
                </tr>
              )}
              {!rows.length && (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="p-10 text-center text-slate-500"
                  >
                    {error
                      ? 'Comparison unavailable.'
                      : first
                        ? 'No recruiters match these filters.'
                        : 'Loading recruiters…'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={`${grid.toolbar} border-b-0 border-t`}>
          <span>
            Showing {rows.length} of {first?.total ?? 0} recruiters
            {expanded && last?.nextOffset !== null && !error
              ? ' · Loading remaining recruiters…'
              : ''}
          </span>
          {!!first && first.total > 10 && (
            <Button
              size="sm"
              variant="outline"
              aria-expanded={expanded}
              aria-controls="recruiter-table"
              onClick={() => {
                setExpanded((e) => !e);
                setScrollTop(0);
                if (scroll.current) scroll.current.scrollTop = 0;
              }}
            >
              {expanded
                ? 'Show top 10'
                : `Show all recruiters (${first.total})`}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Assignments and pipeline are current. Submissions and outcomes use the
        selected period. Pod jobs are shared; active job totals count unique
        jobs. Results belong to the recruiter recorded on each submission.
      </p>
      {!!first?.undatedOutcomes && (
        <p className="text-xs text-amber-800 dark:text-amber-300">
          {first.undatedOutcomes} current outcomes have no recorded milestone
          date; excluded from period totals and trends.
        </p>
      )}
      {!!first?.unattributedSubmissions && (
        <p className="text-xs text-slate-500">
          {first.unattributedSubmissions} unit submissions have no active roster
          attribution, including website applications; excluded from recruiter
          totals.
        </p>
      )}
      <ColumnDrawer
        isOpen={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        allColumns={available.map((c) => ({ id: c.id, label: c.label }))}
        selectedColumns={columns}
        defaultColumns={available.map((c) => c.id)}
        onApply={saveColumns}
        onResetToDefault={() => saveColumns(available.map((c) => c.id))}
      />
    </section>
  );
}
