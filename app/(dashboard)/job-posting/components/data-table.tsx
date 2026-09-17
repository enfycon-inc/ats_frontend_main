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
  X,
  Loader2,
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
  Shield,
  Crown,
  Briefcase,
  Lock,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { atsApi } from "@/lib/ats-api";
import { Job } from "../data/mock-jobs";
import AddCandidateModal from "@/components/dashboard/AddCandidateModal";
import { AddClientModal } from "./add-client-modal";
import { DelegateJobModal } from "@/components/shared/delegate-job-modal";

export function getAssignedPersonDisplay(job: Job): {
  label: string;
  type: "all" | "pod" | "recruiter" | "unassigned" | "both";
  names?: string[];
  count?: number;
  isUnassigned?: boolean;
  pods?: {
    names: string[];
    count: number;
    label: string;
  } | null;
  recruiters?: {
    names: string[];
    count: number;
    label: string;
  } | null;
} {
  const rawAssigned = (job.assignedTo || "").trim();
  const rawUpper = rawAssigned.toUpperCase();

  // 1. Check if assigned to ALL branch recruiters
  if (rawUpper === "ALL" || rawUpper.startsWith("ALL ") || rawUpper === "ALL RECRUITERS") {
    return { label: "All recruiters", type: "all", count: 0, isUnassigned: false };
  }

  // 2. Extract Pods info
  let podsInfo: { names: string[]; count: number; label: string } | null = null;
  const isPodAssigned =
    (job.podName && job.podName !== "N/A" && job.podName.toLowerCase() !== "unassigned") ||
    (job.podId && job.podId !== "none" && job.podId !== "off");

  if (isPodAssigned) {
    const podStr = (job.podName && job.podName !== "N/A" && job.podName.toLowerCase() !== "unassigned" ? job.podName : "") || "";
    if (podStr) {
      const names = podStr.split(",").map((s) => s.trim()).filter(Boolean);
      if (names.length > 0) {
        podsInfo = {
          names,
          count: names.length,
          label: names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0],
        };
      }
    } else if (job.podId && job.podId !== "none") {
      podsInfo = {
        names: ["Recruitment Pod"],
        count: 1,
        label: "Recruitment Pod",
      };
    }
  }

  // 3. Extract Recruiters info
  let recruitersInfo: { names: string[]; count: number; label: string } | null = null;
  const podNamesLower = podsInfo ? podsInfo.names.map((n) => n.toLowerCase()) : [];

  if (rawAssigned && rawUpper !== "N/A" && rawUpper !== "UNASSIGNED" && rawUpper !== "NONE") {
    const assignedTokens = rawAssigned.split(",").map((s) => s.trim()).filter(Boolean);
    const nonPodRecruiterNames = assignedTokens.filter(
      (t) => !podNamesLower.includes(t.toLowerCase())
    );

    if (nonPodRecruiterNames.length > 0) {
      recruitersInfo = {
        names: nonPodRecruiterNames,
        count: nonPodRecruiterNames.length,
        label: nonPodRecruiterNames.length > 1 ? `${nonPodRecruiterNames[0]} +${nonPodRecruiterNames.length - 1}` : nonPodRecruiterNames[0],
      };
    }
  }

  if (!recruitersInfo && job.primaryRecruiter && job.primaryRecruiter !== "N/A" && job.primaryRecruiter.toLowerCase() !== "unassigned") {
    if (!podNamesLower.includes(job.primaryRecruiter.toLowerCase())) {
      recruitersInfo = {
        names: [job.primaryRecruiter],
        count: 1,
        label: job.primaryRecruiter,
      };
    }
  }

  // Combine outcomes:
  if (podsInfo && recruitersInfo) {
    return {
      label: `${podsInfo.label} • ${recruitersInfo.label}`,
      type: "both",
      pods: podsInfo,
      recruiters: recruitersInfo,
      count: podsInfo.count + recruitersInfo.count,
      isUnassigned: false,
    };
  }

  if (podsInfo) {
    return {
      label: podsInfo.label,
      type: "pod",
      names: podsInfo.names,
      count: podsInfo.count,
      pods: podsInfo,
      isUnassigned: false,
    };
  }

  if (recruitersInfo) {
    return {
      label: recruitersInfo.label,
      type: "recruiter",
      names: recruitersInfo.names,
      count: recruitersInfo.count,
      recruiters: recruitersInfo,
      isUnassigned: false,
    };
  }

  return { label: "Unassigned", type: "unassigned", count: 0, isUnassigned: true };
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

  // Must be Active
  const status = String(job.jobStatus || (job as any).status || "").toLowerCase();
  if (status !== "active") return false;

  // 1. Check agingDays if available (must be <= 1 day)
  if (typeof job.agingDays === "number" && !isNaN(job.agingDays)) {
    if (job.agingDays <= 1) return true;
    if (job.agingDays > 1) return false;
  }

  // 2. Check createdOn or createdAt date string (within 1 day / 24 hours)
  const dateStr = (job as any).createdAt || job.createdOn;
  if (dateStr) {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const diffHours = (Date.now() - d.getTime()) / (1000 * 60 * 60);
        if (diffHours >= 0 && diffHours <= 24) return true;

        // Also check if created yesterday / today within 36h timezone buffer
        const now = new Date();
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
        if (d.getTime() >= startOfYesterday && diffHours <= 36) return true;

        return false;
      }
    } catch {}
  }

  // 3. Fallback: check jobCode date segment if matches (e.g. BBS-260910-D00003)
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
          if (diffDays <= 1) return true;
          return false;
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
  savedViews?: string[];
  activeView?: string;
  defaultViewLabel?: string;
  onSelectView?: (viewName: string) => void;
  onUpdateJob?: (jobId: string, updatedFields: Partial<Job>) => void;
  onReorderColumns?: (newColumns: string[]) => void;
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
  onUpdateJob,
  onReorderColumns,
}: DataTableProps) {
  const router = useRouter();

  // User details & permission controls
  const [currentUser, setCurrentUser] = useState(() => atsApi.auth.getCurrentUser());
  const [activeBranchId, setActiveBranchId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null);

  useEffect(() => {
    let disposed = false;
    const refreshAccess = () => {
      setActiveBranchId(localStorage.getItem("active_branch_id"));
      atsApi.auth.me().then((profile) => {
        if (!disposed) setCurrentUser(profile);
      }).catch(() => {});
    };
    refreshAccess();
    window.addEventListener("focus", refreshAccess);
    window.addEventListener("branchChanged", refreshAccess);
    return () => {
      disposed = true;
      window.removeEventListener("focus", refreshAccess);
      window.removeEventListener("branchChanged", refreshAccess);
    };
  }, []);
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


  const hasDelegatePermission = useMemo(() => {
    if (!currentUser) return false;
    const permissions = currentUser.permissions || [];
    return permissions.includes("job:delegate");
  }, [currentUser]);

  // The branch the currently logged-in user is actively operating as
  const currentUserBranchId = activeBranchId && activeBranchId !== "ALL"
    ? activeBranchId : currentUser?.branchId;


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
  
  // Direct Column Drag & Drop Reordering State
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [isDragReordering, setIsDragReordering] = useState(false);

  const handleColDragStart = (e: React.DragEvent, colId: string) => {
    setIsDragReordering(true);
    setDraggedColId(colId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", colId);
  };

  const handleColDragOver = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColId !== targetColId) {
      setDragOverColId(targetColId);
    }
  };

  const handleColDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetColId) {
      setDraggedColId(null);
      setDragOverColId(null);
      setTimeout(() => setIsDragReordering(false), 150);
      return;
    }

    const currentIndex = selectedColumns.indexOf(draggedColId);
    const targetIndex = selectedColumns.indexOf(targetColId);

    if (currentIndex !== -1 && targetIndex !== -1) {
      const newOrder = [...selectedColumns];
      const [removed] = newOrder.splice(currentIndex, 1);
      newOrder.splice(targetIndex, 0, removed);

      if (onReorderColumns) {
        onReorderColumns(newOrder);
      }
    }

    setDraggedColId(null);
    setDragOverColId(null);
    setTimeout(() => setIsDragReordering(false), 150);
  };

  const handleColDragEnd = () => {
    setDraggedColId(null);
    setDragOverColId(null);
    setTimeout(() => setIsDragReordering(false), 150);
  };

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
  const PRIORITY_OPTIONS = ["Hot", "Warm", "Cold"];

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

  const [delegateModalJob, setDelegateModalJob] = useState<Job | null>(null);

  // Assigned To / Primary Recruiter Modal States
  const [assignModalJob, setAssignModalJob] = useState<Job | null>(null);
  const [assignTab, setAssignTab] = useState<"pods" | "users">("pods");
  const [assignSearch, setAssignSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedPodIds, setSelectedPodIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [recruiterFilterMode, setRecruiterFilterMode] = useState<"all" | "podMembers">("all");

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

  // ─── ROLE & PERMISSION SCOPING FOR ASSIGNMENT ─────────────────────────
  const userRoles = useMemo(() => {
    return (currentUser?.roles || []).map((r: string) => r.toUpperCase().replace(/[\s-_]+/g, ""));
  }, [currentUser]);

  const userPerms = useMemo(() => {
    return Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  }, [currentUser]);

  // Higher roles: Tenant Admin, Super Admin, Branch Admin, Delivery Head
  const isSuperOrTenantAdmin = useMemo(() => {
    return (
      currentUser?.systemRole === "TENANT_ADMIN" ||
      currentUser?.systemRole === "SUPER_ADMIN" ||
      userRoles.includes("TENANTADMIN") ||
      userRoles.includes("SUPERADMIN") ||
      userPerms.includes("tenant:manage") ||
      userPerms.includes("tenant:settings")
    );
  }, [currentUser, userRoles, userPerms]);

  const isBranchAdmin = useMemo(() => {
    return (
      userRoles.includes("BRANCHADMIN") ||
      userPerms.includes("branch_admin:manage") ||
      userPerms.includes("branch:assign_user")
    );
  }, [userRoles, userPerms]);

  const isDeliveryHead = useMemo(() => {
    return userRoles.includes("DELIVERYHEAD") || userRoles.includes("DELIVERY_HEAD");
  }, [userRoles]);

  const isHigherRole = isSuperOrTenantAdmin || isBranchAdmin || isDeliveryHead;

  // Account Manager role
  const isAccountManager = useMemo(() => {
    return (
      userRoles.includes("ACCOUNTMANAGER") ||
      userRoles.includes("ACCOUNT_MANAGER") ||
      userRoles.includes("AM")
    );
  }, [userRoles]);

  // Pod Head role & active pod detection
  const myPod = useMemo(() => {
    if (!currentUser) return null;
    const uid = currentUser.id || (currentUser as any).dbId;
    const email = (currentUser.email || "").toLowerCase();
    return (
      podsList.find(
        (p: any) =>
          p.podHeadId === uid ||
          (p.podHeadEmail && p.podHeadEmail.toLowerCase() === email) ||
          p.id === currentUser.podId ||
          p.id === (currentUser as any).pod_id
      ) || null
    );
  }, [podsList, currentUser]);

  const isPodHead = useMemo(() => {
    if (isHigherRole) return false;
    if (
      userRoles.includes("PODHEAD") ||
      userRoles.includes("POD_HEAD") ||
      userRoles.includes("PODLEAD") ||
      userRoles.includes("POD_LEAD")
    ) {
      return true;
    }
    const uid = currentUser?.id || (currentUser as any)?.dbId;
    const email = (currentUser?.email || "").toLowerCase();
    return podsList.some(
      (p: any) => p.podHeadId === uid || (p.podHeadEmail && p.podHeadEmail.toLowerCase() === email)
    );
  }, [isHigherRole, userRoles, currentUser, podsList]);

  // ─── BRANCH POLICY ENFORCEMENT ─────────────────────────────────────────
  const branchAllowsPods = useMemo(() => {
    if (!assignModalTargetBranch) return true;
    const allowNone = Boolean(assignModalTargetBranch.allowNone ?? assignModalTargetBranch.allow_none);
    if (allowNone) return false; // allowNone = Direct Assignment Only
    const allowPods = (assignModalTargetBranch.allowPods ?? assignModalTargetBranch.allow_pods) !== false;
    return allowPods;
  }, [assignModalTargetBranch]);

  const branchAllowsDirectStaff = useMemo(() => {
    if (!assignModalTargetBranch) return true;
    const allowDirect = assignModalTargetBranch.allowDirect ?? assignModalTargetBranch.allow_direct;
    if (allowDirect === false) return false;
    const allowDirectStaff = assignModalTargetBranch.allowDirectStaff ?? assignModalTargetBranch.allow_direct_staff;
    if (allowDirectStaff === false) return false;
    return true;
  }, [assignModalTargetBranch]);

  // ─── SCOPED PODS & USERS (Role Scoping) ─────────────────────────────────
  const targetBranchPods = useMemo(() => {
    const bId = assignModalTargetBranch?.id;
    let list = podsList;
    if (bId && bId !== "all") {
      const filtered = podsList.filter(
        (p: any) => !p.branchId || !p.branch_id || p.branchId === bId || p.branch_id === bId
      );
      list = filtered.length > 0 ? filtered : podsList;
    }

    // Role Scoping: If user is Pod Head (and not higher role), ONLY show their own pod!
    if (isPodHead && myPod) {
      return [myPod];
    }
    return list;
  }, [podsList, assignModalTargetBranch, isPodHead, myPod]);

  const branchRecruiterUsers = useMemo(() => {
    const bId = assignModalTargetBranch?.id;
    let list = usersList.filter((u: any) => u.isActive !== false && u.is_active !== false);

    // Filter to only users who act as Recruiters (RECRUITER, POD_LEAD, DELIVERY_HEAD)
    list = list.filter((u: any) => {
      const rawSystemRole = u.systemRole || u.system_role;
      if (rawSystemRole && ['RECRUITER', 'POD_LEAD', 'DELIVERY_HEAD'].includes(rawSystemRole.toUpperCase())) {
         return true;
      }
      const userRoles = u.roles || [];
      const userSysRoles = userRoles.map((r: string) => {
        const match = rolesList.find((cr: any) => cr.name === r || cr.id === r);
        return match?.systemRole || r;
      });
      return userSysRoles.some((sr: any) => {
         const upper = typeof sr === 'string' ? sr.toUpperCase() : '';
         return ['RECRUITER', 'POD_LEAD', 'DELIVERY_HEAD'].includes(upper);
      });
    });

    // Co-source scoping: if the job is shared (co-sourced) and the current user's branch is NOT
    // the job owner, restrict recruiter list to only the user's own branch — shared branches
    // should not see recruiters from the owner or other shared branches.
    const isCoSourcedJob = assignModalJob?.isCoSourced || (assignModalJob?.sharedBranchIds && assignModalJob.sharedBranchIds.length > 0);
    const isSharedBranchViewing = isCoSourcedJob && assignModalJob?.branchId !== currentUserBranchId;

    if (isSharedBranchViewing && currentUserBranchId) {
      list = list.filter((u: any) => {
        const userBranchId = u.branchId || u.branch_id;
        if (userBranchId === currentUserBranchId) return true;
        const assignedBranches = Array.isArray(u.assignedBranchIds)
          ? u.assignedBranchIds
          : Array.isArray(u.assigned_branch_ids)
          ? u.assigned_branch_ids
          : [];
        return assignedBranches.includes(currentUserBranchId);
      });
    } else if (bId && bId !== "all") {
      const scoped = list.filter((u: any) => {
        const userBranchId = u.branchId || u.branch_id;
        if (userBranchId === bId) return true;
        const assignedBranches = Array.isArray(u.assignedBranchIds)
          ? u.assignedBranchIds
          : Array.isArray(u.assigned_branch_ids)
          ? u.assigned_branch_ids
          : [];
        if (assignedBranches.includes(bId)) return true;
        return false;
      });
      if (scoped.length > 0) list = scoped;
    }

    // Role Scoping: If user is Pod Head (and not higher role), ONLY show recruiters in their own pod!
    if (isPodHead && myPod) {
      const myPodId = myPod.id;
      const myPodMemberIds = new Set(
        (myPod.users || myPod.members || []).map((m: any) => m.id || m.userId).filter(Boolean)
      );
      return list.filter(
        (u: any) =>
          u.podId === myPodId ||
          u.pod_id === myPodId ||
          myPodMemberIds.has(u.id) ||
          u.id === myPod.podHeadId
      );
    }

    return list;
  }, [usersList, assignModalTargetBranch, assignModalJob, currentUserBranchId, isPodHead, myPod]);


  const filteredPods = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return targetBranchPods;
    return targetBranchPods.filter((p: any) => {
      const name = (p.name || "").toLowerCase();
      const head = (p.podHeadName || "").toLowerCase();
      return name.includes(q) || head.includes(q);
    });
  }, [targetBranchPods, assignSearch]);

  const isUserInSelectedPods = useCallback((userId: string, userPodId?: string) => {
    if (selectedPodIds.length === 0) return false;
    if (userPodId && selectedPodIds.includes(userPodId)) return true;
    for (const pid of selectedPodIds) {
      const pod = targetBranchPods.find((p: any) => p.id === pid) || (podsList || []).find((p: any) => p.id === pid);
      if (pod) {
        if (pod.podHeadId === userId) return true;
        if (Array.isArray(pod.members) && pod.members.some((m: any) => (m.id || m.userId) === userId)) return true;
        if (Array.isArray(pod.users) && pod.users.some((m: any) => (m.id || m.userId) === userId)) return true;
      }
    }
    return false;
  }, [selectedPodIds, targetBranchPods, podsList]);

  const filteredUsers = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    let list = branchRecruiterUsers;
    if (selectedPodIds.length > 0 && recruiterFilterMode === "podMembers") {
      list = list.filter((u: any) => isUserInSelectedPods(u.id, u.podId || u.pod_id));
    }
    if (!q) return list;
    return list.filter((u: any) => {
      const name = (u.fullName || u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = getUserRoleLabel(u, assignModalTargetBranch?.id).toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [branchRecruiterUsers, assignSearch, getUserRoleLabel, assignModalTargetBranch, selectedPodIds, recruiterFilterMode, isUserInSelectedPods]);

  const selectedPodMembersCount = useMemo(() => {
    return branchRecruiterUsers.filter((u: any) => isUserInSelectedPods(u.id, u.podId || u.pod_id)).length;
  }, [branchRecruiterUsers, isUserInSelectedPods]);

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

  const openAssignModal = (job: Job, _type: "assignedTo" | "primaryRecruiter" = "assignedTo") => {
    setAssignModalJob(job);
    setAssignSearch("");
    setIsAssigning(false);
    setRecruiterFilterMode("all");

    // Initial selected pod IDs
    const initialPodIds: string[] = [];
    if (job.podId && job.podId !== "none" && job.podId !== "off") {
      const pIds = job.podId.split(",").map((s) => s.trim()).filter(Boolean);
      initialPodIds.push(...pIds);
    }
    const podStr = (job.podName && job.podName !== "N/A" && job.podName.toLowerCase() !== "unassigned") ? job.podName : "";
    if (podStr) {
      const podNames = podStr.split(",").map((s) => s.trim().toLowerCase());
      for (const p of targetBranchPods) {
        const pName = (p.name || "").toLowerCase();
        if (podNames.includes(pName) && !initialPodIds.includes(p.id)) {
          initialPodIds.push(p.id);
        }
      }
    }
    setSelectedPodIds(initialPodIds);

    // Initial selected user IDs (recruiters)
    const initialSelected: string[] = [];
    if (job.primaryRecruiterId) {
      initialSelected.push(job.primaryRecruiterId);
    }

    if (
      job.assignedTo &&
      job.assignedTo !== "Unassigned" &&
      !job.assignedTo.toUpperCase().startsWith("ALL")
    ) {
      const names = job.assignedTo.split(",").map((s) => s.trim().toLowerCase());
      for (const u of usersList) {
        const uName = (u.fullName || u.name || "").toLowerCase();
        if (names.includes(uName) && !initialSelected.includes(u.id)) {
          initialSelected.push(u.id);
        }
      }
    }
    setSelectedUserIds(initialSelected);

    // Auto-select tab based on branch policy and current assignment
    if (!branchAllowsPods) {
      setAssignTab("users");
    } else if (!branchAllowsDirectStaff) {
      setAssignTab("pods");
    } else if (initialPodIds.length > 0) {
      setAssignTab("pods");
    } else if (initialSelected.length > 0) {
      setAssignTab("users");
    } else {
      setAssignTab(targetBranchPods.length > 0 ? "pods" : "users");
    }
  };

  const handleTogglePodSelection = (podId: string) => {
    setSelectedPodIds((prev) =>
      prev.includes(podId) ? prev.filter((id) => id !== podId) : [...prev, podId]
    );
  };

  const handleSelectAllFilteredPods = () => {
    const filteredIds = filteredPods.map((p: any) => p.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id: string) => selectedPodIds.includes(id));
    if (allSelected) {
      setSelectedPodIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedPodIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredUsers.map((u: any) => u.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id: string) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSaveCombinedAssignment = async (override?: {
    unassignAll?: boolean;
  }) => {
    if (!assignModalJob) return;
    setIsAssigning(true);
    try {
      const payload: Record<string, any> = {};

      if (override?.unassignAll) {
        payload.podId = "none";
        payload.podIds = [];
        payload.podName = "N/A";
        payload.assignedTo = "Unassigned";
        payload.primaryRecruiter = "N/A";
        payload.primaryRecruiterId = null;
      } else {
        // 1. Pods assignment:
        if (selectedPodIds.length > 0) {
          const allPods = [...podsList, ...targetBranchPods];
          const selectedPods = selectedPodIds.map((id) => allPods.find((p: any) => p.id === id)).filter(Boolean);
          const podNames = Array.from(new Set(selectedPods.map((p: any) => p.name || "Pod")));
          payload.podId = selectedPodIds[0];
          payload.podIds = selectedPodIds;
          payload.podName = podNames.join(", ");
        } else {
          payload.podId = "none";
          payload.podIds = [];
          payload.podName = "N/A";
        }

        // 2. Recruiters assignment:
        if (selectedUserIds.length > 0) {
          const selectedUsers = usersList.filter((u) => selectedUserIds.includes(u.id));
          const recruiterNames = selectedUsers.map((u) => u.fullName || u.name || u.email);
          payload.assignedTo = recruiterNames.join(", ");
          payload.primaryRecruiterId = selectedUserIds[0];
          payload.primaryRecruiter = selectedUsers[0]?.fullName || selectedUsers[0]?.name || recruiterNames[0];
        } else {
          payload.assignedTo = "Unassigned";
          payload.primaryRecruiter = "N/A";
          payload.primaryRecruiterId = null;
        }
      }

      await atsApi.jobs.update(assignModalJob.id, payload);

      if (onUpdateJob) {
        onUpdateJob(assignModalJob.id, {
          podId: payload.podId,
          podName: payload.podName,
          assignedTo: payload.assignedTo,
          primaryRecruiter: payload.primaryRecruiter,
          primaryRecruiterId: payload.primaryRecruiterId,
        } as any);
      }
      if (onRefresh) {
        onRefresh();
      }

      const summaryParts: string[] = [];
      if (selectedPodIds.length > 0 && !override?.unassignAll) {
        summaryParts.push(`${selectedPodIds.length} Pod${selectedPodIds.length > 1 ? "s" : ""}`);
      }
      if (selectedUserIds.length > 0 && !override?.unassignAll) {
        summaryParts.push(`${selectedUserIds.length} Recruiter${selectedUserIds.length > 1 ? "s" : ""}`);
      }

      if (override?.unassignAll || summaryParts.length === 0) {
        toast.success("Job marked as Unassigned.");
      } else {
        toast.success(`Job successfully assigned to ${summaryParts.join(" & ")}.`);
      }

      setAssignModalJob(null);
    } catch (err: any) {
      console.error("[DataTable] Failed to update job assignment:", err);
      toast.error(err?.message || "Failed to update job assignment");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleExecuteAssignment = async (
    type: "pod" | "pods" | "users" | "unassign",
    _targetIdOrIds?: string | string[],
    _targetName?: string
  ) => {
    if (type === "unassign") {
      return handleSaveCombinedAssignment({ unassignAll: true });
    }
    return handleSaveCombinedAssignment();
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
          {/* Bulk Actions */}
          {selectedRowIds.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-sm">
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
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-1.5">

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
                const isDraggingThis = draggedColId === colId;
                const isOverThis = dragOverColId === colId;
                return (
                  <th
                    key={colId}
                    draggable
                    onDragStart={(e) => handleColDragStart(e, colId)}
                    onDragOver={(e) => handleColDragOver(e, colId)}
                    onDrop={(e) => handleColDrop(e, colId)}
                    onDragEnd={handleColDragEnd}
                    className={cn(
                      "px-4 py-3.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100/95 dark:bg-slate-900 border-r border-b border-neutral-200 dark:border-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-grab active:cursor-grabbing relative whitespace-nowrap select-none",
                      isDraggingThis && "opacity-30 bg-slate-200/60 dark:bg-slate-800/60",
                      isOverThis && "border-l-4 border-l-[#1a4fa0] bg-blue-100/60 dark:bg-blue-950/60"
                    )}
                    onClick={() => {
                      if (isDragReordering) return;
                      handleSort(colId as keyof Job);
                    }}
                    title="Drag to reorder column, or click to sort"
                  >
                    <div className="flex items-center justify-between gap-1 pr-2 pointer-events-none">
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
                                  : job.priority === "Cold" || job.priority === "Low"
                                  ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800/40"
                                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40"
                              )}
                            >
                              {job.priority === "Hot" || job.priority === "High" || job.priority === "Urgent" ? "Hot" : job.priority === "Cold" || job.priority === "Low" ? "Cold" : "Warm"}
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
                              const isRecent = isJobRecent(job);
                              // Only show NEW badge if active and posted within 1 day; otherwise no status chip here (JOB STATUS column already displays status)
                              const statusLabel = isRecent ? "NEW" : null;
                              const statusClasses = "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40";
                              const isCoSourced = (job as any).isCoSourced || ((job as any).sharedBranchIds && (job as any).sharedBranchIds.length > 0);

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
                                  {isCoSourced && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border select-none leading-none shrink-0 bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800">
                                      Co-Sourced
                                    </span>
                                  )}
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
                            <div className="flex items-center justify-between gap-1.5 w-full min-w-0 py-0.5">
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

                                if (assignInfo.isUnassigned || assignInfo.type === "unassigned") {
                                  return (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-normal text-neutral-400 dark:text-neutral-500 italic shrink-0">
                                      Unassigned
                                    </span>
                                  );
                                }

                                return (
                                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    {/* 1. Pod Badge */}
                                    {assignInfo.pods && (
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span
                                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 shrink-0 max-w-[155px]"
                                          title={`Assigned Pod${assignInfo.pods.count > 1 ? "s" : ""}: ${assignInfo.pods.names.join(", ")}`}
                                        >
                                          <Icon icon="heroicons:squares-plus" className="h-3 w-3 shrink-0 text-purple-600 dark:text-purple-400" />
                                          <span className="truncate">{assignInfo.pods.label}</span>
                                          {assignInfo.pods.count > 1 && (
                                            <span className="ml-0.5 px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 text-[9px] font-bold">
                                              +{assignInfo.pods.count - 1}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )}

                                    {/* 2. Recruiter Chips */}
                                    {assignInfo.recruiters && (
                                      <div className="flex items-center gap-1 flex-wrap min-w-0" title={`Assigned Recruiter(s): ${assignInfo.recruiters.names.join(", ")}`}>
                                        {assignInfo.recruiters.names.slice(0, 2).map((name, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800 shrink-0 max-w-[85px] truncate"
                                          >
                                            {name}
                                          </span>
                                        ))}
                                        {assignInfo.recruiters.count > 2 && (
                                          <span
                                            className="inline-flex items-center px-1 py-0.2 rounded text-[9.5px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0"
                                            title={assignInfo.recruiters.names.slice(2).join(", ")}
                                          >
                                            +{assignInfo.recruiters.count - 2}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                              {hasEditPermission && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openAssignModal(job, "assignedTo"); }}
                                  className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 rounded transition-colors cursor-pointer shrink-0 ml-auto"
                                  title="Assign Pod / Recruiters (+)"
                                >
                                  <Plus className="h-3.5 w-3.5" />
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
                            {(hasEditPermission || hasCreatePermission || (hasDelegatePermission && job.branchId === currentUserBranchId)) && (
                              <>
                                {job.jobStatus !== "Draft" && <DropdownMenuSeparator className="my-1 border-neutral-100 dark:border-slate-800" />}

                                <div className="space-y-0.5">
                                  <div className="px-2.5 pt-1 pb-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    Job Actions
                                  </div>

                                  {hasEditPermission && (job.jobStatus === "Pending Approval" || job.approvalStatus === "PENDING_APPROVAL") && (
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

                                  {hasEditPermission && job.jobStatus === "Draft" && (
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

                                  {hasEditPermission && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => router.push(`/job-posting/${job.id}/edit`)}
                                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                      >
                                        <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 shadow-2xs">
                                          <Pencil className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="font-semibold">Edit Job</span>
                                      </DropdownMenuItem>
                                    </>
                                  )}

                                  {hasDelegatePermission && job.branchId === currentUserBranchId && (
                                    <DropdownMenuItem
                                      onClick={() => setDelegateModalJob(job)}
                                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                                    >
                                      <div className="h-6 w-6 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
                                        <Icon icon="heroicons:share" className="h-3.5 w-3.5" />
                                      </div>
                                      <span className="font-semibold">Delegate Job</span>
                                    </DropdownMenuItem>
                                  )}

                                  {hasCreatePermission && (
                                      <DropdownMenuItem
                                        onClick={() => router.push(`/job-posting/new?cloneFrom=${job.id}`)}
                                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                                      >
                                        <div className="h-6 w-6 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                                          <Copy className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="font-semibold">Duplicate Job</span>
                                      </DropdownMenuItem>
                                  )}

                                  {hasEditPermission && (
                                    <>
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
                                    </>
                                  )}

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
                    onSaveView?.(newViewName);
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

            {hasDelegatePermission && data.find(j => j.id === contextMenu.jobId)?.branchId === currentUserBranchId && (
              <button
                onClick={() => {
                  const job = data.find((j) => j.id === contextMenu.jobId);
                  if (job) setDelegateModalJob(job);
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer font-semibold"
              >
                <div className="h-6 w-6 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <Icon icon="heroicons:share" className="h-3.5 w-3.5" />
                </div>
                <span>Delegate Job</span>
              </button>
            )}

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

                <button
                  onClick={() => {
                    const job = data.find((j) => j.id === contextMenu.jobId);
                    if (job) openAssignModal(job, "assignedTo");
                    closeContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer font-semibold"
                >
                  <div className="h-6 w-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span>Assign Recruiters / Pods</span>
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

      {/* Assign Recruiters Modal Dialog */}
      <Dialog open={!!assignModalJob} onOpenChange={(open) => !open && setAssignModalJob(null)}>
        <DialogContent className="sm:max-w-lg md:max-w-[540px] w-full p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <DialogHeader className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0 border border-blue-100 dark:border-blue-900/50">
                <Icon icon="heroicons:user-group" className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Assign Recruiters
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Assign requirement to pods or individual recruiters
                </DialogDescription>
              </div>
            </div>

            {/* Selected Job Info Banner */}
            {assignModalJob && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50/90 dark:bg-slate-850/70 border border-slate-200/80 dark:border-slate-750 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[280px]" title={assignModalJob.jobTitle || (assignModalJob as any).title}>
                      {assignModalJob.jobTitle || (assignModalJob as any).title}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 font-semibold border border-rose-100 dark:border-rose-900/40">
                      {assignModalJob.jobCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Client: <span className="font-medium text-slate-700 dark:text-slate-300">{assignModalJob.client || (assignModalJob as any).clientName || assignModalJob.endClientName || "Direct"}</span>
                    {assignModalTargetBranch?.name ? ` • Branch: ${assignModalTargetBranch.name}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9.5px] uppercase font-semibold tracking-wider text-slate-400 block mb-0.5">Currently Assigned</span>
                  {(() => {
                    const curInfo = getAssignedPersonDisplay(assignModalJob);
                    if (curInfo.isUnassigned || curInfo.type === "unassigned") {
                      return (
                        <Badge variant="outline" className="text-[10.5px] font-normal px-2 py-0.5 text-neutral-400 dark:text-neutral-500 italic border-slate-200 dark:border-slate-700">
                          Unassigned
                        </Badge>
                      );
                    }
                    return (
                      <div className="flex flex-col items-end gap-1">
                        {curInfo.pods && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/70 max-w-[140px] truncate" title={`Assigned Pods: ${curInfo.pods.names.join(", ")}`}>
                            <Icon icon="heroicons:squares-plus" className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400 shrink-0" />
                            {curInfo.pods.label}
                          </span>
                        )}
                        {curInfo.recruiters && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 max-w-[140px] truncate" title={`Assigned Recruiters: ${curInfo.recruiters.names.join(", ")}`}>
                            <Icon icon="heroicons:user" className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            {curInfo.recruiters.label}
                          </span>
                        )}
                        {curInfo.type === "all" && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
                            All recruiters
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Pod Head Scope Notice (clean, compact) */}
          {isPodHead && (
            <div className="mx-5 mt-2.5 px-3 py-1.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 flex items-center gap-2 text-[11.5px] text-blue-800 dark:text-blue-300">
              <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span><strong>Pod Lead Scope:</strong> Restricted to your pod {myPod ? `(${myPod.name})` : ""} and active members.</span>
            </div>
          )}

          {/* Branch Policy Alert */}
          {!branchAllowsDirectStaff ? (
            <div className="mx-5 mt-2.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-[11.5px] text-amber-800 dark:text-amber-300">
              <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span><strong>Branch Policy Notice:</strong> Direct recruiter assignment is disabled. Requirements must be routed to Recruitment Pods.</span>
            </div>
          ) : !branchAllowsPods ? (
            <div className="mx-5 mt-2.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-[11.5px] text-amber-800 dark:text-amber-300">
              <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span><strong>Branch Policy Notice:</strong> Recruitment Pods are disabled for this branch. Direct recruiter assignments only.</span>
            </div>
          ) : null}

          {/* Tab Selector: Sleek Segmented Pill Navigation */}
          <div className="px-5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 inline-flex items-center gap-1 border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                disabled={!branchAllowsPods}
                onClick={() => {
                  if (branchAllowsPods) {
                    setAssignTab("pods");
                    setAssignSearch("");
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all",
                  !branchAllowsPods
                    ? "opacity-50 cursor-not-allowed text-slate-400"
                    : assignTab === "pods"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/70 dark:border-slate-700 cursor-pointer"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 cursor-pointer"
                )}
              >
                <Icon icon="heroicons:squares-plus" className="h-3.5 w-3.5" />
                Pods
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  assignTab === "pods" ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold" : "bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}>
                  {targetBranchPods.length}
                </span>
                {!branchAllowsPods && <Lock className="h-3 w-3 ml-0.5 text-slate-400" />}
              </button>

              <button
                type="button"
                disabled={!branchAllowsDirectStaff}
                onClick={() => {
                  if (branchAllowsDirectStaff) {
                    setAssignTab("users");
                    setAssignSearch("");
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all",
                  !branchAllowsDirectStaff
                    ? "opacity-50 cursor-not-allowed text-slate-400"
                    : assignTab === "users"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/70 dark:border-slate-700 cursor-pointer"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 cursor-pointer"
                )}
              >
                <Icon icon="heroicons:user" className="h-3.5 w-3.5" />
                Recruiters
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  assignTab === "users" ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold" : "bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}>
                  {branchRecruiterUsers.length}
                </span>
                {!branchAllowsDirectStaff && <Lock className="h-3 w-3 ml-0.5 text-slate-400" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedPodIds.length > 0 && (
                <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200/70 inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  {selectedPodIds.length} Pod{selectedPodIds.length !== 1 ? 's' : ''}
                </span>
              )}
              {selectedUserIds.length > 0 && (
                <span className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {selectedUserIds.length} Recruiters
                </span>
              )}
            </div>
          </div>

          {/* Staged Assignment Ribbon */}
          <div className="mx-5 my-2 p-2 rounded-lg bg-slate-50/80 dark:bg-slate-850/50 border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-indigo-500" />
                <span>Staged Assignment</span>
                {(selectedPodIds.length > 0 || selectedUserIds.length > 0) && (
                  <span className="text-[10.5px] text-slate-400 font-normal">
                    ({selectedPodIds.length} pod{selectedPodIds.length !== 1 ? "s" : ""}, {selectedUserIds.length} recruiter{selectedUserIds.length !== 1 ? "s" : ""})
                  </span>
                )}
              </span>
              {(selectedPodIds.length > 0 || selectedUserIds.length > 0) && (
                <button
                  type="button"
                  onClick={() => { setSelectedPodIds([]); setSelectedUserIds([]); }}
                  className="text-[10px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer font-medium"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 min-h-[24px] max-h-[85px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              {selectedPodIds.length === 0 && selectedUserIds.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">No pods or recruiters selected. Pick from Pods and/or Recruiters tabs below.</span>
              ) : (
                <>
                  {selectedPodIds.map((pId) => {
                    const pod = [...podsList, ...targetBranchPods].find((p: any) => p.id === pId);
                    const name = pod?.name || "Pod";
                    return (
                      <span
                        key={pId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 animate-in fade-in"
                      >
                        <Icon icon="heroicons:squares-plus" className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        <span className="max-w-[130px] truncate">{name}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleTogglePodSelection(pId); }}
                          className="hover:text-purple-900 dark:hover:text-white rounded-full ml-0.5 p-0.5 cursor-pointer"
                          title="Remove pod"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    );
                  })}
                  {selectedUserIds.map((uId) => {
                    const u = usersList.find((usr: any) => usr.id === uId);
                    const name = u?.fullName || u?.name || u?.email || "Recruiter";
                    return (
                      <span
                        key={uId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 animate-in fade-in"
                      >
                        <Icon icon="heroicons:user" className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        <span className="max-w-[120px] truncate">{name}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleToggleUserSelection(uId); }}
                          className="hover:text-blue-900 dark:hover:text-white rounded-full ml-0.5 p-0.5 cursor-pointer"
                          title="Remove recruiter"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Search Box & Multi-Select Toolbar */}
          <div className="px-5 pt-1 space-y-2">
            <div className="relative">
              <Icon icon="heroicons:magnifying-glass" className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder={assignTab === "pods" ? "Search pods by name or lead..." : "Search recruiters by name, role, or email..."}
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="h-8 pl-8.5 text-xs bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-lg"
                autoFocus
              />
            </div>

            {/* Recruiter Tab: Sub-filter toggle (All vs Selected Pod Members Only) */}
            {assignTab === "users" && selectedPodIds.length > 0 && (
              <div className="flex items-center gap-1.5 p-1 rounded-md bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 text-[11px]">
                <span className="text-purple-800 dark:text-purple-300 font-medium px-1">Show:</span>
                <button
                  type="button"
                  onClick={() => setRecruiterFilterMode("all")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10.5px] font-medium transition-all cursor-pointer",
                    recruiterFilterMode === "all"
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  )}
                >
                  All Recruiters ({branchRecruiterUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRecruiterFilterMode("podMembers")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10.5px] font-medium transition-all flex items-center gap-1 cursor-pointer",
                    recruiterFilterMode === "podMembers"
                      ? "bg-purple-600 text-white shadow-xs font-semibold"
                      : "text-purple-700 dark:text-purple-300 hover:bg-purple-100/60 dark:hover:bg-purple-900/40"
                  )}
                >
                  <Icon icon="heroicons:squares-plus" className="h-3 w-3" />
                  Selected Pod Members Only ({selectedPodMembersCount})
                </button>
              </div>
            )}

            {/* Multi-select bar for PODS */}
            {assignTab === "pods" && (
              <div className="flex items-center justify-between text-xs py-1 px-0.5 border-b border-dashed border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSelectAllFilteredPods}
                    className="text-[11.5px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    {filteredPods.length > 0 && filteredPods.every((p: any) => selectedPodIds.includes(p.id))
                      ? "Deselect All Filtered"
                      : `Select All (${filteredPods.length})`}
                  </button>

                  {selectedPodIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedPodIds([])}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                    <strong className="text-purple-600 dark:text-purple-400 font-bold">{selectedPodIds.length}</strong> selected
                  </span>
                  <Button
                    size="sm"
                    disabled={isAssigning || (selectedPodIds.length === 0 && selectedUserIds.length === 0)}
                    onClick={() => handleSaveCombinedAssignment()}
                    className="h-6.5 px-2.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed rounded-md"
                  >
                    {isAssigning ? "Saving..." : selectedUserIds.length > 0 ? `Save (${selectedPodIds.length} Pods + ${selectedUserIds.length} Recruiters)` : `Assign Pods (${selectedPodIds.length})`}
                  </Button>
                </div>
              </div>
            )}

            {/* Multi-select bar for RECRUITERS */}
            {assignTab === "users" && (
              <div className="flex items-center justify-between text-xs py-1 px-0.5 border-b border-dashed border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-[11.5px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    {filteredUsers.length > 0 && filteredUsers.every((u: any) => selectedUserIds.includes(u.id))
                      ? "Deselect All Filtered"
                      : `Select All (${filteredUsers.length})`}
                  </button>

                  {selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedUserIds([])}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                    <strong className="text-blue-600 dark:text-blue-400 font-bold">{selectedUserIds.length}</strong> selected
                  </span>
                  <Button
                    size="sm"
                    disabled={isAssigning || (selectedPodIds.length === 0 && selectedUserIds.length === 0)}
                    onClick={() => handleSaveCombinedAssignment()}
                    className="h-6.5 px-2.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed rounded-md"
                  >
                    {isAssigning ? "Saving..." : selectedPodIds.length > 0 ? `Save (${selectedPodIds.length} Pods + ${selectedUserIds.length} Recruiters)` : `Assign Recruiters (${selectedUserIds.length})`}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Selection List */}
          <div className="px-5 py-2 flex-1 overflow-y-auto max-h-[280px] space-y-1.5">
            {assignTab === "pods" ? (
              filteredPods.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <Icon icon="heroicons:squares-plus" className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300 text-xs">No recruitment pods found.</p>
                  <p className="text-[11px] mt-0.5">You can assign to individual recruiters or create pods in Pods Manager.</p>
                  <Link href="/utility/pods" className="inline-block mt-2.5">
                    <Button size="sm" variant="outline" className="text-xs h-7 text-blue-600 border-blue-200 hover:bg-blue-50">
                      Go to Pods Manager →
                    </Button>
                  </Link>
                </div>
              ) : (
                filteredPods.map((pod: any) => {
                  const isSelected = selectedPodIds.includes(pod.id);
                  const isCurrent =
                    assignModalJob?.podId === pod.id ||
                    assignModalJob?.assignedTo?.toLowerCase() === pod.name?.toLowerCase() ||
                    assignModalJob?.assignedTo?.toLowerCase().includes(pod.name?.toLowerCase()) ||
                    assignModalJob?.podName?.toLowerCase() === pod.name?.toLowerCase() ||
                    assignModalJob?.podName?.toLowerCase().includes(pod.name?.toLowerCase());

                  return (
                    <div
                      key={pod.id}
                      onClick={() => handleTogglePodSelection(pod.id)}
                      className={cn(
                        "p-2.5 sm:px-3 sm:py-2 rounded-lg border flex items-center justify-between gap-3 text-xs transition-all cursor-pointer select-none",
                        isSelected
                          ? "border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 dark:border-purple-600 shadow-2xs ring-1 ring-purple-400/40"
                          : isCurrent
                          ? "border-slate-300 bg-slate-50/70 dark:bg-slate-800/40 dark:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-850"
                          : "border-neutral-200/90 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-850/80"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Checkbox Icon */}
                        <div
                          className={cn(
                            "h-4 w-4 rounded flex items-center justify-center shrink-0 transition-colors border",
                            isSelected
                              ? "bg-purple-600 border-purple-600 text-white shadow-2xs"
                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-transparent hover:border-purple-400"
                          )}
                        >
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>

                        {/* Pod Icon Avatar */}
                        <div className="h-7 w-7 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                          <Icon icon="heroicons:squares-plus" className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                              {pod.name}
                            </span>
                            {isCurrent && (
                              <Badge variant="outline" className="text-[9.5px] font-semibold text-slate-500 border-slate-300 dark:border-slate-600 py-0 h-4 px-1.5">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            Lead: <span className="font-medium text-slate-700 dark:text-slate-300">{pod.podHeadName || "Unassigned"}</span>
                            {pod.members && pod.members.length > 0 && (
                              <span> • {pod.members.length} Member{pod.members.length !== 1 ? 's' : ''}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="text-[10.5px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 shrink-0">
                          Selected
                        </span>
                      )}
                    </div>
                  );
                })
              )
            ) : (
              filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <Icon icon="heroicons:users" className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300 text-xs">No recruiters matching "{assignSearch}".</p>
                </div>
              ) : (
                filteredUsers.map((u: any) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  const isCurrent =
                    assignModalJob?.primaryRecruiterId === u.id ||
                    assignModalJob?.assignedTo?.toLowerCase().includes((u.fullName || u.name || "").toLowerCase()) ||
                    assignModalJob?.assignedTo?.toLowerCase().includes((u.email || "").toLowerCase());
                  const roleLabel = getUserRoleLabel(u, assignModalTargetBranch?.id);
                  const isPodMember = isUserInSelectedPods(u.id, u.podId || u.pod_id);

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleToggleUserSelection(u.id)}
                      className={cn(
                        "p-2.5 sm:px-3 sm:py-2 rounded-lg border flex items-center justify-between gap-3 text-xs transition-all cursor-pointer select-none",
                        isSelected
                          ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-600 shadow-2xs ring-1 ring-blue-400/40"
                          : isCurrent
                          ? "border-slate-300 bg-slate-50/70 dark:bg-slate-800/40 dark:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-850"
                          : "border-neutral-200/90 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-850/80"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Checkbox Icon */}
                        <div
                          className={cn(
                            "h-4 w-4 rounded flex items-center justify-center shrink-0 transition-colors border",
                            isSelected
                              ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-transparent hover:border-blue-400"
                          )}
                        >
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>

                        {/* User Avatar Initials */}
                        <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[11px] shrink-0 uppercase border border-slate-200 dark:border-slate-700">
                          {(u.fullName || u.name || u.email || "U").substring(0, 2)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                              {u.fullName || u.name}
                            </span>
                            <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200/80 dark:border-blue-800">
                              {roleLabel}
                            </span>
                            {isPodMember && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 flex items-center gap-0.5" title="Member of currently selected pod">
                                <Icon icon="heroicons:squares-plus" className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
                                Pod Member
                              </span>
                            )}
                            {isCurrent && (
                              <Badge variant="outline" className="text-[9.5px] font-semibold text-slate-500 border-slate-300 dark:border-slate-600 py-0 h-4 px-1.5">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10.5px] text-slate-400 font-mono truncate mt-0.5">{u.email}</p>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="text-[10.5px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 shrink-0">
                          Selected
                        </span>
                      )}
                    </div>
                  );
                })
              )
            )}
          </div>

          {/* Footer: Clear Assignment or Unified Multi-Assign / Cancel */}
          <DialogFooter className="px-5 py-2.5 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50/70 dark:bg-slate-850/70 flex flex-row items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isAssigning}
              onClick={() => handleSaveCombinedAssignment({ unassignAll: true })}
              className="text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 cursor-pointer font-medium"
            >
              Clear Assignment
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isAssigning}
                onClick={() => setAssignModalJob(null)}
                className="text-xs h-8 px-3.5 cursor-pointer font-medium border-slate-200 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isAssigning || (selectedPodIds.length === 0 && selectedUserIds.length === 0)}
                onClick={() => handleSaveCombinedAssignment()}
                className="h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAssigning ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <span>
                    Save Assignment
                    {(selectedPodIds.length > 0 || selectedUserIds.length > 0) && (
                      <span className="ml-1 opacity-90 font-normal">
                        ({selectedPodIds.length > 0 ? `${selectedPodIds.length} Pod${selectedPodIds.length > 1 ? "s" : ""}` : ""}
                        {selectedPodIds.length > 0 && selectedUserIds.length > 0 ? " + " : ""}
                        {selectedUserIds.length > 0 ? `${selectedUserIds.length} Recruiters` : ""})
                      </span>
                    )}
                  </span>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

      {/* Delegate Job Modal */}
      {delegateModalJob && (
        <DelegateJobModal
          isOpen={!!delegateModalJob}
          onClose={() => setDelegateModalJob(null)}
          jobId={delegateModalJob.id}
          jobCode={delegateModalJob.jobCode}
          jobTitle={delegateModalJob.jobTitle}
          onSuccess={() => {
            setDelegateModalJob(null);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
