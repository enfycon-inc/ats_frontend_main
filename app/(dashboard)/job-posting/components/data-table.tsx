"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Filter,
  Settings,
  Plus,
  Search,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  Download,
  Archive,
  Edit,
  Eye,
  CheckSquare,
  Users,
  User,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FolderPlus,
  Pencil,
  UserPlus,
  Copy,
  CheckCircle,
  XCircle,
  Check,
  UserX,
  Building2,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { atsApi } from "@/lib/ats-api";
import { Job } from "../data/mock-jobs";
import AddCandidateModal from "@/components/dashboard/AddCandidateModal";
import { AddClientModal } from "./add-client-modal";

export function getAssignedPersonDisplay(job: Job): {
  label: string;
  type: "all" | "pod" | "recruiter" | "unassigned";
} {
  const rawAssigned = (job.assignedTo || "").trim();
  const rawUpper = rawAssigned.toUpperCase();

  // 1. Check if assigned to ALL branch recruiters
  if (rawUpper === "ALL" || rawUpper.startsWith("ALL ") || rawUpper === "ALL RECRUITERS") {
    return { label: "All recruiters", type: "all" };
  }

  // 2. Check if assigned to a specific Recruitment Pod
  if (job.podName && job.podName !== "N/A" && job.podName.toLowerCase() !== "unassigned") {
    return { label: job.podName, type: "pod" };
  }

  // 3. Check if assigned to a Primary Recruiter
  if (job.primaryRecruiter && job.primaryRecruiter !== "N/A" && job.primaryRecruiter.toLowerCase() !== "unassigned") {
    return { label: job.primaryRecruiter, type: "recruiter" };
  }

  // 4. Check if assignedTo has an explicit recruiter name or custom string
  if (rawAssigned && rawUpper !== "N/A" && rawUpper !== "UNASSIGNED" && rawUpper !== "NONE") {
    return { label: rawAssigned, type: "recruiter" };
  }

  // 5. Truly unassigned (not assigned to anyone, pod, or all)
  return { label: "Unassigned", type: "unassigned" };
}

function isJobPostedToday(job: Job): boolean {
  if (!job) return false;

  // 1. Check createdOn or createdAt date string
  const dateStr = (job as any).createdAt || job.createdOn;
  if (dateStr) {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const today = new Date();
        const isSameDay =
          d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear();
        if (isSameDay) return true;
      }
    } catch {}
  }

  // 2. Check if job code date segment matches today's date (e.g. BBS-260903-D00001)
  if (job.jobCode) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todaySegment = `${yy}${mm}${dd}`;
    if (job.jobCode.includes(`-${todaySegment}-`)) {
      return true;
    }
  }

  return false;
}

function isJobRecent(job: Job): boolean {
  if (!job) return false;

  // 1. Check agingDays if available
  if (typeof job.agingDays === "number" && !isNaN(job.agingDays)) {
    if (job.agingDays <= 14) return true;
  }

  // 2. Check createdOn or createdAt date string (within 14 days)
  const dateStr = (job as any).createdAt || job.createdOn;
  if (dateStr) {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 14) return true;
      }
    } catch {}
  }

  // 3. Fallback: check jobCode date segment if matches (e.g. BBS-260907-D00001)
  if (job.jobCode) {
    const match = job.jobCode.match(/-(\d{2})(\d{2})(\d{2})-/);
    if (match) {
      try {
        const yy = parseInt("20" + match[1], 10);
        const mm = parseInt(match[2], 10) - 1;
        const dd = parseInt(match[3], 10);
        const jobDate = new Date(yy, mm, dd);
        if (!isNaN(jobDate.getTime())) {
          const diffDays = (Date.now() - jobDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays <= 14) return true;
        }
      } catch {}
    }
  }

  return isJobPostedToday(job);
}

export function formatDateTimeDisplay(
  dateStr?: string | null,
  job?: Job
): { date: string; time: string } {
  if (!dateStr) return { date: "—", time: "" };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { date: String(dateStr), time: "" };
    }

    // Determine target timezone: job snapshot timezone -> market timezone -> local fallback
    let timeZone: string | undefined = undefined;
    if (job?.jobTimezone) {
      timeZone = job.jobTimezone;
    } else if (job?.market === "US") {
      timeZone = "America/New_York";
    } else if (job?.market === "IN") {
      timeZone = "Asia/Kolkata";
    }

    const dateFormatted = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone,
    });

    const timeFormatted = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
      timeZone,
    });

    return { date: dateFormatted, time: timeFormatted };
  } catch {
    return { date: String(dateStr), time: "" };
  }
}

interface DataTableProps {
  data: Job[];
  selectedColumns: string[];
  allColumns: { id: string; label: string }[];
  branchUsesPods?: boolean;
  onOpenFilters: () => void;
  onOpenColumns: () => void;
  onRefresh: () => void;
  onSaveView: (viewName: string) => void;
  savedViews: string[];
  activeView: string;
  defaultViewLabel?: string;
  onSelectView: (viewName: string) => void;
  onUpdateJob?: (jobId: string, updatedFields: Partial<Job>) => void;
}

