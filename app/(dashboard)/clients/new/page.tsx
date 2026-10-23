"use client";

import { useRouter } from 'next/navigation';
import { ClientForm } from '@/components/clients/client-form';

export default function NewClientPage() {
  const router = useRouter();
  return <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
    <h1 className="text-xl font-bold tracking-tight">Add Client</h1>
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <ClientForm onCancel={() => router.push('/clients')} onSaved={client => router.push(`/clients/${client.id}`)} />
    </div>
  </main>;
}
