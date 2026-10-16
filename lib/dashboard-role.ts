import { CustomRoleDefinition, resolveActiveSystemRole } from "./role-permissions";
import { getSavedDashboardRole } from "./dashboard-preference";

// Assigned roles are switcher options; the backend grants only the active role's permissions.
export function getDashboardRoleSelection(profile: any, roles: CustomRoleDefinition[], override?: string | null, readBrowserPreference = true) {
  if (readBrowserPreference) override = getSavedDashboardRole(profile) || override;
  const assignedRoleIds = Array.isArray(profile?.assignedRoleIds) ? profile.assignedRoleIds : [];
  const profileRoles = Array.isArray(profile?.assignedRoles) ? profile.assignedRoles : [];
  const assignedIds = new Set<string>([...assignedRoleIds, profile?.roleId].filter(Boolean));
  const byId = new Map<string, CustomRoleDefinition>();
  for (const role of [...roles, ...profileRoles]) if (role?.id && assignedIds.has(role.id)) byId.set(role.id, role);
  if (profile?.roleId && !byId.has(profile.roleId)) byId.set(profile.roleId, {
    id: profile.roleId, name: profile.roleName || profile.systemRole || "", systemRole: profile.systemRole,
  });
  const options = Array.from(byId.values());
  const named = options.filter(role => role.name?.toLowerCase() === override?.toLowerCase());
  const selected = options.find(role => role.id === override) || (named.length === 1 ? named[0] : undefined);
  const active = selected || options.find(role => role.id === profile?.roleId) || {
    id: "", name: "", systemRole: undefined,
  };
  const hasConfirmedRole = Boolean(active.id && active.name);
  const activeSystemRole = active.systemRole || active.replacesSystemRole ||
    (active.id === profile?.roleId ? profile?.systemRole : null);
  return {
    options,
    active,
    systemRole: hasConfirmedRole && activeSystemRole
      ? resolveActiveSystemRole(activeSystemRole, [], profile)
      : null,
  };
}
