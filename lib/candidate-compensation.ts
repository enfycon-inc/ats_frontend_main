export function formatCandidateCompensation(amount?: number | null, currency?: string | null, term?: string | null) {
  if (amount == null) return '—';
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'CAD' ? 'C$' : currency ? `${currency} ` : '';
  const suffix = term === 'LPA' ? 'LPA' : term === 'MONTH' || term === 'Monthly' ? '/month' : term === 'YEAR' || term === 'Yearly' ? '/year' : term === 'Hourly' ? '/hour' : term || 'unit unavailable';
  return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${suffix}`;
}

export function annualizedCompensation(amount?: number | null, currency?: string | null, term?: string | null) {
  if (amount == null || !currency || !term) return null;
  const annual = term === 'LPA' ? amount * 100000 : term === 'MONTH' || term === 'Monthly' ? amount * 12 : term === 'YEAR' || term === 'Yearly' ? amount : null;
  return annual == null ? null : { amount: annual, currency };
}
