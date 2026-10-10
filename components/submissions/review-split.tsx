"use client";

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { GripVertical, RotateCcw } from 'lucide-react';

const preferenceKey = 'submission-review-split';
export const clampSplit = (value: number) => Math.min(65, Math.max(35, value));

export function ReviewSplit({ left, right, expanded }: { left: ReactNode; right: ReactNode; expanded: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(55);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(preferenceKey);
        if (saved !== null && Number.isFinite(Number(saved))) setWidth(clampSplit(Number(saved)));
      } catch { /* Layout preferences are optional. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  function change(value: number) {
    const next = clampSplit(value);
    setWidth(next);
    try { localStorage.setItem(preferenceKey, String(next)); } catch { /* Keep resizing available. */ }
  }
  return <div ref={container} style={{ '--review-left': `${width}fr`, '--review-right': `${100 - width}fr` } as CSSProperties}
    className={`grid min-h-0 flex-1 gap-2 ${dragging ? 'select-none' : ''} ${expanded ? 'grid-cols-1' : 'lg:grid-cols-[minmax(0,var(--review-left))_16px_minmax(0,var(--review-right))]'}`}>
    {left}
    {!expanded && <div className="hidden min-h-0 flex-col items-center justify-center gap-2 lg:flex">
      <div role="separator" aria-label="Resize comparison and resume panels" aria-orientation="vertical" aria-valuemin={35} aria-valuemax={65} aria-valuenow={Math.round(width)} tabIndex={0}
        className="flex h-32 w-4 touch-none cursor-col-resize items-center justify-center rounded border border-border bg-muted text-muted-foreground hover:border-blue-500 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500"
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); }}
        onPointerMove={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const bounds = container.current?.getBoundingClientRect(); if (bounds) change((event.clientX - bounds.left) / bounds.width * 100); }}
        onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setDragging(false); }}
        onLostPointerCapture={() => setDragging(false)} onPointerCancel={() => setDragging(false)}
        onDoubleClick={() => change(55)}
        onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); change(event.key === 'Home' ? 35 : event.key === 'End' ? 65 : width + (event.key === 'ArrowLeft' ? -2 : 2)); } }}>
        <GripVertical aria-hidden className="h-4 w-4" />
      </div>
      <button type="button" title="Reset panel widths" aria-label="Reset panel widths" onClick={() => change(55)} className="rounded py-2 text-muted-foreground hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500"><RotateCcw aria-hidden className="h-3.5 w-3.5" /></button>
    </div>}
    <div className={`min-h-0 min-w-0 ${dragging ? 'pointer-events-none' : ''} ${expanded ? 'flex' : 'contents'}`}>{right}</div>
  </div>;
}
