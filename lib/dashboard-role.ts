import { CustomRoleDefinition, resolveActiveSystemRole } from "./role-permissions";
import { getSavedDashboardRole } from "./dashboard-preference";

// A dashboard perspective is presentation only. API permissions remain authoritative.
export function getDashboardRoleSelection(profile: any, roles: CustomRoleDefinition[], override?: string | null, readBrowserPreference = true) {
  if (readBrowserPreference) override = getSavedDashboardRole(profile) || override;
  const ids: string[] = Array.isArray(profile?.assignedRoleIds) ? profile.assignedRoleIds : [];
  const assignedIds = new Set(ids.length ? ids : [profile?.roleId].filter(Boolean));
  let options = roles.filter(role => assignedIds.has(role.id));
  if (!assignedIds.size) {
    const names: string[] = profile?.roles || [];
    options = roles.filter(role => names.some(name => name.toLowerCase() === role.name.toLowerCase()));
  }
  const primary = options.find(role => role.id === profile?.roleId);
  // Names are accepted for old saved switches; new switches persist exact IDs.
  const selected = options.find(role => role.id === override) ||
    options.find(role => role.name.toLowerCase() === override?.toLowerCase());
    
  const fallback = options.find(r => {
    const sys = resolveActiveSystemRole(r.systemRole || (r as any).replacesSystemRole || r.name, roles, profile);
    return sys === "SUPER_ADMIN" || sys === "ADMIN" || sys === "TENANT_ADMIN";
  }) || options[0];

  // When options is empty (roles haven't loaded yet), build a synthetic role
  // directly from the profile's DB-sourced fields so the sidebar renders the
  // correct layout immediately — no UUID lookup needed.
  const syntheticFallback = {
    id: profile?.roleId || "",
    name: profile?.roleName || profile?.systemRole || "User",
    // Ensure systemRole is always populated from the profile so the sidebar
    // can resolve the correct menu without needing availableRoles to be loaded.
    systemRole: profile?.systemRole || undefined,
  };

  const active = selected || primary || fallback || syntheticFallback;
  return {
    options,
    active,
    systemRole: resolveActiveSystemRole(active.systemRole || (active as any).replacesSystemRole || active.name, roles, profile),
  };
}

