import { cn } from '@/lib/utils';

export function jobTypeBadgeClass(jobType?: string | null): string {
  switch (jobType?.trim().toLowerCase()) {
    case 'full-time':
    case 'full time': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200';
    case 'part-time':
    case 'part time': return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200';
    case 'contractual':
    case 'contract': return 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200';
    case 'c2h':
    case 'contract to hire':
    case 'contract-to-hire': return 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200';
    case 'freelance': return 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  }
}

export function JobTypeBadge({jobType}: {jobType?: string | null}) {
  if (!jobType?.trim()) return null;
  return <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-semibold leading-4', jobTypeBadgeClass(jobType))}>{jobType.trim()}</span>;
}
