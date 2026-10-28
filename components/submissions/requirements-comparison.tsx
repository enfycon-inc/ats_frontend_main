import { Check, CircleHelp, X } from 'lucide-react';
import type { AssessmentCriterion, CandidateAssessment, TrackerSubmission } from '@/lib/submission-contract';

export type ComparisonProfile = Partial<Pick<TrackerSubmission, 'candidateSkills' | 'candidateCurrentLocation' | 'candidateNoticePeriod' | 'candidateExperience' | 'jobSkillsRequired' | 'jobSecondarySkills' | 'jobDegree' | 'jobNoticePeriod' | 'jobExperienceMin' | 'jobExperienceMax' | 'jobLocation' | 'jobWorkMode'>>;

export function criterionLabel(criterion: AssessmentCriterion, submission?: ComparisonProfile): string {
  const found = ['EVIDENCE_FOUND', 'MEETS'].includes(criterion.finding);
  const fails = criterion.finding === 'DOES_NOT_MEET';
  if (criterion.category === 'experience') return found ? 'Meets minimum' : fails ? 'Below minimum' : 'Experience needs confirmation';
  if (criterion.category === 'notice') return found ? 'Within required notice' : fails ? 'Longer than required' : 'Availability needs confirmation';
  if (criterion.category === 'location') return found ? 'Location supported' : submission?.candidateCurrentLocation ? 'City needs confirmation' : 'Location not provided';
  return found ? 'Matched' : ['NO_EVIDENCE', 'DOES_NOT_MEET'].includes(criterion.finding) ? 'Not matched' : 'Needs confirmation';
}

