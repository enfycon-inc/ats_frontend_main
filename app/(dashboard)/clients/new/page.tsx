"use client";

import { useRouter } from 'next/navigation';
import { ClientForm } from '@/components/clients/client-form';

export default function NewClientPage() {
  const router = useRouter();
  return <main className="w-full space-y-4 p-4 sm:p-6">

    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <ClientForm onCancel={() => router.push('/clients/all')} onSaved={client => router.push(`/clients/${client.id}`)} />
    </div>
  </main>;
}
