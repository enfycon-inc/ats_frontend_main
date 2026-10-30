'use client';
import { useEffect, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { Check, ChevronDown, X } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserIdentity } from '@/components/shared/user-identity';
import { enterpriseGrid as grid } from '@/components/shared/enterprise-grid';
import { atsApi } from '@/lib/ats-api';
import { selectionFor, selectionPatch } from '@/lib/submission-filters';
import {
  TRACKER_SELECTION_LIMIT,
  type TrackerListFilters,
  type TrackerOptionKind,
  type TrackerFilterOptions,
  type TrackerFilterOption,
  type TrackerEntitySelection,
} from '@/lib/submission-contract';

export default function SubmissionEntityPicker({
  kind,
  label,
  scope,
  filters,
  onChange,
}: {
  kind: TrackerOptionKind;
  label: string;
  scope: string;
  filters: TrackerListFilters;
  onChange: (patch: Partial<TrackerListFilters>) => void;
}) {
  const multi =
    kind === 'accountManagerId' ||
    kind === 'recruiterId' ||
    kind === 'clientId';
  const selection = multi ? selectionFor(filters, kind) : undefined;
  const value = filters[kind];
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(''),
    [query, setQuery] = useState('');
  const [draft, setDraft] = useState<TrackerEntitySelection>(),
    [single, setSingle] = useState<string | undefined>(),
    [errorText, setErrorText] = useState('');
  const storageKey = `ats:submission-picker:${scope}`;
  const [labels, setLabels] = useState<Record<string, TrackerFilterOption>>(
    () => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
        return saved && typeof saved === 'object' && !Array.isArray(saved)
          ? saved
          : {};
      } catch {
        return {};
      }
    },
  );
  useEffect(() => {
    const receiveLabel = (event: Event) => {
      const { key, row } = (
        event as CustomEvent<{ key: string; row: TrackerFilterOption }>
      ).detail;
      if (key === storageKey)
        setLabels((current) => ({ ...current, [row.id]: row }));
    };
    window.addEventListener('submission-picker-label', receiveLabel);
    return () =>
      window.removeEventListener('submission-picker-label', receiveLabel);
  }, [storageKey]);
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);
  const structural: TrackerListFilters = {
    view: filters.view,
    branchId: filters.branchId,
    businessUnitId: filters.businessUnitId,
    accountManagerId: filters.accountManagerId,
    accountManagers: filters.accountManagers,
  };
  delete structural[kind];
  if (
    kind === 'accountManagerId' ||
    kind === 'businessUnitId' ||
    kind === 'branchId'
  ) {
    delete structural.accountManagerId;
    delete structural.accountManagers;
  }
  if (kind === 'branchId') delete structural.businessUnitId;
  const { data, size, setSize, isValidating, error } =
    useSWRInfinite<TrackerFilterOptions>(
      (i, previous: TrackerFilterOptions | null) =>
        !open || (i && !previous?.hasMore)
          ? null
          : ['submission-picker', scope, kind, structural, query, i + 1],
      ([, , k, f, q, page]: [
        string,
        string,
        TrackerOptionKind,
        TrackerListFilters,
        string,
        number,
      ]) => atsApi.submissions.filterOptions(k, f, q, page),
      {
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        persistSize: false,
      },
    );
  const rows = data?.flatMap((p) => p.data) ?? [];
  const remember = (row: TrackerFilterOption) => {
    setLabels((current) => ({ ...current, [row.id]: row }));
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
      const current =
        saved && typeof saved === 'object' && !Array.isArray(saved)
          ? saved
          : {};
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ ...current, [row.id]: row }),
      );
    } catch {
      /* Selection also works without storage. */
    }
    window.dispatchEvent(
      new CustomEvent('submission-picker-label', {
        detail: { key: storageKey, row },
      }),
    );
  };
  const isSelected = (row: TrackerFilterOption) =>
    draft?.mode === 'ids'
      ? draft.ids.includes(row.id)
      : draft?.mode === 'matching'
        ? `${row.label} ${row.email ?? ''}`
            .toLowerCase()
            .includes(draft.search.trim().toLowerCase()) &&
          !draft.excludedIds?.includes(row.id)
        : false;
  function toggle(row: TrackerFilterOption) {
    remember(row);
    setErrorText('');
    setDraft((current) => {
      if (current?.mode === 'matching') {
        const matches = `${row.label} ${row.email ?? ''}`
          .toLowerCase()
          .includes(current.search.trim().toLowerCase());
        if (!matches) {
          setErrorText(
            'Clear the matching selection to choose a different set.',
          );
          return current;
        }
        const excluded = current.excludedIds ?? [];
        if (
          !excluded.includes(row.id) &&
          excluded.length >= TRACKER_SELECTION_LIMIT
        ) {
          setErrorText('Use Clear selection to start a new matching set.');
          return current;
        }
        return {
          ...current,
          excludedIds: excluded.includes(row.id)
            ? excluded.filter((id) => id !== row.id)
            : [...excluded, row.id],
        };
      }
      const ids = current?.mode === 'ids' ? current.ids : [];
      if (!ids.includes(row.id) && ids.length >= TRACKER_SELECTION_LIMIT) {
        setErrorText(
          `Select up to ${TRACKER_SELECTION_LIMIT} individually, or use Select all matching.`,
        );
        return current;
      }
      return {
        mode: 'ids',
        ids: ids.includes(row.id)
          ? ids.filter((id) => id !== row.id)
          : [...ids, row.id].sort(),
      };
    });
  }
  function dependent(patch: Partial<TrackerListFilters>) {
    return {
      ...patch,
      ...(kind === 'businessUnitId' || kind === 'branchId'
        ? {
            accountManagerId: undefined,
            accountManagers: undefined,
            recruiterId: undefined,
            recruiters: undefined,
            createdById: undefined,
            jobId: undefined,
            podId: undefined,
            clientId: undefined,
            clients: undefined,
            ...(kind === 'branchId' ? { businessUnitId: undefined } : {}),
          }
        : {}),
      ...(kind === 'accountManagerId'
        ? { recruiterId: undefined, recruiters: undefined, jobId: undefined }
        : {}),
    };
  }
  function apply() {
    onChange(
      dependent(multi ? selectionPatch(kind, draft) : { [kind]: single }),
    );
    setOpen(false);
  }
  const selectedIds = selection?.mode === 'ids' ? selection.ids : [];
  const caption = multi
    ? selection?.mode === 'matching'
      ? `All matching${selection.search ? ` “${selection.search}”` : ''}${selection.excludedIds?.length ? ` · ${selection.excludedIds.length} excluded` : ''}`
      : selectedIds.length === 1
        ? (labels[selectedIds[0]]?.label ?? '1 selected')
        : selectedIds.length
          ? `${selectedIds.length} selected`
          : `All ${label.toLowerCase()}`
    : value
      ? (labels[value]?.label ?? `Selected ${label.toLowerCase()}`)
      : `All ${label.toLowerCase()}`;
  const plural = {
    accountManagerId: 'account managers',
    recruiterId: 'recruiters',
    clientId: 'clients',
    createdById: 'creators',
    jobId: 'jobs',
    businessUnitId: 'units',
    podId: 'pods',
    branchId: 'branches',
  }[kind];
  const people =
    kind === 'accountManagerId' ||
    kind === 'recruiterId' ||
    kind === 'createdById';
  return (
    <div className="flex min-w-40 flex-1 flex-col gap-1.5">
      <span className="text-xs">{label}</span>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) {
            setDraft(selection);
            setSingle(value);
            setErrorText('');
            setSearch('');
            setQuery('');
          }
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className={`${grid.control} flex w-full min-w-0 items-center justify-between gap-2 text-left`}
          >
            <span className="truncate">{caption}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="z-[70] w-80 max-w-[calc(100vw-24px)] p-2"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
        >
          <Input
            autoFocus
            aria-label={`Search ${label.toLowerCase()}`}
            placeholder={`Search ${label.toLowerCase()}…`}
            maxLength={100}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {multi && (
            <div className="flex flex-wrap justify-between gap-1 border-b py-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={
                  isValidating || !rows.length || search.trim() !== query
                }
                onClick={() => {
                  setDraft({ mode: 'matching', search: query });
                  setErrorText('');
                }}
              >
                Select all matching
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(undefined);
                  setErrorText('');
                }}
              >
                Clear selection
              </Button>
            </div>
          )}
          <div className="max-h-64 overflow-y-auto">
            {!multi && (
              <button
                type="button"
                className="w-full rounded p-2 text-left text-sm hover:bg-muted"
                onClick={() => setSingle(undefined)}
              >
                All {plural}
              </button>
            )}
            {rows.map((row) => (
              <button
                type="button"
                key={row.id}
                role={multi ? 'checkbox' : undefined}
                aria-checked={multi ? isSelected(row) : undefined}
                aria-pressed={!multi ? single === row.id : undefined}
                className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-blue-600"
                onClick={() =>
                  multi ? toggle(row) : (remember(row), setSingle(row.id))
                }
              >
                <span
                  aria-hidden="true"
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                >
                  {(multi ? isSelected(row) : single === row.id) && (
                    <Check className="h-3 w-3" />
                  )}
                </span>
                {people ? (
                  <UserIdentity
                    size="table"
                    user={{
                      name: row.label,
                      email: row.email,
                      avatar: row.avatar,
                    }}
                  />
                ) : (
                  <span>{row.label}</span>
                )}
              </button>
            ))}
            {!rows.length && !isValidating && (
              <p role="status" className="p-3 text-xs text-slate-500">
                {error
                  ? 'Options unavailable. Close and retry.'
                  : 'No matching options in your permitted scope.'}
              </p>
            )}
            {isValidating && (
              <p role="status" className="p-2 text-xs">
                Loading…
              </p>
            )}
            {data?.at(-1)?.hasMore && (
              <Button
                variant="ghost"
                size="sm"
                disabled={isValidating}
                onClick={() => void setSize(size + 1)}
              >
                Load more
              </Button>
            )}
          </div>
          {errorText && (
            <p
              role="alert"
              className="p-2 text-xs text-amber-800 dark:text-amber-300"
            >
              {errorText}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 border-t pt-2 text-xs">
            <span>
              {draft?.mode === 'matching'
                ? `All matching${draft.excludedIds?.length ? ` except ${draft.excludedIds.length}` : ''}`
                : draft?.mode === 'ids'
                  ? `${draft.ids.length} selected`
                  : multi
                    ? 'No restriction'
                    : single
                      ? '1 selected'
                      : 'No restriction'}
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={apply}>
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {!!selectedIds.length && (
        <div className="flex flex-wrap gap-1">
          {selectedIds.slice(0, 2).map((id) => (
            <button
              key={id}
              type="button"
              aria-label={`Remove ${labels[id]?.label ?? 'selection'}`}
              className="inline-flex max-w-full items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200"
              onClick={() =>
                onChange(
                  dependent(
                    selectionPatch(
                      kind as 'accountManagerId' | 'recruiterId' | 'clientId',
                      {
                        mode: 'ids',
                        ids: selectedIds.filter((value) => value !== id),
                      },
                    ),
                  ),
                )
              }
            >
              <span className="max-w-28 truncate">
                {labels[id]?.label ?? 'Selected'}
              </span>
              <X className="h-3 w-3" />
            </button>
          ))}
          {selectedIds.length > 2 && (
            <span className="text-xs text-slate-500">
              +{selectedIds.length - 2} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
