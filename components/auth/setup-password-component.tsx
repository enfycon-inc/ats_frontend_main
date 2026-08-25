'use client';

import React, { useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { atsApi } from "@/lib/ats-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Building2, UserCheck, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { doSocialLogin } from "@/app/actions";

export default function SetupPasswordComponent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const router = useRouter();

  const [loadingDetails, setLoadingDetails] = useState(true);
  const [inviteDetails, setInviteDetails] = useState<{
    email: string;
    fullName: string;
    systemRole: string;
    tenantName: string;
    tenantDomain: string;
    isExpired: boolean;
    isAccepted: boolean;
  } | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) {
      setLoadingDetails(false);
      return;
    }
    atsApi.auth
      .getInvitationDetails(token)
      .then((data) => {
        setInviteDetails(data);
      })
      .catch((err) => {
        console.error("Failed to load invitation:", err);
      })
      .finally(() => {
        setLoadingDetails(false);
      });
  }, [token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      return toast.error("Please enter and confirm your new password.");
    }
    if (password.length < 8) {
      return toast.error("Password must be at least 8 characters long.");
    }
    if (password !== confirmPassword) {
      return toast.error("Passwords do not match.");
    }

    startTransition(async () => {
      try {
        const res = await atsApi.auth.acceptInvite(token, password);
        toast.success(res.message || "Password set successfully!");
        setTimeout(() => {
          router.push("/auth/login");
        }, 1200);
      } catch (err: any) {
        toast.error(err.message || "Failed to set password. Token may be invalid or expired.");
      }
    });
  };

  if (loadingDetails) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-500">Verifying invitation token...</p>
      </div>
    );
  }

  if (!token || !inviteDetails) {
    return (
      <div className="text-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Invalid Invitation Link</h3>
        <p className="text-sm text-slate-500">
          This invitation link is invalid or does not exist. Please check the link from your email or contact your administrator.
        </p>
        <Button onClick={() => router.push("/auth/login")} className="w-full bg-slate-900 hover:bg-slate-800 text-white">
          Back to Login
        </Button>
      </div>
    );
  }

  if (inviteDetails.isExpired) {
    return (
      <div className="text-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Invitation Expired</h3>
        <p className="text-sm text-slate-500">
          This invitation token was valid for 24 hours and has now expired. Please ask your administrator to send you a new invitation link.
        </p>
        <Button onClick={() => router.push("/auth/login")} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
          Return to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace Context Badge */}
      <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-4 text-left space-y-2">
        <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>{inviteDetails.tenantName} Workspace</span>
        </div>
        <div className="text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Invited Email:</span>
            <span className="text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-indigo-100">
              {inviteDetails.email}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Role:</span>
            <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
              <UserCheck className="w-3.5 h-3.5" />
              {inviteDetails.systemRole}
            </span>
          </div>
        </div>
      </div>

      {/* Option 1: 1-Click Social Login */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 text-left">
          Option 1: Quick 1-Click Sign In
        </p>
        <div className="grid grid-cols-2 gap-3">
          <form
            action={async () => {
              const formData = new FormData();
              formData.append("action", "google");
              await doSocialLogin(formData);
            }}
          >
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full h-10 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Google SSO</span>
            </button>
          </form>

          <form
            action={async () => {
              const formData = new FormData();
              formData.append("action", "microsoft");
              await doSocialLogin(formData);
            }}
          >
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full h-10 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
              <span>Microsoft SSO</span>
            </button>
          </form>
        </div>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-white px-3 text-xs uppercase font-semibold text-slate-400">
          Or Set a Password
        </span>
      </div>

      {/* Option 2: Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Create Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              disabled={isPending}
              className="pl-10 pr-10 h-11 text-sm bg-white border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Confirm Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={isPending}
              className="pl-10 pr-10 h-11 text-sm bg-white border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500/20"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-11 mt-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Activating Account...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Set Password & Enter Workspace</span>
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
