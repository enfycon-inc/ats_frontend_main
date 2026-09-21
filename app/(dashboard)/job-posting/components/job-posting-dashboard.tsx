"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mockJobs, mockJobsIN, mapApiJobToJob, Job } from "../data/mock-jobs";
import { atsApi } from "@/lib/ats-api";
import { resolveActiveSystemRole } from "@/lib/role-permissions";
import DataTable from "./data-table";
import { PendingDelegationRequests } from "./pending-delegation-requests";
import FilterDrawer, { SelectedFilters } from "./filter-drawer";
import ColumnDrawer from "./column-drawer";
import JobPostingSkeleton from "./job-posting-skeleton";
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
  "jobStatus",
  "createdBy",
  "assignedTo",
  "client",
  "endClientName",
  "location",
  "states",
  "priority",
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
  const priorityParam = searchParams.get("priority") || searchParams.get("urgency");

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

  const isRecruiter = systemRole === "RECRUITER" || systemRole === "POD_LEAD";
  const isAccountManager = systemRole === "ACCOUNT_MANAGER";

  const hasEditPermission = useMemo(() => {
    if (!currentUser) return false;
    const permissions = currentUser.permissions || [];
    return permissions.includes("job:edit") || currentUser.roles?.includes("SUPER_ADMIN") || currentUser.roles?.includes("ADMIN");
  }, [currentUser]);

  const userPermissions = useMemo<string[]>(() => {
    return Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  }, [currentUser]);

  const userRoles = useMemo<string[]>(() => {
    return Array.isArray(currentUser?.roles)
      ? currentUser.roles.map((r: string) => r.toUpperCase().replace(/[\s\-_]/g, ""))
      : [];
  }, [currentUser]);

  // Management / governance roles with branch-wide or cross-branch delegation oversight
  const canManageBranchJobs = useMemo(() => {
    if (!currentUser) return false;
    const hasAdminPerm =
      userPermissions.includes("branch_admin:manage") ||
      userPermissions.includes("job:view_all_branches") ||
      userPermissions.includes("job:delegate") ||
      userPermissions.includes("tenant:settings") ||
      userPermissions.includes("tenant:manage");

    const hasAdminRole =
      userRoles.includes("SUPERADMIN") ||
      userRoles.includes("ADMIN") ||
      userRoles.includes("TENANTADMIN") ||
      userRoles.includes("BRANCHADMIN") ||
      userRoles.includes("DELIVERYHEAD") ||
      systemRole === "BRANCH_ADMIN" ||
      systemRole === "DELIVERY_HEAD" ||
      systemRole === "ADMIN" ||
      systemRole === "SUPER_ADMIN";

    return Boolean(hasAdminPerm || hasAdminRole);
  }, [currentUser, userPermissions, userRoles, systemRole]);

  const showBranchTabs = useMemo(() => {
    if (!canManageBranchJobs) return false;
    const isGlobalAdmin = 
      systemRole === "SUPER_ADMIN" || 
      systemRole === "ADMIN" || 
      systemRole === "TENANT_ADMIN" ||
      userRoles.includes("SUPERADMIN") ||
      userRoles.includes("ADMIN") ||
      userRoles.includes("TENANTADMIN");
    return !isGlobalAdmin;
  }, [canManageBranchJobs, systemRole, userRoles]);

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
  // and remove podName only if the current branch does not use pods.
  const sanitizeColumns = useCallback((cols: string[], usesPods: boolean) => {
    let clean = cols.filter((c) => c !== "primaryRecruiter" && c !== "recruitmentManager");
    if (!usesPods) {
      clean = clean.filter((c) => c !== "podName");
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
  const defaultViewLabel = isRecruiter ? "All Jobs" : "All Jobs";

  const roleDefaultSavedViews = useMemo(() => {
    if (isRecruiter) {
      return ["My Jobs", "Pod Jobs"];
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
      if (filterParam === "direct") return "My Jobs";
      if (filterParam === "pod") return "Pod Jobs";
      return "All Jobs";
    }
    if (filterParam === "unassigned") return "Unassigned Jobs";
    if (initialStatusFilter === "Active") return "Active Jobs";
    if (initialStatusFilter === "Draft") return "Draft Jobs";
    return "All Jobs";
  }, [isRecruiter, filterParam, initialStatusFilter]);

  const [activeView, setActiveView] = useState(initialActiveView);
  const [dashboardTab, setDashboardTab] = useState<"all" | "branch" | "shared">("all");

  // Track active branch ID as state so tab filters reactively update
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  useEffect(() => {
    const activeBranchId = typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
    const user = atsApi.auth.getCurrentUser();
    setCurrentBranchId(activeBranchId || user?.branchId || null);
  }, []);

  // Ensure recruiters and account managers stay on unified 'all' jobs view
  useEffect(() => {
    if (!showBranchTabs && dashboardTab !== "all") {
      setDashboardTab("all");
    }
  }, [showBranchTabs, dashboardTab]);


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

        // ── Filter by Priority / Urgency (Hot / Warm / Cold) ───────────────
        if (priorityParam) {
          const target = priorityParam.toUpperCase();
          jobsToDisplay = jobsToDisplay.filter((job) => {
            const p = String(job.priority || (job as any).urgency || "").toUpperCase();
            if (target === "HOT") return p.includes("HOT") || p.includes("HIGH") || p.includes("URGENT");
            if (target === "COLD") return p.includes("COLD") || p.includes("LOW");
            if (target === "WARM") return p.includes("WARM") || p.includes("MEDIUM") || (!p.includes("HOT") && !p.includes("COLD") && !p.includes("LOW") && !p.includes("HIGH") && !p.includes("URGENT"));
            return p === target;
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
  }, [initialStatusFilter, market, filterParam, priorityParam, isRecruiter, isAccountManager, currentUser]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const allColumns = useMemo(() => {
    const cols = [
      { id: "jobCode", label: "Job Code" },
      { id: "jobTitle", label: "Job Title" },
      { id: "businessUnit", label: "Business Unit" },
      { id: "jobStatus", label: "Job Status" },
      { id: "createdBy", label: "Job Created By" },
      { id: "assignedTo", label: "Pods & Recruiters" },
      { id: "client", label: "Client" },
      { id: "endClientName", label: "End Client" },
      { id: "clientJobId", label: "Client Job ID" },
      { id: "location", label: "Work Mode" },
      { id: "states", label: "States" },
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
      { id: "submissionsCount", label: "Submissions & Pipeline" },
      { id: "createdOn", label: "Job Created" },
      { id: "modifiedOn", label: "Job Modified On" },
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
    } else if (viewName === "My Jobs" || viewName === "Assigned to Me") {
      const myJobs = baseData.filter(
        (job) =>
          job.primaryRecruiterId === currentUser?.id ||
          (currentUser?.fullName && job.primaryRecruiter === currentUser.fullName) ||
          job.recruitmentManagerId === currentUser?.id
      );
      setJobsData(myJobs);
    } else if (viewName === "Pod Jobs" || viewName === "My Pod Jobs") {
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

  const handleRefresh = useCallback(() => {
    setCurrentFilters({ businessUnit: "All selected", predefined: [] });
    setActiveView(defaultViewLabel);
    setIsLoading(true);
    fetchJobs();
    toast.success("Jobs list reloaded.");
  }, [fetchJobs, defaultViewLabel]);

  useEffect(() => {
    const handleAppRefresh = () => {
      fetchJobs();
    };
    window.addEventListener("app:refresh", handleAppRefresh);
    return () => window.removeEventListener("app:refresh", handleAppRefresh);
  }, [fetchJobs]);

  // Productivity Metrics

  const displayJobs = useMemo(() => {
    if (dashboardTab === "all") return jobsData;
    if (dashboardTab === "branch") {
      // Branch Jobs: all jobs owned by this branch (whether co-sourced or not)
      return jobsData.filter(j => j.branchId === currentBranchId);
    }
    if (dashboardTab === "shared") {
      // Shared Jobs: jobs owned by ANOTHER branch but shared/delegated to this branch
      return jobsData.filter(j => 
        j.branchId !== currentBranchId && 
        Array.isArray(j.sharedBranchIds) && 
        j.sharedBranchIds.includes(currentBranchId as string)
      );
    }
    return jobsData;
  }, [jobsData, dashboardTab, currentBranchId]);




  const stats = useMemo(() => {
    const total = displayJobs.length;
    const active = displayJobs.filter((j) => j.jobStatus === "Active").length;
    const closed = displayJobs.filter((j) => j.jobStatus === "Closed" || j.jobStatus === "Close").length;
    const totalSubmissions = displayJobs.reduce(
      (sum, job) => sum + (job.submissionsCount || 0),
      0
    );
    const avgAging =
      displayJobs.length > 0
        ? Math.round(
            displayJobs.reduce((sum, job) => sum + job.agingDays, 0) /
            displayJobs.length
          )
        : 0;
    const slaAlerts = displayJobs.filter((j) => j.agingDays > 30).length;

    return { total, active, closed, totalSubmissions, avgAging, slaAlerts };
  }, [displayJobs]);

  const handleReorderColumns = useCallback((newCols: string[]) => {
    setSelectedColumns(newCols);
    saveUserColumnPreferences("jobs", newCols);
    toast.success("Column order updated!");
  }, []);

  if (isLoading) {
    return <JobPostingSkeleton />;
  }

  return (
    <div className="h-full flex flex-col min-h-0 font-sans gap-2 p-0">
      {showBranchTabs && (
        <div className="flex bg-default-100 dark:bg-slate-800 p-1 rounded-lg border border-default-250 w-fit mb-2">
          <button
            onClick={() => setDashboardTab("all")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition cursor-pointer ${
              dashboardTab === "all"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-default-500 hover:text-default-800"
            }`}
          >
            All Jobs
          </button>
          <button
            onClick={() => setDashboardTab("branch")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition cursor-pointer ${
              dashboardTab === "branch"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-default-500 hover:text-default-800"
            }`}
          >
            Branch Jobs
          </button>
          <button
            onClick={() => setDashboardTab("shared")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition cursor-pointer ${
              dashboardTab === "shared"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-default-500 hover:text-default-800"
            }`}
          >
            Shared Jobs
          </button>
        </div>
      )}

      {priorityParam && (
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Filtered by Priority:</span>
            <span className="font-black px-2 py-0.5 rounded text-[11px] bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
              {priorityParam.toUpperCase() === "HOT" ? "🔥 HOT" : priorityParam.toUpperCase() === "COLD" ? "❄️ COLD" : "⚡ WARM"}
            </span>
            <span className="text-slate-500 text-[11px]">({jobsData.length} requirements found)</span>
          </div>
          <button
            onClick={() => router.push("/job-posting")}
            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold text-xs hover:underline cursor-pointer"
          >
            Clear Filter ×
          </button>
        </div>
      )}
      {/* Main Table Content */}
      {showBranchTabs && dashboardTab === "shared" && <PendingDelegationRequests onRefresh={handleRefresh} />}
      <DataTable
            data={displayJobs}
            selectedColumns={activeSelectedColumns}
            allColumns={allColumns}
            branchUsesPods={branchUsesPods}
            onOpenFilters={() => setIsFilterOpen(true)}
            onOpenColumns={() => setIsColumnOpen(true)}
            onRefresh={handleRefresh}
            onSaveView={handleSaveView}
            savedViews={savedViews}
            activeView={activeView}
            defaultViewLabel={defaultViewLabel}
            onSelectView={handleSelectView}
            onUpdateJob={handleUpdateJob}
            onReorderColumns={handleReorderColumns}
          />

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
        defaultColumns={getBaseJobColumns(branchUsesPods)}
        selectedColumns={activeSelectedColumns}
        onApply={(newCols) => {
          setSelectedColumns(newCols);
          saveUserColumnPreferences("jobs", newCols);
          toast.success("Column preferences saved!");
        }}
        onResetToDefault={() => {
          const defaultCols = getBaseJobColumns(branchUsesPods);
          setSelectedColumns(defaultCols);
          saveUserColumnPreferences("jobs", defaultCols);
          toast.success("Columns reset to default view!");
        }}
      />
    </div>
  );
}
