"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { atsApi } from "@/lib/ats-api";
import { Globe, Building2, Trash2, Plus, ExternalLink, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { getBaseDomain } from "@/utils/subdomain-helper";

interface DomainMapping {
  id: string | number;
  domain_name: string;
  is_primary: boolean;
  created_at: string;
}

export default function CompanySettingsPage() {
  const [subdomain, setSubdomain] = useState("");
  const [originalSubdomain, setOriginalSubdomain] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [customDomains, setCustomDomains] = useState<DomainMapping[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSubdomain, setSavingSubdomain] = useState(false);
  const [addingDomain, setAddingDomain] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const user = atsApi.auth.getCurrentUser();
      if (user) {
        setCompanyName(user.companyName || "My Company Workspace");
      }
      
      const profile = await atsApi.auth.me();
      if (profile && profile.tenant) {
        setCompanyName(profile.tenant.name || "");
        setSubdomain(profile.tenant.domain || "");
        setOriginalSubdomain(profile.tenant.domain || "");
      }
      
      // Load custom domains
      const domains = await atsApi.auth.listMyDomains();
      setCustomDomains(domains || []);
    } catch (err: any) {
      toast.error("Failed to load workspace settings: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSubdomain = async () => {
    const slug = subdomain.toLowerCase().trim();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return toast.error("Subdomain must contain only lowercase letters, numbers, and hyphens.");
    }
    if (slug === originalSubdomain) {
      return toast.success("Subdomain is already up to date.");
    }

    try {
      setSavingSubdomain(true);
      await atsApi.auth.updateMySubdomain(slug);
      toast.success("Workspace subdomain updated successfully!");
      
      // Redirect to the new subdomain
      const base = getBaseDomain();
      const protocol = window.location.protocol;
      window.location.href = `${protocol}//${slug}.${base}/company`;
    } catch (err: any) {
      toast.error("Failed to update subdomain: " + err.message);
    } finally {
      setSavingSubdomain(false);
    }
  };

  const handleAddDomain = async () => {
    const domain = newDomain.toLowerCase().trim();
    if (!domain || !/^[a-z0-9.-]+$/.test(domain) || domain.includes("..")) {
      return toast.error("Please enter a valid domain name (e.g. jobs.mycompany.com).");
    }

    try {
      setAddingDomain(true);
      const res = await atsApi.auth.addMyDomain(domain);
      setCustomDomains((prev) => [...prev, res]);
      setNewDomain("");
      toast.success(`Custom domain ${domain} mapped successfully!`);
    } catch (err: any) {
      toast.error("Failed to map custom domain: " + err.message);
    } finally {
      setAddingDomain(false);
    }
  };

  const handleDeleteDomain = async (domainId: string | number, domainName: string) => {
    if (!confirm(`Are you sure you want to remove the domain mapping for ${domainName}?`)) {
      return;
    }

    try {
      await atsApi.auth.deleteMyDomain(String(domainId));
      setCustomDomains((prev) => prev.filter((d) => d.id !== domainId));
      toast.success("Domain mapping removed.");
    } catch (err: any) {
      toast.error("Failed to remove domain: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-neutral-100 dark:bg-[#1e2734]">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">Company Settings</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded shadow-sm">
          <RefreshCw className="animate-spin h-8 w-8 text-primary mb-3" />
          <p className="text-sm text-neutral-500">Loading workspace settings...</p>
        </div>
      </div>
    );
  }

  const base = getBaseDomain();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-100 dark:bg-[#1e2734]">
      <SiteBreadcrumb />
      
      {/* Page Title */}
      <div className="mb-4 mt-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Workspace &amp; Company Settings
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">Manage your tenant subdomain, workspace brand identity, and custom domains.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Subdomain & Branding */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subdomain settings card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
              <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Workspace Subdomain</CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Your default access link. You can customize the subdomain slug.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subdomain-slug" className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Subdomain Slug
                </Label>
                <div className="flex items-center">
                  <Input
                    id="subdomain-slug"
                    type="text"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    disabled={savingSubdomain}
                    className="rounded-r-none font-semibold text-xs h-9 bg-neutral-50 dark:bg-slate-950/20 border-r-0 focus:ring-0 focus:border-neutral-300 dark:focus:border-slate-700"
                    placeholder="company-name"
                  />
                  <div className="h-9 px-3 border border-neutral-250 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800 flex items-center text-xs font-bold text-neutral-500 dark:text-neutral-400 rounded-r border-l-0">
                    .{base.replace(":3000", "")}
                  </div>
                </div>
                <p className="text-[10px] text-neutral-500">
                  Warning: Changing this slug will modify the URL you and your recruiters use to log in.
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-150 dark:border-slate-800/40 flex justify-between items-center">
                <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                  Current workspace URL: 
                  <a 
                    href={`${window.location.protocol}//${originalSubdomain}.${base}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center gap-0.5"
                  >
                    {originalSubdomain}.{base}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Button 
                  onClick={handleSaveSubdomain} 
                  disabled={savingSubdomain || subdomain === originalSubdomain}
                  className="h-8 text-xs font-bold px-4"
                >
                  {savingSubdomain ? "Saving..." : "Update Subdomain"}
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Custom Domains settings card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
              <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Custom Domains</CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Point your own custom domain (e.g. `careers.mycompany.com`) directly to this ATS workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              
              {/* Add Custom Domain Form */}
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    disabled={addingDomain}
                    placeholder="e.g. careers.mycompany.com"
                    className="font-semibold text-xs h-9 bg-neutral-50 dark:bg-slate-950/20"
                  />
                </div>
                <Button
                  onClick={handleAddDomain}
                  disabled={addingDomain || !newDomain.trim()}
                  className="h-9 text-xs font-bold px-4 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Map Domain
                </Button>
              </div>

              {/* Mapped Domains List */}
              <div className="pt-2">
                <Label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-2">
                  Mapped Domains ({customDomains.length})
                </Label>
                {customDomains.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-neutral-250 dark:border-slate-800 rounded bg-neutral-50/50 dark:bg-slate-950/5 text-xs text-neutral-500 font-medium">
                    No custom domains linked yet. Type your custom domain above to map it.
                  </div>
                ) : (
                  <div className="border border-neutral-200 dark:border-slate-800/80 rounded divide-y divide-neutral-200 dark:divide-slate-800 bg-neutral-50/20 dark:bg-slate-950/5">
                    {customDomains.map((domain) => (
                      <div key={domain.id} className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-neutral-500" />
                          <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">
                            {domain.domain_name}
                          </span>
                          {domain.is_primary ? (
                            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-400 text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-emerald-200/50">
                              Primary Subdomain
                            </span>
                          ) : (
                            <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/25 dark:text-blue-400 text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-blue-200/50">
                              Custom Alias
                            </span>
                          )}
                        </div>

                        {!domain.is_primary && (
                          <button
                            onClick={() => handleDeleteDomain(domain.id, domain.domain_name)}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                            title="Delete Mapping"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: DNS Setup Instructions Info Card */}
        <div className="space-y-6">
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900 h-full">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
              <CardTitle className="text-sm font-bold text-neutral-850 dark:text-neutral-150 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-indigo-500" /> DNS Instructions
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                How to configure your domain mapping correctly.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
                To link a custom domain to your workspace, you must configure your domain's DNS settings at your registrar (e.g. Cloudflare, GoDaddy, Namecheap).
              </p>

              <div className="space-y-3 bg-neutral-50 dark:bg-slate-950/20 p-3 rounded border border-neutral-200 dark:border-slate-800/60 text-xs">
                <div>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 block mb-0.5">Option A: CNAME Record (Recommended)</span>
                  <p className="text-neutral-500 text-[11px] mb-1.5">For subdomains like <code className="bg-neutral-200 dark:bg-slate-800 px-1 py-0.2 rounded font-semibold text-[10px]">jobs.yourcompany.com</code></p>
                  <table className="w-full text-left font-sans text-[10px]">
                    <thead>
                      <tr className="border-b border-neutral-350 text-neutral-600 dark:text-neutral-400">
                        <th className="pb-1 font-bold">Type</th>
                        <th className="pb-1 font-bold">Host</th>
                        <th className="pb-1 font-bold">Points To</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-neutral-850 dark:text-neutral-200 font-semibold">
                        <td className="py-1">CNAME</td>
                        <td className="py-1">jobs</td>
                        <td className="py-1">enfycon.com</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-neutral-200 dark:border-slate-800/60">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 block mb-0.5">Option B: A Record</span>
                  <p className="text-neutral-500 text-[11px] mb-1.5">For root domains like <code className="bg-neutral-200 dark:bg-slate-800 px-1 py-0.2 rounded font-semibold text-[10px]">yourcompany.com</code></p>
                  <table className="w-full text-left font-sans text-[10px]">
                    <thead>
                      <tr className="border-b border-neutral-350 text-neutral-600 dark:text-neutral-400">
                        <th className="pb-1 font-bold">Type</th>
                        <th className="pb-1 font-bold">Host</th>
                        <th className="pb-1 font-bold">Points To</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-neutral-850 dark:text-neutral-200 font-semibold">
                        <td className="py-1">A</td>
                        <td className="py-1">@</td>
                        <td className="py-1">192.0.2.1 <span className="font-normal text-[9px] text-neutral-400">(Your Server IP)</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-950/15 border border-blue-200/30 dark:border-blue-900/30 p-2.5 rounded text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed font-medium">
                Note: DNS changes can take anywhere from a few minutes up to 24 hours to propagate worldwide. Once active, visitors accessing the custom domain will load this workspace instantly.
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
