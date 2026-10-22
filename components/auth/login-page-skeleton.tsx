"use client";

import styles from './login-page.module.css';

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse motion-reduce:animate-none rounded-md bg-slate-200/80 ${className}`} />;
}

export default function LoginPageSkeleton({ error, onRetry }: { error?: boolean; onRetry?: () => void }) {
  return <main className={`${styles.page} grid min-h-dvh w-full bg-white font-sans text-slate-900 lg:grid-cols-2`} role="status" aria-busy={!error} aria-label={error ? 'Workspace sign-in unavailable' : 'Loading workspace sign-in page'}>
    <span className="sr-only">{error ? 'Unable to load the workspace sign-in page.' : 'Loading the workspace sign-in page…'}</span>
    <section className="relative hidden items-center justify-center p-8 lg:flex xl:p-12" aria-hidden="true">
      <div className="w-full max-w-[780px]">
        <div className="mb-8 space-y-3 px-4"><SkeletonBlock className="h-7 w-3/4" /><SkeletonBlock className="h-4 w-2/5" /></div>
        <div className="relative rounded-[2rem] bg-blue-50 p-6">
          <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
            <SkeletonBlock className="h-8 w-full rounded-none bg-blue-100" />
            <div className="grid grid-cols-[52px_1fr]">
              <SkeletonBlock className="h-56 rounded-none bg-blue-700/70" />
              <div className="p-4"><SkeletonBlock className="mb-4 h-5 w-1/3" /><div className="grid grid-cols-4 gap-2">{Array.from({ length: 12 }, (_, i) => <div key={i} className="rounded-lg bg-blue-50 p-2"><SkeletonBlock className="mb-2 h-3 w-2/3" /><SkeletonBlock className="h-10 w-full bg-white" /></div>)}</div></div>
            </div>
          </div>
          <div className="absolute -bottom-5 left-10 w-40 rounded-xl border border-blue-100 bg-white p-3 shadow-lg"><SkeletonBlock className="mb-2 h-4 w-3/4" /><SkeletonBlock className="h-12 w-full" /></div>
          <div className="absolute -bottom-5 right-8 w-48 rounded-xl border border-blue-100 bg-white p-3 shadow-lg"><SkeletonBlock className="mb-2 h-4 w-2/3" /><SkeletonBlock className="h-12 w-full" /></div>
        </div>
      </div>
    </section>
    <section className="flex min-h-dvh flex-col justify-center px-5 py-8 sm:px-10 lg:px-12" aria-hidden={!error || undefined}>
      <div className="mx-auto w-full max-w-[460px]">
        <div className="mb-10 flex flex-col items-center gap-3"><SkeletonBlock className="h-12 w-12 rounded-xl" /><SkeletonBlock className="h-4 w-36" /><SkeletonBlock className="h-3 w-20" /></div>
        <div className="space-y-6">
          <div className="space-y-3 text-center"><SkeletonBlock className="mx-auto h-7 w-4/5" /><SkeletonBlock className="mx-auto h-4 w-3/5" /></div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><SkeletonBlock className="h-11 w-full rounded-lg" /><SkeletonBlock className="h-11 w-full rounded-lg bg-blue-200/80" /></div>
          <SkeletonBlock className="mx-auto h-3 w-4/5" />
          <div className="flex items-center gap-3"><SkeletonBlock className="h-px flex-1 rounded-none" /><SkeletonBlock className="h-3 w-24" /><SkeletonBlock className="h-px flex-1 rounded-none" /></div>
          <SkeletonBlock className="mx-auto h-3 w-28" />
          <div className="space-y-2 pt-3"><SkeletonBlock className="mx-auto h-3 w-40" /><SkeletonBlock className="mx-auto h-3 w-48" /><SkeletonBlock className="mx-auto h-3 w-44" /></div>
          {error && <div className="text-center" aria-hidden="false"><p className="text-sm text-slate-600">Unable to load your workspace sign-in page.</p><button type="button" onClick={onRetry} className="mt-2 text-sm font-medium text-blue-700 underline underline-offset-2">Try again</button></div>}
        </div>
      </div>
    </section>
  </main>;
}
