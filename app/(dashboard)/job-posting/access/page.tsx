"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Shield, UserPlus, X } from "lucide-react";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";

type Person = { id: string; fullName: string; email: string; branchId?: string | null; businessUnitId?: string | null };
type Grant = { id: string; revokedAt: string | null; createdAt: string; delegateUser: Person; grantedBy?: { fullName?: string; email?: string } | null };

export default function JobCreationAccessPage() {
  const router = useRouter();
  const currentUser = useMemo(() => atsApi.auth.getCurrentUser(), []);
  const permissions: string[] = currentUser?.permissions || [];
  const isAdmin = permissions.some((permission) => ["user:manage", "tenant:settings", "tenant:manage", "platform:manage", "*"].includes(permission));
  const [people, setPeople] = useState<Person[]>([]);
  const [ownerPeople, setOwnerPeople] = useState<Person[]>([]);
  const [ownerId, setOwnerId] = useState(isAdmin ? "" : currentUser?.dbId || currentUser?.id || "");
  const [delegateId, setDelegateId] = useState("");
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [staff, access, owners] = await Promise.all([
        atsApi.jobs.creationGrantPeople(),
        ownerId ? atsApi.jobs.creationGrants(ownerId) : Promise.resolve([]),
        isAdmin ? atsApi.jobs.creationGrantOwners() : Promise.resolve([]),
      ]);
      setPeople(Array.isArray(staff) ? staff : []);
      setOwnerPeople(Array.isArray(owners) ? owners : []);
      setGrants(Array.isArray(access) ? access : []);
    } catch (error: any) {
      toast.error(error?.message || "Job access could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, ownerId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const ownerChoices = useMemo(() => {
    if (!isAdmin) return [{ id: currentUser?.dbId || currentUser?.id, fullName: currentUser?.fullName || currentUser?.name || "My jobs", email: currentUser?.email || "" }];
    return ownerPeople;
  }, [currentUser, isAdmin, ownerPeople]);

  const activeDelegates = grants.filter((grant) => !grant.revokedAt);
  const availablePeople = people.filter((person) => person.id !== ownerId && !activeDelegates.some((grant) => grant.delegateUser.id === person.id));

  async function addAccess(event: React.FormEvent) {
    event.preventDefault();
    if (!ownerId || !delegateId) return;
    setSaving(true);
    try {
      await atsApi.jobs.grantJobCreation({ accountManagerId: ownerId, delegateUserId: delegateId });
      setDelegateId("");
      toast.success("Job creation access granted.");
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Access could not be granted.");
    } finally {
      setSaving(false);
    }
  }

  async function revoke(grant: Grant) {
    try {
      await atsApi.jobs.revokeJobCreation(grant.id);
      toast.success("Job creation access revoked.");
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Access could not be revoked.");
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-5 md:p-8 space-y-5">
      <button onClick={() => router.push("/job-posting")} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700 dark:text-slate-300">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </button>
      <header className="flex items-start gap-3">
        <span className="rounded-lg bg-blue-50 p-2.5 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><Shield className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Job creation access</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Authorize a colleague to create jobs for an account manager. You can revoke access at any time.</p>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={addAccess} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          {isAdmin && <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Job owner
            <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
              <option value="">Select a job owner</option>
              {ownerChoices.map((person) => <option key={person.id} value={person.id}>{person.fullName} · {person.email}</option>)}
            </select>
          </label>}
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Colleague
            <select value={delegateId} onChange={(event) => setDelegateId(event.target.value)} disabled={!ownerId} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950">
              <option value="">Select a colleague</option>
              {availablePeople.map((person) => <option key={person.id} value={person.id}>{person.fullName} · {person.email}</option>)}
            </select>
          </label>
          <button disabled={saving || !ownerId || !delegateId} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Grant access
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">Authorized colleagues</h2>
        </div>
        {loading ? <div className="flex h-28 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading access</div> : activeDelegates.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activeDelegates.map((grant) => <div key={grant.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{grant.delegateUser.fullName}</p><p className="truncate text-xs text-slate-500">{grant.delegateUser.email}</p></div>
              <button onClick={() => void revoke(grant)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-red-300 hover:text-red-700 dark:border-slate-700 dark:text-slate-200"><X className="h-3.5 w-3.5" /> Revoke</button>
            </div>)}
          </div>
        ) : <p className="px-5 py-10 text-center text-sm text-slate-500">No colleagues currently have access.</p>}
      </section>
    </main>
  );
}
