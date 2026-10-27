import { Skeleton } from '@/components/ui/skeleton';

export function UserPageSkeleton({ mode = 'directory' }: { mode?: 'directory' | 'create' }) {
  if (mode === 'create') return <div aria-label="Loading create user form" role="status" className="space-y-5 p-6">
    <div className="flex gap-3 border-b pb-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-8 w-28" />)}</div>
    <div className="max-w-3xl rounded-xl border p-5"><Skeleton className="mb-5 h-6 w-44" /><div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10 sm:col-span-2" /></div><Skeleton className="mt-6 h-8 w-36" /><Skeleton className="mt-3 h-24" /><div className="mt-6 grid gap-4 sm:grid-cols-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div><div className="mt-5 flex justify-end gap-2"><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-28" /></div></div>
  </div>;
  return <div aria-label="Loading users" role="status" className="space-y-4 p-4 md:p-6">
    <div className="flex gap-3 border-b pb-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-8 w-28" />)}</div>
    <div className="flex items-center gap-3 rounded-xl border p-3"><Skeleton className="h-9 flex-1" /><Skeleton className="h-4 w-28" /></div>
    <div className="overflow-hidden rounded-xl border"><div className="grid grid-cols-8 gap-4 border-b bg-neutral-50 p-3">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-3 w-full" />)}</div>{Array.from({ length: 7 }, (_, i) => <div key={i} className="grid grid-cols-8 items-center gap-4 border-b p-3 last:border-b-0"><div className="col-span-1 flex items-center gap-2"><Skeleton className="size-8 rounded-full" /><div className="space-y-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-24" /></div></div>{Array.from({ length: 7 }, (_, j) => <Skeleton key={j} className="h-5 w-full" />)}</div>)}</div>
  </div>;
}
