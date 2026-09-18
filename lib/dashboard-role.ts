import { CustomRoleDefinition, resolveActiveSystemRole } from "./role-permissions";

// A dashboard perspective is presentation only. API permissions remain authoritative.
export function getDashboardRoleSelection(profile: any, roles: CustomRoleDefinition[], override?: string | null) {
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
  const active = selected || primary || options[0] || {
    id: profile?.roleId || "",
    name: profile?.roleName || "User",
    systemRole: profile?.systemRole,
  };
  return {
    options,
    active,
    systemRole: resolveActiveSystemRole(active.systemRole || active.replacesSystemRole || active.name, roles, profile),
  };
}
