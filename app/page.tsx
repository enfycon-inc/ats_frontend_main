"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import LoginForm from "@/components/auth/login-form";
import Social from "@/components/auth/social";
import { atsApi } from "@/lib/ats-api";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { getCurrentSubdomain, getBaseDomain, getTenantIdentifier } from "@/utils/subdomain-helper";
import { Loader2, ShieldCheck, User, Users, Briefcase, Settings } from "lucide-react";

function Logo() {
  const { theme } = useTheme();
  return (
    <div>
      <Image
        src={
          theme === "dark"
            ? "/images/logo/logo-white.svg"
            : "/images/logo/logo.svg"
        }
        alt="Enfycon Logo"
        width={144}
        height={36}
        className="w-36 h-auto"
        priority
      />
    </div>
  );
}

function Copyright() {
  const currentYear = new Date().getFullYear();
  return <>Copyright {currentYear}, Enfycon All Rights Reserved.</>;
}

const personas = [
  {
    role: "Global Admin",
    email: "admin@enfycon.com",
    desc: "Oversees all companies, tenants, approvals, and global parameters.",
    icon: ShieldCheck,
    color: "border-rose-200 dark:border-rose-800/30 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
  },
  {
    role: "Tenant Admin",
    email: "deb@deb.com",
    desc: "Company admin (manages staff, custom roles, pods, and workspace settings).",
    icon: Settings,
    color: "border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
  },
  {
    role: "Account Manager",
    email: "debam@deb.com",
    desc: "Tracks requirements, clients, and monitors candidate submissions.",
    icon: Briefcase,
    color: "border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
  },
  {
    role: "Pod Lead",
    email: "debrec1@deb.com",
    desc: "Delivery leader (manages pods, assigns recruiters, tracks requisitions).",
    icon: Users,
    color: "border-indigo-200 dark:border-indigo-800/30 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400"
  },
  {
    role: "Recruiter",
    email: "debrec2@deb.com",
    desc: "Sourcing agent (submits candidates, manages resume pipelines).",
    icon: User,
    color: "border-blue-200 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
  }
];

