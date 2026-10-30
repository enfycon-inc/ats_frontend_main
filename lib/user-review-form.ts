import type { RoleRequestDecision } from './role-request-contract';
import type { ReviewForm, ReviewMember } from '@/components/users/role-request-review-modal';

type Role = { id: string; name: string; systemRole?: string | null; system_role?: string | null;
  branchId?: string | null; branch_id?: string | null; businessUnitId?: string | null; business_unit_id?: string | null };
export function reviewCategory(value?: string | null): string {
  const key = String(value || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (['TENANT_ADMIN', 'WORKSPACE_ADMIN', 'WORKSPACE_ADMINISTRATOR', 'SUPER_ADMIN'].includes(key)) return 'TENANT_ADMIN';
  if (['BRANCH_ADMIN', 'BRANCH_ADMINISTRATOR'].includes(key)) return 'BRANCH_ADMIN';
  if (['UNIT_ADMIN', 'BRANCH_UNIT_ADMIN'].includes(key)) return 'UNIT_ADMIN';
  return 'EMPLOYEE';
}
export function initialReviewForm(user: ReviewMember, roles: Role[]): ReviewForm {
  const requested = roles.find(r => r.id === user.requestedRoleId || r.id === user.requestedRole)
    || roles.find(r => r.name === user.requestedRole && (!r.branchId && !r.branch_id || (r.branchId || r.branch_id) === user.branchId)
      && (!r.businessUnitId && !r.business_unit_id || (r.businessUnitId || r.business_unit_id) === user.businessUnitId));
  const category = reviewCategory(requested?.systemRole || requested?.system_role || user.requestedRole);
  return { roleCategory: category, roleId: requested?.id || '', roles: requested ? [requested.name] : user.requestedRole ? [user.requestedRole] : [],
    branchId: category === 'TENANT_ADMIN' ? 'none' : user.branchId || '',
    businessUnitId: ['TENANT_ADMIN', 'BRANCH_ADMIN'].includes(category) ? 'none' : user.businessUnitId || '' };
}
export function reviewRoles(roles: Role[], form: ReviewForm): Role[] {
  return roles.filter(r => {
    const category = reviewCategory(r.systemRole || r.system_role || r.name);
    const branch = r.branchId || r.branch_id, unit = r.businessUnitId || r.business_unit_id;
    if (branch && branch !== form.branchId || unit && unit !== form.businessUnitId) return false;
    return category === form.roleCategory;
  });
}
export function approvalDecision(form: ReviewForm, roles: Role[], version?: string | null): RoleRequestDecision {
  if (form.roleCategory !== 'TENANT_ADMIN' && (!form.branchId || form.branchId === 'none')) throw new Error('Select an office branch.');
  if (!['TENANT_ADMIN', 'BRANCH_ADMIN'].includes(form.roleCategory) && (!form.businessUnitId || form.businessUnitId === 'none')) throw new Error('Select a branch unit.');
  const available = reviewRoles(roles, form);
  const selected = form.roleCategory === 'EMPLOYEE'
    ? available.filter(r => form.roles.includes(r.id) || form.roles.includes(r.name))
    : available.filter(r => r.id === form.roleId || r.systemRole === form.roleId || r.system_role === form.roleId || (!r.systemRole && !r.system_role && reviewCategory(r.name) === form.roleId));
  if (!selected.length) throw new Error('Select an available role for this office.');
  return { expectedRequestVersion: version || undefined, roleId: selected[0].id, roleIds: selected.map(r => r.id),
    roles: selected.map(r => r.name), branchId: form.roleCategory === 'TENANT_ADMIN' ? null : form.branchId,
    businessUnitId: ['TENANT_ADMIN', 'BRANCH_ADMIN'].includes(form.roleCategory) ? null : form.businessUnitId };
}
