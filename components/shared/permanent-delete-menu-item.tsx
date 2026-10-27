"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/ats-api';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useManagementProfile } from '@/components/users/use-management-profile';

export function PermanentDeleteMenuItem({ kind, id, onDeleted }: {
  kind: 'job' | 'submission'; id: string; onDeleted?: () => void;
}) {
  const profile = useManagementProfile();
  const [busy, setBusy] = useState(false);
  const { mutate } = useSWRConfig();
  const router = useRouter();
  if (!profile.permissions.some(p => ['*', 'platform:manage', 'tenant:settings', 'tenant:manage'].includes(p))) return null;
  const remove = async () => {
    const detail = kind === 'job' ? 'this job, all its submissions and their history' : 'this submission and all its history';
    if (window.prompt(`Permanently delete ${detail}? This cannot be undone. Candidate profiles are retained. Type DELETE to confirm.`) !== 'DELETE') return;
    setBusy(true);
    try {
      await apiFetch(`/api/${kind === 'job' ? 'jobs' : 'recruiter-submissions'}/${encodeURIComponent(id)}/permanent`, { method: 'DELETE' });
      toast.success(`${kind === 'job' ? 'Job' : 'Submission'} and associated history permanently deleted.`);
      await mutate(key => /job|submission/i.test(Array.isArray(key) ? String(key[0]) : String(key)));
      onDeleted?.();
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to permanently delete this record.'); }
    finally { setBusy(false); }
  };
  return <DropdownMenuItem disabled={busy} className="text-rose-600" onSelect={() => { void remove(); }}>
    <Trash2 className="h-4 w-4" />{busy ? 'Deleting…' : `Permanently delete ${kind}`}
  </DropdownMenuItem>;
}
