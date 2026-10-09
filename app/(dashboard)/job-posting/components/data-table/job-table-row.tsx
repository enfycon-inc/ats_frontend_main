"use client";


import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  AlertTriangle,
  Archive,
  CheckSquare,
  Users,
  Sparkles,
  Pencil,
  UserPlus,
  Copy,
  CheckCircle,
  XCircle,
  Plus,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { atsApi } from "@/lib/ats-api";
import { Job } from "../../data/mock-jobs";
import {
  getAssignedPersonDisplay,
  formatDateTimeDisplay,
  isJobRecent,
} from "../../lib/job-table-utils";
import { JobPodHoverCard } from "./job-pod-hover-card";


export interface JobTableRowProps {
  job: Job;
  idx: number;
  isSelected: boolean;
  onToggleSelect: (jobId: string, checked: boolean) => void;
  activeSelectedColumns: string[];
  hasEditPermission: boolean;
  hasCreatePermission: boolean;
  hasSubmitCandidatePermission: boolean;
  hasDelegatePermission: boolean;
  hasApprovePermission: boolean;
  currentUser: any;
  currentUserBranchId: string | null | undefined;
  onContextMenu: (e: React.MouseEvent, jobId: string) => void;
  onOpenApproveModal: (job: Job) => void;
  onOpenRejectModal: (job: Job) => void;
  onOpenAssignModal: (job: Job) => void;
  onOpenSourceModal: (job: Job) => void;
  onOpenDelegateModal: (job: Job) => void;
  onOpenStatusModal: (job: Job, status?: string) => void;
  onUpdateJob?: (jobId: string, updatedFields: Partial<Job>) => void;
  onRefresh?: () => void;
}

