"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Filter,
  Settings,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { atsApi } from "@/lib/ats-api";
import { getActiveRolePermissions, resolveActiveSystemRole } from "@/lib/role-permissions";
import { getDashboardRoleSelection } from "@/lib/dashboard-role";
import { Job } from "../data/mock-jobs";
import AddCandidateModal from "@/components/dashboard/AddCandidateModal";
import { AddClientModal } from "./add-client-modal";
import { DelegateJobModal } from "@/components/shared/delegate-job-modal";

// Re-export utility functions so consumers importing from this file remain unaffected
export {
  getAssignedPersonDisplay,
  formatDateTimeDisplay,
  isJobRecent,
  isJobPostedToday,
  exportJobsToCSV,
} from "../lib/job-table-utils";

import { exportJobsToCSV } from "../lib/job-table-utils";
import { useJobTableData } from "../lib/use-job-table-data";
import { JobTableFilters } from "./data-table/job-table-filters";
import { JobTableRow } from "./data-table/job-table-row";
import { JobStatusModal } from "./data-table/job-status-modal";
import { JobSaveViewModal } from "./data-table/job-save-view-modal";
import { ApproveJobModal, RejectJobModal } from "./data-table/job-approval-modals";
import { JobContextMenu } from "./data-table/job-context-menu";
import { JobAssignModal } from "./data-table/job-assign-modal";

