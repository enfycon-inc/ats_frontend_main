"use client";

import React, { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { atsApi } from "@/lib/ats-api";
import { ssoErrorMessage } from "@/lib/sso-error";
import toast from "react-hot-toast";
import { getCurrentSubdomain, getBaseDomain, getTenantIdentifier } from "@/utils/subdomain-helper";
import { useSignInPolicy } from "@/hooks/use-sign-in-policy";
import { signInOptions } from "@/lib/sign-in-policy";
import { DeveloperAccess } from "./developer-access";
import Social from "./social";
import { safeLoginCallback } from "@/lib/safe-login-callback";
import { useSearchParams } from "next/navigation";

const schema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(4, { message: "Password must be at least 4 characters." }),
});

const LoginForm = ({ heading, afterForm, footer }: { heading?: React.ReactNode; afterForm?: React.ReactNode; footer?: React.ReactNode }) => {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [passwordType, setPasswordType] = useState("password");
  const formRef = useRef<HTMLFormElement>(null);
  const handoffStarted = useRef(false);

  const [isAuthorizingSso, setIsAuthorizingSso] = useState(false);
  const [authPolicyStatus, setAuthPolicyStatus] = useState<"loading" | "ready" | "error">("loading");
  const { data: loadedPolicy, error: policyError, mutate: reloadPolicy } = useSignInPolicy();
  const [authPolicy, setAuthPolicy] = useState<{
    allowPasswordLogin: boolean;
    allowMicrosoftSso: boolean;
    allowGoogleSso: boolean;
    microsoftTenantId?: string;
    microsoftClientId?: string;
    tenantId?: string;
    requireMfa: boolean;
    allowDeveloperLogin: boolean;
    enforceSsoOnly: boolean;
  }>({
    allowPasswordLogin: true,
    allowMicrosoftSso: true,
    allowGoogleSso: true,
    requireMfa: false,
    allowDeveloperLogin: false,
    enforceSsoOnly: false,
  });

  const togglePasswordType = () => {
    setPasswordType((prev) => (prev === "password" ? "text" : "password"));
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "all",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  React.useEffect(() => {
    setIsMounted(true);
    if (policyError) { setAuthPolicyStatus("error"); return; }
    if (!loadedPolicy) { setAuthPolicyStatus("loading"); return; }
    const policy = loadedPolicy;
    if (!policy.tenantId) { setAuthPolicyStatus("error"); return; }
    setAuthPolicy({
      allowPasswordLogin: policy.allowPasswordLogin === true,
      allowMicrosoftSso: policy.allowMicrosoftSso === true,
      allowGoogleSso: policy.allowGoogleSso === true,
      requireMfa: policy.requireMfa === true,
      allowDeveloperLogin: policy.allowDeveloperLogin === true,
      microsoftTenantId: policy.microsoftTenantId || '', microsoftClientId: policy.microsoftClientId || '',
      enforceSsoOnly: policy.enforceSsoOnly === true, tenantId: policy.tenantId,
    });
    setAuthPolicyStatus("ready");
  }, [loadedPolicy, policyError]);

  React.useEffect(() => {
    const isExpired = searchParams.get("expired");
    if (isExpired === "true") {
      toast.error("We couldn't verify your sign-in. Please sign in again to continue.", {
        id: "session-expired",
        duration: 5000,
      });
    }

    const errorParam = searchParams.get("error");
    const errorMessage = errorParam ? ssoErrorMessage(errorParam) : null;
    if (errorMessage) toast.error(errorMessage, { duration: 6000 });

    const emailParam = searchParams.get("email");
    

    if (emailParam) {
      setValue("email", emailParam);
    }
    

    // Immediately clean plain-text credentials and transfer payloads from the browser address bar for security
    if (typeof window !== "undefined" && (searchParams.has("password") || searchParams.has("email") || searchParams.has("user_json"))) {
      const url = new URL(window.location.href);
      url.searchParams.delete("password");
      url.searchParams.delete("email");
      url.searchParams.delete("user_json");
      const cleanQuery = url.searchParams.toString();
      const cleanUrl = url.pathname + (cleanQuery ? `?${cleanQuery}` : "");
      window.history.replaceState({}, "", cleanUrl);
    }

    if (searchParams.get("handoff") === "true") {
      if (handoffStarted.current) return;
      handoffStarted.current = true;
      setIsAuthorizingSso(true);
      void (async () => {
        try {
          const response = await fetch('/api/auth/handoff', { cache: 'no-store' });
          if (!response.ok) throw new Error('Workspace sign-in could not be completed. Please sign in again.');
          const data = await response.json();
          const result = await signIn('token-handoff', {
            token: data.accessToken, refreshToken: data.refreshToken,
            expiresIn: data.expiresIn, userJson: JSON.stringify(data.user),
            officeLoginReceipt: data.officeLoginReceipt || '', redirect: false,
          });
          if (!result?.ok) throw new Error('Workspace sign-in failed.');
          localStorage.removeItem('ats_refresh_token');
          localStorage.setItem('ats_access_token', data.accessToken);
          localStorage.setItem('ats_current_user', JSON.stringify(data.user));
          await navigateAfterLogin(searchParams.get('callbackUrl') || '/dashboard');
        } catch (error: any) {
          setIsAuthorizingSso(false);
          toast.error(error.message);
        }
      })();
      return;
    }
    const ssoToken = searchParams.get("token");

    if (ssoToken) {
      setIsAuthorizingSso(true);
      const cachedUser = (typeof window !== "undefined" ? localStorage.getItem("ats_current_user") : null);
      signIn("token-handoff", {
        token: ssoToken,
        userJson: cachedUser || undefined,
        redirect: false,
      }).then(async (res) => {
        if (res?.ok) {
          if (typeof window !== "undefined") {
            localStorage.setItem("ats_access_token", ssoToken);
          }
          const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
          await navigateAfterLogin(callbackUrl);
        } else {
          setIsAuthorizingSso(false);
          toast.error("Session verification expired. Please sign in.");
        }
      }).catch(() => {
        setIsAuthorizingSso(false);
        toast.error("SSO handoff failed.");
      });
    }
  }, [searchParams, setValue]);

  /**
   * Wait until the NextAuth session cookie is committed before navigating away.
   *
   * signIn({ redirect: false }) resolves as soon as the server sends Set-Cookie,
   * but the browser may not have persisted the cookie before window.location.href
   * fires â€” causing the dashboard layout's server-side auth() to see no session
   * and redirect straight back to /auth/login.
   *
   * We poll /api/auth/session (same origin) for up to ~3 s to confirm the cookie
   * is readable, then navigate. Falls back to immediate navigation on timeout.
   */
  // A document navigation outlives the sign-in transition. Keep the overlay
  // mounted until this page unloads instead of revealing the form again.
  const navigateToDashboard = (destination: string) => {
    setIsNavigating(true);
    try {
      window.location.href = destination;
    } catch (error) {
      setIsNavigating(false);
      throw error;
    }
  };

  const navigateAfterLogin = async (destination: string) => {
    const requestedReturn = searchParams.get("callbackUrl");
    if (requestedReturn) destination = safeLoginCallback(requestedReturn);
    const MAX_ATTEMPTS = 12;
    const POLL_INTERVAL_MS = 250;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (res.ok) {
          const session = await res.json();
          if (session?.user) {
            navigateToDashboard(destination);
            return;
          }
        }
      } catch {
        // network hiccup â€” keep trying
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    // Session didn't appear within timeout â€” navigate anyway (best-effort)
    navigateToDashboard(destination);
  };

  const [credentialError, setCredentialError] = useState<{ mode: "password" | "developer"; message: string } | null>(null);

  const onSubmit = (data: z.infer<typeof schema>, developer = false) => {
    if (isPending) return;
    setCredentialError(null);
    const mode = developer ? "developer" : "password";
    startTransition(async () => {
      try {
        // 1. Authenticate with the backend and request the selected session policy.
        let syncRes;
        try {
          syncRes = await atsApi.auth.login(data.email, data.password, false, developer);
        } catch (apiErr: any) {
          setCredentialError({ mode, message: apiErr.message || "Unable to sign in. Please try again." });
          if (!developer) setValue("password", "");
          return;
        }

        // Subdomain & Tenant redirection logic
        const isSuperAdmin = syncRes?.user?.roles?.includes("SUPER_ADMIN") || (syncRes?.user as any)?.systemRole === "SUPER_ADMIN";
        const rawTenantDomain = syncRes?.user?.tenantDomain || "";
        const userTenantDomain = rawTenantDomain.split(".")[0].toLowerCase().trim();
        const currentSubdomain = getCurrentSubdomain();
        const base = getBaseDomain();
        const protocol = window.location.protocol;
        const isMasterTenant = !userTenantDomain || userTenantDomain === "enfy" || userTenantDomain === "www" || userTenantDomain === "localhost";

        const isPlatformOwnerOnRoot = (userTenantDomain === "enfycon" || userTenantDomain === "enfy") && currentSubdomain === "";
        if (userTenantDomain && !isMasterTenant && currentSubdomain !== userTenantDomain && !isPlatformOwnerOnRoot) {
          // Tenant member logging in from root domain or different subdomain:
          // Do NOT establish a NextAuth session on root domain (avoids ghost root sessions).
          // Transfer renewal credentials to the tenant before navigating.
          toast.success("Redirecting to your workspace...");
          const callbackUrlParam = searchParams.get("callbackUrl");
          const handoff = await fetch('/api/auth/handoff', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: syncRes.accessToken, refreshToken: syncRes.refreshToken, destination: userTenantDomain, officeLoginReceipt: syncRes.officeLoginReceipt || '' }),
          });
          if (!handoff.ok) throw new Error('Unable to transfer your workspace session. Please try again.');
          localStorage.removeItem('ats_refresh_token');
          navigateToDashboard(`${protocol}//${userTenantDomain}.${base}/auth/login?handoff=true${callbackUrlParam ? `&callbackUrl=${encodeURIComponent(callbackUrlParam)}` : ''}`);
          return;
        }

        // User logging in directly on their tenant subdomain (or master tenant on root)
        const signInRes = await signIn("token-handoff", {
          redirect: false,
          token: syncRes.accessToken,
          refreshToken: syncRes.refreshToken,
          expiresIn: syncRes.expiresIn,
          userJson: JSON.stringify(syncRes.user),
          officeLoginReceipt: syncRes.officeLoginReceipt || '',
          callbackUrl: "/dashboard",
        });

        if (signInRes?.error) {
          setCredentialError({ mode, message: "Sign in failed. Please try again." });
          return;
        }

        // NextAuth owns renewal; avoid independently rotating the same token in localStorage.
        localStorage.removeItem("ats_refresh_token");
        toast.success("Successfully logged in");

        const dest = (currentSubdomain === "enfy" && isMasterTenant)
          ? `${protocol}//${base}/dashboard`
          : "/dashboard";
        await navigateAfterLogin(dest);
      } catch (err: any) {
        setCredentialError({ mode, message: err.message || "Failed to sign in." });
        if (!developer) setValue("password", "");
      }
    });
  };

  if (isAuthorizingSso || isNavigating) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm">
        <div className="relative mb-6">
          <div className="w-14 h-14 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-1.5 px-8 max-w-xs">
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Signing in to workspaceâ€¦</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isAuthorizingSso || isNavigating ? "Taking you directly to your dashboard." : "Verifying your credentials, please wait."}
          </p>
        </div>
        <div className="mt-6 flex items-center gap-1.5">
          {[0, 0.2, 0.4].map((delay, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${delay}s` }} />
          ))}
        </div>
      </div>
    );
  }

  const showPassword = signInOptions(authPolicy).password;
  const showGoogle = authPolicy.allowGoogleSso;
  const showMicrosoft = authPolicy.allowMicrosoftSso;
  const microsoftTenantConfigured = !!authPolicy.microsoftTenantId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authPolicy.microsoftTenantId);
  const microsoftConfigured = microsoftTenantConfigured && !!authPolicy.microsoftClientId;
  // Hostname-dependent options must wait until hydration. The server cannot
  // see the browser host, so reading it during the first render causes a
  // markup mismatch and React rebuilds the login form.
  const isGlobalPortal = !isMounted || !getTenantIdentifier();
  const hasSocial = (showGoogle || showMicrosoft) && !isGlobalPortal;
  const socialLogin = (
    <div className="space-y-2">
      {authPolicyStatus === "loading" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="h-11 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse w-full"></div>
          <div className="h-11 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse w-full"></div>
        </div>
      ) : (
        <Social
          showGoogle={showGoogle}
          showMicrosoft={showMicrosoft}
          tenantId={authPolicy.tenantId}
          disabled={isPending}
          microsoftReady={authPolicyStatus === "ready" && showMicrosoft && microsoftConfigured}
        />
      )}
      {authPolicyStatus === "error" && (
        <p role="alert" className="text-xs text-red-600">
          Unable to load workspace sign-in options.{' '}
          <button type="button" onClick={() => void reloadPolicy()} className="font-semibold underline cursor-pointer">
            Retry
          </button>
        </p>
      )}
      {authPolicyStatus === "ready" && showMicrosoft && !microsoftConfigured && (
        <p role="alert" className="text-xs text-amber-700">
          Microsoft sign-in is not configured. Contact your workspace administrator for help.
        </p>
      )}
    </div>
  );

  const accessHelp = <p className="text-center text-xs leading-relaxed text-slate-500">Need help? Contact <a className="font-medium text-blue-700 underline underline-offset-2" href="mailto:helpdesk@enfycon.com">helpdesk@enfycon.com</a></p>;
  const developerAccess = <DeveloperAccess pending={isPending} error={credentialError?.mode === "developer" ? credentialError.message : undefined} enabled={authPolicyStatus === "ready" && signInOptions(authPolicy).developer && !isGlobalPortal} onSignIn={data => onSubmit(data, true)} />;
  if (authPolicyStatus !== "ready") return <div className="space-y-3 text-sm text-slate-500" role="status">
    {authPolicyStatus === "loading" ? "Loading sign-in options…" : <>Unable to load sign-in options. <button type="button" className="underline" onClick={() => void reloadPolicy()}>Retry</button></>}
  </div>;
  if (!showPassword) return <div className="flex flex-1 flex-col text-left">
    <div className="my-auto space-y-5 py-10">
      {heading}
      {hasSocial ? socialLogin : <p className="text-center text-sm text-slate-500">Sign-in is currently unavailable. Contact your workspace administrator.</p>}
      {accessHelp}
      {afterForm}
    </div>
    <div className="mt-auto pt-12 text-center">{footer}<div className="mt-5">{developerAccess}</div></div>
  </div>;

  return (
    <div className="flex flex-1 flex-col"><div className="my-auto space-y-5 py-10">{heading}<form ref={formRef} method="POST" onSubmit={handleSubmit(data => onSubmit(data))} className="space-y-4 text-left">
      
      {/* Email Field */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Work Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            disabled={isPending}
            {...register("email")}
            type="email"
            id="email"
            name="email"
            placeholder="name@company.com"
            className={cn(
              "pl-10 h-11 text-sm bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all rounded-lg",
              { "border-red-500 focus-visible:ring-red-500/20": errors.email }
            )}
          />
        </div>
        {errors.email && (
          <p className="text-red-500 text-xs font-medium mt-1">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-1.5 pt-1">
        <Label htmlFor="password" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            disabled={isPending}
            {...register("password")}
            type={passwordType}
            id="password"
            name="password"
            placeholder="Password"
            className={cn(
              "pl-10 pr-11 h-11 text-sm bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all rounded-lg",
              { "border-red-500 focus-visible:ring-red-500/20": errors.password }
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={togglePasswordType}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {passwordType === "password" ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-red-500 text-xs font-medium mt-1">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Password recovery */}
      <div className="flex justify-end items-center pt-2 text-xs">
        <Link
          href="/auth/forgot-password"
          className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition-colors"
        >
          Forgot Password?
        </Link>
      </div>

      {credentialError?.mode === "password" && <p role="alert" className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-700">{credentialError.message}</p>}
      {/* Submit Button */}
      <Button
        disabled={isPending}
        className="w-full h-11 mt-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-lg shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-white" />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <span>Sign In to Workspace</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </Button>

      {/* Social Login Options */}
      {hasSocial && (
        <div className="pt-3">
          <div className="relative flex items-center justify-center mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="border-t border-slate-200 w-full" />
            </div>
            <span className="relative bg-white px-3 text-xs uppercase font-semibold text-slate-400">
              Or Sign In With
            </span>
          </div>
          {socialLogin}
        </div>
      )}

    </form>{accessHelp}{afterForm}</div><div className="mt-auto pb-1 pt-10 text-center">{footer}<div className="mt-4">{developerAccess}</div></div></div>
  );
};

export default LoginForm;
