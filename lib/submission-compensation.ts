import type { TrackerSubmission } from './submission-contract';
export function displaySubmissionCompensation(s: TrackerSubmission, expected: boolean) {
 const amount = expected ? s.expectedCompensationAmount : s.currentCompensationAmount;
 if (s.compensationInputUnit && amount == null) return { amount: null, currency: s.compensationCurrency, unit: s.compensationPeriod };
 if (amount == null) return { amount: expected ? s.candidateExpectedCtc : s.candidateCurrentCtc, currency: s.candidateCtcCurrency, unit: s.candidateCtcTerm };
 return { amount: s.compensationInputUnit === 'LPA' ? String(Number(amount) / 100000) : amount, currency: s.compensationCurrency, unit: s.compensationInputUnit === 'LPA' ? 'LPA' : s.compensationPeriod };
}
