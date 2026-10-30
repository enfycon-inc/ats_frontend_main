import type { ManagerComparisonRow, ManagerDashboardFilters, ManagerSort } from './delivery-dashboard-contract';

export type ManagerColumn = { id: ManagerSort; label: string; permission?: string; description: string };
export const managerColumns: ManagerColumn[] = [
  { id: 'name', label: 'Account manager', description: 'Current account owner, email and profile photo' },
  { id: 'postedJobs', label: 'Total posted', permission: 'job:view', description: 'Approved jobs; selected periods use recorded approval dates' },
  { id: 'activeJobs', label: 'Active', permission: 'job:view', description: 'Current active jobs, regardless of selected period' },
  { id: 'closedJobs', label: 'Closed', permission: 'job:view', description: 'Current closed jobs, not unsuccessful submissions' },
  { id: 'positions', label: 'Positions', permission: 'job:view', description: 'Positions on jobs posted during the selected period' },
  { id: 'submissions', label: 'Submissions received', permission: 'submission:view', description: 'Submission records received during the selected period' },
  { id: 'review', label: 'Pending internal review', permission: 'submission:internal_screening', description: 'Current internal review queue' },
  { id: 'l1', label: 'L1', permission: 'submission:view', description: 'Current L1 stage' },
  { id: 'l2', label: 'L2', permission: 'submission:view', description: 'Current L2 stage' },
  { id: 'l3', label: 'L3', permission: 'submission:view', description: 'Current L3 stage' },
  { id: 'offers', label: 'Offers', permission: 'submission:view', description: 'Distinct candidates reaching Offer; period totals require recorded event dates' },
  { id: 'joined', label: 'Closures', permission: 'submission:view', description: 'Joined candidates; period totals require recorded join events' },
];
export const MANAGER_ROW_HEIGHT = 56;
export const managerNumber = (value: number | null) => value === null ? '—' : value.toLocaleString();
export function availableManagerColumns(permissions: string[]) {
  return managerColumns.filter(column => !column.permission || (permissions.includes(column.permission) && (column.id !== 'review' || permissions.includes('submission:view'))));
}
export function normalizeManagerColumns(ids: unknown, available: ManagerColumn[]): ManagerSort[] {
  const allowed = new Set(available.map(column => column.id));
  const requested = Array.isArray(ids) ? ids : available.map(column => column.id);
  return ['name', ...new Set(requested.filter((id): id is ManagerSort => typeof id === 'string' && id !== 'name' && allowed.has(id as ManagerSort)))];
}
export function managerPeriod(period: string, now = new Date()): Pick<ManagerDashboardFilters, 'from' | 'to'> {
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  if (period === 'month') return { from: new Date(y, m, 1).toISOString(), to: new Date(y, m + 1, 1).toISOString() };
  if (period === 'lastMonth') return { from: new Date(y, m - 1, 1).toISOString(), to: new Date(y, m, 1).toISOString() };
  if (period === '30days') return { from: new Date(y, m, d - 29).toISOString(), to: new Date(y, m, d + 1).toISOString() };
  return {};
}
export function customManagerPeriod(start: string, end: string) {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Choose valid start and end dates.');
    const [y, m, d] = value.split('-').map(Number);
    const result = new Date(y, m - 1, d);
    if (result.getFullYear() !== y || result.getMonth() !== m - 1 || result.getDate() !== d) throw new Error('Choose valid start and end dates.');
    return result;
  };
  const from = parse(start), through = parse(end);
  if (through < from) throw new Error('End date must be on or after the start date.');
  const to = new Date(through.getFullYear(), through.getMonth(), through.getDate() + 1);
  if (to.getTime() - from.getTime() > 366 * 86400000) throw new Error('Choose a range of up to one year.');
  return { from: from.toISOString(), to: to.toISOString() };
}
export function managerMetric(row: ManagerComparisonRow, key: Exclude<ManagerSort, 'name'>) { return row[key]; }
