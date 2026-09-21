import { cache } from "react";
import type { CustomRoleDefinition } from "./role-permissions";

export type NavigationBootstrap = {
  profile: any;
  roles: CustomRoleDefinition[];
  overrideRole: string | null;
};

// The profile contains the member's exact assignments. The management catalog
// intentionally hides replaced system roles and roles outside the active branch.
export async function loadDashboardNavigation(
  getProfile: () => Promise<any>,
  getLegacyRoles: () => Promise<CustomRoleDefinition[]>,
): Promise<NavigationBootstrap> {
  const profile = await getProfile();
  if (!profile?.id) throw new Error("Workspace profile is unavailable");
  const roles = Array.isArray(profile.assignedRoles) ? profile.assignedRoles : await getLegacyRoles();
  if (!Array.isArray(roles)) throw new Error("Workspace roles are unavailable");
  return { profile, roles, overrideRole: null };
}

// Request-local data only: never cache one member's navigation for another.
export const loadNavigationBootstrap = cache(async function(base: string, token: string): Promise<NavigationBootstrap | null> {
  if (!token) return null;
  try {
    const signal = AbortSignal.timeout(8000);
    const get = async (path: string) => {
      const response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal,
      });
      if (!response.ok) throw new Error("Workspace access could not be loaded");
      return response.json();
    };
    return await loadDashboardNavigation(() => get("/api/auth/me"), () => get("/api/auth/rbac/roles?includeSystem=true"));
  } catch { return null; }
});
