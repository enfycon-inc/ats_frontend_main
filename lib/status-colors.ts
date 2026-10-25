export type SubmissionStageTone = 'amber' | 'blue' | 'violet' | 'teal' | 'green' | 'red' | 'neutral';

export const submissionStageToneClasses: Record<SubmissionStageTone, string> = {
  amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  blue: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  violet: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300',
  teal: 'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-300',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  red: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function jobPriorityPresentation(value: unknown) {
  const priority = String(value ?? '').trim().toUpperCase();
  const category = priority.includes('HOT') || priority.includes('HIGH') || priority.includes('URGENT')
    ? 'hot'
    : priority.includes('COLD') || priority.includes('LOW')
      ? 'cold'
      : 'warm';

  return {
    label: category === 'hot' ? 'Hot' : category === 'cold' ? 'Cold' : 'Warm',
    className: category === 'hot'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300'
      : category === 'cold'
        ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/30 dark:text-sky-300'
        : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300',
  };
}
