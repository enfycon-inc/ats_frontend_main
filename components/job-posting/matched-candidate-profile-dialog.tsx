"use client";

import useSWR from "swr";
import { BriefcaseBusiness, CalendarClock, CircleAlert, MapPin, UserRound } from "lucide-react";
import { atsApi } from "@/lib/ats-api";
import type { CandidateProfile } from "@/lib/candidate-contract";
import { ResumePages } from "@/components/candidates/resume-pages";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return <div className="min-w-0"><dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-0.5 break-words text-xs font-medium">{value || "—"}</dd></div>;
}

export function MatchedCandidateProfileDialog({ open, candidateId, jobTitle, onOpenChange, onSubmitProfile }: {
  open: boolean;
  candidateId: string | number | null;
  jobTitle: string;
  onOpenChange: (open: boolean) => void;
  onSubmitProfile: (candidateId: string | number) => void;
}) {
  const key = open && candidateId != null ? ["matched-candidate-profile", String(candidateId)] : null;
  const { data, error, isLoading, mutate } = useSWR<CandidateProfile>(key, () => atsApi.candidates.get(candidateId!) as Promise<CandidateProfile>, {
    revalidateOnMount: true,
    revalidateOnFocus: false,
    dedupingInterval: 0,
    shouldRetryOnError: false,
  });

  const resumeId = data?.dbId || data?.id || candidateId;
  const location = [data?.city, data?.state].filter(Boolean).join(", ") || data?.currentLocation;
  const updatedAt = data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : null;

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex h-[92vh] max-h-[900px] w-[min(96vw,1280px)] max-w-none flex-col gap-0 overflow-hidden p-0">
      <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-12 text-left">
        <div className="flex flex-wrap items-center gap-2"><DialogTitle className="text-base">{data?.fullName || "Candidate profile"}</DialogTitle>{data && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">Latest profile</span>}</div>
        <DialogDescription className="text-xs">{data ? [data.jobTitle, data.relevantExperienceYears != null ? `${data.relevantExperienceYears} years relevant experience` : null].filter(Boolean).join(" · ") : `Candidate matched for ${jobTitle}`}{updatedAt && <span className="block pt-1">Last updated {updatedAt}</span>}</DialogDescription>
      </DialogHeader>

      {isLoading && !data ? <div className="min-h-0 flex-1 p-5"><PageLoadingSkeleton variant="detail" /></div>
        : error && !data ? <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center"><CircleAlert className="h-6 w-6 text-amber-600"/><p role="alert" className="text-sm">Could not load the latest candidate profile.</p><Button variant="outline" size="sm" onClick={() => void mutate()}>Retry</Button></div>
        : data ? <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)] lg:overflow-hidden">
          <section aria-label="Candidate resume" className="flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-muted/20 lg:min-h-0"><div className="shrink-0 border-b border-border px-3 py-2 text-xs font-semibold">Latest resume{data.resumeFilename ? ` · ${data.resumeFilename}` : ""}</div><ResumePages candidateId={resumeId!} /></section>
          <div className="min-w-0 space-y-3 lg:overflow-y-auto lg:pr-1">
            <section className="rounded-lg border border-border"><h3 className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-semibold"><UserRound className="h-3.5 w-3.5 text-[#1a4fa0]"/>Personal information</h3><dl className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2"><Detail label="Email" value={data.email}/><Detail label="Phone" value={data.phone}/><Detail label="Location" value={location}/><Detail label="Current title" value={data.jobTitle}/><Detail label="Current company" value={data.currentCompany}/><Detail label="Work authorization" value={data.workAuthorization}/></dl></section>
            <section className="rounded-lg border border-border"><h3 className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-semibold"><BriefcaseBusiness className="h-3.5 w-3.5 text-[#1a4fa0]"/>Experience &amp; availability</h3><dl className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2"><Detail label="Total experience" value={data.experienceYears != null ? `${data.experienceYears} years` : null}/><Detail label="Relevant experience" value={data.relevantExperienceYears != null ? `${data.relevantExperienceYears} years` : null}/><Detail label="Notice period" value={data.noticePeriodDays != null ? `${data.noticePeriodDays} days` : null}/><Detail label="Availability" value={data.availabilityToStart}/><Detail label="Current compensation" value={data.currentCTC}/><Detail label="Expected compensation" value={data.expectedCTC}/></dl></section>
            <section className="rounded-lg border border-border"><h3 className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-semibold"><MapPin className="h-3.5 w-3.5 text-[#1a4fa0]"/>Skills &amp; preferences</h3><div className="space-y-3 p-3"><div className="flex flex-wrap gap-1.5">{data.skills?.length ? data.skills.map(skill => <span key={skill} className="rounded-full bg-blue-50 px-2 py-1 text-[10px] text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">{skill}</span>) : <span className="text-xs text-muted-foreground">No skills listed</span>}</div><dl className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Detail label="Preferred locations" value={data.preferredLocationMode === "REMOTE_ONLY" ? "Remote only" : data.preferredLocations?.join(", ")}/><Detail label="Source" value={data.source}/></dl></div></section>
            {updatedAt && <p className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground"><CalendarClock className="h-3 w-3"/>Profile refreshed {updatedAt}</p>}
          </div>
        </div> : null}

      <DialogFooter className="shrink-0 border-t border-border px-4 py-3"><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button><Button disabled={!data} className="bg-[#1a4fa0] text-white hover:bg-[#154181]" onClick={() => { if (candidateId != null) onSubmitProfile(candidateId); }}>Submit profile to this job</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
