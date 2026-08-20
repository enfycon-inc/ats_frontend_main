"use client";

import React, { useState, useMemo, useEffect } from "react";
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

interface DataTableProps {
  data: Job[];
  selectedColumns: string[];
  allColumns: { id: string; label: string }[];
  onOpenFilters: () => void;
  onOpenColumns: () => void;
  onRefresh: () => void;
  onSaveView: (viewName: string) => void;
  savedViews: string[];
  activeView: string;
  onSelectView: (viewName: string) => void;
  onUpdateJob?: (jobId: string, updatedFields: Partial<Job>) => void;
}

export default function DataTable({
  data,
  selectedColumns,
  allColumns,
  onOpenFilters,
  onOpenColumns,
  onRefresh,
  onSaveView,
  savedViews,
  activeView,
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

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("All");

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
  const [assignModalSelected, setAssignModalSelected] = useState<string[]>([]);
  const [assignModalComment, setAssignModalComment] = useState("");
  const [assignActiveTab, setAssignActiveTab] = useState<"users" | "teams">("users");

  // Users List State
  const [usersList, setUsersList] = useState<any[]>([]);

  // Load users list for assignedTo selection on mount
  useEffect(() => {
    async function loadUsers() {
      try {
        const users = await atsApi.auth.listUsers();
        if (users && users.length > 0) {
          setUsersList(users);
        } else {
          throw new Error("No users found");
        }
      } catch (err) {
        console.warn("[DataTable] Failed to fetch users, using mock users:", err);
        setUsersList([
          { id: "u1", fullName: "Abhinav Mohanty", email: "abhinav.m@enfycon.com" },
          { id: "u2", fullName: "Abhishek Bohidar", email: "abhishek@enfycon.com" },
          { id: "u3", fullName: "Arijit Kar", email: "arijit.k@enfycon.com" },
          { id: "u4", fullName: "Ashutosh Dash", email: "ashutosh@enfycon.com" },
          { id: "u5", fullName: "Baljayanti Sahoo", email: "bj@enfycon.com" },
          { id: "u6", fullName: "Bhavani Shankar", email: "bhavani@enfycon.com" },
          { id: "u7", fullName: "Bighnesh Mohapatra", email: "bighnesh@enfycon.com" },
          { id: "u8", fullName: "Debashish Samal", email: "debashish.s@enfycon.com" },
          { id: "u9", fullName: "Debidutta Dash", email: "debidutta@enfycon.com" },
          { id: "u10", fullName: "Deeptimeyee Nayak", email: "deeptimeyee@enfycon.com" },
          { id: "u11", fullName: "Dibyaranjan Sahoo", email: "dibya@enfycon.com" },
          { id: "u12", fullName: "Haraprasad Tripathy", email: "haraprasad@enfycon.com" },
          { id: "u13", fullName: "Janaki Bhoi", email: "janaki@enfycon.com" }
        ]);
      }
    }
    loadUsers();
  }, []);

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

  const openAssignModal = (job: Job, type: "assignedTo" | "primaryRecruiter") => {
    setAssignModalJob(job);
    setAssignModalType(type);
    setAssignModalSearch("");
    setAssignModalComment("");
    setAssignActiveTab("users");

    const currentValue = String(job[type] || "");
    if (currentValue && currentValue !== "N/A") {
      setAssignModalSelected(currentValue.split(", ").map(x => x.trim()));
    } else {
      setAssignModalSelected([]);
    }
  };

  const handleAssignSave = () => {
    if (assignModalJob && onUpdateJob) {
      const newValue = assignModalSelected.length > 0 ? assignModalSelected.join(", ") : "N/A";
      onUpdateJob(assignModalJob.id, { [assignModalType]: newValue });
      console.log(`Assign comment for ${assignModalJob.jobCode}: ${assignModalComment}`);
    }
    setAssignModalJob(null);
  };

  const mockTeams = ["Recruitment Team A", "Recruitment Team B", "Delivery Team", "Sourcing Team"];

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

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((job) => {
        if (searchFilter === "All") {
          return (
            (job.jobTitle || "").toLowerCase().includes(q) ||
            (job.jobCode || "").toLowerCase().includes(q) ||
            (job.client || "").toLowerCase().includes(q) ||
            (job.location || "").toLowerCase().includes(q)
          );
        } else {
          const val = job[searchFilter as keyof Job];
          return typeof val === "string" && val.toLowerCase().includes(q);
        }
      });
    }

    // Sort
    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }

        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();
        if (strA < strB) return sortDirection === "asc" ? -1 : 1;
        if (strA > strB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, searchFilter, sortColumn, sortDirection]);

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
              <option value="All Jobs">All Jobs</option>
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

      {/* Search and Filters bar */}
      <div className="py-1 px-2.5 border-b border-neutral-200 dark:border-slate-800 flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900">
        <div className="flex items-center bg-neutral-50 dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded-sm w-[280px]">
          <select
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-2 pr-1 py-0.5 text-xs text-neutral-700 dark:text-neutral-300 bg-transparent outline-hidden cursor-pointer border-r border-neutral-300 dark:border-slate-700 font-medium"
          >
            <option value="All">Search Any</option>
            <option value="jobCode">Job Code</option>
            <option value="jobTitle">Job Title</option>
            <option value="client">Client</option>
          </select>
          <input
            type="text"
            placeholder="Type search terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-2 py-0.5 text-xs text-neutral-850 dark:text-neutral-150 bg-transparent outline-hidden placeholder:text-neutral-400 font-medium"
          />
          <Search className="h-3.5 w-3.5 text-neutral-400 mr-2" />
        </div>
      </div>

      {/* Spreadsheet grid container */}
      <div className="flex-1 overflow-auto relative min-h-0 bg-neutral-50/20 dark:bg-slate-950/10">
        <table className="w-full border-collapse text-left table-auto border-neutral-200 dark:border-slate-800">
          {/* Table Header */}
          <thead className="sticky top-0 z-10 bg-blue-50 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700 shadow-xs select-none">
            <tr>
              {/* Checkbox Header (Sticky Left) */}
              <th className="sticky left-0 z-20 w-[36px] min-w-[36px] p-1 text-center bg-blue-50 dark:bg-slate-800 border-r border-b border-neutral-250 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={
                    paginatedData.length > 0 &&
                    paginatedData.every((job) => selectedRowIds.includes(job.id))
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-3 w-3 accent-primary cursor-pointer rounded-xs"
                />
              </th>

              {/* Column Headers */}
              {activeSelectedColumns.map((colId) => {
                const col = activeAllColumns.find((c) => c.id === colId);
                const isSorted = sortColumn === colId;
                return (
                  <th
                    key={colId}
                    className="p-1.5 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 bg-blue-50 dark:bg-slate-800 border-r border-b border-neutral-250 dark:border-slate-700 hover:bg-blue-100 dark:hover:bg-slate-750 transition-colors cursor-pointer relative whitespace-nowrap"
                    onClick={() => handleSort(colId as keyof Job)}
                  >
                    <div className="flex items-center justify-between gap-1 pr-3">
                      <span className="uppercase tracking-wider text-[10px] whitespace-nowrap">{col?.label || colId}</span>
                      <div className="flex items-center gap-0.5 opacity-60">
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3 text-primary font-bold" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-primary font-bold" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 text-neutral-400" />
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}

              {/* Actions Header (Sticky Right) */}
              <th className="sticky right-0 z-20 w-[56px] min-w-[56px] p-1 text-center bg-blue-50 dark:bg-slate-800 border-l border-b border-neutral-250 dark:border-slate-700 uppercase tracking-wider text-[10px] font-bold text-neutral-700 dark:text-neutral-200">
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
                      "sticky left-0 z-10 w-[36px] min-w-[36px] p-1.5 text-center border-r border-neutral-200 dark:border-slate-800 transition-colors duration-150",
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
                        className="h-3 w-3 accent-primary cursor-pointer rounded-xs"
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
                            "py-2 px-2 border-r border-neutral-200 dark:border-slate-800 whitespace-nowrap font-normal text-neutral-800 dark:text-neutral-200 transition-colors relative",
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
                                      const customName = clientSearchText.trim();
                                      if (onUpdateJob) onUpdateJob(job.id, { [colId]: customName });
                                      handleCellCancel();
                                      toast.success(`${colId === "endClientName" ? "End Client" : "Client"} set to ${customName}`);
                                    }}
                                    className="px-2.5 py-1.5 rounded-md cursor-pointer bg-blue-50 dark:bg-blue-950/40 text-[#1a4fa0] dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-between text-xs font-semibold"
                                  >
                                    <span>Use "{clientSearchText.trim()}"</span>
                                    <span className="text-[10px] uppercase tracking-wider font-bold">Select</span>
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
                            <Link href={`/job-posting/${job.id}`}>
                              <span className="text-[#1a4fa0] dark:text-blue-400 font-semibold hover:underline cursor-pointer">
                                {job.jobCode}
                              </span>
                            </Link>
                          ) : colId === "jobStatus" ? (
                            <div className="flex items-center gap-1.5 justify-between w-full">
                              <Badge
                                className={cn(
                                  "text-[10px] font-medium px-2 py-0.5 rounded-md border shadow-none",
                                  job.jobStatus === "Pending Approval" || job.approvalStatus === "PENDING_APPROVAL"
                                    ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800 font-bold"
                                    : job.jobStatus === "Active"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40"
                                    : job.jobStatus === "Close" || job.jobStatus === "Closed"
                                    ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                    : job.jobStatus === "Filled"
                                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40"
                                    : job.jobStatus === "Draft"
                                    ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50"
                                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40"
                                )}
                              >
                                {job.jobStatus === "Pending Approval" || job.approvalStatus === "PENDING_APPROVAL"
                                  ? "Pending Approval"
                                  : job.jobStatus}
                              </Badge>
                              {hasEditPermission && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openStatusModal(job); }}
                                  className="text-neutral-400 hover:text-blue-500 hover:bg-neutral-100 dark:hover:bg-slate-800 p-0.5 rounded transition-colors cursor-pointer"
                                  title="Change Job Status"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                            </div>
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
                                <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 rounded-md px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
                                  <Users className="h-2.5 w-2.5 shrink-0 text-slate-500" />
                                  {job.podName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-neutral-400 dark:text-neutral-600 italic text-[10px]">Unassigned</span>
                            )
                          ) : colId === "jobTitle" ? (
                            <div className="flex items-center gap-1">
                              <Link href={`/job-posting/${job.id}`}>
                                <span className="whitespace-nowrap hover:underline cursor-pointer text-slate-900 dark:text-slate-100 hover:text-[#1a4fa0] dark:hover:text-blue-400 font-medium">
                                  {job.jobTitle}
                                </span>
                              </Link>
                              {job.agingDays > 30 && (
                                <Badge className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/30 text-[9px] scale-90 flex items-center gap-0.5 shadow-none px-1 py-0 font-medium">
                                  <AlertTriangle className="h-2.5 w-2.5" /> SLA
                                </Badge>
                              )}
                            </div>
                          ) : colId === "submissionsCount" ? (
                            <div className="flex items-center gap-1.5">
                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md font-medium text-[10px]">
                                {job.submissionsCount} Sub
                              </span>
                              <div className="flex items-center gap-1 text-[9.5px] text-slate-500 dark:text-slate-400">
                                <span className="text-slate-600 dark:text-slate-300 font-medium" title="Applied">{job.pipeline.applied}A</span>
                                <span>/</span>
                                <span className="text-slate-600 dark:text-slate-300 font-medium" title="Interviewing">{job.pipeline.interviewing}I</span>
                                <span>/</span>
                                <span className="text-slate-600 dark:text-slate-300 font-medium" title="Offered">{job.pipeline.offered}O</span>
                              </div>
                            </div>
                          ) : (colId === "assignedTo" || colId === "primaryRecruiter") ? (
                            <div className="flex items-center justify-between gap-1.5 w-full">
                              <span>{String(job[colId as keyof Job] || "N/A")}</span>
                              {hasEditPermission && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openAssignModal(job, colId as "assignedTo" | "primaryRecruiter"); }}
                                  className="text-neutral-400 hover:text-blue-500 hover:bg-neutral-100 dark:hover:bg-slate-800 p-0.5 rounded transition-colors cursor-pointer"
                                  title={`Change ${colId === "assignedTo" ? "Assigned To" : "Primary Recruiter"}`}
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
                      "sticky right-0 z-10 w-[56px] min-w-[56px] p-0.5 text-center border-l border-neutral-200 dark:border-slate-800 transition-colors duration-150",
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
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center font-sans">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 w-[620px] shadow-2xl rounded overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-neutral-100 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                {assignModalType === "assignedTo" ? "Assigned To" : "Primary Recruiter"}
              </h3>
              <button onClick={() => setAssignModalJob(null)} className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-250 font-bold text-lg select-none">×</button>
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-12 border border-neutral-200 dark:border-slate-800 rounded min-h-[260px] max-h-[300px]">
                {/* Left Tabs/Sidebar - 3 cols */}
                <div className="col-span-3 border-r border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-950/20 p-2 flex flex-col gap-1 select-none">
                  <button
                    onClick={() => setAssignActiveTab("users")}
                    className={cn(
                      "text-left px-2 py-1.5 rounded-sm font-semibold transition-colors cursor-pointer text-[11px]",
                      assignActiveTab === "users"
                        ? "text-blue-600 bg-blue-50/60 dark:text-blue-400 dark:bg-blue-950/20"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-slate-850"
                    )}
                  >
                    All Users
                  </button>
                  <button
                    onClick={() => setAssignActiveTab("teams")}
                    className={cn(
                      "text-left px-2 py-1.5 rounded-sm font-semibold transition-colors cursor-pointer text-[11px]",
                      assignActiveTab === "teams"
                        ? "text-blue-600 bg-blue-50/60 dark:text-blue-400 dark:bg-blue-950/20"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-slate-850"
                    )}
                  >
                    Teams
                  </button>
                </div>

                {/* Center Selection Pane - 5 cols */}
                <div className="col-span-5 border-r border-neutral-200 dark:border-slate-800 p-2.5 flex flex-col min-h-0">
                  {/* Search Input */}
                  <div className="relative mb-2 shrink-0">
                    <input
                      type="text"
                      placeholder="Search"
                      value={assignModalSearch}
                      onChange={(e) => setAssignModalSearch(e.target.value)}
                      className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs outline-hidden text-neutral-850 dark:text-neutral-150 focus:border-primary placeholder:text-neutral-400"
                    />
                  </div>

                  {/* Options List */}
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                    {assignActiveTab === "users" ? (
                      (() => {
                        const currentUser = atsApi.auth.getCurrentUser();
                        const isSuperAdmin = currentUser?.roles?.includes("SUPER_ADMIN");
                        const isTenantAdmin = isSuperAdmin || currentUser?.roles?.includes("ADMIN") || currentUser?.permissions?.includes("tenant:settings");
                        const isBranchAdmin = 
                          currentUser?.roles?.includes("BRANCH_ADMIN") || 
                          currentUser?.permissions?.includes("branch_admin:manage") ||
                          (assignModalJob?.branchId && (currentUser as any)?.branchRoles?.[assignModalJob.branchId]?.some((r: string) => ['ADMIN', 'BRANCH_ADMIN'].includes(r)));

                        const hasDelegatedPermission = 
                          currentUser?.permissions?.includes("job:assign") ||
                          currentUser?.permissions?.includes("job:assign_recruiter") ||
                          currentUser?.permissions?.includes("job:assign_pod") ||
                          currentUser?.permissions?.includes("job:edit") ||
                          currentUser?.permissions?.includes("pod:edit") ||
                          currentUser?.permissions?.includes("pod:overlap") ||
                          currentUser?.roles?.includes("DELIVERY_HEAD");

                        const isPodLead = currentUser?.systemRole === "POD_LEAD" || currentUser?.roles?.includes("POD_LEAD");
                        const hasBypass = isTenantAdmin || isBranchAdmin || hasDelegatedPermission;
                        
                        let listToShow = usersList;
                        if (!hasBypass && isPodLead && currentUser?.podId) {
                          listToShow = usersList.filter((u) => u.podId === currentUser.podId);
                        } else if (isBranchAdmin && !isTenantAdmin && assignModalJob?.branchId) {
                          listToShow = usersList.filter((u) => u.branchId === assignModalJob.branchId || (u as any).assignedBranchIds?.includes(assignModalJob.branchId));
                        }

                        return (
                          <>
                            {/* Select All Users Option */}
                            {assignModalType !== "primaryRecruiter" && (
                              <label className="flex items-center gap-2 px-1.5 py-1 hover:bg-neutral-50 dark:hover:bg-slate-800/50 rounded cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={
                                    listToShow.length > 0 &&
                                    listToShow.every((u) => assignModalSelected.includes(u.fullName))
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setAssignModalSelected(listToShow.map((u) => u.fullName));
                                    } else {
                                      setAssignModalSelected([]);
                                    }
                                  }}
                                  className="h-3 w-3 accent-primary rounded-xs cursor-pointer"
                                />
                                <span className="font-bold text-neutral-850 dark:text-neutral-200">Select Users</span>
                              </label>
                            )}

                            {/* List of Users */}
                            {listToShow
                              .filter((u) =>
                                u.fullName.toLowerCase().includes(assignModalSearch.toLowerCase()) ||
                                u.email.toLowerCase().includes(assignModalSearch.toLowerCase())
                              )
                              .map((u) => {
                                const isChecked = assignModalSelected.includes(u.fullName);
                                return (
                                  <label
                                    key={u.id}
                                    className="flex items-center gap-2 px-1.5 py-0.5 hover:bg-neutral-50 dark:hover:bg-slate-800/50 rounded cursor-pointer select-none text-neutral-700 dark:text-neutral-300"
                                  >
                                    <input
                                      type={assignModalType === "primaryRecruiter" ? "radio" : "checkbox"}
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          if (assignModalType === "primaryRecruiter") {
                                            setAssignModalSelected([u.fullName]);
                                          } else {
                                            setAssignModalSelected((prev) => [...prev, u.fullName]);
                                          }
                                        } else {
                                          setAssignModalSelected((prev) => prev.filter((name) => name !== u.fullName));
                                        }
                                      }}
                                      className="h-3 w-3 accent-primary rounded-xs cursor-pointer"
                                    />
                                    <span className="truncate">{u.fullName} <span className="text-[9.5px] text-neutral-400 dark:text-neutral-500 font-medium">({u.email})</span></span>
                                  </label>
                                );
                              })}
                          </>
                        );
                      })()
                    ) : (
                      <>
                        {/* Select All Teams Option */}
                        <label className="flex items-center gap-2 px-1.5 py-1 hover:bg-neutral-50 dark:hover:bg-slate-800/50 rounded cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={
                              mockTeams.every((t) => assignModalSelected.includes(t))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssignModalSelected(mockTeams);
                              } else {
                                setAssignModalSelected([]);
                              }
                            }}
                            className="h-3 w-3 accent-primary rounded-xs cursor-pointer"
                          />
                          <span className="font-bold text-neutral-850 dark:text-neutral-200">Select Teams</span>
                        </label>

                        {/* List of Teams */}
                        {mockTeams
                          .filter((t) => t.toLowerCase().includes(assignModalSearch.toLowerCase()))
                          .map((teamName) => {
                            const isChecked = assignModalSelected.includes(teamName);
                            return (
                              <label
                                key={teamName}
                                className="flex items-center gap-2 px-1.5 py-1 hover:bg-neutral-50 dark:hover:bg-slate-800/50 rounded cursor-pointer select-none text-neutral-700 dark:text-neutral-300"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setAssignModalSelected((prev) => [...prev, teamName]);
                                    } else {
                                      setAssignModalSelected((prev) => prev.filter((name) => name !== teamName));
                                    }
                                  }}
                                  className="h-3 w-3 accent-primary rounded-xs cursor-pointer"
                                />
                                <span>{teamName}</span>
                              </label>
                            );
                          })}
                      </>
                    )}
                  </div>
                </div>

                {/* Right Pane (Selected Users) - 4 cols */}
                <div className="col-span-4 p-2.5 flex flex-col min-h-0 bg-neutral-50/20 dark:bg-slate-905/30 border-l border-neutral-200 dark:border-slate-800">
                  <h4 className="font-bold text-neutral-805 dark:text-neutral-200 mb-1.5 border-b border-neutral-200 dark:border-slate-800 pb-1 uppercase tracking-wider text-[9.5px]">
                    Selected {assignActiveTab === "users" ? "Users" : "Teams"}
                  </h4>
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                    {assignModalSelected.map((name) => (
                      <div
                        key={name}
                        className="flex items-center justify-between bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-neutral-250 px-2 py-0.5 rounded-xs text-[10px] border border-neutral-200/50 dark:border-slate-700/50"
                      >
                        <span className="truncate pr-1 font-medium">{name}</span>
                        <button
                          onClick={() => setAssignModalSelected((prev) => prev.filter((x) => x !== name))}
                          className="text-neutral-500 hover:text-red-500 font-bold text-sm cursor-pointer select-none px-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {assignModalSelected.length === 0 && (
                      <span className="text-[10px] text-neutral-400 italic">None selected</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Comment Area */}
              <div className="grid grid-cols-12 items-start gap-3">
                <span className="col-span-2 text-neutral-600 dark:text-neutral-400 font-semibold pt-1 text-right">Comment</span>
                <textarea
                  placeholder="Comment"
                  value={assignModalComment}
                  onChange={(e) => setAssignModalComment(e.target.value)}
                  className="col-span-10 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden text-neutral-850 dark:text-neutral-200 focus:border-primary h-12 text-xs resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-2 bg-neutral-50 dark:bg-slate-900 border-t border-neutral-200 dark:border-slate-800 text-xs">
              <Button
                size="sm"
                onClick={handleAssignSave}
                className="h-8 bg-blue-600 hover:bg-blue-755 text-white font-bold cursor-pointer rounded-sm"
              >
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssignModalJob(null)}
                className="h-8 border border-neutral-300 dark:border-slate-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-slate-800 font-bold cursor-pointer rounded-sm"
              >
                Cancel
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

      {/* Add Client Modal */}
      <AddClientModal
        open={addClientModalOpen}
        onOpenChange={setAddClientModalOpen}
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
