"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { atsApi } from "@/lib/ats-api";
import { SmtpConfigModal } from "@/components/email/smtp-config-modal";
import {
  Mail,
  Server,
  Globe,
  CheckCircle2,
  Copy,
  Send,
  Plus,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import toast from "react-hot-toast";

interface EmailDispatchCardProps {
  tenantId?: string;
  subdomain: string;
  companyName: string;
  userEmail?: string;
}

export function EmailDispatchCard({ tenantId, subdomain, companyName, userEmail }: EmailDispatchCardProps) {
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(false);
  const [dispatchMode, setDispatchMode] = useState<'DEFAULT_SUBDOMAIN' | 'DIRECT_ACCOUNT' | 'CUSTOM_DOMAIN'>('DEFAULT_SUBDOMAIN');
  const [defaultSender, setDefaultSender] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [customDomainVerified, setCustomDomainVerified] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<any[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  
  // Custom Domain input state
  const [inputDomain, setInputDomain] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);

  // Test email state
  const [testEmail, setTestEmail] = useState(userEmail || "");
  const [sendingTest, setSendingTest] = useState(false);

  // SMTP Modal
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);

  useEffect(() => {
    if (userEmail && !testEmail) {
      setTestEmail(userEmail);
    }
  }, [userEmail]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await atsApi.email.getTenantEmailSettings();
      if (data) {
        setDispatchMode(data.dispatchMode || 'DEFAULT_SUBDOMAIN');
        setDefaultSender(data.defaultSubdomainSender || `no-reply@${subdomain}.enfyjobs.com`);
        setCustomDomain(data.customDomain || "");
        setInputDomain(data.customDomain || "");
        setCustomDomainVerified(!!data.customDomainVerified);
        setDnsRecords(data.dnsRecords || []);
        setConnectedAccounts(data.connectedAccounts || []);
      }
    } catch (err: any) {
      console.error("Failed to load tenant email settings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [subdomain]);

  const handleSelectMode = async (mode: 'DEFAULT_SUBDOMAIN' | 'DIRECT_ACCOUNT' | 'CUSTOM_DOMAIN') => {
    try {
      setSavingMode(true);
      await atsApi.email.setTenantEmailMode(mode);
      setDispatchMode(mode);
      toast.success(`Email strategy switched to ${mode.replace('_', ' ')}!`);
      loadSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to update email strategy.");
    } finally {
      setSavingMode(false);
    }
  };

  const handleSaveCustomDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputDomain.trim().toLowerCase();
    if (!clean) return toast.error("Please enter a domain name.");
    try {
      setSavingDomain(true);
      await atsApi.email.setTenantCustomDomain(clean);
      setCustomDomain(clean);
      toast.success(`Domain "${clean}" saved! Please configure the DNS records below.`);
      loadSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to save custom domain.");
    } finally {
      setSavingDomain(false);
    }
  };

  const handleVerifyDns = async () => {
    try {
      setVerifyingDomain(true);
      const res = await atsApi.email.verifyTenantCustomDomain();
      if (res.verified) {
        setCustomDomainVerified(true);
        toast.success("Domain DNS verified and DKIM active!");
      }
      loadSettings();
    } catch (err: any) {
      toast.error(err.message || "Verification check failed.");
    } finally {
      setVerifyingDomain(false);
    }
  };

  const handleSetDefaultAccount = async (id: string) => {
    try {
      await atsApi.email.setDefaultAccount(id);
      toast.success("Default sender account updated!");
      loadSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to set default account.");
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this email account?")) return;
    try {
      await atsApi.email.deleteAccount(id);
      toast.success("Account disconnected.");
      loadSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove account.");
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) return toast.error("Please enter a recipient email.");
    try {
      setSendingTest(true);
      const res = await atsApi.email.sendTestTenantEmail(testEmail.trim());
      if (res.success) {
        toast.success(`Test email dispatched via ${res.provider} to ${testEmail}!`);
      } else {
        toast("Test email dispatched (simulated delivery).", { icon: "ℹ️" });
      }
    } catch (err: any) {
      toast.error("Test email failed: " + (err.message || "Unknown error"));
    } finally {
      setSendingTest(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const connectMicrosoft = () => {
    const returnTo = typeof window !== "undefined" ? window.location.href : "";
    window.location.href = `/api/email/auth/microsoft?returnTo=${encodeURIComponent(returnTo)}&tenantId=${tenantId || ""}`;
  };

  return (
    <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-600" />
            Workspace Email &amp; Custom Domain Dispatch Strategy
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500 mt-0.5">
            Choose how invitations, credentials, password resets, and candidate communications are delivered.
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-indigo-300 text-indigo-700 dark:text-indigo-400 bg-indigo-50/50">
          Active: {dispatchMode.replace('_', ' ')}
        </Badge>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {/* Strategy Selector (3 Options) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Default Subdomain Strategy */}
          <div
            onClick={() => handleSelectMode('DEFAULT_SUBDOMAIN')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              dispatchMode === 'DEFAULT_SUBDOMAIN'
                ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs ring-2 ring-indigo-600/10"
                : "border-neutral-200 dark:border-slate-800 hover:border-neutral-300 dark:hover:border-slate-700 bg-neutral-50/30 dark:bg-slate-950/20"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Globe className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">
                    Platform Subdomain
                  </span>
                </div>
                {dispatchMode === 'DEFAULT_SUBDOMAIN' && (
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                )}
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Zero-config delivery. Automatically sends from your dedicated workspace subdomain.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-slate-800 text-[10px] font-mono text-indigo-700 dark:text-indigo-300 truncate">
              {defaultSender}
            </div>
          </div>

          {/* 2. Direct Mail Connection (BYOE) Strategy */}
          <div
            onClick={() => handleSelectMode('DIRECT_ACCOUNT')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              dispatchMode === 'DIRECT_ACCOUNT'
                ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs ring-2 ring-indigo-600/10"
                : "border-neutral-200 dark:border-slate-800 hover:border-neutral-300 dark:hover:border-slate-700 bg-neutral-50/30 dark:bg-slate-950/20"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Server className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">
                    Direct Mail (BYOE)
                  </span>
                </div>
                {dispatchMode === 'DIRECT_ACCOUNT' && (
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                )}
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Connect your corporate Microsoft 365 or SMTP server. Sends directly from your inbox with 100% deliverability.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-slate-800 text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              {connectedAccounts.length > 0 ? `${connectedAccounts.length} Connected Account(s)` : "No accounts connected"}
            </div>
          </div>

          {/* 3. White-Label Custom Domain Delegation */}
          <div
            onClick={() => handleSelectMode('CUSTOM_DOMAIN')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              dispatchMode === 'CUSTOM_DOMAIN'
                ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs ring-2 ring-indigo-600/10"
                : "border-neutral-200 dark:border-slate-800 hover:border-neutral-300 dark:hover:border-slate-700 bg-neutral-50/30 dark:bg-slate-950/20"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">
                    Custom Domain Delegation
                  </span>
                </div>
                {dispatchMode === 'CUSTOM_DOMAIN' && (
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                )}
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Authorize EnfySync via DKIM/SPF DNS records to send as <span className="font-mono">no-reply@yourdomain.com</span>.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-slate-800 text-[10px] text-purple-700 dark:text-purple-300 font-semibold truncate">
              {customDomain ? `Domain: ${customDomain}` : "Setup domain DNS"}
            </div>
          </div>
        </div>

        {/* Dynamic Detail Panel based on Active Strategy */}

        {/* ── DETAIL 1: Direct Mail Connection (BYOE) ──────────────── */}
        {dispatchMode === 'DIRECT_ACCOUNT' && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Server className="h-3.5 w-3.5 text-emerald-600" />
                  Connected Mailbox Accounts (BYOE)
                </h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Transactional emails will be sent directly through the designated primary mailbox.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={connectMicrosoft}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold flex items-center gap-1.5 border-neutral-300 dark:border-slate-700"
                >
                  <img src="https://authjs.dev/img/providers/microsoft.svg" className="h-3.5 w-3.5" alt="MS" />
                  Connect Microsoft 365
                </Button>
                <Button
                  onClick={() => setIsSmtpModalOpen(true)}
                  size="sm"
                  className="h-8 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Custom SMTP
                </Button>
              </div>
            </div>

            {connectedAccounts.length === 0 ? (
              <div className="p-6 border border-dashed border-neutral-300 dark:border-slate-800 rounded-lg text-center bg-white dark:bg-slate-900 text-xs text-neutral-500">
                No email accounts connected yet. Click <strong>"Connect Microsoft 365"</strong> or <strong>"Add Custom SMTP"</strong> above to link your company mailbox.
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-slate-800 border border-neutral-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
                {connectedAccounts.map((acc) => (
                  <div key={acc.id} className="p-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-slate-850 transition">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                        {acc.provider === 'microsoft' ? 'MS' : 'SMTP'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{acc.email}</span>
                          {acc.isDefault ? (
                            <Badge className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0">
                              DEFAULT SENDER
                            </Badge>
                          ) : (
                            <button
                              onClick={() => handleSetDefaultAccount(acc.id)}
                              className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                            >
                              Set as Default
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500">
                          {acc.profileName ? `${acc.profileName} • ` : ''}Provider: {acc.provider.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="h-7 w-7 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DETAIL 2: Custom Domain Delegation ───────────────────── */}
        {dispatchMode === 'CUSTOM_DOMAIN' && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <div>
              <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-purple-600" />
                Custom Domain DNS Authorization
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Add your custom root domain (e.g. <span className="font-mono">enfycon.com</span>) and publish the DKIM/SPF DNS records.
              </p>
            </div>

            <form onSubmit={handleSaveCustomDomain} className="flex gap-2 max-w-md">
              <Input
                type="text"
                placeholder="e.g. yourcompany.com"
                value={inputDomain}
                onChange={(e) => setInputDomain(e.target.value)}
                className="h-8 text-xs bg-white dark:bg-slate-900"
                required
              />
              <Button type="submit" size="sm" disabled={savingDomain} className="h-8 text-xs font-bold">
                {savingDomain ? "Saving..." : "Save Domain"}
              </Button>
            </form>

            {customDomain && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Required DNS Records for <strong className="font-mono text-purple-600">{customDomain}</strong>:
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleVerifyDns}
                    disabled={verifyingDomain}
                    className="h-7 text-xs font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${verifyingDomain ? "animate-spin" : ""}`} />
                    Verify DNS
                  </Button>
                </div>

                <div className="border border-neutral-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden divide-y divide-neutral-200 dark:divide-slate-800">
                  {dnsRecords.map((rec, idx) => (
                    <div key={idx} className="p-3 text-xs flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono font-bold px-1.5 py-0 bg-neutral-100 dark:bg-slate-800">
                            {rec.type}
                          </Badge>
                          <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">{rec.host}</span>
                        </div>
                        <p className="text-[11px] text-neutral-500 font-mono mt-1 break-all select-all">
                          {rec.value}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(rec.value, rec.purpose)}
                        className="h-7 px-2 text-xs flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Test Email Dispatcher */}
        <div className="pt-3 border-t border-neutral-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              Verify Live Email Dispatch
            </h4>
            <p className="text-[11px] text-neutral-500">
              Sends an automated test verification email using the currently selected strategy.
            </p>
          </div>
          <form onSubmit={handleSendTestEmail} className="flex items-center gap-2">
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="h-8 text-xs w-56 bg-white dark:bg-slate-900"
              required
            />
            <Button
              type="submit"
              size="sm"
              disabled={sendingTest}
              className="h-8 text-xs font-bold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Send className={`h-3 w-3 ${sendingTest ? "animate-spin" : ""}`} />
              {sendingTest ? "Sending..." : "Send Test Email"}
            </Button>
          </form>
        </div>
      </CardContent>

      <SmtpConfigModal
        isOpen={isSmtpModalOpen}
        onClose={() => setIsSmtpModalOpen(false)}
        onSave={() => {
          setIsSmtpModalOpen(false);
          loadSettings();
        }}
      />
    </Card>
  );
}
