"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Search, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PersonFinderOption = {
  id: string;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  description?: string | null;
};

type PeopleFinderProps = {
  options: PersonFinderOption[];
  value?: string;
  onValueChange: (id: string) => void;
  onSearchChange?: (query: string) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
};

function personName(person: PersonFinderOption) {
  return person.fullName?.trim() || person.name?.trim() || person.email?.trim() || "Unknown user";
}

function initialsFor(person: PersonFinderOption) {
  const name = personName(person);
  const words = name.split(/[\s@._-]+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : name.slice(0, 2)).toUpperCase();
}

/** Reusable searchable staff picker. Pass scoped options from the owning feature. */
export function PeopleFinder({
  options,
  value,
  onValueChange,
  onSearchChange,
  loading = false,
  disabled = false,
  placeholder = "Select a person",
  searchPlaceholder = "Find a colleague by name or email...",
  emptyMessage = "No matching people found.",
  className,
}: PeopleFinderProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selected = options.find((person) => person.id === value);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleOptions = React.useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((person) => `${personName(person)} ${person.email || ""}`.toLocaleLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, options]);

  const handleQueryChange = (next: string) => {
    setQuery(next);
    onSearchChange?.(next);
  };

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) handleQueryChange(""); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("h-auto min-h-11 w-full justify-between px-3 py-2 text-left font-normal", className)}
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-3">
              <Avatar className="size-8 border border-blue-100">
                {selected.avatarUrl && <AvatarImage src={selected.avatarUrl} alt="" />}
                <AvatarFallback className="bg-blue-50 text-xs font-semibold text-blue-700">{initialsFor(selected)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{personName(selected)}</span>
                {selected.email && <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{selected.email}</span>}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-slate-500"><Search className="size-4" />{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-3 size-4 shrink-0 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-72 p-0">
        <Command shouldFilter={!onSearchChange}>
          <CommandInput value={query} onValueChange={handleQueryChange} placeholder={searchPlaceholder} />
          <CommandList className="max-h-72">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />Searching people</div>
            ) : (
              <>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {visibleOptions.map((person) => (
                    <CommandItem
                      key={person.id}
                      value={`${personName(person)} ${person.email || ""} ${person.id}`}
                      onSelect={() => { onValueChange(person.id === value ? "" : person.id); setOpen(false); handleQueryChange(""); }}
                      className="min-h-14 gap-3 px-3 py-2.5"
                    >
                      <Avatar className="size-9 border border-slate-200 dark:border-slate-700">
                        {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt="" />}
                        <AvatarFallback className="bg-blue-50 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{initialsFor(person)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{personName(person)}</span>
                        {person.email && <span className="block truncate text-xs text-muted-foreground">{person.email}</span>}
                        {person.description && <span className="block truncate text-xs text-muted-foreground">{person.description}</span>}
                      </span>
                      {person.id === value ? <Check className="size-4 text-blue-700" /> : <Users className="size-4 text-slate-300" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
