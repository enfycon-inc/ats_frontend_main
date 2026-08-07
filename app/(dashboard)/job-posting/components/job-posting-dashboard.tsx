"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { mockJobs, mockJobsIN, mapApiJobToJob, Job } from "../data/mock-jobs";
import { atsApi } from "@/lib/ats-api";
import DataTable from "./data-table";
import FilterDrawer, { SelectedFilters } from "./filter-drawer";
import ColumnDrawer from "./column-drawer";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import {
  Briefcase,
  Users,
  FileCheck,
  Activity,
  AlertCircle,
  Loader2,
} from "lucide-react";



const matchStatus = (jobStatus: string, filter: string) => {
  if (filter === "All") return true;
  if (filter === "Close" || filter === "Closed") {
    return jobStatus === "Close" || jobStatus === "Closed";
  }
  if (filter === "Hold" || filter === "Hold by Client") {
    return jobStatus === "Hold" || jobStatus === "Hold by Client";
  }
  return jobStatus === filter;
};

interface JobPostingDashboardProps {
  initialStatusFilter?: "Active" | "Close" | "Closed" | "Filled" | "Hold" | "Hold by Client" | "Draft" | "All";
}

export default function JobPostingDashboard({
  initialStatusFilter = "All",
}: JobPostingDashboardProps) {
  // Market State (US or India)
  const [market, setMarket] = useState<"US" | "IN">("IN");

  // Drawer States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnOpen, setIsColumnOpen] = useState(false);

  // User details & permission controls
  const currentUser = useMemo(() => {
    if (typeof window !== "undefined") {
      return atsApi.auth.getCurrentUser();
    }
    return null;
  }, []);

  const hasEditPermission = useMemo(() => {
    if (!currentUser) return false;
    const permissions = currentUser.permissions || [];
    return permissions.includes("job:edit") || currentUser.roles?.includes("SUPER_ADMIN") || currentUser.roles?.includes("ADMIN");
  }, [currentUser]);

  // Table Configuration States
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "jobCode",
    "jobTitle",
    "businessUnit",
    "client",
    "location",
    "states",
    "jobStatus",
    "podName",
    "clientBillRate",
    "payRate",
    "recruitmentManager",
    "primaryRecruiter",
    "submissionsCount",
  ]);

  const activeSelectedColumns = useMemo(() => {
    if (!hasEditPermission) {
      return selectedColumns.filter((colId) => colId !== "clientBillRate");
    }
    return selectedColumns;
  }, [selectedColumns, hasEditPermission]);

  // Saved Views State
  const [savedViews, setSavedViews] = useState<string[]>([
    "My Open Requirements",
    "Hot IT Jobs",
    "Bench Jobs",
  ]);
  const [activeView, setActiveView] = useState("All Jobs");

  // Filtering States
  const [currentFilters, setCurrentFilters] = useState<SelectedFilters>({
    businessUnit: "All selected",
    predefined: [],
  });

  // Job Data
  const [jobsData, setJobsData] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load user profile on mount to get default market
  useEffect(() => {
    async function loadProfile() {
      try {
        // No auto-login fallback (prevent tenant hijacking)
        const prof = await atsApi.auth.me();
        if (prof && prof.defaultMarket) {
          setMarket(prof.defaultMarket);
        }
      } catch (err) {
        console.warn("[Dashboard] Failed to fetch profile on mount:", err);
      }
    }
    loadProfile();
  }, []);

  // Fetch jobs from backend API
  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      // No auto-login fallback (prevent tenant hijacking)
      const apiJobs = await atsApi.jobs.list();
      if (apiJobs && apiJobs.length > 0) {
        const mapped = apiJobs.map(mapApiJobToJob);
        // Filter by the current market shift (defaulting to "IN" if not present)
        const shiftJobs = mapped.filter((job) => (job.market || "IN") === market);
        // Pre-filter by status if required
        const filteredByRoute = shiftJobs.filter((job) => matchStatus(job.jobStatus, initialStatusFilter));

        setAllJobs(shiftJobs);
        setJobsData(filteredByRoute);
      } else {
        const fallbackJobs = market === "IN" ? mockJobsIN : mockJobs;
        const filteredByRoute = fallbackJobs.filter((job) => matchStatus(job.jobStatus, initialStatusFilter));
        setAllJobs(fallbackJobs);
        setJobsData(filteredByRoute);
      }
    } catch (err) {
      console.warn("[Jobs] API fetch failed, using mock data:", err);
      const fallbackJobs = market === "IN" ? mockJobsIN : mockJobs;
      const filteredByRoute = fallbackJobs.filter((job) => matchStatus(job.jobStatus, initialStatusFilter));
      setAllJobs(fallbackJobs);
      setJobsData(filteredByRoute);
    } finally {
      setIsLoading(false);
    }
  }, [initialStatusFilter, market]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const allColumns = useMemo(() => {
    const cols = [
      { id: "jobCode", label: "Job Code" },
      { id: "jobTitle", label: "Job Title" },
      { id: "businessUnit", label: "Business Unit" },
      { id: "client", label: "Client" },
      { id: "clientJobId", label: "Client Job ID" },
      { id: "location", label: "Location" },
      { id: "states", label: "States" },
      { id: "jobStatus", label: "Job Status" },
      { id: "priority", label: "Priority" },
      { id: "podName", label: "Assigned Pod" },
      {
        id: "clientBillRate",
        label: market === "IN" ? "Client Bill Rate / CTC" : "Client Bill Rate / Salary",
      },
      {
        id: "payRate",
        label: market === "IN" ? "Pay Rate / CTC" : "Pay Rate / Salary",
      },
      { id: "recruitmentManager", label: "Recruitment Manager" },
      { id: "primaryRecruiter", label: "Primary Recruiter" },
      { id: "assignedTo", label: "Assigned To" },
      { id: "createdBy", label: "Job Posting Created By" },
      { id: "createdOn", label: "Job Created" },
      { id: "modifiedOn", label: "Job Modified On" },
      { id: "submissionsCount", label: "Submissions & Pipeline" },
    ];
    if (!hasEditPermission) {
      return cols.filter((col) => col.id !== "clientBillRate");
    }
    return cols;
  }, [market, hasEditPermission]);

  const handleApplyFilters = (filters: SelectedFilters) => {
    setCurrentFilters(filters);

    let filtered = [...allJobs];

    // Status Filter if set on route level
    if (initialStatusFilter !== "All") {
      filtered = filtered.filter((job) => matchStatus(job.jobStatus, initialStatusFilter));
    }

    // Business Unit filter
    if (filters.businessUnit !== "All selected") {
      filtered = filtered.filter(
        (job) => job.businessUnit === filters.businessUnit
      );
    }

    // Predefined tags filter
    if (filters.predefined.length > 0) {
      filtered = filtered.filter((job) => {
        return filters.predefined.some((pref) => {
          if (pref === "Active Jobs") return job.jobStatus === "Active";
          if (pref === "Archived Jobs") return job.jobStatus === "Archived";
          if (pref === "Closed Jobs") return job.jobStatus === "Closed" || job.jobStatus === "Close";
          if (pref === "My Jobs") return job.primaryRecruiter === "Sahadeb Sen";
          if (pref === "Jobs with submissions") return job.submissionsCount > 0;
          if (pref === "Jobs without submissions") return job.submissionsCount === 0;
          if (pref === "Jobs with Pipeline")
            return (
              job.pipeline.applied > 0 ||
              job.pipeline.interviewing > 0 ||
              job.pipeline.offered > 0
            );
          if (pref === "VMS Jobs") return job.clientJobId !== "N/A";
          return true;
        });
      });
    }

    setJobsData(filtered);
  };

  const handleSaveView = (viewName: string) => {
    setSavedViews((prev) => [...prev, viewName]);
    setActiveView(viewName);
  };

  const handleSelectView = (viewName: string) => {
    setActiveView(viewName);
    
    let baseData = [...allJobs];
    if (initialStatusFilter !== "All") {
      baseData = baseData.filter((job) => matchStatus(job.jobStatus, initialStatusFilter));
    }

    if (viewName === "All Jobs") {
      setJobsData(baseData);
      setCurrentFilters({ businessUnit: "All selected", predefined: [] });
    } else if (viewName === "My Open Requirements") {
      const myJobs = baseData.filter(
        (job) =>
          job.jobStatus === "Active" && job.primaryRecruiter !== "N/A"
      );
      setJobsData(myJobs);
    } else if (viewName === "Hot IT Jobs") {
      const hotJobs = baseData.filter((job) => job.submissionsCount > 15);
      setJobsData(hotJobs);
    } else if (viewName === "Bench Jobs") {
      const benchJobs = baseData.filter((job) =>
        (job.jobTitle || "").toLowerCase().includes("developer")
      );
      setJobsData(benchJobs);
    }
  };

  const handleUpdateJob = useCallback(async (jobId: string, updatedFields: Partial<Job>) => {
    // 1. Instantly update local state for optimistic UI responsiveness
    setAllJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, ...updatedFields } : job))
    );
    setJobsData((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, ...updatedFields } : job))
    );

    // 2. Prepare payload and persist to database
    try {
      const apiPayload: Record<string, any> = {};

      if (updatedFields.jobTitle !== undefined) apiPayload.title = updatedFields.jobTitle;
      if (updatedFields.client !== undefined) apiPayload.client = updatedFields.client;
      if (updatedFields.location !== undefined) apiPayload.location = updatedFields.location;
      if (updatedFields.jobStatus !== undefined) apiPayload.status = updatedFields.jobStatus;
      if (updatedFields.priority !== undefined) apiPayload.priority = updatedFields.priority;
      if (updatedFields.assignedTo !== undefined) apiPayload.assignedTo = updatedFields.assignedTo;

      // Handle recruiter name resolution to user UUID
      if (updatedFields.primaryRecruiter !== undefined) {
        const recruiterName = updatedFields.primaryRecruiter;
        if (recruiterName === "N/A" || !recruiterName) {
          apiPayload.primaryRecruiterId = null;
        } else {
          const users = await atsApi.auth.listUsers();
          const foundUser = users.find((u: any) => u.fullName === recruiterName);
          if (foundUser) {
            apiPayload.primaryRecruiterId = foundUser.id;
          } else {
            apiPayload.primaryRecruiterId = null;
          }
        }
      }

      await atsApi.jobs.update(jobId, apiPayload);
      toast.success("Job updated successfully.");
    } catch (err: any) {
      toast.error("Failed to update job: " + err.message);
      // Revert local state by reloading from server
      fetchJobs();
    }
  }, [fetchJobs]);

  const handleRefresh = () => {
    setCurrentFilters({ businessUnit: "All selected", predefined: [] });
    setActiveView("All Jobs");
    fetchJobs();
    toast.success("Jobs list reloaded.");
  };

  // Productivity Metrics
  const stats = useMemo(() => {
    const total = jobsData.length;
    const active = jobsData.filter((j) => j.jobStatus === "Active").length;
    const closed = jobsData.filter((j) => j.jobStatus === "Closed" || j.jobStatus === "Close").length;
    const totalSubmissions = jobsData.reduce(
      (sum, j) => sum + j.submissionsCount,
      0
    );
    const avgAging = Math.round(
      jobsData.reduce((sum, j) => sum + j.agingDays, 0) / (total || 1)
    );
    const slaAlerts = jobsData.filter((j) => j.agingDays > 30).length;

    return { total, active, closed, totalSubmissions, avgAging, slaAlerts };
  }, [jobsData]);

  return (
    <div className="h-full flex flex-col min-h-0 font-sans gap-2 p-0">
      {/* Recruiter Metrics KPI Strip */}
      <div className="w-full min-w-0 flex items-center gap-6 shrink-0 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 px-6 py-1.5 rounded-sm select-none shadow-xs text-[11px] overflow-x-auto">
        {/* Total Jobs */}
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider">Total Jobs:</span>
          <span className="font-extrabold text-neutral-800 dark:text-neutral-100 text-xs">{stats.total}</span>
        </div>

        <div className="h-4 w-px bg-neutral-200 dark:bg-slate-700" />

        {/* Active */}
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          <span className="text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider">Active:</span>
          <span className="font-extrabold text-green-700 dark:text-green-400 text-xs">{stats.active}</span>
        </div>

        <div className="h-4 w-px bg-neutral-200 dark:bg-slate-700" />

        {/* Submissions */}
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider">Submissions:</span>
          <span className="font-extrabold text-neutral-800 dark:text-neutral-100 text-xs">{stats.totalSubmissions}</span>
        </div>

        <div className="h-4 w-px bg-neutral-200 dark:bg-slate-700" />

        {/* Placements */}
        <div className="flex items-center gap-1.5">
          <FileCheck className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <span className="text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider">Placements:</span>
          <span className="font-extrabold text-purple-700 dark:text-purple-400 text-xs">14</span>
        </div>

        {/* SLA Alerts — only show when there are alerts */}
        {stats.slaAlerts > 0 && (
          <>
            <div className="h-4 w-px bg-neutral-200 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              <span className="text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider">SLA Alerts:</span>
              <span className="font-extrabold text-red-600 dark:text-red-400 text-xs flex items-center gap-1">
                {stats.slaAlerts}
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
              </span>
            </div>
          </>
        )}
      </div>

      {/* Main Table Content */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Loading requirement pipelines...</p>
        </div>
      ) : (
        <DataTable
          data={jobsData}
          selectedColumns={activeSelectedColumns}
          allColumns={allColumns}
          onOpenFilters={() => setIsFilterOpen(true)}
          onOpenColumns={() => setIsColumnOpen(true)}
          onRefresh={handleRefresh}
          onSaveView={handleSaveView}
          savedViews={savedViews}
          activeView={activeView}
          onSelectView={handleSelectView}
          onUpdateJob={handleUpdateJob}
        />
      )}

      {/* Slide-over Filter Panel */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={currentFilters}
      />

      {/* Slide-over Column Configuration Panel */}
      <ColumnDrawer
        isOpen={isColumnOpen}
        onClose={() => setIsColumnOpen(false)}
        allColumns={allColumns}
        selectedColumns={activeSelectedColumns}
        onApply={(newCols) => setSelectedColumns(newCols)}
      />
    </div>
  );
}
