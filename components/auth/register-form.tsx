"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type Step = "company" | "admin" | "success";

const RegForm = () => {
  const router = useRouter();
  const [step, setStep] = useState<Step>("company");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [form, setForm] = useState({
    companyName: "",
    subdomain: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubdomainInput = (value: string) => {
    update("subdomain", value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const handleCompanyNameChange = (value: string) => {
    update("companyName", value);
    // Auto-suggest subdomain from company name
    const suggested = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    if (!form.subdomain) {
      update("subdomain", suggested);
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.companyName.trim()) newErrors.companyName = "Company name is required.";
    if (!form.subdomain.trim()) newErrors.subdomain = "Workspace address is required.";
    else if (!/^[a-z0-9-]+$/.test(form.subdomain)) newErrors.subdomain = "Only lowercase letters, numbers, and hyphens.";
    else if (form.subdomain.length < 3) newErrors.subdomain = "Must be at least 3 characters.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.fullName.trim()) newErrors.fullName = "Full name is required.";
    if (!form.email.trim()) newErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Enter a valid email address.";
    if (!form.password) newErrors.password = "Password is required.";
    else if (form.password.length < 8) newErrors.password = "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const res = await atsApi.auth.registerTenant({
        companyName: form.companyName,
        subdomain: form.subdomain,
        email: form.email,
        fullName: form.fullName,
        password: form.password,
      });
      setResult(res);
      setStep("success");
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── SUCCESS SCREEN ──────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="text-center space-y-6 py-4">
        <div className="inline-flex h-20 w-20 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 items-center justify-center text-4xl mx-auto shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-default-900 mb-2">
            🎉 You&apos;re on the list!
          </h3>
          <p className="text-sm text-default-500 max-w-sm mx-auto leading-relaxed">
            <span className="font-semibold text-default-700">{result?.tenant?.name}</span> has been registered.
            Your workspace will be available at:
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-lg px-4 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-indigo-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253m0 0L7.5 12" />
            </svg>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {result?.tenant?.workspaceUrl}
            </span>
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-left">
          <div className="flex gap-2 items-start">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-amber-600 mt-0.5 flex-none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              <span className="font-semibold">Pending Approval:</span> Our platform team will review and activate your account within 24 hours. You&apos;ll receive an email confirmation once approved.
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push("/auth/login")}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Step Indicator ── */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 text-xs font-semibold ${step === "company" ? "text-indigo-600" : "text-emerald-600"}`}>
          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${step === "company" ? "bg-indigo-600" : "bg-emerald-500"}`}>
            {step === "company" ? "1" : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </div>
          Company Info
        </div>
        <div className={`flex-1 h-px ${step === "admin" ? "bg-indigo-300" : "bg-default-200"}`} />
        <div className={`flex items-center gap-2 text-xs font-semibold ${step === "admin" ? "text-indigo-600" : "text-default-400"}`}>
          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${step === "admin" ? "bg-indigo-600 text-white" : "bg-default-200 text-default-500"}`}>
            2
          </div>
          Admin Account
        </div>
      </div>

      {/* ── STEP 1: Company Info ── */}
      {step === "company" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyName" className="text-xs font-semibold text-default-700">
              Company / Organization Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="companyName"
              placeholder="e.g. TechCorp Inc."
              value={form.companyName}
              onChange={(e) => handleCompanyNameChange(e.target.value)}
              className={cn("h-12 text-sm", errors.companyName ? "border-red-400 focus:border-red-400" : "")}
            />
            {errors.companyName && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {errors.companyName}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subdomain" className="text-xs font-semibold text-default-700">
              Workspace Address <span className="text-red-500">*</span>
            </Label>
            <div className={`flex items-center bg-default-50 dark:bg-slate-800 border rounded-lg overflow-hidden ${errors.subdomain ? "border-red-400" : "border-default-250"}`}>
              <Input
                id="subdomain"
                placeholder="your-company"
                value={form.subdomain}
                onChange={(e) => handleSubdomainInput(e.target.value)}
                className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 font-medium text-sm"
              />
              <span className="text-xs font-semibold text-default-500 bg-default-200 dark:bg-slate-700 px-3 py-2 whitespace-nowrap border-l border-default-200 dark:border-slate-600">
                .enfycon.com
              </span>
            </div>
            {form.subdomain && !errors.subdomain && (
              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253m0 0L7.5 12" />
                </svg>
                Your workspace: <span className="font-semibold">{form.subdomain}.enfycon.com</span>
              </p>
            )}
            {errors.subdomain && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {errors.subdomain}
              </p>
            )}
          </div>

          <Button
            onClick={() => { if (validateStep1()) setStep("admin"); }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold mt-2 flex items-center justify-center gap-2"
          >
            Continue
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Button>
        </div>
      )}

      {/* ── STEP 2: Admin Account ── */}
      {step === "admin" && (
        <div className="space-y-4">
          <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-lg p-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-indigo-500 flex-none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">{form.companyName}</p>
              <p className="text-[10px] text-indigo-500">{form.subdomain}.enfycon.com</p>
            </div>
            <button onClick={() => setStep("company")} className="ml-auto text-[10px] text-indigo-500 hover:text-indigo-700 underline">
              Edit
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs font-semibold text-default-700">
              Your Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              placeholder="Jane Smith"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              className={cn("h-12 text-sm", errors.fullName ? "border-red-400" : "")}
            />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-default-700">
              Work Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@techcorp.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={cn("h-12 text-sm", errors.email ? "border-red-400" : "")}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-default-700">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className={cn("h-12 text-sm pr-10", errors.password ? "border-red-400" : "")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-default-400 hover:text-default-600"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold text-default-700">
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              className={cn("h-12 text-sm", errors.confirmPassword ? "border-red-400" : "")}
            />
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setStep("company")}
              className="flex-none flex items-center justify-center"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2"
              type="button"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full mr-2" />
                  Registering...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                  Create My Workspace
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegForm;