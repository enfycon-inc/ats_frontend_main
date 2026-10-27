import { Suspense } from 'react';
import { UsersDirectory } from '@/components/users/users-directory';
export default function UsersActivityPage() { return <Suspense fallback={<p className="p-6 text-xs">Loading activity…</p>}><UsersDirectory view="activity" /></Suspense>; }
