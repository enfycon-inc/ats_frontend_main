import type { TenantBrandingUpdate, TenantBrandingSettingsResponse } from './tenant-branding-contract';
import type { JobExportRequest, JobExportResponse, JobExportManager } from './job-export-contract';
import type { SignInPolicy, SignInPolicyUpdate } from "./sign-in-policy";
import type { ClientCreationContext, ClientCreationRequest, CreatedClient } from './client-creation-contract';
import type { TenantEmailSettings, EmailDispatchMode, EmailDispatchResult } from './system-email.types';
import type { UserCity } from './user-city-contract';
import type { RoleRequestDecision, RoleRequestReview, RoleRequestSubmission } from './role-request-contract';
import type { DeliveryDashboard, DeliveryStage } from './delivery-dashboard-contract';
import type { StaffProfile, ProfileDetailsInput, SignatureSettings, SignatureInput, SignatureDefaultsInput } from './profile-contract';
export interface ClientAccessPolicy { clientsVisibleAcrossUnits: boolean; bdmClientsTenantWide: boolean; otherOwnerPocsVisible: boolean; maskOtherOwnerPocDetails: boolean; }
import type { CandidateAssessment, EligibleInterviewResponse, SubmissionHistoryResponse, TrackerListFilters, TrackerResponse, TrackerStatsResponse, TrackerSubmission, TrackerUpdate } from './submission-contract';

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
import { clearSavedDashboardRole, getSavedDashboardRole } from './dashboard-preference';

export interface InvitationDetails {
  email: string;
  fullName: string;
  tenantName: string;
  tenantDomain: string | null;
  allowPasswordLogin: boolean;
  allowMicrosoftSso: boolean;
  allowGoogleSso: boolean;
  isExpired: boolean;
  isAccepted: boolean;
}

export interface PasswordResetVerification {
  valid: boolean;
  email?: string;
  fullName?: string;
  tenantId?: string;
  tenantName?: string;
  siteTitle?: string | null;
  logoUrl?: string | null;
  message?: string;
}

export function activeRoleHeaders(): Record<string, string> {
  const profile = getCurrentUser();
  const selection = getSavedDashboardRole(profile);
  // Old preferences may contain names; only exact assigned IDs cross the API boundary.
  const roleId = selection && /^[0-9a-f-]{36}$/i.test(selection) ? selection : null;
  return roleId ? { 'x-active-role-id': roleId } : {};
}

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
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL;
  }
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://backend_blue:5000';
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://127.0.0.1:5000';
}

// ─── Token Management ──────────────────────────────────────────────
const TOKEN_KEY = 'ats_access_token';
const REFRESH_TOKEN_KEY = 'ats_refresh_token';
const USER_KEY = 'ats_current_user';

export function isJwtExpired(token: string): boolean {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Buffer by 15 seconds to prevent race condition right before expiry
    return Date.now() >= (payload.exp - 15) * 1000;
  } catch {
    return true;
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && isJwtExpired(token)) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return token;
}

function setToken(token: string) {
  if (typeof window !== 'undefined') {
    const changed = localStorage.getItem(TOKEN_KEY) !== token;
    localStorage.setItem(TOKEN_KEY, token);
    if (changed) window.dispatchEvent(new Event('atsAccessTokenChanged'));
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

function clearAccessToken() {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}

function setCurrentUser(user: any, notifyProfileChange = true) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (notifyProfileChange) window.dispatchEvent(new CustomEvent('atsProfileChanged', { detail: user }));
  }
}

function getCurrentUser(): any | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

let pendingSessionToken: Promise<string | null> | null = null;

async function fetchSessionTokenRequest(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/auth/session', { cache: 'no-store' });
    if (!res.ok && res.status !== 401) throw new SessionRenewalUnavailable();
    if (res.ok) {
      const session = await res.json();
      if (session?.error === 'SessionRenewalUnavailable') throw new SessionRenewalUnavailable();
      if (session?.user?.accessToken && (session as any)?.error !== 'RefreshAccessTokenError') {
        const token = session.user.accessToken;
        setToken(token);
        if (session.user) {
          const cachedUser = getCurrentUser();
          const sameIdentity = cachedUser?.id === session.user.id && cachedUser?.tenantId === session.user.tenantId;
          const previousUser = sameIdentity ? cachedUser : {};
          // Session data is intentionally sparse. Cache it for identity display without
          // broadcasting it as a complete /me profile to SWR subscribers.
          setCurrentUser({
            ...previousUser,
            id: session.user.id,
            email: session.user.email || previousUser.email,
            fullName: session.user.name || previousUser.fullName,
            roles: session.user.roles || previousUser.roles,
            tenantId: session.user.tenantId,
            defaultMarket: session.user.defaultMarket || previousUser.defaultMarket,
            permissions: session.user.permissions || previousUser.permissions || [],
            systemRole: session.user.systemRole || previousUser.systemRole,
            roleId: (session.user as any).roleId || previousUser.roleId,
            roleName: (session.user as any).roleName || previousUser.roleName,
            assignedRoleIds: (session.user as any).assignedRoleIds || previousUser.assignedRoleIds,
            assignedRoles: (session.user as any).assignedRoles || previousUser.assignedRoles,
            activeRoleId: (session.user as any).activeRoleId || previousUser.activeRoleId,
            podId: session.user.podId || previousUser.podId || null,
            branchId: session.user.branchId || (session.user as any).branch_id || previousUser.branchId || null,
            businessUnitId: (session.user as any).businessUnitId || previousUser.businessUnitId || null,
            assignedBranchIds: (session.user as any).assignedBranchIds || (session.user as any).assigned_branch_ids || previousUser.assignedBranchIds || [],
          }, false);
        }
        return token;
      }
    }
  } catch (e) {
    if (e instanceof SessionRenewalUnavailable) throw e;
    console.warn('Could not retrieve token from NextAuth session', e);
    throw new SessionRenewalUnavailable();
  }
  return null;
}

async function fetchSessionToken(): Promise<string | null> {
  if (pendingSessionToken) return pendingSessionToken;
  const request = () => typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('ats_authjs_session_refresh', fetchSessionTokenRequest)
    : fetchSessionTokenRequest();
  pendingSessionToken = request();
  try { return await pendingSessionToken; } finally { pendingSessionToken = null; }
}

async function getOrFetchToken(): Promise<string | null> {
  let token = getToken();
  if (token) return token;
  // Auth.js is the single source of truth for rotating refresh credentials.
  return await fetchSessionToken();
}

class SessionRenewalUnavailable extends Error {
  constructor() { super('Session renewal is temporarily unavailable. Please try again.'); }
}


