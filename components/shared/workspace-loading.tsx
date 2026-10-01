// Render on the server so the next document is never waiting on JavaScript
// just to show progress. The route boundary removes this when content is ready.
export default function WorkspaceLoading({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`${fullScreen ? "fixed inset-0 z-50" : "min-h-[60vh] w-full"} flex flex-col items-center justify-center gap-4 bg-white text-center dark:bg-neutral-900`}
    >
      <div
        aria-hidden="true"
        className="h-14 w-14 rounded-full border-4 border-indigo-100 border-t-indigo-600 motion-safe:animate-spin dark:border-indigo-900/30 dark:border-t-indigo-400"
      />
      <div className="space-y-1 px-6">
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Loading your workspace</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Preparing your dashboard, please wait.</p>
      </div>
    </div>
  );
}
