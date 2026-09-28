"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";

interface SocialProps {
  showGoogle?: boolean;
  showMicrosoft?: boolean;
  className?: string;
  tenantId?: string;
  microsoftReady?: boolean;
}

// Full-page loading overlay shown while SSO redirect is in progress
function SsoLoadingOverlay({ provider }: { provider: "google" | "microsoft" }) {
  const isGoogle = provider === "google";
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm">
      {/* Logo / Brand mark */}
      <div className="mb-8 flex flex-col items-center gap-3">
        {isGoogle ? (
          <div className="w-16 h-16 rounded-2xl bg-white shadow-lg border border-slate-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-white shadow-lg border border-slate-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
          </div>
        )}
      </div>

      {/* Spinner */}
      <div className="relative mb-6">
        {/* Outer ring */}
        <div className="w-14 h-14 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
        {/* Spinning arc */}
        <div className="absolute inset-0 w-14 h-14 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
        </div>
      </div>

      <div className="text-center space-y-1.5 px-8 max-w-xs">
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Signing in with {isGoogle ? "Google" : "Microsoft"}…
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You&apos;re being securely redirected. Please wait.
        </p>
      </div>

      {/* Animated dots */}
      <div className="mt-6 flex items-center gap-1.5">
        {[0, 0.2, 0.4].map((delay, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
    </div>
  );
}

const Social = ({ showGoogle = true, showMicrosoft = true, className, tenantId, microsoftReady = false }: SocialProps) => {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "microsoft" | null>(null);

  if (!showGoogle && !showMicrosoft) {
    return null;
  }

  const isSingle = (showGoogle && !showMicrosoft) || (!showGoogle && showMicrosoft);
  const canSignInWithMicrosoft = microsoftReady && !!tenantId;

  const handleGoogleSignIn = async () => {
    setLoadingProvider("google");
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setLoadingProvider(null);
    }
  };

  const handleMicrosoftSignIn = async () => {
    if (!canSignInWithMicrosoft) return;
    setLoadingProvider("microsoft");
    try {
      await signIn("keycloak", { callbackUrl: "/dashboard" }, { kc_idp_hint: `microsoft-${tenantId}` });
    } catch {
      setLoadingProvider(null);
    }
  };

  return (
    <>
      {/* Full-page loading overlay */}
      {loadingProvider && <SsoLoadingOverlay provider={loadingProvider} />}

      <div className={cn(isSingle ? "flex flex-col gap-2.5" : "grid grid-cols-2 gap-3", className)}>
        {/* Google */}
        {showGoogle && (
          <button
            type="button"
            disabled={!!loadingProvider}
            onClick={handleGoogleSignIn}
            className={cn(
              "flex items-center justify-center gap-2 w-full h-11 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium text-xs shadow-sm transition-all hover:scale-[1.01] cursor-pointer active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none",
              isSingle && "text-sm font-semibold border-slate-300 shadow-xs",
              loadingProvider === "google" && "border-indigo-300 bg-indigo-50"
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>{isSingle ? "Continue with Google" : "Google"}</span>
          </button>
        )}

        {/* Microsoft */}
        {showMicrosoft && (
          <button
            type="button"
            disabled={!canSignInWithMicrosoft || !!loadingProvider}
            onClick={handleMicrosoftSignIn}
            className={cn(
              "flex items-center justify-center gap-2 w-full h-11 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium text-xs shadow-sm transition-all hover:scale-[1.01] cursor-pointer active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none",
              isSingle && "text-sm font-semibold border-slate-300 shadow-xs",
              loadingProvider === "microsoft" && "border-indigo-300 bg-indigo-50"
            )}
          >
            <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            <span>{isSingle ? "Continue with Microsoft" : "Microsoft"}</span>
          </button>
        )}
      </div>
    </>
  );
};

export default Social;
