"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LoginForm from '@/components/auth/login-form';
import { ProductFooter } from '@/components/shared/product-footer';
import { APP_BRAND } from '@/lib/app-brand';
import { getTenantIdentifier } from '@/utils/subdomain-helper';
import { useSignInPolicy } from '@/hooks/use-sign-in-policy';
import styles from './login-page.module.css';

export default function Login() {
  const [mounted, setMounted] = React.useState(false);
  const { data: policy } = useSignInPolicy();
  const workspace = mounted && !!getTenantIdentifier();
  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => {
    document.title = workspace && policy?.siteTitle ? `${policy.siteTitle} | ${APP_BRAND.name}` : `${APP_BRAND.name} | Sign in`;
  }, [workspace, policy?.siteTitle]);

  return <div className={`${styles.page} h-dvh overflow-y-auto bg-white font-sans text-slate-900`}>
    <div className="grid min-h-full w-full lg:grid-cols-2">
      <section className="relative hidden items-center justify-center bg-white p-8 lg:flex xl:p-12" aria-label="Your recruitment workspace">
        <Image src="/assets/images/auth/auth-img.png" alt="" aria-hidden="true" width={917} height={917} priority sizes="50vw" className="h-auto max-h-[85dvh] w-full object-contain" />
      </section>
      <section className="flex min-w-0 flex-col justify-center px-5 py-8 sm:px-10 sm:py-12 lg:px-12" aria-label="Sign in">
        <div className="mx-auto w-full max-w-[460px]">
          <header className="mb-8 text-center sm:mb-10">
            <Link href="/" className="inline-block rounded-sm text-2xl font-bold tracking-tight text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" aria-label={`${APP_BRAND.name} home`}>{APP_BRAND.name}</Link>
            <p className="mt-1.5 break-words text-[11px] leading-relaxed text-slate-500">(Product of {APP_BRAND.companyName})</p>
          </header>
          <div className="mb-7 space-y-3 text-center">
            <h1 className={styles.title}>Sign in to your account</h1>
            <p className="text-sm leading-relaxed text-slate-500">Use your work account to continue.</p>
          </div>
          <React.Suspense fallback={<p className="text-center text-xs text-slate-500">Loading sign-in options…</p>}><LoginForm /></React.Suspense>
          {mounted && !workspace && <p className="mt-6 text-center text-xs text-slate-500">New to {APP_BRAND.name}?{' '}<Link href="/auth/register" className="font-medium text-blue-700 underline-offset-4 hover:underline">Register your company</Link></p>}
          <div className="mt-10 text-center sm:mt-12"><ProductFooter /></div>
        </div>
      </section>
    </div>
  </div>;
}
