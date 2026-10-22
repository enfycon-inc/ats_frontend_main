"use client";

import React from 'react';
import { RecruitmentIllustration } from './recruitment-illustration';
import Link from 'next/link';
import LoginForm from '@/components/auth/login-form';
import { APP_BRAND } from '@/lib/app-brand';
import { getApiBase } from '@/lib/ats-api';
import { useSignInPolicy } from '@/hooks/use-sign-in-policy';
import LoginPageSkeleton from './login-page-skeleton';
import styles from './login-page.module.css';

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse motion-reduce:animate-none rounded-md bg-slate-200/80 ${className}`} />;
}

function LoginFormSkeleton() {
  return <div className="mx-auto w-full max-w-[460px] space-y-5 py-8" role="status" aria-busy="true" aria-label="Loading sign-in form">
    <span className="sr-only">Loading sign-in form…</span>
    <div className="space-y-3 text-center"><SkeletonBlock className="mx-auto h-7 w-3/4" /><SkeletonBlock className="mx-auto h-4 w-2/3" /></div>
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <SkeletonBlock className="h-10 w-full rounded-lg" />
      <SkeletonBlock className="h-11 w-full rounded-lg bg-blue-200/80" />
      <SkeletonBlock className="mx-auto h-3 w-1/2" />
      <SkeletonBlock className="h-10 w-full rounded-lg" />
    </div>
    <SkeletonBlock className="mx-auto h-3 w-3/4" />
  </div>;
}

export default function Login({ initialWorkspace }: { initialWorkspace: boolean }) {
  const [mounted, setMounted] = React.useState(false);
  const { data: policy, error: policyError, mutate: retryPolicy } = useSignInPolicy();
  const workspace = initialWorkspace;
  const workspaceName = policy?.siteTitle?.trim() || policy?.name?.trim() || '';
  const tenantLogoPath = policy?.logoUrl?.match(/^\/public\/image\/logos\/[0-9a-f-]{36}\/[a-f0-9]{64}\.(?:png|jpg|gif|webp)$/i)?.[0];
  const tenantLogoUrl = workspace && tenantLogoPath ? new URL(tenantLogoPath, getApiBase()).toString() : null;
  const design = policy?.loginDesignVariant || 'balanced-split';
  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => {
    document.title = workspace && policy?.siteTitle ? `${policy.siteTitle} | ${APP_BRAND.name}` : `${APP_BRAND.name} | Sign in`;
  }, [workspace, policy?.siteTitle]);

  const brandHeader = <header className="pt-3 text-center">
    {workspace ? <>
      {tenantLogoUrl ? <img src={tenantLogoUrl} alt={`${workspaceName || 'Workspace'} logo`} className="mx-auto h-12 max-w-[180px] object-contain" /> : <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-blue-700">{(workspaceName || 'W').slice(0, 1).toUpperCase()}</span>}
      <p className="mt-3 break-words text-base font-semibold text-slate-800">{workspaceName || APP_BRAND.name}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Workspace</p>
    </> : <a href={APP_BRAND.website} target="_blank" rel="noopener noreferrer" className="inline-block rounded-sm text-2xl font-bold tracking-tight text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{APP_BRAND.name}</a>}
  </header>;
  const loginForm = <React.Suspense fallback={<LoginFormSkeleton />}><LoginForm heading={<div className="mb-7 space-y-3 text-center">
    <h1 className={styles.title}>{workspace ? 'Sign in to your workspace' : 'Sign in to your account'}</h1>
    <p className="text-sm leading-relaxed text-slate-500">Use your work account to continue.</p>
  </div>} afterForm={mounted && !workspace && <p className="mt-6 text-center text-xs text-slate-500">New to {APP_BRAND.name}?{' '}<Link href="/auth/register" className="font-medium text-blue-700 underline-offset-4 hover:underline">Register your company</Link></p>} footer={<footer className="space-y-1 text-[11px] leading-relaxed text-slate-500">
    <p>Powered by <a href={APP_BRAND.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 underline underline-offset-2">{APP_BRAND.name}</a></p>
    <p className="text-[10px] text-slate-400">(Product of <a href={APP_BRAND.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{APP_BRAND.companyName}</a>)</p>
    <p className="pt-1 text-[10px] text-slate-400">© {new Date().getFullYear()} {APP_BRAND.companyName}. All rights reserved.</p>
  </footer>} /></React.Suspense>;
  const illustration = <RecruitmentIllustration />;
  const pageClass = `${styles.page} min-h-dvh overflow-y-auto bg-white font-sans text-slate-900`;

  if (workspace && !policy) return <LoginPageSkeleton error={!!policyError} onRetry={() => void retryPolicy()} />;

  if (design === 'compact-focus') return <main className={`${pageClass} flex items-center justify-center bg-slate-50 px-4 py-8`}><section className="w-full max-w-[480px] rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-xl shadow-slate-200/60 sm:px-10"><div className="mb-8">{brandHeader}</div>{loginForm}</section></main>;
  if (design === 'editorial') return <main className={`${pageClass} grid lg:grid-cols-[1.05fr_.95fr]`}><section className="flex flex-col justify-center bg-slate-50 px-6 py-12 sm:px-12 lg:px-16"><div className="mx-auto w-full max-w-[700px]"><p className="mb-4 text-xs font-semibold uppercase tracking-[.18em] text-blue-700">{APP_BRAND.name}</p><h1 className="max-w-xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">From application to placement</h1><p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-600">One workspace for your hiring team.</p><div className="mt-10">{illustration}</div></div></section><section className="flex flex-col justify-center px-5 py-8 sm:px-12 lg:px-16"><div className="mx-auto w-full max-w-[460px]">{brandHeader}{loginForm}</div></section></main>;
  if (design === 'bottom-anchored') return <main className={`${pageClass} flex flex-col bg-gradient-to-b from-blue-50 to-white`}><section className="mx-auto hidden w-full max-w-[1000px] flex-1 items-center justify-center px-6 py-5 lg:flex">{illustration}</section><section className="mt-auto border-t border-blue-100 bg-white px-5 py-7 shadow-[0_-12px_40px_rgba(37,99,235,.08)] sm:px-10"><div className="mx-auto grid w-full max-w-[900px] items-center gap-6 md:grid-cols-[.7fr_1.3fr]"><div>{brandHeader}</div><div className="mx-auto w-full max-w-[460px]">{loginForm}</div></div></section></main>;
  if (design === 'workspace-banner') return <main className={`${pageClass} flex flex-col`}><header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-4 shadow-sm sm:px-10">{workspace && tenantLogoUrl && <img src={tenantLogoUrl} alt={`${workspaceName || 'Workspace'} logo`} className="h-10 max-w-[150px] object-contain" />}<div><p className="font-semibold text-slate-900">{workspaceName || APP_BRAND.name}</p><p className="text-xs text-slate-500">Workspace sign-in</p></div></header><section className="mx-auto grid w-full max-w-[1280px] flex-1 items-center gap-10 px-5 py-10 lg:grid-cols-[1.2fr_.8fr] lg:px-10"><div className="hidden lg:block">{illustration}</div><div className="mx-auto w-full max-w-[460px]">{loginForm}</div></section></main>;
  return <main className={`${pageClass} grid min-h-dvh w-full lg:grid-cols-2`}><section className="relative hidden items-center justify-center bg-white p-8 lg:flex xl:p-12" aria-label="Your recruitment workspace">{illustration}</section><section className="flex min-h-dvh min-w-0 flex-col px-5 py-7 sm:px-10 sm:py-9 lg:px-12" aria-label="Sign in"><div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[460px] flex-1 flex-col sm:min-h-[calc(100dvh-4.5rem)]"><div>{brandHeader}</div><div className="flex flex-1 flex-col">{loginForm}</div></div></section></main>;
}
