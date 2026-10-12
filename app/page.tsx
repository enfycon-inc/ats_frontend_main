import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasUsableEntrySession } from '@/lib/login-entry';

export default async function RootPage() {
  let session;
  try { session = await auth(); } catch { session = null; }
  redirect(hasUsableEntrySession(session) ? '/dashboard' : '/auth/login');
}
