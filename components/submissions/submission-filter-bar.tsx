'use client';
import { useRef, useState } from 'react';
import { Filter, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { enterpriseGrid as grid } from '@/components/shared/enterprise-grid';
import { JOB_URGENCIES } from '@/lib/job-urgency-contract';
import { roundPatch } from '@/lib/submission-filters';
import {
  InterviewRoundStatus,
  type TrackerListFilters,
  type TrackerFilterAccess,
  type TrackerOptionKind,
  type RoundKey,
} from '@/lib/submission-contract';
import SubmissionEntityPicker from './submission-entity-picker';

const labels: Record<string, string> = {
  createdById: 'Created by',
  clientId: 'Client',
  clients: 'Clients',
  jobId: 'Job',
  podId: 'Pod',
  branchId: 'Branch',
  jobStatus: 'Job status',
  workflow: 'Workflow',
  urgency: 'Urgency',
  dateBasis: 'Date basis',
  interviewFrom: 'Interview from',
  interviewTo: 'Interview through',
  l1Status: 'L1 history',
  l2Status: 'L2 history',
  l3Status: 'L3 history',
  queue: 'Queue',
  stage: 'Current stage',
  stageStatus: 'Current status',
};
const historyStatuses = Object.values(InterviewRoundStatus);
const text = (value: string) =>
  value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (s) => s.toUpperCase());
export default function SubmissionFilterBar({
  filters,
  access,
  scope,
  search,
  onSearch,
  onChange,
}: {
  filters: TrackerListFilters;
  access: TrackerFilterAccess;
  scope: string;
  search: string;
  onSearch: (value: string) => void;
  onChange: (patch: Partial<TrackerListFilters>, reset?: boolean) => void;
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState<TrackerListFilters>({}),
    [period, setPeriod] = useState(filters.startDate ? 'custom' : 'all');
  const appliedOnOpen = useRef<TrackerListFilters>({});
  const advanced = Object.entries(filters).filter(
    ([key, value]) =>
      labels[key] &&
      value &&
      !(key === 'dateBasis' && value === 'submitted') &&
      !(key === 'clients' && access.portfolio),
  );
  const round = filters.round;
  const picker = (
    kind: TrackerOptionKind,
    label: string,
    value: TrackerListFilters,
    change: (patch: Partial<TrackerListFilters>) => void,
  ) => (
    <SubmissionEntityPicker
      key={`${kind}:${scope}`}
      kind={kind}
      label={label}
      scope={scope}
      filters={value}
      onChange={change}
    />
  );
  const draftChange = (patch: Partial<TrackerListFilters>) =>
    setDraft((value) => ({ ...value, ...patch }));
  const select = (
    label: string,
    key: keyof TrackerListFilters,
    values: readonly string[],
    display: (value: string) => string = text,
  ) => (
    <label key={key} className="flex flex-col gap-1.5 text-xs">
      {label}
      <select
        className={`${grid.control} w-full min-w-0`}
        value={String(draft[key] ?? '')}
        onChange={(e) =>
          draftChange({
            [key]: e.target.value,
            ...(['l1Status', 'l2Status', 'l3Status'].includes(key) &&
            e.target.value
              ? {
                  round: undefined,
                  roundStatus: undefined,
                  stage: undefined,
                  stageStatus: undefined,
                  queue: undefined,
                  bucket: 'all',
                }
              : {}),
          })
        }
      >
        <option value="">All</option>
        {values.map((value) => (
          <option key={value} value={value}>
            {display(value)}
          </option>
        ))}
      </select>
    </label>
  );
  function changePeriod(value: string) {
    setPeriod(value);
    if (value === 'custom') return;
    const now = new Date(),
      y = now.getFullYear(),
      m = now.getMonth(),
      d = now.getDate();
    const iso = (dt: Date) =>
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    onChange(
      value === 'all'
        ? { startDate: undefined, endDate: undefined }
        : value === 'month'
          ? {
              startDate: iso(new Date(y, m, 1)),
              endDate: iso(new Date(y, m + 1, 0)),
            }
          : { startDate: iso(new Date(y, m, d - 29)), endDate: iso(now) },
    );
  }
  function resetDraft() {
    setDraft((value) => {
      const next = { ...value };
      const keys: (keyof TrackerListFilters)[] = [
        'jobStatus',
        'urgency',
        'workflow',
        'dateBasis',
        'interviewFrom',
        'interviewTo',
        'l1Status',
        'l2Status',
        'l3Status',
      ];
      if (access.people && !access.portfolio)
        keys.push('accountManagerId', 'accountManagers');
      if (access.people) keys.push('recruiterId', 'recruiters');
      if (access.clients) keys.push('clientId', 'clients');
      if (access.unit) keys.push('businessUnitId');
      if (access.branch) keys.push('branchId');
      if (access.pods) keys.push('podId');
      for (const key of keys) delete (next as Record<string, unknown>)[key];
      return next;
    });
  }
  function applyDraft() {
    // Commit only edits made during this panel session, including explicit clears.
    const keys = new Set([
      ...Object.keys(appliedOnOpen.current),
      ...Object.keys(draft),
    ]);
    const patch: Record<string, unknown> = {};
    for (const key of keys) {
      const field = key as keyof TrackerListFilters;
      if (
        JSON.stringify(draft[field]) !==
        JSON.stringify(appliedOnOpen.current[field])
      )
        patch[key] = draft[field];
    }
    if (Object.keys(patch).length)
      onChange(patch as Partial<TrackerListFilters>);
    setOpen(false);
  }
  return (
    <div className="shrink-0 border-t border-border bg-card">
      <div className="flex flex-wrap items-start gap-3 px-4 py-3">
        <label className="flex min-w-48 flex-[1.5] flex-col gap-1.5 text-xs">
          Search
          <Input
            aria-label="Search candidate, job code or client"
            placeholder="Candidate, job code or client…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            maxLength={100}
            className="h-9 text-sm"
          />
        </label>
        <div className="hidden md:contents">
          {access.unit && picker('businessUnitId', 'Unit', filters, onChange)}
          {access.people &&
            !access.portfolio &&
            picker('accountManagerId', 'Account manager', filters, onChange)}
          {access.people &&
            picker('recruiterId', 'Recruiter', filters, onChange)}
        </div>
        <label className="flex min-w-28 flex-1 flex-col gap-1.5 text-xs">
          Stage
          <select
            aria-label="Stage"
            className={`${grid.control} w-full min-w-0`}
            value={round ?? ''}
            onChange={(e) =>
              onChange(
                roundPatch(
                  (e.target.value || undefined) as RoundKey | undefined,
                ),
              )
            }
          >
            <option value="">All stages</option>
            {(['l1', 'l2', 'l3'] as const).map((value) => (
              <option key={value} value={value}>
                {value.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <div className="hidden md:contents">
          {access.clients &&
            access.portfolio &&
            picker('clientId', 'Client', filters, onChange)}
        </div>
        <label className="flex min-w-36 flex-1 flex-col gap-1.5 text-xs">
          Time period
          <select
            aria-label="Time period"
            className={`${grid.control} w-full min-w-0`}
            value={period}
            onChange={(e) => changePeriod(e.target.value)}
          >
            <option value="all">All time</option>
            <option value="month">This month</option>
            <option value="30days">Last 30 days</option>
            <option value="custom">Custom dates</option>
          </select>
        </label>
        <Sheet
          open={open}
          onOpenChange={(value) => {
            if (value) {
              appliedOnOpen.current = structuredClone(filters);
              setDraft(structuredClone(filters));
            }
            setOpen(value);
          }}
        >
          <SheetTrigger asChild>
            <Button size="sm" variant="outline" className="mt-5 h-9">
              <Filter className="h-4 w-4" />
              More filters{advanced.length ? ` (${advanced.length})` : ''}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full gap-0 p-0 sm:max-w-[440px]">
            <SheetHeader className="shrink-0 border-b px-5 py-4">
              <SheetTitle className="pr-6 text-lg leading-6">
                More filters
              </SheetTitle>
              <SheetDescription className="text-xs">
                Changes apply to the table when you select Apply.
              </SheetDescription>
            </SheetHeader>
            <div
              className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5"
              aria-label="More submission filters"
            >
              {(access.people || access.clients) && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                    Ownership
                  </h3>
                  {access.people &&
                    !access.portfolio &&
                    picker(
                      'accountManagerId',
                      'Account manager',
                      draft,
                      draftChange,
                    )}
                  {access.people &&
                    picker('recruiterId', 'Recruiter', draft, draftChange)}
                  {access.clients &&
                    picker('clientId', 'Client', draft, draftChange)}
                </section>
              )}
              {(access.branch || access.unit || access.pods) && (
                <details className="border-t pt-4 text-xs">
                  <summary className="cursor-pointer font-semibold">
                    Organization scope
                  </summary>
                  <div className="mt-3 space-y-3">
                    {access.branch &&
                      picker('branchId', 'Branch', draft, draftChange)}
                    {access.unit &&
                      picker('businessUnitId', 'Unit', draft, draftChange)}
                    {access.pods && picker('podId', 'Pod', draft, draftChange)}
                  </div>
                </details>
              )}
              <section className="space-y-3 border-t pt-4">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                  Job context
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {select('Job status', 'jobStatus', [
                    'Active',
                    'Closed',
                    'Filled',
                    'On Hold',
                    'Hold by Client',
                    'Archived',
                  ])}
                  {select(
                    'Urgency',
                    'urgency',
                    JOB_URGENCIES,
                    (value) => value,
                  )}
                </div>
              </section>
              <section className="space-y-3 border-t pt-4">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                  Workflow
                </h3>
                {select('State', 'workflow', ['running', 'paused'], (value) =>
                  value === 'running' ? 'Not paused' : 'Paused',
                )}
              </section>
              <section className="space-y-3 border-t pt-4">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                  Dates
                </h3>
                <label className="flex flex-col gap-1.5 text-xs">
                  Date basis
                  <select
                    className={`${grid.control} w-full`}
                    value={draft.dateBasis ?? 'submitted'}
                    onChange={(e) =>
                      draftChange({
                        dateBasis: e.target.value as 'submitted' | 'joined',
                        ...(e.target.value === 'joined'
                          ? {
                              bucket: 'closures',
                              round: undefined,
                              roundStatus: undefined,
                              stage: undefined,
                              stageStatus: undefined,
                              queue: undefined,
                              workflow: undefined,
                            }
                          : {}),
                      })
                    }
                  >
                    <option value="submitted">Submitted date</option>
                    <option value="joined">Joined date</option>
                  </select>
                </label>
                {(['interviewFrom', 'interviewTo'] as const).map((key) => (
                  <label key={key} className="flex flex-col gap-1.5 text-xs">
                    {labels[key]}
                    <input
                      type="date"
                      className={grid.control}
                      value={draft[key] ?? ''}
                      onChange={(e) =>
                        draftChange({
                          [key]: e.target.value,
                          bucket: 'interviews',
                          dateBasis: 'submitted',
                        })
                      }
                    />
                  </label>
                ))}
              </section>
              <details className="border-t pt-4 text-xs">
                <summary className="cursor-pointer font-semibold">
                  Round history (past results)
                </summary>
                <div className="mt-3 space-y-3">
                  {(['l1Status', 'l2Status', 'l3Status'] as const).map((key) =>
                    select(labels[key], key, historyStatuses),
                  )}
                </div>
              </details>
            </div>
            <SheetFooter className="shrink-0 flex-row items-center justify-between border-t p-4">
              <Button variant="ghost" onClick={resetDraft}>
                Reset panel
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={applyDraft}>Apply filters</Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
      {(period === 'custom' || filters.startDate || filters.endDate) && (
        <div className="flex flex-wrap gap-3 px-4 pb-3">
          {(['startDate', 'endDate'] as const).map((key) => (
            <label key={key} className="flex flex-col gap-1 text-xs">
              {key === 'startDate' ? 'From' : 'Through'}
              <input
                type="date"
                className={grid.control}
                value={filters[key] ?? ''}
                onChange={(e) => onChange({ [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
      )}
      {round && filters.roundStatus === 'CLEARED' && (
        <p role="status" className="px-4 pb-3 text-xs text-muted-foreground">
          {round.toUpperCase()} cleared includes candidates who have progressed
          to later stages.{' '}
          {filters.bucket === 'all'
            ? 'All is selected to include later outcomes.'
            : 'The selected tab further narrows these results.'}
        </p>
      )}
      {!!advanced.length && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          {advanced.map(([key, value]) => (
            <button
              key={key}
              type="button"
              className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200"
              onClick={() => onChange({ [key]: undefined })}
            >
              {labels[key]}:{' '}
              {typeof value === 'object'
                ? value.mode === 'ids'
                  ? `${value.ids.length} selected`
                  : 'All matching'
                : key.endsWith('Id')
                  ? 'Selected'
                  : text(String(value))}
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {labels[key]}</span>
            </button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setPeriod('all');
              onSearch('');
              onChange({}, true);
            }}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
