"use client";

import React from 'react';
import { RecruitmentIllustration } from './recruitment-illustration';
import Link from 'next/link';
import LoginForm from '@/components/auth/login-form';
import { APP_BRAND } from '@/lib/app-brand';
import { getTenantIdentifier } from '@/utils/subdomain-helper';
import { getApiBase } from '@/lib/ats-api';
import { useSignInPolicy } from '@/hooks/use-sign-in-policy';
import styles from './login-page.module.css';

export default function Login() {
  const [mounted, setMounted] = React.useState(false);
  const { data: policy } = useSignInPolicy();
  const workspace = mounted && !!getTenantIdentifier();
  const workspaceName = policy?.siteTitle?.trim() || policy?.name?.trim() || '';
  const tenantLogoPath = policy?.logoUrl?.match(/^\/public\/image\/logos\/[0-9a-f-]{36}\/[a-f0-9]{64}\.(?:png|jpg|gif|webp)$/i)?.[0];
  const tenantLogoUrl = workspace && tenantLogoPath ? new URL(tenantLogoPath, getApiBase()).toString() : null;
  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => {
    document.title = workspace && policy?.siteTitle ? `${policy.siteTitle} | ${APP_BRAND.name}` : `${APP_BRAND.name} | Sign in`;
  }, [workspace, policy?.siteTitle]);

  return <div className={`${styles.page} h-dvh overflow-y-auto bg-white font-sans text-slate-900`}>
    <div className="grid min-h-full w-full lg:grid-cols-2">
      <section className="relative hidden items-center justify-center bg-white p-8 lg:flex xl:p-12" aria-label="Your recruitment workspace">
        <RecruitmentIllustration />
      </section>
      <section className="flex min-h-dvh min-w-0 flex-col px-5 py-7 sm:px-10 sm:py-9 lg:px-12" aria-label="Sign in">
        <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[460px] flex-1 flex-col sm:min-h-[calc(100dvh-4.5rem)]">
          <header className="pt-3 text-center">
            {workspace ? <>
              {tenantLogoUrl ? <img src={tenantLogoUrl} alt={`${workspaceName || 'Workspace'} logo`} className="mx-auto h-12 max-w-[180px] object-contain" /> : <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-blue-700">{(workspaceName || 'W').slice(0, 1).toUpperCase()}</span>}
              <p className="mt-3 break-words text-base font-semibold text-slate-800">{workspaceName || APP_BRAND.name}</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Workspace</p>
            </> : <a href={APP_BRAND.website} target="_blank" rel="noopener noreferrer" className="inline-block rounded-sm text-2xl font-bold tracking-tight text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{APP_BRAND.name}</a>}
          </header>
          <div className="flex flex-1 flex-col">
            <React.Suspense fallback={<p className="my-auto py-10 text-center text-xs text-slate-500">Loading sign-in options…</p>}><LoginForm heading={<div className="mb-7 space-y-3 text-center">
                <h1 className={styles.title}>{workspace ? 'Sign in to your workspace' : 'Sign in to your account'}</h1>
                <p className="text-sm leading-relaxed text-slate-500">Use your work account to continue.</p>
              </div>} afterForm={mounted && !workspace && <p className="mt-6 text-center text-xs text-slate-500">New to {APP_BRAND.name}?{' '}<Link href="/auth/register" className="font-medium text-blue-700 underline-offset-4 hover:underline">Register your company</Link></p>} footer={<footer className="space-y-1 text-[11px] leading-relaxed text-slate-500">
                <p>Powered by <a href={APP_BRAND.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 underline underline-offset-2">{APP_BRAND.name}</a></p>
                <p className="text-[10px] text-slate-400">(Product of <a href={APP_BRAND.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{APP_BRAND.companyName}</a>)</p>
                <p className="pt-1 text-[10px] text-slate-400">© {new Date().getFullYear()} {APP_BRAND.companyName}. All rights reserved.</p>
              </footer>} /></React.Suspense>
          </div>
        </div>
      </section>
    </div>
  </div>;
}