export default function DataTable({
  data,
  selectedColumns,
  allColumns,
  branchUsesPods,
  onOpenFilters,
  onOpenColumns,
  onRefresh,
  onSaveView,
  savedViews,
  activeView,
  defaultViewLabel = "All Jobs",
  onSelectView,
  onUpdateJob,
}: DataTableProps) {
  const router = useRouter();

  // User details & permission controls
  const currentUser = useMemo(() => atsApi.auth.getCurrentUser(), []);
  const hasEditPermission = useMemo(() => {
    if (!currentUser) return false;
    const permissions = currentUser.permissions || [];
    return permissions.includes("job:edit") || currentUser.roles?.includes("SUPER_ADMIN") || currentUser.roles?.includes("ADMIN");
  }, [currentUser]);

  const hasCreatePermission = useMemo(() => {
    if (!currentUser) return false;
    const permissions = currentUser.permissions || [];
    return permissions.includes("job:create") || currentUser.roles?.includes("SUPER_ADMIN") || currentUser.roles?.includes("ADMIN");
  }, [currentUser]);

  const hasApprovePermission = useMemo(() => {
    if (!currentUser) return false;
    const permissions = currentUser.permissions || [];
    const roles = (currentUser.roles || []).map((r: string) => r.toUpperCase().replace(/[\s-_]+/g, ""));
    const isSuperOrAdmin = roles.includes("SUPERADMIN") || roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
    return permissions.includes("job:approve") || (permissions.length === 0 && isSuperOrAdmin);
  }, [currentUser]);

  const activeSelectedColumns = useMemo(() => {
    if (!hasEditPermission) {
      return selectedColumns.filter((colId) => colId !== "clientBillRate");
    }
    return selectedColumns;
  }, [selectedColumns, hasEditPermission]);

  const activeAllColumns = useMemo(() => {
    if (!hasEditPermission) {
      return allColumns.filter((col) => col.id !== "clientBillRate");
    }
    return allColumns;
  }, [allColumns, hasEditPermission]);
  
  // Sorting State
  const [sortColumn, setSortColumn] = useState<keyof Job | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Search & Filter Bar States (multi-tenant & custom role compatible)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPod, setSelectedPod] = useState("All");
  const [selectedCreator, setSelectedCreator] = useState("All");
  const [selectedAssignee, setSelectedAssignee] = useState("All");
  const [selectedClient, setSelectedClient] = useState("All");
  const [selectedPeriod, setSelectedPeriod] = useState("All Time");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSort, setSelectedSort] = useState("Latest Posted");
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [podsList, setPodsList] = useState<any[]>([]);

  // Check whether pod system is enabled for current active branch / workspace
  const isPodSystemEnabled = useMemo(() => {
    if (branchUsesPods !== undefined) return branchUsesPods;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("active_branch_allow_pods");
      if (stored !== null) return stored === "true";
    }
    return false;
  }, [branchUsesPods]);

  // Load pods list when pod system is enabled
  useEffect(() => {
    if (isPodSystemEnabled) {
      atsApi.pods
        .list()
        .then((res) => {
          if (Array.isArray(res)) setPodsList(res);
        })
        .catch((e) => console.warn("Could not load pods:", e));
    }
  }, [isPodSystemEnabled]);

  // Unique available pods for dropdown
  const availablePods = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    podsList.forEach((p: any) => {
      if (p && p.name) map.set(p.name, { id: p.id, name: p.name });
    });
    data.forEach((j) => {
      if (j.podName && j.podName !== "N/A" && j.podName.toLowerCase() !== "unassigned") {
        map.set(j.podName, { id: j.podId || j.podName, name: j.podName });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [podsList, data]);

  // Unique available Creators for dropdown (role-agnostic, multi-tenant compatible)
  const availableCreators = useMemo(() => {
    const creators = new Set<string>();
    data.forEach((j) => {
      const creator = j.createdBy || (j as any).creator_name || (j as any).created_by;
      if (creator && creator !== "System Admin" && creator !== "N/A" && creator.trim()) {
        creators.add(creator.trim());
      }
    });
    return Array.from(creators).sort();
  }, [data]);

  // Unique available Assignees for dropdown (recruiters, pods, unassigned)
  const availableAssignees = useMemo(() => {
    const assignees = new Set<string>();
    data.forEach((j) => {
      const info = getAssignedPersonDisplay(j);
      if (info.label && info.label !== "Unassigned" && info.label.trim()) {
        assignees.add(info.label.trim());
      }
    });
    return Array.from(assignees).sort();
  }, [data]);

  // Unique available Clients for dropdown
  const availableClients = useMemo(() => {
    const clients = new Set<string>();
    data.forEach((j) => {
      if (j.client && j.client !== "N/A") clients.add(j.client.trim());
      if (j.endClientName && j.endClientName !== "N/A") clients.add(j.endClientName.trim());
    });
    return Array.from(clients).sort();
  }, [data]);

  const isAnyFilterActive = useMemo(() => {
    return (
      searchQuery.trim() !== "" ||
      selectedPod !== "All" ||
      selectedCreator !== "All" ||
      selectedAssignee !== "All" ||
      selectedClient !== "All" ||
      selectedPeriod !== "All Time" ||
      startDate !== "" ||
      endDate !== "" ||
      selectedSort !== "Latest Posted"
    );
  }, [searchQuery, selectedPod, selectedCreator, selectedAssignee, selectedClient, selectedPeriod, startDate, endDate, selectedSort]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedPod("All");
    setSelectedCreator("All");
    setSelectedAssignee("All");
    setSelectedClient("All");
    setSelectedPeriod("All Time");
    setStartDate("");
    setEndDate("");
    setSelectedSort("Latest Posted");
    setSortColumn(null);
    setShowRangePicker(false);
    toast.success("Filters reset to default");
  };

  // Pagination State
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // New Save View dialog state
  const [newViewName, setNewViewName] = useState("");
  const [isSavingView, setIsSavingView] = useState(false);

  // Cell-level inline edit state
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editCellValue, setEditCellValue] = useState<string>("");

  // Client search & Add Client modal state
  const [clientList, setClientList] = useState<any[]>([]);
  const [clientSearchText, setClientSearchText] = useState("");
  const [addClientModalOpen, setAddClientModalOpen] = useState(false);

  // Approve Job Modal State
  const [approveModalJob, setApproveModalJob] = useState<Job | null>(null);
  const [approvePreset, setApprovePreset] = useState<string>("Approved — Requisition verified and rates validated");
  const [approveRemark, setApproveRemark] = useState<string>("");
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // Reject Job Modal State
  const [rejectModalJob, setRejectModalJob] = useState<Job | null>(null);
  const [rejectCategory, setRejectCategory] = useState<string>("Rate / Budget is too low for required experience level");
  const [rejectReason, setRejectReason] = useState<string>("");
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  const APPROVE_REMARK_OPTIONS = [
    "Approved — Requisition verified and rates validated",
    "Approved — High priority requirement, ready for immediate sourcing",
    "Approved with client budget sign-off",
    "Approved with rate exception ceiling",
    "Custom Note / Instructions...",
  ];

  const REJECT_REASON_OPTIONS = [
    "Rate / Budget is too low for required experience level",
    "Incomplete job description or missing critical skill details",
    "Client contract or billing terms not finalized",
    "Duplicate job requirement",
    "Incorrect visa or work authorization terms",
    "Client requirement put on hold / cancelled",
    "Custom Reason / Feedback...",
  ];

  const handleConfirmApprove = async () => {
    if (!approveModalJob) return;
    setIsApproving(true);
    try {
      const finalRemark = approvePreset === "Custom Note / Instructions..." 
        ? approveRemark.trim() 
        : (approveRemark.trim() ? `${approvePreset}: ${approveRemark.trim()}` : approvePreset);
      
      toast.loading(`Activating ${approveModalJob.jobCode || "job"}...`, { id: `approve-job-${approveModalJob.id}` });
      await atsApi.jobs.approve(approveModalJob.id);
      toast.success(`Job ${approveModalJob.jobCode || ""} approved & activated!`, { id: `approve-job-${approveModalJob.id}` });
      if (onUpdateJob) {
        onUpdateJob(approveModalJob.id, { jobStatus: "Active", approvalStatus: "APPROVED" as any });
      }
      if (onRefresh) {
        onRefresh();
      }
      setApproveModalJob(null);
      setApproveRemark("");
    } catch (err: any) {
      toast.error("Failed to approve job: " + (err?.message || "Unknown error"), { id: `approve-job-${approveModalJob.id}` });
    } finally {
      setIsApproving(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalJob) return;
    const finalReason = rejectCategory === "Custom Reason / Feedback..."
      ? rejectReason.trim()
      : (rejectReason.trim() ? `[${rejectCategory}] ${rejectReason.trim()}` : rejectCategory);

    if (!finalReason) {
      toast.error("Please provide a reason or feedback for rejection.");
      return;
    }
    setIsRejecting(true);
    try {
      toast.loading(`Rejecting ${rejectModalJob.jobCode || "job"}...`, { id: `reject-job-${rejectModalJob.id}` });
      await atsApi.jobs.reject(rejectModalJob.id, finalReason);
      toast.success(`Job ${rejectModalJob.jobCode || ""} rejected with feedback.`, { id: `reject-job-${rejectModalJob.id}` });
      if (onUpdateJob) {
        onUpdateJob(rejectModalJob.id, { jobStatus: "Draft" as any, approvalStatus: "REJECTED" as any, rejectionReason: finalReason });
      }
      if (onRefresh) {
        onRefresh();
      }
      setRejectModalJob(null);
      setRejectReason("");
    } catch (err: any) {
      toast.error("Failed to reject job: " + (err?.message || "Unknown error"), { id: `reject-job-${rejectModalJob.id}` });
    } finally {
      setIsRejecting(false);
    }
  };

  const fetchClientsList = async () => {
    try {
      const clients = await atsApi.clients.list();
      setClientList(clients || []);
    } catch (e) {
      console.warn("Could not load clients list:", e);
    }
  };

  useEffect(() => {
    fetchClientsList();
  }, []);

  const availableClientNames = useMemo(() => {
    const namesSet = new Set<string>();
    
    // 1. Collect from API clientList
    if (Array.isArray(clientList)) {
      clientList.forEach((cl) => {
        const nameStr = typeof cl === 'string' ? cl : (cl?.name || cl?.companyName || cl?.clientName || cl?.title || '');
        if (nameStr && nameStr.trim()) {
          namesSet.add(nameStr.trim());
        }
      });
    }

    // 2. Collect from all job rows in dataset
    if (Array.isArray(data)) {
      data.forEach((job) => {
        if (job.client && job.client !== "N/A" && job.client.trim()) {
          namesSet.add(job.client.trim());
        }
      });
    }

    // 3. Fallback defaults
    ["prolays", "Google", "Tcs", "Deb Tech Enterprise", "enfysync Inc"].forEach((n) => namesSet.add(n));

    return Array.from(namesSet).sort((a, b) => a.localeCompare(b));
  }, [clientList, data]);

  // Columns editable via double-click text input
  const EDITABLE_TEXT_COLS = ["jobTitle", "location", "states", "clientBillRate", "payRate", "recruitmentManager"];
  // Columns editable via inline select
  const PRIORITY_OPTIONS = ["Hot", "Urgent", "High", "Warm", "Medium", "Low"];

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    jobId: string;
  } | null>(null);

  // Sourcing CV Modal State
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [selectedJobForSourcing, setSelectedJobForSourcing] = useState<Job | null>(null);

  const handleOpenSourceModal = (job: Job) => {
    setTimeout(() => {
      setSelectedJobForSourcing(job);
      setSourceModalOpen(true);
    }, 50);
  };

  const handleDuplicateJob = async (job: Job) => {
    try {
      toast.loading(`Copying job ${job.jobCode}...`, { id: "dup-job-toast" });
      const newJob = await atsApi.jobs.duplicate(job.id);
      toast.success(`Job copied successfully! New Job Code: ${newJob.jobCode}`, { id: "dup-job-toast" });
      onRefresh();
    } catch (err: any) {
      toast.error("Failed to copy job: " + (err.message || "Unknown error"), { id: "dup-job-toast" });
    }
  };

  // Job Status Modal States
  const [statusModalJob, setStatusModalJob] = useState<Job | null>(null);
  const [statusModalValue, setStatusModalValue] = useState("");
  const [statusModalComment, setStatusModalComment] = useState("");

  // Assigned To / Primary Recruiter Modal States
  const [assignModalJob, setAssignModalJob] = useState<Job | null>(null);
  const [assignModalType, setAssignModalType] = useState<"assignedTo" | "primaryRecruiter">("assignedTo");
  const [assignModalSearch, setAssignModalSearch] = useState("");
  const [assignModalSelectedId, setAssignModalSelectedId] = useState<string>("");
  const [assignModalComment, setAssignModalComment] = useState("");

  // Assignment Context Data
  const [usersList, setUsersList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);

  // Load users, pods, branches, and custom roles on mount
  useEffect(() => {
    async function loadAssignmentData() {
      try {
        const [users, pods, branches, roles] = await Promise.all([
          atsApi.auth.listUsers().catch(() => []),
          atsApi.pods.list().catch(() => []),
          atsApi.branches.list().catch(() => []),
          atsApi.auth.listRoles(undefined, true).catch(() => []),
        ]);
        if (users && users.length > 0) setUsersList(users);
        if (pods && pods.length > 0) setPodsList(pods);
        if (branches && branches.length > 0) setBranchesList(branches);
        if (roles && roles.length > 0) setRolesList(roles);
      } catch (err) {
        console.warn("[DataTable] Failed to fetch assignment context data:", err);
      }
    }
    loadAssignmentData();
  }, []);

  const getUserRoleLabel = useCallback((u: any, branchId?: string): string => {
    const activeBranchId = branchId || (typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null);
    
    // 1. Check branch-specific custom roles in active branch
    if (activeBranchId && u.branchRoles && u.branchRoles[activeBranchId] && Array.isArray(u.branchRoles[activeBranchId]) && u.branchRoles[activeBranchId].length > 0) {
      const branchRoleIdOrName = u.branchRoles[activeBranchId][0];
      const matchedRole = (rolesList || []).find((cr: any) => cr.id === branchRoleIdOrName || cr.name?.toUpperCase() === String(branchRoleIdOrName).toUpperCase());
      if (matchedRole?.name) return matchedRole.name;
      if (typeof branchRoleIdOrName === "string" && !branchRoleIdOrName.includes("-")) return branchRoleIdOrName;
    }

    // 2. Check any branch roles if user has branch assignments
    if (u.branchRoles && typeof u.branchRoles === "object") {
      for (const bRoleArray of Object.values(u.branchRoles) as any[]) {
        if (Array.isArray(bRoleArray) && bRoleArray.length > 0) {
          const rItem = bRoleArray[0];
          const matchedRole = (rolesList || []).find((cr: any) => cr.id === rItem || cr.name?.toUpperCase() === String(rItem).toUpperCase());
          if (matchedRole?.name) return matchedRole.name;
          if (typeof rItem === "string" && !rItem.includes("-")) return rItem;
        }
      }
    }

    // 3. Check customRoleName or roleName
    if (u.customRoleName) return u.customRoleName;
    if (u.roleName) {
      const matchedRole = (rolesList || []).find((cr: any) => cr.id === u.roleName || cr.name?.toUpperCase() === String(u.roleName).toUpperCase());
      if (matchedRole?.name) return matchedRole.name;
      return u.roleName;
    }

    // 4. System role
    if (u.systemRole) {
      return u.systemRole.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    }

    // 5. Roles array
    if (Array.isArray(u.roles) && u.roles.length > 0) {
      const rItem = u.roles[0];
      const matchedRole = (rolesList || []).find((cr: any) => cr.id === rItem || cr.name?.toUpperCase() === String(rItem).toUpperCase());
      if (matchedRole?.name) return matchedRole.name;
      return rItem;
    }

    return "Staff";
  }, [rolesList]);

  // Target branch resolution for assignModalJob
  const assignModalTargetBranch = useMemo(() => {
    if (!assignModalJob) return null;
    if (assignModalJob.branchId) {
      const b = branchesList.find((x: any) => x.id === assignModalJob.branchId);
      if (b) return b;
    }
    if (assignModalJob.businessUnit) {
      const b = branchesList.find((x: any) => x.name?.toLowerCase() === assignModalJob.businessUnit.toLowerCase());
      if (b) return b;
    }
    const activeId = typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
    if (activeId) {
      const b = branchesList.find((x: any) => x.id === activeId);
      if (b) return b;
    }
    return null;
  }, [assignModalJob, branchesList]);

  // Branch permission rules (identical to job-posting/new and job-posting/[id]/edit)
  const branchAllowsPods = useMemo(() => {
    if (!assignModalTargetBranch) return true;
    return ((assignModalTargetBranch.allowPods ?? assignModalTargetBranch.allow_pods) !== false) && !(assignModalTargetBranch.allowNone ?? assignModalTargetBranch.allow_none);
  }, [assignModalTargetBranch]);

  const branchAllowsDirectStaff = useMemo(() => {
    if (!assignModalTargetBranch) return true;
    return Boolean(assignModalTargetBranch.allowNone ?? assignModalTargetBranch.allow_none);
  }, [assignModalTargetBranch]);

  const branchAllowsPool = useMemo(() => {
    if (!assignModalTargetBranch) return true;
    const allowsAll = (assignModalTargetBranch.allowAll ?? assignModalTargetBranch.allow_all) === true;
    const allowsUnassigned = (assignModalTargetBranch.allowUnassigned ?? assignModalTargetBranch.allow_unassigned) === true;
    const isNone = Boolean(assignModalTargetBranch.allowNone ?? assignModalTargetBranch.allow_none);
    return (allowsAll || allowsUnassigned) && !isNone;
  }, [assignModalTargetBranch]);

  const branchAllowsAllBroadcast = useMemo(() => {
    if (!assignModalTargetBranch) return true;
    return (assignModalTargetBranch.allowAll ?? assignModalTargetBranch.allow_all) === true;
  }, [assignModalTargetBranch]);

  const branchAllowsUnassigned = useMemo(() => {
    if (!assignModalTargetBranch) return true;
    return (assignModalTargetBranch.allowUnassigned ?? assignModalTargetBranch.allow_unassigned) === true;
  }, [assignModalTargetBranch]);

  // Fallback if no rules were configured on branch
  const hasAnyAssignmentEnabled = branchAllowsPool || branchAllowsPods || branchAllowsDirectStaff;
  const showPoolSection = branchAllowsPool || !hasAnyAssignmentEnabled;
  const showPodsSection = branchAllowsPods || !hasAnyAssignmentEnabled;
  const showStaffSection = branchAllowsDirectStaff || !hasAnyAssignmentEnabled;

  const targetBranchPods = useMemo(() => {
    if (!assignModalTargetBranch) return podsList;
    return podsList.filter((p: any) => !p.branchId || !p.branch_id || p.branchId === assignModalTargetBranch.id || p.branch_id === assignModalTargetBranch.id);
  }, [podsList, assignModalTargetBranch]);

  const targetRecruitersList = useMemo(() => {
    const seen = new Set<string>();
    const list: any[] = [];
    const bId = assignModalTargetBranch?.id;

    for (const u of usersList) {
      const uid = u.id || u.email;
      if (!uid || seen.has(uid)) continue;

      if (u.isActive === false || u.is_active === false) continue;

      if (bId) {
        const userBranchId = u.branchId || u.branch_id;
        const assignedBranches = Array.isArray(u.assignedBranchIds) ? u.assignedBranchIds : (Array.isArray(u.assigned_branch_ids) ? u.assigned_branch_ids : []);
        const belongsToBranch = userBranchId === bId || assignedBranches.includes(bId) || !userBranchId;
        if (!belongsToBranch) continue;
      }

      const perms: string[] = Array.isArray(u.permissions) ? u.permissions : [];
      const hasSourcingPermission = 
        perms.includes("submission:create") || 
        perms.includes("candidate:create") || 
        perms.includes("submission:edit") || 
        perms.includes("submission:view") || 
        perms.includes("job:view");

      const r = (u.roles || []).map((x: string) => x.toUpperCase().replace(/[\s-_]+/g, ""));
      const isSourcingStaff = hasSourcingPermission || r.includes("RECRUITER") || r.includes("BRANCHADMIN") || r.includes("PODLEAD") || r.includes("ACCOUNTMANAGER") || r.length === 0;

      if (isSourcingStaff) {
        seen.add(uid);
        list.push(u);
      }
    }
    return list;
  }, [usersList, assignModalTargetBranch]);

  const openStatusModal = (job: Job) => {
    setStatusModalJob(job);
    setStatusModalValue(job.jobStatus);
    setStatusModalComment("");
  };

  const handleStatusUpdate = () => {
    if (statusModalJob && onUpdateJob) {
      onUpdateJob(statusModalJob.id, { jobStatus: statusModalValue as any });
      console.log(`Status comment for ${statusModalJob.jobCode}: ${statusModalComment}`);
    }
    setStatusModalJob(null);
  };

  const openAssignModal = (job: Job, type: "assignedTo" | "primaryRecruiter" = "assignedTo") => {
    setAssignModalJob(job);
    setAssignModalType(type);
    setAssignModalSearch("");
    setAssignModalComment("");

    const rawAssigned = (job.assignedTo || "").trim();
    const rawUpper = rawAssigned.toUpperCase();

    // 1. ALL Recruiters
    if (rawUpper === "ALL" || rawUpper.startsWith("ALL ") || rawUpper === "ALL RECRUITERS") {
      setAssignModalSelectedId("all");
      return;
    }

    // 2. Pod assignment
    if (job.podId) {
      setAssignModalSelectedId(`pod:${job.podId}`);
      return;
    }
    if (job.podName && job.podName !== "N/A" && job.podName.toLowerCase() !== "unassigned") {
      const foundPod = podsList.find((p: any) => p.name?.toLowerCase() === job.podName?.toLowerCase());
      if (foundPod) {
        setAssignModalSelectedId(`pod:${foundPod.id}`);
        return;
      }
    }

    // 3. Primary Recruiter
    if (job.primaryRecruiterId) {
      setAssignModalSelectedId(`rec:${job.primaryRecruiterId}`);
      return;
    }
    if (job.primaryRecruiter && job.primaryRecruiter !== "N/A" && job.primaryRecruiter.toLowerCase() !== "unassigned") {
      const foundRec = usersList.find((u: any) => (u.fullName || u.name)?.toLowerCase() === job.primaryRecruiter.toLowerCase());
      if (foundRec) {
        setAssignModalSelectedId(`rec:${foundRec.id}`);
        return;
      }
    }

    // 4. Raw assigned string match
    if (rawAssigned && rawUpper !== "N/A" && rawUpper !== "UNASSIGNED" && rawUpper !== "NONE") {
      const foundRec = usersList.find((u: any) => (u.fullName || u.name)?.toLowerCase() === rawAssigned.toLowerCase());
      if (foundRec) {
        setAssignModalSelectedId(`rec:${foundRec.id}`);
        return;
      }
      const foundPod = podsList.find((p: any) => p.name?.toLowerCase() === rawAssigned.toLowerCase());
      if (foundPod) {
        setAssignModalSelectedId(`pod:${foundPod.id}`);
        return;
      }
    }

    // 5. Default
    setAssignModalSelectedId("none");
  };

  const handleAssignSave = () => {
    if (!assignModalJob || !onUpdateJob) {
      setAssignModalJob(null);
      return;
    }

    if (assignModalSelectedId === "all") {
      onUpdateJob(assignModalJob.id, {
        assignedTo: "ALL",
        primaryRecruiter: "N/A",
        primaryRecruiterId: null,
        podId: "all",
        podName: "",
      });
    } else if (assignModalSelectedId === "none") {
      onUpdateJob(assignModalJob.id, {
        assignedTo: "N/A",
        primaryRecruiter: "N/A",
        primaryRecruiterId: null,
        podId: "none",
        podName: "",
      });
    } else if (assignModalSelectedId.startsWith("pod:")) {
      const pid = assignModalSelectedId.replace("pod:", "");
      const pod = targetBranchPods.find((p: any) => p.id === pid);
      const podName = pod?.name || "Recruitment Pod";
      onUpdateJob(assignModalJob.id, {
        assignedTo: podName,
        podId: pid,
        podName: podName,
        primaryRecruiter: "N/A",
        primaryRecruiterId: null,
      });
    } else if (assignModalSelectedId.startsWith("rec:")) {
      const rid = assignModalSelectedId.replace("rec:", "");
      const rec = targetRecruitersList.find((u: any) => u.id === rid);
      const recName = rec?.fullName || rec?.name || "Recruiter";
      onUpdateJob(assignModalJob.id, {
        assignedTo: recName,
        primaryRecruiter: recName,
        primaryRecruiterId: rid,
        podId: "none",
        podName: "",
      });
    }

    if (assignModalComment) {
      console.log(`Assign comment for ${assignModalJob.jobCode}: ${assignModalComment}`);
    }
    setAssignModalJob(null);
  };

  // Handle Sort
  const handleSort = (column: keyof Job) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Filtered & Sorted Data
  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((job) => {
        const assignedLabel = getAssignedPersonDisplay(job).label.toLowerCase();
        return (
          (job.jobTitle || "").toLowerCase().includes(q) ||
          (job.jobCode || "").toLowerCase().includes(q) ||
          (job.client || "").toLowerCase().includes(q) ||
          (job.endClientName || "").toLowerCase().includes(q) ||
          (job.location || "").toLowerCase().includes(q) ||
          (job.businessUnit || "").toLowerCase().includes(q) ||
          assignedLabel.includes(q)
        );
      });
    }

    // 2. Pod Filter (only active if pod system enabled for workspace)
    if (isPodSystemEnabled && selectedPod !== "All") {
      result = result.filter(
        (job) => job.podName === selectedPod || job.podId === selectedPod
      );
    }

    // 3. Created By Filter (role-agnostic, multi-tenant compatible)
    if (selectedCreator !== "All") {
      result = result.filter((job) => {
        const creator = job.createdBy || (job as any).creator_name || (job as any).created_by;
        return creator?.trim().toLowerCase() === selectedCreator.trim().toLowerCase();
      });
    }

    // 4. Assigned To Filter (multi-tenant custom role compatible)
    if (selectedAssignee !== "All") {
      result = result.filter((job) => {
        const info = getAssignedPersonDisplay(job);
        if (selectedAssignee === "Unassigned") {
          return info.type === "unassigned";
        }
        return info.label.trim().toLowerCase() === selectedAssignee.trim().toLowerCase();
      });
    }

    // 4. Client Filter
    if (selectedClient !== "All") {
      result = result.filter(
        (job) =>
          (job.client && job.client.toLowerCase() === selectedClient.toLowerCase()) ||
          (job.endClientName && job.endClientName.toLowerCase() === selectedClient.toLowerCase())
      );
    }

    // 5. Period & Date Range Filter
    if (selectedPeriod !== "All Time" || startDate || endDate) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
      const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const startOf30Days = startOfToday - 30 * 24 * 60 * 60 * 1000;

      result = result.filter((job) => {
        const dateStr = (job as any).createdAt || job.createdOn;
        if (!dateStr) return true;
        const jobTime = new Date(dateStr).getTime();
        if (isNaN(jobTime)) return true;

        if (selectedPeriod === "Today") {
          return jobTime >= startOfToday;
        }
        if (selectedPeriod === "Yesterday") {
          return jobTime >= startOfYesterday && jobTime < startOfToday;
        }
        if (selectedPeriod === "This Week") {
          return jobTime >= startOfWeek;
        }
        if (selectedPeriod === "This Month") {
          return jobTime >= startOfMonth;
        }
        if (selectedPeriod === "Last 30 Days") {
          return jobTime >= startOf30Days;
        }
        if (selectedPeriod === "Custom" || startDate || endDate) {
          if (startDate) {
            const sTime = new Date(startDate).getTime();
            if (!isNaN(sTime) && jobTime < sTime) return false;
          }
          if (endDate) {
            const eTime = new Date(endDate + "T23:59:59.999Z").getTime();
            if (!isNaN(eTime) && jobTime > eTime) return false;
          }
          return true;
        }
        return true;
      });
    }

    // 6. Sorting: Table column header click takes precedence, otherwise selectedSort applies
    if (sortColumn) {
      result.sort((a, b) => {
        if (sortColumn === "assignedTo") {
          const strA = getAssignedPersonDisplay(a).label.toLowerCase();
          const strB = getAssignedPersonDisplay(b).label.toLowerCase();
          if (strA < strB) return sortDirection === "asc" ? -1 : 1;
          if (strA > strB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        }

        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (sortColumn === "createdOn" || sortColumn === "modifiedOn") {
          const timeA = new Date(String(valA || "")).getTime();
          const timeB = new Date(String(valB || "")).getTime();
          if (!isNaN(timeA) && !isNaN(timeB)) {
            return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
          }
        }

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }

        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();
        if (strA < strB) return sortDirection === "asc" ? -1 : 1;
        if (strA > strB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      // Default / selectedSort dropdown
      result.sort((a, b) => {
        if (selectedSort === "Latest Posted") {
          const tA = new Date(String((a as any).createdAt || a.createdOn || 0)).getTime();
          const tB = new Date(String((b as any).createdAt || b.createdOn || 0)).getTime();
          return tB - tA;
        }
        if (selectedSort === "Oldest Posted") {
          const tA = new Date(String((a as any).createdAt || a.createdOn || 0)).getTime();
          const tB = new Date(String((b as any).createdAt || b.createdOn || 0)).getTime();
          return tA - tB;
        }
        if (selectedSort === "Recently Updated") {
          const tA = new Date(String((a as any).updatedAt || a.modifiedOn || 0)).getTime();
          const tB = new Date(String((b as any).updatedAt || b.modifiedOn || 0)).getTime();
          return tB - tA;
        }
        if (selectedSort === "Job Title (A-Z)") {
          return (a.jobTitle || "").localeCompare(b.jobTitle || "");
        }
        if (selectedSort === "Job Title (Z-A)") {
          return (b.jobTitle || "").localeCompare(a.jobTitle || "");
        }
        if (selectedSort === "Hot First") {
          const rank = (j: Job) => {
            const p = String(j.priority || (j as any).urgency || "").toLowerCase();
            return p.includes("hot") ? 0 : p.includes("warm") ? 1 : 2;
          };
          return rank(a) - rank(b);
        }
        return 0;
      });
    }

    return result;
  }, [
    data,
    searchQuery,
    isPodSystemEnabled,
    selectedPod,
    selectedCreator,
    selectedAssignee,
    selectedClient,
    selectedPeriod,
    startDate,
    endDate,
    sortColumn,
    sortDirection,
    selectedSort,
  ]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  // Row Selection logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds(paginatedData.map((job) => job.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleSelectRow = (jobId: string, checked: boolean) => {
    if (checked) {
      setSelectedRowIds((prev) => [...prev, jobId]);
    } else {
      setSelectedRowIds((prev) => prev.filter((id) => id !== jobId));
    }
  };

  // Context Menu handler
  const handleContextMenu = (e: React.MouseEvent, jobId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      jobId,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeContextMenu();
        setIsSavingView(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // CSV Export
  const exportToCSV = () => {
    const headers = activeSelectedColumns.map(
      (colId) => activeAllColumns.find((c) => c.id === colId)?.label || colId
    );
    const rows = processedData.map((job) =>
      activeSelectedColumns.map((colId) => {
        const value = job[colId as keyof Job];
        if (typeof value === "object") {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value || "").replace(/"/g, '""')}"`;
      })
    );

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `jobs_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cell-level double-click edit handlers
  const handleCellDoubleClick = (rowId: string, colId: string, currentValue: string) => {
    if (!hasEditPermission) return;
    if (EDITABLE_TEXT_COLS.includes(colId) || colId === "priority" || colId === "client" || colId === "endClientName") {
      setEditingCell({ rowId, colId });
      setEditCellValue(currentValue === "N/A" ? "" : currentValue);
      if (colId === "client" || colId === "endClientName") {
        setClientSearchText("");
        fetchClientsList();
      }
    }
  };

  const handleCellSave = () => {
    if (editingCell && onUpdateJob) {
      onUpdateJob(editingCell.rowId, { [editingCell.colId]: editCellValue || "N/A" } as Partial<Job>);
    }
    setEditingCell(null);
    setEditCellValue("");
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditCellValue("");
  };

  // Also keep Quick Edit from dropdown - focuses jobTitle cell
  const startQuickEdit = (job: Job) => {
    if (!hasEditPermission) return;
    setEditingCell({ rowId: job.id, colId: "jobTitle" });
    setEditCellValue(job.jobTitle);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm shadow-none overflow-hidden relative font-sans" onClick={closeContextMenu}>
      {/* Action Bar */}
      <div className="py-1 px-2.5 border-b border-neutral-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-neutral-50/50 dark:bg-slate-900/50 text-xs">
        <div className="flex items-center gap-2">
          {/* Saved Views Select */}
          <div className="flex items-center bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded-sm">
            <select
              value={activeView}
              onChange={(e) => onSelectView(e.target.value)}
              className="px-2 py-0.5 text-xs text-neutral-800 dark:text-neutral-200 bg-transparent outline-hidden cursor-pointer border-none font-bold"
            >
              <option value={defaultViewLabel}>{defaultViewLabel}</option>
              {savedViews.map((view) => (
                <option key={view} value={view}>
                  {view}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-1.5">
          {/* Bulk Actions */}
          {selectedRowIds.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-sm mr-1">
              <span className="text-[10px] font-bold text-primary">
                {selectedRowIds.length} Selected
              </span>
              <button
                onClick={exportToCSV}
                className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline ml-1 cursor-pointer"
              >
                <Download className="h-3 w-3" /> Export
              </button>
              <button
                onClick={() => setSelectedRowIds([])}
                className="text-[10px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 ml-1 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          <button
            onClick={onRefresh}
            className="p-1.5 border border-neutral-300 dark:border-slate-750 rounded bg-white dark:bg-slate-900 hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
            title="Refresh Table"
          >
            <RefreshCw className="h-3 w-3" />
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1 px-2 py-1 border border-neutral-300 dark:border-slate-750 rounded bg-white dark:bg-slate-900 hover:bg-neutral-100 dark:hover:bg-slate-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            <Download className="h-3 w-3" /> Export CSV
          </button>

          {hasCreatePermission && (
            <button
              onClick={() => router.push("/job-posting/new")}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary hover:bg-primary/95 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" /> New Job
            </button>
          )}

          {/* Right side settings icons */}
          <div className="flex items-center border-l border-neutral-200 dark:border-slate-800 pl-1.5 gap-0.5">
            <button
              onClick={onOpenFilters}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
              title="Filters"
            >
              <Filter className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onOpenColumns}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
              title="Columns settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* EnfySync-Style Multi-Filter Bar (matching old enfySync layout) */}
      <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-900/60 border-b border-neutral-200 dark:border-slate-800">
        <div className="flex flex-wrap items-end gap-3 lg:gap-3.5">
          {/* 1. SEARCH */}
          <div className="flex flex-col gap-1.5 flex-[1.4] min-w-[200px]">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
              SEARCH
            </label>
            <div className="relative flex items-center">
              <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Job title or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] focus:border-[#1a4fa0] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 2. POD (Only rendered if pod system is enabled!) */}
          {isPodSystemEnabled && (
            <div className="flex flex-col gap-1.5 flex-1 min-w-[130px]">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
                <span>POD</span>
              </label>
              <select
                value={selectedPod}
                onChange={(e) => setSelectedPod(e.target.value)}
                className="w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] cursor-pointer transition-colors"
              >
                <option value="All">All Pods</option>
                {availablePods.map((p) => (
                  <option key={p.id || p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. CREATED BY */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
              CREATED BY
            </label>
            <select
              value={selectedCreator}
              onChange={(e) => setSelectedCreator(e.target.value)}
              className="w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] cursor-pointer transition-colors"
            >
              <option value="All">All Creators</option>
              {availableCreators.map((creator) => (
                <option key={creator} value={creator}>
                  {creator}
                </option>
              ))}
            </select>
          </div>

          {/* 4. ASSIGNED TO */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
              ASSIGNED TO
            </label>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] cursor-pointer transition-colors"
            >
              <option value="All">All Assignees</option>
              <option value="Unassigned">Unassigned</option>
              {availableAssignees.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          </div>

          {/* 4. CLIENT */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[130px]">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
              CLIENT
            </label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] cursor-pointer transition-colors"
            >
              <option value="All">All Clients</option>
              {availableClients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 5. PERIOD */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
              PERIOD
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                if (e.target.value !== "Custom") {
                  setStartDate("");
                  setEndDate("");
                } else {
                  setShowRangePicker(true);
                }
              }}
              className="w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] cursor-pointer transition-colors"
            >
              <option value="All Time">All Time</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Custom">Custom Range</option>
            </select>
          </div>

          {/* 6. RANGE */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px] relative">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
              RANGE
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRangePicker(!showRangePicker)}
                className={cn(
                  "w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border rounded-md font-medium text-left flex items-center justify-between transition-colors shadow-2xs cursor-pointer",
                  startDate || endDate || selectedPeriod === "Custom"
                    ? "border-[#1a4fa0] text-[#1a4fa0] dark:text-blue-400 font-semibold"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                )}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">
                    {startDate && endDate
                      ? `${startDate} ~ ${endDate}`
                      : startDate
                      ? `From ${startDate}`
                      : endDate
                      ? `Until ${endDate}`
                      : "Pick a range"}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 shrink-0 text-slate-400 ml-1" />
              </button>

              {showRangePicker && (
                <div className="absolute right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-3 w-[260px] space-y-2.5 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pick Date Range</span>
                    <button
                      type="button"
                      onClick={() => setShowRangePicker(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-medium">From Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setSelectedPeriod("Custom");
                      }}
                      className="w-full px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-medium">To Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setSelectedPeriod("Custom");
                      }}
                      className="w-full px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                        setSelectedPeriod("All Time");
                        setShowRangePicker(false);
                      }}
                      className="text-[11px] text-slate-500 hover:text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRangePicker(false)}
                      className="px-3 py-1 bg-primary text-white text-[11px] font-bold rounded-md shadow-2xs hover:bg-primary/90 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 7. SORT BY */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[130px]">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
              SORT BY
            </label>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] cursor-pointer transition-colors"
            >
              <option value="Latest Posted">Latest Posted</option>
              <option value="Oldest Posted">Oldest Posted</option>
              <option value="Recently Updated">Recently Updated</option>
              <option value="Job Title (A-Z)">Job Title (A-Z)</option>
              <option value="Job Title (Z-A)">Job Title (Z-A)</option>
              <option value="Hot First">Hot Priority First</option>
            </select>
          </div>

          {/* Reset Filters button */}
          {isAnyFilterActive && (
            <div className="flex items-end pb-0.5">
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-9 px-3 rounded-md border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/50 flex items-center gap-1 transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Spreadsheet grid container */}
      <div className="flex-1 overflow-auto relative min-h-0 bg-neutral-50/20 dark:bg-slate-950/10">
        <table className="w-full border-collapse text-left table-auto border-neutral-200 dark:border-slate-800">
          {/* Table Header */}
          <thead className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-800 shadow-2xs select-none backdrop-blur-xs">
            <tr>
              {/* Checkbox Header (Sticky Left) */}
              <th className="sticky left-0 z-20 w-[44px] min-w-[44px] px-3.5 py-3.5 text-center bg-slate-100/95 dark:bg-slate-900 border-r border-b border-neutral-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={
                    paginatedData.length > 0 &&
                    paginatedData.every((job) => selectedRowIds.includes(job.id))
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary cursor-pointer rounded-xs"
                />
              </th>

              {/* Column Headers */}
              {activeSelectedColumns.map((colId) => {
                const col = activeAllColumns.find((c) => c.id === colId);
                const isSorted = sortColumn === colId;
                return (
                  <th
                    key={colId}
                    className="px-4 py-3.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100/95 dark:bg-slate-900 border-r border-b border-neutral-200 dark:border-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer relative whitespace-nowrap"
                    onClick={() => handleSort(colId as keyof Job)}
                  >
                    <div className="flex items-center justify-between gap-1 pr-2">
                      <span className="uppercase tracking-wider text-[10px] whitespace-nowrap font-bold text-slate-600 dark:text-slate-300">{col?.label || colId}</span>
                      <div className="flex items-center gap-0.5 opacity-70">
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3 text-primary font-bold" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-primary font-bold" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}

              {/* Actions Header (Sticky Right) */}
              <th className="sticky right-0 z-20 w-[64px] min-w-[64px] px-3 py-3.5 text-center bg-slate-100/95 dark:bg-slate-900 border-l border-b border-neutral-200 dark:border-slate-800 uppercase tracking-wider text-[10px] font-bold text-slate-600 dark:text-slate-300">
                Action
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-neutral-200 dark:divide-slate-800 text-xs">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={activeSelectedColumns.length + 2}
                  className="h-32 text-center text-neutral-500 font-medium bg-white dark:bg-slate-900"
                >
                  No matching jobs found. Try resetting your search or filters.
                </td>
              </tr>
            ) : (
              paginatedData.map((job, idx) => {
                const isSelected = selectedRowIds.includes(job.id);
                const isRowEditing = editingCell?.rowId === job.id;
                return (
                  <tr
                    key={job.id}
                    onContextMenu={(e) => handleContextMenu(e, job.id)}
                    className={cn(
                      "group transition-colors cursor-default border-b border-neutral-200 dark:border-slate-800/80",
                      isSelected
                        ? "bg-primary/10 hover:bg-primary/10 dark:bg-primary/15 dark:hover:bg-primary/15"
                        : idx % 2 === 0
                        ? "bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-slate-800/60"
                        : "bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-slate-800/60",
                      isRowEditing ? "ring-1 ring-inset ring-primary/30" : ""
                    )}
                  >
                    {/* Checkbox (Sticky Left) */}
                    <td className={cn(
                      "sticky left-0 z-10 w-[44px] min-w-[44px] px-3.5 py-4 text-center border-r border-neutral-200 dark:border-slate-800 transition-colors duration-150",
                      isSelected
                        ? "bg-blue-50/95 dark:bg-blue-950/95"
                        : idx % 2 === 0
                        ? "bg-white dark:bg-slate-900 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/60"
                        : "bg-slate-50 dark:bg-slate-800/40 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/60"
                    )}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(job.id, e.target.checked)}
                        className="h-3.5 w-3.5 accent-primary cursor-pointer rounded-xs"
                      />
                    </td>

                    {/* Columns */}
                    {activeSelectedColumns.map((colId) => {
                      const isCellEditing = editingCell?.rowId === job.id && editingCell?.colId === colId;
                      const isEditable = EDITABLE_TEXT_COLS.includes(colId) || colId === "priority" || colId === "client" || colId === "endClientName";
                      const rawValue = String(job[colId as keyof Job] || "");
                      return (
                        <td
                          key={colId}
                          onDoubleClick={() => isEditable && handleCellDoubleClick(job.id, colId, rawValue)}
                          className={cn(
                            "py-4 px-4 border-r border-neutral-200/80 dark:border-slate-800/80 whitespace-nowrap font-normal text-slate-850 dark:text-slate-200 text-xs transition-colors relative",
                            isEditable && !isCellEditing ? "hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-cell" : "",
                            isCellEditing ? "p-0 bg-blue-100/90 dark:bg-blue-950/90 ring-2 ring-blue-600" : ""
                          )}
                          title={isEditable && !isCellEditing ? "Double-click to edit" : undefined}
                        >
                          {/* === INLINE EDIT MODE === */}
                          {isCellEditing && (colId === "client" || colId === "endClientName") ? (
                            <div 
                              onClick={(e) => e.stopPropagation()} 
                              className="absolute left-0 top-0 z-[99] min-w-[260px] max-w-[300px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl p-2.5 font-sans text-xs space-y-2 animate-in fade-in zoom-in-95"
                            >
                              {/* Header Title */}
                              <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  Select or Add {colId === "endClientName" ? "End Client" : "Client"}
                                </span>
                                <button onClick={handleCellCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                                  ✕
                                </button>
                              </div>

                              {/* Search Input */}
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder={`Search ${colId === "endClientName" ? "end clients..." : "clients..."}`}
                                  value={clientSearchText}
                                  onChange={(e) => setClientSearchText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") handleCellCancel();
                                  }}
                                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs outline-none focus:ring-1 focus:ring-[#1a4fa0] text-slate-900 dark:text-slate-100 font-medium"
                                />
                              </div>

                              {/* Scrollable List of Clients */}
                              <div className="max-h-44 overflow-y-auto space-y-0.5 border-y border-slate-100 dark:border-slate-800 py-1">
                                {availableClientNames
                                  .filter((cName) =>
                                    cName.toLowerCase().includes(clientSearchText.trim().toLowerCase())
                                  )
                                  .map((cName, index) => {
                                    const isCurrent = cName === String(job[colId as keyof Job] || "");
                                    return (
                                      <div
                                        key={cName + index}
                                        onClick={() => {
                                          if (onUpdateJob) onUpdateJob(job.id, { [colId]: cName });
                                          handleCellCancel();
                                          toast.success(`${colId === "endClientName" ? "End Client" : "Client"} updated to ${cName}`);
                                        }}
                                        className={cn(
                                          "px-2.5 py-1.5 rounded-md cursor-pointer transition-colors flex items-center justify-between text-xs font-medium",
                                          isCurrent 
                                            ? "bg-[#1a4fa0]/10 text-[#1a4fa0] dark:bg-blue-950/40 dark:text-blue-300 font-semibold"
                                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                                        )}
                                      >
                                        <span>{cName}</span>
                                        {isCurrent && (
                                          <span className="text-[#1a4fa0] dark:text-blue-400 text-[10px] font-bold">Selected</span>
                                        )}
                                      </div>
                                    );
                                  })}

                                {clientSearchText.trim() !== "" && !availableClientNames.some(cn => cn.toLowerCase() === clientSearchText.trim().toLowerCase()) && (
                                  <div
                                    onClick={() => {
                                      setAddClientModalOpen(true);
                                    }}
                                    className="px-2.5 py-1.5 rounded-md cursor-pointer bg-blue-50 dark:bg-blue-950/40 text-[#1a4fa0] dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-between text-xs font-semibold"
                                  >
                                    <span>Use "{clientSearchText.trim()}"</span>
                                    <span className="text-[10px] uppercase tracking-wider font-bold">+ Add New</span>
                                  </div>
                                )}

                                {availableClientNames.filter((cName) =>
                                  cName.toLowerCase().includes(clientSearchText.trim().toLowerCase())
                                ).length === 0 && clientSearchText.trim() === "" && (
                                  <div className="px-2 py-3 text-center text-slate-400 italic text-[11px]">
                                    No clients available
                                  </div>
                                )}
                              </div>

                              {/* Bottom Add Client Button */}
                              <button
                                type="button"
                                onClick={() => setAddClientModalOpen(true)}
                                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1a4fa0] hover:bg-[#154185] text-white font-medium rounded-md text-xs transition-colors cursor-pointer shadow-xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Add New Client</span>
                              </button>
                            </div>
                          ) : isCellEditing && colId === "priority" ? (
                            <select
                              autoFocus
                              value={editCellValue}
                              onChange={(e) => setEditCellValue(e.target.value)}
                              onBlur={handleCellSave}
                              onKeyDown={(e) => { if (e.key === "Enter") handleCellSave(); if (e.key === "Escape") handleCellCancel(); }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full h-full px-1.5 py-1 text-xs bg-white dark:bg-slate-900 border-0 outline-none focus:ring-2 focus:ring-primary rounded-none text-neutral-800 dark:text-neutral-200 cursor-pointer"
                            >
                              {PRIORITY_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : isCellEditing ? (
                            <input
                              autoFocus
                              type="text"
                              value={editCellValue}
                              onChange={(e) => setEditCellValue(e.target.value)}
                              onBlur={handleCellSave}
                              onKeyDown={(e) => { if (e.key === "Enter") handleCellSave(); if (e.key === "Escape") handleCellCancel(); }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border-0 outline-none focus:ring-2 focus:ring-inset focus:ring-primary rounded-none text-neutral-800 dark:text-neutral-200"
                            />
                          ) : (colId === "client" || colId === "endClientName") ? (
                            <div className="flex items-center justify-between gap-1 w-full group/client cursor-cell">
                              <span className="font-medium text-slate-900 dark:text-slate-100">{String(job[colId as keyof Job] || "N/A")}</span>
                              {hasEditPermission && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCellDoubleClick(job.id, colId, String(job[colId as keyof Job] || ""));
                                  }}
                                  className="opacity-0 group-hover/client:opacity-100 text-neutral-400 hover:text-blue-500 hover:bg-neutral-100 dark:hover:bg-slate-800 p-0.5 rounded transition-opacity cursor-pointer"
                                  title={`Search or Add ${colId === "endClientName" ? "End Client" : "Client"}`}
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ) : colId === "jobCode" ? (
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <Link href={`/job-posting/${job.id}`}>
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-semibold text-slate-850 dark:text-slate-200 hover:border-[#1a4fa0] hover:text-[#1a4fa0] dark:hover:text-blue-400 transition-colors shadow-2xs cursor-pointer">
                                  {job.jobCode}
                                </span>
                              </Link>
                            </div>
                          ) : colId === "jobStatus" ? (
                            (() => {
                              const isPending = job.jobStatus === "Pending Approval" || job.approvalStatus === "PENDING_APPROVAL";
                              const status = isPending ? "Pending Approval" : (job.jobStatus || "Active");

                              const isAssignedReviewer = Boolean(
                                job.assignedApproverId &&
                                (currentUser?.id === job.assignedApproverId || (currentUser as any)?.dbId === job.assignedApproverId || (currentUser as any)?.keycloakId === job.assignedApproverId)
                              );

                              const isJobCreator = Boolean(
                                (job.createdBy && currentUser?.fullName && job.createdBy.toLowerCase() === currentUser.fullName.toLowerCase()) ||
                                (job.createdBy && currentUser?.email && job.createdBy.toLowerCase() === currentUser.email.toLowerCase()) ||
                                (job.createdBy && currentUser?.id && job.createdBy === currentUser.id)
                              );

                              const isAdminOrDeliveryHead = Boolean(
                                currentUser?.roles?.some((r: string) => {
                                  const norm = r.toUpperCase().replace(/[\s-_]+/g, "");
                                  return norm === "SUPERADMIN" || norm === "ADMIN" || norm === "DELIVERYHEAD" || norm === "BRANCHADMIN";
                                })
                              );

                              // Only show Approve/Reject if user is the assigned reviewer OR has reviewer/admin privileges (and is not an unprivileged creator self-approving)
                              const canApproveThisJob = isPending && (
                                isAssignedReviewer ||
                                (hasApprovePermission && (!isJobCreator || isAdminOrDeliveryHead))
                              );

                              if (isPending && canApproveThisJob) {
                                return (
                                  <div className="inline-flex items-center gap-1.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded px-2 py-0.5 select-none">
                                    <span className="text-[10.5px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide whitespace-nowrap">
                                      Pending Approval
                                    </span>
                                    <div className="flex items-center gap-0.5 pl-1 border-l border-amber-200 dark:border-amber-800/60">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setApproveModalJob(job);
                                          setApprovePreset("Approved — Requisition verified and rates validated");
                                          setApproveRemark("");
                                        }}
                                        className="p-1 rounded-xs text-emerald-600 hover:text-white hover:bg-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white transition-all cursor-pointer shadow-2xs active:scale-95"
                                        title="Review & Approve Job Requisition"
                                      >
                                        <CheckCircle className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRejectModalJob(job);
                                          setRejectCategory("Rate / Budget is too low for required experience level");
                                          setRejectReason("");
                                        }}
                                        className="p-1 rounded-xs text-rose-600 hover:text-white hover:bg-rose-600 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white transition-all cursor-pointer shadow-2xs active:scale-95"
                                        title="Review & Reject Job Requisition"
                                      >
                                        <XCircle className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <span
                                  className={cn(
                                    "inline-flex items-center justify-center px-2 py-0.5 rounded text-[10.5px] font-bold tracking-wide uppercase select-none border",
                                    isPending
                                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50"
                                      : status === "Active"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50"
                                      : status === "Archived" || status === "Hold" || status === "Hold by Client"
                                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50"
                                      : status === "Close" || status === "Closed"
                                      ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/50"
                                      : status === "Filled"
                                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/50"
                                      : status === "Draft"
                                      ? "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 italic"
                                      : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                                  )}
                                >
                                  {status}
                                </span>
                              );
                            })()
                          ) : colId === "priority" ? (
                            <Badge
                              className={cn(
                                "text-[10px] font-medium px-2 py-0.5 rounded-md border shadow-none cursor-cell",
                                job.priority === "Hot" || job.priority === "High" || job.priority === "Urgent"
                                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40"
                                  : job.priority === "Warm" || job.priority === "Medium"
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40"
                                  : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                              )}
                            >
                              {job.priority || "Warm"}
                            </Badge>
                          ) : colId === "podName" ? (
                            job.podName ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40 rounded-md px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                                  <Users className="h-2.5 w-2.5 shrink-0 text-purple-600 dark:text-purple-400" />
                                  {job.podName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-neutral-400 dark:text-neutral-600 italic text-[10px]">Unassigned</span>
                            )
                          ) : colId === "jobTitle" ? (
                            (() => {
                              const isPending = job.jobStatus === "Pending Approval" || job.approvalStatus === "PENDING_APPROVAL";
                              const isDraft = job.jobStatus === "Draft";
                              const isHold = job.jobStatus === "Hold" || job.jobStatus === "Hold by Client" || job.jobStatus === "Archived";
                              const isClosed = job.jobStatus === "Close" || job.jobStatus === "Closed";
                              const isFilled = job.jobStatus === "Filled";
                              const isRecent = isJobRecent(job);

                              let statusLabel = "ACTIVE";
                              let statusClasses = "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40";

                              if (isPending) {
                                statusLabel = "PENDING";
                                statusClasses = "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40";
                              } else if (isDraft) {
                                statusLabel = "DRAFT";
                                statusClasses = "bg-slate-500/10 text-slate-600 border-slate-500/30 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/40";
                              } else if (isRecent) {
                                statusLabel = "NEW";
                                statusClasses = "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40";
                              } else if (isHold) {
                                statusLabel = "ON HOLD";
                                statusClasses = "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40";
                              } else if (isClosed) {
                                statusLabel = "CLOSED";
                                statusClasses = "bg-zinc-500/10 text-zinc-500 border-zinc-500/30 dark:bg-zinc-500/20 dark:text-zinc-400 dark:border-zinc-500/40";
                              } else if (isFilled) {
                                statusLabel = "FILLED";
                                statusClasses = "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40";
                              }

                              const rawPriority = String(job.priority || (job as any).urgency || "Warm").toUpperCase();
                              const isHot = rawPriority.includes("HOT") || rawPriority.includes("HIGH") || rawPriority.includes("URGENT");
                              const isCold = rawPriority.includes("COLD") || rawPriority.includes("LOW");
                              const priorityLabel = isHot ? "HOT" : isCold ? "COLD" : "WARM";
                              const priorityClasses = isHot
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/40"
                                : isCold
                                ? "bg-sky-500/10 text-sky-600 border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/40"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40";

                              return (
                                <div className="flex items-center gap-1.5 whitespace-nowrap">
                                  <Link href={`/job-posting/${job.id}`}>
                                    <span className="whitespace-nowrap hover:underline cursor-pointer text-slate-900 dark:text-slate-100 hover:text-[#1a4fa0] dark:hover:text-blue-400 font-semibold">
                                      {job.jobTitle}
                                    </span>
                                  </Link>
                                  {statusLabel && (
                                    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border select-none leading-none shrink-0", statusClasses)}>
                                      {statusLabel}
                                    </span>
                                  )}
                                  <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border select-none leading-none shrink-0", priorityClasses)}>
                                    {priorityLabel}
                                  </span>
                                  {job.agingDays > 30 && (
                                    <Badge className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/30 text-[9px] scale-90 flex items-center gap-0.5 shadow-none px-1 py-0 font-medium shrink-0">
                                      <AlertTriangle className="h-2.5 w-2.5" /> SLA
                                    </Badge>
                                  )}
                                </div>
                              );
                            })()
                          ) : colId === "createdBy" ? (
                            <div className="flex flex-col leading-tight py-0.5">
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                                {String(job.createdBy || (job as any).creator_name || (job as any).created_by || "Account Manager")}
                              </span>
                              {((job as any).creatorEmail || (job as any).creator_email) && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[160px]">
                                  {(job as any).creatorEmail || (job as any).creator_email}
                                </span>
                              )}
                            </div>
                          ) : colId === "location" ? (
                            <div className="flex flex-col leading-tight py-0.5">
                              <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                                {job.jobType || "Contract"}
                              </span>
                              <span className="text-[10.5px] text-slate-400 dark:text-slate-500">
                                {job.location || job.states || "Remote"}
                              </span>
                            </div>
                          ) : colId === "submissionsCount" ? (
                            <div className="flex flex-col items-center justify-center leading-tight py-0.5 min-w-[55px]">
                              <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                {job.submissionsCount || 0} / {job.submissionRequired || 5}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-tight">
                                done / req
                              </span>
                            </div>
                          ) : colId === "createdOn" ? (
                            (() => {
                              const formatted = formatDateTimeDisplay(job.createdOn || (job as any).createdAt, job);
                              return (
                                <div className="flex flex-col leading-tight py-0.5 min-w-[110px]">
                                  <span className="font-medium text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                                    {formatted.date}
                                  </span>
                                  {formatted.time && (
                                    <span className="font-mono text-[10.5px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                      {formatted.time}
                                    </span>
                                  )}
                                </div>
                              );
                            })()
                          ) : colId === "modifiedOn" ? (
                            (() => {
                              const formatted = formatDateTimeDisplay(job.modifiedOn || (job as any).updatedAt || job.createdOn, job);
                              return (
                                <div className="flex flex-col leading-tight py-0.5 min-w-[110px]">
                                  <span className="font-medium text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                                    {formatted.date}
                                  </span>
                                  {formatted.time && (
                                    <span className="font-mono text-[10.5px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                      {formatted.time}
                                    </span>
                                  )}
                                </div>
                              );
                            })()
                          ) : colId === "visaType" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-[10.5px] italic text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {job.visaType || "All Visa"}
                            </span>
                          ) : colId === "noOfPositions" ? (
                            <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                              {job.noOfPositions || 1}
                            </span>
                          ) : colId === "primaryRecruiter" ? (
                            <span className="text-xs text-neutral-800 dark:text-neutral-200">
                              {String(job.primaryRecruiter || "N/A")}
                            </span>
                          ) : colId === "assignedTo" ? (
                            <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
                              {(() => {
                                const assignInfo = getAssignedPersonDisplay(job);
                                if (assignInfo.type === "all") {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 tracking-tight shrink-0">
                                      <Users className="h-3 w-3 text-slate-500 dark:text-slate-400 shrink-0" />
                                      All recruiters
                                    </span>
                                  );
                                }
                                if (assignInfo.type === "pod") {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 min-w-0" title={`Assigned Pod: ${assignInfo.label}`}>
                                      <Users className="h-3 w-3 shrink-0 text-slate-500 dark:text-slate-400" />
                                      <span className="truncate max-w-[130px]">{assignInfo.label}</span>
                                    </span>
                                  );
                                }
                                if (assignInfo.type === "recruiter") {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 min-w-0" title={`Assigned Recruiter: ${assignInfo.label}`}>
                                      <User className="h-3 w-3 shrink-0 text-slate-500 dark:text-slate-400" />
                                      <span className="truncate max-w-[130px]">{assignInfo.label}</span>
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-normal text-neutral-400 dark:text-neutral-500 italic shrink-0">
                                    Unassigned
                                  </span>
                                );
                              })()}
                              {hasEditPermission && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openAssignModal(job, "assignedTo"); }}
                                  className="text-neutral-400 hover:text-blue-500 hover:bg-neutral-100 dark:hover:bg-slate-800 p-0.5 rounded transition-colors cursor-pointer shrink-0 ml-auto"
                                  title="Change Assignment"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ) : (colId === "payRate" || colId === "clientBillRate") ? (
                            (() => {
                              const rateStr = String(job[colId as keyof Job] || "N/A");
                              if (!rateStr || rateStr === "N/A") return "N/A";
                              if (/[a-zA-Z$₹]/.test(rateStr)) return rateStr;
                              if (job.market === "IN") {
                                return `INR - ${rateStr} LPA`;
                              } else {
                                return `USD - $${rateStr}/hr`;
                              }
                            })()
                          ) : (
                            String(job[colId as keyof Job] || "N/A")
                          )}
                        </td>
                      );
                    })}

                    {/* Actions Column (Sticky Right) */}
                    <td className={cn(
                      "sticky right-0 z-10 w-[64px] min-w-[64px] px-3 py-4 text-center border-l border-neutral-200 dark:border-slate-800 transition-colors duration-150",
                      isSelected
                        ? "bg-blue-50/95 dark:bg-blue-950/95"
                        : idx % 2 === 0
                        ? "bg-white dark:bg-slate-900 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/60"
                        : "bg-slate-50 dark:bg-slate-800/40 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/60"
                    )}>
                      {isRowEditing ? (
                        <div className="flex items-center gap-0.5 justify-center">
                          <button
                            onMouseDown={(e) => { e.preventDefault(); handleCellSave(); }}
                            className="bg-green-600 text-white rounded-xs p-0.5 hover:bg-green-700 text-[9.5px] px-1 font-bold cursor-pointer"
                            title="Save (Enter)"
                          >
                            ✓
                          </button>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); handleCellCancel(); }}
                            className="bg-neutral-200 dark:bg-slate-700 text-neutral-700 dark:text-neutral-200 rounded-xs p-0.5 hover:bg-neutral-300 dark:hover:bg-slate-600 text-[9.5px] px-1 cursor-pointer"
                            title="Cancel (Esc)"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:bg-[#1a4fa0]/10 dark:hover:bg-slate-800 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-[#1a4fa0] dark:hover:text-blue-400 transition-colors cursor-pointer" title="Actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            sideOffset={4}
                            className="w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-neutral-200/90 dark:border-slate-800 rounded-xl shadow-xl shadow-slate-900/10 dark:shadow-black/50 p-1.5 animate-in fade-in-0 zoom-in-95 z-[100] font-sans"
                          >
                            {/* Section 1: Candidate Sourcing & Pipeline */}
                            {job.jobStatus !== "Draft" && (
                              <div className="space-y-0.5">
                                <div className="px-2.5 pt-1 pb-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                  Sourcing & Pipeline
                                </div>

                                <DropdownMenuItem
                                  onClick={() => handleOpenSourceModal(job)}
                                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                >
                                  <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                                    <UserPlus className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="font-semibold">Submit Candidate</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => router.push(`/job-posting/${job.id}/matches`)}
                                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
                                >
                                  <div className="h-6 w-6 rounded-md bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 shadow-2xs">
                                    <Sparkles className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="font-semibold">Find AI Matches</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => router.push(`/job-posting/${job.id}`)}
                                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <div className="h-6 w-6 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                                    <Users className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="font-semibold">View Pipeline</span>
                                </DropdownMenuItem>
                              </div>
                            )}

                            {/* Section 2: Management Actions */}
                            {hasEditPermission && (
                              <>
                                {job.jobStatus !== "Draft" && <DropdownMenuSeparator className="my-1 border-neutral-100 dark:border-slate-800" />}

                                <div className="space-y-0.5">
                                  <div className="px-2.5 pt-1 pb-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    Job Actions
                                  </div>

                                  {(job.jobStatus === "Pending Approval" || job.approvalStatus === "PENDING_APPROVAL") && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={async () => {
                                          try {
                                            await atsApi.jobs.approve(job.id);
                                            toast.success(`Job ${job.jobCode} approved & activated!`);
                                            if (onUpdateJob) onUpdateJob(job.id, { jobStatus: "Active" });
                                          } catch (e: any) {
                                            toast.error("Failed to approve job: " + e.message);
                                          }
                                        }}
                                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                      >
                                        <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                                          <CheckCircle className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="font-semibold">Approve &amp; Activate</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        onClick={async () => {
                                          const reason = window.prompt("Enter rejection feedback for Account Manager:");
                                          if (reason === null) return;
                                          if (!reason.trim()) {
                                            toast.error("Rejection reason required");
                                            return;
                                          }
                                          try {
                                            await atsApi.jobs.reject(job.id, reason.trim());
                                            toast.success(`Job ${job.jobCode} rejected.`);
                                            if (onUpdateJob) onUpdateJob(job.id, { jobStatus: "Draft" });
                                          } catch (e: any) {
                                            toast.error("Failed to reject job: " + e.message);
                                          }
                                        }}
                                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                      >
                                        <div className="h-6 w-6 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs">
                                          <XCircle className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="font-semibold">Reject Job</span>
                                      </DropdownMenuItem>
                                    </>
                                  )}

                                  {job.jobStatus === "Draft" && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        if (onUpdateJob) onUpdateJob(job.id, { jobStatus: "Active" });
                                      }}
                                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                    >
                                      <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                                        <CheckSquare className="h-3.5 w-3.5" />
                                      </div>
                                      <span className="font-semibold">Publish Job</span>
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem
                                    onClick={() => router.push(`/job-posting/${job.id}/edit`)}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  >
                                    <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 shadow-2xs">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="font-semibold">Edit Job</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => router.push(`/job-posting/new?cloneFrom=${job.id}`)}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                                  >
                                    <div className="h-6 w-6 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                                      <Copy className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="font-semibold">Duplicate Job</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => startQuickEdit(job)}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  >
                                    <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 shadow-2xs">
                                      <Edit className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="font-semibold">Quick Edit</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => onUpdateJob?.(job.id, { jobStatus: "Archived" })}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                                  >
                                    <div className="h-6 w-6 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
                                      <Archive className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="font-semibold">Archive Job</span>
                                  </DropdownMenuItem>
                                </div>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="py-1 px-3 border-t border-neutral-200 dark:border-slate-800 bg-neutral-100 dark:bg-slate-850 flex items-center justify-between select-none shrink-0 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
        <div className="flex items-center gap-1.5">
          <span>
            {Math.min(processedData.length, (currentPage - 1) * pageSize + 1)}-
            {Math.min(processedData.length, currentPage * pageSize)} of{" "}
            {processedData.length} records
          </span>
        </div>

        {/* Page Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 border border-neutral-350 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 border border-neutral-350 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-slate-700 rounded-sm text-[11px] text-neutral-805 dark:text-neutral-150 outline-hidden cursor-pointer"
            >
              <option value={10}>10 Per Page</option>
              <option value={25}>25 Per Page</option>
              <option value={50}>50 Per Page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save View Modal Dialog */}
      {isSavingView && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-neutral-250 dark:border-slate-800 w-80 shadow-2xl space-y-4 font-sans">
            <div>
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                <FolderPlus className="h-4 w-4 text-primary" /> Save Current View
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Enter a name for this custom view config.
              </p>
            </div>
            <input
              type="text"
              placeholder="e.g. Active Java Jobs"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 outline-hidden focus:border-primary"
            />
            <div className="flex items-center justify-end gap-2 text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSavingView(false)}
                className="h-8 cursor-pointer text-neutral-500"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (newViewName.trim()) {
                    onSaveView(newViewName);
                    setNewViewName("");
                    setIsSavingView(false);
                  }
                }}
                className="h-8 bg-primary text-white cursor-pointer font-bold"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-neutral-200/90 dark:border-slate-800 rounded-xl shadow-xl shadow-slate-900/10 dark:shadow-black/50 w-56 p-1.5 flex flex-col gap-1 text-xs select-none font-sans animate-in fade-in-0 zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-0.5">
            <div className="px-2.5 pt-1 pb-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Quick Actions
            </div>

            <button
              onClick={() => {
                const job = data.find((j) => j.id === contextMenu.jobId);
                if (job) handleOpenSourceModal(job);
                closeContextMenu();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer font-semibold"
            >
              <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                <UserPlus className="h-3.5 w-3.5" />
              </div>
              <span>Submit Candidate</span>
            </button>

            <button
              onClick={() => {
                const job = data.find((j) => j.id === contextMenu.jobId);
                if (job) router.push(`/job-posting/${job.id}/matches`);
                closeContextMenu();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors cursor-pointer font-semibold"
            >
              <div className="h-6 w-6 rounded-md bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span>Find AI Matches</span>
            </button>
          </div>

          <div className="border-t border-neutral-100 dark:border-slate-800 my-0.5" />

          <div className="space-y-0.5">
            <div className="px-2.5 pt-1 pb-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Management
            </div>

            {hasEditPermission && (
              <>
                <button
                  onClick={() => {
                    const job = data.find((j) => j.id === contextMenu.jobId);
                    if (job) router.push(`/job-posting/${job.id}/edit`);
                    closeContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer font-semibold"
                >
                  <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 shadow-2xs">
                    <Pencil className="h-3.5 w-3.5" />
                  </div>
                  <span>Edit Job</span>
                </button>
                <button
                  onClick={() => {
                    const job = data.find((j) => j.id === contextMenu.jobId);
                    if (job) startQuickEdit(job);
                    closeContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer font-semibold"
                >
                  <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 shadow-2xs">
                    <Edit className="h-3.5 w-3.5" />
                  </div>
                  <span>Quick Edit</span>
                </button>
              </>
            )}

            <button
              onClick={() => {
                if (contextMenu?.jobId) {
                  onUpdateJob?.(contextMenu.jobId, { jobStatus: "Archived" });
                }
                closeContextMenu();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer font-semibold"
            >
              <div className="h-6 w-6 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Archive className="h-3.5 w-3.5" />
              </div>
              <span>Archive Job</span>
            </button>
          </div>
        </div>
      )}

      {/* Job Status Modal Dialog */}
      {statusModalJob && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center font-sans">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 w-[450px] shadow-2xl rounded overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-neutral-100 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Job Status</h3>
              <button onClick={() => setStatusModalJob(null)} className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-250 font-bold text-lg select-none">×</button>
            </div>
            {/* Body */}
            <div className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="col-span-1 text-neutral-600 dark:text-neutral-400 font-semibold text-right">Job Status</span>
                <select
                  value={statusModalValue}
                  onChange={(e) => setStatusModalValue(e.target.value)}
                  className="col-span-3 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2 py-1.5 outline-hidden text-neutral-805 dark:text-neutral-200 focus:border-primary text-xs cursor-pointer font-medium"
                >
                  <option value="Select Status">Select Status</option>
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                  <option value="Filled">Filled</option>
                  <option value="Hold by Client">Hold by Client</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <span className="col-span-1 text-neutral-600 dark:text-neutral-400 font-semibold text-right pt-1.5">Comment</span>
                <textarea
                  placeholder="Comment"
                  value={statusModalComment}
                  onChange={(e) => setStatusModalComment(e.target.value)}
                  className="col-span-3 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden text-neutral-850 dark:text-neutral-200 focus:border-primary h-20 text-xs"
                />
              </div>
            </div>
            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-2 bg-neutral-50 dark:bg-slate-900 border-t border-neutral-200 dark:border-slate-800 text-xs">
              <Button
                size="sm"
                onClick={handleStatusUpdate}
                disabled={statusModalValue === "Select Status"}
                className="h-8 bg-blue-600 hover:bg-blue-750 text-white font-bold cursor-pointer rounded-sm"
              >
                Update
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusModalJob(null)}
                className="h-8 border border-neutral-300 dark:border-slate-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-slate-800 font-bold cursor-pointer rounded-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assigned To Modal Dialog */}
      {assignModalJob && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 w-full max-w-[560px] shadow-2xl rounded-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-50 dark:bg-slate-800/80 border-b border-neutral-200 dark:border-slate-700/80">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <User className="h-3 w-3" />
                  </span>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Job Assignment
                  </h3>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate max-w-[440px]">
                  {assignModalJob.jobCode} • {assignModalJob.jobTitle}
                  {assignModalTargetBranch?.name ? ` (${assignModalTargetBranch.name})` : ""}
                </p>
              </div>
              <button
                onClick={() => setAssignModalJob(null)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-md hover:bg-neutral-200/50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            {/* Currently Selected Badge banner */}
            <div className="px-5 py-2.5 bg-neutral-100/70 dark:bg-slate-800/40 border-b border-neutral-200/70 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Current Selection:
              </span>
              <div className="truncate text-right">
                {(() => {
                  if (assignModalSelectedId === "all") {
                    return (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200/80 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        <Users className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                        All recruiters
                      </span>
                    );
                  }
                  if (assignModalSelectedId === "none") {
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-200/70 text-neutral-700 dark:bg-slate-800 dark:text-neutral-300 border border-neutral-300 dark:border-slate-700 italic">
                        Unassigned Allocation
                      </span>
                    );
                  }
                  if (assignModalSelectedId.startsWith("pod:")) {
                    const pid = assignModalSelectedId.replace("pod:", "");
                    const pod = targetBranchPods.find((p: any) => p.id === pid);
                    return (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200/80 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        <Users className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                        Pod: {pod?.name || "Recruitment Pod"}
                      </span>
                    );
                  }
                  if (assignModalSelectedId.startsWith("rec:")) {
                    const rid = assignModalSelectedId.replace("rec:", "");
                    const rec = targetRecruitersList.find((u: any) => u.id === rid);
                    const role = rec ? getUserRoleLabel(rec, assignModalTargetBranch?.id) : "";
                    return (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200/80 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        <User className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                        {rec?.fullName || rec?.name || "Recruiter"} {role ? `[${role}]` : ""}
                      </span>
                    );
                  }
                  return (
                    <span className="text-[11px] text-neutral-400 italic">None selected</span>
                  );
                })()}
              </div>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Search Bar */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Search staff, role, email, or pod..."
                  value={assignModalSearch}
                  onChange={(e) => setAssignModalSearch(e.target.value)}
                  className="w-full h-8 bg-neutral-50 dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded-md pl-8 pr-3 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                  autoFocus
                />
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
                {assignModalSearch && (
                  <button
                    onClick={() => setAssignModalSearch("")}
                    className="absolute right-2 text-neutral-400 hover:text-neutral-600 text-xs font-bold cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Options Sections List */}
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {/* 1. Assign to */}
                {showPoolSection && (
                  <div className="space-y-1.5">
                    <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 bg-neutral-100/70 dark:bg-slate-800/50 rounded flex items-center justify-between">
                      <span>Assign to</span>
                      <span className="text-[9.5px] font-normal text-neutral-400">Branch Wide</span>
                    </div>

                    {/* All Branch Recruiters */}
                    {(branchAllowsAllBroadcast || !hasAnyAssignmentEnabled) && (
                      <div
                        onClick={() => setAssignModalSelectedId("all")}
                        className={cn(
                          "px-3 py-2.5 rounded-md cursor-pointer border transition-all flex items-center justify-between gap-3 text-xs",
                          assignModalSelectedId === "all"
                            ? "bg-slate-100 dark:bg-slate-800/80 border-slate-400 dark:border-slate-600 text-slate-900 dark:text-slate-100 shadow-2xs"
                            : "bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800/60 text-neutral-800 dark:text-neutral-200"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={cn(
                            "flex items-center justify-center h-6 w-6 rounded-md shrink-0",
                            assignModalSelectedId === "all"
                              ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                              : "bg-neutral-100 dark:bg-slate-800 text-neutral-500"
                          )}>
                            <Users className="h-3.5 w-3.5" />
                          </span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-neutral-900 dark:text-white">
                              All recruiters
                            </span>
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              All recruiters in {assignModalTargetBranch?.name || "this branch"} can work on this job
                            </span>
                          </div>
                        </div>
                        {assignModalSelectedId === "all" && (
                          <Check className="h-4 w-4 text-slate-800 dark:text-slate-200 shrink-0" />
                        )}
                      </div>
                    )}

                    {/* Unassigned Allocation */}
                    {(branchAllowsUnassigned || !hasAnyAssignmentEnabled) && (
                      <div
                        onClick={() => setAssignModalSelectedId("none")}
                        className={cn(
                          "px-3 py-2.5 rounded-md cursor-pointer border transition-all flex items-center justify-between gap-3 text-xs",
                          assignModalSelectedId === "none"
                            ? "bg-neutral-100 dark:bg-slate-800 border-neutral-400 dark:border-slate-600 text-neutral-900 dark:text-neutral-100"
                            : "bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800/60 text-neutral-800 dark:text-neutral-200"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={cn(
                            "flex items-center justify-center h-6 w-6 rounded-md shrink-0",
                            assignModalSelectedId === "none"
                              ? "bg-neutral-200 dark:bg-slate-700 text-neutral-700 dark:text-neutral-300"
                              : "bg-neutral-100 dark:bg-slate-800 text-neutral-500"
                          )}>
                            <UserX className="h-3.5 w-3.5" />
                          </span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-neutral-900 dark:text-white">
                              Unassigned Allocation (Hold for Manager Assignment)
                            </span>
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              Keep on hold without notifying recruiters until manually assigned
                            </span>
                          </div>
                        </div>
                        {assignModalSelectedId === "none" && (
                          <Check className="h-4 w-4 text-neutral-800 dark:text-neutral-200 shrink-0" />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Recruitment Pods */}
                {showPodsSection && targetBranchPods.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 bg-neutral-100/70 dark:bg-slate-800/50 rounded flex items-center justify-between">
                      <span>Recruitment Pods</span>
                      <span className="text-[9.5px] font-normal text-neutral-400">{targetBranchPods.length} Pods</span>
                    </div>
                    {targetBranchPods
                      .filter((pod: any) => {
                        if (!assignModalSearch.trim()) return true;
                        const q = assignModalSearch.toLowerCase();
                        return (
                          (pod.name || "").toLowerCase().includes(q) ||
                          (pod.podHeadName || "").toLowerCase().includes(q)
                        );
                      })
                      .map((pod: any) => {
                        const isSelected = assignModalSelectedId === `pod:${pod.id}`;
                        return (
                          <div
                            key={`pod:${pod.id}`}
                            onClick={() => setAssignModalSelectedId(`pod:${pod.id}`)}
                            className={cn(
                              "px-3 py-2 rounded-md cursor-pointer border transition-all flex items-center justify-between gap-3 text-xs",
                              isSelected
                                ? "bg-slate-100 dark:bg-slate-800/80 border-slate-400 dark:border-slate-600 text-slate-900 dark:text-slate-100 shadow-2xs"
                                : "bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800/60"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={cn(
                                "flex items-center justify-center h-6 w-6 rounded-md shrink-0",
                                isSelected
                                  ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                  : "bg-neutral-100 dark:bg-slate-800 text-neutral-500"
                              )}>
                                <Users className="h-3.5 w-3.5" />
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-neutral-900 dark:text-white">
                                  Pod: {pod.name}
                                </span>
                                {pod.podHeadName && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400">
                                    Lead: {pod.podHeadName}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-slate-800 dark:text-slate-200 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* 3. Direct Staff Assignment */}
                {showStaffSection && targetRecruitersList.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 bg-neutral-100/70 dark:bg-slate-800/50 rounded flex items-center justify-between">
                      <span>Direct Staff Assignment</span>
                      <span className="text-[9.5px] font-normal text-neutral-400">{targetRecruitersList.length} Members</span>
                    </div>
                    {targetRecruitersList
                      .filter((rec: any) => {
                        if (!assignModalSearch.trim()) return true;
                        const q = assignModalSearch.toLowerCase();
                        const name = (rec.fullName || rec.name || "").toLowerCase();
                        const email = (rec.email || "").toLowerCase();
                        const role = getUserRoleLabel(rec, assignModalTargetBranch?.id).toLowerCase();
                        return name.includes(q) || email.includes(q) || role.includes(q);
                      })
                      .map((rec: any) => {
                        const name = rec.fullName || rec.name || "User";
                        const roleLabel = getUserRoleLabel(rec, assignModalTargetBranch?.id);
                        const isSelected = assignModalSelectedId === `rec:${rec.id}`;
                        return (
                          <div
                            key={`rec:${rec.id}`}
                            onClick={() => setAssignModalSelectedId(`rec:${rec.id}`)}
                            className={cn(
                              "px-3 py-2 rounded-md cursor-pointer border transition-all flex items-center justify-between gap-3 text-xs",
                              isSelected
                                ? "bg-slate-100 dark:bg-slate-800/80 border-slate-400 dark:border-slate-600 text-slate-900 dark:text-slate-100 shadow-2xs"
                                : "bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800/60"
                            )}
                          >
                            <div className="flex flex-col text-left min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-neutral-900 dark:text-white truncate">
                                  {name}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                                  [{roleLabel}]
                                </span>
                              </div>
                              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-normal mt-0.5 truncate">
                                {rec.email}
                              </span>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-slate-800 dark:text-slate-200 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Bottom Comment Input */}
              <div className="pt-2 border-t border-neutral-200 dark:border-slate-800">
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1 block">
                  Assignment Note / Comment (Optional)
                </label>
                <textarea
                  placeholder="Add an internal note or reason for assignment change..."
                  value={assignModalComment}
                  onChange={(e) => setAssignModalComment(e.target.value)}
                  className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:border-indigo-500 h-14 resize-none"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3 bg-neutral-50 dark:bg-slate-800/80 border-t border-neutral-200 dark:border-slate-700">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssignModalJob(null)}
                className="h-8 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAssignSave}
                className="h-8 px-5 bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary/90 cursor-pointer"
              >
                Save Assignment
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Source CV Modal */}
      {sourceModalOpen && selectedJobForSourcing && (
        <AddCandidateModal
          isOpen={sourceModalOpen}
          onClose={() => {
            setSourceModalOpen(false);
            setSelectedJobForSourcing(null);
            if (typeof document !== "undefined") {
              setTimeout(() => {
                document.body.style.pointerEvents = "";
                document.body.style.overflow = "";
              }, 50);
            }
          }}
          job={selectedJobForSourcing}
        />
      )}

      {/* ── APPROVE JOB CONFIRMATION MODAL ───────────────────────── */}
      {approveModalJob && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={(e) => { e.stopPropagation(); setApproveModalJob(null); }}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                    Approve & Activate Job Requisition
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Verify requirement details before activating for recruiters
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApproveModalJob(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Compact Job Info Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg p-3.5 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">
                        {approveModalJob.jobCode}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        Pending Approval
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        🔥 {approveModalJob.priority || "Warm"}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {approveModalJob.jobTitle}
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Client / End Client</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {approveModalJob.client} {approveModalJob.endClientName && approveModalJob.endClientName !== approveModalJob.client ? `(${approveModalJob.endClientName})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Location & Work Mode</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {approveModalJob.location || "Remote"}{approveModalJob.states ? `, ${approveModalJob.states}` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Client Bill Rate / CTC</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {approveModalJob.clientBillRate || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Pay Rate / Salary</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {approveModalJob.payRate || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Job Created By</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {approveModalJob.createdBy || "Account Manager"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Assigned Pod / Recruiter</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {approveModalJob.podName || approveModalJob.assignedTo || "Unassigned"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Approval Remarks Dropdown & Custom Note */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Approval Remarks / Sign-off Template
                </label>
                <select
                  value={approvePreset}
                  onChange={(e) => setApprovePreset(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-neutral-900 dark:text-neutral-100 font-medium cursor-pointer"
                >
                  {APPROVE_REMARK_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                    {approvePreset === "Custom Note / Instructions..." ? "Custom Remarks *" : "Additional Reviewer Notes (Optional)"}
                  </label>
                  <textarea
                    rows={2}
                    value={approveRemark}
                    onChange={(e) => setApproveRemark(e.target.value)}
                    placeholder={approvePreset === "Custom Note / Instructions..." ? "Enter specific reviewer instructions or approval notes..." : "Optional internal notes for recruiters / AM..."}
                    className="w-full p-2 bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-neutral-900 dark:text-neutral-100 resize-none transition-all placeholder:text-neutral-400"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 bg-neutral-50 dark:bg-slate-900/60 border-t border-neutral-200 dark:border-slate-800 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApproveModalJob(null)}
                disabled={isApproving}
                className="text-xs font-medium cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isApproving || (approvePreset === "Custom Note / Instructions..." && !approveRemark.trim())}
                onClick={handleConfirmApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                {isApproving ? "Activating..." : "Confirm & Activate Job"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECT JOB CONFIRMATION MODAL ────────────────────────── */}
      {rejectModalJob && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={(e) => { e.stopPropagation(); setRejectModalJob(null); }}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-rose-50/70 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/40">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                    Reject Job Requirement
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Provide reason and feedback for the Account Manager to revise
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectModalJob(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Compact Job Info Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg p-3.5 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">
                        {rejectModalJob.jobCode}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        Pending Approval
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        🔥 {rejectModalJob.priority || "Warm"}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {rejectModalJob.jobTitle}
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Client / End Client</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {rejectModalJob.client} {rejectModalJob.endClientName && rejectModalJob.endClientName !== rejectModalJob.client ? `(${rejectModalJob.endClientName})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Location & Work Mode</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {rejectModalJob.location || "Remote"}{rejectModalJob.states ? `, ${rejectModalJob.states}` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Client Bill Rate / CTC</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {rejectModalJob.clientBillRate || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Pay Rate / Salary</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {rejectModalJob.payRate || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Job Created By</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {rejectModalJob.createdBy || "Account Manager"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Assigned Pod / Recruiter</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {rejectModalJob.podName || rejectModalJob.assignedTo || "Unassigned"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rejection Category Dropdown & Custom Feedback */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Reason for Rejection / Issue Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={rejectCategory}
                  onChange={(e) => setRejectCategory(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-neutral-900 dark:text-neutral-100 font-medium cursor-pointer"
                >
                  {REJECT_REASON_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                    {rejectCategory === "Custom Reason / Feedback..." ? "Detailed Rejection Reason *" : "Detailed Reviewer Remarks / Feedback (Optional)"}
                  </label>
                  <textarea
                    autoFocus={rejectCategory === "Custom Reason / Feedback..."}
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Please revise the CTC ceiling to 14 LPA as market rate for this experience is higher, and clarify visa/notice period requirements..."
                    className="w-full p-2.5 bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-neutral-900 dark:text-neutral-100 resize-none transition-all placeholder:text-neutral-400"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg text-[10.5px] text-neutral-600 dark:text-neutral-300">
                This requirement will be moved to <span className="font-semibold text-rose-600 dark:text-rose-400">Draft</span> and returned to <span className="font-semibold text-neutral-800 dark:text-neutral-200">{rejectModalJob.createdBy || "the creator"}</span> with your feedback.
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 bg-neutral-50 dark:bg-slate-900/60 border-t border-neutral-200 dark:border-slate-800 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalJob(null)}
                disabled={isRejecting}
                className="text-xs font-medium cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isRejecting || (rejectCategory === "Custom Reason / Feedback..." && !rejectReason.trim())}
                onClick={handleConfirmReject}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                {isRejecting ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      <AddClientModal
        open={addClientModalOpen}
        onOpenChange={setAddClientModalOpen}
        initialClientName={clientSearchText.trim()}
        onClientAdded={(newClientName) => {
          if (editingCell?.rowId && onUpdateJob) {
            onUpdateJob(editingCell.rowId, { client: newClientName });
          }
          fetchClientsList();
          handleCellCancel();
          toast.success(`Client "${newClientName}" added and assigned!`);
        }}
      />
    </div>
  );
}
