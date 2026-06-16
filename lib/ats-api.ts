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
 *   await atsApi.auth.login('admin@enfycon.com', 'Admin@123');
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('localhost', '127.0.0.1');

// ─── Token Management ──────────────────────────────────────────────
const TOKEN_KEY = 'ats_access_token';
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

function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
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

// ─── HTTP Helper ────────────────────────────────────────────────────
async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || `API Error: ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ─── Auth API ───────────────────────────────────────────────────────
const auth = {
  async login(email: string, password: string) {
    const data = await apiFetch<{
      accessToken: string;
      expiresIn: number;
      tokenType: string;
      user: {
        id: string;
        email: string;
        fullName: string;
        roles: string[];
        tenantId: string;
      };
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setToken(data.accessToken);
    setCurrentUser(data.user);
    return data;
  },

  async me() {
    return apiFetch('/api/auth/me');
  },

  logout() {
    clearToken();
  },

  getToken,
  getCurrentUser,
  isAuthenticated(): boolean {
    return !!getToken();
  },

  async listPendingApprovals(): Promise<any[]> {
    return apiFetch<any[]>('/api/auth/approvals/pending');
  },

  async approveUser(userId: string, market: string, subdomain?: string): Promise<any> {
    return apiFetch<any>(`/api/auth/approvals/approve/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ market, subdomain }),
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
  }): Promise<any> {
    return apiFetch<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async listUsers(): Promise<any[]> {
    return apiFetch<any[]>('/api/auth/users');
  },

  async setUserStatus(userId: string, isActive: boolean): Promise<any> {
    return apiFetch<any>(`/api/auth/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
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

  async deleteCustomRole(roleId: string): Promise<any> {
    return apiFetch<any>(`/api/auth/rbac/roles/${roleId}`, {
      method: 'DELETE',
    });
  },

  async assignUserRoles(userId: string, roleIds: string[]): Promise<any> {
    return apiFetch<any>(`/api/auth/rbac/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roleIds }),
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
}

const jobs = {
  async list(): Promise<JobPayload[]> {
    return apiFetch<JobPayload[]>('/api/jobs');
  },

  async get(id: string): Promise<JobPayload> {
    return apiFetch<JobPayload>(`/api/jobs/${id}`);
  },

  async create(data: Record<string, any>): Promise<JobPayload> {
    return apiFetch<JobPayload>('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

const candidates = {
  async list(): Promise<any[]> {
    return apiFetch<any[]>('/api/candidates');
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

  async parseResume(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/api/candidates/parse`, {
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

// ─── Export ─────────────────────────────────────────────────────────
export const atsApi = {
  auth,
  jobs,
  candidates,
  fetch: apiFetch,
};