// ─── HTTP Helper ────────────────────────────────────────────────────
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  isRetry = false,
  roleRecoveryRetry = false,
  omitActiveRole = false,
): Promise<T> {
  const pathname = path.split('?')[0];
  const method = (options.method || 'GET').toUpperCase();
  const isPublicAuthPolicy = pathname === '/api/auth/tenant-auth-policy' && method === 'GET';
  const isCredentialLogin = method === 'POST' &&
    (pathname === '/api/auth/login' || pathname === '/api/auth/developer-login');
  // Credential login establishes a new session. Existing tokens and renewal
  // failures must not affect its request or replace authentication errors.
  const skipsSessionRecovery = isPublicAuthPolicy || isCredentialLogin;
  let token = skipsSessionRecovery ? null : getToken();
  if (!skipsSessionRecovery && !token && typeof window !== 'undefined' && !path.includes('/api/auth/register')) {
    token = await getOrFetchToken();
  }
  const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
  const tenantDomain = typeof window !== 'undefined' ? (window.location.hostname === 'localhost' ? '' : window.location.hostname.split('.')[0]) : null;
  let tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null;

  if (typeof window !== 'undefined' && tenantId) {
    try {
      const userStr = localStorage.getItem('ats_current_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const isSuperAdmin = user.systemRole === 'SUPER_ADMIN' || (user.roles && user.roles.includes('SUPER_ADMIN'));
        if (!isSuperAdmin && user.tenantId && user.tenantId !== tenantId) {
          // If a non-super-admin has a stale impersonation tenant_id from a previous session, do not send it.
          tenantId = null;
          localStorage.removeItem('tenant_id');
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  const savedRolePreference = typeof window !== 'undefined' ? getSavedDashboardRole(getCurrentUser()) : null;
  const activeRoleHeader = omitActiveRole ? {} : activeRoleHeaders();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...activeRoleHeader,
    ...(options.headers as Record<string, string> || {}),
  };
  // The browser supplies the multipart boundary for photo uploads.
  if (typeof FormData !== 'undefined' && options.body instanceof FormData) delete headers['Content-Type'];

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (activeBranchId && !headers['x-branch-id']) {
    headers['x-branch-id'] = activeBranchId;
  }
  if (tenantDomain && tenantDomain !== 'www' && tenantDomain !== 'api') {
    headers['x-tenant-domain'] = tenantDomain;
  }
  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
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

    // Recover an expired access token through Auth.js, which owns the rotating
    // refresh credential, and retry this request once.
    if (isExpired && !isRetry && !skipsSessionRecovery) {
      if (typeof window !== 'undefined') {
        // Preserve the cached identity and active role while Auth.js tries to
        // renew the server-held session. A transient renewal outage is not a
        // sign-out and must not make the profile flash into an unknown state.
        clearAccessToken();
        const freshToken = await fetchSessionToken();
        if (freshToken) {
          return apiFetch<T>(path, options, true, roleRecoveryRetry, omitActiveRole);
        }
      }
    }

    // If request failed with 401 Unauthorized after all refresh attempts:
    if (res.status === 401 && !skipsSessionRecovery && typeof window !== 'undefined' && pathname !== '/api/auth/session') {
      clearToken();
      if (!window.location.pathname.startsWith('/auth/')) {
        window.location.href = '/auth/login?expired=true';
      }
      throw new Error('Your session has expired. Please sign in again.');
    }

    const errMsg = body.message || `API Error: ${res.status}`;
    const requestedRoleId = (options.headers as Record<string, string> | undefined)?.['x-active-role-id'] || activeRoleHeader['x-active-role-id'];
    const savedRoleId = savedRolePreference;
    if (res.status === 403 && !roleRecoveryRetry &&
        errMsg === 'The selected role is not assigned to you.' &&
        requestedRoleId && requestedRoleId === savedRoleId) {
      const profile = getCurrentUser();
      clearSavedDashboardRole(profile);
      const retryHeaders = { ...(options.headers as Record<string, string> || {}) };
      if (retryHeaders['x-active-role-id'] === requestedRoleId) delete retryHeaders['x-active-role-id'];
      return apiFetch<T>(path, { ...options, headers: retryHeaders }, isRetry, true, true);
    }
    if (typeof window !== 'undefined' && res.status === 403 && !(options as any)?.silent403) {
      const event = new CustomEvent("app_show_error_modal", {
        detail: { message: errMsg, title: "Permission Access Required" },
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
  async login(email: string, password: string, rememberMe = false, developer = false) {
    const subdomain = getTenantIdentifier();
    const data = await apiFetch<{
      accessToken: string;
      refreshToken?: string;
      expiresIn: number;
      tokenType: string;
      officeLoginReceipt?: string | null;
      user: {
        id: string;
        email: string;
        fullName: string;
        roles: string[];
        tenantId: string;
        tenantDomain: string;
      };
    }>(developer ? '/api/auth/developer-login' : '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, subdomain, rememberMe }),
    });

    setToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    setCurrentUser(data.user);
    return data;
  },

  async me() {
    const profile = await apiFetch<any>('/api/auth/me');
    setCurrentUser(profile);
    return profile;
  },

  async logout() {
    try {
      await apiFetch<{ localSessionRevoked: boolean }>('/api/user-management/me/logout', { method: 'POST' });
    } catch { /* Local browser sign-out must remain available during a backend outage. */ }
    // Auth.js signOut ends the provider session server-side with its current
    // refresh credential. Browser storage may contain an older rotated token.
    clearToken();
  },

  async getProfile(userId?: string): Promise<any> {
    // /api/auth/me returns the authenticated user's profile.
    // The old /api/auth/profile/:id route does not exist — use /me instead.
    return auth.me().catch(() => null);
  },

  setCurrentUser(user: any) {
    setCurrentUser(user);
  },

  getToken,
  getCurrentUser,
  isAuthenticated(): boolean {
    return !!getToken();
  },

  async listPendingApprovals(): Promise<any[]> {
    return apiFetch<any[]>('/api/auth/approvals/pending');
  },

  async approveTenantRegistration(
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

  async approveUser(
    userId: string,
    dataOrMarket?: string | RoleRequestDecision,
    subdomain?: string,
    userLimit?: number,
    maxBranches?: number,
  ): Promise<any> {
    if (typeof dataOrMarket === 'string') {
      return apiFetch<any>(`/api/auth/approvals/approve/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ market: dataOrMarket, subdomain, userLimit, maxBranches }),
      });
    }
    return apiFetch<any>(`/api/auth/users/${userId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(dataOrMarket || {}),
    });
  },

  async createManualTenant(data: {
    companyName: string;
    subdomain: string;
    adminFirstName: string;
      adminLastName: string;
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

  async updateTenant(tenantId: string, data: { name?: string; subdomain?: string; userLimit?: number; maxBranches?: number }): Promise<any> {
    return apiFetch<any>(`/api/auth/tenants/${tenantId}/management`, {
      method: 'PATCH',
      body: JSON.stringify(data),
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
    role?: string;
    roles?: string[];
    tenantId: string;
    isApproved: boolean;
    sendEmailInvite?: boolean;
    branchId?: string;
      businessUnitId?: string;
      assignedBranchIds?: string[];
    branchRoles?: Record<string, string[]>;
  }): Promise<any> {
    return apiFetch<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async validateUserImport(rows: Array<Record<string, string>>): Promise<any> {
    return apiFetch<any>('/api/auth/users/import/validate', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    });
  },

  async importUsers(rows: Array<Record<string, string>>): Promise<any> {
    return apiFetch<any>('/api/auth/users/import', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    });
  },

  async listUsers(tenantId?: string): Promise<any[]> {
    const headers: Record<string, string> = {};
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }
    return apiFetch<any[]>('/api/auth/users', { headers });
  },

  async setUserStatus(userId: string, isActive: boolean, reason?: string): Promise<any> {
    return apiFetch<any>(`/api/auth/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive, reason }),
    });
  },

  async resendInvitation(userId: string): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/auth/users/${encodeURIComponent(userId)}/resend-invitation`, { method: 'POST' });
  },

  async deleteUser(userId: string): Promise<any> {
    return apiFetch<any>(`/api/auth/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async logoutUserSessions(userId: string): Promise<any> {
    return apiFetch<any>(`/api/auth/users/${userId}/logout-sessions`, { method: 'POST' });
  },

  async updateUserDetail(userId: string, data: { fullName?: string; email?: string; password?: string; branchId?: string | null;
      businessUnitId?: string | null;
      assignedBranchIds?: string[]; branchRoles?: Record<string, string[]>; roles?: string[]; assignedRoleIds?: string[]; jobReviewerId?: string | null; city?: string | null }): Promise<any> {
    return apiFetch<any>(`/api/auth/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async bulkSetJobReviewer(userIds: string[], reviewerId?: string | null): Promise<any> {
    return apiFetch<any>('/api/auth/users/bulk-reviewer', {
      method: 'POST',
      body: JSON.stringify({ userIds, reviewerId: reviewerId || null }),
    });
  },

  async requestRole(role: string, branchId?: string, businessUnitId?: string, city?: UserCity | null): Promise<RoleRequestSubmission> {
    return apiFetch<RoleRequestSubmission>('/api/auth/request-role', {
      method: 'POST',
      body: JSON.stringify({ role, branchId, businessUnitId, city }),
    });
  },


  async rejectUser(userId: string, expectedRequestVersion?: string): Promise<any> {
    return apiFetch<any>(`/api/auth/users/${userId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ expectedRequestVersion }),
    });
  },

  async reviewRoleRequest(userId: string, version: string, reviewRoleId?: string): Promise<RoleRequestReview> {
    return apiFetch<RoleRequestReview>(`/api/auth/role-requests/${encodeURIComponent(userId)}?version=${encodeURIComponent(version)}`, {
      headers: reviewRoleId ? { 'x-active-role-id': reviewRoleId } : {},
    });
  },

  async decideRoleRequest(request: RoleRequestReview, action: 'approve' | 'reject', reviewRoleId?: string): Promise<{ success: boolean; emailNotification?: { status: string; message?: string } }> {
    const decision: RoleRequestDecision = { expectedRequestVersion: request.requestVersion,
      ...(action === 'approve' ? { roleId: request.roleId, roleIds: [request.roleId], branchId: request.branchId, businessUnitId: request.businessUnitId } : {}),
    };
    return apiFetch(`/api/auth/users/${encodeURIComponent(request.id)}/${action}`, {
      method: 'PATCH', headers: reviewRoleId ? { 'x-active-role-id': reviewRoleId } : {}, body: JSON.stringify(decision),
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

  async listRoles(branchId?: string, includeSystem?: boolean): Promise<any[]> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (includeSystem !== undefined) params.append('includeSystem', String(includeSystem));
    const query = params.toString() ? `?${params.toString()}` : '';
    const headers: Record<string, string> = branchId === 'ALL' ? { 'x-branch-id': 'ALL' } : {};
    return apiFetch<any[]>(`/api/auth/rbac/roles${query}`, { headers });
  },

  async listAssignableRoles(branchId?: string): Promise<any[]> {
    const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return apiFetch<any[]>(`/api/auth/rbac/assignable-roles${query}`);
  },

  async createCustomRole(data: {
    name: string;
    description: string;
    permissions: string[];
    systemRole?: string;
    baseRoleId?: string;
      branchId?: string;
      businessUnitId?: string;
  }): Promise<any> {
    return apiFetch<any>('/api/auth/rbac/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCustomRole(
    roleId: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
      systemRole?: string;
      baseRoleId?: string;
      branchId?: string;
      businessUnitId?: string;
    }
  ): Promise<any> {
    return apiFetch<any>(`/api/auth/rbac/roles/${roleId}`, {
      method: 'PUT',
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


  async assignUserRoles(userId: string, roleIds: string[], append: boolean = false): Promise<any> {
    return apiFetch<any>(`/api/auth/rbac/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roleIds, append }),
    });
  },

  async batchAssignUsersToRole(roleId: string, userIds: string[]): Promise<any> {
    return apiFetch<any>(`/api/auth/rbac/roles/${roleId}/assign-users`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  },

  async unassignUserFromRole(roleId: string, userId: string): Promise<any> {
    return apiFetch<any>(`/api/auth/rbac/roles/${roleId}/unassign-user`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
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
    jobCodePattern?: string;
    enforceJobCodePattern?: boolean;
  } & TenantBrandingUpdate): Promise<TenantBrandingSettingsResponse> {
    const saved = await apiFetch<TenantBrandingSettingsResponse>('/api/auth/tenants/my-settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('atsWorkspaceSettingsChanged'));
    return saved;
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

  async getInvitationDetails(token: string): Promise<InvitationDetails> {
    return apiFetch<any>(`/api/auth/invitation/${encodeURIComponent(token)}`);
  },

  async acceptInvite(token: string, password: string): Promise<any> {
    return apiFetch<any>('/api/auth/accept-invite', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  async forgotPassword(email: string): Promise<any> {
    return apiFetch<any>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyResetToken(token: string): Promise<PasswordResetVerification> {
    return apiFetch<PasswordResetVerification>(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
  },

  async resetPassword(token: string, password: string): Promise<any> {
    return apiFetch<any>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  async sendUserResetLink(userId: string): Promise<any> {
    return apiFetch<any>(`/api/auth/users/${userId}/send-reset-link`, {
      method: 'POST',
    });
  },

  async developerAccounts(search = ''): Promise<Array<{ id: string; email: string; fullName: string; authorized: boolean }>> {
    return apiFetch(`/api/auth/developer-access/accounts?search=${encodeURIComponent(search)}`);
  },
  async setDeveloperGrant(id: string, authorized: boolean) {
    return apiFetch(`/api/auth/developer-access/accounts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ authorized }) });
  },
  async getTenantAuthPolicy(subdomain?: string): Promise<SignInPolicy> {
      const sub = subdomain || getTenantIdentifier();
      const query = sub ? `?subdomain=${encodeURIComponent(sub)}` : '';
      return apiFetch<SignInPolicy>(`/api/auth/tenant-auth-policy${query}`);
    },
    async checkEmailAvailability(email: string): Promise<any> {
      return apiFetch<any>(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
    },

  async updateTenantAuthPolicy(policy: SignInPolicyUpdate): Promise<SignInPolicy> {
    return apiFetch<SignInPolicy>('/api/auth/tenant-auth-policy', {
      method: 'PATCH',
      body: JSON.stringify(policy),
    });
  },
  async updateTenantLoginDesign(loginDesignVariant: SignInPolicy['loginDesignVariant']) {
    return apiFetch<{ loginDesignVariant: SignInPolicy['loginDesignVariant'] }>('/api/auth/tenant-login-design', {
      method: 'PATCH', body: JSON.stringify({ loginDesignVariant }),
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
  async connectMicrosoftMailbox(returnTo: string): Promise<{ url: string }> {
    return apiFetch('/email/accounts/microsoft/connect', { method: 'POST', body: JSON.stringify({ returnTo }) });
  },
  async getTenantEmailSettings(): Promise<TenantEmailSettings> {
    return apiFetch('/email/tenant-settings');
  },
  async setTenantEmailMode(mode: EmailDispatchMode): Promise<{ success: boolean; mode: EmailDispatchMode }> {
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
  async sendTestTenantEmail(recipientEmail?: string): Promise<EmailDispatchResult> {
    return apiFetch('/email/tenant-settings/test-email', {
      method: 'POST',
      body: JSON.stringify({ recipientEmail }),
    });
  },
};


// ─── Jobs API ───────────────────────────────────────────────────────
export interface JobPayload {
  capabilities?: { edit: boolean; changeStatus: boolean; findMatches: boolean; managePublication?: boolean };
  isPubliclyPublished?: boolean;
  publicSlug?: string | null;
  publicDescription?: string | null;
  businessUnitId?: string | null;
  clientId?: string | null;
  endClientId?: string | null;
  pocId?: string | null;
  endClientPocId?: string | null;
  recruiterIds?: string[];
  recruiterId?: string;
  workMode?: string;
  id: string;
  jobCode: string;
  jobTitle: string;
  businessUnit: string;
  client: string;
  endClientName?: string | null;
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
  podIds?: string[];
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
  jobTimezone?: string;
        shiftTiming?: string;
  timingSnapshotAt?: string;
  rejectionReason?: string | null;
  isCoSourced?: boolean;
  sharedBranchIds?: string[];
  marginSplitAmPct?: number | null;
  marginSplitRecPct?: number | null;
}

export interface CandidateMatch {
  assessment?: CandidateAssessment;
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
  ctcCurrency?: string | null;
  ctcTerm?: string | null;
  noticePeriodDays?: number;
  servingNotice?: boolean;
  lastWorkingDay?: string | null;
  preferredLocations?: string[];
  breakdown: {
    primarySkills: string;
    secondarySkills: string;
    experienceFit: number | null;
    semantic: number | null;
  };
}

export interface JobMatchesResponse {
  job: JobPayload;
  matches: CandidateMatch[];
  parserOnline: boolean;
}

export interface JobStaffOption {
  id: string;
  fullName: string;
  email?: string;
  avatar?: string | null;
  city?: string | null;
  assignmentCount: number;
  lastAssignedAt: string | null;
  /** True only when the user has the explicit direct-assignment eligibility capability. */
  canRecruit: boolean;
  canReview: boolean;
}

export interface JobPodOption {
  id: string;
  name: string;
  businessUnitId: string;
  branchId: string | null;
  podHeadId: string | null;
  podHeadName: string | null;
  memberCount: number;
}

// Share concurrent lookups only. Completed results are never reused after roles or scope change.
const staffingRequests = new Map<string, Promise<JobStaffOption[]>>();

const jobs = {
  exportManagers: () => apiFetch<JobExportManager[]>('/api/jobs/export/managers'),
  exportReport: (input: JobExportRequest) => apiFetch<JobExportResponse>('/api/jobs/export', { method: 'POST', body: JSON.stringify(input) }),
  setPublication(id: string, published: boolean, publicDescription?: string) {
    return apiFetch<{ id: string; publicSlug: string | null; isPubliclyPublished: boolean }>(`/api/jobs/${encodeURIComponent(id)}/publication`, {
      method: 'PATCH', body: JSON.stringify({ published, ...(publicDescription !== undefined ? { publicDescription } : {}) }),
    });
  },
  async saveDraft(data: Record<string, any>, id?: string): Promise<JobPayload> {
    return apiFetch<JobPayload>(id ? `/api/jobs/${id}/draft` : '/api/jobs/drafts', {
      method: id ? 'PATCH' : 'POST', body: JSON.stringify(data),
    });
  },
  async publishDraft(id: string, data: Record<string, any>): Promise<JobPayload> {
    return apiFetch<JobPayload>(`/api/jobs/${id}/publish`, { method: 'POST', body: JSON.stringify(data) });
  },
  async changeStatus(id: string, data: { status: string; expectedStatus: string; reason?: string; keepExistingSubmissionsOpen?: boolean }): Promise<{ status: string }> {
    return apiFetch('/api/jobs/' + id + '/status', { method: 'PATCH', body: JSON.stringify(data) });
  },
  async podOptions(scope: { branchId?: string; businessUnitId: string }): Promise<JobPodOption[]> {
    const query = new URLSearchParams({ businessUnitId: scope.businessUnitId });
    if (scope.branchId) query.set('branchId', scope.branchId);
    return apiFetch<JobPodOption[]>(`/api/jobs/pod-options?${query}`);
  },
  async staffingOptions(scope?: { branchId?: string; businessUnitId?: string; jobId?: string }, fetchOptions?: { silent?: boolean }): Promise<JobStaffOption[]> {
    const query = new URLSearchParams();
    if (scope?.branchId) query.set('branchId', scope.branchId);
    if (scope?.businessUnitId) query.set('businessUnitId', scope.businessUnitId);
    if (scope?.jobId) query.set('jobId', scope.jobId);
    const requestKey = JSON.stringify([getApiBase(), getToken(), activeRoleHeaders(), query.toString(),
      typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null]);
    let request = staffingRequests.get(requestKey);
    if (!request) {
      request = apiFetch<JobStaffOption[]>(`/api/jobs/staffing-options?${query}`, (fetchOptions?.silent ? { silent403: true } as any : undefined))
        .finally(() => { staffingRequests.delete(requestKey); });
      staffingRequests.set(requestKey, request);
    }
    return request;
  },
  async list(opts?: { filter?: string }): Promise<JobPayload[]> {
    const qs = opts?.filter ? `?filter=${encodeURIComponent(opts.filter)}` : '';
    return apiFetch<JobPayload[]>(`/api/jobs${qs}`);
  },

  async creationTargets(): Promise<Array<{ id: string; name: string; email: string; branchId?: string; businessUnitId?: string }>> {
    return apiFetch('/api/jobs/creation-access/targets');
  },
  async delegatedJobClients(accountManagerId: string, search?: string): Promise<any[]> {
    const params = new URLSearchParams({ accountManagerId });
    if (search?.trim()) params.set('search', search.trim());
    return apiFetch(`/api/jobs/creation-access/clients?${params.toString()}`);
  },
  async delegatedJobClientContacts(accountManagerId: string, clientId: string): Promise<{ myContacts: any[]; otherContacts: any[] }> {
    return apiFetch(`/api/jobs/creation-access/clients/${encodeURIComponent(clientId)}/contacts?accountManagerId=${encodeURIComponent(accountManagerId)}`);
  },
  async creationGrantPeople(accountManagerId?: string, search?: string): Promise<Array<{ id: string; fullName: string; email: string; branchId?: string; businessUnitId?: string }>> {
    const params = new URLSearchParams();
    if (accountManagerId) params.set('accountManagerId', accountManagerId);
    if (search?.trim()) params.set('search', search.trim());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/jobs/creation-access/people${query}`);
  },
  async creationGrantOwners(search?: string): Promise<Array<{ id: string; fullName: string; email: string; branchId?: string; businessUnitId?: string }>> {
    const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return apiFetch(`/api/jobs/creation-access/owners${query}`);
  },
  async creationGrants(accountManagerId?: string): Promise<any[]> {
    const query = accountManagerId ? `?accountManagerId=${encodeURIComponent(accountManagerId)}` : '';
    return apiFetch(`/api/jobs/creation-access/grants${query}`);
  },
  async grantJobCreation(payload: { accountManagerId: string; delegateUserId: string; expiresAt?: string | null; maxJobs?: number | null }): Promise<any> {
    return apiFetch('/api/jobs/creation-access/grants', { method: 'POST', body: JSON.stringify(payload) });
  },
  async updateJobCreationGrant(grantId: string, payload: { expiresAt?: string | null; maxJobs?: number | null }): Promise<any> {
    return apiFetch(`/api/jobs/creation-access/grants/${encodeURIComponent(grantId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  async revokeJobCreation(grantId: string): Promise<void> {
    return apiFetch(`/api/jobs/creation-access/grants/${encodeURIComponent(grantId)}`, { method: 'DELETE' });
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

  async getNextCode(opts?: { branchId?: string; businessUnitId?: string; shift?: string }): Promise<{ code: string }> {
    const params = new URLSearchParams();
    if (opts?.branchId) params.append('branchId', opts.branchId);
    if (opts?.businessUnitId) params.append('businessUnitId', opts.businessUnitId);
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
      signal: AbortSignal.timeout(15_000),
    });
  },

  async delegate(id: string, payload: { targetUnitId?: string; targetBranchId?: string; slaDaysTarget?: number; marginSplitAmPct?: number; marginSplitRecPct?: number; notes?: string }): Promise<any> {
    return apiFetch(`/api/jobs/${id}/delegate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getDelegations(type: 'incoming' | 'outgoing' | 'all' = 'all'): Promise<any[]> {
    return apiFetch(`/api/jobs/delegations?type=${type}`);
  },

  async acceptDelegation(requestId: string, payload: { assignedPodId?: string }): Promise<any> {
    return apiFetch(`/api/jobs/delegations/${requestId}/accept`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async rejectDelegation(requestId: string, payload: { notes?: string }): Promise<any> {
    return apiFetch(`/api/jobs/delegations/${requestId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};

const candidates = {
  async list(filters?: Record<string, any>): Promise<import('./candidate-contract').CandidateProfile[]> {
    const cleanFilters: Record<string, string> = {};
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          cleanFilters[key] = String(val);
        }
      });
    }
    const query = new URLSearchParams(cleanFilters).toString();
    return apiFetch<import('./candidate-contract').CandidateProfile[]>(`/api/candidates${query ? `?${query}` : ''}`);
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
    const headers: Record<string, string> = activeRoleHeaders();
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
    const headers: Record<string, string> = activeRoleHeaders();
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
    overrides?: { jobId?: string; totalExperienceYears?: string; firstName?: string; lastName?: string; fullName?: string; email?: string; phone?: string; relevantExperienceYears?: string; currentCompany?: string; availabilityToStart?: string; currentCtc?: string; expectedCtc?: string; noticePeriodDays?: string; skills?: string; currentLocation?: string; preferredLocations?: string; preferredLocationMode?: 'SPECIFIC_LOCATIONS' | 'REMOTE_ONLY' | 'REMOTE_OR_LOCATIONS' }
  ): Promise<{ candidate: any; duplicate: boolean; parsed: boolean; updated?: boolean }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', source);
    if (overrides) {
      if (overrides.totalExperienceYears) formData.append('totalExperienceYears', overrides.totalExperienceYears);
      if (overrides.firstName) formData.append('firstName', overrides.firstName);
      if (overrides.lastName) formData.append('lastName', overrides.lastName);
      if (overrides.fullName) formData.append('fullName', overrides.fullName);
      if (overrides.email) formData.append('email', overrides.email);
      if (overrides.phone) formData.append('phone', overrides.phone);
      if (overrides.relevantExperienceYears) formData.append('relevantExperienceYears', overrides.relevantExperienceYears);
      if (overrides.currentCompany) formData.append('currentCompany', overrides.currentCompany);
      if (overrides.availabilityToStart) formData.append('availabilityToStart', overrides.availabilityToStart);
      if (overrides.currentCtc) formData.append('currentCtc', overrides.currentCtc);
      if (overrides.expectedCtc) formData.append('expectedCtc', overrides.expectedCtc);
      if (overrides.noticePeriodDays) formData.append('noticePeriodDays', overrides.noticePeriodDays);
      if (overrides.jobId) formData.append('jobId', overrides.jobId);
      if (overrides.skills) formData.append('skills', overrides.skills);
      if (overrides.currentLocation) formData.append('location', overrides.currentLocation);
      if (overrides.preferredLocations !== undefined) formData.append('preferredLocations', overrides.preferredLocations);
      if (overrides.preferredLocationMode) formData.append('preferredLocationMode', overrides.preferredLocationMode);
    }

    const token = getToken();
    const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
    const headers: Record<string, string> = activeRoleHeaders();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (activeBranchId && !headers['x-branch-id']) headers['x-branch-id'] = activeBranchId;

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
  async resumePreview(candidateId: string | number): Promise<{ pages: number }> {
    return apiFetch(`/api/candidates/${candidateId}/resume-preview`);
  },
  async resumePage(candidateId: string | number, page: number, signal?: AbortSignal): Promise<Blob> {
    const token = getToken();
    const headers: Record<string, string> = activeRoleHeaders();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${getApiBase()}/api/candidates/${candidateId}/resume-preview?page=${page}`, { headers, signal, cache: 'no-store' });
    if (!res.ok) throw new Error('Unable to display resume page.');
    return res.blob();
  },
  async uploadedResumePreview(file: File): Promise<{ pages: number }> {
    const form = new FormData(); form.append('file', file);
    const token = getToken(); const headers: Record<string, string> = activeRoleHeaders();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${getApiBase()}/api/candidates/resume-preview/upload`, { method: 'POST', headers, body: form, cache: 'no-store' });
    if (!res.ok) throw new Error('Unable to prepare resume preview.');
    return res.json();
  },
  async uploadedResumePage(file: File, page: number, signal?: AbortSignal): Promise<Blob> {
    const form = new FormData(); form.append('file', file);
    const token = getToken(); const headers: Record<string, string> = activeRoleHeaders();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${getApiBase()}/api/candidates/resume-preview/upload?page=${page}`, { method: 'POST', headers, body: form, signal, cache: 'no-store' });
    if (!res.ok) throw new Error('Unable to display resume page.');
    return res.blob();
  },
  async fetchResumeBlob(candidateId: string | number): Promise<Blob> {
    if (!auth.getCurrentUser()?.permissions?.includes('candidate:download_resume')) throw new Error('Original resume download permission is required.');
    const token = getToken();
    const headers: Record<string, string> = activeRoleHeaders();
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
  async creationContext(): Promise<ClientCreationContext> {
    return apiFetch('/api/clients/creation-context');
  },
  async getVisibilityPolicy(): Promise<ClientAccessPolicy> {
    return apiFetch('/api/clients/visibility-policy');
  },
  async setVisibilityPolicy(enabled: boolean | Partial<ClientAccessPolicy>): Promise<ClientAccessPolicy> {
    return apiFetch('/api/clients/visibility-policy', { method: 'PATCH', body: JSON.stringify(typeof enabled === "boolean" ? { clientsVisibleAcrossUnits: enabled } : enabled) });
  },
  async getContacts(id: string): Promise<any> {
    return apiFetch(`/clients/${id}/contacts`);
  },

  async createContact(id: string, data: Record<string, any>): Promise<Response> {
    const contact = await apiFetch(`/clients/${id}/contacts`, {
      method: 'POST', body: JSON.stringify(data),
    });
    return Response.json(contact);
  },
  async list(includeDeleted?: string): Promise<any[]> {
    const query = includeDeleted === 'true' ? '?includeDeleted=true' : '';
    return apiFetch<any[]>(`/api/clients${query}`);
  },

  async get(id: string): Promise<any> {
    return apiFetch<any>(`/api/clients/${id}`);
  },

  async create(data: ClientCreationRequest): Promise<CreatedClient> {
    return apiFetch<CreatedClient>('/api/clients', {
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

  async approve(id: string): Promise<any> {
    return apiFetch<any>(`/api/clients/${id}/approve`, {
      method: 'PATCH',
    });
  },

  async reject(id: string, reason?: string): Promise<any> {
    return apiFetch<any>(`/api/clients/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
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
  async list(params?: string | { branchId?: string; businessUnitId?: string }): Promise<any[]> {
    if (typeof params === 'string') {
      return apiFetch<any[]>(`/api/pods${params ? `?branchId=${encodeURIComponent(params)}` : ''}`);
    }
    const q = new URLSearchParams();
    if (params?.branchId) q.set('branchId', params.branchId);
    if (params?.businessUnitId) q.set('businessUnitId', params.businessUnitId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<any[]>(`/api/pods${qs}`);
  },
  async get(id: string): Promise<any> {
    return apiFetch<any>(`/api/pods/${id}`);
  },
  async getAvailableRecruiters(params?: string | { branchId?: string; businessUnitId?: string }): Promise<any[]> {
    if (typeof params === 'string') {
      return apiFetch<any[]>(`/api/pods/available-recruiters${params ? `?branchId=${encodeURIComponent(params)}` : ''}`);
    }
    const q = new URLSearchParams();
    if (params?.branchId) q.set('branchId', params.branchId);
    if (params?.businessUnitId) q.set('businessUnitId', params.businessUnitId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<any[]>(`/api/pods/available-recruiters${qs}`);
  },
  async getMyTeam(): Promise<any> {
    return apiFetch<any>('/api/pods/my-team');
  },
  async findMyTeam(): Promise<any> {
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
  async resetCycle(params?: string | { branchId?: string; businessUnitId?: string }): Promise<any> {
    if (typeof params === 'string') {
      return apiFetch<any>(`/api/pods/reset-cycle${params ? `?branchId=${encodeURIComponent(params)}` : ''}`, {
        method: 'POST',
      });
    }
    const q = new URLSearchParams();
    if (params?.branchId) q.set('branchId', params.branchId);
    if (params?.businessUnitId) q.set('businessUnitId', params.businessUnitId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<any>(`/api/pods/reset-cycle${qs}`, {
      method: 'POST',
    });
  },
};

const submissions = {
  async previewAssessment(data: { jobId: string; candidateId?: string; skills: string[]; totalExperienceYears?: number; currentLocation?: string; preferredLocationMode: 'SPECIFIC_LOCATIONS' | 'REMOTE_ONLY' | 'REMOTE_OR_LOCATIONS'; preferredLocations?: string[]; noticePeriodDays?: number }): Promise<CandidateAssessment> {
    return apiFetch<CandidateAssessment>('/api/recruiter-submissions/assessment-preview', { method: 'POST', body: JSON.stringify(data) });
  },
  async downloadResume(id: string): Promise<{ blob: Blob; filename: string | null }> {
    const token = getToken();
    const headers: Record<string, string> = activeRoleHeaders();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${getApiBase()}/api/recruiter-submissions/${encodeURIComponent(id)}/resume`, { headers, cache: 'no-store' });
    if (!response.ok) {
      throw new Error(response.status === 404 ? 'No resume is available for this submission.'
        : response.status === 403 ? 'You cannot download this resume. Check your permission and submission approval status.'
        : 'Unable to download the resume. Please try again.');
    }
    const disposition = response.headers.get('Content-Disposition') || '';
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    let filename = disposition.match(/filename="([^"]+)"/i)?.[1] || null;
    if (encoded) { try { filename = decodeURIComponent(encoded); } catch { /* Use the plain filename. */ } }
    return { blob: await response.blob(), filename };
  },
  async getPersonProfile(id: string, kind: 'recruiter' | 'account-manager'): Promise<any> {
    return apiFetch(`/api/recruiter-submissions/${id}/people/${kind}`);
  },
  async assessment(id: string): Promise<{ submission: TrackerSubmission; assessment: CandidateAssessment }> {
    return apiFetch(`/api/recruiter-submissions/${id}/assessment`);
  },
  async history(id: string, page = 1, order: 'asc' | 'desc' = 'asc'): Promise<SubmissionHistoryResponse> {
    return apiFetch<SubmissionHistoryResponse>(`/api/recruiter-submissions/${id}/history?page=${page}&order=${order}`);
  },
  async list(filters?: TrackerListFilters): Promise<TrackerResponse> {
    const cleanFilters: Record<string, string> = {};
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          cleanFilters[key] = String(val);
        }
      });
    }
    const query = new URLSearchParams(cleanFilters).toString();
    return apiFetch<TrackerResponse>(`/api/recruiter-submissions${query ? `?${query}` : ''}`);
  },
  async recruiterDashboard(month: string, rangeDays: number): Promise<import('./submission-contract').RecruiterDashboardData> {
    return apiFetch(`/api/recruiter-submissions/dashboard?${new URLSearchParams({ month, rangeDays: String(rangeDays) })}`);
  },
  async calendarEvents(start: string, end: string): Promise<Array<{
    id: string; submissionId: string; title: string; start: string; status: string; round: string;
    candidateName: string; jobId: string; jobCode: string; jobTitle: string; recruiterName: string;
    interviewer: string | null; meetingLink: string | null; timezone: string | null; updatedAt: string; canManage: boolean; color: string | null;
  }>> {
    const params = new URLSearchParams({ start, end });
    return apiFetch(`/api/recruiter-submissions/calendar-events?${params.toString()}`);
  },
  async eligibleForInterview(filters: { page?: number; limit?: number; view?: string; search?: string } = {}): Promise<EligibleInterviewResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params.set(key, String(value)); });
    return apiFetch<EligibleInterviewResponse>(`/api/recruiter-submissions/eligible-for-interview?${params.toString()}`);
  },
  async get(id: string | number): Promise<TrackerSubmission> {
    return apiFetch<TrackerSubmission>(`/api/recruiter-submissions/${id}`);
  },
  async create(data: Record<string, any>): Promise<any> {
    return apiFetch<any>('/api/recruiter-submissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async update(id: string | number, data: TrackerUpdate | Record<string, any>): Promise<TrackerSubmission> {
    return apiFetch<TrackerSubmission>(`/api/recruiter-submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async delete(id: number): Promise<any> {
    return apiFetch<any>(`/api/recruiter-submissions/${id}`, {
      method: 'DELETE',
    });
  },
  async getTrackerStats(rangeDays?: 7 | 30 | 90, view?: 'my' | 'pod' | 'all'): Promise<TrackerStatsResponse> {
    const params = new URLSearchParams();
    if (rangeDays) params.set('rangeDays', String(rangeDays));
    if (view) params.set('view', view);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<any>(`/api/recruiter-submissions/tracker-stats${query}`);
  },
  async getCustomRemarks(branchId?: string, includeGlobal?: boolean): Promise<any[]> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (includeGlobal !== undefined) params.append('includeGlobal', String(includeGlobal));
    const qs = params.toString();
    return apiFetch<any[]>(`/api/recruiter-submissions/custom-remarks${qs ? `?${qs}` : ''}`);
  },
  async createCustomRemark(data: { stage: string; remarkText: string; remarkType?: 'ACCEPT' | 'REJECT' | 'GENERAL' | string; branchId?: string; isGlobal?: boolean }): Promise<any> {
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
  async delegationTargets(): Promise<any[]> {
    return apiFetch<any[]>('/api/branches/delegation-targets');
  },
  async list(options?: Pick<RequestInit, 'signal'>): Promise<any[]> {
    return apiFetch<any[]>('/api/branches', options);
  },
  async get(id: string): Promise<any> {
    return apiFetch<any>(`/api/branches/${id}`);
  },
  async toggleGlobalRemarks(id: string, enableGlobalRemarks?: boolean, selectedGlobalRemarkIds?: string): Promise<any> {
    return apiFetch<any>(`/api/branches/${id}/toggle-global-remarks`, {
      method: 'PATCH',
      body: JSON.stringify({ enableGlobalRemarks, selectedGlobalRemarkIds }),
    });
  },
  async create(data: {
    name: string;
    code?: string;
    city?: string;
    state?: string;
    country?: string;
    market?: string;
    timezone?: string;
                shiftTiming?: string;
    breakDurationMinutes?: number;
    enableGlobalRemarks?: boolean;
  }): Promise<any> {
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
    timezone?: string;
                shiftTiming?: string;
    breakDurationMinutes?: number;
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
  async assignUser(id: string, userId: string, roles?: string[], businessUnitId?: string): Promise<any> {
    return apiFetch<any>(`/api/branches/${id}/assign-user`, {
      method: 'POST',
      body: JSON.stringify({ userId, roles, businessUnitId }),
    });
  },
  async updateManagers(id: string, managerIds: string[]): Promise<any> {
    return apiFetch<any>(`/api/branches/${id}/managers`, {
      method: 'PATCH',
      body: JSON.stringify({ managerIds }),
    });
  },
  async updateRoutingPolicy(
    branchId: string,
    payload: {
      allowNone?: boolean;
      allowPods?: boolean;
      allowAll?: boolean;
      allowUnassigned?: boolean;
      podDistributionStrategy?: string;
    }
  ): Promise<any> {
    return apiFetch<any>(`/api/branches/${branchId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  async getHierarchy(): Promise<any> {
    return apiFetch<any>('/api/branches/hierarchy');
  },
};

const businessUnits = {
  deliveryDashboard(stage: DeliveryStage = 'review', page = 1, memberPage = 1) {
    return apiFetch<DeliveryDashboard>(`/api/business-units/current/dashboard?stage=${stage}&page=${page}&memberPage=${memberPage}`);
  },
  setCurrentUnitMemberActive(id: string, isActive: boolean) {
    return apiFetch<{ id: string; isActive: boolean }>(`/api/business-units/current/dashboard/members/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
  },
  async onboardingOptions(): Promise<{ id: string; name: string; branchId: string | null }[]> {
    return apiFetch('/api/business-units/onboarding-options');
  },
  async list(branchId?: string, options?: Pick<RequestInit, 'signal'>): Promise<any[]> {
    const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return apiFetch<any[]>(`/api/business-units${q}`, options);
  },
  async get(id: string): Promise<any> {
    return apiFetch<any>(`/api/business-units/${id}`);
  },
  async create(data: {
    name: string;
    branchId?: string;
    code?: string;
      address?: string;
      zipCode?: string;
      city?: string;
      state?: string;
    market?: string;
    marketSegmentId?: string | null;
    jobCodePattern?: string | null;
    currency?: string;
    shiftTiming?: string;
            timezone?: string;
        breakDurationMinutes?: number;
    allowNone?: boolean;
    allowPods?: boolean;
    allowUnassigned?: boolean;
    podDistributionStrategy?: string;
  }): Promise<any> {
    return apiFetch<any>('/api/business-units', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async update(
    id: string,
    data: {
      name?: string;
      branchId?: string;
      code?: string;
      market?: string;
      marketSegmentId?: string | null;
      jobCodePattern?: string | null;
      currency?: string;
      shiftTiming?: string;
                  timezone?: string;
            breakDurationMinutes?: number;
      allowNone?: boolean;
      allowPods?: boolean;
        allowUnassigned?: boolean;
      podDistributionStrategy?: string;
    },
  ): Promise<any> {
    const saved = await apiFetch<any>(`/api/business-units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('atsWorkspaceSettingsChanged'));
    return saved;
  },
  async delete(id: string): Promise<any> {
    return apiFetch<any>(`/api/business-units/${id}`, {
      method: 'DELETE',
    });
  },
  async delegationTargets(jobId?: string): Promise<any[]> {
    const q = jobId ? `?jobId=${encodeURIComponent(jobId)}` : '';
    return apiFetch<any[]>(`/api/business-units/delegation-targets${q}`);
  },
  async getMembers(id: string): Promise<any[]> {
    return apiFetch<any[]>(`/api/business-units/${id}/members`);
  },
  async getCandidateStaff(id: string): Promise<any[]> {
    return apiFetch<any[]>(`/api/business-units/${id}/candidate-staff`);
  },
  async assignMembers(id: string, userIds: string[]): Promise<any> {
    return apiFetch<any>(`/api/business-units/${id}/assign-members`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  },
  async removeMember(id: string, userId: string): Promise<any> {
    return apiFetch<any>(`/api/business-units/${id}/members/${userId}`, {
      method: 'DELETE',
    });
  },
  async updateAdmins(id: string, adminIds: string[]): Promise<any> {
    return apiFetch<any>(`/api/business-units/${id}/admins`, {
      method: 'PATCH',
      body: JSON.stringify({ adminIds }),
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

// ─── Market Segments ────────────────────────────────────────────────
const marketSegments = {
  async list(): Promise<any[]> {
    return apiFetch<any[]>('/api/market-segments');
  },
  async get(id: string): Promise<any> {
    return apiFetch<any>(`/api/market-segments/${id}`);
  },
  async create(data: {
    name: string;
    code: string;
    description?: string;
    defaultCurrency?: string;
    defaultTimezone?: string;
    defaultShift?: string;
    defaultStartTime?: string;
    defaultEndTime?: string;
    isActive?: boolean;
    sortOrder?: number;
  }): Promise<any> {
    return apiFetch<any>('/api/market-segments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async update(id: string, data: Partial<{
    name: string;
    code: string;
    description: string;
    defaultCurrency: string;
    defaultTimezone: string;
    defaultShift: string;
    defaultStartTime: string;
    defaultEndTime: string;
    isActive: boolean;
    sortOrder: number;
  }>): Promise<any> {
    return apiFetch<any>(`/api/market-segments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async delete(id: string): Promise<void> {
    return apiFetch<void>(`/api/market-segments/${id}`, { method: 'DELETE' });
  },
};

export interface PublicJobsApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scope: 'TENANT' | 'BRANCH' | 'BUSINESS_UNIT';
  branchId: string | null;
  businessUnitId: string | null;
  allowedOrigins: string[];
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

const publicJobsApiKeys = {
  list(): Promise<PublicJobsApiKey[]> {
    return apiFetch('/api/public-jobs/keys');
  },
  create(input: {
    name: string;
    scope: PublicJobsApiKey['scope'];
    branchId?: string;
    businessUnitId?: string;
    allowedOrigins: string[];
    expiresAt: string;
  }): Promise<PublicJobsApiKey & { secret: string; message: string }> {
    return apiFetch('/api/public-jobs/keys', { method: 'POST', body: JSON.stringify(input) });
  },
  revoke(id: string): Promise<{ revoked: boolean }> {
    return apiFetch(`/api/public-jobs/keys/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

export type CareerOauthClient = Omit<PublicJobsApiKey, 'keyPrefix' | 'expiresAt'> & { expiresAt: string | null };
const careerOauthClients = {
 list: (options?: Pick<RequestInit, 'signal'>) => apiFetch<CareerOauthClient[]>('/api/developer/clients', options),
 create: (input: { name: string; scope: CareerOauthClient['scope']; branchId?: string; businessUnitId?: string; allowedOrigins: string[]; expiryMonths: number | null }) => apiFetch<CareerOauthClient & { client_id: string; client_secret: string }>('/api/developer/clients', { method: 'POST', body: JSON.stringify(input) }),
 revoke: (id: string) => apiFetch('/api/developer/clients/' + encodeURIComponent(id), { method: 'DELETE' }),
};

// ─── Export ─────────────────────────────────────────────────────────
const profile = {
  async get(): Promise<StaffProfile> {
    const profile = await apiFetch<StaffProfile>('/api/auth/me');
    setCurrentUser(profile);
    return profile;
  },
  async saveDetails(input: ProfileDetailsInput) {
    const saved = await apiFetch<StaffProfile>('/api/auth/me/details', { method: 'PATCH', body: JSON.stringify(input) });
    setCurrentUser(saved);
    return saved;
  },
  async uploadPhoto(file: File) {
    const body = new FormData();
    body.append('file', file);
    const saved = await apiFetch<StaffProfile>('/api/auth/me/photo', { method: 'POST', body });
    setCurrentUser(saved);
    return saved;
  },
  async removePhoto() {
    const saved = await apiFetch<StaffProfile>('/api/auth/me/photo', { method: 'DELETE' });
    setCurrentUser(saved);
    return saved;
  },
  signatures: () => apiFetch<SignatureSettings>('/api/auth/me/signatures'),
  saveSignature: (input: SignatureInput) => apiFetch<SignatureSettings>('/api/auth/me/signatures', { method: 'POST', body: JSON.stringify(input) }),
  deleteSignature: (id: string) => apiFetch<SignatureSettings>(`/api/auth/me/signatures/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  saveSignatureDefaults: (input: SignatureDefaultsInput) => apiFetch<SignatureSettings>('/api/auth/me/signatures/defaults', { method: 'PATCH', body: JSON.stringify(input) }),
  previewSignature: (html: string) => apiFetch<{ html: string }>('/api/auth/me/signatures/preview', { method: 'POST', body: JSON.stringify({ html }) }),
};

export const atsApi = {
  careerOauthClients,
  publicJobsApiKeys,
  profile,
  auth,
  jobs,
  candidates,
  clients,
  pods,
  branches,
  businessUnits,
  marketSegments,
  submissions,
  auditLogs,
  integrations,
  email,
  fetch: apiFetch,
};


