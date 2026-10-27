export type JobExportPeriod = 'day' | 'month' | 'range';
export const localReportDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Resolve inclusive local calendar dates into an exclusive UTC API interval. */
export function resolveJobExportPeriod(period: JobExportPeriod, day: string, month: string, from: string, to: string) {
  let start: Date, end: Date;
  if (period === 'month') {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Choose a valid month.');
    const [year, number] = month.split('-').map(Number);
    if (year < 1000 || year >= 9999) throw new Error('Choose a valid year.');
    start = new Date(year, number - 1, 1); end = new Date(year, number, 1);
  } else {
    const first = period === 'day' ? day : from;
    const last = period === 'day' ? day : to;
    const dateFormat = /^[1-9]\d{3}-\d{2}-\d{2}$/;
    if (!dateFormat.test(first) || !dateFormat.test(last) || first > last) throw new Error('Choose a valid start and end date.');
    start = new Date(`${first}T00:00:00`); end = new Date(`${last}T00:00:00`);
    if (localReportDate(start) !== first || localReportDate(end) !== last) throw new Error('Choose valid calendar dates.');
    // Use calendar arithmetic so daylight-saving changes do not omit or add hours.
    end.setDate(end.getDate() + 1);
  }
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) throw new Error('Choose a valid export period.');
  return { from: start.toISOString(), to: end.toISOString() };
}
