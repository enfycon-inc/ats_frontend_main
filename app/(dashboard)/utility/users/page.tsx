import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import UserManagementEditor from '@/components/users/user-management-editor';
import { UserPageSkeleton } from '@/components/users/user-page-skeleton';

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  if (!query.requestId && !query.editUser) redirect('/utility/users/active');
  return <Suspense fallback={<UserPageSkeleton mode="create" />}><UserManagementEditor /></Suspense>;
}
