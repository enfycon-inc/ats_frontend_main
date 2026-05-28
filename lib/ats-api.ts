/**
 * ats-api.ts — Typed API client for the NestJS ATS backend
 *
 * All API calls go through this file. It handles:
 * - Token storage in localStorage
 * - Auto-attaching Bearer token on every request
 * - Login/logout flow
 * - Typed request/response for Jobs, Auth, etc.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

  if (res.status === 204) return undefined as T;

  return res.json();
}

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
    return typeof window !== 'undefined' && !!getToken();
  },
};

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

export const atsApi = {
  auth,
  jobs,
  fetch: apiFetch,
};
