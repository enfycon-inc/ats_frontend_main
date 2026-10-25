import { PageLoadingSkeleton } from '@/components/page-loading-skeleton';
export default function WorkspaceLoading({ fullScreen = false }: { fullScreen?: boolean }) {
  return <div className={fullScreen ? 'fixed inset-0 z-50 overflow-hidden bg-white dark:bg-neutral-900' : 'min-h-[60vh] w-full'}><PageLoadingSkeleton variant="dashboard" label="Loading your workspace" /></div>;
}
