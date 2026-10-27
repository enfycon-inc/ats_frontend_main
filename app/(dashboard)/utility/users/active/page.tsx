import { Suspense } from 'react';
import { UsersDirectory } from '@/components/users/users-directory';
export default function ActiveUsersPage() { return <Suspense fallback={<p className="p-6 text-xs">Loading users…</p>}><UsersDirectory view="active" /></Suspense>; }
