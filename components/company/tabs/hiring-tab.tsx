"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Users, Shield, Globe, ExternalLink } from "lucide-react";
import { ClientVisibilitySetting } from "../client-visibility-setting";

interface HiringTabProps {
  canManageClientVisibility?: boolean;
  candidatePoolMode: string;
  updatingPoolMode: boolean;
  handleUpdatePoolMode: (mode: string) => void;
  podSystemEnabled: boolean;
  togglingPodSystem: boolean;
  handleTogglePodSystem: (enabled: boolean) => void;
  jobCodePattern?: string;
  enforceJobCodePattern?: boolean;
  updatingJobCodePattern?: boolean;
  handleUpdateJobCodePattern?: (pattern: string, enforce: boolean) => void;
}

export function HiringTab({
  canManageClientVisibility = false,
  candidatePoolMode,
  updatingPoolMode,
  handleUpdatePoolMode,
  podSystemEnabled,
  togglingPodSystem,
  handleTogglePodSystem,
  jobCodePattern = '{BRANCH}-{UNIT}-{YYMMDD}-{SEQ}',
  enforceJobCodePattern = false,
  updatingJobCodePattern = false,
  handleUpdateJobCodePattern,
}: HiringTabProps) {
  
  const generatePreview = (pattern: string) => {
    if (!pattern) return "";
    let preview = pattern;
    preview = preview.replace(/{BRANCH}/g, "BLR");
    preview = preview.replace(/{UNIT}/g, "IT");
    
    const d = new Date();
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    
    preview = preview.replace(/{YYMMDD}/g, `${yy}${mm}${dd}`);
    preview = preview.replace(/{YYMM}/g, `${yy}${mm}`);
    preview = preview.replace(/{YY}/g, yy);
    preview = preview.replace(/{MM}/g, mm);
    preview = preview.replace(/{DD}/g, dd);
    
    preview = preview.replace(/{SEQ(?:[:](\d+))?}/g, (match, p1) => {
      const len = p1 ? parseInt(p1, 10) : 1;
      return "1".padStart(len, "0");
    });
    
    return preview;
  };

return (
    <div className="space-y-6">
      <ClientVisibilitySetting canManage={canManageClientVisibility} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* 1. Candidate Pool Mode Card */}
        <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900 flex flex-col">
          <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
            <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Candidate CV Pool &amp; Sharing Control
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500 mt-0.5">
              Control how candidate profiles and resume searches are partitioned across branches and market teams.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 flex-1">
            <div
              onClick={() => handleUpdatePoolMode("COMBINED_MARKET")}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                candidatePoolMode === "COMBINED_MARKET"
                  ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs"
                  : "border-neutral-200 dark:border-slate-800 hover:bg-neutral-50/50"
              }`}
            >
              <input
                type="radio"
                name="candidatePoolMode"
                checked={candidatePoolMode === "COMBINED_MARKET"}
                onChange={() => handleUpdatePoolMode("COMBINED_MARKET")}
                disabled={updatingPoolMode}
                className="mt-0.5 text-emerald-600"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">
                    Combined Market Pools (Recommended Default)
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30">
                    DEFAULT
                  </Badge>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  All Domestic branches (India) share the Domestic CV pool (market = INDIA). All USIT branches share the USIT CV pool (market = US). Requisition operations remain isolated by branch.
                </p>
              </div>
            </div>

            <div
              onClick={() => handleUpdatePoolMode("STRICT_ISOLATION")}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                candidatePoolMode === "STRICT_ISOLATION"
                  ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs"
                  : "border-neutral-200 dark:border-slate-800 hover:bg-neutral-50/50"
              }`}
            >
              <input
                type="radio"
                name="candidatePoolMode"
                checked={candidatePoolMode === "STRICT_ISOLATION"}
                onChange={() => handleUpdatePoolMode("STRICT_ISOLATION")}
                disabled={updatingPoolMode}
                className="mt-0.5 text-emerald-600"
              />
              <div>
                <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">
                  Strict Branch Isolation
                </span>
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  Recruiters can only search and view candidate CVs uploaded within or assigned to their home branch. Cross-branch CV discovery is blocked.
                </p>
              </div>
            </div>

            <div
              onClick={() => handleUpdatePoolMode("OPEN_WORKSPACE")}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                candidatePoolMode === "OPEN_WORKSPACE"
                  ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs"
                  : "border-neutral-200 dark:border-slate-800 hover:bg-neutral-50/50"
              }`}
            >
              <input
                type="radio"
                name="candidatePoolMode"
                checked={candidatePoolMode === "OPEN_WORKSPACE"}
                onChange={() => handleUpdatePoolMode("OPEN_WORKSPACE")}
                disabled={updatingPoolMode}
                className="mt-0.5 text-emerald-600"
              />
              <div>
                <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150">
                  Open Workspace Sharing
                </span>
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  All recruiters across all branches and markets can search, view, and source from all candidate CVs across the entire company tenant.
                </p>
              </div>
            </div>
        </CardContent>
      </Card>

              </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Job Code Pattern Settings Card */}
      <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900 flex flex-col">
        <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Global Job Code Standardization
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500 mt-0.5">
              Define a uniform pattern for requisition IDs, and optionally enforce it company-wide.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Tenant-Wide Job Code Pattern</label>
            <input 
              type="text" 
              value={jobCodePattern}
              onChange={(e) => handleUpdateJobCodePattern?.(e.target.value, enforceJobCodePattern)}
              disabled={updatingJobCodePattern}
              className="w-full h-9 bg-neutral-100 dark:bg-slate-800 border-neutral-200 dark:border-slate-700 border px-3 rounded-lg text-sm outline-none focus:border-indigo-500 font-mono font-bold"
              placeholder="{BRANCH}-{UNIT}-{YYMMDD}-{SEQ}"
            />
            <div className="flex flex-col gap-2 mt-2">
                <span className="text-[10px] text-neutral-500 block">
                  Tokens: <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{BRANCH}"}</code>, <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{UNIT}"}</code>, <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{YYMMDD}"}</code>, <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{YYMM}"}</code>, <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{YY}"}</code>, <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{MM}"}</code>, <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{DD}"}</code>, <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{SEQ:4}"}</code>
                </span>
                
                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded p-2 text-xs flex items-center gap-2">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-400">Live Preview:</span>
                  <span className="font-mono font-bold text-indigo-900 dark:text-indigo-300">{generatePreview(jobCodePattern)}</span>
                </div>
              </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-800/20">
            <div className="pr-4">
              <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150 block mb-0.5">
                Enforce Uniform Pattern
              </span>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                If enabled, branch managers and unit admins cannot set custom overrides. All requisitions across the company will strictly follow this format.
              </p>
            </div>
            <Switch
              checked={enforceJobCodePattern}
              onCheckedChange={(checked) => handleUpdateJobCodePattern?.(jobCodePattern, checked)}
              disabled={updatingJobCodePattern}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Pod System Settings Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Recruitment Pod Delivery System
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500 mt-0.5">
                  Enable or disable round-robin delivery team pod routing for requisitions across your organization.
                </CardDescription>
              </div>
              <Switch
                checked={podSystemEnabled}
                onCheckedChange={handleTogglePodSystem}
                disabled={togglingPodSystem}
              />
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${podSystemEnabled ? "bg-emerald-500 ring-4 ring-emerald-500/20" : "bg-neutral-400"}`} />
                <span>
                  Status: <strong>{podSystemEnabled ? "Pods Enabled (Multi-Pod Routing Active)" : "Pods Disabled (Universal Recruiter Mode Active)"}</strong>
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                When enabled, Account Managers route requisitions directly to specialized Delivery Pods (e.g. Java Pod, Cloud Pod), and Pod Leads distribute requirements among their team members.
              </p>
            </CardContent>
          </Card>

          {/* Branch-Isolated Job Assignment Notice Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  Branch Job Assignment Policies
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500 mt-0.5">
                  Configure assignment rules (Direct Recruiter, Pod Auto-dispatch, All Branch) individually per branch.
                </CardDescription>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => { window.location.href = "/settings/branch"; }}
                className="h-8 text-xs font-bold px-3 gap-1 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                Manage Policies →
              </Button>
            </CardHeader>
          </Card>

          {/* Global Remarks Templates Card */}
          <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-indigo-600" />
                  Global Stage Remarks Templates
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500 mt-0.5">
                  Universal quick-pick response templates for candidate stage moves, interviews, offers, and rejections.
                </CardDescription>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => { window.location.href = "/utility/global-remarks"; }}
                className="h-8 text-xs font-bold px-3 gap-1 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                Manage Templates →
              </Button>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
