import { Check, CircleHelp, X } from 'lucide-react';
import type { AssessmentCriterion, CandidateAssessment } from '@/lib/submission-contract';
import { AssessmentMeters } from './assessment-meters';
import { criterionLabel } from './requirements-comparison';

export function recordedCandidateValue(row: AssessmentCriterion, assessment: CandidateAssessment): string | null {
  if (row.category === 'experience') {
    if (assessment.candidateSnapshot?.experienceYears != null) return `${assessment.candidateSnapshot.experienceYears} years`;
    const match = /^(\d+(?:\.\d+)?) total years in profile/.exec(row.evidence);
    return match ? `${match[1]} years` : null;
  }
  if (row.category === 'notice') {
    if (assessment.candidateSnapshot?.noticePeriodDays != null) return `${assessment.candidateSnapshot.noticePeriodDays} days`;
    const match = /^(\d+(?:\.\d+)?) days in profile/.exec(row.evidence);
    return match ? `${match[1]} days` : null;
  }
  if (row.category === 'education') return assessment.candidateQualifications?.join(' · ') || null;
  if (row.category === 'location') {
    if (assessment.candidateSnapshot?.currentLocation) return assessment.candidateSnapshot.currentLocation;
    const match = /^Current location: (.+?); confirm work-mode availability\.$/.exec(row.evidence);
    return match?.[1] || null;
  }
  return null;
}

function SavedFinding({ row }: { row: AssessmentCriterion }) {
  const found = ['EVIDENCE_FOUND', 'MEETS'].includes(row.finding);
  const gap = ['NO_EVIDENCE', 'DOES_NOT_MEET'].includes(row.finding);
  const Icon = found ? Check : gap ? X : CircleHelp;
  const label = row.category === 'location' && !found && !gap ? 'Location needs confirmation' : criterionLabel(row);
  const skill = ['primary', 'secondary'].includes(row.category);
  return <span aria-label={`${row.requirement}: ${label}`} className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-[10.5px] ${found ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : gap ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'}`}><Icon aria-hidden className="h-3 w-3 shrink-0" />{skill && <span className="min-w-0 [overflow-wrap:anywhere]">{row.requirement}</span>}<span className={skill ? 'sr-only' : 'font-semibold'}>{label}</span></span>;
}

export function DecisionAssessment({ assessment, overrides }: { assessment: CandidateAssessment; overrides?: Record<string, string> }) {
  const groups = [
    { label: 'Required skills', categories: ['primary'] },
    { label: 'Preferred skills', categories: ['secondary'] },
    { label: 'Eligibility & qualification', categories: ['education'] },
    { label: 'Notice period', categories: ['notice'] },
    { label: 'Experience', categories: ['experience'] },
    { label: 'Location & work mode', categories: ['location'] },
    { label: 'Other criteria', categories: assessment.criteria.map(row => row.category).filter(category => !['primary', 'secondary', 'education', 'notice', 'experience', 'location'].includes(category)) },
  ];
  const score = assessment.score == null || !Number.isFinite(assessment.score) ? null : Math.max(0, Math.min(100, assessment.score));
  const scoreColor = score == null || score < 25 ? '#94a3b8' : score < 50 ? '#f59e0b' : score < 75 ? '#3b82f6' : '#10b981';
  return <details aria-label="Recorded decision assessment" className="mt-3 max-w-4xl rounded-xl border border-border bg-card p-3 [&[open]_.collapsed-match-score]:hidden">
    <summary className="cursor-pointer text-xs font-bold">Assessment at decision<span className="collapsed-match-score ml-2 inline-flex items-center rounded-md border px-2 py-1 text-[10.5px] font-semibold tabular-nums" style={{ color: scoreColor, borderColor: scoreColor }}>{score == null ? 'Match score unavailable' : `${score}% match`}</span><span className="ml-2 rounded bg-muted px-2 py-1 text-[10.5px] font-normal text-muted-foreground">Saved at decision</span></summary>
    <AssessmentMeters assessment={assessment} />
    <div className="mt-3 overflow-hidden rounded-lg border border-border"><div className="grid grid-cols-2 bg-muted/40"><h4 className="p-3 text-xs font-bold text-blue-700 dark:text-blue-300">Job requirements</h4><h4 className="border-l border-border p-3 text-xs font-bold text-blue-700 dark:text-blue-300">Candidate profile</h4></div>{groups.map(group => {
      const rows = assessment.criteria.filter(row => group.categories.includes(row.category));
      return rows.length ? <div key={group.label} className="border-t border-border"><h4 className="bg-muted/20 px-3 py-2 text-xs font-semibold">{group.label}</h4><div className="grid grid-cols-2 text-xs [overflow-wrap:anywhere]"><div className="flex min-w-0 flex-wrap items-start gap-1.5 p-3">{rows.map(row => <span key={row.key} className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[10.5px]">{row.requirement}</span>)}</div><div className="flex min-w-0 flex-wrap items-start gap-2 border-l border-border p-3">{rows.map(row => <div key={row.key} className="min-w-0"><div className="flex flex-wrap items-center gap-2">{!['primary', 'secondary'].includes(row.category) && <span>{recordedCandidateValue(row, assessment) || 'Not recorded'}</span>}<SavedFinding row={row} /></div>{overrides?.[row.key] && <p className="mt-1 text-[10.5px] font-semibold text-blue-700 dark:text-blue-300">Reviewer: {overrides[row.key]}</p>}</div>)}</div></div></div> : null;
    })}</div>
    {!assessment.criteria.length && <p className="mt-3 text-xs text-muted-foreground">No criteria recorded for this decision.</p>}

  </details>;
}
