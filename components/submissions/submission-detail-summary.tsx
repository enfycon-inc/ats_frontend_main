import type {ReactNode} from 'react';
import Link from 'next/link';
import {BriefcaseBusiness, UserRound, Users, ExternalLink} from 'lucide-react';
import type {TrackerSubmission} from '@/lib/submission-contract';
import {UserAvatar} from '@/components/shared/user-identity';
import {CityBadge} from '@/components/shared/city-badge';
import {JobTypeBadge} from '@/components/shared/job-type-badge';
import {staffNameClass} from '@/components/shared/staff-identity-styles';

function Section({title,icon,children}:{title:string;icon:ReactNode;children:ReactNode}) {
  return <section aria-label={title} className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
    <h3 className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 text-sm font-bold">{icon}{title}</h3>
    <div className="space-y-4 p-4">{children}</div>
  </section>;
}
function Field({label,children}:{label:string;children?:ReactNode}) {
  return <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(110px,0.4fr)_minmax(0,1fr)] sm:gap-3">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="min-w-0 whitespace-normal break-words text-xs [overflow-wrap:anywhere]">{children || 'Not provided'}</dd>
  </div>;
}
export function SubmissionDetailSummary({submission:s,canViewJob,compensation}:{submission:TrackerSubmission;canViewJob:boolean;compensation:{label:string;value:string}[]}) {
  const website=s.submissionOrigin==='WEBSITE';
  const staff=[
    {title:'Recruiter',name:website?'Website applicant':s.recruiterName || 'Name unavailable',email:website?null:s.recruiterEmail,avatar:website?null:s.recruiterAvatar,city:website?null:s.recruiterCity},
    {title:'Account manager',name:s.accountManagerName,email:s.accountManagerEmail,avatar:null,city:s.accountManagerCity},
  ];
  return <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
    <Section title="Job & client" icon={<BriefcaseBusiness className="size-4" aria-hidden="true"/>}>
      <dl className="space-y-3">
        <Field label="Job title"><span className="font-semibold">{s.jobTitle || 'Title unavailable'}</span></Field>
        <Field label="Job type">{s.jobType ? <JobTypeBadge jobType={s.jobType}/> : null}</Field>
        <Field label="Job code">{canViewJob && s.jobId ? <Link href={`/job-posting/${encodeURIComponent(s.jobId)}`} className="inline-flex items-center gap-1 font-semibold text-[#1a4fa0] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300">{s.jobCode || 'View job'}<ExternalLink className="size-3 shrink-0" aria-hidden="true"/></Link> : s.jobCode}</Field>
        <Field label="Client">{s.clientName}</Field><Field label="End client">{s.endClientName}</Field>
      </dl>
    </Section>
    <Section title="Candidate" icon={<UserRound className="size-4" aria-hidden="true"/>}>
      <div className="flex items-center gap-2"><UserAvatar user={{name:s.candidateName}}/><span className={`min-w-0 break-words text-sm ${staffNameClass}`}>{s.candidateName || 'Name unavailable'}</span></div>
      <dl className="space-y-3"><Field label="Candidate email">{s.candidateEmail}</Field><Field label="Candidate phone">{s.candidatePhone}</Field><Field label="Candidate location">{s.candidateCurrentLocation}</Field></dl>
      <dl className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">{compensation.map(item=><div key={item.label}><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className="mt-1 break-words text-xs font-semibold">{item.value}</dd></div>)}</dl>
    </Section>
    {staff.map(person=><Section key={person.title} title={person.title} icon={<Users className="size-4" aria-hidden="true"/>}>
      <div className="flex min-w-0 items-center gap-2"><UserAvatar user={{name:person.name,avatar:person.avatar}}/><span className={`min-w-0 break-words text-sm ${staffNameClass}`}>{person.name || 'Name unavailable'}</span></div>
      <dl className="space-y-3"><Field label={`${person.title} email`}>{person.email}</Field>{person.city && <Field label="Staff city"><CityBadge city={person.city}/></Field>}</dl>
    </Section>)}
  </div>;
}
