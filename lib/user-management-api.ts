import { apiFetch } from './ats-api';
import type { DirectoryPage, SecurityEventItem, SessionItem } from './user-management.contract';
export const userManagementApi = {
  list: (query: string) => apiFetch<DirectoryPage>(`/api/user-management/users?${query}`),
  sessions: (id: string, page = 1) => apiFetch<SessionItem[]>(`/api/user-management/users/${encodeURIComponent(id)}/sessions?page=${page}`),
  events: (id: string, page = 1) => apiFetch<SecurityEventItem[]>(`/api/user-management/users/${encodeURIComponent(id)}/events?page=${page}`),
  exportEvents: (id: string) => apiFetch<SecurityEventItem[]>(`/api/user-management/users/${encodeURIComponent(id)}/events/export`),
  revoke: (id: string) => apiFetch<{ success: boolean; message: string }>(`/api/user-management/sessions/${encodeURIComponent(id)}/revoke`, { method: 'POST' }),
};
