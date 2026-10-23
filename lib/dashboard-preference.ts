type Identity = {
  id?: string;
  tenantId?: string;
  roleId?: string | null;
  assignedRoleIds?: string[];
  assignedRoles?: Array<{ id?: string | null }>;
} | null | undefined;

export function dashboardPreferenceCookie(profile: Identity) {
  return profile?.id && profile.tenantId
    ? `ats_dashboard_${encodeURIComponent(profile.tenantId)}_${encodeURIComponent(profile.id)}`
    : null;
}

function preferenceKey(profile: Identity) {
  return profile?.id && profile.tenantId
    ? `ats_dashboard_role:${profile.tenantId}:${profile.id}`
    : null;
}

export function getSavedDashboardRole(profile: Identity): string | null {
  const key = preferenceKey(profile);
  if (!key || typeof window === "undefined") return null;
  try {
    const savedRole = localStorage.getItem(key);
    if (!savedRole) return null;

    // Once a current profile is available, never keep sending a role that was
    // removed from this member. Sparse session identities are not authoritative.
    const hasAssignmentSnapshot = Array.isArray(profile?.assignedRoleIds) || Array.isArray(profile?.assignedRoles);
    if (hasAssignmentSnapshot) {
      const assigned = new Set([
        profile?.roleId,
        ...(profile?.assignedRoleIds || []),
        ...(profile?.assignedRoles || []).map((role) => role?.id),
      ].filter((id): id is string => typeof id === "string" && id.length > 0));
      if (!assigned.has(savedRole)) {
        clearSavedDashboardRole(profile);
        return null;
      }
    }
    return savedRole;
  } catch { return null; }
}

export function clearSavedDashboardRole(profile: Identity) {
  if (!profile?.id || !profile.tenantId || typeof window === "undefined") return;
  saveDashboardRole(profile, null);
  try { localStorage.removeItem("override_role"); } catch { /* Continue clearing the scoped preference. */ }
  window.dispatchEvent(new CustomEvent("overrideRoleChanged", {
    detail: { role: null, profileId: profile.id, tenantId: profile.tenantId },
  }));
}

export function saveDashboardRole(profile: Identity, roleId: string | null) {
  const key = preferenceKey(profile);
  if (!key || typeof window === "undefined") return;
  const cookie = dashboardPreferenceCookie(profile);
  if (cookie && typeof document !== "undefined") {
    document.cookie = `${cookie}=${encodeURIComponent(roleId || "")}; Path=/; Max-Age=${roleId ? 31536000 : 0}; SameSite=Lax${window.location?.protocol === "https:" ? "; Secure" : ""}`;
  }
  try {
    if (roleId) localStorage.setItem(key, roleId);
    else localStorage.removeItem(key);
  } catch { /* The current switch still works when browser storage is unavailable. */ }
}
