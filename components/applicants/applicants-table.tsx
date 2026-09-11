"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Star,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  ExternalLink,
  ClipboardList,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Applicant } from "@/app/(dashboard)/applicants/data/mock-applicants";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

// ── Status badge colour map ─────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  "New lead":
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  Interviewing:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  Submitted:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  Offered:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
  Placed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  Rejected:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
};

const getStatusStyle = (status: string) =>
  STATUS_STYLES[status] ||
  "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-slate-800 dark:text-neutral-300 dark:border-slate-700";

// ── Source badge colour map ─────────────────────────────────────
const SOURCE_STYLES: Record<string, string> = {
  Dice: "text-orange-600 dark:text-orange-400",
  Monster: "text-purple-600 dark:text-purple-400",
  LinkedIn: "text-blue-600 dark:text-blue-400",
  Indeed: "text-blue-800 dark:text-blue-300",
};

// ── Work Auth badge colour map ──────────────────────────────────
const WORK_AUTH_STYLES: Record<string, string> = {
  "US Citizen": "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
  "Have H1 Visa": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  "Employment Auth. Document": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
  "TN Permit Holder": "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800",
  "US Authorized": "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-800",
};

const getWorkAuthStyle = (auth: string) =>
  WORK_AUTH_STYLES[auth] ||
  "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-slate-800 dark:text-neutral-300 dark:border-slate-700";

// ── Column definitions ──────────────────────────────────────────
export const ALL_COLUMNS: { id: string; label: string }[] = [
  { id: "candidateCode", label: "Candidate Code" },
  { id: "applicantName", label: "Applicant Name" },
  { id: "jobTitle", label: "Designation / Profession" },
  { id: "assignedJobCode", label: "Assigned Job" },
  { id: "email", label: "Email" },
  { id: "mobile", label: "Mobile" },
  { id: "city", label: "City" },
  { id: "state", label: "State" },
  { id: "source", label: "Source" },
  { id: "uploadedByName", label: "Uploaded By" },
  { id: "status", label: "Status" },
  { id: "workAuthorization", label: "Work Auth" },
  { id: "createdOn", label: "Created On" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "expectedSalary", label: "Exp. Salary (LPA)" },
  { id: "currentSalary", label: "Curr. Salary (LPA)" },
  { id: "noticePeriod", label: "Notice Period" },
];

export const DEFAULT_COLUMNS = [
  "candidateCode",
  "applicantName",
  "jobTitle",
  "assignedJobCode",
  "email",
  "mobile",
  "city",
  "state",
  "source",
  "uploadedByName",
  "status",
  "workAuthorization",
  "createdOn",
  "experience",
  "skills",
];

// ── Props ───────────────────────────────────────────────────────
interface ApplicantsTableProps {
  data: Applicant[];
  selectedColumns: string[];
  allColumns: { id: string; label: string }[];
  searchQuery: string;
  searchFilter: string;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  selectedRowIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onReorderColumns?: (newOrder: string[]) => void;
  isRecruiter?: boolean;
}

