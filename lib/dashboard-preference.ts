type Identity = { id?: string; tenantId?: string } | null | undefined;

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
  try { return localStorage.getItem(key); } catch { return null; }
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
