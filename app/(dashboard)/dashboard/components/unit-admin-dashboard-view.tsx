"use client";
import { getUnitDashboardJobs } from "@/lib/unit-dashboard";

export default function UnitAdminDashboardView({ profile, jobs }: { profile: any; jobs: any[] }) {
  const scoped = getUnitDashboardJobs(profile, jobs);
  if (!profile.businessUnitId || !profile.branchId) return <p role="alert" className="text-sm text-slate-600">A branch and unit assignment are required to load your unit dashboard.</p>;
  const metrics = [
    ["Unit jobs", scoped.length],
    ["Active jobs", scoped.filter(j => String(j.jobStatus).toLowerCase() === "active").length],
    ["Pending approval", scoped.filter(j => j.approvalStatus === "PENDING_APPROVAL").length],
  ];
  return <section aria-label="Unit dashboard" className="space-y-4">
    <div><h2 className="text-sm font-bold">{profile.businessUnitName || "Assigned unit"}</h2><p className="text-xs text-slate-500">{profile.branchName || "Assigned branch"}</p></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold mt-2">{value}</p></div>)}</div>
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <table className="w-full text-xs text-left"><caption className="text-left p-4 text-sm font-bold">Jobs in your unit</caption><thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="p-3">Job</th><th className="p-3">Client</th><th className="p-3">Status</th></tr></thead><tbody>{scoped.map(job => <tr key={job.id} className="border-t border-slate-200 dark:border-slate-700"><td className="p-3">{job.jobTitle}</td><td className="p-3">{job.client}</td><td className="p-3">{job.jobStatus}</td></tr>)}</tbody></table>
      {scoped.length === 0 && <p className="p-4 text-xs text-slate-500">No jobs in your assigned unit.</p>}
    </div>
  </section>;
}
