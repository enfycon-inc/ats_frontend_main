"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Building2,
  Globe,
  Plus,
  Trash2,
  ShieldCheck,
  Clock,
  Briefcase,
  Users,
  ChevronRight,
  Sun,
  Moon,
  Check,
} from "lucide-react";

export interface BusinessUnitItem {
  id: string;
  name: string;
  code: string | null;
  branchId?: string | null;
  branchName?: string | null;
  market: string;
  currency: string;
  shiftTiming?: string | null;
  workStartTime?: string | null;
  workEndTime?: string | null;
  timezone?: string | null;
  usersCount: number;
  jobsCount: number;
  createdAt: string;
}

export interface BranchItem {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  market?: string;
  isActive: boolean;
  usersCount: number;
  jobsCount: number;
  businessUnits?: BusinessUnitItem[];
  createdAt: string;
}

interface GeneralTabProps {
  branches: BranchItem[];
  showAddBranch: boolean;
  setShowAddBranch: (v: boolean) => void;
  branchName: string;
  setBranchName: (v: string) => void;
  branchCode: string;
  setBranchCode: (v: string) => void;
  branchCity: string;
  setBranchCity: (v: string) => void;
  branchState: string;
  setBranchState: (v: string) => void;
  branchCountry: string;
  setBranchCountry: (v: string) => void;
  addingBranch: boolean;
  handleCreateBranch: (e: React.FormEvent) => void;
  handleDeleteBranch: (branchId: string, name: string) => void;

  businessUnits: BusinessUnitItem[];
  showAddBU: boolean;
  setShowAddBU: (v: boolean) => void;
  buBranchId?: string;
  setBuBranchId?: (v: string) => void;
  buName: string;
  setBuName: (v: string) => void;
  buCode: string;
  setBuCode: (v: string) => void;
  buMarket: string;
  setBuMarket: (v: string) => void;
  buCurrency: string;
  setBuCurrency: (v: string) => void;
  buShiftTiming?: string;
  setBuShiftTiming?: (v: string) => void;
  buWorkStartTime?: string;
  setBuWorkStartTime?: (v: string) => void;
  buWorkEndTime?: string;
  setBuWorkEndTime?: (v: string) => void;
  buTimezone?: string;
  setBuTimezone?: (v: string) => void;
  addingBU: boolean;
  handleCreateBU: (e: React.FormEvent) => void;
  handleDeleteBU: (buId: string, name: string) => void;

  subdomain: string;
  setSubdomain: (v: string) => void;
  originalSubdomain: string;
  savingSubdomain: boolean;
  handleSaveSubdomain: (e: React.FormEvent) => void;
  isSuperAdmin: boolean;
  base: string;
}

