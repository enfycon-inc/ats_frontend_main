"use client";

import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Shield, UserPlus, X } from "lucide-react";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";
import { PeopleFinder } from "@/components/common/people-finder";

type Person = { id: string; fullName: string; email: string; branchId?: string | null; businessUnitId?: string | null };
type Grant = { id: string; revokedAt: string | null; expiresAt: string | null; maxJobs: number | null; jobsUsed: number; createdAt: string; delegateUser: Person; grantedBy?: { fullName?: string; email?: string } | null };

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function JobCreationAccessPage() {
  const currentUser = useMemo(() => atsApi.auth.getCurrentUser(), []);
  const permissions: string[] = currentUser?.permissions || [];
  const isAdmin = permissions.some((permission) => ["job:manage_creation_access", "tenant:settings", "tenant:manage", "platform:manage", "*"].includes(permission));
  const [people, setPeople] = useState<Person[]>([]);
  const [ownerPeople, setOwnerPeople] = useState<Person[]>([]);
  const [ownerId, setOwnerId] = useState(isAdmin ? "" : currentUser?.dbId || currentUser?.id || "");
  const [delegateId, setDelegateId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxJobs, setMaxJobs] = useState("");
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editMaxJobs, setEditMaxJobs] = useState("");
  const [updatingGrant, setUpdatingGrant] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [ownersQuery, setOwnersQuery] = useState("");
  const [peopleSearching, setPeopleSearching] = useState(false);
  const [ownersSearching, setOwnersSearching] = useState(false);
  const peopleSearchRequest = useRef(0);
  const ownersSearchRequest = useRef(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [staff, access, owners] = await Promise.all([
        atsApi.jobs.creationGrantPeople(ownerId || undefined),
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

  useEffect(() => {
    const query = peopleQuery.trim();
    const requestId = ++peopleSearchRequest.current;
    setPeopleSearching(false);
    if (query.length < 2 || !ownerId) return;
    const timer = window.setTimeout(() => {
      setPeopleSearching(true);
      void atsApi.jobs.creationGrantPeople(ownerId, query).then((results) => {
        if (requestId === peopleSearchRequest.current && Array.isArray(results)) {
          setPeople((current) => [...new Map([...current, ...results].map((person) => [person.id, person])).values()]);
        }
      }).catch(() => undefined).finally(() => { if (requestId === peopleSearchRequest.current) setPeopleSearching(false); });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [ownerId, peopleQuery]);

  useEffect(() => {
    const query = ownersQuery.trim();
    const requestId = ++ownersSearchRequest.current;
    setOwnersSearching(false);
    if (!isAdmin || query.length < 2) return;
    const timer = window.setTimeout(() => {
      setOwnersSearching(true);
      void atsApi.jobs.creationGrantOwners(query).then((results) => {
        if (requestId === ownersSearchRequest.current && Array.isArray(results)) {
          setOwnerPeople((current) => [...new Map([...current, ...results].map((person) => [person.id, person])).values()]);
        }
      }).catch(() => undefined).finally(() => { if (requestId === ownersSearchRequest.current) setOwnersSearching(false); });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isAdmin, ownersQuery]);

  const ownerChoices = useMemo(() => {
    if (!isAdmin) return [{ id: currentUser?.dbId || currentUser?.id, fullName: currentUser?.fullName || currentUser?.name || "My jobs", email: currentUser?.email || "" }];
    return ownerPeople;
  }, [currentUser, isAdmin, ownerPeople]);

  const activeDelegates = grants.filter((grant) => !grant.revokedAt && (!grant.expiresAt || new Date(grant.expiresAt) > new Date()) && (grant.maxJobs === null || grant.jobsUsed < grant.maxJobs));
  const availablePeople = people.filter((person) => person.id !== ownerId && !activeDelegates.some((grant) => grant.delegateUser.id === person.id));

  async function addAccess(event: React.FormEvent) {
    event.preventDefault();
    if (!ownerId || !delegateId) return;
    setSaving(true);
    try {
      await atsApi.jobs.grantJobCreation({
        accountManagerId: ownerId,
        delegateUserId: delegateId,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        maxJobs: maxJobs ? Number(maxJobs) : null,
      });
      setDelegateId("");
      setExpiresAt("");
      setMaxJobs("");
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

  function startEditing(grant: Grant) {
    setEditingGrant(grant);
    setEditExpiresAt(toDateTimeLocal(grant.expiresAt));
    setEditMaxJobs(grant.maxJobs === null ? "" : String(grant.maxJobs));
  }

  async function updateAccess(event: React.FormEvent) {
    event.preventDefault();
    if (!editingGrant) return;
    setUpdatingGrant(true);
    try {
      await atsApi.jobs.updateJobCreationGrant(editingGrant.id, {
        expiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
        maxJobs: editMaxJobs.trim() ? Number(editMaxJobs) : null,
      });
      toast.success("Job creation access updated.");
      setEditingGrant(null);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Access could not be updated.");
    } finally {
      setUpdatingGrant(false);
    }
  }

  return (
    <main className="w-full min-w-0 space-y-5 p-4 md:p-6 xl:p-8">
      <header className="flex items-start gap-3">
        <span className="rounded-lg bg-blue-50 p-2.5 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><Shield className="h-5 w-5" /></span>
        <div>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Authorize a colleague to create jobs for an account manager. You can revoke access at any time.</p>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-3"><span className="rounded-lg bg-blue-50 p-2.5 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><UserPlus className="h-5 w-5" /></span><div><h2 className="text-sm font-bold text-slate-900 dark:text-white">Grant job access</h2><p className="text-sm text-slate-500 dark:text-slate-400">Choose a colleague who can create jobs on the job owner’s behalf.</p></div></div>
        <form onSubmit={addAccess} className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(15rem,0.8fr)_minmax(20rem,1.4fr)_minmax(12rem,0.7fr)_minmax(10rem,0.6fr)_auto] xl:items-end">
          {isAdmin && <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Job owner
            <PeopleFinder options={ownerChoices} value={ownerId} onValueChange={(id) => { setOwnerId(id); setDelegateId(""); setPeopleQuery(""); }} onSearchChange={setOwnersQuery} loading={ownersSearching} placeholder="Find a job owner" searchPlaceholder="Search job owners..." emptyMessage="No eligible job owners found." />
          </label>}
          <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Colleague
            <PeopleFinder options={availablePeople} value={delegateId} onValueChange={setDelegateId} onSearchChange={setPeopleQuery} disabled={!ownerId || loading} placeholder="Find a colleague" loading={loading || peopleSearching} />
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Access expires <span className="font-normal text-slate-500">(optional)</span>
            <input type="datetime-local" value={expiresAt} min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)} onChange={(event) => setExpiresAt(event.target.value)} className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Maximum jobs <span className="font-normal text-slate-500">(optional)</span>
            <input type="number" min={1} step={1} inputMode="numeric" value={maxJobs} onChange={(event) => setMaxJobs(event.target.value)} placeholder="No limit" className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
          <button disabled={saving || !ownerId || !delegateId} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Grant access
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Authorized colleagues</h2>
        </div>
        {loading ? <PageLoadingSkeleton variant="table" /> : grants.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {grants.map((grant) => {
              const expired = !!grant.expiresAt && new Date(grant.expiresAt) <= new Date();
              const exhausted = grant.maxJobs !== null && grant.jobsUsed >= grant.maxJobs;
              const status = grant.revokedAt ? "Revoked" : expired ? "Expired" : exhausted ? "Limit reached" : "Active";
              const statusClass = status === "Active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
              return <div key={grant.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-xs font-semibold text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300">{grant.delegateUser.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div className="min-w-0"><p className="flex flex-wrap items-center gap-2 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{grant.delegateUser.fullName}<span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>{status}</span></p><p className="truncate text-xs text-slate-500">{grant.delegateUser.email}</p><p className="mt-1 text-xs text-slate-500">{grant.maxJobs === null ? "No job limit" : `${grant.jobsUsed} of ${grant.maxJobs} jobs used`} · {grant.expiresAt ? `Expires ${new Date(grant.expiresAt).toLocaleString()}` : "No expiry"}</p></div></div>
                  {!grant.revokedAt && <div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => startEditing(grant)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200"><Pencil className="h-3.5 w-3.5" /> Edit</button><button type="button" onClick={() => void revoke(grant)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-red-300 hover:text-red-700 dark:border-slate-700 dark:text-slate-200"><X className="h-3.5 w-3.5" /> Revoke</button></div>}
                </div>
                {editingGrant?.id === grant.id && <form onSubmit={updateAccess} className="grid gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/40 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_minmax(12rem,0.8fr)_auto] xl:items-end">
                  <label className="block space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">Access expires <span className="font-normal text-slate-500">(optional)</span><input type="datetime-local" value={editExpiresAt} min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)} onChange={(event) => setEditExpiresAt(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
                  <label className="block space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">Maximum jobs <span className="font-normal text-slate-500">(optional)</span><input type="number" min={Math.max(1, grant.jobsUsed)} step={1} inputMode="numeric" value={editMaxJobs} onChange={(event) => setEditMaxJobs(event.target.value)} placeholder="No limit" className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
                  <div className="flex justify-end gap-2"><button type="button" disabled={updatingGrant} onClick={() => setEditingGrant(null)} className="h-10 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">Cancel</button><button type="submit" disabled={updatingGrant} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{updatingGrant && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save access</button></div>
                </form>}
              </div>;
            })}
          </div>
        ) : <p className="px-5 py-10 text-center text-sm text-slate-500">No colleagues currently have access.</p>}
      </section>
    </main>
  );
}
