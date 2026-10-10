import { Check, CircleHelp, X, GraduationCap, Briefcase, MapPin, Code2, Clock, Building2 } from 'lucide-react';
import type { AssessmentCriterion, CandidateAssessment, TrackerSubmission } from '@/lib/submission-contract';

export function criterionLabel(criterion: AssessmentCriterion, submission?: TrackerSubmission): string {
  const found = ['EVIDENCE_FOUND', 'MEETS'].includes(criterion.finding);
  const fails = criterion.finding === 'DOES_NOT_MEET';
  if (criterion.category === 'experience') return found ? 'Meets minimum' : fails ? 'Below minimum' : 'Experience needs confirmation';
  if (criterion.category === 'notice') return found ? 'Within required notice' : fails ? 'Longer than required' : 'Availability needs confirmation';
  if (criterion.category === 'location') return found ? 'Location supported' : submission?.candidateCurrentLocation ? 'City needs confirmation' : 'Location not provided';
  return found ? 'Matched' : ['NO_EVIDENCE', 'DOES_NOT_MEET'].includes(criterion.finding) ? 'Not matched' : 'Needs confirmation';
}

function Finding({ criterion, submission, skill, text = false }: { criterion: AssessmentCriterion; submission?: TrackerSubmission; skill?: boolean; text?: boolean }) {
  const found = ['EVIDENCE_FOUND', 'MEETS'].includes(criterion.finding);
  const gap = ['NO_EVIDENCE', 'DOES_NOT_MEET'].includes(criterion.finding);
  const Icon = found ? Check : gap ? X : CircleHelp;
  const label = criterionLabel(criterion, submission);
  return <span aria-label={`${criterion.requirement}: ${label}`} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10.5px] ${found ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : gap ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'}`}><Icon aria-hidden className="h-3 w-3 shrink-0" />{skill && criterion.requirement}<span className={text ? undefined : "sr-only"}>{label}</span></span>;
}
export function RequirementsComparison({ submission, assessment }: { submission: TrackerSubmission; assessment: CandidateAssessment | null }) {
  const criteria = assessment?.criteria || [];
  const normalized = (value: string) => value.toLowerCase().trim();
  const requirements = [...(submission.jobSkillsRequired || []), ...(submission.jobSecondarySkills || [])];
  const additional = (submission.candidateSkills || []).filter(skill => !requirements.some(value => normalized(value) === normalized(skill)));
  const groups = [
    { title: 'Eligibility & qualification', icon: GraduationCap, categories: ['education'], required: <><p>{submission.jobDegree || 'Qualification not specified'}</p></>, candidate: <><p>{assessment?.candidateQualifications?.join(' · ') || 'Qualification not provided'}</p></> },
    { title: 'Skills', icon: Code2, categories: ['primary', 'secondary'], required: <>{(['primary', 'secondary'] as const).map(category => <div key={category} className="mb-3"><p className="mb-2 font-semibold">{category === 'primary' ? 'Required skills' : 'Preferred skills'}</p><div className="flex flex-wrap gap-1.5">{(category === 'primary' ? submission.jobSkillsRequired : submission.jobSecondarySkills)?.map(skill => <span key={skill} className="rounded border border-border bg-muted/40 px-2 py-1 text-[10.5px]">{skill}</span>)}</div>{!(category === 'primary' ? submission.jobSkillsRequired : submission.jobSecondarySkills)?.length && <p className="text-muted-foreground">Not specified</p>}</div>)}</>, candidate: <><div className="flex flex-wrap gap-1.5">{criteria.filter(row => ['primary', 'secondary'].includes(row.category)).map(row => <Finding key={row.key} criterion={row} skill />)}</div>{!!additional.length && <><p className="mb-2 mt-3 font-semibold">Additional profile skills</p><div className="flex flex-wrap gap-1.5">{additional.map(skill => <span key={skill} className="rounded border border-border bg-muted/40 px-2 py-1 text-[10.5px]">{skill}</span>)}</div></>}{!criteria.some(row => ['primary', 'secondary'].includes(row.category)) && !additional.length && <p className="text-muted-foreground">No skill evidence provided.</p>}</> },
    { title: 'Notice period', icon: Clock, categories: ['notice'], required: <p>{submission.jobNoticePeriod || 'Not specified'}</p>, candidate: <p>{submission.candidateNoticePeriod != null ? `${submission.candidateNoticePeriod} days` : 'Not provided'}</p> },
    { title: 'Experience', icon: Briefcase, categories: ['experience'], required: <p>{submission.jobExperienceMin == null && submission.jobExperienceMax == null ? 'Not specified' : `${submission.jobExperienceMin ?? 'No minimum'}–${submission.jobExperienceMax ?? 'No maximum'} years`}</p>, candidate: <p className="font-semibold">{submission.candidateExperience != null ? `${submission.candidateExperience} years` : 'Not provided'}</p> },
    { title: 'Location', icon: MapPin, categories: ['location'], required: <p>{submission.jobLocation || 'Not specified'}</p>, candidate: <p className="font-semibold">{submission.candidateCurrentLocation || 'Not provided'}</p> },
    { title: 'Work mode', icon: Building2, categories: [], required: <p>{submission.jobWorkMode || 'Not specified'}</p>, candidate: <div className="flex flex-wrap items-center gap-2"><p>Not provided</p>{submission.jobWorkMode && <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10.5px] text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"><CircleHelp aria-hidden className="h-3 w-3" />Availability needs confirmation</span>}</div> },
  ];
  return <section aria-label="Job requirements and candidate comparison" className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="grid grid-cols-2 border-b border-border bg-muted/40 text-xs font-bold"><h2 className="p-3 text-xs font-bold leading-4 text-[#1a4fa0] dark:text-blue-300">Job requirements</h2><h2 className="border-l border-border p-3 text-xs font-bold leading-4 text-[#1a4fa0] dark:text-blue-300">Candidate profile</h2></div>
    {groups.map(group => <div key={group.title} className="border-b border-border last:border-b-0"><h3 className="flex items-center gap-2 bg-muted/20 px-3 py-2 text-xs font-bold"><group.icon aria-hidden className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300" />{group.title}</h3><div className="grid grid-cols-2 text-xs leading-relaxed [overflow-wrap:anywhere]"><div className="min-w-0 p-3">{group.required}</div><div className={`min-w-0 border-l border-border p-3 ${['Notice period', 'Experience', 'Location'].includes(group.title) ? 'flex flex-wrap items-center gap-2' : ''}`}>{group.candidate}{group.title !== 'Skills' && criteria.filter(row => group.categories.includes(row.category)).map(row => <Finding key={row.key} submission={submission} criterion={group.title === 'Location' && submission.jobWorkMode?.toLowerCase() === 'remote' ? { ...row, finding: 'NEEDS_CLARIFICATION' } : row} text={['Notice period', 'Experience', 'Location'].includes(group.title)} />)}</div></div></div>)}

  </section>;
}
