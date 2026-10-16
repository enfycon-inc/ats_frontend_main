import { displaySubmissionCompensation } from '@/lib/submission-compensation';
import { formatCandidateAmount } from '@/lib/candidate-submission-input';
import type { TrackerSubmission } from '@/lib/submission-contract';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function SubmittedCandidateDetails({ submission }: { submission: TrackerSubmission }) {
  const verified = submission.verifiedCandidate;
  const text = (key: string) => typeof verified?.[key] === 'string' ? verified[key] as string : undefined;
  const s = verified ? { ...submission, candidateFirstName: text('firstName'), candidateLastName: text('lastName'), candidateEmail: text('email'), candidatePhone: text('phone'), candidateCurrentCompany: text('currentCompany'), candidateCurrentLocation: text('currentLocation'), candidateName: [text('firstName'), text('lastName')].filter(Boolean).join(' '), candidateExperience: Number(text('totalExperienceYears')), candidatePreferredLocations: text('preferredLocations')?.split(',').map(value => value.trim()) } : submission;
  const contract = /contract|c2h|freelance/i.test(s.jobType || '');
  const currentPay = displaySubmissionCompensation(s, false);
  const expectedPay = displaySubmissionCompensation(s, true);
  const amount = (value: string | null | undefined, currency?: string | null, term?: string | null) => value != null && value !== '' ? [formatCandidateAmount(value), currency, term].filter(Boolean).join(' / ') : 'Not provided';
  const years = (value: number | null | undefined) => value != null ? `${value} years` : 'Not provided';
  const groups = [
    { title: 'Verified primary skills', fields: [['Primary skills', s.candidateSkills?.join(', ')]] },
    { title: 'Contact', fields: [['First name', s.candidateFirstName], ['Last name', s.candidateLastName], ['Email', s.candidateEmail], ['Mobile', s.candidatePhone]] },
    { title: 'Experience & availability', fields: [['Current company', s.candidateCurrentCompany], ['Total experience', years(s.candidateExperience)], ['Relevant experience', years(s.candidateRelevantExperience)], ['Current location', s.candidateCurrentLocation], ['Preferred locations', s.candidatePreferredLocations?.join(', ')], ['Notice period', s.candidateNoticePeriod === 0 ? "Immediate" : s.candidateNoticePeriod != null ? `${s.candidateNoticePeriod} days` : null]] },
    { title: 'Compensation', fields: [[contract ? 'Current pay' : 'Current CTC', amount(currentPay.amount, currentPay.currency, currentPay.unit)], [contract ? 'Expected pay' : 'Expected CTC', amount(expectedPay.amount, expectedPay.currency, expectedPay.unit)]] },
    { title: 'Source & availability', fields: [['Source', s.sourceCategory || s.candidateSource], ['Source channel', s.sourceChannel], ['Source details', s.sourceDetail], ['Availability to start', s.availabilityToStart]] },
  ];
  return <section aria-label="Submitted candidate details" className="min-w-0 rounded-xl border border-border bg-card p-4 lg:p-5">
    <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold">{s.candidateName || 'Candidate details'}</h2>{s.jobType && <span className="rounded-md bg-blue-50 px-2 py-1 text-[10.5px] text-blue-800 dark:bg-blue-950 dark:text-blue-200">{s.jobType}</span>}</div>
    {groups.map(group => <div key={group.title} className="mt-4"><h3 className="border-b border-border pb-1.5 text-xs font-semibold text-blue-800 dark:text-blue-200">{group.title}</h3><dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">{group.fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[10.5px] text-muted-foreground">{label}</dt><dd className="mt-0.5 text-xs font-medium [overflow-wrap:anywhere]">{value || 'Not provided'}</dd></div>)}</dl></div>)}
    <div className="mt-4"><h3 className="border-b border-border pb-1.5 text-xs font-semibold text-blue-800 dark:text-blue-200">Recruiter notes</h3><p className="mt-2 whitespace-pre-wrap text-xs [overflow-wrap:anywhere]">{s.recruiterComment || 'No recruiter notes provided.'}</p></div>
    <div className="mt-4 flex items-center gap-3 rounded-lg bg-blue-50/60 p-3 dark:bg-blue-950/30"><Avatar className="h-9 w-9 shrink-0">{s.recruiterAvatar && <AvatarImage src={s.recruiterAvatar} alt={s.recruiterName || 'Submitter'} />}<AvatarFallback className="bg-blue-100 text-xs text-blue-800">{(s.recruiterName || s.recruiterEmail || '?').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><p className="text-[10.5px] text-muted-foreground">Submitted by</p><p className="text-xs font-semibold">{s.recruiterName || 'Not provided'}</p><p className="text-[10.5px] text-muted-foreground [overflow-wrap:anywhere]">{s.recruiterEmail || 'Email not provided'}</p></div></div>
  </section>;
}
