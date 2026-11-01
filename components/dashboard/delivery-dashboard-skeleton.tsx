import { Skeleton } from '@/components/ui/skeleton';
export function DeliveryDashboardSkeleton() {
  return <div role="status" aria-label="Loading dashboard" className="min-w-0 space-y-4"><Skeleton className="h-12 w-full" /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0,1,2,3].map(index => <Skeleton key={index} className="h-24 w-full" />)}</div><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>;
}
