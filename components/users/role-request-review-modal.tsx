"use client";
import type { Dispatch, SetStateAction } from 'react';
import { Shield, X, Users, Building2, Briefcase, Check, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';
export interface ReviewMember {
  id: string; fullName: string; email: string; requestedRole?: string | null;
  requestedRoleId?: string | null; requestVersion?: string | null; roleId?: string | null;
  branchId?: string | null; businessUnitId?: string | null;
}
export interface ReviewForm { roleCategory: string; roleId: string; roles: string[]; branchId: string; businessUnitId: string }
interface Props {
  reviewUser: ReviewMember; reviewForm: ReviewForm; setReviewForm: Dispatch<SetStateAction<ReviewForm>>;
  branches: any[]; businessUnits: any[]; availableReviewRoles: any[];
  isBranchAdmin: boolean; isUnitScoped: boolean; isUnitAdmin: boolean;
  busy: boolean; error?: string; allowedCategories?: string[]; onClose: () => void; onApprove: () => void; onReject: () => void;
}
export function RoleRequestReviewModal({ reviewUser, reviewForm, setReviewForm, branches, businessUnits, availableReviewRoles,
  isBranchAdmin, isUnitScoped, isUnitAdmin, busy, error, allowedCategories, onClose, onApprove, onReject }: Props) {
  return (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="role-review-title" className="max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between bg-neutral-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="role-review-title" className="text-sm font-bold text-neutral-900 dark:text-white">
                    Review & Approve Role Request
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Review request details, configure branch office and unit, then approve access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                aria-label="Close review"
                onClick={() => {
                  onClose();
                }}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* User Summary Card */}
              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {reviewUser.fullName || "User"}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-200">
                      Pending Request
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {reviewUser.email}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px]">
                  <div>
                    <span className="text-neutral-400 block text-[10px] font-medium">Requested Role:</span>
                    <span className="font-bold text-amber-800 dark:text-amber-300">
                      {reviewUser.requestedRole ? reviewUser.requestedRole.replace(/_/g, " ") : "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] font-medium">Requested Branch:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {branches.find(b => b.id === reviewUser.branchId)?.name || (reviewUser.requestedRole?.toUpperCase() === 'TENANT_ADMIN' ? "None (HQ)" : "None")}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] font-medium">Requested Unit:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {businessUnits.find(u => u.id === reviewUser.businessUnitId)?.name || (reviewUser.requestedRole?.toUpperCase() === 'BRANCH_ADMIN' ? "Branch-Wide" : "None")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Controls */}
<div className="space-y-4">
  {/* 1. Select Role Category */}
  <div>
    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
      1. Select Role Category
    </label>
    <div className="grid grid-cols-2 gap-2.5">
      {[
        { id: "EMPLOYEE", title: "Branch Employee", icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40" },
        { id: "BRANCH_ADMIN", title: "Branch Admin", icon: Building2, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/40" },
        { id: "UNIT_ADMIN", title: "Branch Unit Admin", icon: Briefcase, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
        { id: "TENANT_ADMIN", title: "Workspace Admin", icon: Shield, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/40" }
      ].filter(cat => !allowedCategories || allowedCategories.includes(cat.id)).map((cat) => {
        const isSelected = reviewForm.roleCategory === cat.id;
        const Icon = cat.icon;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setReviewForm(prev => {
                const updates: { roleCategory: string; roles: string[]; roleId: string; branchId?: string; businessUnitId?: string } = { roleCategory: cat.id, roles: [], roleId: "" };
                if (cat.id === "TENANT_ADMIN") {
                  updates.branchId = "none";
                  updates.businessUnitId = "none";
                  updates.roles = ["Tenant Admin"];
                  updates.roleId = "TENANT_ADMIN";
                } else if (cat.id === "BRANCH_ADMIN") {
                  updates.businessUnitId = "none";
                  updates.roles = ["Branch Admin"];
                  updates.roleId = "BRANCH_ADMIN";
                  if (prev.branchId === "none") updates.branchId = "";
                } else if (cat.id === "UNIT_ADMIN") {
                  updates.roles = ["Unit Admin"];
                  updates.roleId = "UNIT_ADMIN";
                  if (prev.branchId === "none") updates.branchId = "";
                  if (prev.businessUnitId === "none") updates.businessUnitId = "";
                } else {
                  if (prev.branchId === "none") updates.branchId = "";
                  if (prev.businessUnitId === "none") updates.businessUnitId = "";
                }
                return { ...prev, ...updates };
              });
            }}
            className={cn(
              "relative flex flex-col items-start p-3 rounded-xl transition-all duration-200 border-2 text-left group cursor-pointer",
              isSelected
                ? "border-indigo-600 bg-white dark:bg-slate-800 shadow-md ring-2 ring-indigo-600/10"
                : "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("p-1.5 rounded-lg", cat.bg, cat.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs text-neutral-900 dark:text-white leading-tight">
                {cat.title}
              </h4>
            </div>
          </button>
        );
      })}
    </div>
  </div>

  {reviewForm.roleCategory !== "TENANT_ADMIN" && (
    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
      <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
        2. Branch & Unit Selection
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">Office Branch *</label>
          {isBranchAdmin || isUnitScoped ? (
             <div className="flex items-center gap-2 min-h-9 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                {(() => {
                   const b = branches.find((b) => b.id === reviewForm.branchId);
                   if (!b) return <span>Assigned Branch</span>;
                   return (
                     <span className="flex flex-col leading-tight">
                       <span className="font-semibold">{b.name}</span>
                       {(b.city || b.state) && (
                         <span className="text-[9px] font-normal text-neutral-400">{b.city}{b.city && b.state ? ", " : ""}{b.state}</span>
                       )}
                     </span>
                   );
                })()}
             </div>
          ) : (
          <Select
            value={reviewForm.branchId || undefined}
            onValueChange={(val) => {
              setReviewForm(prev => ({ ...prev, branchId: val, businessUnitId: prev.roleCategory === "BRANCH_ADMIN" ? "none" : "" }));
            }}
          >
            <SelectTrigger className="h-9 text-xs rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <SelectValue placeholder="Select Office Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id} className="text-xs">
                  <div className="flex flex-col text-left py-0.5">
                    <span className="font-semibold text-neutral-900 dark:text-white">{b.name}</span>
                    {(b.city || b.state) && (
                      <span className="text-[9.5px] font-normal text-neutral-500 dark:text-neutral-400 -mt-0.5">
                        {b.city}{b.city && b.state ? ", " : ""}{b.state}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
        </div>
        {reviewForm.roleCategory !== "BRANCH_ADMIN" && (
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">Branch Unit *</label>
            {isUnitAdmin ? (
               <div className="flex items-center gap-2 h-9 px-3 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  <span>
                     {(() => {
                        const bu = businessUnits.find((u) => u.id === reviewForm.businessUnitId);
                        return bu ? bu.name : "Assigned Unit";
                     })()}
                  </span>
               </div>
            ) : (
            <select
              value={reviewForm.businessUnitId}
              onChange={(e) => setReviewForm(prev => ({ ...prev, businessUnitId: e.target.value }))}
              className="w-full h-9 px-3 text-xs rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              disabled={!reviewForm.branchId || reviewForm.branchId === "none"}
            >
              <option value="">-- Select Branch Unit --</option>
              {businessUnits.filter(u => u.branchId === reviewForm.branchId || u.branch_id === reviewForm.branchId).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            )}
          </div>
        )}
      </div>
    </div>
  )}

  {reviewForm.roleCategory === "EMPLOYEE" && reviewForm.branchId && reviewForm.businessUnitId && reviewForm.branchId !== "none" && reviewForm.businessUnitId !== "none" && (
    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
      <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
        3. Assign Role <span className="text-rose-500">*</span>
      </label>
      {availableReviewRoles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {availableReviewRoles.map((r) => {
            const isChecked = reviewForm.roles.includes(r.name) || reviewForm.roles.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  const checked = !isChecked;
                  let nextRoles = reviewForm.roles.filter((x) => x !== r.name && x !== r.id);
                  if (checked) nextRoles.push(r.name);
                  setReviewForm({
                    ...reviewForm,
                    roles: nextRoles,
                    roleId: checked ? r.id : (nextRoles.length > 0 ? reviewForm.roleId : "")
                  });
                }}
                className={cn(
                  "p-2 rounded-xl border text-left transition-all duration-200 flex items-start gap-2 cursor-pointer select-none",
                  isChecked ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-600/10" : "border-slate-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800/60"
                )}
              >
                <span className={cn(
                  "w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                  isChecked ? "border-indigo-600 bg-indigo-600 text-white" : "border-neutral-300 dark:border-slate-600"
                )}>
                  {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>
                <div>
                  <div className="text-[11px] font-bold text-neutral-900 dark:text-white leading-tight">{r.name}</div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-3 text-center text-[11px] text-neutral-500 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-800">
          No roles configured for this unit yet.
        </div>
      )}
    </div>
  )}
</div>

              </div>
              {error && <p role="alert" className="mx-6 mb-3 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
              {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-neutral-200 dark:border-slate-800 flex items-center justify-between bg-neutral-50/80 dark:bg-slate-800/50">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={busy}
                onClick={() => {
                  onReject();
                }}
                className="text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
              >
                Reject Request
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onClose();
                  }}
                  className="text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="button"
                  onClick={onApprove}
                  disabled={busy}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Approve & Activate
                </Button>
              </div>
            </div>
          </div>
        </div>
  );
}
