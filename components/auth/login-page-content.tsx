"use client";

import React from 'react';
import Link from 'next/link';
import { BriefcaseBusiness, Building2, FileText, Users } from 'lucide-react';
import LoginForm from '@/components/auth/login-form';
import EnfyconLogo from '@/components/shared/enfycon-logo';
import { CompanyLogoImage } from '@/components/shared/company-logo-image';
import { ProductFooter } from '@/components/shared/product-footer';
import { APP_BRAND } from '@/lib/app-brand';
import { getTenantIdentifier } from '@/utils/subdomain-helper';
import { useSignInPolicy } from '@/hooks/use-sign-in-policy';

const workflow = [
  { title: 'Jobs', description: 'Create and manage job openings.', icon: FileText },
  { title: 'Candidates', description: 'Track candidates through the hiring process.', icon: Users },
  { title: 'Placements', description: 'Bring the right candidates and opportunities together.', icon: BriefcaseBusiness },
];

export default function Login() {
  const [mounted, setMounted] = React.useState(false);
  const { data: policy } = useSignInPolicy();
  const workspace = mounted && !!getTenantIdentifier();
  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => {
    document.title = workspace && policy?.siteTitle ? `${policy.siteTitle} | ${APP_BRAND.name}` : `${APP_BRAND.name} | Sign in`;
  }, [workspace, policy?.siteTitle]);

  return <div className="h-dvh overflow-y-auto bg-slate-50 px-4 py-6 font-sans text-slate-900 sm:px-8 sm:py-10">
    <div className="mx-auto w-full max-w-[1120px]">
      <header className="mb-6 flex items-center"><Link href="/" aria-label={`${APP_BRAND.name} home`}><EnfyconLogo variant="light" /></Link></header>
      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden flex-col justify-between bg-[#163b70] p-10 text-white lg:flex xl:p-12" aria-label="Your recruitment workspace">
          <div>
            <p className="text-xs font-semibold tracking-widest text-blue-100">{APP_BRAND.name}</p>
            <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight">Your hiring<br />workspace.</h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-blue-100">Manage jobs, candidates and placements in one place.</p>
            <div className="mt-9 space-y-4">
              {workflow.map(({ title, description, icon: Icon }) => <div key={title} className="flex items-start gap-4 rounded-lg border border-white/25 p-4">
                <Icon className="mt-0.5 h-6 w-6 shrink-0 text-blue-100" aria-hidden="true" />
                <div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs leading-relaxed text-blue-100">{description}</p></div>
              </div>)}
            </div>
          </div>
          <p className="mt-10 border-t border-white/20 pt-5 text-xs text-blue-100">Built for your recruitment team.</p>
        </section>
        <section className="flex min-w-0 flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-12" aria-label="Sign in">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-7 space-y-3">
              {workspace && policy?.logoUrl ? <CompanyLogoImage src={policy.logoUrl} alt={`${policy.name || 'Workspace'} logo`} className="h-12 max-w-[180px]" /> : <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Building2 className="h-6 w-6" aria-hidden="true" /></div>}
              <p className="break-words text-xs font-medium text-slate-600">{workspace ? policy?.name || 'Your workspace' : APP_BRAND.name}</p>
              <h2 className="text-xl font-bold tracking-tight">Sign in</h2>
              <p className="text-xs text-slate-500">Use your work account to continue.</p>
            </div>
            <React.Suspense fallback={<p className="text-xs text-slate-500">Loading sign-in options…</p>}><LoginForm /></React.Suspense>
            {mounted && !workspace && <p className="mt-6 text-xs text-slate-500">New to {APP_BRAND.name}?{' '}<Link href="/auth/register" className="font-medium text-blue-700 underline-offset-4 hover:underline">Register your company</Link></p>}
            <div className="mt-8 border-t border-slate-100 pt-5"><ProductFooter /></div>
          </div>
        </section>
      </div>
    </div>
  </div>;
}
