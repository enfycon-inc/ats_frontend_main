"use client";

import React, { useEffect, useState, useMemo } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { atsApi } from "@/lib/ats-api";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { getDashboardJobMetrics } from "@/lib/dashboard-metrics";
import Link from "next/link";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import AddCandidateModal from "@/components/dashboard/AddCandidateModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default // ─── ACCOUNT MANAGER (BDM) DASHBOARD VIEW ────────────────────────────────────
function AccountManagerDashboardView({ 
  profile, 
  jobs, 
  activeJobs, 
  highPriorityJobs,
  onUpdateJob
}: { 
  profile: any; 
  jobs: any[]; 
  activeJobs: any[]; 
  highPriorityJobs: any[];
  onUpdateJob: (jobId: string, updatedFields: Partial<any>) => Promise<void>;
}) {
  const [editingCell, setEditingCell] = useState<{ jobId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editBillRateValue, setEditBillRateValue] = useState("");
  const [editPayRateValue, setEditPayRateValue] = useState("");
  
  // State for AM Submissions
  const [amSubmissions, setAmSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  useEffect(() => {
    async function fetchAmSubmissions() {
      try {
        const data = await atsApi.submissions.list();
        // Assume API returns submissions relevant to AM's portfolio, 
        // or filter locally if needed. 
        setAmSubmissions(Array.isArray(data) ? data : data.data || []);
      } catch (err) {
        console.error("Failed to fetch AM submissions:", err);
      } finally {
        setLoadingSubmissions(false);
      }
    }
    fetchAmSubmissions();
  }, []);

  const handleSaveCell = async (jobId: string, field: string) => {
    if (field === "rates") {
      await onUpdateJob(jobId, { clientBillRate: editBillRateValue || "N/A", payRate: editPayRateValue || "N/A" });
    } else {
      await onUpdateJob(jobId, { [field]: editValue || "N/A" });
    }
    setEditingCell(null);
  };

  const canViewJobs = profile?.permissions?.includes("job:view");
  const canCreateJobs = profile?.permissions?.includes("job:create");

  // Calculations
  const totalJobs = jobs.length;
  const activeRequisitions = activeJobs.length;
  const totalSubmissions = jobs.reduce((sum, j) => sum + (j.submissionDone || 0), 0);
  const avgSubmissions = totalJobs ? (totalSubmissions / totalJobs).toFixed(1) : "0.0";
  const filledJobsCount = jobs.filter(j => j.jobStatus === "Filled" || j.jobStatus === "Closed").length;
  const holdJobsCount = jobs.filter(j => j.jobStatus === "Hold" || j.jobStatus === "On Hold").length;

  return (
    <div className="space-y-6">
      {/* AM Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Jobs Card */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl shadow-inner shrink-0 border border-blue-100 dark:border-blue-900/30">
              <Icon icon="heroicons:briefcase" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total Jobs</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{canViewJobs ? totalJobs : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Total Submissions Card */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl shadow-inner shrink-0 border border-purple-100 dark:border-purple-900/30">
              <Icon icon="heroicons:document-text" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total Submissions</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{canViewJobs ? totalSubmissions : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Filled Jobs Card */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shadow-inner shrink-0 border border-emerald-100 dark:border-emerald-900/30">
              <Icon icon="heroicons:user-group" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Filled Jobs</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{canViewJobs ? filledJobsCount : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Jobs On Hold Card */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shadow-inner shrink-0 border border-amber-100 dark:border-amber-900/30">
              <Icon icon="heroicons:clock" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Jobs On Hold</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{canViewJobs ? holdJobsCount : "N/A"}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AM Jobs Portfolio Table */}
      <Card className="border border-default-150 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <CardHeader className="border-b border-default-100 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Icon icon="heroicons:folder-open" className="text-indigo-655" />
              Active Job Portfolio (AM View)
            </CardTitle>
            <CardDescription className="text-xs">Monitor your assigned requisitions and metrics.</CardDescription>
          </div>
          {canCreateJobs && (
            <Link href="/job-posting/new">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-750 text-white font-semibold text-[11px] px-3 py-1.5 shadow-sm">
                + Create Job
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!canViewJobs ? (
            <div className="p-8 text-center text-xs text-default-400">Access Restricted. Contact Admin.</div>
          ) : activeJobs.length === 0 ? (
            <div className="p-8 text-center text-xs text-default-400">No active job requirements assigned to your portfolio.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-default-50 border-b border-default-200">
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Job Code</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Job Title</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Type / Location</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Client Name</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider text-center">Positions</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider text-center">Submissions</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Responded By</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Rates</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-default-700 uppercase tracking-wider">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100">
                  {activeJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-default-50/70 transition-colors text-xs group">
                      <td className="py-3 px-4 font-mono text-default-700 font-semibold">{job.jobCode}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-default-900">{job.jobTitle}</div>
                        {(job.priority === "Hot" || job.priority === "Urgent" || job.priority === "High") && (
                          <Badge className="mt-1 bg-rose-50 text-rose-600 border-rose-200 text-[9px] px-1.5 py-0">Hot Requirement</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <DashboardJobStatusSelect
                          status={job.jobStatus}
                          onChange={(newStatus) => onUpdateJob(job.id, { jobStatus: newStatus })}
                        />
                      </td>
                      <td className="py-3 px-4 text-default-600">
                        <div className="font-medium">{job.jobType || "Full-Time"}</div>
                        <div className="text-[10px] text-default-450">{job.location || "Remote"}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-default-855">{job.client || "N/A"}</td>
                      <td className="py-3 px-4 text-center font-bold text-default-800">{job.noOfPositions || 1}</td>
                      <td className="py-3 px-4 text-center font-bold text-indigo-650">
                        {job.submissionDone || 0} / {job.submissionRequired || 0}
                      </td>
                      <td className="py-3 px-4 text-default-600">
                        <div className="font-medium">{job.targetDate ? new Date(job.targetDate).toLocaleDateString() : "TBD"}</div>
                        <div className="text-[10px] text-amber-600 font-semibold">{job.jobAge || "0"} days active</div>
                      </td>
                      <td className="py-3 px-4 text-default-800 font-medium">
                        {(() => {
                          const formatRate = (rate: string, market: string) => {
                            if (!rate || rate === "N/A") return "N/A";
                            if (/[a-zA-Z$₹]/.test(rate)) return rate;
                            return market === "IN" ? `INR - ${rate} LPA` : `USD - $${rate}/hr`;
                          };
                          return (
                            <>
                              {formatRate(job.clientBillRate, job.market || "US")}
                              {" "}
                              <span className="text-default-400 font-normal">/</span>
                              {" "}
                              {formatRate(job.payRate, job.market || "US")}
                            </>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-default-500 font-medium">
                        {job.createdOn ? new Date(job.createdOn).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AM Submissions Tracking Table */}
      <Card className="border border-default-150 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <CardHeader className="border-b border-default-100 flex flex-row items-center justify-between bg-emerald-50/30 dark:bg-emerald-900/10">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Icon icon="heroicons:users" className="text-emerald-600" />
              My Portfolio Submissions
            </CardTitle>
            <CardDescription className="text-xs">Track candidate pipeline across your assigned jobs.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingSubmissions ? (
            <div className="p-8 text-center text-xs text-default-400">Loading submissions...</div>
          ) : (
            <div className="p-8 text-center text-xs text-default-400">No candidate submissions recorded for your portfolio yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── POD LEAD / TEAM HEAD DASHBOARD VIEW ──────────────────────────────────────