export default function RootPage() {
  const [activeTab, setActiveTab] = useState<"sandbox" | "login">("sandbox");
  const [isLoggingIn, startLoginTransition] = useTransition();
  const [loginEmail, setLoginEmail] = useState<string | null>(null);

  const handleQuickLogin = async (email: string, roleName: string) => {
    setLoginEmail(email);
    startLoginTransition(async () => {
      try {
        // 1. Sync with NestJS Backend API to retrieve/store JWT token
        let syncRes;
        try {
          syncRes = await atsApi.auth.login(email, "enfycon123");
        } catch (apiErr: any) {
          toast.error(apiErr.message || `Backend authentication failed for ${roleName}.`);
          return;
        }

        // 2. Sign in with NextAuth credentials provider
        const signInRes = await signIn("credentials", {
          redirect: false,
          email: email,
          password: "enfycon123",
          subdomain: getTenantIdentifier(),
          callbackUrl: "/dashboard",
        });

        if (signInRes?.error) {
          toast.error("NextAuth authentication failed.");
          return;
        }

        toast.success(`Successfully logged in as ${roleName}!`);

        // 3. Subdomain Redirection logic
        const isSuperAdmin = syncRes?.user?.roles?.includes("SUPER_ADMIN") || (syncRes?.user as any)?.systemRole === "SUPER_ADMIN";
        const userTenantDomain = syncRes?.user?.tenantDomain;
        const currentSubdomain = getCurrentSubdomain();
        const base = getBaseDomain();
        const protocol = window.location.protocol;

        if (isSuperAdmin) {
          // Super Admin always stays on root domain (localhost:3000/dashboard)
          if (currentSubdomain) {
            window.location.href = `${protocol}//${base}/dashboard`;
          } else {
            window.location.href = "/dashboard";
          }
        } else if (userTenantDomain && userTenantDomain !== "enfycon" && userTenantDomain !== "www" && currentSubdomain !== userTenantDomain) {
          // Tenant user logging in -> redirect to tenant subdomain
          window.location.href = `${protocol}//${userTenantDomain}.${base}/dashboard`;
        } else if (currentSubdomain === "enfycon") {
          // Master tenant user on enfycon.localhost -> redirect to root localhost:3000/dashboard
          window.location.href = `${protocol}//${base}/dashboard`;
        } else {
          window.location.href = "/dashboard";
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to sign in.");
      }
    });
  };

  return (
    <>
      <div className="flex w-full items-center overflow-hidden min-h-screen h-screen basis-full">
        <div className="overflow-y-auto flex flex-wrap w-full h-screen">
          
          {/* Left panel (desktop only) */}
          <div className="lg:block hidden flex-1 overflow-hidden text-[40px] leading-[48px] text-default-600 relative z-1 bg-default-50">
            <div className="max-w-[520px] pt-20 ps-20 ">
              <Link href="/" className="mb-6 inline-block">
                <Logo />
              </Link>
              <h4 className="text-[40px] leading-[48px] text-default-600 font-normal">
                Your AI-Powered
                <span className="text-default-800 font-bold ms-2 block sm:inline">
                  Recruitment Platform
                </span>
              </h4>
              <p className="text-base text-default-500 mt-4 leading-relaxed max-w-[380px]">
                Manage US IT &amp; Indian staffing, track candidates, and grow your recruiting business — all in one workspace.
              </p>

              {/* Admin quick-link (desktop sidebar) */}
              <Link
                href="/utility/approvals"
                className="mt-10 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-sm font-semibold hover:bg-slate-700 transition-all shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-indigo-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
                Global Admin Panel
              </Link>
            </div>
            <div className="absolute left-0 2xl:bottom-[-160px] bottom-[-130px] h-full w-full z-[-1]">
              <Image
                src="/images/auth/ils1.svg"
                alt="Branding background"
                priority
                width={300}
                height={300}
                className="mb-10 w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right panel: Login form */}
          <div className="flex-1 relative">
            <div className="h-full flex flex-col dark:bg-default-100 bg-white">
              <div className="max-w-[524px] md:px-[42px] md:py-[44px] p-7 mx-auto w-full text-2xl text-default-900 mb-3 h-full flex flex-col justify-center">
                <div className="flex justify-center items-center text-center mb-6 lg:hidden ">
                  <Link href="/">
                    <Logo />
                  </Link>
                </div>
                
                <div className="text-center 2xl:mb-8 mb-4">
                  <h4 className="font-semibold text-2xl">Welcome Back</h4>
                  <div className="text-default-500 text-sm mt-1">
                    Sign in to your ATS workspace
                  </div>
                </div>

                {/* Tab selector */}
                <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 border border-slate-200/50 dark:border-slate-700/50">
                  <button 
                    onClick={() => setActiveTab("sandbox")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === "sandbox" 
                        ? "bg-white dark:bg-slate-700 text-indigo-650 dark:text-indigo-300 shadow-sm border border-slate-250/20" 
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    Demo Sandbox
                  </button>
                  <button 
                    onClick={() => setActiveTab("login")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === "login" 
                        ? "bg-white dark:bg-slate-700 text-indigo-650 dark:text-indigo-300 shadow-sm border border-slate-250/20" 
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    Credentials Login
                  </button>
                </div>

                {activeTab === "sandbox" ? (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 select-none">
                      Select a role to login automatically:
                    </div>
                    {personas.map((p) => {
                      const Icon = p.icon;
                      const isLoadingThis = isLoggingIn && loginEmail === p.email;
                      return (
                        <button
                          key={p.email}
                          disabled={isLoggingIn}
                          onClick={() => handleQuickLogin(p.email, p.role)}
                          className={`w-full text-left flex items-start gap-4 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-900 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 select-none group`}
                        >
                          <div className={`p-2.5 rounded-lg border transition-all shrink-0 ${p.color} group-hover:scale-105`}>
                            {isLoadingThis ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Icon className="h-5 w-5" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-default-850 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{p.role}</span>
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">({p.email})</span>
                            </div>
                            <p className="text-[11px] leading-normal text-slate-500 dark:text-slate-400 font-medium">
                              {p.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <React.Suspense fallback={<div className="text-center py-6 text-xs text-slate-400">Loading form...</div>}>
                    <LoginForm />
                  </React.Suspense>
                )}

                {/* Actions Buttons */}
                <div className="md:max-w-[345px] mx-auto mt-8 w-full space-y-3">
                  {/* Divider */}
                  <div className="relative border-b border-default-200">
                    <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-white dark:bg-default-100 px-3 text-xs text-default-400">
                      New to Enfycon ATS?
                    </span>
                  </div>
                  
                  {/* Register Your Company */}
                  <Link
                    id="btn-register-company"
                    href="/auth/register"
                    className="flex items-center justify-center gap-2 w-full mt-6 px-4 py-2.5 rounded-lg border-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-semibold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                    Register Your Company
                  </Link>

                  {/* Global Admin Panel */}
                  <Link
                    id="btn-global-admin"
                    href="/utility/approvals"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-indigo-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                    Global Admin Panel
                  </Link>
                </div>

              </div>
              <div className="text-xs font-normal text-default-500 z-999 pb-10 text-center select-none">
                <Copyright />
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

