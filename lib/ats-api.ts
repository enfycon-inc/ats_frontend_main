
/**
 * ats-api.ts — Typed API client for the NestJS ATS backend
 *
 * All API calls go through this file. It handles:
 * - Token storage in localStorage
 * - Auto-attaching Bearer token on every request
 * - Login/logout flow
 * - Typed request/response for Jobs, Auth, etc.
 *
 * Usage:
 *   import { atsApi } from '@/lib/ats-api';
 *   const jobs = await atsApi.jobs.list();
 *   await atsApi.auth.login(userEmail, userPassword);
 */

import { getTenantIdentifier, getBaseDomain } from '@/utils/subdomain-helper';

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // 1. Local development environment
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1') {
      return process.env.NEXT_PUBLIC_API_URL || `http://127.0.0.1:5000`;
    }

    // 2. Explicit environment variable if provided
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }

    // 3. Dynamic production domain resolution (e.g., deb.enfyjobs.com -> https://api.enfyjobs.com)
    const baseDomain = getBaseDomain(hostname);
    const protocol = window.location.protocol;
    return `${protocol}//api.${baseDomain}`;
  }

  // Server-side execution inside container
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://backend:5000';
}

// ─── Token Management ──────────────────────────────────────────────
const TOKEN_KEY = 'ats_access_token';
const REFRESH_TOKEN_KEY = 'ats_refresh_token';
const USER_KEY = 'ats_current_user';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setRefreshToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
}

function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

function setCurrentUser(user: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

function getCurrentUser(): any | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function getOrFetchToken(): Promise<string | null> {
  let token = getToken();
  if (token) return token;

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (res.ok) {
        const session = await res.json();
        if (session?.user?.accessToken) {
          token = session.user.accessToken;
          setToken(token!);
          if (session.user) {
            setCurrentUser({
              id: session.user.id,
              email: session.user.email,
              fullName: session.user.name,
              roles: session.user.roles,
              tenantId: session.user.tenantId,
              defaultMarket: session.user.defaultMarket,
              permissions: session.user.permissions || [],
              systemRole: session.user.systemRole || 'RECRUITER',
              podId: session.user.podId || null,
            });
          }
          return token;
        }
      }
    } catch (e) {
      console.warn('Could not retrieve token from NextAuth session', e);
    }
  }
  return null;
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function tryAutoRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.accessToken) {
        setToken(data.accessToken);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        return data.accessToken;
      }
    }
  } catch (e) {
    console.error('Auto token refresh failed:', e);
  }

  clearToken();
  return null;
}

// ─── HTTP Helper ────────────────────────────────────────────────────
async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  let token = getToken();
  if (!token && typeof window !== 'undefined' && !path.includes('/api/auth/login') && !path.includes('/api/auth/register')) {
    token = await getOrFetchToken();
  }
  const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (activeBranchId) {
    headers['x-branch-id'] = activeBranchId;
  }

  let res: Response;
  try {
    const apiBase = getApiBase();
    res = await fetch(`${apiBase}${path}`, {
      cache: 'no-store',
      ...options,
      headers,
    });
  } catch (err: any) {
    const apiBase = getApiBase();
    if (err?.name === 'TypeError' || err?.message?.includes('fetch')) {
      throw new Error(`Unable to reach the backend service at ${apiBase}. Please ensure the backend server is running.`);
    }
    throw err;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const isExpired = res.status === 401 || (body.message && body.message.toLowerCase().includes('expired'));

    // Attempt automatic token refresh if token expired and retry once
    if (isExpired && !isRetry && getRefreshToken()) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await tryAutoRefresh();
        isRefreshing = false;
        if (newToken) {
          onRefreshed(newToken);
          return apiFetch<T>(path, options, true);
        }
      } else {
        // Wait for active refresh to finish
        const retryObj = new Promise<T>((resolve, reject) => {
          refreshSubscribers.push((newToken: string) => {
            apiFetch<T>(path, options, true).then(resolve).catch(reject);
          });
        });
        return retryObj;
      }
    }

    const errMsg = body.message || `API Error: ${res.status}`;
    if (typeof window !== 'undefined' && (res.status === 403 || res.status === 401)) {
      const event = new CustomEvent("app_show_error_modal", {
        detail: { message: errMsg, title: res.status === 403 ? "Permission Access Required" : "Authentication Required" },
      });
      window.dispatchEvent(event);
    }
    throw new Error(errMsg);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ─── Auth API ───────────────────────────────────────────────────────
