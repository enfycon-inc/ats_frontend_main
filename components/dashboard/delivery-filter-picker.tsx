'use client';
import { useEffect, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { PeopleFinder } from '@/components/common/people-finder';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { atsApi } from '@/lib/ats-api';
import type { DeliveryFilterOption, DeliveryOptionKind } from '@/lib/delivery-dashboard-contract';

export function DeliveryFilterPicker({ kind, scope, value, onChange }: { kind: DeliveryOptionKind; scope: string; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [known, setKnown] = useState<Record<string, DeliveryFilterOption>>({});
  useEffect(() => { const timer = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const { data, error, isValidating, size, setSize, mutate } = useSWRInfinite((index, previous) => {
    if (!open || (previous && !previous.nextPage)) return null;
    return ['delivery-filter-options', scope, kind, query, index + 1];
  }, ([, , optionKind, optionSearch, page]) => atsApi.businessUnits.deliveryFilterOptions(optionKind as DeliveryOptionKind, String(optionSearch), Number(page)), { revalidateOnFocus: false, revalidateFirstPage: false });
  const rows = data?.flatMap(page => page.items) || [];
  useEffect(() => {
    if (data) setKnown(current => ({ ...current, ...Object.fromEntries(data.flatMap(page => page.items).map(option => [option.id, option])) }));
  }, [data]);
  const values = value ? value.split(',') : [];
  const retained = query ? [] : values.filter(id => known[id] && !rows.some(option => option.id === id)).map(id => known[id]);
  const options = [...retained, ...rows];
  const props = { value, values, loading: isValidating, error: !!error, onRetry: () => void mutate(), onValueChange: onChange, onValuesChange: (ids: string[]) => onChange(ids.join(',')), onOpenChange: setOpen, onSearchChange: (next: string) => { setSearch(next); void setSize(1); }, hasMore: !!data?.[data.length - 1]?.nextPage, onLoadMore: () => void setSize(size + 1) };
  if (kind === 'client') return <SearchableSelect {...props} options={options} placeholder="All clients" allLabel="All clients" selectionLabel="clients" searchPlaceholder="Search clients" />;
  const allLabel = kind === 'postedBy' ? 'All posters' : 'All submitters';
  return <PeopleFinder {...props} options={options} placeholder={allLabel} allLabel={allLabel} selectionLabel={kind === 'postedBy' ? 'posters' : 'submitters'} searchPlaceholder="Search name or email" className="text-xs" />;
}
