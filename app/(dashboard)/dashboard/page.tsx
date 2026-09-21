"use client";

import React, { useEffect, useState, useMemo } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import GlobalAdminDashboardView from "./components/global-admin-dashboard-view";
import BranchAdminDashboardView from "./components/branch-admin-dashboard-view";
import AdminDashboardView from "./components/admin-dashboard-view";
import AccountManagerDashboardView from "./components/account-manager-dashboard-view";
import PodLeadDashboardView from "./components/pod-lead-dashboard-view";
import DeliveryHeadDashboardView from "./components/delivery-head-dashboard-view";
import RecruiterDashboardView from "./components/recruiter-dashboard-view";

export default function DashboardPage() {
  const { profile, selection, status, error, reload } = useDashboardContext();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsRequest, setJobsRequest] = useState(0);
  const canViewJobs = profile?.permissions?.includes("job:view") === true;

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setJobsError(null);
      try {
        const jobsData = canViewJobs ? await atsApi.jobs.list() : [];
        if (!Array.isArray(jobsData)) throw new Error("Invalid jobs response");
        if (!cancelled) setJobs(jobsData);
      } catch (err) {
        if (!cancelled) setJobsError("The dashboard's job data could not be loaded. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [status, profile?.id, profile?.tenantId, canViewJobs, jobsRequest]);

  const handleUpdateJob = async (jobId: string, updatedFields: Partial<any>) => {
    // 1. Optimistic update
    setJobs((prevJobs) =>
      prevJobs.map((job) => (job.id === jobId ? { ...job, ...updatedFields } : job))
    );

    // 2. API Call
    try {
      const apiPayload: Record<string, any> = {};
      if (updatedFields.jobTitle !== undefined) apiPayload.title = updatedFields.jobTitle;
      if (updatedFields.client !== undefined) apiPayload.client = updatedFields.client;
      if (updatedFields.jobStatus !== undefined) apiPayload.status = updatedFields.jobStatus;
      if (updatedFields.priority !== undefined) apiPayload.priority = updatedFields.priority;
      if (updatedFields.clientBillRate !== undefined) apiPayload.clientBillRate = updatedFields.clientBillRate;
      if (updatedFields.payRate !== undefined) apiPayload.payRate = updatedFields.payRate;
      if (updatedFields.assignedTo !== undefined) apiPayload.assignedTo = updatedFields.assignedTo;
      if (updatedFields.podId !== undefined) apiPayload.podId = updatedFields.podId;
      if (updatedFields.primaryRecruiterId !== undefined) apiPayload.primaryRecruiterId = updatedFields.primaryRecruiterId;

      await atsApi.jobs.update(jobId, apiPayload);
      toast.success("Job updated successfully.");
    } catch (err: any) {
      toast.error("Failed to update job: " + err.message);
      // Reload on failure
      try {
        const jobsData = await atsApi.jobs.list().catch(() => []);
        setJobs(jobsData);
      } catch (reloadErr) {
        console.error("Failed to reload jobs:", reloadErr);
      }
    }
  };



  if (status === "error" || jobsError) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <p className="text-sm text-default-600">{status === "error" ? error : jobsError}</p>
        <Button variant="outline" size="sm" onClick={status === "error" ? reload : () => setJobsRequest(value => value + 1)}>Retry</Button>
      </div>
    );
  }

  if (status !== "ready" || loading || !profile || !selection) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-sm text-default-500">Loading workspace dashboard...</p>
      </div>
    );
  }

  const { active, systemRole } = selection;
  const roleName = active.name;

  // Metric calculation helpers
  const activeJobs = jobs.filter(j => j.jobStatus === "Active");
  const highPriorityJobs = activeJobs.filter(j => j.priority === "Hot" || j.priority === "High" || j.priority === "Urgent");



  return (
    <div className="space-y-6">
      <SiteBreadcrumb />

      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome back, {profile?.fullName || "Staff Member"}!
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800">
              <Icon icon="heroicons:sparkles" className="h-3 w-3" />
              {profile?.tenantDomain || "Workspace"}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {roleName === systemRole 
              ? `Monitor active jobs, review candidates, and track team progress.`
              : `Viewing dashboard as ${roleName}.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {profile.permissions?.includes("job:create") && <Link href="/job-posting/new">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-xs h-9 px-3.5 cursor-pointer">
              <Icon icon="heroicons:plus-circle" className="h-4 w-4" />
              + Post New Job
            </Button>
          </Link>}
          {profile.permissions?.includes("candidate:view") && <Link href="/applicants">
            <Button size="sm" variant="outline" className="text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold gap-1.5 h-9 px-3.5 cursor-pointer">
              <Icon icon="heroicons:magnifying-glass" className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Search Candidates
            </Button>
          </Link>}
        </div>
      </div>


      {/* Render Dashboard Widgets based on resolved systemRole */}
      {systemRole === "SUPER_ADMIN" ? (
        <GlobalAdminDashboardView profile={profile} />
      ) : systemRole === "BRANCH_ADMIN" ? (
        <BranchAdminDashboardView 
          profile={profile} 
          jobs={jobs} 
          activeJobs={activeJobs} 
          onUpdateJob={handleUpdateJob} 
        />
      ) : systemRole === "ADMIN" || systemRole === "TENANT_ADMIN" ? (
        <AdminDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} />
      ) : systemRole === "ACCOUNT_MANAGER" ? (
        <AccountManagerDashboardView 
          profile={profile} 
          jobs={jobs} 
          activeJobs={activeJobs} 
          highPriorityJobs={highPriorityJobs} 
          onUpdateJob={handleUpdateJob} 
        />
      ) : systemRole === "POD_LEAD" ? (
        <PodLeadDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} />
      ) : systemRole === "DELIVERY_HEAD" ? (
        <DeliveryHeadDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} />
      ) : (
        <RecruiterDashboardView profile={profile} jobs={jobs} activeJobs={activeJobs} />
      )}
    </div>
  );
}

// ─── GLOBAL ADMIN DASHBOARD VIEW (SUPER_ADMIN COMMAND CENTER) ────────────────