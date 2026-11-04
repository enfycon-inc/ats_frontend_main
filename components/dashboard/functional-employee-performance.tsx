'use client';
import {useEffect,useState} from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {MapPin,Maximize2} from 'lucide-react';
import {atsApi} from '@/lib/ats-api';
import {useDashboardContext} from '@/contexts/DashboardContext';
import {ClosureCount} from '@/components/shared/closure-count';
import {UserIdentity} from '@/components/shared/user-identity';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import AccountManagerComparison from '@/app/(dashboard)/dashboard/components/account-manager-comparison';
import RecruiterComparison from '@/app/(dashboard)/dashboard/components/recruiter-comparison';
import type {DeliveryAnalytics,ManagerComparisonRow,RecruiterRow} from '@/lib/delivery-dashboard-contract';
import styles from './delivery-city-overview.module.css';
const names:Record<string,string>={BBSR:'Bhubaneswar',VIZAG:'Vizag',UNSPECIFIED:'City not recorded'};
type Row=ManagerComparisonRow|RecruiterRow;
const value=(row:Row,key:string)=>(row as unknown as Record<string,number|null>)[key];
const count=(value:number|null|undefined)=>value==null?'—':value.toLocaleString();
export function FunctionalEmployeePerformance({analytics,values,ready=true}:{analytics:DeliveryAnalytics;values:Record<string,string>;ready?:boolean}) {
  const {profile,selection}=useDashboardContext();
  const [mode,setMode]=useState<'managers'|'recruiters'>('managers');
  const [fullCity,setFullCity]=useState('');
  const managers=mode==='managers';
  const canMembers=profile?.permissions?.includes('user:manage');
  const canJobs=profile?.permissions?.includes('job:view');
  const canSubs=profile?.permissions?.includes('submission:view');
  const scope=[profile?.id,profile?.tenantId,profile?.branchId,profile?.businessUnitId,selection?.active.id,[...(profile?.permissions||[])].sort().join(',')].join(':');
  const query={performance:'1',cities:values.cities||'',...(analytics.from&&analytics.to?{from:new Date(analytics.from).toISOString(),to:new Date(analytics.to).toISOString()}:{}),sort:managers?(canJobs?'postedJobs' as const:'name' as const):(canSubs?'submissions' as const:'name' as const),direction:'desc' as const,limit:10};
  const context=JSON.stringify([query,scope]);
  useEffect(()=>setFullCity(''),[context,mode]);
  const managerData=useSWR(canMembers&&ready&&managers?['employee-performance-managers',scope,query]:null,()=>atsApi.businessUnits.accountManagerDashboard(query),{keepPreviousData:false});
  const recruiterData=useSWR(canMembers&&ready&&!managers?['employee-performance-recruiters',scope,query]:null,()=>atsApi.businessUnits.recruiterDashboard({...query,sort:canSubs?'submissions':'name'}),{keepPreviousData:false});
  if(!canMembers)return null;
  const response=managers?managerData:recruiterData;
  const groups=response.data?.performanceCities;
  const columns=managers?[['postedJobs','Total'],['activeJobs','Active'],['closedJobs','Closed'],['joined','Closure']]:[['assigned','Assigned'],['submissions','Submission'],['rejected','Rejected'],['joined','Closure']];
  const chartKey=managers?'postedJobs':'submissions';
  const maximum=Math.max(1,...(groups||[]).flatMap(group=>group.rows.map(row=>value(row,chartKey)||0)));
  const role=managers?'account managers':'recruiters';
  const detailHref=(row:Row)=>{const q=new URLSearchParams();if(query.from&&query.to){q.set('from',query.from);q.set('to',query.to);}return `/dashboard/${managers?'account-managers':'recruiters'}/${row.id}${q.size?'?'+q:''}`;};
  return <section className={styles.citySection} aria-label="Employee performance" data-city-layout={(groups?.length||0)===1?'single':'grid'}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-bold">Employee performance</h2><div role="tablist" aria-label="Performance responsibility" className="flex rounded-md border p-1">{[['managers','Account Managers'],['recruiters','Recruiters']].map(([key,label])=><Button key={key} role="tab" aria-selected={mode===key} variant={mode===key?'default':'ghost'} onClick={()=>{setFullCity('');setMode(key as typeof mode);}}>{label}</Button>)}</div></div>
    {!ready||response.isLoading?<p role="status" className="p-4 text-sm text-muted-foreground">Loading {role}…</p>:response.error?<div role="alert" className="p-4 text-sm">Could not load {role}. <Button variant="outline" onClick={()=>void response.mutate()}>Retry</Button></div>:<div className={`${styles.cities} ${groups?.length===1?styles.single:''}`}>
      {groups?.map(group=><article key={group.city} className={styles.cityCard}><header className={styles.cityHeader}><h3 className="text-sm font-semibold"><MapPin className="size-4" aria-hidden="true"/>{names[group.city]||group.city}</h3><Button variant="outline" size="sm" onClick={()=>setFullCity(group.city)}><Maximize2 className="size-4" aria-hidden="true"/>View all {role}</Button></header>
        <div className={styles.cityStats}><div className={styles.cityStat}>{managers?'Managers':'Recruiters'}<strong>{group.total}</strong></div>{columns.map(([key,label])=><div key={key} className={styles.cityStat}>{label}<strong>{count(group.summary[key])}</strong></div>)}</div>
        <div className={styles.chart}><h4 className="mb-2 text-sm font-semibold">{managers?'Total jobs':'Submissions'}</h4>{group.rows.map(row=><Link key={row.id} href={detailHref(row)} className={styles.barRow}><span className={styles.barLabel}>{row.name}</span><span className={styles.barTrack}><span className={styles.barFill} style={{width:`${(value(row,chartKey)||0)*100/maximum}%`}}>{count(value(row,chartKey))}</span></span></Link>)}</div>
        <div className="overflow-x-auto"><table className={`${styles.employeeTable} ${styles.functionalTable}`}><thead><tr><th>{managers?'Account manager':'Recruiter'}</th>{columns.map(([key,label])=><th key={key} title={key==='joined'?'Joined candidates in selected period':key==='assigned'?'Unique currently active direct and permitted pod jobs':key==='rejected'?'Rejected at internal, interview or final stage; counted once':undefined}>{label}</th>)}</tr></thead><tbody>{group.rows.map(row=><tr key={row.id}><td><Link href={detailHref(row)}><UserIdentity size="table" user={{fullName:row.name,email:row.email,avatar:row.avatar,city:row.city}}/></Link></td>{columns.map(([key])=><td key={key}>{key==='joined'?<ClosureCount value={value(row,key)}/>:count(value(row,key))}</td>)}</tr>)}</tbody></table></div><p className="border-t px-3 py-2 text-xs text-muted-foreground">Top {group.rows.length} of {group.total} {role} · Expand for the full table</p>
      </article>)}
    </div>}
    {ready&&!response.isLoading&&!response.error&&groups?.length===0&&<p className="p-4 text-sm text-muted-foreground">No {role} match the selected cities.</p>}
    <p className="text-xs text-muted-foreground">Closure means joined candidates. Assigned counts unique active direct/permitted pod jobs. Rejected includes internal, interview and final rejection, counted once per submission.</p>
    <Dialog open={!!fullCity&&ready} onOpenChange={open=>{if(!open)setFullCity('');}}><DialogContent className={styles.fullDialog}><DialogTitle className="flex items-center gap-2 text-lg font-semibold"><MapPin className="size-5" aria-hidden="true"/>{names[fullCity]||fullCity} · {managers?'Account Managers':'Recruiters'}</DialogTitle><DialogDescription>Full comparison table for the selected city and dashboard period.</DialogDescription><div className="min-h-0 flex-1 overflow-auto">{fullCity&&(managers?<AccountManagerComparison embedded initialFilters={{...query,cities:fullCity,sort:canJobs?'postedJobs':'name'}}/>:<RecruiterComparison embedded initialFilters={{...query,cities:fullCity,sort:canSubs?'submissions':'name'}}/>)}</div></DialogContent></Dialog>
  </section>;
}
