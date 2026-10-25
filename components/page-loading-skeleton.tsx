import { Skeleton } from '@/components/ui/skeleton';
export type LoadingShape = 'form' | 'table' | 'detail' | 'dashboard' | 'compact';
export function PageLoadingSkeleton({ variant = 'table', label = 'Loading page', compact = false }: { variant?: LoadingShape; label?: string; compact?: boolean }) {
  const fields = (count: number) => Array.from({ length: count }, (_, i) => <div key={i} className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-9 w-full" /></div>);
  return <div role="status" aria-busy="true" className={compact || variant === 'compact' ? 'space-y-4 p-3' : 'w-full space-y-5 p-4 md:p-6'}>
    <span className="sr-only">{label}</span>
    {variant === 'form' ? <>
      <div className="flex justify-between gap-4"><Skeleton className="h-5 w-52" /><div className="flex gap-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-36" /></div></div>
      {[9, 6, 3].map((count, i) => <div key={i} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-200 bg-blue-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800"><Skeleton className="h-3 w-40" /></div><div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">{fields(count)}</div></div>)}
    </> : variant === 'table' ? <>
      <div className="flex flex-wrap justify-between gap-3"><Skeleton className="h-9 w-64" /><Skeleton className="h-9 w-32" /></div>
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"><div className="grid grid-cols-4 gap-4 bg-slate-50 p-4 dark:bg-slate-900">{fields(4).map((_, i) => <Skeleton key={i} className="h-3 w-full" />)}</div>{Array.from({ length: 6 }, (_, i) => <div key={i} className="grid grid-cols-4 gap-4 border-t border-slate-100 p-4 dark:border-slate-800">{Array.from({ length: 4 }, (_, j) => <Skeleton key={j} className="h-4 w-full" />)}</div>)}</div>
    </> : variant === 'dashboard' ? <><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{fields(4)}</div><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div></> : <><Skeleton className="h-5 w-48" /><div className="grid gap-4 sm:grid-cols-2">{fields(variant === 'compact' ? 4 : 8)}</div><Skeleton className="h-32 w-full" /></>}
  </div>;
}