const auth = {
  async login(email: string, password: string) {
    const subdomain = getTenantIdentifier();
    const data = await apiFetch<{
      accessToken: string;
      refreshToken?: string;
      expiresIn: number;
      tokenType: string;
      user: {
        id: string;
        email: string;
        fullName: string;
        roles: string[];
        tenantId: string;
        tenantDomain: string;
      };
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, subdomain }),
    });

    setToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    setCurrentUser(data.user);
    return data;
  },

  async me() {
    return apiFetch('/api/auth/me');
  },

  logout() {
    clearToken();
  },

  async getProfile(userId?: string): Promise<any> {
    const uid = userId || getCurrentUser()?.id;
    if (!uid) return null;
    return apiFetch<any>(`/api/auth/profile/${uid}`);
  },

  setCurrentUser(user: any) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  getToken,
  getCurrentUser,
  isAuthenticated(): boolean {
    return !!getToken();
  },

  async listPendingApprovals(): Promise<any[]> {
    return apiFetch<any[]>('/api/auth/approvals/pending');
  },

  async approveUser(
    userId: string,
    market: string,
    subdomain?: string,
    userLimit?: number,
    maxBranches?: number,
  ): Promise<any> {
    return apiFetch<any>(`/api/auth/approvals/approve/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ market, subdomain, userLimit, maxBranches }),
    });
  },

  async createManualTenant(data: {
    companyName: string;
    subdomain: string;
    adminFullName: string;
    adminEmail: string;
    adminPassword?: string;
    userLimit?: number;
    maxBranches?: number;
    defaultMarket?: string;
  }): Promise<any> {
    return apiFetch<any>('/api/auth/tenants/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async listTenants(): Promise<any[]> {
    return apiFetch<any[]>('/api/auth/tenants');
  },

  async updateTenantStatus(tenantId: string, status: string): Promise<any> {
    return apiFetch<any>(`/api/auth/tenants/${tenantId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async updateTenantUserLimit(tenantId: string, limit: number): Promise<any> {
    return apiFetch<any>(`/api/auth/tenants/${tenantId}/user-limit`, {
      method: 'PATCH',
      body: JSON.stringify({ limit }),
    });
  },

  async updateTenantBranchLimit(tenantId: string, limit: number): Promise<any> {
    return apiFetch<any>(`/api/auth/tenants/${tenantId}/branch-limit`, {
      method: 'PATCH',
      body: JSON.stringify({ limit }),
    });
  },

  async updateTenantMarket(tenantId: string, market: string): Promise<any> {
    return apiFetch<any>(`/api/auth/tenants/${tenantId}/market`, {
      method: 'PATCH',
      body: JSON.stringify({ market }),
    });
  },

  async updateMySubdomain(subdomain: string): Promise<any> {
    return apiFetch<any>(`/api/auth/tenants/my-subdomain`, {
      method: 'PATCH',
      body: JSON.stringify({ subdomain }),
    });
  },

  async registerUser(data: {
    email: string;
    fullName: string;
    password: string;
    role: string;
    tenantId: string;
    isApproved: boolean;
    sendEmailInvite?: boolean;
  }): Promise<any> {
    return apiFetch<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async listUsers(tenantId?: string): Promise<any[]> {
    const headers: Record<string, string> = {};
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }
    return apiFetch<any[]>('/api/auth/users', { headers });
  },

  async setUserStatus(userId: string, isActive: boolean): Promise<any> {
    return apiFetch<any>(`/api/auth/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  async updateUserDetail(userId: string, data: { fullName?: string; email?: string; password?: string; branchId?: string; assignedBranchIds?: string[]; branchRoles?: Record<string, string[]>; businessUnitId?: string; roles?: string[] }): Promise<any> {
    return apiFetch<any>(`/api/auth/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async registerTenant(data: {
    companyName: string;
    subdomain: string;
    email: string;
    fullName: string;
    password: string;
  }): Promise<any> {
    return apiFetch<any>('/api/auth/register-tenant', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async listAllPermissions(): Promise<any[]> {
    return apiFetch<any[]>('/api/auth/rbac/permissions');
  },

  async listRoles(): Promise<any[]> {
    return apiFetch<any[]>('/api/auth/rbac/roles');
  },

  async listAssignableRoles(): Promise<any[]> {
    return apiFetch<any[]>('/api/auth/rbac/assignable-roles');
  },

  async createCustomRole(data: {
    name: string;
    description: string;
    permissions: string[];
    systemRole?: string;
  }): Promise<any> {
    return apiFetch<any>('/api/auth/rbac/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRolePermissions(roleId: string, permissions: string[]): Promise<any> {
    return apiFetch<any>(`/api/auth/rbac/roles/${roleId}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    });
  },

  async deleteCustomRole(roleId: string, targetRoleId?: string): Promise<any> {
    const query = targetRoleId ? `?targetRoleId=${encodeURIComponent(targetRoleId)}` : '';
    return apiFetch<any>(`/api/auth/rbac/roles/${roleId}${query}`, {
      method: 'DELETE',
    });
  },


  async assignUserRoles(userId: string, roleIds: string[]): Promise<any> {
    return apiFetch<any>(`/api/auth/rbac/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roleIds }),
    });
  },

  async listMyDomains(): Promise<any[]> {
    return apiFetch<any[]>('/api/auth/tenants/my-domains');
  },

  async addMyDomain(domainName: string): Promise<any> {
    return apiFetch<any>('/api/auth/tenants/my-domains', {
      method: 'POST',
      body: JSON.stringify({ domainName }),
    });
  },

  async deleteMyDomain(domainId: string): Promise<any> {
    return apiFetch<any>(`/api/auth/tenants/my-domains/${domainId}`, {
      method: 'DELETE',
    });
  },

  async updateMySettings(settings: {
    podSystemEnabled?: boolean;
    candidatePoolMode?: string;
    jobAssignmentMode?: string;
    jobAssignmentOptions?: any;
  }): Promise<any> {
    return apiFetch<any>('/api/auth/tenants/my-settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },

  async getTenantDetails(tenantId: string): Promise<any> {
    return apiFetch<any>(`/api/auth/tenants/${tenantId}/details`);
  },

  async ssoLogin(
    provider: 'google' | 'microsoft',
    email: string,
    name?: string,
    microsoftTenantId?: string,
    picture?: string
  ) {
    const subdomain = getTenantIdentifier();
    const data = await apiFetch<{
      accessToken: string;
      refreshToken?: string;
      expiresIn: number;
      tokenType: string;
      user: any;
    }>('/api/auth/sso-login', {
      method: 'POST',
      body: JSON.stringify({
        provider,
        email,
        name,
        subdomain,
        microsoftTenantId,
        picture,
      }),
    });

    setToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    setCurrentUser(data.user);
    return data;
  },

  async inviteUser(data: {
    email: string;
    fullName: string;
    roleId?: string;
    systemRole?: string;
    branchId?: string;
    podId?: string;
    sendEmailInvite?: boolean;
  }): Promise<any> {
    return apiFetch<any>('/api/auth/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getInvitationDetails(token: string): Promise<any> {
    return apiFetch<any>(`/api/auth/invitation/${encodeURIComponent(token)}`);
  },

  async acceptInvite(token: string, password: string): Promise<any> {
    return apiFetch<any>('/api/auth/accept-invite', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  async getTenantAuthPolicy(subdomain?: string): Promise<any> {
    const sub = subdomain || getTenantIdentifier();
    const query = sub ? `?subdomain=${encodeURIComponent(sub)}` : '';
    return apiFetch<any>(`/api/auth/tenant-auth-policy${query}`);
  },

  async updateTenantAuthPolicy(policy: any): Promise<any> {
    return apiFetch<any>('/api/auth/tenant-auth-policy', {
      method: 'PATCH',
      body: JSON.stringify(policy),
    });
  },

  async verifyMyDomain(domainName: string): Promise<any> {
    return apiFetch<any>('/api/auth/tenants/my-domains/verify', {
      method: 'POST',
      body: JSON.stringify({ domainName }),
    });
  },
};

// ─── Email API ───────────────────────────────────────────────────────
const email = {
  async getAccounts(): Promise<any[]> {
    return apiFetch<any[]>('/email/accounts');
  },
  async getPreferences(): Promise<any[]> {
    return apiFetch<any[]>('/email/preferences');
  },
  async savePreference(actionName: string, accountId: string): Promise<any> {
    return apiFetch<any>('/email/preferences', {
      method: 'POST',
      body: JSON.stringify({ actionName, accountId }),
    });
  },
  async addCustomAccount(data: Record<string, any>): Promise<any> {
    return apiFetch<any>('/email/accounts/custom', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async deleteAccount(id: string): Promise<any> {
    return apiFetch<any>(`/email/accounts/${id}/delete`, {
      method: 'POST',
    });
  },
  async setDefaultAccount(id: string): Promise<any> {
    return apiFetch<any>(`/email/accounts/${id}/default`, {
      method: 'POST',
    });
  },
  async shareAccount(id: string, data: { sharedWithAll: boolean; sharedWithUsers: string[]; sharedWithBranches: string[] }): Promise<any> {
    return apiFetch<any>(`/email/accounts/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async getCampaigns(): Promise<any[]> {
    return apiFetch<any[]>('/email/campaigns');
  },
  async getActiveCampaign(): Promise<any> {
    return apiFetch<any>('/email/campaigns/active');
  },
  async getCampaignStatus(id: string): Promise<any> {
    return apiFetch<any>(`/email/campaigns/${id}/status`);
  },
  async getCampaignRecipients(id: string): Promise<any[]> {
    return apiFetch<any[]>(`/email/campaigns/${id}/recipients`);
  },
  async createCampaign(data: Record<string, any>): Promise<any> {
    return apiFetch<any>('/email/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async cancelCampaign(id: string): Promise<any> {
    return apiFetch<any>(`/email/campaigns/${id}/cancel`, {
      method: 'POST',
    });
  },
  async getTemplates(): Promise<any[]> {
    return apiFetch<any[]>('/email/templates');
  },
  async getDeliverySettings(branchId?: string): Promise<{ ratePerMinute: number; ratePerHour: number; randomizeDelay: boolean }> {
    const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return apiFetch<{ ratePerMinute: number; ratePerHour: number; randomizeDelay: boolean }>(`/email/delivery-settings${query}`);
  },
  async saveDeliverySettings(data: { branchId?: string; ratePerMinute?: number; ratePerHour?: number; randomizeDelay?: boolean }): Promise<any> {
    return apiFetch<any>('/email/delivery-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async getTenantEmailSettings(): Promise<{
    dispatchMode: 'DEFAULT_SUBDOMAIN' | 'DIRECT_ACCOUNT' | 'CUSTOM_DOMAIN';
    defaultSubdomainSender: string;
    customDomain: string;
    customDomainVerified: boolean;
    dnsRecords: Array<{ type: string; host: string; value: string; purpose: string; status: string }>;
    connectedAccounts: Array<{ id: string; provider: string; email: string; profileName?: string; isDefault: boolean; isActive: boolean }>;
    defaultAccount: any;
  }> {
    return apiFetch('/email/tenant-settings');
  },
  async setTenantEmailMode(mode: string): Promise<any> {
    return apiFetch('/email/tenant-settings/mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },
  async setTenantCustomDomain(customDomain: string): Promise<any> {
    return apiFetch('/email/tenant-settings/custom-domain', {
      method: 'POST',
      body: JSON.stringify({ customDomain }),
    });
  },
  async verifyTenantCustomDomain(): Promise<any> {
    return apiFetch('/email/tenant-settings/verify-domain', {
      method: 'POST',
    });
  },
  async sendTestTenantEmail(recipientEmail?: string): Promise<any> {
    return apiFetch('/email/tenant-settings/test-email', {
      method: 'POST',
      body: JSON.stringify({ recipientEmail }),
    });
  },
};


// ─── Jobs API ───────────────────────────────────────────────────────
export interface JobPayload {
  id: string;
  jobCode: string;
  jobTitle: string;
  businessUnit: string;
  client: string;
  clientJobId: string;
  location: string;
  state: string;
  country: string;
  type: string;
  description: string;
  skillsRequired: string[];
  secondarySkills: string[];
  jobStatus: string;
  createdOn: string;
  modifiedOn: string;
  visaType: string;
  clientBillRate: string;
  payRate: string;
  taxTerms: string;
  endClientName: string;
  noOfPositions: number;
  submissionRequired: number;
  submissionDone: number;
  priority: string;
  remoteJob: string;
  startDate: string | null;
  endDate: string | null;
  hoursPerWeek: number;
  duration: string;
  accountManagerId: string;
  recruitmentManagerId: string;
  recruitmentManager: string;
  primaryRecruiterId: string;
  primaryRecruiter: string;
  assignedTo: string;
  createdBy: string;
  industry: string;
  degree: string;
  expMin: number;
  expMax: number;
  submissionsCount: number;
  agingDays: number;
  pipeline: { applied: number; interviewing: number; offered: number };
  podId?: string;
  podName?: string;
  market?: string;
  city?: string;
  noticePeriod?: string;
  respondBy?: string;
  approvalStatus?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  assignedApproverId?: string | null;
  assignedApproverName?: string | null;
  assignedApproverRole?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
}

export interface CandidateMatch {
  candidateId: number;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  currentTitle: string;
  source: string;
  workAuthorization: string;
  experienceYears: number;
  matchScore: number;
  matchTier: 'Strong' | 'Good' | 'Fair' | 'Low';
  matchedSkills: string[];
  missingSkills: string[];
  currentCTC?: number | null;
  expectedCTC?: number | null;
  noticePeriodDays?: number;
  servingNotice?: boolean;
  lastWorkingDay?: string | null;
  preferredLocations?: string[];
  breakdown: {
    primarySkills: string;
    secondarySkills: string;
    experienceFit: number;
    semantic: number | null;
  };
}

export interface JobMatchesResponse {
  job: JobPayload;
  matches: CandidateMatch[];
  parserOnline: boolean;
}

const jobs = {
  async list(): Promise<JobPayload[]> {
    return apiFetch<JobPayload[]>('/api/jobs');
  },

  async get(id: string): Promise<JobPayload> {
    return apiFetch<JobPayload>(`/api/jobs/${id}`);
  },

  /** AI-ranked candidate matches for a job (skill overlap + experience + semantic). */
  async matches(id: string, opts: { limit?: number; minScore?: number } = {}): Promise<JobMatchesResponse> {
    const qs = new URLSearchParams();
    if (opts.limit != null) qs.set('limit', String(opts.limit));
    if (opts.minScore != null) qs.set('minScore', String(opts.minScore));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<JobMatchesResponse>(`/api/jobs/${id}/matches${suffix}`);
  },

  async getNextCode(opts?: { branchId?: string; shift?: string }): Promise<{ code: string }> {
    const params = new URLSearchParams();
    if (opts?.branchId) params.append('branchId', opts.branchId);
    if (opts?.shift) params.append('shift', opts.shift);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ code: string }>(`/api/jobs/next-code${qs}`);
  },

  async create(data: Record<string, any>): Promise<JobPayload> {
    return apiFetch<JobPayload>('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Record<string, any>): Promise<JobPayload> {
    return apiFetch<JobPayload>(`/api/jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async approve(id: string, overrides?: { assignedTo?: string; primaryRecruiterId?: string; podId?: string }): Promise<JobPayload> {
    return apiFetch<JobPayload>(`/api/jobs/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(overrides || {}),
    });
  },

  async reject(id: string, reason: string): Promise<JobPayload> {
    return apiFetch<JobPayload>(`/api/jobs/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  async duplicate(id: string): Promise<JobPayload> {
    return apiFetch<JobPayload>(`/api/jobs/${id}/duplicate`, {
      method: 'POST',
    });
  },

  async delete(id: string): Promise<void> {
    return apiFetch<void>(`/api/jobs/${id}`, {
      method: 'DELETE',
    });
  },

  async restore(id: string): Promise<JobPayload> {
    return apiFetch<JobPayload>(`/api/jobs/${id}/restore`, {
      method: 'PATCH',
    });
  },

  async parseJd(text: string): Promise<{
    success: boolean;
    primarySkills: string[];
    secondarySkills: string[];
    jobTitle: string;
    workAuthorization: string;
    roles: string[];
    location?: { country?: string; state?: string; city?: string };
    experienceMin?: number;
    experienceMax?: number;
    noticePeriod?: string;
    jobType?: string;
    remoteJob?: string;
    title?: string;
    payRate?: string;
    ctc?: string;
    salary?: string;
  }> {
    return apiFetch('/api/jobs/parse-jd', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },
};

const candidates = {
  async list(filters?: Record<string, any>): Promise<any[]> {
    const cleanFilters: Record<string, string> = {};
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          cleanFilters[key] = String(val);
        }
      });
    }
    const query = new URLSearchParams(cleanFilters).toString();
    return apiFetch<any[]>(`/api/candidates${query ? `?${query}` : ''}`);
  },

  async get(id: string | number): Promise<any> {
    return apiFetch<any>(`/api/candidates/${id}`);
  },

  async create(data: Record<string, any>): Promise<any> {
    return apiFetch<any>('/api/candidates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string | number): Promise<any> {
    return apiFetch<any>(`/api/candidates/${id}`, {
      method: 'DELETE',
    });
  },

  async restore(id: string | number): Promise<any> {
    return apiFetch<any>(`/api/candidates/${id}/restore`, {
      method: 'PATCH',
    });
  },

  async update(id: string | number, data: Record<string, any>): Promise<any> {
    return apiFetch<any>(`/api/candidates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async uploadCvBulk(files: File[]): Promise<{ bulkUploadId: string }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${getApiBase()}/api/candidates/bulk-upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Bulk upload failed with status ${res.status}`);
    }

    return res.json();
  },

  async getBulkUploads(): Promise<any[]> {
    return apiFetch<any[]>('/api/candidates/bulk-uploads');
  },

  async getBulkUpload(id: string): Promise<any> {
    return apiFetch<any>(`/api/candidates/bulk-uploads/${id}`);
  },

  async parseResume(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${getApiBase()}/api/candidates/parse`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(body.message || `API Error: ${res.status}`);
    }
    return res.json();
  },

  /** Upload a CV: parses (best-effort), stores the file, and creates the candidate. */
  async uploadCv(
    file: File, 
    source = 'CV Upload',
    overrides?: { fullName?: string; email?: string; phone?: string }
  ): Promise<{ candidate: any; duplicate: boolean; parsed: boolean; updated?: boolean }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', source);
    if (overrides) {
      if (overrides.fullName) formData.append('fullName', overrides.fullName);
      if (overrides.email) formData.append('email', overrides.email);
      if (overrides.phone) formData.append('phone', overrides.phone);
    }

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${getApiBase()}/api/candidates/upload`, {
      method: 'POST',
      body: formData,
      headers,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(body.message || `Upload failed: ${res.status}`);
    }
    return res.json();
  },

  /** Fetch the stored CV as a blob (auth-aware) so it can be opened or downloaded. */
  async fetchResumeBlob(candidateId: string | number): Promise<Blob> {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${getApiBase()}/api/candidates/${candidateId}/resume`, { headers });
    if (!res.ok) throw new Error(res.status === 404 ? 'No CV on file for this candidate.' : `Download failed: ${res.status}`);
    return res.blob();
  },

  dictionary: {
    async listPending(): Promise<any[]> {
      return apiFetch<any[]>('/api/candidates/dictionary/pending');
    },

    async approve(payload: {
      category: string;
      rawValue: string;
      action: 'canonical' | 'alias';
      canonicalId?: number;
      country?: string;
      state?: string;
      seniorityLevel?: string;
    }): Promise<any> {
      return apiFetch<any>('/api/candidates/dictionary/approve', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async listCategory(category: string): Promise<any[]> {
      return apiFetch<any[]>(`/api/candidates/dictionary/${category}`);
    },

    async addCategory(category: string, data: any): Promise<any> {
      return apiFetch<any>(`/api/candidates/dictionary/${category}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async deleteCategory(category: string, id: number, type: 'canonical' | 'alias'): Promise<any> {
      return apiFetch<any>(`/api/candidates/dictionary/${category}/${id}?type=${type}`, {
        method: 'DELETE',
      });
    },
  },
};

const clients = {
  async list(includeDeleted?: string): Promise<any[]> {
    const query = includeDeleted === 'true' ? '?includeDeleted=true' : '';
    return apiFetch<any[]>(`/api/clients${query}`);
  },


  async get(id: string): Promise<any> {
    return apiFetch<any>(`/api/clients/${id}`);
  },

  async create(data: Record<string, any>): Promise<any> {
    return apiFetch<any>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Record<string, any>): Promise<any> {
    return apiFetch<any>(`/api/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<any> {
    return apiFetch<any>(`/api/clients/${id}`, {
      method: 'DELETE',
    });
  },

  async restore(id: string): Promise<any> {
    return apiFetch<any>(`/api/clients/${id}/restore`, {
      method: 'PATCH',
    });
  },
};

const pods = {
  async list(): Promise<any[]> {
    return apiFetch<any[]>('/api/pods');
  },
  async get(id: string): Promise<any> {
    return apiFetch<any>(`/api/pods/${id}`);
  },
  async getAvailableRecruiters(): Promise<any[]> {
    return apiFetch<any[]>('/api/pods/available-recruiters');
  },
  async getMyTeam(): Promise<any> {
    return apiFetch<any>('/api/pods/my-team');
  },
  async create(data: Record<string, any>): Promise<any> {
    return apiFetch<any>('/api/pods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async update(id: string, data: Record<string, any>): Promise<any> {
    return apiFetch<any>(`/api/pods/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async delete(id: string): Promise<any> {
    return apiFetch<any>(`/api/pods/${id}`, {
      method: 'DELETE',
    });
  },
  async resetCycle(): Promise<any> {
    return apiFetch<any>('/api/pods/reset-cycle', {
      method: 'POST',
    });
  },
};

const submissions = {
  async list(filters?: Record<string, any>): Promise<any> {
    const cleanFilters: Record<string, string> = {};
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          cleanFilters[key] = String(val);
        }
      });
    }
    const query = new URLSearchParams(cleanFilters).toString();
    return apiFetch<any>(`/api/recruiter-submissions${query ? `?${query}` : ''}`);
  },
  async get(id: number): Promise<any> {
    return apiFetch<any>(`/api/recruiter-submissions/${id}`);
  },
  async create(data: Record<string, any>): Promise<any> {
    return apiFetch<any>('/api/recruiter-submissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async update(id: number, data: Record<string, any>): Promise<any> {
    return apiFetch<any>(`/api/recruiter-submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async delete(id: number): Promise<any> {
    return apiFetch<any>(`/api/recruiter-submissions/${id}`, {
      method: 'DELETE',
    });
  },
  async getTrackerStats(): Promise<any> {
    return apiFetch<any>('/api/recruiter-submissions/tracker-stats');
  },
  async getCustomRemarks(branchId?: string): Promise<any[]> {
    return apiFetch<any[]>(`/api/recruiter-submissions/custom-remarks${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`);
  },
  async createCustomRemark(data: { stage: string; remarkText: string; branchId?: string }): Promise<any> {
    return apiFetch<any>('/api/recruiter-submissions/custom-remarks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async deleteCustomRemark(id: number): Promise<any> {
    return apiFetch<any>(`/api/recruiter-submissions/custom-remarks/${id}`, {
      method: 'DELETE',
    });
  },
};

const branches = {
  async list(): Promise<any[]> {
    return apiFetch<any[]>('/api/branches');
  },
  async get(id: string): Promise<any> {
    return apiFetch<any>(`/api/branches/${id}`);
  },
  async create(data: { name: string; code?: string; city?: string; state?: string; country?: string; market?: string }): Promise<any> {
    return apiFetch<any>('/api/branches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async update(id: string, data: {
    name?: string;
    code?: string;
    city?: string;
    state?: string;
    country?: string;
    market?: string;
    isActive?: boolean;
    allowNone?: boolean;
    allowPods?: boolean;
    allowAll?: boolean;
    allowUnassigned?: boolean;
    podDistributionStrategy?: 'AUTO' | 'MANUAL';
    requireAmJobApproval?: boolean;
    requireJobApproval?: boolean;
    rolesRequiringApproval?: string[];
    defaultJobApproverRole?: string;
    allowedJobApproverRoles?: string[];
    approvalRoutingMode?: 'FLEXIBLE' | 'ENFORCE_DEFAULT';
  }): Promise<any> {
    return apiFetch<any>(`/api/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async delete(id: string): Promise<any> {
    return apiFetch<any>(`/api/branches/${id}`, {
      method: 'DELETE',
    });
  },
  async getMembers(id: string): Promise<any[]> {
    return apiFetch<any[]>(`/api/branches/${id}/members`);
  },
  async assignUser(id: string, userId: string, roles?: string[]): Promise<any> {
    return apiFetch<any>(`/api/branches/${id}/assign-user`, {
      method: 'POST',
      body: JSON.stringify({ userId, roles }),
    });
  },
  async updateManager(id: string, managerId: string | null): Promise<any> {
    return apiFetch<any>(`/api/branches/${id}/manager`, {
      method: 'PATCH',
      body: JSON.stringify({ managerId }),
    });
  },
  async getHierarchy(): Promise<any> {
    return apiFetch<any>('/api/branches/hierarchy');
  },
};

const businessUnits = {
  async list(): Promise<any[]> {
    return apiFetch<any[]>('/api/business-units');
  },
  async get(id: string): Promise<any> {
    return apiFetch<any>(`/api/business-units/${id}`);
  },
  async create(data: { name: string; code?: string; market?: string; currency?: string }): Promise<any> {
    return apiFetch<any>('/api/business-units', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async update(id: string, data: { name?: string; code?: string; market?: string; currency?: string }): Promise<any> {
    return apiFetch<any>(`/api/business-units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async delete(id: string): Promise<any> {
    return apiFetch<any>(`/api/business-units/${id}`, {
      method: 'DELETE',
    });
  },
};

const auditLogs = {
  async list(limit = 100): Promise<any[]> {
    return apiFetch<any[]>(`/api/audit/logs?limit=${limit}`).catch(() => []);
  },
};

const integrations = {
  dice: {
    async getSettings(): Promise<{ clientId: string; clientSecret: string; accountId: string; isActive: boolean; dailyViewLimit: number; viewsUsedToday: number; mode: 'LIVE' | 'SANDBOX' }> {
      return apiFetch('/api/integrations/dice/settings');
    },
    async saveSettings(data: { clientId?: string; clientSecret?: string; accountId?: string; isActive?: boolean; dailyViewLimit?: number }): Promise<any> {
      return apiFetch('/api/integrations/dice/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async search(query: { q?: string; location?: string; skills?: string[]; workAuth?: string; limit?: number }): Promise<{ results: any[]; mode: 'LIVE' | 'SANDBOX'; totalFound: number }> {
      return apiFetch('/api/integrations/dice/search', {
        method: 'POST',
        body: JSON.stringify(query),
      });
    },
    async importCandidate(diceId: string): Promise<any> {
      return apiFetch(`/api/integrations/dice/import/${diceId}`, {
        method: 'POST',
      });
    },
  },
};

// ─── Export ─────────────────────────────────────────────────────────
export const atsApi = {
  auth,
  jobs,
  candidates,
  clients,
  pods,
  branches,
  businessUnits,
  submissions,
  auditLogs,
  integrations,
  email,
  fetch: apiFetch,
};


