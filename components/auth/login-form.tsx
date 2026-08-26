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
import { signIn } from "next-auth/react";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";
import { handleLoginAction } from "./actions/login";
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

  React.useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "AccessDenied" || errorParam === "Callback") {
      toast.error(
        "Access Denied: You have not been invited to this workspace. Please contact your administrator for an invite.",
        { duration: 6000 }
      );
    }

    const ssoToken = searchParams.get("sso_token") || searchParams.get("token");
    if (ssoToken) {
      setIsAuthorizingSso(true);
      signIn("token-handoff", {
        token: ssoToken,
        redirect: false,
      }).then((res) => {
        if (res?.ok) {
          if (typeof window !== "undefined") {
            localStorage.setItem("ats_access_token", ssoToken);
          }
          window.location.href = "/dashboard";
        } else {
          setIsAuthorizingSso(false);
          toast.error("Session verification expired. Please sign in.");
        }
      }).catch(() => {
        setIsAuthorizingSso(false);
        toast.error("SSO handoff failed.");
      });
    }
  }, [searchParams]);

  const togglePasswordType = () => {
    setPasswordType((prev) => (prev === "password" ? "text" : "password"));
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "all",
    defaultValues: {
      email: "recruiter@enfycon.com",
      password: "enfycon123",
    },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    startTransition(async () => {
      try {
        if (!formRef.current) return;

        const formData = new FormData(formRef.current);
        const res = await handleLoginAction(formData);

        if (res?.error) {
          toast.error(res.error);
        } else {
          // Sync with NestJS Backend API to retrieve/store JWT token
          let syncRes;
          try {
            syncRes = await atsApi.auth.login(data.email, data.password);
          } catch (apiErr: any) {
            toast.error(apiErr.message || "Backend authentication failed.");
            return;
          }

          const signInRes = await signIn("credentials", {
            redirect: false,
            email: data.email,
            password: data.password,
            subdomain: getTenantIdentifier(),
            callbackUrl: "/dashboard",
          });

          if (signInRes?.error) {
            toast.error("Sign in failed. Please check credentials.");
            return;
          }

          toast.success("Successfully logged in");

          // Redirection logic
          const isSuperAdmin = syncRes?.user?.roles?.includes("SUPER_ADMIN") || (syncRes?.user as any)?.systemRole === "SUPER_ADMIN";
          const userTenantDomain = syncRes?.user?.tenantDomain;
          const currentSubdomain = getCurrentSubdomain();
          const base = getBaseDomain();
          const protocol = window.location.protocol;

          if (isSuperAdmin) {
            // Super Admin always stays on root domain (enfyjobs.com/dashboard)
            if (currentSubdomain) {
              window.location.href = `${protocol}//${base}/dashboard`;
            } else {
              window.location.href = "/dashboard";
            }
          } else if (userTenantDomain && userTenantDomain !== "enfy" && userTenantDomain !== "www" && currentSubdomain !== userTenantDomain) {
            // Only redirect to tenant subdomain if currently logging in from the root domain (enfyjobs.com / localhost)
            const isRootHost = window.location.hostname === "enfyjobs.com" || window.location.hostname === "www.enfyjobs.com" || window.location.hostname === "localhost";
            if (isRootHost) {
              const tokenParam = syncRes?.accessToken ? `?sso_token=${encodeURIComponent(syncRes.accessToken)}` : "";
              window.location.href = `${protocol}//${userTenantDomain}.${base}/auth/login${tokenParam}`;
            } else {
              // Already on custom domain (e.g. ats.golgrab.com) -> proceed straight to /dashboard
              window.location.href = "/dashboard";
            }
          } else if (currentSubdomain === "enfy") {
            // Master tenant user on enfy.localhost -> redirect to root /dashboard
            window.location.href = `${protocol}//${base}/dashboard`;
          } else {
            window.location.href = "/dashboard";
          }
        }
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
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
      
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
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-xs uppercase font-semibold text-slate-400">
            Or Sign In With
          </span>
        </div>
        <Social />
      </div>

    </form>
  );
};

export default LoginForm;
