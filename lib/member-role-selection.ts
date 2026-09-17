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
