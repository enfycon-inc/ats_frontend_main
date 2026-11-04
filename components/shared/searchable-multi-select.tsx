'use client';
import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { SearchableSelectOption } from './searchable-select';

export interface SearchableMultiSelectProps {
  options: SearchableSelectOption[]; values: string[]; onValuesChange: (values: string[]) => void;
  placeholder?: string; selectionLabel?: string; showSelectedTags?: boolean; searchPlaceholder?: string;
  loading?: boolean; error?: boolean; disabled?: boolean;
  onSearchChange?: (query: string) => void; onOpenChange?: (open: boolean) => void;
  hasMore?: boolean; onLoadMore?: () => void; onRetry?: () => void;
}
export function SearchableMultiSelect({ options, values, onValuesChange, placeholder = 'All options', selectionLabel = 'options', searchPlaceholder = 'Search options', loading, error, disabled, onSearchChange, onOpenChange, hasMore, onLoadMore, onRetry, showSelectedTags }: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string[]>(values);
  const close = () => { setOpen(false); setQuery(''); onSearchChange?.(''); onOpenChange?.(false); };
  const summary = values.length === 1 ? options.find(option => option.id === values[0])?.name || `1 ${selectionLabel} selected` : values.length ? `${values.length} ${selectionLabel} selected` : placeholder;
  return <Popover open={open} onOpenChange={next => { setOpen(next); onOpenChange?.(next); setQuery(''); onSearchChange?.(''); if (next) setDraft(values); }}>
    <PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="h-11 min-h-11 max-h-11 w-full justify-between gap-2 px-3 text-left text-xs font-normal">{showSelectedTags && values.length ? <span className="flex min-w-0 gap-1 overflow-hidden">{values.slice(0,2).map(id => <span key={id} className="truncate rounded border border-blue-200 bg-blue-50 px-1 text-[10px] text-blue-900">{options.find(option => option.id === id)?.name || id}</span>)}{values.length > 2 && <span className="text-[10px]">+{values.length - 2}</span>}</span> : <span className="truncate">{summary}</span>}<ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" /></Button></PopoverTrigger>
    <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-72 p-0"><Command shouldFilter={!onSearchChange}>
      <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={next => { setQuery(next); onSearchChange?.(next); }} />
      <CommandList className="max-h-64">
        {error ? <div role="alert" className="p-3 text-xs text-red-700">Unable to load options. <button type="button" onClick={onRetry} className="underline">Retry</button></div> : loading ? <p role="status" className="p-3 text-xs text-slate-500">Loading options…</p> : <><CommandEmpty>No matching options.</CommandEmpty><CommandGroup>{options.map(option => {
          const checked = draft.includes(option.id);
          return <CommandItem key={option.id} value={`${option.name} ${option.description || ''} ${option.id}`} disabled={!checked && draft.length >= 100} onSelect={() => setDraft(current => checked ? current.filter(id => id !== option.id) : [...current, option.id])} className="gap-3 py-2.5">
            <span role="checkbox" aria-checked={checked} aria-label={option.name} className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300'}`}>{checked && <Check className="h-3 w-3" />}</span>
            <span className="min-w-0 flex-1"><span className="block truncate font-medium">{option.name}</span>{option.description && <span className="block truncate text-xs text-slate-500">{option.description}</span>}</span>
          </CommandItem>;
        })}</CommandGroup></>}
      </CommandList>{hasMore && <button type="button" disabled={loading} onClick={onLoadMore} className="w-full border-t p-2 text-xs text-blue-700 disabled:opacity-50">Load more</button>}
      {draft.length >= 100 && <p role="status" className="px-3 text-xs text-slate-500">Maximum 100 selections.</p>}
      <div className="flex items-center justify-between border-t p-3"><Button type="button" size="sm" variant="ghost" onClick={() => setDraft([])}>Clear</Button><Button type="button" size="sm" onClick={() => { onValuesChange(draft); close(); }}>Apply{draft.length ? ` (${draft.length})` : ''}</Button></div>
    </Command></PopoverContent>
  </Popover>;
}
