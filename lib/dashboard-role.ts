import { CustomRoleDefinition, resolveActiveSystemRole } from "./role-permissions";
import { getSavedDashboardRole } from "./dashboard-preference";

// Assigned roles are switcher options; the backend grants only the active role's permissions.
export function getDashboardRoleSelection(profile: any, roles: CustomRoleDefinition[], override?: string | null, readBrowserPreference = true) {
  if (readBrowserPreference) override = getSavedDashboardRole(profile) || override;
  const assignedIds = new Set<string>([...(profile?.assignedRoleIds || []), profile?.roleId].filter(Boolean));
  const byId = new Map<string, CustomRoleDefinition>();
  for (const role of [...roles, ...(profile?.assignedRoles || [])]) if (assignedIds.has(role.id)) byId.set(role.id, role);
  if (profile?.roleId && !byId.has(profile.roleId)) byId.set(profile.roleId, {
    id: profile.roleId, name: profile.roleName || profile.systemRole || "User", systemRole: profile.systemRole,
  });
  const options = Array.from(byId.values());
  const named = options.filter(role => role.name.toLowerCase() === override?.toLowerCase());
  const selected = options.find(role => role.id === override) || (named.length === 1 ? named[0] : undefined);
  const active = selected || options.find(role => role.id === profile?.roleId) || options[0] || {
    id: "", name: profile?.roleName || "User", systemRole: profile?.systemRole,
  };
  return { options, active, systemRole: resolveActiveSystemRole(active.systemRole || active.replacesSystemRole, [], profile) };
}
