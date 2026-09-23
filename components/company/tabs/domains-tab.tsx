"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe, Trash2, ShieldCheck, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

export interface DomainMapping {
  id: string | number;
  domain_name: string;
  is_primary: boolean;
  verification_token?: string;
  verification_status?: string;
  ssl_status?: string;
  verified_at?: string;
  created_at: string;
}

interface DomainsTabProps {
  customDomains: DomainMapping[];
  subdomain: string;
  newDomain: string;
  setNewDomain: (v: string) => void;
  addingDomain: boolean;
  handleAddDomain: (e: React.FormEvent) => void;
  handleDeleteDomain: (id: string | number) => void;
  handleVerifyDomain: (domainName: string) => void;
  verifyingDomain: string | null;
  base: string;
}

export function DomainsTab({
  customDomains,
  subdomain,
  newDomain,
  setNewDomain,
  addingDomain,
  handleAddDomain,
  handleDeleteDomain,
  handleVerifyDomain,
  verifyingDomain,
  base,
}: DomainsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Columns: Custom Domains Management */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
            <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Custom Domain Mappings
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500 mt-0.5">
              Point your branded domain (e.g. <code className="text-primary">careers.mycompany.com</code> or <code className="text-primary">jobs.mycompany.com</code>) directly to your recruitment workspace with automatic SSL provisioning.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <form onSubmit={handleAddDomain} className="space-y-2">
              <div className="flex gap-2 max-w-xl">
                <Input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value.toLowerCase().trim())}
                  placeholder="e.g. careers.mycompany.com"
                  className="h-9 text-xs bg-white dark:bg-slate-900 flex-1 font-mono"
                />
                <Button
                  type="submit"
                  disabled={addingDomain || !newDomain.trim()}
                  size="sm"
                  className="h-9 text-xs font-bold px-4 cursor-pointer"
                >
                  {addingDomain ? "Adding..." : "+ Map Custom Domain"}
                </Button>
              </div>
            </form>

            <div className="space-y-3 pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Configured Domains ({customDomains.length + (subdomain ? 1 : 0)})
              </p>

              {subdomain && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/70 dark:bg-slate-950/20 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Globe className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200 truncate">
                      {subdomain}.{base}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 flex-shrink-0">
                      Primary Workspace Subdomain
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/30">
                    🔒 SSL Active
                  </Badge>
                </div>
              )}

              {customDomains.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-neutral-250 dark:border-slate-800 rounded bg-neutral-50/50 dark:bg-slate-950/5 text-xs text-neutral-500 font-medium">
                  No custom external domains mapped yet. Add a domain above to connect your enterprise portal.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {customDomains.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-col gap-2.5 p-3 rounded-lg border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <Globe className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                          <span className="font-mono font-bold text-neutral-850 dark:text-neutral-150 truncate">
                            {d.domain_name}
                          </span>
                          {d.is_primary && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-700 bg-emerald-50 flex-shrink-0">
                              Primary
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 font-medium ${
                              d.verification_status === "VERIFIED"
                                ? "border-emerald-300 text-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40"
                                : "border-amber-300 text-amber-700 bg-amber-50/70 dark:bg-amber-950/40"
                            }`}
                          >
                            {d.verification_status === "VERIFIED" ? "✓ Verified" : "⏳ Pending DNS"}
                          </Badge>
                          {d.ssl_status === "ACTIVE" && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-blue-300 text-blue-700 bg-blue-50/70 dark:bg-blue-950/40">
                              🔒 SSL Active
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {d.verification_status !== "VERIFIED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={verifyingDomain === d.domain_name}
                              onClick={() => handleVerifyDomain(d.domain_name)}
                              className="h-7 px-2.5 text-xs font-bold cursor-pointer"
                            >
                              {verifyingDomain === d.domain_name ? "Checking..." : "Verify DNS"}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDomain(d.id)}
                            className="h-7 w-7 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {d.verification_status !== "VERIFIED" && d.verification_token && (
                        <div className="text-[11px] bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded border border-slate-200/80 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-400 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">DNS Verification TXT Record:</span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-sans">
                              <AlertTriangle className="h-3 w-3" /> Add this to your DNS host
                            </span>
                          </div>
                          <div className="select-all text-indigo-600 dark:text-indigo-400 font-bold break-all bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                            {d.verification_token}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: DNS Setup Instructions & Security Audit */}
      <div className="space-y-6">
        {/* DNS Instructions Card */}
        <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
          <CardHeader className="pb-2 border-b border-neutral-150 dark:border-slate-800/60">
            <CardTitle className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-primary" />
              DNS Configuration Guide
            </CardTitle>
            <CardDescription className="text-[11px] text-neutral-500">
              Configure DNS records at your domain registrar (Cloudflare, GoDaddy, Route53, Namecheap).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3 text-[11px] text-neutral-600 dark:text-neutral-400 space-y-3 leading-relaxed">
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-slate-950/40 border border-neutral-200 dark:border-slate-800 font-mono text-[10.5px] space-y-1.5">
              <div className="font-bold text-neutral-800 dark:text-neutral-200">Option A: CNAME Record (Recommended)</div>
              <div className="text-neutral-500 text-[10px]">For subdomains like <code className="text-primary font-bold">careers.yourcompany.com</code></div>
              <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-neutral-200 dark:border-slate-800 text-neutral-800 dark:text-neutral-200">
                <span className="text-neutral-400 font-sans">Type</span>
                <span className="text-neutral-400 font-sans">Host</span>
                <span className="text-neutral-400 font-sans">Target</span>
                <span className="font-bold">CNAME</span>
                <span className="font-bold">careers</span>
                <span className="text-primary font-bold">{base}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-slate-950/40 border border-neutral-200 dark:border-slate-800 font-mono text-[10.5px] space-y-1.5">
              <div className="font-bold text-neutral-800 dark:text-neutral-200">Option B: A Record</div>
              <div className="text-neutral-500 text-[10px]">For apex / root domains like <code className="text-primary font-bold">yourcompany.com</code></div>
              <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-neutral-200 dark:border-slate-800 text-neutral-800 dark:text-neutral-200">
                <span className="text-neutral-400 font-sans">Type</span>
                <span className="text-neutral-400 font-sans">Host</span>
                <span className="text-neutral-400 font-sans">Points To</span>
                <span className="font-bold">A</span>
                <span className="font-bold">@</span>
                <span className="text-primary font-bold">192.0.2.1</span>
              </div>
            </div>

            <p className="text-[10px] text-neutral-400 italic">
              Note: DNS propagation typically completes within 5–15 minutes, but can take up to 24 hours depending on TTL settings.
            </p>
          </CardContent>
        </Card>

        {/* Security & Audit Trail Card */}
        <Card className="border border-indigo-200 dark:border-indigo-900/50 shadow-xs bg-indigo-50/20 dark:bg-slate-900">
          <CardHeader className="pb-2 border-b border-indigo-100 dark:border-slate-800">
            <CardTitle className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              Security &amp; Domain Audit Trail
            </CardTitle>
            <CardDescription className="text-[11px] text-neutral-500">
              Audit logs of all domain additions, verification events, and SSL renewals.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3 flex items-center justify-between">
            <div className="text-[11px] text-neutral-600 dark:text-slate-400">
              SOC2-compliant event stream.
            </div>
            <Button
              size="sm"
              onClick={() => { window.location.href = "/utility/audit-logs"; }}
              className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 cursor-pointer"
            >
              View Audit Logs →
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
