"use client";

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, GripVertical } from 'lucide-react';
import { type TrackerSortKey, type TrackerSortDirection } from '@/lib/submission-contract';
import { cn } from '@/lib/utils';

export type TrackerColumn = TrackerSortKey | 'actions';
const DEFAULT_COLUMNS: TrackerColumn[] = ['job', 'manager', 'recruiter', 'candidate', 'pipeline', 'status', 'jobCreated', 'submitted', 'actions'];
export const TRACKER_COLUMN_WIDTHS: Record<TrackerColumn, number> = { job: 270, manager: 185, recruiter: 185, candidate: 260, pipeline: 255, status: 190, jobCreated: 145, submitted: 145, actions: 88 };

export function useTrackerColumns(storageKey: string | null, grouped: boolean, managerLabel: string) {
  const [saved, setSaved] = useState<{ key: string; order: TrackerColumn[] } | null>(null);
  const [sort, setSort] = useState<{ key: TrackerSortKey; direction: TrackerSortDirection }>({ key: 'submitted', direction: 'desc' });
  const [dragged, setDragged] = useState<TrackerColumn | null>(null);
  const [over, setOver] = useState<TrackerColumn | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    if (!storageKey) return;
    let active = true;
    const restoreOrder = () => {
      if (!active) return;
      try {
        const value: unknown = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (Array.isArray(value) && value.length === DEFAULT_COLUMNS.length && new Set(value).size === value.length && value.every(key => DEFAULT_COLUMNS.includes(key)) && value.at(-1) === 'actions') {
          setSaved({ key: storageKey, order: value as TrackerColumn[] });
        }
      } catch { /* Storage may be unavailable; the table remains usable. */ }
    };
    const restoreHandle = window.setTimeout(restoreOrder, 0);
    return () => { active = false; window.clearTimeout(restoreHandle); };
  }, [storageKey]);
  const order = saved && saved.key === storageKey ? saved.order : DEFAULT_COLUMNS;
  const columns = order.filter(key => !grouped || key !== 'job');
  function move(source: TrackerColumn, target: TrackerColumn) {
    if (!storageKey || source === target || source === 'actions' || target === 'actions') return;
    const next = order.filter(key => key !== source);
    next.splice(order.indexOf(target), 0, source);
    setSaved({ key: storageKey, order: next });
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep the order for this visit. */ }
  }
  const labels: Record<TrackerColumn, string> = { job: 'Job reference', manager: managerLabel, recruiter: 'Recruiter', candidate: 'Candidate', pipeline: 'Pipeline', status: 'Current status', jobCreated: 'Job created at', submitted: 'Submission date', actions: 'Actions' };
  function headers(onSort: () => void) {
    return columns.map(column => {
      const active = column === sort.key;
      const Icon = active ? sort.direction === 'asc' ? ArrowUp : ArrowDown : ChevronsUpDown;
      return <th key={column} scope="col" aria-sort={active ? sort.direction === 'asc' ? 'ascending' : 'descending' : undefined}
        draggable={column !== 'actions'}
        onDragStart={event => { suppressClick.current = true; setDragged(column); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', column); }}
        onDragOver={event => { if (dragged && column !== 'actions') { event.preventDefault(); setOver(column); } }}
        onDrop={event => { event.preventDefault(); if (dragged) move(dragged, column); setDragged(null); setOver(null); }}
        onDragEnd={() => { setDragged(null); setOver(null); }}
        className={cn('border-b bg-slate-100/95 px-3 py-3.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-900 dark:text-slate-300', column !== 'actions' && 'cursor-grab hover:bg-slate-200/70 active:cursor-grabbing dark:hover:bg-slate-800', dragged === column && 'opacity-40', over === column && 'shadow-[inset_3px_0_0_#1a4fa0]', column === 'actions' && 'sticky right-0 z-20 pr-6 text-center shadow-[-1px_0_0_0_var(--border)]')}>
        {column === 'actions' ? labels[column] : <button type="button" className="flex w-full items-center gap-1.5 text-left uppercase focus-visible:outline-2 focus-visible:outline-blue-500" title="Drag to reorder, click to sort. Alt + Left/Right moves this column."
          onPointerDown={() => { suppressClick.current = false; }}
          onKeyDown={event => { if (event.altKey && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); const target = columns[columns.indexOf(column) + (event.key === 'ArrowLeft' ? -1 : 1)]; if (target) move(column, target); } }}
          onClick={() => { if (suppressClick.current) return; setSort({ key: column, direction: active && sort.direction === 'asc' ? 'desc' : 'asc' }); onSort(); }}>
          <GripVertical aria-hidden="true" className="h-3 w-3 shrink-0 text-slate-400" /><span className="flex-1">{labels[column]}</span><Icon aria-hidden="true" className="h-3 w-3 shrink-0" /><span className="sr-only">Sort {labels[column]}</span>
        </button>}
      </th>;
    });
  }
  return { columns, sort, headers };
}
