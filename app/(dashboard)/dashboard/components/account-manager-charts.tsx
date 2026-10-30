"use client";

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import type { ManagerDashboardCharts } from '@/lib/delivery-dashboard-contract';
import { Skeleton } from '@/components/ui/skeleton';

const stages = [
  { key: 'review', label: 'Review', color: '#d97706' },
  { key: 'l1', label: 'L1', color: '#2563eb' },
  { key: 'l2', label: 'L2', color: '#0d9488' },
  { key: 'l3', label: 'L3', color: '#7c3aed' },
  { key: 'offers', label: 'Offers', color: '#64748b' },
] as const;
const date = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const weekLabel = (from: string, to: string) => `${date(from)} – ${date(new Date(Date.parse(to) - 1).toISOString())}`;

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-label={title}>
    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
    <div className="mt-4">{children}</div>
  </section>;
}

function ManagerTarget({ href, onSelect, children, className, style, title, label }: { href?: string; onSelect: () => void; children: ReactNode; className?: string; style?: CSSProperties; title?: string; label?: string }) {
  return href ? <Link href={href} onClick={onSelect} className={className} style={style} title={title} aria-label={label}>{children}</Link>
    : <button type="button" onClick={onSelect} className={className} style={style} title={title} aria-label={label}>{children}</button>;
}

