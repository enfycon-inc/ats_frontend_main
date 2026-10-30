import {
  RECRUITER_SORTS,
  type RecruiterFilters,
  type RecruiterSort,
} from './delivery-dashboard-contract';
export const recruiterColumns: {
  id: RecruiterSort;
  label: string;
  permission?: string;
  description: string;
}[] = [
  {
    id: 'name',
    label: 'Recruiter',
    description: 'Open individual performance',
  },
  {
    id: 'directActive',
    label: 'Direct active',
    permission: 'job:view',
    description: 'Current active direct assignments',
  },
  {
    id: 'sharedJobs',
    label: 'Shared pod jobs',
    permission: 'pod:view',
    description: 'Current active pod jobs, excluding direct assignments',
  },
  {
    id: 'submissions',
    label: 'Submissions',
    permission: 'submission:view',
    description: 'Created in selected period',
  },
  {
    id: 'review',
    label: 'Pending review',
    permission: 'submission:internal_screening',
    description: 'Current internal review queue',
  },
  ...(['l1', 'l2', 'l3'] as const).map((id) => ({
    id,
    label: id.toUpperCase(),
    permission: 'submission:view',
    description: 'Current interview queue',
  })),
  {
    id: 'offers',
    label: 'Offers',
    permission: 'submission:view',
    description: 'First recorded offer in selected period',
  },
  {
    id: 'joined',
    label: 'Closures',
    permission: 'submission:view',
    description: 'Joined candidates in selected period',
  },
];
export function availableRecruiterColumns(permissions: string[]) {
  return recruiterColumns.filter(
    (c) =>
      (!c.permission || permissions.includes(c.permission)) &&
      (c.id !== 'sharedJobs' || permissions.includes('job:view')) &&
      (c.id !== 'review' || permissions.includes('submission:view')),
  );
}
export function recruiterDetailHref(id: string, filters: RecruiterFilters) {
  const q = new URLSearchParams();
  if (filters.from && filters.to) {
    q.set('from', filters.from);
    q.set('to', filters.to);
  }
  return `/dashboard/recruiters/${encodeURIComponent(id)}${q.size ? `?${q}` : ''}`;
}
export interface RecruiterViewState {
  filters: RecruiterFilters;
  period: string;
  search: string;
  startDate: string;
  endDate: string;
  expanded: boolean;
  scrollTop: number;
}
export function readRecruiterState(scope: string): RecruiterViewState | null {
  try {
    const s = JSON.parse(
      sessionStorage.getItem(`ats:recruiter-comparison:${scope}`) || 'null',
    );
    if (
      !s ||
      !s.filters ||
      !RECRUITER_SORTS.includes(s.filters.sort) ||
      !['asc', 'desc'].includes(s.filters.direction) ||
      !['all', 'month', 'lastMonth', '30days', 'custom'].includes(s.period)
    )
      return null;
    const f: RecruiterFilters = {
      sort: s.filters.sort,
      direction: s.filters.direction,
    };
    for (const key of ['recruiterId', 'podId'] as const)
      if (
        typeof s.filters[key] === 'string' &&
        /^[a-f0-9-]{36}$/i.test(s.filters[key])
      )
        f[key] = s.filters[key];
    if (typeof s.filters.search === 'string')
      f.search = s.filters.search.slice(0, 100);
    if (
      typeof s.filters.from === 'string' &&
      typeof s.filters.to === 'string' &&
      Number.isFinite(Date.parse(s.filters.from)) &&
      Number.isFinite(Date.parse(s.filters.to))
    ) {
      f.from = s.filters.from;
      f.to = s.filters.to;
    }
    return {
      filters: f,
      period: s.period,
      search: typeof s.search === 'string' ? s.search.slice(0, 100) : '',
      startDate: typeof s.startDate === 'string' ? s.startDate : '',
      endDate: typeof s.endDate === 'string' ? s.endDate : '',
      expanded: s.expanded === true,
      scrollTop: Number.isFinite(s.scrollTop) ? Math.max(0, s.scrollTop) : 0,
    };
  } catch {
    return null;
  }
}
export function saveRecruiterState(scope: string, state: RecruiterViewState) {
  try {
    sessionStorage.setItem(
      `ats:recruiter-comparison:${scope}`,
      JSON.stringify(state),
    );
  } catch {
    /* Browser storage is optional. */
  }
}
