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

export default function RecruiterDashboardView({ profile, jobs, activeJobs }: { profile: any; jobs: any[]; activeJobs: any[] }) {
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [selectedJobForCV, setSelectedJobForCV] = useState<any | null>(null);

  useEffect(() => {
    async function loadSubs() {
      try {
        const res = await atsApi.submissions.list();
        const mine = Array.isArray(res) ? res : res?.data || [];
        setMySubmissions(mine);
      } catch (err) {
        console.error("Failed to load my submissions", err);
      } finally {
        setLoadingSubs(false);
      }
    }
    loadSubs();
  }, [profile?.id]);

  // Analytics Calculations
  const totalJobs = jobs.length;
  const activeCount = activeJobs.length;
  const interviewsScheduled = mySubmissions.filter((s) => s.l1Status === "SCHEDULED" || s.l2Status === "SCHEDULED" || s.l3Status === "SCHEDULED" || s.l1Status === "PASSED" || s.l2Status === "PASSED" || s.l3Status === "PASSED").length;
  const selectedCount = mySubmissions.filter((sub) => sub.finalStatus === "OFFER" || sub.finalStatus === "JOIN" || sub.finalStatus === "PLACED").length;

  return (
    <div className="space-y-6">
      {/* 1. RECRUITER QUICK SOURCING TOOLBAR */}
      <div className="p-4 rounded-xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100">
            <Icon icon="heroicons:user-plus" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-default-900">Recruiter Sourcing Workspace</h3>
            <p className="text-xs text-default-500">Pick an active job requisition below to upload candidate CVs or match talent from database.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/applicants">
            <Button size="sm" variant="outline" className="text-xs font-bold border-default-200 h-8 gap-1">
              <Icon icon="heroicons:magnifying-glass" className="h-3.5 w-3.5 text-indigo-600" />
              Talent Bench Search
            </Button>
          </Link>
          <Link href="/email">
            <Button size="sm" variant="outline" className="text-xs font-bold border-default-200 h-8 gap-1 text-purple-700 bg-purple-50/50 hover:bg-purple-100">
              <Icon icon="heroicons:paper-airplane" className="h-3.5 w-3.5 text-purple-600" />
              Mass Mail Outreach
            </Button>
          </Link>
          <Link href="/utility/submissions">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold h-8 gap-1 shadow-xs">
              <Icon icon="heroicons:clipboard-document-list" className="h-3.5 w-3.5" />
              My Submissions Tracker
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. RECRUITER SCORECARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center text-2xl shrink-0 border border-blue-100 dark:border-blue-900/30">
              <Icon icon="heroicons:briefcase" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Active Assigned Jobs</p>
              <h3 className="text-2xl font-bold text-default-900 mt-0.5">{activeCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 flex items-center justify-center text-2xl shrink-0 border border-purple-100 dark:border-purple-900/30">
              <Icon icon="heroicons:document-text" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">My Submissions</p>
              <h3 className="text-2xl font-bold text-default-900 mt-0.5">{mySubmissions.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 flex items-center justify-center text-2xl shrink-0 border border-cyan-100 dark:border-cyan-900/30">
              <Icon icon="heroicons:calendar" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Interviews Scheduled</p>
              <h3 className="text-2xl font-bold text-default-900 mt-0.5">{interviewsScheduled}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center text-2xl shrink-0 border border-emerald-100 dark:border-emerald-900/30">
              <Icon icon="heroicons:trophy" />
            </div>
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">Selections / Placed</p>
              <h3 className="text-2xl font-bold text-default-900 mt-0.5">{selectedCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. WORKSPACE SPLIT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Pane: Active Assigned Jobs Queue */}
        <div className="xl:col-span-8">
          <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl h-full overflow-hidden">
            <CardHeader className="border-b border-default-100 pb-4 px-6 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
              <div>
                <CardTitle className="text-base font-bold text-default-900 flex items-center gap-2">
                  <Icon icon="heroicons:magnifying-glass" className="text-indigo-600" />
                  Active Sourcing Requisitions
                </CardTitle>
                <CardDescription className="text-xs mt-1">Select an active job requisition to post candidate profiles.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {activeJobs.length === 0 ? (
                <div className="p-12 text-center text-xs text-default-400">No active job requirements assigned at the moment.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-default-50 border-b border-default-200 text-default-700 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Job Title & Code</th>
                        <th className="py-3 px-4">Client</th>
                        <th className="py-3 px-4">Budget / Pay Rate</th>
                        <th className="py-3 px-4 text-center">Done / Target</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-100">
                      {activeJobs.slice(0, 10).map((job) => (
                        <tr key={job.id} className="hover:bg-default-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-default-900">{job.jobTitle}</div>
                            <div className="text-[10px] text-indigo-600 font-mono mt-0.5">{job.jobCode}</div>
                          </td>
                          <td className="py-3.5 px-4 text-default-700 font-medium">{job.client || "Client Requisition"}</td>
                          <td className="py-3.5 px-4 font-bold text-default-800">
                            {(() => {
                              const rate = job.payRate;
                              if (!rate || rate === "N/A") return "Standard";
                              if (/[a-zA-Z$₹]/.test(rate)) return rate;
                              return (job.market || "US") === "IN" ? `INR - ${rate} LPA` : `USD - $${rate}/hr`;
                            })()}
                          </td>
                          <td className="py-3.5 px-4 text-center font-extrabold text-indigo-600">
                            {job.submissionDone || 0} / {job.submissionRequired || 5}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button 
                                size="sm" 
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] h-7 px-2.5 shadow-xs"
                                onClick={() => setSelectedJobForCV(job)}
                              >
                                + Add CV
                              </Button>
                              <Link href={`/job-posting/${job.id}/matches`}>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-purple-600 border-purple-200 hover:bg-purple-50 font-bold text-[11px] h-7 px-2"
                                >
                                  AI Match
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Pane: My Recent Submissions Live Feed */}
        <div className="xl:col-span-4">
          <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl h-full flex flex-col justify-between">
            <CardHeader className="border-b border-default-100 pb-4 px-5 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-default-900 flex items-center gap-2">
                <Icon icon="heroicons:document-check" className="text-emerald-500" />
                My Active Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {loadingSubs ? (
                <div className="p-6 text-center text-xs text-default-400">Loading submissions...</div>
              ) : mySubmissions.length === 0 ? (
                <div className="p-8 text-center text-xs text-default-400">No candidate submissions recorded yet.</div>
              ) : (
                <div className="max-h-[480px] overflow-y-auto divide-y divide-default-100">
                  {mySubmissions.slice(0, 10).map((sub) => (
                    <div key={sub.id} className="p-3.5 hover:bg-default-50/50 transition-colors flex items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-bold text-default-900">{sub.candidateName || `Candidate #${sub.candidateId}`}</p>
                        <p className="text-[10px] text-default-400 font-mono mt-0.5">{sub.jobCode || "Requirement"}</p>
                      </div>
                      <Badge className={`px-2 py-0.5 text-[9px] font-bold ${
                        sub.finalStatus === "PENDING_APPROVAL" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" :
                        sub.finalStatus === "SUBMITTED" || sub.finalStatus === "POD_APPROVED" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" :
                        sub.finalStatus === "REJECTED" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" :
                        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      }`}>
                        {sub.finalStatus?.replace("_", " ") || "SUBMITTED"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Candidate CV Upload Modal */}
      <AddCandidateModal 
        isOpen={!!selectedJobForCV} 
        onClose={() => setSelectedJobForCV(null)} 
        job={selectedJobForCV} 
      />
    </div>
  );
}

