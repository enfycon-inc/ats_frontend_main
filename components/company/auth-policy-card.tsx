"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { atsApi } from "@/lib/ats-api";
import {
  KeyRound,
  ShieldCheck,
  Building,
  AlertTriangle,
  Plus,
  X,
  Save,
  RefreshCw,
  Lock,
  Eye,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface AuthPolicyCardProps {
  tenantId?: string;
  subdomain: string;
  companyName: string;
}

export function AuthPolicyCard({ tenantId, subdomain, companyName }: AuthPolicyCardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Policy state
  const [allowPasswordLogin, setAllowPasswordLogin] = useState(true);
  const [allowMicrosoftSso, setAllowMicrosoftSso] = useState(true);
  const [allowGoogleSso, setAllowGoogleSso] = useState(true);
  const [enforceSsoOnly, setEnforceSsoOnly] = useState(false);
  const [allowedEmailDomains, setAllowedEmailDomains] = useState<string[]>([]);
  const [microsoftTenantId, setMicrosoftTenantId] = useState("");

  // Domain input scratch state
  const [domainInput, setDomainInput] = useState("");

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const res = await atsApi.auth.getTenantAuthPolicy(subdomain);
      if (res) {
        setAllowPasswordLogin(res.allowPasswordLogin ?? true);
        setAllowMicrosoftSso(res.allowMicrosoftSso ?? true);
        setAllowGoogleSso(res.allowGoogleSso ?? true);
        setEnforceSsoOnly(res.enforceSsoOnly ?? false);
        setAllowedEmailDomains(res.allowedEmailDomains || []);
        setMicrosoftTenantId(res.microsoftTenantId || "");
      }
    } catch (err: any) {
      console.warn("Could not fetch tenant auth policy:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy();
  }, [subdomain]);

  // Lockout prevention check
  const wouldBeLockedOut = (nextPass: boolean, nextMs: boolean, nextGoogle: boolean) => {
    return !nextPass && !nextMs && !nextGoogle;
  };

  const handleTogglePassword = (checked: boolean) => {
    if (!checked && wouldBeLockedOut(false, allowMicrosoftSso, allowGoogleSso)) {
      toast.error("Cannot disable password login while all SSO methods are disabled. At least one login method is required.");
      return;
    }
    setAllowPasswordLogin(checked);
    if (checked && enforceSsoOnly) {
      setEnforceSsoOnly(false);
    }
  };

  const handleToggleMicrosoft = (checked: boolean) => {
    if (!checked && wouldBeLockedOut(allowPasswordLogin, false, allowGoogleSso)) {
      toast.error("At least one authentication method must remain enabled to prevent organization lockout.");
      return;
    }
    setAllowMicrosoftSso(checked);
  };

  const handleToggleGoogle = (checked: boolean) => {
    if (!checked && wouldBeLockedOut(allowPasswordLogin, allowMicrosoftSso, false)) {
      toast.error("At least one authentication method must remain enabled to prevent organization lockout.");
      return;
    }
    setAllowGoogleSso(checked);
  };

  const handleToggleEnforceSso = (checked: boolean) => {
    if (checked) {
      if (!allowMicrosoftSso && !allowGoogleSso) {
        toast.error("Enable at least one SSO provider (Microsoft or Google) before enforcing SSO.");
        return;
      }
      setEnforceSsoOnly(true);
      setAllowPasswordLogin(false);
    } else {
      setEnforceSsoOnly(false);
      setAllowPasswordLogin(true);
    }
  };

  const handleAddDomain = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = domainInput.trim().toLowerCase().replace(/^@/, "");
    if (!clean) return;
    if (!clean.includes(".") || clean.length < 3) {
      toast.error("Please enter a valid domain name (e.g. deb.com)");
      return;
    }
    if (allowedEmailDomains.includes(clean)) {
      toast.error(`Domain @${clean} is already in the allowed list.`);
      return;
    }
    setAllowedEmailDomains([...allowedEmailDomains, clean]);
    setDomainInput("");
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    setAllowedEmailDomains(allowedEmailDomains.filter((d) => d !== domainToRemove));
  };

  const handleSave = async () => {
    if (wouldBeLockedOut(allowPasswordLogin, allowMicrosoftSso, allowGoogleSso)) {
      toast.error("At least one authentication method must remain enabled to prevent workspace lockout.");
      return;
    }

    try {
      setSaving(true);
      await atsApi.auth.updateTenantAuthPolicy({
        allowPasswordLogin,
        allowMicrosoftSso,
        allowGoogleSso,
        enforceSsoOnly,
        allowedEmailDomains,
        microsoftTenantId: microsoftTenantId.trim() || null,
      });
      toast.success("Organization authentication and SSO policy saved successfully!");
    } catch (err: any) {
      toast.error("Failed to save policy: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = (allowPasswordLogin ? 1 : 0) + (allowMicrosoftSso ? 1 : 0) + (allowGoogleSso ? 1 : 0);

  return (
    <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
      <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            Authentication &amp; Single Sign-On (SSO) Policy
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500 mt-0.5">
            Configure allowed sign-in methods, enforce enterprise SSO, restrict corporate email domains, and lock Microsoft 365 directories.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadPolicy}
          disabled={loading}
          className="h-8 text-xs font-semibold px-2.5 flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {/* Lockout Warning Banner if only 1 method remains */}
        {enabledCount === 1 && (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Self-Lockout Protection Guard Active</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                Only one login method is currently active. The system will prevent turning it off until another sign-in method is enabled.
              </p>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Layout: Left = Sign-In Controls & Rules, Right = Live Login Screen Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (7 cols): Controls & Configuration */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* 1. Allowed Sign-in Methods Grid */}
            <div>
              <Label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-2.5 block">
                Allowed Sign-In Methods for Workspace Members
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Password Login */}
                <div className={`p-3 rounded-lg border transition-all ${allowPasswordLogin ? "border-indigo-300 bg-indigo-50/20 dark:border-indigo-800/60 dark:bg-indigo-950/10" : "border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-900/50 opacity-75"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Lock className="h-3 w-3" />
                      </div>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Password</span>
                    </div>
                    <Switch
                      checked={allowPasswordLogin}
                      onCheckedChange={handleTogglePassword}
                      disabled={loading || enforceSsoOnly}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Sign in with email and encrypted password.
                  </p>
                  {enforceSsoOnly && (
                    <span className="inline-block mt-2 text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/40">
                      Disabled by SSO
                    </span>
                  )}
                </div>

                {/* Microsoft SSO */}
                <div className={`p-3 rounded-lg border transition-all ${allowMicrosoftSso ? "border-blue-300 bg-blue-50/20 dark:border-blue-800/60 dark:bg-blue-950/10" : "border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-900/50 opacity-75"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <svg width="12" height="12" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                          <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                          <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                          <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                          <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Microsoft</span>
                    </div>
                    <Switch
                      checked={allowMicrosoftSso}
                      onCheckedChange={handleToggleMicrosoft}
                      disabled={loading}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Sign-in via Microsoft Entra ID (Office 365).
                  </p>
                </div>

                {/* Google SSO */}
                <div className={`p-3 rounded-lg border transition-all ${allowGoogleSso ? "border-emerald-300 bg-emerald-50/20 dark:border-emerald-800/60 dark:bg-emerald-950/10" : "border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-900/50 opacity-75"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Google</span>
                    </div>
                    <Switch
                      checked={allowGoogleSso}
                      onCheckedChange={handleToggleGoogle}
                      disabled={loading}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Sign-in via Google Workspace accounts.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Enforce SSO Only Switch */}
            <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-900/40 flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <Label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 cursor-pointer" htmlFor="enforce-sso-switch">
                    Enforce SSO Only (Disable Password Login)
                  </Label>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-indigo-300 text-indigo-700 bg-indigo-50">
                    ENTERPRISE
                  </Badge>
                </div>
                <p className="text-[11px] text-neutral-500">
                  When enabled, password-based login is completely disabled for this workspace. All users must authenticate via Google or Microsoft SSO.
                </p>
              </div>
              <Switch
                id="enforce-sso-switch"
                checked={enforceSsoOnly}
                onCheckedChange={handleToggleEnforceSso}
                disabled={loading}
              />
            </div>

            {/* 3. Corporate Email Domain Whitelist */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-indigo-600" />
                  Allowed Email Domains (Corporate Whitelist)
                </Label>
                <span className="text-[11px] text-neutral-400">
                  {allowedEmailDomains.length === 0 ? "Any domain allowed" : `${allowedEmailDomains.length} domain(s) restricted`}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Specify corporate email domains permitted to access this workspace (e.g. <code>deb.com</code>). Logins from outside domains (e.g. <code>enfycon.com</code>) will be blocked.
              </p>

              <form onSubmit={handleAddDomain} className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-mono">@</span>
                  <Input
                    type="text"
                    placeholder="e.g. deb.com or company.com"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ""))}
                    className="h-9 pl-7 text-xs font-mono"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={!domainInput.trim()}
                  className="h-9 px-3 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Domain
                </Button>
              </form>

              {/* Domain Tags Display */}
              <div className="flex flex-wrap gap-2 pt-1">
                {allowedEmailDomains.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 italic">
                    No domain restrictions configured. Any invited user can sign in.
                  </p>
                ) : (
                  allowedEmailDomains.map((domain) => (
                    <span
                      key={domain}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                    >
                      @{domain}
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(domain)}
                        className="hover:text-red-500 transition-colors cursor-pointer"
                        title={`Remove @${domain}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* 4. Microsoft Entra ID (Azure AD) Directory / Tenant ID Lock */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  Microsoft Azure AD Directory (Tenant) ID Lock
                </Label>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-blue-300 text-blue-700 bg-blue-50">
                  TENANT ISOLATION
                </Badge>
              </div>
              <p className="text-[11px] text-neutral-500">
                Enter your Microsoft 365 Azure Tenant ID GUID to restrict Microsoft SSO exclusively to your company's directory. Outside Microsoft organizations will be blocked.
              </p>
              <Input
                type="text"
                placeholder="e.g. 9188040d-6c67-4c5b-b112-36a304b66dad"
                value={microsoftTenantId}
                onChange={(e) => setMicrosoftTenantId(e.target.value.trim())}
                className="h-9 text-xs font-mono"
              />
              <p className="text-[10px] text-neutral-400 flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                Found in Azure Portal &gt; Microsoft Entra ID &gt; Overview &gt; Tenant ID.
              </p>
            </div>
          </div>

          {/* Right Column (5 cols): Live Interactive Employee Login Preview (Side by Side) */}
          <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-2">
            <div className="p-4 rounded-xl border border-neutral-250 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-900/50 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/60 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Live Employee Preview
                  </span>
                </div>
                <span className="text-[10px] font-mono text-primary font-semibold truncate max-w-[180px]" title={subdomain ? `${subdomain}.enfyjobs.com/auth/login` : "enfyjobs.com/auth/login"}>
                  {subdomain ? `${subdomain}.enfyjobs.com` : "enfyjobs.com"}
                </span>
              </div>

              {/* Login Card Preview */}
              <div className="w-full max-w-sm mx-auto p-4 bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="text-center pb-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{companyName || "Your Workspace"}</h4>
                  <p className="text-[10px] text-slate-400">Sign in to your account</p>
                </div>

                {/* Simulated Password Fields */}
                {allowPasswordLogin ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="h-2 w-14 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="h-7 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded flex items-center px-2 text-[10px] text-slate-400 font-mono">
                        user@{allowedEmailDomains[0] || "company.com"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="h-7 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded flex items-center px-2 text-[10px] text-slate-400">
                        ••••••••••••
                      </div>
                    </div>
                    <div className="h-7 w-full bg-indigo-600 rounded flex items-center justify-center text-[10px] font-semibold text-white">
                      Sign In to Workspace
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 rounded-lg text-center space-y-1">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 mx-auto" />
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Single Sign-On Enforced</p>
                    <p className="text-[10px] text-slate-500 leading-snug">Password login is disabled. Sign in via your corporate identity provider below.</p>
                  </div>
                )}

                {/* Simulated Social SSO buttons */}
                {(allowMicrosoftSso || allowGoogleSso) && (
                  <div className="space-y-2 pt-1">
                    {allowPasswordLogin && (
                      <div className="relative flex items-center justify-center my-1.5">
                        <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                        <span className="absolute bg-white dark:bg-slate-900 px-2 text-[9px] uppercase font-semibold text-slate-400">
                          Or Sign In With
                        </span>
                      </div>
                    )}
                    <div className={`grid gap-2 ${allowMicrosoftSso && allowGoogleSso ? "grid-cols-2" : "grid-cols-1"}`}>
                      {allowGoogleSso && (
                        <div className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800">
                          <svg width="12" height="12" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                          </svg>
                          Google
                        </div>
                      )}
                      {allowMicrosoftSso && (
                        <div className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800">
                          <svg width="12" height="12" viewBox="0 0 21 21">
                            <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                            <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                            <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                            <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                          </svg>
                          Microsoft
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center">
                Updates dynamically as you change sign-in methods on the left.
              </p>
            </div>
          </div>
        </div>

        {/* Save Bar Spanning Full Width */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-150 dark:border-slate-800">
          <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Active methods: <strong>{allowPasswordLogin ? "Password" : ""}{allowPasswordLogin && (allowMicrosoftSso || allowGoogleSso) ? " + " : ""}{allowMicrosoftSso ? "Microsoft" : ""}{allowMicrosoftSso && allowGoogleSso ? " + " : ""}{allowGoogleSso ? "Google" : ""}</strong>
          </div>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            size="sm"
            className="text-xs font-bold px-4 flex items-center gap-1.5 cursor-pointer bg-primary hover:bg-primary/90"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving Policy..." : "Save Authentication Policy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