export function JobTableRow({
  job,
  idx,
  isSelected,
  onToggleSelect,
  activeSelectedColumns,
  hasEditPermission,
  hasCreatePermission,
  hasSubmitCandidatePermission,
  hasDelegatePermission,
  hasApprovePermission,
  currentUser,
  currentUserBranchId,
  onContextMenu,
  onOpenApproveModal,
  onOpenRejectModal,
  onOpenAssignModal,
  onOpenSourceModal,
  onOpenDelegateModal,
  onOpenStatusModal,
  onUpdateJob,
  onRefresh,
}: JobTableRowProps) {
  const isTenantAdmin = Boolean(currentUser?.permissions?.some((p: string) => ["tenant:manage", "tenant:settings"].includes(p)));
  const isDelegatedView = Boolean(!isTenantAdmin && currentUserBranchId && job.branchId && currentUserBranchId !== job.branchId);

  const router = useRouter();

  return (
    <tr
      onContextMenu={(e) => onContextMenu(e, job.id)}
      className={cn(
        "group transition-colors cursor-default border-b border-neutral-200 dark:border-slate-800/80",
        isSelected
          ? "bg-primary/10 hover:bg-primary/10 dark:bg-primary/15 dark:hover:bg-primary/15"
          : idx % 2 === 0
          ? "bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-slate-800/60"
          : "bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-slate-800/60"
      )}
    >
      {/* Checkbox (Sticky Left) */}
      <td
        className={cn(
          "sticky left-0 z-10 w-[44px] min-w-[44px] px-3.5 py-4 text-center border-r border-neutral-200 dark:border-slate-800 transition-colors duration-150",
          isSelected
            ? "bg-blue-50/95 dark:bg-blue-950/95"
            : idx % 2 === 0
            ? "bg-white dark:bg-slate-900 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/60"
            : "bg-slate-50 dark:bg-slate-800/40 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/60"
        )}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleSelect(job.id, e.target.checked)}
          className="h-3.5 w-3.5 accent-primary cursor-pointer rounded-xs"
        />
      </td>

      {/* Columns */}
      {activeSelectedColumns.map((colId) => {
        return (
          <td
            key={colId}
            className="py-4 px-4 border-r border-neutral-200/80 dark:border-slate-800/80 whitespace-nowrap font-normal text-slate-850 dark:text-slate-200 text-xs transition-colors relative"
          >
            {colId === "client" || colId === "endClientName" ? (
              <span className="font-medium text-slate-900 dark:text-slate-100">{String(job[colId as keyof Job] || "N/A")}</span>
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
                const isPending =
                  job.jobStatus === "Pending Approval" ||
                  job.approvalStatus === "PENDING_APPROVAL";
                const status = isPending ? "Pending Approval" : job.jobStatus || "Active";

                const isAssignedReviewer = Boolean(
                  job.assignedApproverId &&
                    (currentUser?.id === job.assignedApproverId ||
                      (currentUser as any)?.dbId === job.assignedApproverId ||
                      (currentUser as any)?.keycloakId === job.assignedApproverId)
                );

                const isJobCreator = Boolean(
                  (job.createdBy &&
                    currentUser?.fullName &&
                    job.createdBy.toLowerCase() === currentUser.fullName.toLowerCase()) ||
                    (job.createdBy &&
                      currentUser?.email &&
                      job.createdBy.toLowerCase() === currentUser.email.toLowerCase()) ||
                    (job.createdBy && currentUser?.id && job.createdBy === currentUser.id)
                );

                const isAdminOrDeliveryHead = Boolean(
                  currentUser?.roles?.some((r: string) => {
                    const norm = r.toUpperCase().replace(/[\s-_]+/g, "");
                    return (
                      norm === "SUPERADMIN" ||
                      norm === "TENANT_ADMIN" ||
                      norm === "DELIVERYHEAD" ||
                      norm === "BRANCHADMIN"
                    );
                  })
                );

                const canApproveThisJob =
                  isPending &&
                  (isAssignedReviewer ||
                    (hasApprovePermission && (!isJobCreator || isAdminOrDeliveryHead)));

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
                            onOpenApproveModal(job);
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
                            onOpenRejectModal(job);
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
                  <button
                    type="button"
                    disabled={!hasEditPermission || isPending || Boolean(job.approvalStatus && job.approvalStatus !== "APPROVED")}
                    aria-label={`Edit status for ${job.jobCode}`}
                    title="Edit Status"
                    onClick={(event) => { event.stopPropagation(); onOpenStatusModal(job); }}
                    className={cn(
                      "inline-flex items-center justify-center px-2 py-0.5 rounded text-[10.5px] font-bold tracking-wide uppercase select-none border enabled:cursor-pointer enabled:hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
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
                  </button>
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
                {job.priority === "Hot" || job.priority === "High" || job.priority === "Urgent"
                  ? "Hot"
                  : job.priority === "Cold" || job.priority === "Low"
                  ? "Cold"
                  : "Warm"}
              </Badge>
            ) : colId === "podName" ? (
              isDelegatedView ? (
                 <span className="text-neutral-400 italic text-[11px]">Hidden</span>
              ) : job.podName ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40 rounded-md px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                    <Users className="h-2.5 w-2.5 shrink-0 text-purple-600 dark:text-purple-400" />
                    {job.podName}
                  </span>
                </div>
              ) : (
                <span className="text-neutral-400 dark:text-neutral-600 italic text-[10px]">
                  Unassigned
                </span>
              )
            ) : colId === "jobTitle" ? (
              (() => {
                const isRecent = isJobRecent(job);
                const statusLabel = isRecent ? "NEW" : null;
                const statusClasses =
                  "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40";
                const isCoSourced =
                  (job as any).isCoSourced ||
                  ((job as any).sharedBranchIds && (job as any).sharedBranchIds.length > 0);

                const rawPriority = String(
                  job.priority || (job as any).urgency || "Warm"
                ).toUpperCase();
                const isHot =
                  rawPriority.includes("HOT") ||
                  rawPriority.includes("HIGH") ||
                  rawPriority.includes("URGENT");
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
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border select-none leading-none shrink-0",
                          statusClasses
                        )}
                      >
                        {statusLabel}
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border select-none leading-none shrink-0",
                        priorityClasses
                      )}
                    >
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
                  {String(
                    job.createdBy ||
                      (job as any).creator_name ||
                      (job as any).created_by ||
                      "Account Manager"
                  )}
                </span>
                {((job as any).creatorEmail || (job as any).creator_email) && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[160px]">
                    {(job as any).creatorEmail || (job as any).creator_email}
                  </span>
                )}
              </div>
            ) : colId === "businessUnit" ? (
              <div className="flex flex-col leading-tight py-0.5 min-w-[120px]">
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[160px]">
                  {job.branchName || "Main Office"}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[160px]">
                  ({job.businessUnit || "N/A"})
                </span>
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
                const formatted = formatDateTimeDisplay(
                  job.createdOn || (job as any).createdAt,
                  job
                );
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
                const formatted = formatDateTimeDisplay(
                  job.modifiedOn || (job as any).updatedAt || job.createdOn,
                  job
                );
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
            ) : colId === "recruiter" ? (
              <span className="text-xs text-neutral-800 dark:text-neutral-200">
                {String(job.recruiter || "N/A")}
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
                    <JobPodHoverCard 
                      podIds={assignInfo.pods?.ids || []}
                      recruiterNames={assignInfo.recruiters?.names || []}
                        recruiterIds={assignInfo.recruiters?.ids || []}
                    >
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      {assignInfo.pods && (
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 shrink-0 max-w-[155px]"
                          >
                            <Icon
                              icon="heroicons:squares-plus"
                              className="h-3 w-3 shrink-0 text-purple-600 dark:text-purple-400"
                            />
                            <span className="truncate">{assignInfo.pods.label}</span>
                            {assignInfo.pods.count > 1 && (
                              <span className="ml-0.5 px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 text-[9px] font-bold">
                                +{assignInfo.pods.count - 1}
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {assignInfo.recruiters && (
                        <div
                          className="flex items-center gap-1 flex-wrap min-w-0"
                          title={`Assigned Recruiter(s): ${assignInfo.recruiters.names.join(", ")}`}
                        >
                          {assignInfo.recruiters.names.slice(0, 2).map((name, i) => (
                            <span
                              key={i}
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
                    </JobPodHoverCard>
                  );
                })()}
                {hasEditPermission && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAssignModal(job);
                    }}
                    className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 rounded transition-colors cursor-pointer shrink-0 ml-auto"
                    title="Assign Pod / Recruiters (+)"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : colId === "payRate" || colId === "clientBillRate" ? (
              (() => {
                if (colId === "clientBillRate" && isDelegatedView) return <span className="text-neutral-400 italic text-[11px]">Hidden</span>;
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
      <td
        className={cn(
          "sticky right-0 z-10 w-[64px] min-w-[64px] px-3 py-4 text-center border-l border-neutral-200 dark:border-slate-800 transition-colors duration-150",
          isSelected
            ? "bg-blue-50/95 dark:bg-blue-950/95"
            : idx % 2 === 0
            ? "bg-white dark:bg-slate-900 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/60"
            : "bg-slate-50 dark:bg-slate-800/40 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/60"
        )}
      >
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 hover:bg-[#1a4fa0]/10 dark:hover:bg-slate-800 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-[#1a4fa0] dark:hover:text-blue-400 transition-colors cursor-pointer"
                title="Actions"
              >
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

                  {hasSubmitCandidatePermission && (
                    <DropdownMenuItem
                      onClick={() => onOpenSourceModal(job)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                        <UserPlus className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-semibold">Submit Candidate</span>
                    </DropdownMenuItem>
                  )}

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
              {(hasEditPermission ||
                hasCreatePermission ||
                (hasDelegatePermission && job.branchId === currentUserBranchId)) && (
                <>
                  {job.jobStatus !== "Draft" && (
                    <DropdownMenuSeparator className="my-1 border-neutral-100 dark:border-slate-800" />
                  )}

                  <div className="space-y-0.5">
                    <div className="px-2.5 pt-1 pb-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Job Actions
                    </div>

                    {hasEditPermission &&
                      (job.jobStatus === "Pending Approval" ||
                        job.approvalStatus === "PENDING_APPROVAL") && (
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
                              const reason = window.prompt(
                                "Enter rejection feedback for Account Manager:"
                              );
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

                    {hasEditPermission && job.jobStatus !== 'Pending Approval' && (!job.approvalStatus || job.approvalStatus === 'APPROVED') && <DropdownMenuItem onSelect={() => onOpenStatusModal(job)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 shadow-2xs"><Pencil className="h-3.5 w-3.5" /></div><span className="font-semibold">Edit Status</span></DropdownMenuItem>}
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
                      <DropdownMenuItem
                        onClick={() => router.push(`/job-posting/${job.id}/edit`)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 shadow-2xs">
                          <Pencil className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-semibold">Edit Job</span>
                      </DropdownMenuItem>
                    )}

                    {hasDelegatePermission && job.branchId === currentUserBranchId && (
                      <DropdownMenuItem
                        onClick={() => onOpenDelegateModal(job)}
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
      </td>
    </tr>
  );
}
