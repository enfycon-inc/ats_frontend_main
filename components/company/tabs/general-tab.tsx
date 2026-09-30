import React, { useRef, useState } from "react";
import { CompanyLogoImage } from "@/components/shared/company-logo-image";
import toast from "react-hot-toast";
import { Globe, Building2, Image as ImageIcon, ArrowRight, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface GeneralTabProps {
  companyName: string;
  setCompanyName: (val: string) => void;
  siteTitle: string;
  setSiteTitle: (val: string) => void;
  logoUrl: string;
  setLogoUrl: (val: string) => void;
  handleSaveCompanyProfile: () => void;
  savingCompanyProfile: boolean;
  subdomain: string;
  setSubdomain: (val: string) => void;
  originalSubdomain: string;
  savingSubdomain: boolean;
  handleSaveSubdomain: (e: React.FormEvent) => void;
  isSuperAdmin: boolean;
  base: string;
}

export function GeneralTab({
  companyName,
  setCompanyName,
  siteTitle,
  setSiteTitle,
  logoUrl,
  setLogoUrl,
  handleSaveCompanyProfile,
  savingCompanyProfile,
  subdomain,
  setSubdomain,
  originalSubdomain,
  savingSubdomain,
  handleSaveSubdomain,
  isSuperAdmin,
  base,
}: GeneralTabProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [logoSize, setLogoSize] = useState<{ width: number; height: number } | null>(null);

  return (
    <div className="space-y-6">
      
      {/* 1. Company Identity Card */}
      <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
          <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600" />
            Company Identity & Branding
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500 mt-0.5">
            Manage your company's global display name, official logo, and primary brand assets.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Logo Upload Area */}
            <div className="w-full sm:w-64 flex-shrink-0">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-2">Company Logo</Label>
              <div>
                <input 
                  ref={fileInputRef}
                  id="logo-upload"
                  type="file" 
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="hidden" onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
                        toast.error('Choose a PNG, JPEG, GIF, or WebP image up to 2 MB.');
                        e.target.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        setLogoSize(null);
                        setLogoUrl(reader.result as string);
                      };
                      reader.onerror = () => toast.error('Could not read the logo image. Please try again.');
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload or replace company logo" aria-describedby="company-logo-guide"
                  className="w-full h-[60px] rounded-lg border border-blue-800 bg-[#1a4fa0] dark:bg-[#0f2d6b] px-2.5 flex items-center justify-start overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                {logoUrl ? (
                  <CompanyLogoImage src={logoUrl} alt="Company logo header preview" onDimensions={setLogoSize}
                    className="h-[34px] w-auto max-w-[240px]" />
                ) : (
                  <span className="flex items-center gap-2 text-xs text-white"><ImageIcon className="h-5 w-5" />Upload logo</span>
                )}
                </button>
                <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">Header preview · Click to change</p>
                <div id="company-logo-guide" className="mt-2 space-y-1 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  <p className="font-semibold text-neutral-700 dark:text-neutral-200">Recommended: 480 × 96 px (5:1)</p>
                  <p>Use a tightly cropped logo with a transparent background. Light lettering works best on the blue header.</p>
                  <p>PNG or WebP recommended. JPEG and GIF accepted. Maximum 2 MB.</p>
                  {logoUrl && logoSize && <p>Current image: {logoSize.width} × {logoSize.height} px</p>}
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Company Name</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Enfycon Inc."
                    className="h-9 mt-1.5 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Browser Site Title</Label>
                  <Input
                    value={siteTitle}
                    onChange={(e) => setSiteTitle(e.target.value)}
                    placeholder="e.g. Enfycon ATS"
                    className="h-9 mt-1.5 text-sm"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">This appears on browser tabs and search engines.</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  size="sm" 
                  onClick={handleSaveCompanyProfile}
                  disabled={savingCompanyProfile}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {savingCompanyProfile ? "Saving..." : "Save Company Profile"}
                </Button>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* 2. Workspace Subdomain Card */}
      <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-600" />
                Workspace Subdomain &amp; Access URL
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500 mt-0.5">
                Your company workspace access address. Subdomain changes are restricted to authorized administrators.
              </CardDescription>
            </div>
            {originalSubdomain && (
              <Badge variant="outline" className="text-xs font-mono border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1">
                {originalSubdomain}.{base}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <form onSubmit={handleSaveSubdomain} className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Subdomain Slug</Label>
              <div className="flex items-center mt-1.5 max-w-md">
                <Input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="e.g. acme"
                  className="h-9 text-xs font-semibold rounded-r-none border-r-0 bg-white dark:bg-slate-900 font-mono"
                  disabled={!isSuperAdmin}
                />
                <div className="h-9 px-3 flex items-center justify-center bg-neutral-100 dark:bg-slate-800 border border-neutral-250 dark:border-slate-700 rounded-r text-xs text-neutral-600 dark:text-neutral-400 font-mono select-none">
                  .{base}
                </div>
              </div>
              {!isSuperAdmin && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                  <span>🔒 Subdomain slug updates require Enfycon Platform Administrator authorization.</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-neutral-500">
                Live URL: <span className="font-mono text-emerald-600 dark:text-emerald-500 font-bold">{originalSubdomain ? `https://${originalSubdomain}.${base}` : "Loading..."}</span>
              </div>
              {isSuperAdmin && (
                <Button
                  type="submit"
                  disabled={savingSubdomain || subdomain === originalSubdomain || !subdomain.trim()}
                  size="sm"
                  className="text-xs font-bold"
                >
                  {savingSubdomain ? "Updating..." : "Update Subdomain"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 3. Branch & Units Redirect Card */}
      <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-indigo-50/50 dark:bg-indigo-950/10">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              Manage Branches & Operating Units
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              Physical office locations, shift timings, and operating unit divisions have been moved to their own dedicated workspace console.
            </p>
          </div>
          <Button 
            onClick={() => { window.location.href = "/management/branch"; }}
            className="flex-shrink-0 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-slate-700 font-bold shadow-sm"
          >
            Go to Branch & Units <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
