import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ManagerDashboardCharts } from '@/lib/delivery-dashboard-contract';

export function PerformanceCard({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return <section aria-label={title} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{caption}</p><div className="mt-4">{children}</div></section>;
}
const date = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export function PerformanceTrend({ title, values, scope, bars = false, compact = false }: { title: string; values: ManagerDashboardCharts['weekly'] | null; scope: ManagerDashboardCharts['weeklyScope']; bars?: boolean; compact?: boolean }) {
  const max = Math.max(4, Math.ceil(Math.max(0, ...(values ?? []).map(point => point.count)) / 4) * 4);
  const x = (i: number) => values?.length === 1 ? 255 : 50 + i * 400 / Math.max(1, (values?.length ?? 0) - 1);
  const bottom = compact ? 90 : 180;
  const y = (count: number) => bottom - (compact ? 70 : 160) * count / max;
  const every = Math.max(1, Math.ceil((values?.length ?? 0) / 5));
  return <PerformanceCard title={title} caption={`${scope === 'last-12-weeks' ? 'Last 12 weeks' : 'Selected period'} · Recorded dates · 7-day intervals`}>
    {!values || !values.length ? <p className="py-16 text-center text-sm text-slate-500">{values ? 'No elapsed dates in this period.' : 'Additional read permission is required.'}</p> : <>
      <svg viewBox={`0 0 500 ${compact ? 130 : 220}`} className={`${compact ? 'h-auto' : 'min-h-52'} w-full text-slate-500 dark:text-slate-400`} role="img" aria-label={`${title}: ${values.reduce((sum, point) => sum + point.count, 0)}`}>
        {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="50" x2="450" y1={y(i * max / 4)} y2={y(i * max / 4)} stroke="currentColor" opacity="0.18" /><text x="38" y={y(i * max / 4) + 4} textAnchor="end" fill="currentColor" fontSize="15">{i * max / 4}</text></g>)}
        {!bars && <polyline points={values.map((point, i) => `${x(i)},${y(point.count)}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth="2.5" />}
        {values.map((point, i) => <g key={point.from}>{bars ? <rect x={x(i) - Math.min(18, 140 / values.length)} y={y(point.count)} width={Math.min(36, 280 / values.length)} height={bottom - y(point.count)} fill="#16a34a"><title>{`${date(point.from)}: ${point.count}`}</title></rect> : <circle cx={x(i)} cy={y(point.count)} r="4" fill="#2563eb"><title>{`${date(point.from)}: ${point.count}`}</title></circle>}
          {(i % every === 0 || i === values.length - 1) && <text x={x(i)} y={bottom + 25} textAnchor="middle" fill="currentColor" fontSize="15">{date(point.from)}</text>}
        </g>)}
      </svg>
      <details className="text-xs text-slate-500 dark:text-slate-400"><summary className="cursor-pointer">View data · Total {values.reduce((sum, point) => sum + point.count, 0)}</summary><ol className="mt-2 space-y-1">{values.map(point => <li key={point.from}>{date(point.from)} – {date(new Date(Date.parse(point.to) - 1).toISOString())}: {point.count}</li>)}</ol></details>
    </>}
  </PerformanceCard>;
}
export function ManagerPipeline({ pipeline }: { pipeline: ManagerDashboardCharts['pipeline'][number] | null }) {
  const rows = pipeline ? [
    { label: 'Review', value: pipeline.review, color: '#d97706' }, { label: 'L1', value: pipeline.l1, color: '#2563eb' },
    { label: 'L2', value: pipeline.l2, color: '#0d9488' }, { label: 'L3', value: pipeline.l3, color: '#7c3aed' }, { label: 'Offers', value: pipeline.offers, color: '#64748b' },
  ].filter(row => row.value !== null) : [];
  const max = Math.max(1, ...rows.map(row => row.value ?? 0));
  return <PerformanceCard title="Current pipeline" caption="Current snapshot · not historical conversion rates"><div className="space-y-4">{rows.map(row => <div key={row.label} className="grid grid-cols-[65px_1fr_32px] items-center gap-2 text-sm"><span>{row.label}</span><div className="h-6 rounded-sm bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-sm" style={{ width: `${(row.value ?? 0) * 100 / max}%`, backgroundColor: row.color }} /></div><span className="text-right tabular-nums">{row.value}</span></div>)}{!rows.length && <p className="py-16 text-center text-sm text-slate-500">Additional submission read permission is required.</p>}</div></PerformanceCard>;
}
export function ClientClosures({ rows }: { rows: { id: string; name: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map(row => row.count));
  return <PerformanceCard title="Closures by client" caption="Selected client group · Top 5 · Joined candidates"><div className="space-y-4">{rows.map(row => <div key={row.id} className="grid grid-cols-[minmax(90px,35%)_1fr_28px] items-center gap-2 text-sm"><Link href={`/clients/${row.id}`} className="truncate text-[#1a4fa0] hover:underline dark:text-blue-400" title={row.name}>{row.name}</Link><div className="h-6 rounded-sm bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-sm bg-[#1a4fa0] dark:bg-blue-500" style={{ width: `${row.count * 100 / max}%` }} /></div><span className="text-right tabular-nums">{row.count}</span></div>)}{!rows.length && <p className="py-16 text-center text-sm text-slate-500">No permitted client outcome data.</p>}</div></PerformanceCard>;
}
