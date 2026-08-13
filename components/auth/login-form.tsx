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
import { Loader2, Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";
import { handleLoginAction } from "./actions/login";
import { getCurrentSubdomain, getBaseDomain, getTenantIdentifier } from "@/utils/subdomain-helper";

const schema = z.object({
  email: z.string().email({ message: "Your email is invalid." }),
  password: z.string().min(4, { message: "Password must be at least 4 characters." }),
});

const LoginForm = () => {
  const [isPending, startTransition] = useTransition();
  const [passwordType, setPasswordType] = useState("password");
  const formRef = useRef<HTMLFormElement>(null);

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
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to sign in.");
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="mt-5 2xl:mt-7 space-y-4">
      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="font-medium text-default-600">
          Email{" "}
        </Label>
        <Input
          disabled={isPending}
          {...register("email")}
          type="email"
          id="email"
          name="email"
          className={cn("h-12 text-sm", {
            "border-destructive": errors.email,
          })}
        />
      </div>
      {errors.email && (
        <div className="text-destructive mt-2 text-sm">
          {errors.email.message}
        </div>
      )}

      {/* Password Field */}
      <div className="mt-3.5 space-y-2">
        <Label htmlFor="password" className="mb-2 font-medium text-default-600">
          Password{" "}
        </Label>
        <div className="relative">
          <Input
            disabled={isPending}
            {...register("password")}
            type={passwordType}
            id="password"
            name="password"
            className="peer h-12 text-sm"
            placeholder=" "
          />

          <div
            className="absolute top-1/2 -translate-y-1/2 right-4 cursor-pointer"
            onClick={togglePasswordType}
          >
            {passwordType === "password" ? (
              <Eye className="w-5 h-5 text-default-400" />
            ) : (
              <EyeOff className="w-5 h-5 text-default-400" />
            )}
          </div>
        </div>
      </div>
      {errors.password && (
        <div className="text-destructive mt-2 text-sm">
          {errors.password.message}
        </div>
      )}

      {/* Remember Me & Forgot Password */}
      <div className="flex justify-between items-center pt-2">
        <div className="flex gap-2 items-center">
          <Checkbox id="checkbox" defaultChecked />
          <Label htmlFor="checkbox" className="text-default-600 cursor-pointer">Keep Me Signed In</Label>
        </div>
        <Link
          href="/auth/forgot-password"
          className="text-sm text-default-800 dark:text-default-400 leading-6 font-medium hover:underline"
        >
          Forgot Password?
        </Link>
      </div>

      {/* Submit Button */}
      <Button disabled={isPending} className="w-full mt-4">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? "Loading..." : "Sign In"}
      </Button>
    </form>
  );
};

export default LoginForm;
