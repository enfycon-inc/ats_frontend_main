import { Suspense } from 'react';
import UserManagementEditor from '@/components/users/user-management-editor';
export default function CreateUsersPage() { return <Suspense fallback={<p className="p-6 text-xs">Loading user form…</p>}><UserManagementEditor creationOnly /></Suspense>; }
