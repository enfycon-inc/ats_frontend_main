"use client";

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Check, ChevronsUpDown, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { atsApi } from '@/lib/ats-api';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { getActiveRolePermissions } from '@/lib/role-permissions';
import { JOB_EXPORT_PERMISSION, JOB_EXPORT_MAX_JOBS, type JobExportRequest } from '@/lib/job-export-contract';
import { localReportDate, resolveJobExportPeriod, type JobExportPeriod } from '@/lib/job-export-period';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { PageLoadingSkeleton } from '@/components/page-loading-skeleton';

const inputClass = 'h-9 text-xs bg-white dark:bg-slate-900';

export default function ReportsPage() {
  const { profile, roles, selection, status, error: accessError, reload } = useDashboardContext();
  const permissions = getActiveRolePermissions(selection.active.id, roles, profile);
  const allowed = permissions.some(p => [JOB_EXPORT_PERMISSION, '*', 'platform:manage'].includes(p));
  const [period, setPeriod] = useState<JobExportPeriod>('month');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [timezone, setTimezone] = useState('');
  const [manager, setManager] = useState('');
  const [managerOpen, setManagerOpen] = useState(false);
  const [includeSubmissions, setIncludeSubmissions] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const branch = typeof window === 'undefined' ? '' : localStorage.getItem('active_branch_id') || '';
  const { data: managers, error: managerError, isLoading, mutate } = useSWR(
    allowed && status === 'ready' ? ['job-export-managers', profile?.tenantId, selection.active.id, branch] : null,
    () => atsApi.jobs.exportManagers(), { keepPreviousData: false },
  );

  useEffect(() => {
    const now = new Date();
    setDay(localReportDate(now)); setMonth(localReportDate(now).slice(0, 7));
    setFrom(localReportDate(new Date(now.getFullYear(), now.getMonth(), 1))); setTo(localReportDate(now));
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  useEffect(() => { setManager(''); setManagerOpen(false); setError(''); }, [branch, selection.active.id, profile?.tenantId]);

  const exportReport = async () => {
    setError('');
    try {
      const request: JobExportRequest = { ...resolveJobExportPeriod(period, day, month, from, to), includeSubmissions,
        ...(manager ? { accountManagerId: manager } : {}) };
      setExporting(true);
      const result = await atsApi.jobs.exportReport(request);
      const bytes = Uint8Array.from(atob(result.content), character => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a'); link.href = url;
      link.download = `job_report_${period === 'month' ? month : period === 'day' ? day : `${from}_to_${to}`}.xlsx`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Job report exported.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to export the report. Please try again.');
    } finally { setExporting(false); }
  };

  if (status === 'loading') return <PageLoadingSkeleton variant="form" />;
  if (status === 'error') return <div className="p-6 space-y-3"><p role="alert" className="text-xs">{accessError}</p><Button variant="outline" onClick={reload}>Retry</Button></div>;
  if (!allowed) return <p role="alert" className="p-6 text-xs text-neutral-600">Job export permission is required to access Reports.</p>;

  return <main className="p-4 md:p-6 space-y-5">
    <div><h1 className="text-xl font-bold tracking-tight">Reports</h1><p className="mt-1 text-xs text-neutral-500">Export job data and candidate submissions.</p></div>
    <section aria-labelledby="export-title" className="max-w-4xl rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-200 dark:border-slate-800"><h2 id="export-title" className="text-sm font-bold">Job data export</h2></div>
      <form onSubmit={event => { event.preventDefault(); void exportReport(); }}>
        <fieldset disabled={exporting} className="p-5 space-y-6 disabled:opacity-70">
          <div className="grid gap-3 md:grid-cols-[200px_1fr]">
            <span id="period-label" className="text-xs font-semibold md:pt-2">Period</span>
            <div className="space-y-3">
              <div role="group" aria-labelledby="period-label" className="flex rounded-md border border-neutral-200 dark:border-slate-700 overflow-hidden">
                {(['day', 'month', 'range'] as const).map(value => <button type="button" key={value} aria-pressed={period === value} onClick={() => { setPeriod(value); setError(''); }}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${period === value ? 'bg-primary/10 text-primary' : 'bg-neutral-50 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300'}`}>
                  {value === 'range' ? 'Date range' : value === 'day' ? 'Day' : 'Month'}
                </button>)}
              </div>
              {period === 'day' ? <Input aria-label="Day" required type="date" value={day} onChange={event => setDay(event.target.value)} className={inputClass} />
                : period === 'month' ? <Input aria-label="Month" required type="month" value={month} onChange={event => setMonth(event.target.value)} className={inputClass} />
                  : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-xs space-y-1 block">From<Input required type="date" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)} className={inputClass} /></label>
                    <label className="text-xs space-y-1 block">To<Input required type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} className={inputClass} /></label></div>}
              <p className="text-xs text-neutral-500">Jobs created during this period{timezone ? ` (${timezone})` : ''}. Start and end dates are included.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[200px_1fr]">
            <span id="manager-label" className="text-xs font-semibold md:pt-2">Account manager</span>
            <div>
              <Popover open={managerOpen} onOpenChange={setManagerOpen}><PopoverTrigger asChild>
                <Button variant="outline" type="button" role="combobox" aria-labelledby="manager-label" aria-expanded={managerOpen} disabled={isLoading || !!managerError} className="w-full justify-between h-9 text-xs font-normal">
                  {isLoading ? 'Loading account managers…' : manager ? managers?.find(item => item.id === manager)?.name || 'Choose an account manager' : 'All accessible account managers'}<ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger><PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command><CommandInput placeholder="Search account managers…" /><CommandList><CommandEmpty>No account managers found.</CommandEmpty><CommandGroup>
                  <CommandItem value="all-accessible-managers" onSelect={() => { setManager(''); setManagerOpen(false); }}>All accessible account managers{!manager && <Check className="ml-auto h-3.5 w-3.5" />}</CommandItem>
                  {managers?.map(item => <CommandItem key={item.id} value={`${item.name} ${item.id}`} onSelect={() => { setManager(item.id); setManagerOpen(false); }}>{item.name}{manager === item.id && <Check className="ml-auto h-3.5 w-3.5" />}</CommandItem>)}
                </CommandGroup></CommandList></Command>
              </PopoverContent></Popover>
              {managerError && <div className="mt-2 flex items-center gap-2 text-xs"><p role="alert" className="text-red-600">Unable to load account managers.</p><button type="button" className="underline" onClick={() => void mutate()}>Retry</button></div>}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[200px_1fr] border-t border-neutral-200 dark:border-slate-800 pt-5">
            <label htmlFor="include-submissions" className="text-xs font-semibold">Include candidate submissions</label>
            <div className="space-y-2"><Switch id="include-submissions" checked={includeSubmissions} onCheckedChange={setIncludeSubmissions} />
              <p className="text-xs text-neutral-500">{includeSubmissions ? 'Includes all submissions for these jobs, with candidate details, compensation and submission status.' : 'Exports job details and submission totals only.'}</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[200px_1fr]">
            <span className="text-xs font-semibold md:pt-2">Excel workbook (.xlsx)</span>
            <div className="space-y-2"><div className="flex flex-wrap gap-2">{['Jobs Summary', ...(includeSubmissions ? ['Job Submissions'] : [])].map(sheet => <span key={sheet} className="inline-flex items-center gap-2 px-3 py-2 border border-neutral-200 dark:border-slate-700 rounded-md text-xs"><FileSpreadsheet className="h-4 w-4 text-primary" />{sheet}</span>)}</div>
              <p className="text-xs text-neutral-500">Client names included. Client POC details excluded.</p>
              <p className="text-xs text-neutral-500">Up to {JOB_EXPORT_MAX_JOBS} jobs per export. Choose a shorter period for larger reports.</p>
            </div>
          </div>
          {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </fieldset>
        <div className="flex justify-end border-t border-neutral-200 dark:border-slate-800 px-5 py-4"><Button type="submit" disabled={exporting || isLoading || !!managerError || !day} className="h-9 text-xs gap-2">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{exporting ? 'Exporting…' : 'Export Excel'}
        </Button></div>
      </form>
    </section>
  </main>;
}
