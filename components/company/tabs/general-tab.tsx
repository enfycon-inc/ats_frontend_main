import React, { useRef, useState } from "react";
import { CompanyLogoImage } from "@/components/shared/company-logo-image";
import { Globe, Building2, Image as ImageIcon, ArrowRight, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface GeneralTabProps {
  companyProfileFeedback: { message: string; error: boolean } | null;
  companyName: string;
  setCompanyName: (val: string) => void;
  siteTitle: string;
  setSiteTitle: (val: string) => void;
  logoUrl: string;
  setLogoUrl: (val: string) => void;
  compactLogoUrl: string;
  setCompactLogoUrl: (val: string) => void;
  loginLogoUrl: string;
  setLoginLogoUrl: (val: string) => void;
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
  companyProfileFeedback,
  companyName,
  setCompanyName,
  siteTitle,
  setSiteTitle,
  logoUrl,
  setLogoUrl,
  compactLogoUrl,
  setCompactLogoUrl,
  loginLogoUrl,
  setLoginLogoUrl,
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
            Manage your company name and separate logos for expanded navigation, compact navigation, and the sign-in page.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">
          
          <div className="space-y-5">
            {/* Form Fields */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Company Name</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Enfycon Inc."
                    className="h-9 mt-1.5 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Browser Site Title</Label>
                  <Input
                    value={siteTitle}
                    onChange={(e) => setSiteTitle(e.target.value)}
                    placeholder="e.g. Recruitment workspace"
                    className="h-9 mt-1.5 text-xs"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">This appears on browser tabs and search engines.</p>
                </div>
              </div>

            <div className="grid w-full gap-5 md:grid-cols-3">
              <LogoUpload label="Site Logo" value={logoUrl} onChange={setLogoUrl} />
              <LogoUpload label="Compact Navigation Logo" value={compactLogoUrl} onChange={setCompactLogoUrl} compact />
              <LogoUpload label="Login Page Logo" value={loginLogoUrl} onChange={setLoginLogoUrl} login />
            </div>

              {companyProfileFeedback && <p role={companyProfileFeedback.error ? "alert" : "status"} className={`text-xs ${companyProfileFeedback.error ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>{companyProfileFeedback.message}</p>}
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

function LogoUpload({ label, value, onChange, login = false, compact = false }: {
  label: string; value: string; onChange: (value: string) => void; login?: boolean; compact?: boolean;
}) {
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  return <div className="min-w-0 space-y-2">
    <Label className="text-xs font-semibold">{label}</Label>
    <p className="text-xs text-neutral-500">{compact ? 'Used when navigation is collapsed.' : login ? 'Used on the sign-in page.' : 'Used in the application header.'}</p>
    <div className={`flex h-20 items-center overflow-hidden rounded-lg border px-3 ${login ? 'bg-white text-blue-900' : 'bg-[#1a4fa0] text-white'}`}>
      {value ? <CompanyLogoImage key={value} src={value} alt={`${label} preview`} onDimensions={setSize} className={compact ? "h-10 w-10 mx-auto" : "h-12 w-full"} /> : <span className="flex items-center gap-2 text-xs"><ImageIcon className="h-4 w-4" />No logo selected</span>}
    </div>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/gif,image/webp" aria-label={`Choose ${label.toLowerCase()}`} className="hidden" onChange={event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      setError("");
      if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type) || file.size > 200 * 1024) {
        setError('Choose a PNG, JPEG, GIF, or WebP image up to 200 KB.'); return;
      }
      const reader = new FileReader();
      reader.onload = () => { setSize(null); onChange(reader.result as string); };
      reader.onerror = () => setError('Could not read the logo. Please try again.');
      reader.readAsDataURL(file);
    }} />
    {error && <p role="alert" className="text-xs text-red-700 dark:text-red-400">{error}</p>}
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" aria-label={`Change ${label.toLowerCase()}`} onClick={() => input.current?.click()}>Change logo</Button>
      <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${label.toLowerCase()}`} disabled={!value} onClick={() => { setError(''); setSize(null); onChange(''); }}>Remove</Button>
    </div>
    <p className="text-[11px] text-neutral-500">{compact ? 'Recommended: square icon, 128 × 128 px. Company initials appear if no logo is set.' : login ? 'Recommended: within 360 × 96 px.' : 'Recommended: 480 × 96 px.'} Keep the original proportions and use a transparent background.</p>
    <p className="text-[11px] text-neutral-500">PNG, JPEG, static GIF or WebP · Maximum 200 KB. Optimized automatically.</p>
    {value && size && <p className="text-[11px] text-neutral-500">Current image: {size.width} × {size.height} px</p>}
  </div>;
}
