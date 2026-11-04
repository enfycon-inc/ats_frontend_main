'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { atsApi } from '@/lib/ats-api';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeliveryStageFilters, DeliveryStageWorkspace } from './delivery-stage-workspace';
import { deliveryPeriodCaption } from '@/lib/delivery-period-caption';
import type { DeliveryStage, DeliveryAnalytics } from '@/lib/delivery-dashboard-contract';
import styles from './delivery-city-overview.module.css';

export type DeliveryDrilldown = { kind:'submissions'; stage:DeliveryStage; status?:string; employee?:string } | {kind:'jobs'; filters:Record<string,string>};
function Pager({ page,total,pending,onChange }:{page:number;total:number;pending:boolean;onChange:(page:number)=>void}) {
  return <div className="flex items-center justify-between gap-3 border-t p-3 text-sm"><span>{total ? `${(page-1)*10+1}–${Math.min(page*10,total)} of ${total}` : '0 results'}</span><div className="flex gap-2"><Button variant="outline" disabled={pending || page===1} onClick={()=>onChange(page-1)}>Previous</Button><Button variant="outline" disabled={pending || page*10>=total} onClick={()=>onChange(page+1)}>Next</Button></div></div>;
}
export function DeliveryDrilldownDialog({ selection,scope,globalFilters,analytics,onClose,onReview }:{selection:DeliveryDrilldown;scope:string;globalFilters:Record<string,string>;analytics:DeliveryAnalytics;onClose:()=>void;onReview?:(id:string)=>void}) {
  const [page,setPage]=useState(1);
  const [filters,setFilters]=useState<Record<string,string>>(selection.kind==='jobs'?selection.filters:{...(selection.status?{status:selection.status}:{}),...(selection.employee?{submittedBy:selection.employee}:{})});
  const [applied,setApplied]=useState(filters);
  useEffect(()=>{const timer=setTimeout(()=>{setApplied(filters);setPage(1);},300);return()=>clearTimeout(timer);},[filters]);
  const globals=Object.fromEntries(Object.entries(globalFilters).filter(([key])=>['period','from','to','cities'].includes(key)));
  const request={...globals,...applied};
  const isJobs=selection.kind==='jobs';
  const submissions=useSWR(!isJobs?['delivery-submission-popup',scope,selection,request,page]:null,()=>atsApi.businessUnits.deliveryDashboard(selection.kind==='submissions'?selection.stage:'all',page,1,request),{keepPreviousData:false});
  const jobs=useSWR(isJobs?['delivery-job-popup',scope,request,page]:null,()=>atsApi.businessUnits.deliveryJobs({...request,jobPage:String(page)}),{keepPreviousData:false});
  const response=isJobs?jobs:submissions;
  const pending=response.isLoading || JSON.stringify(filters)!==JSON.stringify(applied);
  const error=response.error;
  const total=isJobs?jobs.data?.total:submissions.data?.submissionTotal;
  const stage=selection.kind==='submissions'?selection.stage:'all';
  const statusLabel=(value:string)=>value==='JOIN'?'Joined':value==='AWAITING_FEEDBACK'?'Awaiting result':value.toLowerCase().replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
  const title=isJobs?(filters.jobStatus?`${statusLabel(filters.jobStatus)} jobs`:filters.jobPriority?`${statusLabel(filters.jobPriority)} jobs`:filters.jobType?`${filters.jobType} jobs`:'All jobs'):selection.kind==='submissions'?(selection.employee?'Employee submissions':filters.status?`${selection.stage==='final'?'':selection.stage.toUpperCase()+' · '}${statusLabel(filters.status)} candidates`:selection.stage==='offers'?'Offers received':selection.stage==='review'?'Internal review':selection.stage==='all'?'All submissions':selection.stage==='final'?'Final outcomes':`${selection.stage.toUpperCase()} submissions`):'';
  const change=(key:string,value:string)=>{setFilters(current=>({...current,[key]:value}));setPage(1);};
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className={styles.fullDialog}>
    <DialogTitle className="pr-8 text-lg font-semibold">{title}{!pending && total!=null?` · ${total}`:''}</DialogTitle>
    <DialogDescription>{deliveryPeriodCaption(globalFilters,analytics.timezone)} · {globalFilters.cities || 'All cities'}{['today','week','month','year'].includes(globalFilters.period||'')?' · Through today':''}</DialogDescription>
    {isJobs?<div className="grid gap-3 sm:grid-cols-4"><Input aria-label="Search jobs" placeholder="Job title or code" value={filters.jobSearch||''} onChange={e=>change('jobSearch',e.target.value)}/>{[['jobStatus','Status',['ACTIVE','CLOSED','HOLD','DRAFT']],['jobPriority','Priority',['HOT','WARM','COLD']],['jobType','Job type',Object.keys(analytics.jobCounts?.types||{})]].map(([key,label,options])=><label key={key as string} className="text-sm">{label}<select className={styles.control} value={filters[key as string]||''} onChange={e=>change(key as string,e.target.value)}><option value="">All</option>{(options as string[]).map(value=><option key={value} value={value}>{statusLabel(value)}</option>)}</select></label>)}</div>:<DeliveryStageFilters stage={stage} scope={scope} values={filters} onChange={change}/>}
    <div className="min-h-0 flex-1 overflow-auto" aria-busy={pending}>
      {error?<div role="alert" className="p-4 text-sm">Could not load results. <Button variant="outline" onClick={()=>void response.mutate()}>Retry</Button></div>:pending?<p role="status" className="p-4 text-sm">Loading {isJobs?'jobs':'submissions'}…</p>:isJobs?<table className="w-full text-left text-sm"><thead className="bg-slate-50 dark:bg-slate-800"><tr>{['Job / code','Client','Posted by','Posted date','Status','Priority','Type','Submissions','Action'].map(label=><th key={label} className="p-3 text-xs font-semibold">{label}</th>)}</tr></thead><tbody>{jobs.data?.items.map(job=><tr key={job.id} className="border-t align-top"><td className="p-3"><Link className="font-semibold text-blue-700" href={`/job-posting/${job.id}`}>{job.jobTitle}</Link><p className="text-xs text-muted-foreground">{job.jobCode}</p></td><td className="p-3">{job.clientName||'Client unavailable'}</td><td className="p-3"><p>{job.postedBy.name}</p><p className="text-xs text-muted-foreground">{job.postedBy.email||'Email unavailable'}</p></td><td className="p-3">{new Date(job.postedAt).toLocaleDateString(undefined,{timeZone:analytics.timezone})}</td><td className="p-3">{statusLabel(job.status)}</td><td className="p-3">{statusLabel(job.priority)}</td><td className="p-3">{job.jobType}</td><td className="p-3">{job.submissions??'—'}</td><td className="p-3"><Button asChild variant="outline" size="sm"><Link href={`/job-posting/${job.id}`}>Open job</Link></Button></td></tr>)}</tbody></table>:<DeliveryStageWorkspace submissions={submissions.data?.submissions||[]} onReview={stage==='review'?onReview:undefined}/>}
      {!pending && !error && total===0 && <p className="p-4 text-sm text-muted-foreground">No {isJobs?'jobs':'submissions'} match these filters.</p>}
    </div><Pager page={page} total={total||0} pending={pending||!!error} onChange={setPage}/>
  </DialogContent></Dialog>;
}
