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
import { getUserColumnPreferences, saveUserColumnPreferences } from "@/utils/user-column-preferences";

const DEFAULT_JOB_COLUMNS = [
  "jobCode",
  "jobTitle",
  "businessUnit",
  "createdBy",
  "client",
  "endClientName",
  "location",
  "states",
  "jobStatus",
  "podName",
  "clientBillRate",
  "payRate",
  "recruitmentManager",
  "primaryRecruiter",
  "submissionsCount",
];

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
  initialStatusFilter?: string;
}

export default function JobPostingDashboard({
  initialStatusFilter = "All",
}: JobPostingDashboardProps) {
  // Drawer States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnOpen, setIsColumnOpen] = useState(false);
  const [market, setMarket] = useState<"US" | "IN">("IN");

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

  // Table Configuration States (User Persistent)
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    const cols = getUserColumnPreferences("jobs", DEFAULT_JOB_COLUMNS);
    if (!cols.includes("createdBy")) {
      const buIdx = cols.indexOf("businessUnit");
      if (buIdx !== -1) cols.splice(buIdx + 1, 0, "createdBy");
      else cols.unshift("createdBy");
    }
    return cols;
  });

  // Sync user-specific columns when currentUser resolves or changes
  useEffect(() => {
    if (currentUser) {
      const userSavedCols = getUserColumnPreferences("jobs", DEFAULT_JOB_COLUMNS);
      if (!userSavedCols.includes("createdBy")) {
        const buIdx = userSavedCols.indexOf("businessUnit");
        if (buIdx !== -1) userSavedCols.splice(buIdx + 1, 0, "createdBy");
        else userSavedCols.unshift("createdBy");
      }
      setSelectedColumns(userSavedCols);
    }
  }, [currentUser]);

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

  // Load market context on mount based on active branch and user profile
  useEffect(() => {
    async function loadMarketContext() {
      try {
        const activeBranchMarket = typeof window !== 'undefined' ? localStorage.getItem('active_branch_market') : null;
        const activeBranchName = typeof window !== 'undefined' ? localStorage.getItem('active_branch_name') || "" : "";
        
        let resolvedMarket: "US" | "IN" = "IN";
        if (activeBranchMarket) {
          const upperM = activeBranchMarket.toUpperCase();
          resolvedMarket = (upperM === "US" || upperM === "USA") ? "US" : "IN";
        } else if (activeBranchName) {
          const lowerName = activeBranchName.toLowerCase();
          if (lowerName.includes("us") || lowerName.includes("night")) {
            resolvedMarket = "US";
          } else {
            resolvedMarket = "IN";
          }
        } else {
          const prof = await atsApi.auth.me().catch(() => null);
          if (prof && prof.defaultMarket) {
            resolvedMarket = (prof.defaultMarket as "US" | "IN") || "IN";
          }
        }
        setMarket(resolvedMarket);
      } catch (err) {
        console.warn("[Dashboard] Failed to fetch market context:", err);
      }
    }
    loadMarketContext();
  }, []);

  // Fetch jobs from backend API
  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiJobs = await atsApi.jobs.list();
      if (apiJobs && apiJobs.length > 0) {
        const mapped = apiJobs.map(mapApiJobToJob);
        // Filter by current market shift (matching IN/INDIA/DOMESTIC vs US/USA)
        const shiftJobs = mapped.filter((job) => {
          const jm = (job.market || "IN").toUpperCase();
          if (market === "US") {
            return jm === "US" || jm === "USA";
          } else {
            return jm === "IN" || jm === "INDIA" || jm === "DOMESTIC";
          }
        });
        
        // Prefer shift-filtered jobs; if empty, show all real tenant API jobs so real DB jobs are never hidden by mock data
        let jobsToDisplay = shiftJobs.length > 0 ? shiftJobs : mapped;

        // ── Recruiter scoping (frontend safety net) ──────────────────────────
        // The backend already enforces this via SQL. This client-side guard
        // covers mock/cached data paths (e.g. fallback mock data).
        const PRIVILEGED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DELIVERY_HEAD', 'POD_LEAD', 'ACCOUNT_MANAGER'];
        const isRecruiterOnly = currentUser?.roles?.includes('RECRUITER') &&
          !currentUser?.roles?.some((r: string) => PRIVILEGED_ROLES.includes(r));

        if (isRecruiterOnly && currentUser?.id) {
          const userPodId = (currentUser as any)?.podId;
          jobsToDisplay = jobsToDisplay.filter((job) => {
            // 1. Assigned directly as primary recruiter or recruitment manager
            if (job.primaryRecruiterId === currentUser.id || job.recruitmentManagerId === currentUser.id) {
              return true;
            }
            // 2. Assigned to a Pod that the recruiter belongs to
            if (userPodId && job.podId && job.podId === userPodId) {
              return true;
            }
            // 3. Assigned to ALL branch recruiters
            if (job.assignedTo && (job.assignedTo.toUpperCase() === 'ALL' || job.assignedTo.toUpperCase().startsWith('ALL'))) {
              return true;
            }
            // 4. Otherwise (unassigned or other pod) -> hidden
            return false;
          });
        }
        // ────────────────────────────────────────────────────────────────────

        const filteredByRoute = jobsToDisplay.filter((job) => matchStatus(job.jobStatus, initialStatusFilter));

        setAllJobs(jobsToDisplay);
        setJobsData(filteredByRoute);
      } else {
        const fallbackJobs = market === "IN" ? mockJobsIN : mockJobs;
        const filteredByRoute = fallbackJobs.filter((job) => matchStatus(job.jobStatus, initialStatusFilter));
        setAllJobs(fallbackJobs);
        setJobsData(filteredByRoute);
      }
    } catch (err) {
      console.warn("[Jobs] API fetch failed, using fallback data:", err);
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
      { id: "createdBy", label: "Job Created By" },
      { id: "client", label: "Client" },
      { id: "endClientName", label: "End Client" },
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
        onApply={(newCols) => {
          setSelectedColumns(newCols);
          saveUserColumnPreferences("jobs", newCols);
          toast.success("Column view saved for your account!");
        }}
      />
    </div>
  );
}
