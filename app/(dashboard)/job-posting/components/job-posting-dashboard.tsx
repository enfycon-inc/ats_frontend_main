"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { mockJobs, mapApiJobToJob, Job } from "../data/mock-jobs";
import { atsApi } from "@/lib/ats-api";
import DataTable from "./data-table";
import FilterDrawer, { SelectedFilters } from "./filter-drawer";
import ColumnDrawer from "./column-drawer";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import {
  Briefcase,
  Users,
  CheckCircle,
  FileCheck,
  TrendingUp,
  Activity,
  AlertCircle,
  Loader2,
} from "lucide-react";

const ALL_COLUMNS = [
  { id: "jobCode", label: "Job Code" },
  { id: "jobTitle", label: "Job Title" },
  { id: "businessUnit", label: "Business Unit" },
  { id: "client", label: "Client" },
  { id: "clientJobId", label: "Client Job ID" },
  { id: "location", label: "Location" },
  { id: "states", label: "States" },
  { id: "jobStatus", label: "Job Status" },
  { id: "clientBillRate", label: "Client Bill Rate / Salary" },
  { id: "payRate", label: "Pay Rate / Salary" },
  { id: "recruitmentManager", label: "Recruitment Manager" },
  { id: "primaryRecruiter", label: "Primary Recruiter" },
  { id: "assignedTo", label: "Assigned To" },
  { id: "createdBy", label: "Job Posting Created By" },
  { id: "createdOn", label: "Job Created" },
  { id: "modifiedOn", label: "Job Modified On" },
  { id: "submissionsCount", label: "Submissions & Pipeline" },
];

interface JobPostingDashboardProps {
  initialStatusFilter?: "Active" | "Closed" | "Hold" | "Draft" | "All";
}

export default function JobPostingDashboard({
  initialStatusFilter = "All",
}: JobPostingDashboardProps) {
  // Drawer States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnOpen, setIsColumnOpen] = useState(false);

  // Table Configuration States
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "jobCode",
    "jobTitle",
    "businessUnit",
    "client",
    "location",
    "states",
    "jobStatus",
    "clientBillRate",
    "payRate",
    "recruitmentManager",
    "primaryRecruiter",
    "submissionsCount",
  ]);

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

  // Fetch jobs from backend API
  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!atsApi.auth.isAuthenticated()) {
        // Auto-login with default recruiter credentials
        await atsApi.auth.login("recruiter@enfycon.com", "enfycon123");
      }
      const apiJobs = await atsApi.jobs.list();
      if (apiJobs && apiJobs.length > 0) {
        const mapped = apiJobs.map(mapApiJobToJob);
        // Pre-filter by status if required
        const filteredByRoute =
          initialStatusFilter === "All"
            ? mapped
            : mapped.filter((job) => job.jobStatus === initialStatusFilter);

        setAllJobs(mapped);
        setJobsData(filteredByRoute);
      } else {
        const filteredByRoute =
          initialStatusFilter === "All"
            ? mockJobs
            : mockJobs.filter((job) => job.jobStatus === initialStatusFilter);
        setAllJobs(mockJobs);
        setJobsData(filteredByRoute);
      }
    } catch (err) {
      console.warn("[Jobs] API fetch failed, using mock data:", err);
      const filteredByRoute =
        initialStatusFilter === "All"
          ? mockJobs
          : mockJobs.filter((job) => job.jobStatus === initialStatusFilter);
      setAllJobs(mockJobs);
      setJobsData(filteredByRoute);
    } finally {
      setIsLoading(false);
    }
  }, [initialStatusFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleApplyFilters = (filters: SelectedFilters) => {
    setCurrentFilters(filters);

    let filtered = [...allJobs];

    // Status Filter if set on route level
    if (initialStatusFilter !== "All") {
      filtered = filtered.filter((job) => job.jobStatus === initialStatusFilter);
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
          if (pref === "Closed Jobs") return job.jobStatus === "Closed";
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
      baseData = baseData.filter((job) => job.jobStatus === initialStatusFilter);
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
    const closed = jobsData.filter((j) => j.jobStatus === "Closed").length;
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
    <div className="h-full flex flex-col min-h-0 font-sans gap-4">
      {/* Recruiter Metrics Dashboard Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 shrink-0 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-4 rounded-lg select-none shadow-xs">
        {/* Metric 1 */}
        <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-lg transition-transform hover:scale-102 duration-200">
          <div className="p-2 bg-blue-500 rounded text-white shrink-0">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[9px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
              Total Requirements
            </div>
            <div className="text-lg font-bold text-blue-955 dark:text-white mt-0.5">
              {stats.total}
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="flex items-center gap-3 p-3 bg-green-50/50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/30 rounded-lg transition-transform hover:scale-102 duration-200">
          <div className="p-2 bg-green-500 rounded text-white shrink-0">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[9px] font-bold text-green-900 dark:text-green-300 uppercase tracking-wider">
              Active postings
            </div>
            <div className="text-lg font-bold text-green-955 dark:text-white mt-0.5 flex items-center gap-1.5">
              {stats.active}
              <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 scale-75 text-[9px] shadow-none font-bold border-none">
                Open
              </Badge>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="flex items-center gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-lg transition-transform hover:scale-102 duration-200">
          <div className="p-2 bg-amber-500 rounded text-white shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[9px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
              Candidate Submissions
            </div>
            <div className="text-lg font-bold text-amber-955 dark:text-white mt-0.5">
              {stats.totalSubmissions}
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="flex items-center gap-3 p-3 bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 rounded-lg transition-transform hover:scale-102 duration-200">
          <div className="p-2 bg-purple-500 rounded text-white shrink-0">
            <FileCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[9px] font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
              Placements & Offers
            </div>
            <div className="text-lg font-bold text-purple-955 dark:text-white mt-0.5 flex items-center gap-1.5">
              14
              <Badge className="bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 scale-75 text-[9px] shadow-none font-bold border-none">
                +2 New
              </Badge>
            </div>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="flex items-center gap-3 p-3 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-lg transition-transform hover:scale-102 duration-200">
          <div className="p-2 bg-indigo-500 rounded text-white shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[9px] font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
              Avg Aging Days
            </div>
            <div className="text-lg font-bold text-indigo-955 dark:text-white mt-0.5">
              {stats.avgAging} Days
            </div>
          </div>
        </div>

        {/* Metric 6 */}
        <div className="flex items-center gap-3 p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-lg transition-transform hover:scale-102 duration-200">
          <div className="p-2 bg-red-500 rounded text-white shrink-0">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[9px] font-bold text-red-900 dark:text-red-300 uppercase tracking-wider">
              SLA Overdue Warning
            </div>
            <div className="text-lg font-bold text-red-955 dark:text-white mt-0.5 flex items-center gap-1.5">
              {stats.slaAlerts}
              {stats.slaAlerts > 0 && (
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              )}
            </div>
          </div>
        </div>
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
          selectedColumns={selectedColumns}
          allColumns={ALL_COLUMNS}
          onOpenFilters={() => setIsFilterOpen(true)}
          onOpenColumns={() => setIsColumnOpen(true)}
          onRefresh={handleRefresh}
          onSaveView={handleSaveView}
          savedViews={savedViews}
          activeView={activeView}
          onSelectView={handleSelectView}
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
        allColumns={ALL_COLUMNS}
        selectedColumns={selectedColumns}
        onApply={(newCols) => setSelectedColumns(newCols)}
      />
    </div>
  );
}
