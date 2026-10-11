export const isMonthlyIndiaJob = (type: string) => ['Contract', 'C2H', 'Freelance'].includes(type);

export function normalizeAmount(value: string): string {
  return value.replace(/,/g, '').trim();
}

export function formatIndiaAmount(value: string): string {
  const raw = normalizeAmount(String(value));
  if (!/^\d+(?:\.\d*)?$/.test(raw)) return raw;
  const [whole, decimal] = raw.split('.');
  const grouped = BigInt(whole).toLocaleString('en-IN');
  return decimal === undefined ? grouped : `${grouped}.${decimal}`;
}

export function indiaBudget(minimum: string, maximum: string, type: string): string {
  const min = normalizeAmount(minimum);
  const max = normalizeAmount(maximum) || min;
  if (!min) return '';
  if (!/^\d+(?:\.\d+)?$/.test(min) || !/^\d+(?:\.\d+)?$/.test(max) || Number(max) < Number(min)) {
    throw new Error('Enter a valid budget with maximum at least the minimum.');
  }
  return `INR - ${min}${Number(max) !== Number(min) ? ` to ${max}` : ''} ${isMonthlyIndiaJob(type) ? '/mo' : 'LPA'}`;
}
