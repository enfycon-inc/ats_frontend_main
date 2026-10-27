import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import UserManagementEditor from '@/components/users/user-management-editor';

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  if (!query.requestId && !query.editUser) redirect('/utility/users/active');
  return <Suspense fallback={<p className="p-6 text-xs">Loading user details…</p>}><UserManagementEditor /></Suspense>;
}
