import { MANAGER_SORTS, type ManagerDashboardFilters } from './delivery-dashboard-contract';

export interface ManagerComparisonState {
  filters: ManagerDashboardFilters; search: string; period: string; startDate: string; endDate: string; expanded: boolean; scrollTop: number;
}
export function managerDetailHref(id: string, filters: ManagerDashboardFilters = {}) {
  const query = new URLSearchParams();
  if (filters.from && filters.to) { query.set('from', filters.from); query.set('to', filters.to); }
  return `/dashboard/account-managers/${encodeURIComponent(id)}${query.size ? `?${query}` : ''}`;
}
export function readManagerComparisonState(scope: string): ManagerComparisonState | null {
  try {
    const state = JSON.parse(sessionStorage.getItem(`ats:manager-comparison:${scope}`) || 'null');
    if (!state || !state.filters || typeof state.search !== 'string' || state.search.length > 100
      || !['all', 'month', 'lastMonth', '30days', 'custom'].includes(state.period)
      || !MANAGER_SORTS.includes(state.filters.sort) || !['asc', 'desc'].includes(state.filters.direction)) return null;
    const filters: ManagerDashboardFilters = { sort: state.filters.sort, direction: state.filters.direction };
    if (typeof state.filters.search === 'string') filters.search = state.filters.search.slice(0, 100);
    if (typeof state.filters.accountManagerId === 'string' && /^[0-9a-f-]{36}$/i.test(state.filters.accountManagerId)) filters.accountManagerId = state.filters.accountManagerId;
    if (typeof state.filters.from === 'string' && typeof state.filters.to === 'string' && Number.isFinite(Date.parse(state.filters.from)) && Number.isFinite(Date.parse(state.filters.to))) { filters.from = state.filters.from; filters.to = state.filters.to; }
    return { filters, search: state.search, period: state.period, startDate: typeof state.startDate === 'string' ? state.startDate : '',
      endDate: typeof state.endDate === 'string' ? state.endDate : '', expanded: state.expanded === true, scrollTop: typeof state.scrollTop === 'number' && Number.isFinite(state.scrollTop) ? Math.max(0, state.scrollTop) : 0 };
  } catch { return null; }
}
export function saveManagerComparisonState(scope: string, state: ManagerComparisonState) {
  try { sessionStorage.setItem(`ats:manager-comparison:${scope}`, JSON.stringify(state)); } catch { /* Navigation also works with browser storage disabled. */ }
}
