"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import LoginForm from "@/components/auth/login-form";
import Social from "@/components/auth/social";

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

export default function RootPage() {
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
                
                <div className="text-center 2xl:mb-10 mb-4">
                  <h4 className="font-medium">Welcome Back</h4>
                  <div className="text-default-500 text-base">
                    Sign in to your ATS workspace
                  </div>
                </div>

                <LoginForm />

                <div className="relative border-b-[#9AA2AF] border-opacity-[16%] border-b pt-6">
                  <div className="absolute inline-block bg-default-50 dark:bg-default-100 left-1/2 top-1/2 transform -translate-x-1/2 px-4 min-w-max text-sm text-default-500 font-normal">
                    Or continue with
                  </div>
                </div>

                <div className="max-w-[242px] mx-auto mt-8 w-full">
                  <Social />
                </div>

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
                    className="flex items-center justify-center gap-2 w-full mt-6 px-4 py-2.5 rounded-lg border-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-semibold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
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
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-indigo-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                    Global Admin Panel
                  </Link>
                </div>

              </div>
              <div className="text-xs font-normal text-default-500 z-999 pb-10 text-center">
                <Copyright />
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
