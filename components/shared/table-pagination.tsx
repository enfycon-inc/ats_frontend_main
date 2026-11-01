"use client";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
export interface TablePaginationProps {
  page: number; pageSize: number; total?: number; shown?: number; hasNext?: boolean;
  loading?: boolean; pageSizes?: readonly number[]; resetPageOnSizeChange?: boolean;
  onPageChange: (page: number) => void; onPageSizeChange?: (size: number) => void;
  label?: string;
}
export function paginationPages(page: number, totalPages: number): (number | 'gap-left' | 'gap-right')[] {
  const last = Math.max(1, totalPages);
  const pages = Array.from(new Set([1,last,page-1,page,page+1].filter(p => p >= 1 && p <= last))).sort((a,b)=>a-b);
  const result: (number | 'gap-left' | 'gap-right')[] = [];
  pages.forEach((p,i) => { if(i && p-pages[i-1] > 1) result.push(p <= page ? 'gap-left' : 'gap-right'); result.push(p); });
  return result;
}
export function TablePagination({ page, pageSize, total, shown = 0, hasNext = false, loading = false, pageSizes = [10,25,50,100], onPageChange, onPageSizeChange, label = 'records', resetPageOnSizeChange = true }: TablePaginationProps) {
  const known = total !== undefined;
  const pages = known ? Math.max(1, Math.ceil(total / pageSize)) : undefined;
  const next = known ? page < pages! : hasNext;
  const button = 'inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
  const changePage = (value: number) => { if(!loading && value >= 1 && (!known || value <= pages!)) onPageChange(value); };
  const sizes = [...new Set([...pageSizes,pageSize])].sort((a,b)=>a-b);
  return <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-2 font-sans text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" aria-busy={loading}>
    <p aria-live="polite">{known ? `${total === 0 ? 0 : Math.min(total, (page-1)*pageSize+1)}–${Math.min(total!,page*pageSize)} of ${total!.toLocaleString()} ${label}` : `${shown} ${label} shown`}</p>
    <div className="flex flex-wrap items-center gap-3">
      {onPageSizeChange && <label className="flex items-center gap-2"><span className="hidden sm:inline">Rows per page</span><span className="sm:hidden">Rows</span><select aria-label="Rows per page" value={pageSize} disabled={loading} onChange={event => { if(loading) return; const size=Number(event.target.value); if(sizes.includes(size)) { onPageSizeChange(size); if(resetPageOnSizeChange && page !== 1) onPageChange(1); } }} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900">{sizes.map(size=><option key={size} value={size}>{size}</option>)}</select></label>}
      <nav aria-label={`${label} pages`} className="flex items-center gap-1">
        {known && <button type="button" className={`${button} hidden sm:inline-flex`} aria-label="First page" disabled={loading || page<=1} onClick={()=>changePage(1)}><ChevronsLeft className="h-4 w-4" /></button>}
        <button type="button" className={button} aria-label="Previous page" disabled={loading || page<=1} onClick={()=>changePage(page-1)}><ChevronLeft className="h-4 w-4" /></button>
        {known ? <><span className="px-2 sm:hidden">{page} / {pages}</span><span className="hidden items-center gap-1 sm:flex">{paginationPages(page,pages!).map(value=> typeof value === 'number' ? <button type="button" key={value} aria-label={`Page ${value}`} aria-current={value===page?'page':undefined} disabled={loading} onClick={()=>changePage(value)} className={`${button} ${value===page?'!border-[#1a4fa0] !bg-[#1a4fa0] !text-white':''}`}>{value}</button> : <span key={value} className="px-1" aria-hidden="true">…</span>)}</span></> : <span className="px-2">Page {page}</span>}
        <button type="button" className={button} aria-label="Next page" disabled={loading || !next} onClick={()=>changePage(page+1)}><ChevronRight className="h-4 w-4" /></button>
        {known && <button type="button" className={`${button} hidden sm:inline-flex`} aria-label="Last page" disabled={loading || !next} onClick={()=>changePage(pages!)}><ChevronsRight className="h-4 w-4" /></button>}
      </nav>
    </div>
  </footer>;
}
