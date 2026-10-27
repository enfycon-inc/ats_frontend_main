import { Suspense } from 'react';
import { UsersDirectory } from '@/components/users/users-directory';
import { UserPageSkeleton } from '@/components/users/user-page-skeleton';
export default function PendingUsersPage() { return <Suspense fallback={<UserPageSkeleton />}><UsersDirectory view="pending" /></Suspense>; }
