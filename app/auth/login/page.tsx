"use client";

import React from "react";
import Link from "next/link";
import EnfyconLogo from "@/components/shared/enfycon-logo";
import LoginForm from "@/components/auth/login-form";
import Social from "@/components/auth/social";
import { Building2 } from "lucide-react";

function Copyright() {
  const currentYear = new Date().getFullYear();
  return <>Copyright © {currentYear} Enfycon Inc. All Rights Reserved.</>;
}

const Login = () => {
  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900 flex flex-col justify-between font-sans relative overflow-x-hidden">
      
      {/* Soft Ambient Glow Orbs spanning across full background */}
      <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Full Page Wrapper */}
      <div className="flex w-full min-h-screen relative z-10">
        
        {/* Left Hero / Brand Canvas (Desktop Only) */}
        <div className="hidden lg:flex flex-1 flex-col justify-between p-12 xl:p-16">
          
          {/* Top Brand Header */}
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-block transition-transform hover:scale-105">
              <EnfyconLogo variant="light" width={190} height={42} />
            </Link>
          </div>

          {/* Middle Value Proposition (Clean & Uncluttered) */}
          <div className="max-w-xl my-auto py-8 space-y-6">
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              Accelerate Hiring with{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 bg-clip-text text-transparent">
                AI Precision
              </span>
            </h1>
            <p className="text-base xl:text-lg text-slate-600 leading-relaxed">
              Unified workspace for US IT &amp; Indian staffing. Match top candidates, automate bench tracking, and streamline client submissions — all in one platform.
            </p>
          </div>

          {/* Bottom Spacer */}
          <div className="h-6" />
        </div>

        {/* Right Authentication Panel */}
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 relative my-auto">
          
          <div className="my-auto w-full max-w-md mx-auto space-y-6">
            
            {/* Mobile Header Logo */}
            <div className="flex justify-center mb-6 lg:hidden">
              <Link href="/">
                <EnfyconLogo variant="light" width={180} height={40} />
              </Link>
            </div>

            {/* Main Auth Form Light Card Container */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 space-y-6">
              
              {/* Form Title & Subtitle */}
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Welcome Back
                </h2>
                <p className="text-sm text-slate-500">
                  Sign in to your Enfycon ATS workspace
                </p>
              </div>

              {/* Login Form */}
              <React.Suspense fallback={<div className="text-center py-6 text-xs text-slate-400">Loading form...</div>}>
                <LoginForm />
              </React.Suspense>

              {/* Register Company Banner */}
              <div className="pt-2">
                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-center space-y-2">
                  <span className="text-xs text-slate-600 block font-medium">
                    New to Enfycon ATS?
                  </span>
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-white border border-indigo-200 text-indigo-600 font-semibold text-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm"
                  >
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    Register Your Company
                  </Link>
                </div>
              </div>

            </div>

          </div>

          {/* Right Footer Copyright */}
          <div className="text-xs text-center text-slate-400 pt-8">
            <Copyright />
          </div>

        </div>

      </div>
    </div>
  );
};

export default Login;
