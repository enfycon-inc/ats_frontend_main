"use client";

import React, { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import toast from "react-hot-toast";
import { getCurrentSubdomain, getBaseDomain, getTenantIdentifier } from "@/utils/subdomain-helper";
import Social from "./social";
import { useSearchParams } from "next/navigation";

const schema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(4, { message: "Password must be at least 4 characters." }),
});

const LoginForm = () => {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [passwordType, setPasswordType] = useState("password");
  const formRef = useRef<HTMLFormElement>(null);

  const [isAuthorizingSso, setIsAuthorizingSso] = useState(false);

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
    const isExpired = searchParams.get("expired");
    if (isExpired === "true") {
      toast.error("Your session has expired for security. Please sign in again.", {
        id: "session-expired",
        duration: 5000,
      });
    }

    const errorParam = searchParams.get("error");
    if (errorParam === "AccessDenied" || errorParam === "Callback") {
      toast.error(
        "Access Denied: You have not been invited to this workspace. Please contact your administrator for an invite.",
        { duration: 6000 }
      );
    }

    const emailParam = searchParams.get("email");
    const passwordParam = searchParams.get("password");

    if (emailParam) {
      setValue("email", emailParam);
    }
    if (passwordParam) {
      setValue("password", passwordParam);
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

    const ssoToken = searchParams.get("sso_token") || searchParams.get("token");
    const userJsonParam = searchParams.get("user_json");
    if (ssoToken) {
      setIsAuthorizingSso(true);
      if (userJsonParam && typeof window !== "undefined") {
        try {
          localStorage.setItem("ats_current_user", userJsonParam);
        } catch {}
      }
      const cachedUser = userJsonParam || (typeof window !== "undefined" ? localStorage.getItem("ats_current_user") : null);
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
    } else if (!isExpired && !errorParam) {
      // If user lands on login page while already authenticated, redirect them appropriately
      fetch("/api/auth/session", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((session) => {
          if (session?.user && (session as any).error !== "RefreshAccessTokenError") {
            const user = session.user as any;
            const isSuperAdmin = user.roles?.includes("SUPER_ADMIN") || user.systemRole === "SUPER_ADMIN";
            const rawUserSub = user.tenantDomain || "";
            const userSub = rawUserSub.split(".")[0].toLowerCase().trim();
            const isMasterTenant = !userSub || userSub === "enfy" || userSub === "www" || userSub === "localhost";

            const currentSub = getCurrentSubdomain();
            const base = getBaseDomain();
            const protocol = window.location.protocol;

            if (isSuperAdmin) {
              if (currentSub) {
                window.location.replace(`${protocol}//${base}/dashboard`);
              } else {
                window.location.replace("/dashboard");
              }
            } else if (userSub && !isMasterTenant) {
              if (currentSub === userSub) {
                // User is already on their respective tenant subdomain (e.g. deb.localhost:3000)
                window.location.replace("/dashboard");
              } else if (!currentSub) {
                // User is on root domain (localhost:3000) with a residual tenant session.
                // Purge the root session so they are not treated as logged in on the main domain.
                // Do NOT redirect to another subdomain — stay on localhost!
                signOut({ redirect: false });
              }
            } else if (isMasterTenant && !currentSub) {
              window.location.replace("/dashboard");
            }
          }
        })
        .catch(() => {});
    }
  }, [searchParams, setValue]);

  /**
   * Wait until the NextAuth session cookie is committed before navigating away.
   *
   * signIn({ redirect: false }) resolves as soon as the server sends Set-Cookie,
   * but the browser may not have persisted the cookie before window.location.href
   * fires — causing the dashboard layout's server-side auth() to see no session
   * and redirect straight back to /auth/login.
   *
   * We poll /api/auth/session (same origin) for up to ~3 s to confirm the cookie
   * is readable, then navigate. Falls back to immediate navigation on timeout.
   */
  const navigateAfterLogin = async (destination: string) => {
    const MAX_ATTEMPTS = 12;
    const POLL_INTERVAL_MS = 250;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (res.ok) {
          const session = await res.json();
          if (session?.user) {
            window.location.href = destination;
            return;
          }
        }
      } catch {
        // network hiccup — keep trying
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    // Session didn't appear within timeout — navigate anyway (best-effort)
    window.location.href = destination;
  };

  const onSubmit = (data: z.infer<typeof schema>) => {
    startTransition(async () => {
      try {
        // 1. Authenticate with NestJS Backend API to retrieve & store 7-day JWT token
        let syncRes;
        try {
          syncRes = await atsApi.auth.login(data.email, data.password);
        } catch (apiErr: any) {
          toast.error(apiErr.message || "Backend authentication failed.");
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

        if (isSuperAdmin) {
          // Super Admin always operates on root domain
          const signInRes = await signIn("token-handoff", {
            redirect: false,
            token: syncRes.accessToken,
            userJson: JSON.stringify(syncRes.user),
            callbackUrl: "/dashboard",
          });

          if (signInRes?.error) {
            toast.error("Sign in failed. Please check credentials.");
            return;
          }

          toast.success("Successfully logged in");
          const dest = currentSubdomain ? `${protocol}//${base}/dashboard` : "/dashboard";
          await navigateAfterLogin(dest);
          return;
        }

        if (userTenantDomain && !isMasterTenant && currentSubdomain !== userTenantDomain) {
          // Tenant member logging in from root domain or different subdomain:
          // Do NOT establish a NextAuth session on root domain (avoids ghost root sessions).
          // Immediately redirect to tenant subdomain with SSO handoff token and user payload!
          toast.success("Redirecting to your workspace...");
          const tokenParam = syncRes?.accessToken ? `?sso_token=${encodeURIComponent(syncRes.accessToken)}` : "";
          const userParam = syncRes?.user ? `&user_json=${encodeURIComponent(JSON.stringify(syncRes.user))}` : "";
          const callbackUrlParam = searchParams.get("callbackUrl");
          const cbParam = callbackUrlParam ? `&callbackUrl=${encodeURIComponent(callbackUrlParam)}` : "";
          window.location.href = `${protocol}//${userTenantDomain}.${base}/auth/login${tokenParam}${userParam}${cbParam}`;
          return;
        }

        // User logging in directly on their tenant subdomain (or master tenant on root)
        const signInRes = await signIn("token-handoff", {
          redirect: false,
          token: syncRes.accessToken,
          userJson: JSON.stringify(syncRes.user),
          callbackUrl: "/dashboard",
        });

        if (signInRes?.error) {
          toast.error("Sign in failed. Please check credentials.");
          return;
        }

        toast.success("Successfully logged in");

        const dest = (currentSubdomain === "enfy" && isMasterTenant)
          ? `${protocol}//${base}/dashboard`
          : "/dashboard";
        await navigateAfterLogin(dest);
      } catch (err: any) {
        toast.error(err.message || "Failed to sign in.");
      }
    });
  };

  if (isAuthorizingSso) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-600/20 border-t-indigo-600 animate-spin" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">Signing into workspace...</p>
          <p className="text-xs text-slate-400">Taking you directly to your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} method="POST" onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
      
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
            placeholder="••••••••"
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

      {/* Remember Me & Forgot Password */}
      <div className="flex justify-between items-center pt-2 text-xs">
        <div className="flex items-center gap-2">
          <Checkbox id="checkbox" defaultChecked className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          <Label htmlFor="checkbox" className="text-slate-600 cursor-pointer font-medium select-none">
            Keep Me Signed In
          </Label>
        </div>
        <Link
          href="/auth/forgot-password"
          className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition-colors"
        >
          Forgot Password?
        </Link>
      </div>

      {/* Submit Button */}
      <Button
        disabled={isPending}
        className="w-full h-11 mt-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
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
      <div className="pt-3">
        <div className="relative flex items-center justify-center mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="border-t border-slate-200 w-full" />
          </div>
          <span className="relative bg-white px-3 text-xs uppercase font-semibold text-slate-400">
            Or Sign In With
          </span>
        </div>
        <Social />
      </div>

    </form>
  );
};

export default LoginForm;