export default function AccountManagerCharts({ charts, loading, failed, selectedPeriod, onSelectManager, managerHref }: {
  charts: ManagerDashboardCharts | null | undefined; loading: boolean; failed: boolean; selectedPeriod: boolean; onSelectManager: (id: string) => void; managerHref?: (id: string) => string;
}) {
  if (!charts) return <div className="grid gap-4 xl:grid-cols-3" aria-label="Account manager charts">{['Closures by manager', 'Weekly closures', 'Current pipeline by manager'].map(title =>
    <ChartCard key={title} title={title} subtitle={loading ? 'Loading chart data…' : failed ? 'Chart data could not be loaded.' : 'Chart data is unavailable for this view.'}>
      {loading ? <Skeleton className="h-52 w-full" /> : <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">{failed ? 'Use Refresh to try again.' : 'Chart unavailable'}</p>}
    </ChartCard>)}</div>;
  const closureMax = Math.max(1, ...charts.closures.map(manager => manager.count));
  const visibleStages = stages.filter(stage => stage.key !== 'review' || charts.pipeline.some(manager => manager.review !== null));
  const total = (row: typeof charts.pipeline[number]) => visibleStages.reduce((sum, stage) => sum + (row[stage.key] ?? 0), 0);
  const pipelineMax = Math.max(1, ...charts.pipeline.map(total));
  const weeks = charts.weekly;
  const yMax = Math.max(4, Math.ceil(Math.max(0, ...weeks.map(week => week.count)) / 4) * 4);
  const x = (index: number) => weeks.length === 1 ? 264 : 48 + index * 420 / (weeks.length - 1);
  const y = (count: number) => 180 - count * 160 / yMax;
  const labelEvery = Math.max(1, Math.ceil(weeks.length / 5));
  return <div className="grid items-stretch gap-4 xl:grid-cols-3" aria-label="Account manager charts">
    <ChartCard title="Closures by manager" subtitle={`Joined candidates · ${selectedPeriod ? 'selected period' : 'all time'} · Top ${charts.closures.length}`}>
      {!charts.closures.length ? <p className="py-16 text-center text-sm text-slate-500">No matching account managers.</p> : <div className="space-y-3">{charts.closures.map(manager =>
        <ManagerTarget key={manager.id} href={managerHref?.(manager.id)} onSelect={() => onSelectManager(manager.id)} className="grid w-full grid-cols-[minmax(90px,36%)_1fr_28px] items-center gap-2 rounded text-left text-sm focus-visible:outline-2 focus-visible:outline-blue-600" label={`${manager.name}: ${manager.count} closures. Open performance.`}>
          <span className="truncate" title={manager.name}>{manager.name}</span><span className="h-6 overflow-hidden rounded-sm bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded-sm bg-[#1a4fa0] dark:bg-blue-500" style={{ width: `${manager.count * 100 / closureMax}%` }} /></span><span className="text-right tabular-nums">{manager.count}</span>
        </ManagerTarget>)}</div>}
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Open a manager to view their performance page.</p>
    </ChartCard>
    <ChartCard title="Weekly closures" subtitle={`Recorded join dates · ${charts.weeklyScope === 'last-12-weeks' ? 'last 12 weeks' : 'selected period'} · 7-day intervals`}>
      {!weeks.length ? <p className="py-16 text-center text-sm text-slate-500">No elapsed dates in this period.</p> : <>
        <svg viewBox="0 0 510 220" className="min-h-52 w-full overflow-visible text-slate-500 dark:text-slate-400" role="img" aria-label={`Weekly recorded closures: ${weeks.reduce((sum, week) => sum + week.count, 0)} in ${weeks.length} intervals`}>
          {[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1="48" x2="468" y1={y(tick * yMax / 4)} y2={y(tick * yMax / 4)} stroke="currentColor" opacity="0.18" /><text x="38" y={y(tick * yMax / 4) + 4} textAnchor="end" fill="currentColor" fontSize="16">{tick * yMax / 4}</text></g>)}
          <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" points={weeks.map((week, index) => `${x(index)},${y(week.count)}`).join(' ')} />
          {weeks.map((week, index) => <g key={week.from}><circle cx={x(index)} cy={y(week.count)} r="4" fill="#2563eb" tabIndex={0} aria-label={`${weekLabel(week.from, week.to)}: ${week.count} closures`}><title>{`${weekLabel(week.from, week.to)}: ${week.count} closures`}</title></circle>
            {(index % labelEvery === 0 || index === weeks.length - 1) && <text x={x(index)} y="205" textAnchor="middle" fill="currentColor" fontSize="15">{date(week.from)}</text>}
            {weeks.length <= 6 && <text x={x(index)} y={y(week.count) - 10} textAnchor="middle" fill="currentColor" fontSize="16">{week.count}</text>}
          </g>)}
        </svg>
        <details className="text-xs text-slate-500 dark:text-slate-400"><summary className="cursor-pointer">View weekly data</summary><ol className="mt-2 space-y-1">{weeks.map(week => <li key={week.from}>{weekLabel(week.from, week.to)}: {week.count} closures</li>)}</ol></details>
      </>}
      {charts.undatedClosures > 0 && <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">{charts.undatedClosures} closures have no recorded join date and are excluded from this trend.</p>}
    </ChartCard>
    <ChartCard title="Current pipeline by manager" subtitle="Current snapshot · not conversion rates">
      {!charts.pipeline.length ? <p className="py-16 text-center text-sm text-slate-500">No matching account managers.</p> : <div className="space-y-3">{charts.pipeline.map(manager =>
        <div key={manager.id} className="grid grid-cols-[minmax(90px,36%)_1fr_28px] items-center gap-2 text-sm"><ManagerTarget href={managerHref?.(manager.id)} className="truncate text-left hover:underline" title={manager.name} onSelect={() => onSelectManager(manager.id)}>{manager.name}</ManagerTarget>
          <div className="flex h-6 overflow-hidden rounded-sm bg-slate-100 dark:bg-slate-800">{visibleStages.map(stage => (manager[stage.key] ?? 0) > 0 && <ManagerTarget key={stage.key} href={managerHref?.(manager.id)} onSelect={() => onSelectManager(manager.id)} style={{ width: `${(manager[stage.key] ?? 0) * 100 / pipelineMax}%`, backgroundColor: stage.color }} className="h-full shrink-0 overflow-hidden text-center text-xs text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white" label={`${manager.name}: ${manager[stage.key]} ${stage.label}. Open performance.`} title={`${stage.label}: ${manager[stage.key]}`}>{(manager[stage.key] ?? 0) * 100 / pipelineMax >= 12 ? manager[stage.key] : ''}</ManagerTarget>)}</div>
          <span className="text-right tabular-nums">{total(manager)}</span>
        </div>)}</div>}
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-xs">{visibleStages.map(stage => <span key={stage.key} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: stage.color }} />{stage.label}</span>)}</div>
    </ChartCard>
  </div>;
}
