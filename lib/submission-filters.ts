import type {
  TrackerListFilters,
  TrackerBucket,
  TrackerFilterAccess,
} from './submission-contract';
export const submissionTabs: { key: TrackerBucket; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'review', label: 'Needs review' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'offers', label: 'Offers' },
  { key: 'closures', label: 'Closures' },
  { key: 'closed', label: 'Closed' },
];
export const submissionFilterKeys = [
  'limit', 'accountManagers', 'recruiters', 'clients', 'round', 'roundStatus',
  'accountManagerId',
  'recruiterId',
  'createdById',
  'clientId',
  'businessUnitId',
  'podId',
  'branchId',
  'jobId',
  'stage',
  'stageStatus',
  'jobStatus',
  'workflow',
  'urgency',
  'dateBasis',
  'interviewFrom',
  'interviewTo',
  'startDate',
  'endDate',
  'queue',
  'l1Status',
  'l2Status',
  'l3Status',
  'search',
  'bucket',
  'page',
  'view',
] as const;
export function readSubmissionFilters(
  params: URLSearchParams,
): TrackerListFilters {
  const out: Record<string, unknown> = {};
  for (const key of submissionFilterKeys) {
    const value = params.get(key);
    if(value&&key!=='page'){if(['accountManagers','recruiters','clients'].includes(key)){try{out[key]=JSON.parse(value);}catch{out[key]={mode:'invalid'};}}else out[key]=value.slice(0,120);}
  }
  if(['l1','l2','l3'].includes(String(out.stage))&&!out.round){out.round=out.stage;out.roundStatus=out.stageStatus;delete out.stage;delete out.stageStatus;}
  if(params.has('limit'))out.limit=Number(params.get('limit'));
  const page = Number(params.get('page') ?? 1);
  out.page = Number.isSafeInteger(page) && page > 0 ? page : 1;
  if (!submissionTabs.some((t) => t.key === out.bucket)) out.bucket = 'all';
  return out as TrackerListFilters;
}
export function submissionFilterQuery(
  params: URLSearchParams,
  filters: TrackerListFilters,
) {
  const next = new URLSearchParams(params);
  for (const key of submissionFilterKeys) {
    next.delete(key);
    const value = filters[key];
    if (
      value !== undefined &&
      value !== '' &&
      !(key === 'page' && value === 1) &&
      !(key === 'bucket' && value === 'all')
    )
      next.set(key, typeof value==='object'?JSON.stringify(value):String(value));
  }
  return next;
}
export function stageBucket(stage: string, status?: string): TrackerBucket {
  if (stage === 'review') return 'review';
  if (stage === 'final')
    return !status
      ? 'all'
      : status === 'JOIN'
        ? 'closures'
        : status === 'SELECTED' || status === 'OFFER'
          ? 'offers'
          : status === 'DECISION'
            ? 'interviews'
            : 'closed';
  return 'interviews';
}
export function localFilterAccess(permissions: string[]): TrackerFilterAccess {
  const tenant = permissions.some((p) =>
      ['*', 'tenant:manage', 'tenant:settings', 'platform:manage'].includes(p),
    ),
    branch = permissions.includes('branch_admin:manage');
  return {
    branch: tenant,
    unit: tenant || branch,
    people:
      tenant ||
      branch ||
      permissions.some((p) =>
        [
          'unit_admin:manage',
          'submission:view_all',
          'job:submit_owned_jobs',
          'user:manage',
        ].includes(p),
      ),
    portfolio: permissions.includes('job:submit_owned_jobs') && !tenant && !branch && !permissions.includes('unit_admin:manage'),
    clients: permissions.includes('client:view'),
    pods: permissions.includes('pod:view'),
    review: permissions.some((p) =>
      [
        'submission:internal_screening',
        'submission:internal_screening_created_jobs',
      ].includes(p),
    ),
  };
}
export const currentStatuses = (stage?: string) =>
  stage === 'review'
    ? ['PENDING_APPROVAL']
    : stage === 'final'
      ? [
          'DECISION',
          'SELECTED',
          'OFFER',
          'JOIN',
          'NOT_SELECTED',
          'WITHDRAWN',
          'REJECTED',
        ]
      : ['PENDING', 'SCHEDULED', 'AWAITING_FEEDBACK', 'CANCELLED'];

export const multiSelectionKeys = {accountManagerId:'accountManagers',recruiterId:'recruiters',clientId:'clients'} as const;
export function selectionFor(filters:TrackerListFilters,kind:keyof typeof multiSelectionKeys):import('./submission-contract').TrackerEntitySelection|undefined {return filters[multiSelectionKeys[kind]]??(filters[kind]?{mode:'ids',ids:[filters[kind]!]}:undefined);}
export function selectionPatch(kind:keyof typeof multiSelectionKeys,selection:import('./submission-contract').TrackerEntitySelection|undefined):Partial<TrackerListFilters>{return {[kind]:undefined,[multiSelectionKeys[kind]]:selection?.mode==='ids'&&!selection.ids.length?undefined:selection};}
export function roundPatch(round:import('./submission-contract').RoundKey|undefined,status?:import('./submission-contract').InterviewRoundStatus):Partial<TrackerListFilters>{return {round,roundStatus:status,stage:undefined,stageStatus:undefined,queue:undefined,l1Status:undefined,l2Status:undefined,l3Status:undefined,workflow:undefined,dateBasis:'submitted',bucket:!round||status==='CLEARED'?'all':status==='REJECTED'?'closed':'interviews'};}
