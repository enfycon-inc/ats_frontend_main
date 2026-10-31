import type { TrackerSubmission } from './submission-contract';

export function compensationLabel(expected: boolean, jobType?: string | null, period?: string | null) {
  const prefix = expected ? 'Expected' : 'Current';
  const recordedPeriod = period?.trim().toUpperCase();
  const monthly = recordedPeriod ? ['MONTH', 'MONTHLY'].includes(recordedPeriod) : compensationJobPeriod(jobType) === 'MONTH';
  return `${prefix} ${monthly ? 'monthly pay' : 'CTC'}`;
}

/** Amounts in submission records and audit snapshots are stored in base currency units. */
export function formatRecordedCompensation(amount: string | null | undefined, currency?: string | null, period?: string | null) {
  if (amount == null || amount.trim() === '') return 'Not recorded';
  const numeric = Number(amount.replaceAll(',', ''));
  if (!Number.isFinite(numeric) || numeric < 0) return 'Not recorded';
  const code = currency?.trim().toUpperCase();
  const normalizedPeriod = period?.trim().toUpperCase();
  const annual = ['YEAR', 'YEARLY', 'ANNUAL', 'ANNUALLY', 'LPA'].includes(normalizedPeriod || '');
  const monthly = ['MONTH', 'MONTHLY'].includes(normalizedPeriod || '');
  const lpa = code === 'INR' && annual;
  const value = new Intl.NumberFormat(code === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: lpa ? 5 : 2 }).format(lpa ? numeric / 100000 : numeric);
  const suffix = lpa ? ' LPA' : monthly ? ' / month' : annual ? ' / year' : ' (period not recorded)';
  return `${code || 'Currency not recorded'} ${value}${suffix}`;
}

export function submissionCompensationValue(submission: TrackerSubmission, expected: boolean) {
  const recordedAmount = expected ? submission.expectedCompensationAmount : submission.currentCompensationAmount;
  if (recordedAmount != null || submission.compensationInputUnit) {
    return formatRecordedCompensation(recordedAmount, submission.compensationCurrency, submission.compensationPeriod);
  }
  const pay = displaySubmissionCompensation(submission, expected);
  // The legacy display helper has already converted LPA amounts to lakhs.
  const baseAmount = pay.unit === 'LPA' && pay.amount != null ? String(Number(pay.amount) * 100000) : pay.amount;
  return formatRecordedCompensation(baseAmount, pay.currency, pay.unit);
}

export function formatClientBillRate(rate: TrackerSubmission['clientBillRate']): string {
  if (!rate || rate.min == null || rate.min.trim() === '') return '—';
  const minimum = Number(rate.min.replaceAll(',', ''));
  const maximum = rate.max == null || rate.max.trim() === '' ? minimum : Number(rate.max.replaceAll(',', ''));
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum < 0 || maximum < minimum) return '—';
  const currency = rate.currency?.trim().toUpperCase();
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const format = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const range = maximum === minimum ? format(minimum) : `${format(minimum)}–${format(maximum)}`;
  const term = rate.term?.trim().toUpperCase();
  const suffix = term === 'LPA' ? ' LPA'
    : ['MONTH', 'MONTHLY'].includes(term || '') ? ' / month'
      : ['HOUR', 'HOURLY'].includes(term || '') ? ' / hour'
        : ['YEAR', 'YEARLY'].includes(term || '') ? ' / year'
          : term ? ` / ${term.toLowerCase()}` : ' · unit not recorded';
  return `${currency ? `${currency} ${range}` : `Currency not recorded · ${range}`}${suffix}`;
}

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
