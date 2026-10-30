import Link from 'next/link';
import type {
  RecruiterDashboard,
  RecruiterFilters,
} from '@/lib/delivery-dashboard-contract';
import { recruiterDetailHref } from '@/lib/recruiter-presentation';
import {
  PerformanceCard,
  PerformanceTrend,
} from './manager-performance-visuals';

const stages = [
  { id: 'review', label: 'Review', color: '#d97706' },
  { id: 'l1', label: 'L1', color: '#2563eb' },
  { id: 'l2', label: 'L2', color: '#0d9488' },
  { id: 'l3', label: 'L3', color: '#7c3aed' },
  { id: 'offers', label: 'Offers', color: '#64748b' },
] as const;
export default function RecruiterPerformanceCharts({
  charts,
  filters,
  onNavigate,
  loading,
}: {
  charts: RecruiterDashboard['charts'] | undefined;
  filters: RecruiterFilters;
  onNavigate: () => void;
  loading: boolean;
}) {
  const visible = stages.filter(
    (s) => s.id !== 'review' || charts?.pipeline.some((p) => p.review !== null),
  );
  const volume = (r: NonNullable<typeof charts>['pipeline'][number]) =>
    visible.reduce((n, s) => n + (r[s.id] ?? 0), 0);
  const max = Math.max(1, ...(charts?.pipeline ?? []).map(volume)),
    closureMax = Math.max(1, ...(charts?.closures ?? []).map((c) => c.count));
  const empty = (
    <p className="py-12 text-center text-sm text-slate-500">
      {loading ? 'Loading charts…' : 'Submission chart data is unavailable.'}
    </p>
  );
  return (
    <div
      className="grid gap-4 xl:grid-cols-3"
      aria-label="Recruiter performance charts"
    >
      <PerformanceCard
        title="Closures by recruiter"
        caption={`${filters.from ? 'Selected period' : 'All time'} · Joined candidates · Top 5`}
      >
        {charts ? (
          <>
            <div className="space-y-4">
              {charts.closures.map((r) => (
                <Link
                  key={r.id}
                  href={recruiterDetailHref(r.id, filters)}
                  onClick={onNavigate}
                  className="grid grid-cols-[minmax(90px,40%)_1fr_24px] items-center gap-2 rounded text-sm hover:underline"
                  aria-label={`${r.name}: ${r.count} closures. Open performance.`}
                >
                  <span className="truncate">{r.name}</span>
                  <span className="h-6 rounded-sm bg-slate-100 dark:bg-slate-800">
                    <span
                      className="block h-full rounded-sm bg-[#1a4fa0]"
                      style={{ width: `${(r.count * 100) / closureMax}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums">{r.count}</span>
                </Link>
              ))}
            </div>
            {!charts.closures.length && (
              <p className="py-12 text-center text-sm text-slate-500">
                No matching recruiters.
              </p>
            )}
            <p className="mt-4 text-xs text-slate-500">
              Open a recruiter to view individual performance.
            </p>
          </>
        ) : (
          empty
        )}
      </PerformanceCard>
      <div className="grid gap-4" aria-label="Weekly activity">
        <PerformanceTrend
          title="Weekly submissions"
          values={charts?.submissions ?? null}
          scope={charts?.scope ?? 'last-12-weeks'}
          compact
        />
        <PerformanceTrend
          title="Weekly closures"
          values={charts?.closuresWeekly ?? null}
          scope={charts?.scope ?? 'last-12-weeks'}
          bars
          compact
        />
      </div>
      <PerformanceCard
        title="Current pipeline by recruiter"
        caption="Current snapshot · not conversion rates"
      >
        {charts ? (
          <>
            <div className="space-y-4">
              {charts.pipeline.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-[minmax(90px,38%)_1fr_28px] items-center gap-2 text-sm"
                >
                  <Link
                    href={recruiterDetailHref(r.id, filters)}
                    onClick={onNavigate}
                    className="truncate hover:underline"
                    title={r.name}
                  >
                    {r.name}
                  </Link>
                  <div className="flex h-6 overflow-hidden rounded-sm bg-slate-100 dark:bg-slate-800">
                    {visible.map(
                      (s) =>
                        (r[s.id] ?? 0) > 0 && (
                          <Link
                            key={s.id}
                            href={recruiterDetailHref(r.id, filters)}
                            onClick={onNavigate}
                            title={`${s.label}: ${r[s.id]}`}
                            aria-label={`${r.name}: ${s.label} ${r[s.id]}. Open performance.`}
                            style={{
                              width: `${((r[s.id] ?? 0) * 100) / max}%`,
                              backgroundColor: s.color,
                            }}
                            className="shrink-0 overflow-hidden text-center text-xs leading-6 text-white"
                          >
                            {((r[s.id] ?? 0) * 100) / max >= 14 ? r[s.id] : ''}
                          </Link>
                        ),
                    )}
                  </div>
                  <span className="text-right tabular-nums">{volume(r)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              {visible.map((s) => (
                <span key={s.id} className="flex items-center gap-1">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </span>
              ))}
            </div>
            {!charts.pipeline.length && (
              <p className="py-12 text-center text-sm text-slate-500">
                No matching recruiters.
              </p>
            )}
          </>
        ) : (
          empty
        )}
      </PerformanceCard>
    </div>
  );
}
