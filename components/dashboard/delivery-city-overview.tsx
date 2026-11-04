'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Users, ChevronRight, BriefcaseBusiness, CircleCheck, Archive, Pause, Layers3, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/shared/searchable-select';
import type { DeliveryAnalytics, DeliveryStage } from '@/lib/delivery-dashboard-contract';
import styles from './delivery-city-overview.module.css';
import { DeliveryToolbar } from './delivery-toolbar';
import { FunctionalEmployeePerformance } from './functional-employee-performance';
import { deliveryPeriodCaption } from '@/lib/delivery-period-caption';

const cityNames: Record<string, string> = { BBSR: 'Bhubaneswar', VIZAG: 'Vizag', PUNE: 'Pune', BENGALURU: 'Bengaluru', HYDERABAD: 'Hyderabad', UNSPECIFIED: 'City not recorded' };
const cityName = (city: string) => cityNames[city] || city;
const number = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString();
const name = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/(^|\s)\S/g, letter => letter.toUpperCase());
const control = `${styles.control} text-sm`;
const presets = [['all', 'All time'], ['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['previousMonth', 'Previous month'], ['year', 'This year'], ['previousYear', 'Previous year'], ['custom', 'Custom range']];

export function DeliveryGlobalFilters({ analytics, values, onChange, onOffers }: { onOffers: () => void; analytics: DeliveryAnalytics; values: Record<string, string>; onChange: (patch: Record<string, string>) => void }) {
  const [from, setFrom] = useState(values.from || ''), [to, setTo] = useState(values.to || '');
  const [customOpen, setCustomOpen] = useState(false);
  const showCustom = customOpen || values.period === 'custom';
  const invalid = !from || !to || from > to;

  return <DeliveryToolbar><section aria-label="Global dashboard filters" className={styles.toolbar}>
    <div className={styles.filterRow}>
      <label className={styles.periodField}><span className="text-xs font-medium">Period</span><select className={control} value={customOpen ? 'custom' : values.period || 'all'} onChange={event => { if (event.target.value === 'custom') { setCustomOpen(true); } else { setCustomOpen(false); onChange({ period: event.target.value, from: '', to: '' }); } }}>{presets.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{!showCustom && <span className="text-xs text-muted-foreground">{deliveryPeriodCaption(values, analytics.timezone)}</span>}</label>
      {showCustom && <>
        <label className={styles.dateField}><span className="text-xs font-medium">From</span><Input className={control} type="date" required max={to || undefined} value={from} onChange={event => setFrom(event.target.value)} /></label>
        <label className={styles.dateField}><span className="text-xs font-medium">To</span><Input className={control} type="date" required min={from || undefined} value={to} aria-invalid={!!from && !!to && from > to} onChange={event => setTo(event.target.value)} /></label>
        <Button className={styles.applyRange} size="sm" disabled={invalid} onClick={() => { setCustomOpen(false); onChange({ period: 'custom', from, to }); }}>Apply</Button>
        {from && to && from > to && <p role="alert" className="sr-only">End date must follow start date.</p>}
      </>}

      {analytics.cities !== null && <><div className={styles.cityField}><span className="text-xs font-medium">Employee city</span><SearchableSelect showSelectedTags options={analytics.availableCities.map(city => ({ id: city, name: cityName(city) }))} value="" onValueChange={() => {}} values={values.cities ? values.cities.split(',') : []} onValuesChange={cities => onChange({ cities: cities.join(','), employeePage: '1', employeeCity: '' })} placeholder="All cities" selectionLabel="cities" searchPlaceholder="Search employee cities" /></div>
</>}

    </div>

  </section></DeliveryToolbar>;
}

export function DeliveryRoundOverview({ analytics, onSelect, jobHref }: { jobHref: (filters: Record<string,string>) => string; analytics: DeliveryAnalytics; onSelect: (stage: DeliveryStage, status?: string) => void }) {
  const jobs = analytics.jobCounts;
  return <div className={styles.overview}>
    {jobs && <section aria-label="Job overview" className={styles.summary}>
      <div className={styles.summaryTop}>
        <div className="flex flex-wrap items-center gap-3"><h2 className={styles.summaryTitle} title="Jobs posted in the selected period · current status"><BriefcaseBusiness className="size-5" aria-hidden="true" />Job overview</h2></div>
        <div className={styles.jobTiles}>
          <Link href={jobHref({})} className={`${styles.jobTile} ${styles.totalTile}`}><BriefcaseBusiness aria-hidden="true" /><div><span>Total jobs</span><strong>{number(jobs.total)}</strong></div></Link>
          <Link href={jobHref({jobStatus:'ACTIVE'})} className={`${styles.jobTile} ${styles.activeTile}`}><CircleCheck aria-hidden="true" /><div><span>Active</span><strong>{number(jobs.statuses.ACTIVE || 0)}</strong></div></Link>
          <Link href={jobHref({jobStatus:'CLOSED'})} className={`${styles.jobTile} ${styles.closedTile}`}><Archive aria-hidden="true" /><div><span>Closed</span><strong>{number(jobs.statuses.CLOSED || 0)}</strong></div></Link>
          <Link href={jobHref({jobStatus:'HOLD'})} className={`${styles.jobTile} ${styles.holdTile}`}><Pause aria-hidden="true" /><div><span>On hold</span><strong>{number(jobs.statuses.HOLD || 0)}</strong></div></Link>
          {Object.entries(jobs.statuses).filter(([status]) => !['ACTIVE','CLOSED','HOLD','DRAFT'].includes(status)).map(([status,count]) => <Link key={status} href={jobHref({jobStatus:status})} className={`${styles.jobTile} ${styles.closedTile}`}><BriefcaseBusiness aria-hidden="true" /><div><span>{name(status)}</span><strong>{number(count)}</strong></div></Link>)}
        </div>
      </div>
      <div className={styles.summaryBottom}>
        <div className={styles.group}><h3 className={styles.groupTitle}>Priority · active jobs</h3><div className={styles.inlineStats}>{['HOT', 'WARM', 'COLD', ...Object.keys(jobs.priorities).filter(value => !['HOT', 'WARM', 'COLD'].includes(value))].map(priority => <Link href={jobHref({jobPriority:priority})} className={styles.priorityChip} data-priority={priority} key={priority}>{name(priority)}<strong>{number(jobs.priorities[priority] || 0)}</strong></Link>)}</div></div>
        <div className={styles.group}><h3 className={styles.groupTitle}>Job types</h3><div className={styles.inlineStats}>{Object.entries(jobs.types).map(([type, count]) => <Link href={jobHref({jobType:type})} className={styles.typeChip} key={type}>{type}<strong>{number(count)}</strong></Link>)}</div></div>
        <button onClick={() => onSelect("all")} className={styles.miniCounter}><Layers3 className="size-4" aria-hidden="true" /><span>Pipeline</span><strong>{number(analytics.totalSubmissions)}</strong></button><div className={styles.miniCounter} title="Website applications"><Globe className="size-4" aria-hidden="true" /><span>Website</span><strong>{number(analytics.websiteApplications)}</strong></div>
      </div>
    </section>}
    {analytics.rounds && <section aria-label="Round outcomes" className={styles.pipeline}>
      <header className={styles.pipelineHeader}><h2 className="text-sm font-bold"><Users className="size-4" aria-hidden="true" />Interview pipeline</h2><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => onSelect('all')}>All submissions {number(analytics.totalSubmissions)}</Button><Button variant="outline" size="sm" onClick={() => onSelect('review')}>Internal review {number(analytics.review)}</Button></div></header>
      <div className={styles.roundGrid}>{(['l1','l2','l3'] as const).map(round => <section key={round} className={styles.roundCard}><h3 className="text-sm font-semibold">{round.toUpperCase()}</h3>{[['PENDING','Pending'],['SCHEDULED','Scheduled'],['AWAITING_FEEDBACK','Awaiting result'],['CLEARED','Cleared'],['REJECTED','Rejected']].map(([status,label]) => <button key={status} className="text-sm" onClick={() => onSelect(round,status)}><span>{label}</span><strong className="tabular-nums">{number(analytics.rounds![round][status] || 0)}</strong></button>)}</section>)}</div>
      <div className={styles.finalStrip}><h3 className="text-sm font-semibold">Final</h3>{[['SELECTED','Selected'],['OFFER','Offer'],['JOIN','Joined']].map(([status,label]) => <button key={status} className="text-sm" data-outcome={status} onClick={() => onSelect('final',status)}><span>{label} <strong className="tabular-nums">{number(analytics.final?.[status] || 0)}</strong></span><ChevronRight className="size-4" aria-hidden="true" /></button>)}</div>
      <p className="px-4 pb-3 text-xs text-muted-foreground">Round counts overlap as candidates progress.</p>
    </section>}

  </div>;
}

export function DeliveryCityComparison({analytics,values,ready=true}:{analytics:DeliveryAnalytics;values:Record<string,string>;ready?:boolean}) {
  return <FunctionalEmployeePerformance analytics={analytics} values={values} ready={ready}/>;
}

