"use client";
import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { userManagementApi } from '@/lib/user-management-api';
import { useManagementProfile } from '@/components/users/use-management-profile';
import { VerifyOfficeLocation } from '@/components/users/office-evidence';

export default function MySessionsPage() {
  const profile = useManagementProfile();
  const id = profile.data?.id || profile.data?.dbId;
  const [page, setPage] = useState(1);
  const [ending, setEnding] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR(id ? ['my-sessions', profile.scope, id, page] : null, () => userManagementApi.sessions(id, page));
  const endSession = async (sessionId: string) => {
    setEnding(sessionId);
    try { const result = await userManagementApi.revoke(sessionId); toast.success(result.message); setConfirmation(null); await mutate(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to end session.'); }
    finally { setEnding(null); }
  };
  const date = (value: string) => new Date(value).toLocaleString();
  return <main className="max-w-4xl space-y-4 p-6"><Link href="/view-profile" className="text-xs text-indigo-700">Back to My Profile</Link><h1 className="text-xl font-bold">My Sessions</h1><p className="text-xs text-neutral-500">Review your recorded browser sessions and end access to this workspace. Other workspaces are unaffected.</p>
    {profile.data && <VerifyOfficeLocation scope={profile.scope} />}
    {(isLoading || !profile.data) && !profile.error && <p className="text-xs">Loading sessions…</p>}
    {(error || profile.error) && <p role="alert" className="text-xs text-red-600">Unable to verify your sessions. <button className="underline" onClick={() => void mutate()}>Try again</button></p>}
    {data?.length === 0 && <p className="text-xs text-neutral-500">No sessions recorded. Session monitoring may not be enabled for this deployment.</p>}
    {data?.map(session => <article key={session.id} className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 text-xs dark:border-slate-700 dark:bg-slate-900"><h2 className="text-sm font-semibold">{session.device}{session.current ? ' · This session' : ''}</h2><p>{session.revokedAt ? 'Ended' : new Date(session.expiresAt) < new Date() ? 'Expired' : 'Signed in'} · {session.loginMethod}</p><p className="text-neutral-500">Started {date(session.startedAt)} · Last seen {date(session.lastSeenAt)}</p><p className="font-mono">{session.ipAddress || 'IP not recorded'}</p>{!session.revokedAt && new Date(session.expiresAt) > new Date() && (confirmation === session.id ? <div className="space-x-3"><span>End this session?</span><Button size="sm" disabled={!!ending} onClick={() => void endSession(session.id)}>Confirm</Button><button onClick={() => setConfirmation(null)}>Cancel</button></div> : <Button variant="outline" size="sm" onClick={() => setConfirmation(session.id)}>End session</Button>)}</article>)}
    <div className="flex justify-between text-xs"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page}</span><Button variant="outline" disabled={(data?.length || 0) < 50} onClick={() => setPage(page + 1)}>Next</Button></div>
  </main>;
}
