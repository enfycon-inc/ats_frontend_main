type MemberRoleForm = {
  branchId: string;
  roles?: string[];
  branchRoles?: Record<string, string[]>;
};

type AvailableMemberRole = { id: string; name: string; branchId?: string | null; branch_id?: string | null };

/** The branch role picker is authoritative, including an explicitly empty selection. */
export function getSelectedMemberRoleIds(form: MemberRoleForm, availableRoles: AvailableMemberRole[]): string[] {
  const selection = form.branchRoles?.[form.branchId] ?? form.roles ?? [];
  const branchRoles = availableRoles.filter(role => {
    const branchId = role.branchId || role.branch_id;
    return !branchId || branchId === form.branchId;
  });
  return Array.from(new Set(selection.map(value => {
    const exact = branchRoles.find(role => role.id.toLowerCase() === value.toLowerCase());
    if (exact) return exact.id;
    const matches = branchRoles.filter(role => role.name.toLowerCase() === value.toLowerCase());
    if (matches.length !== 1) throw new Error(`Please reselect the role "${value}" for this branch.`);
    return matches[0].id;
  })));
}

export type MemberRole = AvailableMemberRole & { isSystem?: boolean; systemRole?: string; system_role?: string };

export function getAdministrativeRoleKey(role?: MemberRole): string {
  if (!role?.isSystem) return "NONE";
  const key = role.systemRole || role.system_role;
  return key === "SUPER_ADMIN" ? "TENANT_ADMIN" : key || "NONE";
}

export function hasAdministrativeRole(ids: string[], roles: MemberRole[], key: string): boolean {
  return ids.some(id => getAdministrativeRoleKey(roles.find(role => role.id === id)) === key);
}

export function toggleAdministrativeRole(ids: string[], assignedRoles: MemberRole[], availableRoles: MemberRole[], key: string): string[] {
  if (hasAdministrativeRole(ids, assignedRoles, key)) {
    return ids.filter(id => getAdministrativeRoleKey(assignedRoles.find(role => role.id === id)) !== key);
  }
  const role = availableRoles.find(role => getAdministrativeRoleKey(role) === key);
  if (!role) throw new Error("This administrative role is unavailable in your current access scope. Refresh the page or contact your administrator.");
  return [...new Set([...ids, role.id])];
}
