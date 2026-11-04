"use client";
import {CityBadge} from '@/components/shared/city-badge';
import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DeliveryFilterPicker } from './delivery-filter-picker';
import type { DeliveryDashboard, DeliveryStage } from '@/lib/delivery-dashboard-contract';

type Submission = NonNullable<DeliveryDashboard['submissions']>[number];
const label = (value: string) => value === 'AWAITING_FEEDBACK' ? 'Awaiting result' : value.replaceAll('_', ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase());
const date = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
function Identity({ person }: { person: Submission['postedBy'] }) {
  return <div><p className="flex flex-wrap items-center gap-1.5 font-medium">{person.name}<CityBadge city={person.city}/></p><p className="mt-1 break-all text-[11px] text-slate-500">{person.email || 'Email unavailable'}</p></div>;
}
export function DeliveryStageFilters({ stage, scope, values, onChange }: { stage: DeliveryStage; scope: string; values: Record<string, string>; onChange: (key: string, value: string) => void }) {
  const round = ['l1', 'l2', 'l3'].includes(stage);
  return <div className="grid items-start gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-5">
    <label className="flex min-w-0 flex-col gap-2 text-xs font-medium"><span className="leading-4">Search</span><Input value={values.search || ''} onChange={event => onChange('search', event.target.value)} placeholder="Candidate, job code or title" className="h-11 min-h-11 text-xs" /></label>
    {(['client', 'postedBy', 'submittedBy'] as const).map(kind => <div key={kind} className="flex min-w-0 flex-col gap-2 text-xs font-medium"><p className="leading-4">{kind === 'client' ? 'Client' : kind === 'postedBy' ? 'Posted by' : 'Submitted by'}</p><DeliveryFilterPicker key={`${scope}:${stage}:${kind}`} kind={kind} scope={scope} value={values[kind] || ''} onChange={value => onChange(kind, value)} /></div>)}
    <label className="flex min-w-0 flex-col gap-2 text-xs font-medium"><span className="leading-4">{round ? stage.toUpperCase() : 'Final'} status</span><select value={values.status || ''} onChange={event => onChange('status', event.target.value)} className="block h-11 min-h-11 w-full rounded-md border bg-white px-3 text-xs dark:bg-slate-900"><option value="">All statuses</option>{(round ? ['PENDING', 'SCHEDULED', 'AWAITING_FEEDBACK', 'CLEARED', 'REJECTED'] : stage === 'final' ? ['SELECTED', 'OFFER', 'JOIN'] : ['PENDING_APPROVAL', 'SELECTED', 'OFFER', 'JOIN', 'REJECTED', 'NOT_SELECTED', 'WITHDRAWN']).map(status => <option key={status} value={status}>{label(status)}</option>)}</select></label>
  </div>;
}
export function DeliveryStageWorkspace({ submissions, onReview, compact = false }: { submissions: Submission[]; onReview?: (id: string) => void; compact?: boolean }) {
  const [selected, setSelected] = useState<Submission | null>(null);
  return <>{compact ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-100"><tr>{['Job code / Client','Poster name / Email','Submitter name / Email','Status'].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>{submissions.map(item => <tr key={item.id} className="border-t"><td><button className="text-left text-blue-800" title={item.jobTitle + ' · ' + item.candidateName} onClick={() => setSelected(item)}>{item.jobCode} / {item.clientName || 'Client unavailable'}</button></td><td>{item.postedBy.name} / {item.postedBy.email || 'Email unavailable'}</td><td>{item.submittedBy.name} / {item.submittedBy.email || 'Email unavailable'}</td><td><button className="text-left text-blue-800" onClick={() => setSelected(item)}>{label(item.stageStatus)}</button>{onReview && <button className="ml-2 text-blue-700" onClick={() => onReview(item.id)}>Review</button>}</td></tr>)}</tbody></table></div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-900"><tr>{['Candidate', 'Job / Client', 'Posted by', 'Submitted by', 'Stage status', 'Last update', 'Action'].map(title => <th key={title} className="px-4 py-3 font-medium">{title}</th>)}</tr></thead><tbody>{submissions.map(item => <tr key={item.id} className="border-t border-slate-100 align-top hover:bg-blue-50/40 dark:border-slate-800">
    <td className="px-4 py-4"><button className="text-left font-semibold text-blue-700 hover:underline" onClick={() => setSelected(item)}>{item.candidateName}</button><p className="mt-1 text-[11px] text-slate-500">{item.candidateEmail || 'Email unavailable'}</p></td>
    <td className="min-w-44 px-4 py-4"><Link className="font-semibold text-blue-700 hover:underline" href={`/job-posting/${item.jobId}`}>{item.jobTitle}</Link><p className="mt-1 text-[11px]">{item.jobCode}</p><p className="mt-1 text-[11px] text-slate-500">{item.clientName || 'Client unavailable'}</p></td>
    <td className="min-w-40 px-4 py-4"><Identity person={item.postedBy} /><p className="mt-1 text-[10px] text-slate-500">{date(item.postedAt)}</p></td>
    <td className="min-w-40 px-4 py-4"><Identity person={item.submittedBy} /><p className="mt-1 text-[10px] text-slate-500">{date(item.submittedAt)}</p></td>
    <td className="px-4 py-4"><span className="inline-block rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] text-blue-800">{label(item.stageStatus)}</span></td>
    <td className="px-4 py-4 text-[11px] text-slate-500">{date(item.updatedAt)}{item.offeredAt && <p className="mt-1">Offer received · {date(item.offeredAt)}</p>}</td>
    <td className="px-4 py-4"><div className="flex flex-col items-start gap-2"><Link className="font-semibold text-blue-700 hover:underline" href={`/utility/submissions?submission=${encodeURIComponent(item.id)}`}>Open submission</Link><Link className="font-semibold text-blue-700 hover:underline" href={`/job-posting/${item.jobId}`}>Open job</Link><button className="text-blue-700 hover:underline" onClick={() => setSelected(item)}>Details</button>{onReview && <button className="font-semibold text-blue-700" onClick={() => onReview(item.id)}>Review</button>}</div></td>
  </tr>)}</tbody></table></div>}
  <Sheet open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><SheetContent className="flex w-full flex-col overflow-y-auto bg-white sm:max-w-lg dark:bg-slate-950"><SheetTitle>Submission details</SheetTitle><SheetDescription>Job ownership, submission source, and stage progression.</SheetDescription>{selected && <div className="space-y-5 text-xs">
    <section className="border-b pb-4"><h3 className="text-base font-semibold">{selected.candidateName}</h3><p className="mt-1 text-slate-500">{selected.candidateEmail || 'Email unavailable'}</p></section>
    <section className="space-y-2"><h3 className="font-semibold">{selected.jobTitle}</h3><p>{selected.jobCode}</p><p className="text-slate-500">{selected.clientName || 'Client unavailable'}</p></section>
    <section className="space-y-4 border-y py-4"><div><h3 className="mb-2 font-semibold">Job posted by</h3><Identity person={selected.postedBy} /><p className="mt-1 text-slate-500">{date(selected.postedAt)}</p></div><div><h3 className="mb-2 font-semibold">Submitted by</h3><Identity person={selected.submittedBy} /><p className="mt-1 text-slate-500">{date(selected.submittedAt)}</p></div><p>Source: {label(selected.origin)}</p></section>
    <section><h3 className="mb-3 font-semibold">Stage progression</h3>{selected.rounds.map(round => <div key={round.name} className="flex justify-between gap-3 border-b py-3"><span className="font-medium">{round.name}</span><div className="text-right"><p>{round.status ? label(round.status) : 'Not recorded'}</p>{round.date && <p className="mt-1 text-slate-500">{date(round.date)}</p>}</div></div>)}<div className="flex justify-between py-3"><span>Final status</span><span>{label(selected.finalStatus)}</span></div></section>
    <div className="flex gap-3"><Button asChild size="sm" variant="outline"><Link href={`/job-posting/${selected.jobId}`}>Open job</Link></Button><Button asChild size="sm"><Link href={`/utility/submissions?submission=${encodeURIComponent(selected.id)}`}>Open submission</Link></Button></div>
  </div>}</SheetContent></Sheet></>;
}
