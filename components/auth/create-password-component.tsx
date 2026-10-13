'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createPasswordSchema } from "@/lib/zod";
import { Eye, EyeOff, Loader2, Lock, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { atsApi } from "@/lib/ats-api";

const CreatePasswordComponent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [targetAccount, setTargetAccount] = useState<{ email?: string; fullName?: string; tenantName?: string } | null>(null);

  const form = useForm<z.infer<typeof createPasswordSchema>>({
    resolver: zodResolver(createPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      acceptTerms: true,
    },
  });

  useEffect(() => {
    if (!token) {
      setTokenError("Missing password reset token. Please check your link or request a new one.");
      setVerifying(false);
      return;
    }

    atsApi.auth
      .verifyResetToken(token)
      .then((res) => {
        if (res?.valid) {
          setTargetAccount({
            email: res.email,
            fullName: res.fullName,
            tenantName: res.tenantName,
          });
        } else {
          setTokenError(res?.message || "This password reset link is invalid or has expired.");
        }
      })
      .catch((err: any) => {
        setTokenError(err.message || "This password reset link is invalid or has expired.");
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [token]);

  const onSubmit = (values: z.infer<typeof createPasswordSchema>) => {
    if (!token) {
      return toast.error("Invalid or missing token.");
    }

    startTransition(async () => {
      try {
        const res = await atsApi.auth.resetPassword(token, values.password);
        if (res?.success) {
          toast.success("Password reset successfully! Please log in.");
          router.push("/auth/login");
        } else {
          toast.error(res?.message || "Failed to reset password.");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to reset password. The link may have expired.");
      }
    });
  };

  if (verifying) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Verifying password reset link...
        </p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="text-center p-4 space-y-5">
        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-sm">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Reset Link Invalid or Expired
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {tokenError}
          </p>
        </div>
        <div className="space-y-3 pt-2">
          <Button
            type="button"
            className="w-full h-11"
            onClick={() => router.push("/auth/forgot-password")}
          >
            Request New Reset Link
          </Button>
          <div>
            <Link
              href="/auth/login"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const passwordValue = form.watch("password") || "";
  const hasMinLength = passwordValue.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(passwordValue);

  return (
    <>
      {targetAccount?.email && (
        <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            Resetting password for: <strong className="font-semibold">{targetAccount.email}</strong>
            {targetAccount.tenantName && ` (${targetAccount.tenantName})`}
          </span>
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
        >
          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-700 dark:text-neutral-200" />
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="New Password (min. 8 characters)"
                      name="password"
                      className="ps-13 pe-12 h-14 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 focus:border-primary dark:focus:border-primary"
                      disabled={isPending}
                    />
                    <Button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-transparent text-muted-foreground hover:bg-transparent p-0 h-[unset]"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Strength Checklist */}
          <div className="flex items-center gap-4 text-xs px-1 text-slate-500">
            <span className={`flex items-center gap-1 ${hasMinLength ? "text-emerald-600 font-medium" : ""}`}>
              {hasMinLength ? "✓" : "○"} 8+ characters
            </span>
            <span className={`flex items-center gap-1 ${hasNumberOrSymbol ? "text-emerald-600 font-medium" : ""}`}>
              {hasNumberOrSymbol ? "✓" : "○"} Number or symbol
            </span>
          </div>

          {/* Confirm Password */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-700 dark:text-neutral-200" />
                    <Input
                      {...field}
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm New Password"
                      className="ps-13 pe-12 h-14 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 focus:border-primary dark:focus:border-primary"
                      disabled={isPending}
                    />
                    <Button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-transparent text-muted-foreground hover:bg-transparent p-0 h-[unset]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Accept Terms */}
          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2 mt-1">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      name="acceptTerms"
                      id="acceptTerms"
                      className="border border-neutral-500"
                    />
                  </FormControl>
                  <label htmlFor="acceptTerms" className="text-sm cursor-pointer">
                    You accept our Terms & Conditions
                  </label>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full rounded-lg h-[52px] text-sm mt-2"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Resetting Password...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-8 text-center text-sm">
        <p>
          Not now? Return{" "}
          <Link
            href="/auth/login"
            className="text-primary font-semibold hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </>
  );
};

export default CreatePasswordComponent;
