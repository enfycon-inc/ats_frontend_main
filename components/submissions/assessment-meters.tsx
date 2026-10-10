import type { CandidateAssessment } from '@/lib/submission-contract';

export function AssessmentMeter({ label, value, count = false, description }: { label: string; value: number | null; count?: boolean; description?: string }) {
  const score = value == null || !Number.isFinite(value) ? null : Math.max(0, Math.min(100, value));
  const color = score == null || score < 25 ? '#94a3b8' : score < 50 ? '#f59e0b' : score < 75 ? '#3b82f6' : '#10b981';
  const display = count ? value : score;
  const ringColor = count ? value === 0 ? '#10b981' : '#f59e0b' : color;
  return <div className="flex min-w-0 flex-col items-center gap-2 text-center" title={description}>
    <div role="img" aria-label={`${label}: ${display == null ? 'Unavailable' : `${display}${count ? '' : '%'}`}`} className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{ background: count ? ringColor : `conic-gradient(${color} ${(score ?? 0) * 3.6}deg, var(--meter-track, #e5e7eb) 0deg)` }}>
      <div className="absolute inset-[3px] grid place-items-center rounded-full bg-card"><span className="text-sm font-bold tabular-nums" style={{ color: ringColor }}>{display == null ? '—' : `${display}${count ? '' : '%'}`}</span></div>
    </div>
    <span className="text-xs font-semibold">{label}</span>
  </div>;
}

export function AssessmentMeters({ assessment }: { assessment: CandidateAssessment }) {
  return <div className="mt-3 grid grid-cols-3 items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
    <AssessmentMeter label="Match score" value={assessment.score} />
    <AssessmentMeter label="Assessment coverage" value={assessment.coverage} description="How much of the assessment could be calculated from the available candidate information." />
    <AssessmentMeter label="Needs review" count value={assessment.criteria.filter(row => !['EVIDENCE_FOUND', 'MEETS'].includes(row.finding)).length} description="Criteria with missing information, a mismatch, or a need for confirmation." />
  </div>;
}