export default function ApplicantsTable({
  data,
  selectedColumns,
  allColumns,
  searchQuery,
  searchFilter,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  selectedRowIds,
  onSelectionChange,
  onReorderColumns,
  isRecruiter = false,
}: ApplicantsTableProps) {
  const router = useRouter();
  const [sortColumn, setSortColumn] = useState<keyof Applicant | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [starredIds, setStarredIds] = useState<string[]>(
    data.filter((a) => a.starred).map((a) => a.applicantId)
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    applicantId: string;
  } | null>(null);

  // Direct Column Drag & Drop Reordering State
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [isDragReordering, setIsDragReordering] = useState(false);

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColId(colId);
    setIsDragReordering(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", colId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedColId && draggedColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDragLeave = (colId: string) => {
    if (dragOverColId === colId) {
      setDragOverColId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetColId) {
      setDraggedColId(null);
      setDragOverColId(null);
      setTimeout(() => setIsDragReordering(false), 200);
      return;
    }

    const fromIdx = selectedColumns.indexOf(draggedColId);
    const toIdx = selectedColumns.indexOf(targetColId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const newCols = [...selectedColumns];
      const [moved] = newCols.splice(fromIdx, 1);
      newCols.splice(toIdx, 0, moved);
      onReorderColumns?.(newCols);
    }

    setDraggedColId(null);
    setDragOverColId(null);
    setTimeout(() => setIsDragReordering(false), 200);
  };

  const handleDragEnd = () => {
    setDraggedColId(null);
    setDragOverColId(null);
    setTimeout(() => setIsDragReordering(false), 200);
  };

  const extractDbId = (applicant: any): string => {
    if (applicant.dbId) return String(applicant.dbId);
    const match = String(applicant.applicantId || "").match(/(\d+)/);
    return match ? match[1] : String(applicant.applicantId || "");
  };

  const handleDeleteSingleCandidate = async (applicant: any) => {
    const candidateId = extractDbId(applicant);
    if (!candidateId) {
      toast.error("Could not find candidate ID for deletion");
      return;
    }
    if (!confirm(`Are you sure you want to delete candidate ${applicant.applicantName}?`)) return;
    try {
      await atsApi.candidates.delete(parseInt(candidateId, 10));
      toast.success(`Candidate ${applicant.applicantName} deleted successfully.`);
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete candidate.");
    }
  };

  // Submit to Job State
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [submittingJob, setSubmittingJob] = useState(false);
  const [submittedRate, setSubmittedRate] = useState("");
  const [recruiterComment, setRecruiterComment] = useState("");

  const handleOpenSubmitModal = async (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setSubmitModalOpen(true);
    setSubmittedRate("");
    setRecruiterComment("");
    try {
      const jobsList = await atsApi.jobs.list();
      const active = jobsList.filter((j: any) => j.status === "ACTIVE" || j.jobStatus === "Active");
      setActiveJobs(active);
      if (active.length > 0) {
        setSelectedJobId(active[0].id);
      }
    } catch (err) {
      console.error("Failed to load active jobs:", err);
      toast.error("Failed to load active jobs.");
    }
  };

  const handleConfirmSubmit = async () => {
    if (!selectedApplicant || !selectedJobId) return;
    setSubmittingJob(true);
    try {
      // Extract candidate integer ID
      const parts = selectedApplicant.applicantId.split("-");
      const candidateIdNum = parseInt(parts[parts.length - 1], 10);

      const currentUser = atsApi.auth.getCurrentUser();
      if (!currentUser?.id) {
        toast.error("You must be logged in to submit a candidate to a job.");
        return;
      }
      await atsApi.submissions.create({
        candidateId: candidateIdNum,
        jobId: selectedJobId,
        recruiterId: currentUser.id,
        finalStatus: "PENDING_APPROVAL",
        submittedRate: submittedRate.trim() || null,
        recruiterComment: recruiterComment.trim() || null
      });

      toast.success(`Successfully submitted ${selectedApplicant.applicantName} to job!`);
      setSubmitModalOpen(false);
      setSelectedApplicant(null);
      setSubmittedRate("");
      setRecruiterComment("");
    } catch (err: any) {
      toast.error("Failed to submit candidate: " + err.message);
    } finally {
      setSubmittingJob(false);
    }
  };

  // ── Sort ────────────────────────────────────────────────────
  const handleSort = (column: keyof Applicant) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") setSortDirection("desc");
      else setSortColumn(null);
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // ── Starred toggle ─────────────────────────────────────────
  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // ── Filtered + Sorted data ──────────────────────────────────
  const processedData = useMemo(() => {
    let result = [...data];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => {
        if (searchFilter === "All") {
          return (
            (a.applicantName || "").toLowerCase().includes(q) ||
            (a.email || "").toLowerCase().includes(q) ||
            (a.jobTitle || "").toLowerCase().includes(q) ||
            (a.city || "").toLowerCase().includes(q) ||
            (a.state || "").toLowerCase().includes(q) ||
            (a.applicantId || "").toLowerCase().includes(q)
          );
        }
        const val = a[searchFilter as keyof Applicant];
        return typeof val === "string" && val.toLowerCase().includes(q);
      });
    }

    if (sortColumn) {
      result.sort((a, b) => {
        const valA = String(a[sortColumn] || "").toLowerCase();
        const valB = String(b[sortColumn] || "").toLowerCase();
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, searchFilter, sortColumn, sortDirection]);

  // ── Paginate ────────────────────────────────────────────────
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));

  // ── Selection logic ─────────────────────────────────────────
  const handleSelectAll = (checked: boolean) => {
    onSelectionChange(checked ? paginatedData.map((a) => a.applicantId) : []);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    onSelectionChange(
      checked
        ? [...selectedRowIds, id]
        : selectedRowIds.filter((i) => i !== id)
    );
  };

  const allPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((a) => selectedRowIds.includes(a.applicantId));

  // ── Context Menu ────────────────────────────────────────────
  const handleContextMenu = (e: React.MouseEvent, applicantId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, applicantId });
  };

  const closeContextMenu = () => setContextMenu(null);

  // ── Sort icon ────────────────────────────────────────────────
  const SortIcon = ({ column }: { column: keyof Applicant }) => {
    if (sortColumn !== column)
      return <ChevronsUpDown className="h-3 w-3 opacity-30 ml-1 shrink-0" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3 ml-1 shrink-0 text-primary" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1 shrink-0 text-primary" />
    );
  };

  // ── Cell renderers ─────────────────────────────────────────
  const renderCell = (applicant: Applicant, colId: string) => {
    switch (colId) {
      case "applicantId":
        return (
          <span className="font-mono text-[10px] text-primary dark:text-blue-400 font-semibold">
            {applicant.applicantId}
          </span>
        );

      case "applicantName":
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => toggleStar(applicant.applicantId, e)}
              className="shrink-0 cursor-pointer"
            >
              <Star
                className={cn(
                  "h-3 w-3 transition-colors",
                  starredIds.includes(applicant.applicantId)
                    ? "text-yellow-500 fill-yellow-400"
                    : "text-neutral-300 dark:text-slate-600 hover:text-yellow-400"
                )}
              />
            </button>
            <a
              href={`/applicants/${applicant.applicantId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-primary dark:text-blue-400 hover:underline font-medium truncate max-w-[130px] inline-block"
            >
              {applicant.applicantName}
            </a>
          </div>
        );

      case "email":
        return (
          <a
            href={`mailto:${applicant.email}`}
            onClick={(e) => e.stopPropagation()}
            className="text-neutral-600 dark:text-neutral-400 hover:text-primary dark:hover:text-blue-400 hover:underline truncate max-w-[160px] inline-block"
          >
            {applicant.email}
          </a>
        );

      case "mobile":
        return (
          <a
            href={`tel:${applicant.mobile}`}
            onClick={(e) => e.stopPropagation()}
            className="text-neutral-600 dark:text-neutral-400 hover:text-primary dark:hover:text-blue-400 whitespace-nowrap"
          >
            {applicant.mobile}
          </a>
        );

      case "source":
        return (
          <span
            className={cn(
              "font-semibold text-[10px]",
              SOURCE_STYLES[applicant.source] ||
                "text-neutral-600 dark:text-neutral-400"
            )}
          >
            {applicant.source}
          </span>
        );

      case "status":
        return (
          <span
            className={cn(
              "inline-flex px-1.5 py-0.5 rounded-sm border text-[10px] font-semibold whitespace-nowrap",
              getStatusStyle(applicant.status)
            )}
          >
            {applicant.status}
          </span>
        );

      case "workAuthorization":
        return (
          <span
            className={cn(
              "inline-flex px-1.5 py-0.5 rounded-sm border text-[10px] font-medium whitespace-nowrap",
              getWorkAuthStyle(applicant.workAuthorization)
            )}
          >
            {applicant.workAuthorization}
          </span>
        );

      case "jobTitle":
        return (
          <span
            className="truncate max-w-[170px] inline-block font-medium text-neutral-800 dark:text-neutral-200"
            title={applicant.jobTitle}
          >
            {applicant.jobTitle}
          </span>
        );

      case "assignedJobCode":
        const jobCodeVal = (applicant as any).assignedJobCode;
        return jobCodeVal ? (
          <span className="inline-flex px-1.5 py-0.5 rounded border text-[10px] font-semibold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
            {jobCodeVal}
          </span>
        ) : (
          <span className="inline-flex px-1.5 py-0.5 rounded border text-[10px] font-normal bg-neutral-50 text-neutral-500 border-neutral-200 dark:bg-slate-800 dark:text-neutral-400">
            Unassigned (Lead)
          </span>
        );

      case "createdOn":
        return (
          <span className="text-neutral-500 dark:text-neutral-400 whitespace-nowrap text-[10px]">
            {applicant.createdOn}
          </span>
        );

      default: {
        const val = applicant[colId as keyof Applicant];
        return (
          <span
            className="truncate max-w-[130px] inline-block text-neutral-600 dark:text-neutral-400"
            title={String(val || "")}
          >
            {String(val || "")}
          </span>
        );
      }
    }
  };

  const selectedJob = activeJobs.find((j) => String(j.id) === String(selectedJobId));
  const isDomestic = selectedJob?.market === "IN";
  const rateLabel = isDomestic ? "Expected Salary (Lakhs)" : "Submitted Pay Rate ($/hr or $/yr)";
  const ratePlaceholder = isDomestic ? "e.g. 12.5" : "e.g. $70/hr";

  return (
    <div
      className="flex-1 flex flex-col min-h-0 min-w-0 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm shadow-none overflow-hidden relative font-sans"
      onClick={closeContextMenu}
    >
      {/* ── Scrollable table area ──────────────────────────── */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full border-collapse text-xs" style={{ minWidth: "900px" }}>
          {/* ── HEAD ────────────────────────────────────── */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-neutral-100 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700">
              {/* Checkbox col */}
              <th className="w-[36px] min-w-[36px] max-w-[36px] px-2.5 py-3 text-center border-r border-neutral-200 dark:border-slate-700 sticky left-0 z-30 bg-neutral-100 dark:bg-slate-800">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary cursor-pointer align-middle"
                />
              </th>

              {/* Data columns */}
              {(() => {
                let currentLeftTh = 36; // Checkbox width
                
                return selectedColumns.map((colId) => {
                  const col = allColumns.find((c) => c.id === colId);
                  if (!col) return null;
                  
                  const isSortable = [
                    "applicantId",
                    "applicantName",
                    "email",
                    "city",
                    "state",
                    "status",
                    "source",
                    "jobTitle",
                    "createdOn",
                  ].includes(colId);

                  const isAppId = colId === "applicantId";
                  const isAppName = colId === "applicantName";
                  const isSticky = isAppId || isAppName;
                  
                  let colWidth = 0;
                  if (isAppId) colWidth = 80;
                  if (isAppName) colWidth = 192;
                  
                  const style = isSticky ? { left: `${currentLeftTh}px`, minWidth: `${colWidth}px`, maxWidth: `${colWidth}px` } : {};
                  const stickyClass = isSticky ? "sticky z-30 bg-neutral-100 dark:bg-slate-800" : "";
                  const shadowClass = isAppName ? "shadow-[2px_0_5px_rgba(0,0,0,0.02)]" : "";
                  
                  if (isSticky) currentLeftTh += colWidth;

                  return (
                    <th
                      key={colId}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, colId)}
                      onDragOver={(e) => handleDragOver(e, colId)}
                      onDragLeave={() => handleDragLeave(colId)}
                      onDrop={(e) => handleDrop(e, colId)}
                      onDragEnd={handleDragEnd}
                      style={style}
                      className={cn(
                        "px-4 py-3 text-left text-[11px] font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-wider border-r border-neutral-200 dark:border-slate-700 whitespace-nowrap transition-all select-none",
                        isSortable && "cursor-pointer hover:bg-neutral-200 dark:hover:bg-slate-700",
                        draggedColId === colId && "opacity-40",
                        dragOverColId === colId && "border-l-2 border-l-primary bg-primary/10 ring-1 ring-primary/30",
                        stickyClass, shadowClass
                      )}
                      onClick={() => {
                        if (isDragReordering) return;
                        if (isSortable) handleSort(colId as keyof Applicant);
                      }}
                      title="Drag to reorder column"
                    >
                      <div className="flex items-center">
                        {col.label}
                        {isSortable && <SortIcon column={colId as keyof Applicant} />}
                      </div>
                    </th>
                  );
                });
              })()}

              {/* Actions col */}
              <th className="w-[56px] min-w-[56px] px-3 py-3 text-center text-[11px] font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-wider sticky right-0 bg-neutral-100 dark:bg-slate-800 z-20 border-l border-neutral-200 dark:border-slate-700">
                Act.
              </th>
            </tr>
          </thead>

          {/* ── BODY ────────────────────────────────────── */}
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={selectedColumns.length + 2}
                  className="text-center py-12 text-neutral-400 dark:text-neutral-500 text-sm"
                >
                  No applicants found.
                </td>
              </tr>
            ) : (
              paginatedData.map((applicant, rowIdx) => {
                const isSelected = selectedRowIds.includes(applicant.applicantId);
                const isStarred = starredIds.includes(applicant.applicantId);
                return (
                  <tr
                    key={applicant.applicantId}
                    onContextMenu={(e) =>
                      handleContextMenu(e, applicant.applicantId)
                    }
                    className={cn(
                      "border-b border-neutral-100 dark:border-slate-800 transition-colors group",
                      isSelected
                        ? "bg-blue-50 dark:bg-slate-800"
                        : rowIdx % 2 === 0
                        ? "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                        : "bg-slate-50 dark:bg-[#151e2e] hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    {/* Checkbox */}
                    <td className="w-[36px] min-w-[36px] max-w-[36px] px-2.5 py-3.5 border-r border-neutral-100 dark:border-slate-800 sticky left-0 z-20 bg-inherit text-center align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) =>
                          handleSelectRow(applicant.applicantId, e.target.checked)
                        }
                        className="h-3.5 w-3.5 accent-primary cursor-pointer align-middle"
                      />
                    </td>

                    {/* Data cells */}
                    {(() => {
                      let currentLeftTd = 36;
                      return selectedColumns.map((colId) => {
                        const isAppId = colId === "applicantId";
                        const isAppName = colId === "applicantName";
                        const isSticky = isAppId || isAppName;
                        
                        let colWidth = 0;
                        if (isAppId) colWidth = 80;
                        if (isAppName) colWidth = 192;
                        
                        const style = isSticky ? { left: `${currentLeftTd}px`, minWidth: `${colWidth}px`, maxWidth: `${colWidth}px` } : {};
                        const stickyClass = isSticky ? "sticky z-20 bg-inherit" : "";
                        const shadowClass = isAppName ? "shadow-[2px_0_5px_rgba(0,0,0,0.02)]" : "";
                        
                        if (isSticky) currentLeftTd += colWidth;

                        return (
                          <td
                            key={colId}
                            style={style}
                            className={cn("px-4 py-3.5 border-r border-neutral-100 dark:border-slate-800 text-neutral-700 dark:text-neutral-300 font-normal align-middle", stickyClass, shadowClass)}
                          >
                            {renderCell(applicant, colId)}
                          </td>
                        );
                      });
                    })()}

                    {/* Actions */}
                    <td className="w-[56px] min-w-[56px] px-3 py-3.5 text-center sticky right-0 bg-inherit z-10 border-l border-neutral-100 dark:border-slate-800 align-middle">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-1 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                              title="Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            sideOffset={4}
                            className="w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-neutral-200/90 dark:border-slate-800 rounded-xl shadow-xl shadow-slate-900/10 dark:shadow-black/50 p-1.5 animate-in fade-in-0 zoom-in-95 z-[100] font-sans"
                          >
                            <div className="space-y-0.5">
                              <div className="px-2.5 pt-1 pb-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                Candidate Actions
                              </div>

                              <DropdownMenuItem
                                onClick={() => router.push(`/applicants/${extractDbId(applicant)}`)}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <div className="h-6 w-6 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                                  <Eye className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-semibold">View Profile</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleOpenSubmitModal(applicant)}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                              >
                                <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                                  <ClipboardList className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-semibold">Submit to Job</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => router.push(`/applicants/${extractDbId(applicant)}`)}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 shadow-2xs">
                                  <Edit className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-semibold">Edit Applicant</span>
                              </DropdownMenuItem>
                            </div>

                            <DropdownMenuSeparator className="my-1 border-neutral-100 dark:border-slate-800" />

                            <div className="space-y-0.5">
                              <div className="px-2.5 pt-1 pb-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                Contact & Operations
                              </div>

                              <DropdownMenuItem
                                onClick={() => router.push(`/email?to=${encodeURIComponent(applicant.email || '')}`)}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                              >
                                <div className="h-6 w-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                                  <Mail className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-semibold">Send Email</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => window.open(`tel:${applicant.mobile || ''}`, '_self')}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                              >
                                <div className="h-6 w-6 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-2xs">
                                  <Phone className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-semibold">Call Applicant</span>
                              </DropdownMenuItem>

                              {!isRecruiter && (
                                <DropdownMenuItem
                                  onClick={() => handleDeleteSingleCandidate(applicant)}
                                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                >
                                  <div className="h-6 w-6 rounded-md bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-2xs">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="font-semibold">Delete Applicant</span>
                                </DropdownMenuItem>
                              )}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Context Menu ───────────────────────────────────── */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
          <div
            className="fixed z-50 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-sm shadow-xl py-1 min-w-44 text-xs font-sans"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {[
              { icon: Eye, label: "View Profile", action: () => {} },
              { icon: Edit, label: "Edit Applicant", action: () => {} },
              { icon: ClipboardList, label: "Submit to Job", action: () => {
                const app = data.find((a) => a.applicantId === contextMenu.applicantId);
                if (app) handleOpenSubmitModal(app);
              }},
              { icon: Mail, label: "Send Email", action: () => {} },
              { icon: Phone, label: "Call", action: () => {} },
              { icon: ExternalLink, label: "Open in New Tab", action: () => {} },
            ].map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                onClick={(e) => {
                  closeContextMenu();
                  action();
                }}
                className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Icon className="h-3.5 w-3.5 text-neutral-400" />
                {label}
              </button>
            ))}
            {!isRecruiter && (
              <>
                <div className="border-t border-neutral-100 dark:border-slate-800 my-1" />
                <button
                  onClick={closeContextMenu}
                  className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Submit to Job Dialog Modal */}
      <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Submit Candidate to Job</DialogTitle>
            <DialogDescription>
              Select an active job requisition to submit <strong>{selectedApplicant?.applicantName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="job-select" className="text-xs font-semibold text-default-700">Active Job Requisitions</label>
              {activeJobs.length === 0 ? (
                <div className="text-xs text-amber-600 italic">No active jobs found in the system.</div>
              ) : (
                <select
                  id="job-select"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-3 h-9 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                >
                  {activeJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.jobCode} - {j.jobTitle} ({j.clientName})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {activeJobs.length > 0 && (
              <>
                <div className="flex flex-col gap-2 mt-1">
                  <label htmlFor="modal-submitted-rate" className="text-xs font-semibold text-default-700">{rateLabel}</label>
                  <Input
                    id="modal-submitted-rate"
                    placeholder={ratePlaceholder}
                    value={submittedRate}
                    onChange={(e) => setSubmittedRate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  <label htmlFor="modal-recruiter-comment" className="text-xs font-semibold text-default-700">Comments</label>
                  <textarea
                    id="modal-recruiter-comment"
                    placeholder="Recruiter comments or notes..."
                    value={recruiterComment}
                    onChange={(e) => setRecruiterComment(e.target.value)}
                    className="min-h-16 text-xs bg-transparent border border-default-250 dark:border-slate-700 rounded-md p-2 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSubmitModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={submittingJob || activeJobs.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              {submittingJob ? "Submitting..." : "Submit to Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
