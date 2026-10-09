import type { JobStatus } from '@/lib/job-status-contract';
export interface Job {
  id: string;
  jobCode: string;
  jobTitle: string;
  businessUnit: string;
  businessUnitId?: string | null;
  businessUnitRef?: any;
  business_unit_id?: string | null;
  client: string;
  endClientName?: string;
  clientJobId: string;
  location: string;
  states: string;
  jobStatus: JobStatus | "Close" | "Hold";
  priority?: "Hot" | "Warm" | "Cold" | "High" | "Medium" | "Low" | "Urgent";
  clientBillRate: string;
  payRate: string;
  recruitmentManager: string;
  recruitmentManagerId?: string;
  recruiter: string;
  recruiterId?: string | null;
  
  createdBy: string;
  createdOn: string;
  modifiedOn: string;
  createdAt?: string;
  updatedAt?: string;
  creatorEmail?: string | null;
  jobTimezone?: string;
  submissionsCount: number;
  pipeline: {
    applied: number;
    interviewing: number;
    offered: number;
  };
  agingDays: number;
  /** Recruitment pod assigned via round-robin on job creation */
  podId?: string | null;
  podName?: string | null;
  branchId?: string;
  branchName?: string;
  respondBy?: string;
  noticePeriod?: string;
  market?: "US" | "IN";
  visaType?: string;
  jobDescription?: string;
  skillsRequired?: string[];
  noOfPositions?: number;
  submissionRequired?: number;
  jobType?: string;
  approvalStatus?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  assignedApproverId?: string | null;
  assignedApproverName?: string | null;
  
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  isCoSourced?: boolean;
  sharedBranchIds?: string[];
  marginSplitAmPct?: number | null;
  marginSplitRecPct?: number | null;
}

/**
 * Maps a backend JobPayload response to the frontend Job interface.
 * Handles field name differences (state→states, jobTitle mapping, etc.)
 */
export function mapApiJobToJob(api: any): Job {
  return {
    id: api.id,
    jobCode: api.jobCode || "",
    jobTitle: api.jobTitle || "",
    businessUnit: api.businessUnit || api.branchName || "Main Office",
    businessUnitId: api.businessUnitId || api.business_unit_id || undefined,
    business_unit_id: api.businessUnitId || api.business_unit_id || undefined,
    businessUnitRef: api.businessUnitRef || undefined,
    client: api.client || api.clientName || "",
    endClientName: api.endClientName || api.endClient || api.client || "",
    clientJobId: api.clientJobId || "N/A",
    location: api.location || api.jobLocation || "",
    states: api.state || api.states || "",
    jobStatus: (api.jobStatus || api.status || "Active") as any,
    priority: (() => {
      const p = String(api.priority || api.urgency || "Warm").toUpperCase();
      if (p.includes("HOT") || p.includes("HIGH") || p.includes("URGENT")) return "Hot";
      if (p.includes("COLD") || p.includes("LOW")) return "Cold";
      return "Warm";
    })(),
    clientBillRate: api.clientBillRate || "N/A",
    payRate: api.payRate || "N/A",
    recruitmentManager: api.recruitmentManager || "N/A",
    recruitmentManagerId: api.recruitmentManagerId || undefined,
    recruiter: api.recruiter || "N/A",
    recruiterId: api.recruiterId || undefined,
    
    createdBy: api.createdBy || "System Admin",
    createdOn: api.createdAt || api.createdOn || new Date().toISOString(),
    modifiedOn: api.updatedAt || api.modifiedOn || api.createdAt || api.createdOn || new Date().toISOString(),
    createdAt: api.createdAt || api.createdOn || undefined,
    updatedAt: api.updatedAt || api.modifiedOn || undefined,
    creatorEmail: api.creatorEmail || api.creator_email || undefined,
    jobTimezone: api.jobTimezone || api.job_timezone || undefined,
    submissionsCount: api.submissionsCount || 0,
    pipeline: api.pipeline || { applied: 0, interviewing: 0, offered: 0 },
    agingDays: api.agingDays || 0,
    podId: api.podId || undefined,
    podName: api.podName || undefined,
    branchId: api.branchId || undefined,
    branchName: api.branchName || undefined,
    respondBy: api.respondBy || "",
    noticePeriod: api.noticePeriod || "30 Days",
    market: api.market || "IN",
    visaType: api.visaType || "Indian Citizen",
    jobDescription: api.description || api.jobDescription || "",
    skillsRequired: api.skillsRequired || [],
    noOfPositions: api.noOfPositions || 1,
    submissionRequired: api.submissionRequired || 5,
    jobType: api.jobType || "Full Time",
    approvalStatus: api.approvalStatus || (api.status === "Pending Approval" ? "PENDING_APPROVAL" : "APPROVED"),
    assignedApproverId: api.assignedApproverId || null,
    assignedApproverName: api.assignedApproverName || null,
    
    approvedBy: api.approvedBy || null,
    approvedAt: api.approvedAt || null,
    rejectionReason: api.rejectionReason || null,
    isCoSourced: !!api.isCoSourced,
    sharedBranchIds: api.sharedBranchIds || [],
    marginSplitAmPct: api.marginSplitAmPct || null,
    marginSplitRecPct: api.marginSplitRecPct || null,
  };
}

export const mockJobsIN: Job[] = [];
export const mockJobs: Job[] = [];
