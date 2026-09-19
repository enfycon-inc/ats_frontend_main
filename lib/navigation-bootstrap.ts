import type { CustomRoleDefinition } from "./role-permissions";

export type NavigationBootstrap = {
  profile: any;
  roles: CustomRoleDefinition[];
  overrideRole: string | null;
};

// Request-local data only: never cache one member's navigation for another.
export async function loadNavigationBootstrap(base: string, token: string): Promise<NavigationBootstrap | null> {
  if (!token) return null;
  try {
    const responses = await Promise.all([
      "/api/auth/me", "/api/auth/rbac/roles?includeSystem=true",
    ].map(path => fetch(`${base.replace(/\/$/, "")}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })));
    if (responses.some(response => !response.ok)) return null;
    const [profile, roles] = await Promise.all(responses.map(response => response.json()));
    return profile?.id && Array.isArray(roles) ? { profile, roles, overrideRole: null } : null;
  } catch { return null; }
}
