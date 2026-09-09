export interface Job {
  id: string;
  jobCode: string;
  jobTitle: string;
  businessUnit: string;
  client: string;
  endClientName?: string;
  clientJobId: string;
  location: string;
  states: string;
  jobStatus: "Active" | "Close" | "Filled" | "Hold by Client" | "Draft" | "Closed" | "Hold" | "Archived" | "Pending Approval";
  priority?: "Hot" | "Warm" | "Cold" | "High" | "Medium" | "Low" | "Urgent";
  clientBillRate: string;
  payRate: string;
  recruitmentManager: string;
  recruitmentManagerId?: string;
  primaryRecruiter: string;
  primaryRecruiterId?: string | null;
  assignedTo: string;
  createdBy: string;
  createdOn: string;
  modifiedOn: string;
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
  assignedApproverRole?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
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
    client: api.client || api.clientName || "",
    endClientName: api.endClientName || api.endClient || api.client || "",
    clientJobId: api.clientJobId || "N/A",
    location: api.location || api.jobLocation || "",
    states: api.state || api.states || "",
    jobStatus: (api.jobStatus || api.status || "Active") as any,
    priority: api.priority || api.urgency || "Warm",
    clientBillRate: api.clientBillRate || "N/A",
    payRate: api.payRate || "N/A",
    recruitmentManager: api.recruitmentManager || "N/A",
    recruitmentManagerId: api.recruitmentManagerId || undefined,
    primaryRecruiter: api.primaryRecruiter || "N/A",
    primaryRecruiterId: api.primaryRecruiterId || undefined,
    assignedTo: api.assignedTo || "N/A",
    createdBy: api.createdBy || "System Admin",
    createdOn: api.createdOn || api.createdAt || new Date().toISOString().split("T")[0],
    modifiedOn: api.modifiedOn || api.updatedAt || api.createdOn || new Date().toISOString().split("T")[0],
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
    assignedApproverRole: api.assignedApproverRole || null,
    approvedBy: api.approvedBy || null,
    approvedAt: api.approvedAt || null,
    rejectionReason: api.rejectionReason || null,
  };
}

export const mockJobsIN: Job[] = [];
export const mockJobs: Job[] = [];
