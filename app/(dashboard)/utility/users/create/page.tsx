import { Suspense } from 'react';
import UserManagementEditor from '@/components/users/user-management-editor';
import { UserPageSkeleton } from '@/components/users/user-page-skeleton';
export default function CreateUsersPage() { return <Suspense fallback={<UserPageSkeleton mode="create" />}><UserManagementEditor creationOnly /></Suspense>; }