function formatTime12(timeStr?: string | null) {
  if (!timeStr) return "09:00 AM";
  const trimmed = timeStr.trim();
  if (/AM|PM/i.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return trimmed;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

export function GeneralTab({
  branches,
  showAddBranch,
  setShowAddBranch,
  branchName,
  setBranchName,
  branchCode,
  setBranchCode,
  branchCity,
  setBranchCity,
  branchState,
  setBranchState,
  branchCountry,
  setBranchCountry,
  addingBranch,
  handleCreateBranch,
  handleDeleteBranch,

  businessUnits,
  showAddBU,
  setShowAddBU,
  buBranchId = "",
  setBuBranchId,
  buName,
  setBuName,
  buCode,
  setBuCode,
  buMarket,
  setBuMarket,
  buCurrency,
  setBuCurrency,
  buShiftTiming = "General Shift",
  setBuShiftTiming,
  buWorkStartTime = "09:00",
  setBuWorkStartTime,
  buWorkEndTime = "18:00",
  setBuWorkEndTime,
  buTimezone = "Asia/Kolkata",
  setBuTimezone,
  addingBU,
  handleCreateBU,
  handleDeleteBU,

  subdomain,
  setSubdomain,
  originalSubdomain,
  savingSubdomain,
  handleSaveSubdomain,
  isSuperAdmin,
  base,
}: GeneralTabProps) {
  const handleOpenAddUnit = (branch: BranchItem) => {
    if (setBuBranchId) setBuBranchId(branch.id);
    const isIndia = (branch.market || "").toUpperCase() === "INDIA" || (branch.country || "").toLowerCase() === "india";
    setBuMarket(isIndia ? "INDIA" : "US");
    setBuCurrency(isIndia ? "INR" : "USD");
    if (setBuShiftTiming) setBuShiftTiming(isIndia ? "General Shift" : "US Shift");
    if (setBuWorkStartTime) setBuWorkStartTime(isIndia ? "09:30" : "19:00");
    if (setBuWorkEndTime) setBuWorkEndTime(isIndia ? "18:30" : "04:00");
    if (setBuTimezone) setBuTimezone(isIndia ? "Asia/Kolkata" : "America/New_York");
    setShowAddBU(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Workspace Subdomain Card */}
      <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Workspace Subdomain &amp; Access URL
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500 mt-0.5">
                Your company workspace access address. Subdomain changes are restricted to authorized administrators.
              </CardDescription>
            </div>
            {originalSubdomain && (
              <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary bg-primary/5 px-2.5 py-1">
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
                Live URL: <span className="font-mono text-primary font-bold">{originalSubdomain ? `https://${originalSubdomain}.${base}` : "Loading..."}</span>
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

      {/* 2. Hierarchical Office Branches & Operating Units Card */}
      <Card className="border border-neutral-200 dark:border-slate-800/80 shadow-xs bg-white dark:bg-slate-900">
        <CardHeader className="pb-4 border-b border-neutral-150 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Office Branches &amp; Operating Units ({branches.length})
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500 mt-0.5 max-w-3xl">
              Physical office locations and their operating units (e.g. <strong>Domestic IT</strong> and <strong>US IT Staffing</strong>). Recruiter seat allocation, working hours, candidate pools, and requisitions are bound directly to their operating unit.
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowAddBranch(!showAddBranch)}
            size="sm"
            className="h-8 text-xs font-bold px-3 flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" /> Add Branch Office
          </Button>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
          {/* Add Branch Office Form */}
          {showAddBranch && (
            <form onSubmit={handleCreateBranch} className="p-4 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  New Physical Office Branch
                </h4>
                <span className="text-[11px] text-neutral-500">A primary default operating unit will be created automatically.</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Branch Name *</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Hyderabad Office"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="h-8 text-xs font-medium bg-white dark:bg-slate-900 mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Branch Code</Label>
                  <Input
                    type="text"
                    placeholder="e.g. HYD"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    className="h-8 text-xs font-medium bg-white dark:bg-slate-900 uppercase mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">City</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Hyderabad"
                    value={branchCity}
                    onChange={(e) => setBranchCity(e.target.value)}
                    className="h-8 text-xs font-medium bg-white dark:bg-slate-900 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Country</Label>
                  <Input
                    type="text"
                    placeholder="e.g. India"
                    value={branchCountry}
                    onChange={(e) => setBranchCountry(e.target.value)}
                    className="h-8 text-xs font-medium bg-white dark:bg-slate-900 mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddBranch(false)} className="h-7 text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={addingBranch} className="h-7 text-xs font-bold">
                  {addingBranch ? "Saving..." : "Save Branch"}
                </Button>
              </div>
            </form>
          )}

          {branches.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-neutral-250 dark:border-slate-800 rounded-xl bg-neutral-50/50 dark:bg-slate-950/5 text-xs text-neutral-500 font-medium">
              No office branches defined yet. Click "Add Branch Office" to set up your company's primary physical office location.
            </div>
          ) : (
            <div className="space-y-4">
              {branches.map((b) => {
                // Find all units for this branch (from nested branch.businessUnits or flat businessUnits matching branchId)
                const branchUnits = (b.businessUnits && b.businessUnits.length > 0)
                  ? b.businessUnits
                  : businessUnits.filter((u) => u.branchId === b.id);

                const isAddingToThisBranch = showAddBU && buBranchId === b.id;

                return (
                  <div
                    key={b.id}
                    className="border border-neutral-250 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/90 shadow-xs transition-all hover:border-neutral-350 dark:hover:border-slate-700"
                  >
                    {/* Branch Office Header */}
                    <div className="px-4 py-3.5 bg-neutral-50/80 dark:bg-slate-850/70 border-b border-neutral-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-250 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xs shrink-0 shadow-2xs">
                          {b.code || b.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{b.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 font-semibold">
                              Physical Office
                            </Badge>
                            {b.code && (
                              <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 font-semibold">
                                [{b.code}]
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <MapPin className="h-3 w-3 text-neutral-400" />
                            <span>{b.city ? `${b.city}, ${b.country || "India"}` : b.country || "India"}</span>
                            <span>•</span>
                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">{b.usersCount || 0} Staff</span>
                            <span>•</span>
                            <span>{b.jobsCount || 0} Requisitions</span>
                          </p>
                        </div>
                      </div>

                      {/* Safe Action Area */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { window.location.href = "/settings/branch"; }}
                          className="h-7 text-xs font-semibold px-2.5 flex items-center gap-1 cursor-pointer bg-white dark:bg-slate-900 hover:bg-neutral-100"
                        >
                          Configure Branch →
                        </Button>
                        {b.usersCount === 0 && b.jobsCount === 0 && branches.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteBranch(b.id, b.name)}
                            title="Delete empty branch"
                            className="h-7 w-7 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Operating Units Subsection inside this Branch */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                            Operating Units &amp; Divisions ({branchUnits.length})
                          </h5>
                          <span className="text-[11px] text-neutral-400 hidden sm:inline">
                            — Market &amp; Shift boundaries
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAddUnit(b)}
                          className="h-6 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Add Unit
                        </Button>
                      </div>

                      {/* Add Unit Inline Form */}
                      {isAddingToThisBranch && (
                        <form onSubmit={handleCreateBU} className="p-3.5 border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <h6 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                              <span>New Operating Unit under <strong>{b.name}</strong></span>
                            </h6>
                            <span className="text-[10px] text-neutral-500">Recruiters and requisitions will inherit these shift hours &amp; currency.</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Unit Name *</Label>
                              <Input
                                type="text"
                                placeholder="e.g. US IT Staffing"
                                value={buName}
                                onChange={(e) => setBuName(e.target.value)}
                                className="h-8 text-xs font-medium bg-white dark:bg-slate-900 mt-1"
                                required
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Unit Code</Label>
                              <Input
                                type="text"
                                placeholder="e.g. USIT"
                                value={buCode}
                                onChange={(e) => setBuCode(e.target.value)}
                                className="h-8 text-xs font-medium bg-white dark:bg-slate-900 uppercase mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Target Market</Label>
                              <select
                                value={buMarket}
                                onChange={(e) => {
                                  const m = e.target.value;
                                  setBuMarket(m);
                                  setBuCurrency(m === "INDIA" ? "INR" : "USD");
                                  if (setBuShiftTiming) setBuShiftTiming(m === "INDIA" ? "General Shift" : "US Shift");
                                  if (setBuWorkStartTime) setBuWorkStartTime(m === "INDIA" ? "09:30" : "19:00");
                                  if (setBuWorkEndTime) setBuWorkEndTime(m === "INDIA" ? "18:30" : "04:00");
                                }}
                                className="w-full h-8 text-xs font-medium bg-white dark:bg-slate-900 border border-neutral-250 dark:border-slate-700 rounded px-2 mt-1"
                              >
                                <option value="US">US Market</option>
                                <option value="INDIA">India Domestic Market</option>
                                <option value="GLOBAL">Global / Multi-Market</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Billing Currency</Label>
                              <select
                                value={buCurrency}
                                onChange={(e) => setBuCurrency(e.target.value)}
                                className="w-full h-8 text-xs font-medium bg-white dark:bg-slate-900 border border-neutral-250 dark:border-slate-700 rounded px-2 mt-1"
                              >
                                <option value="USD">USD ($)</option>
                                <option value="INR">INR (₹)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="CAD">CAD ($)</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Shift Name</Label>
                              <Input
                                type="text"
                                placeholder="e.g. Night Shift"
                                value={buShiftTiming}
                                onChange={(e) => setBuShiftTiming && setBuShiftTiming(e.target.value)}
                                className="h-8 text-xs font-medium bg-white dark:bg-slate-900 mt-1"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Start Time</Label>
                                <Input
                                  type="text"
                                  placeholder="09:00"
                                  value={buWorkStartTime}
                                  onChange={(e) => setBuWorkStartTime && setBuWorkStartTime(e.target.value)}
                                  className="h-8 text-xs font-mono bg-white dark:bg-slate-900 mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">End Time</Label>
                                <Input
                                  type="text"
                                  placeholder="18:00"
                                  value={buWorkEndTime}
                                  onChange={(e) => setBuWorkEndTime && setBuWorkEndTime(e.target.value)}
                                  className="h-8 text-xs font-mono bg-white dark:bg-slate-900 mt-1"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-900/40">
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowAddBU(false)} className="h-7 text-xs">
                              Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={addingBU} className="h-7 text-xs font-bold">
                              {addingBU ? "Saving..." : "Save Unit"}
                            </Button>
                          </div>
                        </form>
                      )}

                      {/* Units Grid */}
                      {branchUnits.length === 0 ? (
                        <div className="p-3 border border-dashed border-neutral-200 dark:border-slate-800 rounded-lg text-center text-xs text-neutral-500 font-medium">
                          No operating units configured for this branch office yet. Click <strong>+ Add Unit</strong> to define an operating division (e.g. US IT Staffing or Domestic IT).
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {branchUnits.map((bu) => (
                            <div
                              key={bu.id}
                              className="p-3 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850/40 flex flex-col justify-between gap-2 transition-all hover:bg-neutral-50 dark:hover:bg-slate-800/60"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{bu.name}</span>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-300 text-indigo-700 dark:text-indigo-400 bg-indigo-50/60 font-semibold">
                                      {bu.market} • {bu.currency}
                                    </Badge>
                                    {bu.code && (
                                      <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 font-semibold">
                                        [{bu.code}]
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5 flex-wrap">
                                    <Clock className="h-3 w-3 text-neutral-400 shrink-0" />
                                    <span>{bu.shiftTiming || (bu.market === "US" ? "US Shift" : "General Shift")}</span>
                                    <span>•</span>
                                    <span className="font-mono text-neutral-600 dark:text-neutral-300 font-medium">
                                      {formatTime12(bu.workStartTime)} – {formatTime12(bu.workEndTime)}
                                    </span>
                                  </p>
                                </div>

                                {bu.usersCount > 0 || bu.jobsCount > 0 ? (
                                  <span
                                    className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 px-1.5 py-0.5 rounded flex items-center gap-1 select-none shrink-0"
                                    title="Active operating unit with assigned members or requisitions cannot be deleted."
                                  >
                                    <ShieldCheck className="h-3 w-3" />
                                    Active
                                  </span>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteBU(bu.id, bu.name)}
                                    title="Delete empty unit"
                                    className="h-6 w-6 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer shrink-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>

                              <div className="pt-2 border-t border-neutral-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-neutral-500">
                                <span>Staff: <strong className="text-neutral-700 dark:text-neutral-300 font-semibold">{bu.usersCount || 0} Assigned</strong></span>
                                <span>Requisitions: <strong className="text-neutral-700 dark:text-neutral-300 font-semibold">{bu.jobsCount || 0} Jobs</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