function Finding({ criterion, submission, skill, text = false }: { criterion: AssessmentCriterion; submission?: ComparisonProfile; skill?: boolean; text?: boolean }) {
  const found = ['EVIDENCE_FOUND', 'MEETS'].includes(criterion.finding);
  const gap = ['NO_EVIDENCE', 'DOES_NOT_MEET'].includes(criterion.finding);
  const Icon = found ? Check : gap ? X : CircleHelp;
  const label = criterionLabel(criterion, submission);
  return <span aria-label={`${criterion.requirement}: ${label}`} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10.5px] ${found ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : gap ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'}`}><Icon aria-hidden className="h-3 w-3 shrink-0" />{skill && criterion.requirement}<span className={text ? undefined : "sr-only"}>{label}</span></span>;
}
export function RequirementsComparison({ submission, assessment }: { submission: ComparisonProfile; assessment: CandidateAssessment | null }) {
  const criteria = assessment?.criteria || [];
  const normalized = (value: string) => value.toLowerCase().trim();
  const candidateSkills = [...new Set((submission.candidateSkills || []).map(skill => skill.trim().replace(/[.,;:]+$/, '')).filter(Boolean).filter((skill, index, all) => all.findIndex(value => normalized(value) === normalized(skill)) === index))];
  const renderRequirements = (category: 'primary' | 'secondary') => {
    const skills = (category === 'primary' ? submission.jobSkillsRequired : submission.jobSecondarySkills) ?? criteria.filter(row => row.category === category).map(row => row.requirement);
    return <div key={category} className="mb-3"><p className="mb-2 font-semibold">{category === 'primary' ? 'Required skills' : 'Preferred skills'}</p><div className="flex flex-wrap gap-1.5">{skills?.map(skill => {
      const criterion = criteria.find(row => row.category === category && normalized(row.requirement) === normalized(skill));
      return <Finding key={skill} criterion={criterion || { key: `${category}:${skill}`, category, requirement: skill, finding: 'NEEDS_CLARIFICATION', evidence: 'Assessment unavailable.' }} skill />;
    })}</div>{!skills?.length && <p className="text-muted-foreground">Not specified</p>}</div>;
  };
  const groups = [
    { title: 'Eligibility & qualification', categories: ['education'], required: <><p>{submission.jobDegree || 'Qualification not specified'}</p></>, candidate: <><p>{assessment?.candidateQualifications?.join(' · ') || 'Qualification not provided'}</p></> },
    { title: 'Skills', categories: ['primary', 'secondary'], required: <>{(['primary', 'secondary'] as const).map(renderRequirements)}</>, candidate: <><p className="mb-2 font-semibold">Candidate skills</p><div className="flex flex-wrap gap-1.5">{candidateSkills.map(skill => <span key={skill} className="rounded border border-border bg-muted/40 px-2 py-1 text-[10.5px]">{skill}</span>)}</div>{!candidateSkills.length && <p className="text-muted-foreground">No candidate skills provided.</p>}</> },
    { title: 'Notice period', categories: ['notice'], required: <p>{submission.jobNoticePeriod || 'Not specified'}</p>, candidate: <p>{submission.candidateNoticePeriod != null ? `${submission.candidateNoticePeriod} days` : 'Not provided'}</p> },
    { title: 'Experience', categories: ['experience'], required: <p>{submission.jobExperienceMin == null && submission.jobExperienceMax == null ? 'Not specified' : `${submission.jobExperienceMin ?? 'No minimum'}–${submission.jobExperienceMax ?? 'No maximum'} years`}</p>, candidate: <p className="font-semibold">{submission.candidateExperience != null ? `${submission.candidateExperience} years` : 'Not provided'}</p> },
    { title: 'Location', categories: ['location'], required: <p>{submission.jobLocation || 'Not specified'}</p>, candidate: <p className="font-semibold">{submission.candidateCurrentLocation || 'Not provided'}</p> },
    { title: 'Work mode', categories: [], required: <p>{submission.jobWorkMode || 'Not specified'}</p>, candidate: <div className="flex flex-wrap items-center gap-2"><p>Not provided</p>{submission.jobWorkMode && <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10.5px] text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"><CircleHelp aria-hidden className="h-3 w-3" />Availability needs confirmation</span>}</div> },
  ];
  return <section aria-label="Job requirements and candidate comparison" className="relative min-w-0 rounded-xl border border-border bg-card p-4 lg:p-5">
    <div className="-mx-4 -mt-4 grid grid-cols-2 overflow-hidden rounded-t-xl border-b border-border bg-blue-50 text-xs font-bold dark:bg-blue-950/40 lg:-mx-5 lg:-mt-5"><h2 className="px-4 py-3 text-xs font-bold leading-4 text-[#1a4fa0] dark:text-blue-300 lg:px-5">Job requirements</h2><h2 className="border-l border-border px-4 py-3 text-xs font-bold leading-4 text-[#1a4fa0] dark:text-blue-300 lg:px-5">Candidate profile</h2></div>
    <div aria-hidden className="pointer-events-none absolute bottom-4 left-1/2 top-0 border-l border-border lg:bottom-5" />
    {groups.map(group => <div key={group.title} className="mt-4"><h3 className="border-b border-border pb-1.5 text-xs font-semibold text-blue-800 dark:text-blue-200">{group.title}</h3><div className="mt-2 grid grid-cols-2 gap-x-4 text-xs leading-relaxed [overflow-wrap:anywhere]"><div className="min-w-0 pr-3 py-1 lg:pr-4">{group.required}</div><div className={`min-w-0 pl-3 py-1 lg:pl-4 ${['Notice period', 'Experience', 'Location'].includes(group.title) ? 'flex flex-wrap items-center gap-2' : ''}`}>{group.candidate}{group.title !== 'Skills' && criteria.filter(row => group.categories.includes(row.category)).map(row => <Finding key={row.key} submission={submission} criterion={group.title === 'Location' && submission.jobWorkMode?.toLowerCase() === 'remote' ? { ...row, finding: 'NEEDS_CLARIFICATION' } : row} text={['Notice period', 'Experience', 'Location'].includes(group.title)} />)}</div></div></div>)}

  </section>;
}
