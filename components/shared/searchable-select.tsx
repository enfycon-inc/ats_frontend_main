'use client';
import { useState } from 'react';
import { SearchableMultiSelect } from './searchable-multi-select';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

export interface SearchableSelectOption { id: string; name: string; description?: string | null }
export interface SearchableSelectProps {
  options: SearchableSelectOption[]; value: string; onValueChange: (value: string) => void;
  placeholder?: string; searchPlaceholder?: string; allLabel?: string; loading?: boolean; error?: boolean;
  onSearchChange?: (query: string) => void; onOpenChange?: (open: boolean) => void;
  hasMore?: boolean; onLoadMore?: () => void; onRetry?: () => void;
  values?: string[]; onValuesChange?: (values: string[]) => void; selectionLabel?: string; showSelectedTags?: boolean;
}
export function SearchableSelect({ options, value, onValueChange, placeholder = 'Select an option', searchPlaceholder = 'Search options', allLabel = 'All', loading, error, onSearchChange, onOpenChange, hasMore, onLoadMore, onRetry, values, onValuesChange, selectionLabel, showSelectedTags }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find(option => option.id === value);
  const close = () => { setOpen(false); setQuery(''); onSearchChange?.(''); onOpenChange?.(false); };
  if (values && onValuesChange) return <SearchableMultiSelect {...{ options, values, onValuesChange, placeholder, searchPlaceholder, loading, error, onSearchChange, onOpenChange, hasMore, onLoadMore, onRetry, selectionLabel, showSelectedTags }} />;
  return <Popover open={open} onOpenChange={next => { setOpen(next); onOpenChange?.(next); if (!next) { setQuery(''); onSearchChange?.(''); } }}>
    <PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={open} className="h-11 w-full justify-between gap-2 text-left text-xs font-normal"><span className="truncate">{selected?.name || placeholder}</span><ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" /></Button></PopoverTrigger>
    <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-64 p-0"><Command shouldFilter={!onSearchChange}>
      <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={next => { setQuery(next); onSearchChange?.(next); }} />
      <CommandList className="max-h-64"><CommandGroup><CommandItem value={allLabel} onSelect={() => { onValueChange(''); close(); }}>{allLabel}</CommandItem></CommandGroup>
        {error ? <div role="alert" className="p-3 text-xs text-red-700">Unable to load options. <button type="button" onClick={onRetry} className="underline">Retry</button></div> : loading ? <p role="status" className="p-3 text-xs text-slate-500">Loading options…</p> : <><CommandEmpty>No matching options.</CommandEmpty><CommandGroup>{options.map(option => <CommandItem key={option.id} value={`${option.name} ${option.description || ''} ${option.id}`} onSelect={() => { onValueChange(option.id); close(); }}><span className="min-w-0 flex-1"><span className="block truncate">{option.name}</span>{option.description && <span className="block truncate text-xs text-slate-500">{option.description}</span>}</span>{value === option.id && <Check className="h-4 w-4 text-blue-700" />}</CommandItem>)}</CommandGroup></>}
      </CommandList>{hasMore && <button type="button" disabled={loading} onClick={onLoadMore} className="w-full border-t p-2 text-xs text-blue-700 disabled:opacity-50">Load more</button>}
    </Command></PopoverContent>
  </Popover>;
}
