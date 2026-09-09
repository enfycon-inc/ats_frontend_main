"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mockJobs, mockJobsIN, mapApiJobToJob, Job } from "../data/mock-jobs";
import { atsApi } from "@/lib/ats-api";
import { resolveActiveSystemRole } from "@/lib/role-permissions";
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

const getBaseJobColumns = (usesPods: boolean) => [
  "jobCode",
  "jobTitle",
  "businessUnit",
  "createdBy",
  "assignedTo",
  "client",
  "endClientName",
  "location",
  "states",
  "jobStatus",
  ...(usesPods ? ["podName"] : []),
  "clientBillRate",
  "payRate",
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter"); // e.g. "direct", "pod", "unassigned", etc.

  // Drawer States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnOpen, setIsColumnOpen] = useState(false);
  const [market, setMarket] = useState<"US" | "IN">("IN");

  // Branch Pods System Support State
  const [branchUsesPods, setBranchUsesPods] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("active_branch_allow_pods");
      if (stored !== null) return stored === "true";
    }
    return true;
  });

  // User details & permission controls
  const currentUser = useMemo(() => {
    if (typeof window !== "undefined") {
      return atsApi.auth.getCurrentUser();
    }
    return null;
  }, []);

  const systemRole = useMemo(() => {
    if (!currentUser) return "RECRUITER";
    return resolveActiveSystemRole(currentUser.roles, [], currentUser);
  }, [currentUser]);

  const isRecruiter = systemRole === "RECRUITER";
  const isAccountManager = systemRole === "ACCOUNT_MANAGER";

  const hasEditPermission = useMemo(() => {
    if (!currentUser) return false;
    const permissions = currentUser.permissions || [];
    return permissions.includes("job:edit") || currentUser.roles?.includes("SUPER_ADMIN") || currentUser.roles?.includes("ADMIN");
  }, [currentUser]);

  // Load and verify active branch's pod system capability
  useEffect(() => {
    async function checkBranchPodSupport() {
      try {
        const branches = await atsApi.branches.list();
        const activeBranchId = typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
        const currentBranch = branches.find((b: any) => b.id === activeBranchId) || branches[0];
        if (currentBranch) {
          const podsAllowed = Boolean(currentBranch.allowPods ?? (currentBranch.podsCount > 0 && currentBranch.allowPods !== false));
          setBranchUsesPods(podsAllowed);
          if (typeof window !== "undefined") {
            localStorage.setItem("active_branch_allow_pods", String(podsAllowed));
          }
        }
      } catch (e) {
        console.warn("Could not determine branch pod support:", e);
      }
    }
    checkBranchPodSupport();

    const handleBranchChange = () => {
      checkBranchPodSupport();
    };
    window.addEventListener("branchChanged", handleBranchChange);
    return () => window.removeEventListener("branchChanged", handleBranchChange);
  }, []);

  // Sanitize user columns: remove legacy primaryRecruiter / recruitmentManager,
  // enforce podName presence strictly based on branchUsesPods, and ensure assignedTo is included.
  const sanitizeColumns = useCallback((cols: string[], usesPods: boolean) => {
    let clean = cols.filter((c) => c !== "primaryRecruiter" && c !== "recruitmentManager");
    if (!usesPods) {
      clean = clean.filter((c) => c !== "podName");
    } else if (!clean.includes("podName")) {
      const statusIdx = clean.indexOf("jobStatus");
      if (statusIdx !== -1) clean.splice(statusIdx + 1, 0, "podName");
      else clean.push("podName");
    }
    if (!clean.includes("createdBy")) {
      const buIdx = clean.indexOf("businessUnit");
      if (buIdx !== -1) clean.splice(buIdx + 1, 0, "createdBy");
      else clean.unshift("createdBy");
    }
    if (!clean.includes("assignedTo")) {
      const createdIdx = clean.indexOf("createdBy");
      if (createdIdx !== -1) clean.splice(createdIdx + 1, 0, "assignedTo");
      else clean.push("assignedTo");
    } else {
      const createdIdx = clean.indexOf("createdBy");
      const assignedIdx = clean.indexOf("assignedTo");
      if (createdIdx !== -1 && assignedIdx !== -1 && assignedIdx !== createdIdx + 1) {
        clean = clean.filter((c) => c !== "assignedTo");
        const newCreatedIdx = clean.indexOf("createdBy");
        clean.splice(newCreatedIdx + 1, 0, "assignedTo");
      }
    }
    return clean;
  }, []);

  // Table Configuration States (User Persistent)
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    const defaultCols = getBaseJobColumns(branchUsesPods);
    const userCols = getUserColumnPreferences("jobs", defaultCols);
    return sanitizeColumns(userCols, branchUsesPods);
  });

  // Sync user-specific columns when branchUsesPods or currentUser changes
  useEffect(() => {
    setSelectedColumns((prev) => sanitizeColumns(prev, branchUsesPods));
  }, [branchUsesPods, sanitizeColumns]);

  useEffect(() => {
    if (currentUser) {
      const defaultCols = getBaseJobColumns(branchUsesPods);
      const userSavedCols = getUserColumnPreferences("jobs", defaultCols);
      setSelectedColumns(sanitizeColumns(userSavedCols, branchUsesPods));
    }
  }, [currentUser, branchUsesPods, sanitizeColumns]);

  const activeSelectedColumns = useMemo(() => {
    if (!hasEditPermission) {
      return selectedColumns.filter((colId) => colId !== "clientBillRate");
    }
    return selectedColumns;
  }, [selectedColumns, hasEditPermission]);

  // View Labels and Saved Views based on Role
  const defaultViewLabel = isRecruiter ? "All Assigned Jobs" : "All Jobs";

  const roleDefaultSavedViews = useMemo(() => {
    if (isRecruiter) {
      return ["Assigned to Me", "My Pod Jobs"];
    }
    if (isAccountManager) {
      return ["Active Jobs", "Unassigned Jobs", "Draft Jobs"];
    }
    return ["Active Jobs", "Unassigned Jobs", "My Open Requirements", "Hot IT Jobs", "Bench Jobs"];
  }, [isRecruiter, isAccountManager]);

  const [savedViews, setSavedViews] = useState<string[]>(roleDefaultSavedViews);

  useEffect(() => {
    setSavedViews(roleDefaultSavedViews);
  }, [roleDefaultSavedViews]);

  const initialActiveView = useMemo(() => {
    if (isRecruiter) {
      if (filterParam === "direct") return "Assigned to Me";
      if (filterParam === "pod") return "My Pod Jobs";
      return "All Assigned Jobs";
    }
    if (filterParam === "unassigned") return "Unassigned Jobs";
    if (initialStatusFilter === "Active") return "Active Jobs";
    if (initialStatusFilter === "Draft") return "Draft Jobs";
    return "All Jobs";
  }, [isRecruiter, filterParam, initialStatusFilter]);

  const [activeView, setActiveView] = useState(initialActiveView);

  useEffect(() => {
    setActiveView(initialActiveView);
  }, [initialActiveView]);

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
      const apiJobs = await atsApi.jobs.list(filterParam ? { filter: filterParam } : undefined);
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
        // Backend strictly isolates in SQL. This client-side guard provides defense-in-depth.
        // NOTE: Open pool (assignedTo = 'ALL') is completely removed for recruiters per user requirement!
        if (isRecruiter && currentUser?.id) {
          const userPodId = (currentUser as any)?.podId;
          jobsToDisplay = jobsToDisplay.filter((job) => {
            // 1. Assigned directly as primary recruiter or recruitment manager
            if (job.primaryRecruiterId === currentUser.id || job.recruitmentManagerId === currentUser.id) {
              return true;
            }
            if (currentUser.fullName && (job.primaryRecruiter === currentUser.fullName || job.recruitmentManager === currentUser.fullName)) {
              return true;
            }
            // 2. Assigned to user's Pod
            if (userPodId && job.podId && job.podId === userPodId) {
              return true;
            }
            // Open pool / 'ALL' is REMOVED for recruiters!
            return false;
          });
        }

        // ── Account Manager scoping (frontend safety net) ────────────────────
        // Account managers should strictly NOT see jobs posted by other members.
        if (isAccountManager && currentUser?.id) {
          jobsToDisplay = jobsToDisplay.filter((job) => {
            const createdById = (job as any).createdById || job.createdBy;
            const recMgrId = job.recruitmentManagerId;
            return (
              createdById === currentUser.id ||
              createdById === currentUser.email ||
              recMgrId === currentUser.id ||
              (job.createdBy && currentUser.fullName && job.createdBy.toLowerCase() === currentUser.fullName.toLowerCase())
            );
          });
        }
        // ────────────────────────────────────────────────────────────────────

        const filteredByRoute = jobsToDisplay.filter((job) => matchStatus(job.jobStatus, initialStatusFilter));

        setAllJobs(jobsToDisplay);
        setJobsData(filteredByRoute);
      } else {
        setAllJobs([]);
        setJobsData([]);
      }
    } catch (err) {
      console.warn("[Jobs] API fetch failed:", err);
      setAllJobs([]);
      setJobsData([]);
    } finally {
      setIsLoading(false);
    }
  }, [initialStatusFilter, market, filterParam, isRecruiter, isAccountManager, currentUser]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const allColumns = useMemo(() => {
    const cols = [
      { id: "jobCode", label: "Job Code" },
      { id: "jobTitle", label: "Job Title" },
      { id: "businessUnit", label: "Business Unit" },
      { id: "createdBy", label: "Job Created By" },
      { id: "assignedTo", label: "Assigned To" },
      { id: "client", label: "Client" },
      { id: "endClientName", label: "End Client" },
      { id: "clientJobId", label: "Client Job ID" },
      { id: "location", label: "Work Mode" },
      { id: "states", label: "States" },
      { id: "jobStatus", label: "Job Status" },
      { id: "priority", label: "Priority" },
      ...(branchUsesPods ? [{ id: "podName", label: "Assigned Pod" }] : []),
      {
        id: "clientBillRate",
        label: market === "IN" ? "Client Bill Rate / CTC" : "Client Bill Rate / Salary",
      },
      {
        id: "payRate",
        label: market === "IN" ? "Pay Rate / CTC" : "Pay Rate / Salary",
      },
      { id: "createdOn", label: "Job Created" },
      { id: "modifiedOn", label: "Job Modified On" },
      { id: "submissionsCount", label: "Submissions & Pipeline" },
    ];
    if (!hasEditPermission) {
      return cols.filter((col) => col.id !== "clientBillRate");
    }
    return cols;
  }, [market, hasEditPermission, branchUsesPods]);

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

    if (viewName === "All Jobs" || viewName === "All Assigned Jobs") {
      setJobsData(baseData);
      setCurrentFilters({ businessUnit: "All selected", predefined: [] });
    } else if (viewName === "Assigned to Me") {
      const myJobs = baseData.filter(
        (job) =>
          job.primaryRecruiterId === currentUser?.id ||
          (currentUser?.fullName && job.primaryRecruiter === currentUser.fullName) ||
          job.recruitmentManagerId === currentUser?.id
      );
      setJobsData(myJobs);
    } else if (viewName === "My Pod Jobs") {
      const userPodId = (currentUser as any)?.podId;
      const podJobs = baseData.filter(
        (job) => userPodId && job.podId === userPodId
      );
      setJobsData(podJobs);
    } else if (viewName === "Unassigned Jobs") {
      const unassigned = baseData.filter((job) => {
        const hasNoRecruiter = !job.primaryRecruiterId || job.primaryRecruiter === "N/A" || !job.primaryRecruiter;
        const hasNoPod = !job.podId && (!job.podName || job.podName === "Unassigned" || job.podName === "N/A");
        const assignedToUpper = (job.assignedTo || "").trim().toUpperCase();
        const hasNoAssignedTo = !assignedToUpper || assignedToUpper === "UNASSIGNED" || assignedToUpper === "NONE" || assignedToUpper === "N/A";
        return hasNoRecruiter && hasNoPod && hasNoAssignedTo;
      });
      setJobsData(unassigned);
    } else if (viewName === "Active Jobs") {
      setJobsData(baseData.filter((j) => j.jobStatus === "Active"));
    } else if (viewName === "Draft Jobs") {
      setJobsData(baseData.filter((j) => j.jobStatus === "Draft" || (j.jobStatus as any) === "Pending Approval"));
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

      if (updatedFields.podId !== undefined) apiPayload.podId = updatedFields.podId;

      if (updatedFields.primaryRecruiterId !== undefined) {
        apiPayload.primaryRecruiterId = updatedFields.primaryRecruiterId;
      } else if (updatedFields.primaryRecruiter !== undefined) {
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
      toast.success("Job assignment updated successfully.");
      fetchJobs();
    } catch (err: any) {
      toast.error("Failed to update job: " + err.message);
      // Revert local state by reloading from server
      fetchJobs();
    }
  }, [fetchJobs]);

  const handleRefresh = () => {
    setCurrentFilters({ businessUnit: "All selected", predefined: [] });
    setActiveView(defaultViewLabel);
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
          defaultViewLabel={defaultViewLabel}
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
