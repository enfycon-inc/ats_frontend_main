import type { TrackerSubmission } from './submission-contract';
export function displaySubmissionCompensation(s: TrackerSubmission, expected: boolean) {
 const amount = expected ? s.expectedCompensationAmount : s.currentCompensationAmount;
 if (s.compensationInputUnit && amount == null) return { amount: null, currency: s.compensationCurrency, unit: s.compensationPeriod };
 if (amount == null) return { amount: expected ? s.candidateExpectedCtc : s.candidateCurrentCtc, currency: s.candidateCtcCurrency, unit: s.candidateCtcTerm };
 return { amount: s.compensationInputUnit === 'LPA' ? String(Number(amount) / 100000) : amount, currency: s.compensationCurrency, unit: s.compensationInputUnit === 'LPA' ? 'LPA' : s.compensationPeriod };
}

function compensationJobPeriod(jobType?: string | null): 'MONTH' | 'YEAR' | null {
  const type = jobType?.trim() || '';
  if (/^(contract|contractual|contract to hire|contract-to-hire|c2h|freelance)$/i.test(type)) return 'MONTH';
  if (/^(full[ -]?time|permanent)$/i.test(type)) return 'YEAR';
  return null;
}

export function expectedCompensationLabel(jobType?: string | null, market?: string | null): string {
  const period = compensationJobPeriod(jobType);
  if (period === 'MONTH') return 'Expected monthly pay';
  if (period === 'YEAR') return market === 'IN' ? 'Expected CTC' : 'Expected annual compensation';
  return 'Expected compensation';
}

export function expectedSubmissionCompensation(submission: TrackerSubmission, jobType = submission.jobType): { value: string; note: string | null } {
  const pay = displaySubmissionCompensation(submission, true);
  const amount = pay.amount?.replaceAll(',', '').trim();
  if (!amount || !/^\d+(?:\.\d+)?$/.test(amount)) return { value: 'Not recorded', note: null };
  const unit = pay.unit?.trim().toUpperCase();
  const period = unit === 'MONTH' || unit === 'MONTHLY' ? 'MONTH'
    : ['LPA', 'YEAR', 'YEARLY', 'ANNUAL', 'ANNUALLY'].includes(unit || '') ? 'YEAR' : null;
  if (!period) return { value: 'Not recorded', note: 'Compensation period unavailable' };
  const expectedPeriod = compensationJobPeriod(jobType);
  if (expectedPeriod && expectedPeriod !== period) return {
    value: 'Not recorded', note: period === 'YEAR' ? 'Annual amount on file' : 'Monthly amount on file',
  };
  const [whole, decimal] = amount.split('.');
  const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (decimal ? `.${decimal.replace(/0+$/, '')}`.replace(/\.$/, '') : '');
  const currency = pay.currency?.trim();
  const suffix = unit === 'LPA' ? ' LPA' : period === 'MONTH' ? ' / month' : ' / year';
  return { value: `${currency ? currency + ' ' : ''}${formatted}${suffix}`, note: currency ? null : 'Currency not recorded' };
}