export interface DataTableProps {
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
    typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null
  );

  useEffect(() => {
    let disposed = false;
    const refreshAccess = () => {
      setActiveBranchId(localStorage.getItem("active_branch_id"));
      atsApi.auth
        .me()
        .then((profile) => {
          if (!disposed) setCurrentUser(profile);
        })
        .catch(() => {});
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
    const { active } = getDashboardRoleSelection(currentUser, currentUser.assignedRoles || []);
    const sysRole = resolveActiveSystemRole(active.id, currentUser.assignedRoles || [], currentUser);
    const isAdmin = sysRole === "TENANT_ADMIN" || sysRole === "SUPER_ADMIN";
    const perms = getActiveRolePermissions(active.id, currentUser.assignedRoles || [], currentUser);
    return isAdmin || perms.includes("job:edit");
  }, [currentUser]);

  const hasCreatePermission = useMemo(() => {
    if (!currentUser) return false;
    const { active } = getDashboardRoleSelection(currentUser, currentUser.assignedRoles || []);
    const sysRole = resolveActiveSystemRole(active.id, currentUser.assignedRoles || [], currentUser);
    
    // Per user request: Managers should not have the option to create jobs
    if (["TENANT_ADMIN", "BRANCH_ADMIN", "UNIT_ADMIN"].includes(sysRole)) {
      return false;
    }
    
    const isAdmin = sysRole === "SUPER_ADMIN";
    const perms = getActiveRolePermissions(active.id, currentUser.assignedRoles || [], currentUser);
    return isAdmin || perms.includes("job:create");
  }, [currentUser]);

  const hasSubmitCandidatePermission = useMemo(() => {
    if (!currentUser) return false;
    const { active } = getDashboardRoleSelection(currentUser, currentUser.assignedRoles || []);
    const sysRole = resolveActiveSystemRole(active.id, currentUser.assignedRoles || [], currentUser);
    const isAdmin = sysRole === "TENANT_ADMIN" || sysRole === "SUPER_ADMIN";
    const perms = getActiveRolePermissions(active.id, currentUser.assignedRoles || [], currentUser);
    return isAdmin || perms.includes("submission:create");
  }, [currentUser]);

  const hasDelegatePermission = useMemo(() => {
    if (!currentUser) return false;
    const permissions = currentUser.permissions || [];
    return permissions.includes("job:delegate");
  }, [currentUser]);

  const currentUserBranchId =
    activeBranchId && activeBranchId !== "ALL" ? activeBranchId : currentUser?.branchId;

  const hasApprovePermission = useMemo(() => {
    if (!currentUser) return false;
    const permissions = currentUser.permissions || [];
    const roles = (currentUser.roles || []).map((r: string) =>
      r.toUpperCase().replace(/[\s-_]+/g, "")
    );
    const isSuperOrAdmin =
      roles.includes("SUPERADMIN") ||
      roles.includes("TENANT_ADMIN") ||
      roles.includes("SUPER_ADMIN");
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

  // Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Table Data Hook
  const {
    searchQuery,
    setSearchQuery,
    selectedPod,
    setSelectedPod,
    selectedBranch,
    setSelectedBranch,
    selectedCreator,
    setSelectedCreator,
    selectedAssignee,
    setSelectedAssignee,
    selectedClient,
    setSelectedClient,
    selectedPeriod,
    setSelectedPeriod,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedSort,
    setSelectedSort,
    showRangePicker,
    setShowRangePicker,
    isPodSystemEnabled,
    availablePods,
    availableBranches,
    availableCreators,
    availableAssignees,
    availableClients,
    isAnyFilterActive,
    handleResetFilters,
    sortColumn,
    sortDirection,
    handleSort,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    totalPages,
    processedData,
    paginatedData,
  } = useJobTableData({ data, branchUsesPods });

  // Modal States
  const [isSavingView, setIsSavingView] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editCellValue, setEditCellValue] = useState<string>("");
  const [clientList, setClientList] = useState<any[]>([]);
  const [clientSearchText, setClientSearchText] = useState("");
  const [addClientModalOpen, setAddClientModalOpen] = useState(false);

  // Approval Modals
  const [approveModalJob, setApproveModalJob] = useState<Job | null>(null);
  const [rejectModalJob, setRejectModalJob] = useState<Job | null>(null);

  // Status & Assignment Modals
  const [statusModalJob, setStatusModalJob] = useState<Job | null>(null);
  const [statusModalValue, setStatusModalValue] = useState("");
  const [statusModalComment, setStatusModalComment] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [assignModalJob, setAssignModalJob] = useState<Job | null>(null);

  // Sourcing & Delegation Modals
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [selectedJobForSourcing, setSelectedJobForSourcing] = useState<Job | null>(null);
  const [delegateModalJob, setDelegateModalJob] = useState<Job | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    jobId: string;
  } | null>(null);

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
    if (Array.isArray(clientList)) {
      clientList.forEach((cl) => {
        const nameStr =
          typeof cl === "string"
            ? cl
            : cl?.name || cl?.companyName || cl?.clientName || cl?.title || "";
        if (nameStr && nameStr.trim()) {
          namesSet.add(nameStr.trim());
        }
      });
    }
    if (Array.isArray(data)) {
      data.forEach((job) => {
        if (job.client && job.client !== "N/A" && job.client.trim()) {
          namesSet.add(job.client.trim());
        }
      });
    }
    ["prolays", "Google", "Tcs", "Deb Tech Enterprise", "enfysync Inc"].forEach((n) =>
      namesSet.add(n)
    );
    return Array.from(namesSet).sort((a, b) => a.localeCompare(b));
  }, [clientList, data]);

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

  const handleCellDoubleClick = (rowId: string, colId: string, currentValue: string) => {
    if (!hasEditPermission) return;
    setEditingCell({ rowId, colId });
    setEditCellValue(currentValue === "N/A" ? "" : currentValue);
    if (colId === "client" || colId === "endClientName") {
      setClientSearchText("");
      fetchClientsList();
    }
  };

  const handleCellSave = () => {
    if (editingCell && onUpdateJob) {
      onUpdateJob(editingCell.rowId, {
        [editingCell.colId]: editCellValue || "N/A",
      } as Partial<Job>);
    }
    setEditingCell(null);
    setEditCellValue("");
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditCellValue("");
  };

  const startQuickEdit = (job: Job) => {
    if (!hasEditPermission) return;
    setEditingCell({ rowId: job.id, colId: "jobTitle" });
    setEditCellValue(job.jobTitle);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu(null);
        setIsSavingView(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleExportCSV = () => {
    exportJobsToCSV(processedData, activeSelectedColumns, activeAllColumns);
  };

  return (
    <div
      className="flex-1 flex flex-col min-h-0 min-w-0 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm shadow-none overflow-hidden relative font-sans"
      onClick={() => setContextMenu(null)}
    >
      {/* Action Bar */}
      <div className="py-1 px-2.5 border-b border-neutral-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-neutral-50/50 dark:bg-slate-900/50 text-xs">
        <div className="flex items-center gap-2">
          {selectedRowIds.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-sm">
              <span className="text-[10px] font-bold text-primary">
                {selectedRowIds.length} Selected
              </span>
              <button
                onClick={handleExportCSV}
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
            onClick={handleExportCSV}
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

      {/* Filter Toolbar */}
      <JobTableFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isPodSystemEnabled={isPodSystemEnabled}
        selectedPod={selectedPod}
        onPodChange={setSelectedPod}
        availablePods={availablePods}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        availableBranches={availableBranches}
        selectedCreator={selectedCreator}
        onCreatorChange={setSelectedCreator}
        availableCreators={availableCreators}
        selectedAssignee={selectedAssignee}
        onAssigneeChange={setSelectedAssignee}
        availableAssignees={availableAssignees}
        selectedClient={selectedClient}
        onClientChange={setSelectedClient}
        availableClients={availableClients}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
        showRangePicker={showRangePicker}
        onToggleRangePicker={() => setShowRangePicker(!showRangePicker)}
        onCloseRangePicker={() => setShowRangePicker(false)}
        isAnyFilterActive={isAnyFilterActive}
        onResetFilters={handleResetFilters}
      />

      {/* Spreadsheet Grid Table */}
      <div className="flex-1 overflow-auto relative min-h-0 bg-neutral-50/20 dark:bg-slate-950/10">
        <table className="w-full border-collapse text-left table-auto border-neutral-200 dark:border-slate-800">
          <thead className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-800 shadow-2xs select-none backdrop-blur-xs">
            <tr>
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
                      <span className="uppercase tracking-wider text-[10px] whitespace-nowrap font-bold text-slate-600 dark:text-slate-300">
                        {col?.label || colId}
                      </span>
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

              <th className="sticky right-0 z-20 w-[64px] min-w-[64px] px-3 py-3.5 text-center bg-slate-100/95 dark:bg-slate-900 border-l border-b border-neutral-200 dark:border-slate-800 uppercase tracking-wider text-[10px] font-bold text-slate-600 dark:text-slate-300">
                Action
              </th>
            </tr>
          </thead>

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
              paginatedData.map((job, idx) => (
                <JobTableRow
                  key={job.id}
                  job={job}
                  idx={idx}
                  isSelected={selectedRowIds.includes(job.id)}
                  onToggleSelect={handleSelectRow}
                  activeSelectedColumns={activeSelectedColumns}
                  editingCell={editingCell}
                  editCellValue={editCellValue}
                  onEditCellValueChange={setEditCellValue}
                  onCellDoubleClick={handleCellDoubleClick}
                  onCellSave={handleCellSave}
                  onCellCancel={handleCellCancel}
                  clientSearchText={clientSearchText}
                  onClientSearchTextChange={setClientSearchText}
                  availableClientNames={availableClientNames}
                  onSelectClientFromPopover={(colId, clientName) => {
                    if (onUpdateJob) onUpdateJob(job.id, { [colId]: clientName });
                  }}
                  onOpenAddClientModal={() => setAddClientModalOpen(true)}
                  hasEditPermission={hasEditPermission}
                  hasCreatePermission={hasCreatePermission}
                  hasSubmitCandidatePermission={hasSubmitCandidatePermission}
                  hasDelegatePermission={hasDelegatePermission}
                  hasApprovePermission={hasApprovePermission}
                  currentUser={currentUser}
                  currentUserBranchId={currentUserBranchId}
                  onContextMenu={(e, jobId) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, jobId });
                  }}
                  onOpenApproveModal={setApproveModalJob}
                  onOpenRejectModal={setRejectModalJob}
                  onOpenAssignModal={setAssignModalJob}
                  onOpenSourceModal={(j) => {
                    setSelectedJobForSourcing(j);
                    setSourceModalOpen(true);
                  }}
                  onOpenDelegateModal={setDelegateModalJob}
                  onOpenStatusModal={(job, status) => { setStatusModalJob(job); setStatusModalValue(status || job.jobStatus); setStatusModalComment(''); setStatusError(''); }}
                  onStartQuickEdit={startQuickEdit}
                  onUpdateJob={onUpdateJob}
                  onRefresh={onRefresh}
                />
              ))
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
      <JobSaveViewModal
        isOpen={isSavingView}
        onClose={() => setIsSavingView(false)}
        onSave={(viewName) => {
          onSaveView?.(viewName);
          toast.success(`View "${viewName}" saved!`);
        }}
      />

      {/* Right-click Context Menu */}
      {contextMenu && (
        (() => {
          const contextJob = data.find((j) => j.id === contextMenu.jobId);
          if (!contextJob) return null;
          return (
            <JobContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              job={contextJob}
              hasSubmitCandidatePermission={hasSubmitCandidatePermission}
              hasEditPermission={hasEditPermission}
              hasDelegatePermission={hasDelegatePermission}
              currentUserBranchId={currentUserBranchId}
              onOpenSourceModal={(j) => {
                setSelectedJobForSourcing(j);
                setSourceModalOpen(true);
              }}
              onFindMatches={(j) => router.push(`/job-posting/${j.id}/matches`)}
              onDelegateJob={setDelegateModalJob}
              onEditJob={(j) => router.push(`/job-posting/${j.id}/edit`)}
              onQuickEdit={startQuickEdit}
              onOpenAssignModal={setAssignModalJob}
              onArchiveJob={(j) => onUpdateJob?.(j.id, { jobStatus: "Archived" })}
              onClose={() => setContextMenu(null)}
            />
          );
        })()
      )}

      {/* Job Status Modal Dialog */}
      <JobStatusModal
        job={statusModalJob}
        statusValue={statusModalValue}
        onStatusValueChange={setStatusModalValue}
        comment={statusModalComment}
        onCommentChange={setStatusModalComment}
        saving={statusSaving}
        error={statusError}
        onConfirm={async () => {
          if (!statusModalJob || statusSaving) return;
          setStatusSaving(true); setStatusError('');
          try {
            const saved = await atsApi.jobs.changeStatus(statusModalJob.id, { status: statusModalValue, expectedStatus: statusModalJob.jobStatus, reason: statusModalComment.trim() });
            onUpdateJob?.(statusModalJob.id, { jobStatus: saved.status, _alreadySaved: true } as Partial<Job>);
            onRefresh?.(); setStatusModalJob(null); toast.success('Job status updated.');
          } catch (error) { setStatusError(error instanceof Error ? error.message : 'Unable to change status.'); }
          finally { setStatusSaving(false); }
        }}
        onClose={() => { if (!statusSaving) setStatusModalJob(null); }}
      />

      {/* Assign Recruiters Modal Dialog */}
      <JobAssignModal
        job={assignModalJob}
        currentUser={currentUser}
        currentUserBranchId={currentUserBranchId}
        isOpen={!!assignModalJob}
        onClose={() => setAssignModalJob(null)}
        onSuccess={(updatedFields) => {
          if (assignModalJob && onUpdateJob) {
            onUpdateJob(assignModalJob.id, updatedFields);
          }
          if (onRefresh) onRefresh();
        }}
      />

      {/* Approve Job Requisition Modal */}
      <ApproveJobModal
        job={approveModalJob}
        isOpen={!!approveModalJob}
        onClose={() => setApproveModalJob(null)}
        onSuccess={(jobId) => {
          if (onUpdateJob) {
            onUpdateJob(jobId, {
              jobStatus: "Active",
              approvalStatus: "APPROVED" as any,
            });
          }
          if (onRefresh) onRefresh();
        }}
      />

      {/* Reject Job Requisition Modal */}
      <RejectJobModal
        job={rejectModalJob}
        isOpen={!!rejectModalJob}
        onClose={() => setRejectModalJob(null)}
        onSuccess={(jobId, finalReason) => {
          if (onUpdateJob) {
            onUpdateJob(jobId, {
              jobStatus: "Draft" as any,
              approvalStatus: "REJECTED" as any,
              rejectionReason: finalReason,
            });
          }
          if (onRefresh) onRefresh();
        }}
      />

      {/* Source Candidate Modal */}
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
