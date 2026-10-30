// Shared presentation for the job grid and analytical comparison grids.
// Adapters retain their own permissions, sorting, data and workflow actions.
export const enterpriseGrid = {
  surface: 'min-w-0 overflow-hidden rounded-sm border border-neutral-200 bg-white font-sans text-sm text-slate-800 shadow-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
  toolbar: 'flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50/50 px-4 py-3 text-[13px] dark:border-slate-800 dark:bg-slate-900/50',
  filters: 'flex flex-wrap items-end gap-3 border-b border-neutral-200 bg-white px-4 py-3 text-[13px] dark:border-slate-800 dark:bg-slate-900',
  table: 'w-full border-collapse text-left font-sans text-sm',
  header: 'sticky top-0 z-20 bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300',
  heading: 'border-b border-r border-neutral-200 bg-slate-100 px-4 py-3 text-xs font-semibold leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
  row: 'border-b border-neutral-200/70 even:bg-slate-50 hover:bg-blue-50/40 dark:border-slate-800 dark:even:bg-slate-800/40 dark:hover:bg-slate-800/60',
  cell: 'border-r border-neutral-200/70 px-4 py-2 text-sm dark:border-slate-800',
  control: 'h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
};
