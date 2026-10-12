import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import LoginPageContent from '@/components/auth/login-page-content';
import { hasUsableEntrySession, requiresLoginFlow, type LoginEntryParams } from '@/lib/login-entry';

export default async function LoginPage({ searchParams }: { searchParams: Promise<LoginEntryParams> }) {
  const params = await searchParams;
  if (!requiresLoginFlow(params)) {
    let session;
    try { session = await auth(); } catch { session = null; }
    if (hasUsableEntrySession(session)) redirect('/dashboard');
  }
  return <LoginPageContent />;
}
