"use client";
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { atsApi } from '@/lib/ats-api';
import { isAutomaticPodLeadRole } from '@/lib/pod-lead-role-policy';
import type { ManagementRow } from '@/lib/user-management.contract';
import { RoleRequestReviewModal, type ReviewForm } from './role-request-review-modal';
import { reviewCategory, reviewRoles, approvalDecision, initialReviewForm } from '@/lib/user-review-form';

export function PendingUserReview({ user, scope, profile, permissions, onClose, onChanged }: {
  user: ManagementRow; scope: string; profile: { branchId?: string | null; businessUnitId?: string | null };
  permissions: string[]; onClose: () => void; onChanged: () => void;
}) {
  const [form, setForm] = useState<ReviewForm>(initialReviewForm(user, []));
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [error, setError] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);
  const options = useSWR(['pending-user-review-options', scope], async () => {
    const [branches, units, roles] = await Promise.all([
      atsApi.branches.list(), atsApi.businessUnits.list(), atsApi.auth.listRoles('ALL', true),
    ]);
    return { branches, units, roles };
  }, { revalidateOnFocus: false });
  const request = useSWR(user.requestVersion ? ['pending-user-request', scope, user.id, user.requestVersion] : null,
    () => atsApi.auth.reviewRoleRequest(user.id, user.requestVersion!), { revalidateOnFocus: false });
  const initialized = useRef(false);
  useEffect(() => {
    if (options.data && (!user.requestVersion || request.data) && !initialized.current) {
      initialized.current = true;
      const current = request.data;
      setForm(initialReviewForm(current ? { ...user, ...current, requestedRoleId: current.roleId } : user, options.data.roles));
    }
  }, [options.data, request.data, user]);
  const tenantWide = permissions.some(p => ['*', 'platform:manage', 'tenant:manage', 'tenant:settings'].includes(p));
  const branchWide = !tenantWide && permissions.includes('branch_admin:manage');
  const unitScoped = !tenantWide && !branchWide;
  const rows = options.data;
  const permittedRoles = (rows?.roles || []).filter((role: any) => {
    if (isAutomaticPodLeadRole(role)) return false;
    if (tenantWide) return true;
    let grants: unknown = role.permissions;
    if (typeof grants === 'string') { try { grants = JSON.parse(grants); } catch { return false; } }
    return Array.isArray(grants) && grants.every((p: string) => permissions.includes(p));
  });
  const availableRoles = reviewRoles(permittedRoles, form);
  const allowedCategories = [...new Set(permittedRoles.map((role: any) => reviewCategory(role.systemRole || role.system_role || role.name)))];
  const branches = (rows?.branches || []).filter((b: any) => tenantWide || b.id === profile.branchId);
  const units = (rows?.units || []).filter((u: any) => !unitScoped || u.id === profile.businessUnitId);
  const currentUser = request.data ? { ...user, ...request.data, requestedRoleId: request.data.roleId } : user;
  const close = () => { if (!guard.current) onClose(); };
  const decide = async (reject: boolean) => {
    if (guard.current || !rows) return;
    setError('');
    let decision;
    try { if (!reject) decision = approvalDecision(form, permittedRoles, currentUser.requestVersion); }
    catch (e) { setError(e instanceof Error ? e.message : 'Check the selected role and office.'); return; }
    guard.current = true; setBusy(true);
    try {
      const response = reject
        ? await atsApi.auth.rejectUser(user.id, currentUser.requestVersion || undefined)
        : await atsApi.auth.approveUser(user.id, decision);
      if (response?.emailNotification?.status === 'failed') toast.error(response.emailNotification.message || 'User approved, but the notification email failed.');
      else toast.success(reject ? 'Request rejected.' : response?.emailNotification?.status === 'queued' ? 'User approved. Notification emails queued.' : 'User approved and activated.');
      onChanged(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to complete this request.');
      setConfirmReject(false);
    } finally { guard.current = false; setBusy(false); }
  };
  const loadError = options.error || request.error;
  if (!rows || !initialized.current || loadError) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-label="Review role request" className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 text-sm dark:bg-slate-900">
    <h2 className="font-semibold">Review &amp; Approve Role Request</h2>
    {loadError ? <><p role="alert">{loadError instanceof Error ? loadError.message : 'Unable to load this request.'}</p><button onClick={() => { void options.mutate(); void request.mutate(); }}>Try again</button></> : <p role="status">Loading request details…</p>}
    <button onClick={close}>Cancel</button>
  </section></div>;
  return <>
    <RoleRequestReviewModal reviewUser={currentUser} reviewForm={form} setReviewForm={setForm}
      branches={branches} businessUnits={units} availableReviewRoles={availableRoles} allowedCategories={allowedCategories}
      isBranchAdmin={branchWide} isUnitScoped={unitScoped} isUnitAdmin={unitScoped}
      busy={busy || confirmReject} error={error} onClose={close}
      onApprove={() => void decide(false)} onReject={() => setConfirmReject(true)} />
    {confirmReject && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="reject-request-title" className="w-full max-w-md space-y-4 rounded-xl bg-white p-5 text-sm dark:bg-slate-900">
      <h2 id="reject-request-title" className="font-semibold">Reject request for {user.fullName}?</h2>
      <p>This rejects the pending registration. It does not approve or activate the account.</p>
      <div className="flex justify-end gap-3"><button disabled={busy} onClick={() => setConfirmReject(false)}>Cancel</button><button disabled={busy} onClick={() => void decide(true)} className="rounded bg-rose-600 px-3 py-2 font-semibold text-white">{busy ? 'Rejecting…' : 'Reject Request'}</button></div>
    </section></div>}
  </>;
}
