"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building2, Layers, Check, Loader2, 
  Clock, Globe, Users, Shield, AlertCircle, Plus, ChevronRight, UserPlus, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";
import { getDynamicTimezoneOptions, getTimezoneLiveInfo } from "@/lib/timezone-helper";
import { 
  ShiftTimePicker, 
  ShiftTimeFormatToggle, 
  ShiftDurationSummary, 
  TimeFormat 
} from "@/components/ui/shift-time-picker";
import { AssignStaffModal } from "@/app/(dashboard)/management/units/components/assign-staff-modal";

export default function EditUnitPage() {
  const router = useRouter();
  const params = useParams();
  const unitId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [marketSegments, setMarketSegments] = useState<any[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [parentBranch, setParentBranch] = useState<any>(null);
  const [unitPods, setUnitPods] = useState<any[]>([]);
  const [unitMembers, setUnitMembers] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Time format preference: "12h" (default, AM/PM) or "24h"
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("12h");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ats_shift_time_format") as TimeFormat;
      if (saved === "12h" || saved === "24h") {
        setTimeFormat(saved);
      }
    }
  }, []);

  const handleTimeFormatChange = (fmt: TimeFormat) => {
    setTimeFormat(fmt);
    if (typeof window !== "undefined") {
      localStorage.setItem("ats_shift_time_format", fmt);
    }
  };

  const [formData, setFormData] = useState({
    branchId: "",
    name: "",
    code: "",
    marketSegmentId: "",
    market: "INDIA",
    currency: "INR",
    shiftTiming: "General Shift",
    workStartTime: "09:30",
    workEndTime: "18:30",
    timezone: "Asia/Kolkata",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    breakDurationMinutes: 60,
    jobCodePattern: "",

    // Job Assignment & Routing Policies
    allowNone: true,
    allowPods: true,
    allowAll: true,
    allowUnassigned: false,
    podDistributionStrategy: "AUTOMATIC",
  });

  const tzOptions = useMemo(() => getDynamicTimezoneOptions(), []);
  const liveTzInfo = useMemo(() => getTimezoneLiveInfo(formData.timezone), [formData.timezone]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) return;

    async function loadData() {
      setLoading(true);
      try {
        const [unit, branchList, members, marketList] = await Promise.all([
          atsApi.businessUnits.get(unitId),
          atsApi.branches.list().catch(() => []),
          atsApi.businessUnits.getMembers(unitId).catch(() => []),
          atsApi.marketSegments.list().catch(() => []),
        ]);
        if (Array.isArray(branchList)) {
          setBranches(branchList);
        }
        if (Array.isArray(members)) {
          setUnitMembers(members);
        }
        if (Array.isArray(marketList)) {
          setMarketSegments(marketList.filter((s: any) => s.isActive));
          setLoadingMarkets(false);
        }
        if (unit) {
          setFormData({
            branchId: unit.branchId || "",
            name: unit.name || "",
            code: unit.code || "",
            marketSegmentId: unit.marketSegmentId || "",
            market: unit.market || "INDIA",
            currency: unit.currency || "INR",
            shiftTiming: unit.shiftTiming || "General Shift",
            workStartTime: unit.workStartTime || "09:30",
            workEndTime: unit.workEndTime || "18:30",
            timezone: unit.timezone || "Asia/Kolkata",
            workingDays: Array.isArray(unit.workingDays) && unit.workingDays.length > 0
              ? unit.workingDays
              : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            breakDurationMinutes: unit.breakDurationMinutes ?? 60,
            jobCodePattern: unit.jobCodePattern || "",
            allowNone: unit.allowNone ?? true,
            allowPods: unit.allowPods ?? true,
            allowAll: unit.allowAll ?? true,
            allowUnassigned: unit.allowUnassigned ?? false,
            podDistributionStrategy: unit.podDistributionStrategy || "AUTOMATIC",
          });

          // Fetch branch object
          const b = unit.branch || branchList?.find((x: any) => x.id === unit.branchId);
          if (b) {
            setParentBranch(b);
          } else if (unit.branchId) {
            const fetchedBranch = await atsApi.branches.get(unit.branchId).catch(() => null);
            if (fetchedBranch) setParentBranch(fetchedBranch);
          }

          // Fetch unit pods
          const pods = await atsApi.pods.list({ businessUnitId: unitId }).catch(() => []);
          if (Array.isArray(pods)) {
            setUnitPods(pods);
          }
        }
      } catch (err: any) {
        console.error("Failed to load unit details:", err);
        setFormError(err.message || "Failed to load branch unit details.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [unitId]);

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      await atsApi.businessUnits.removeMember(unitId, memberId);
      toast.success(`Removed ${memberName} from this branch unit.`);
      const updated = await atsApi.businessUnits.getMembers(unitId).catch(() => []);
      setUnitMembers(updated);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member.");
    }
  };

  const toggleDay = (day: string) => {
    setFormData((prev) => {
      const exists = prev.workingDays.includes(day);
      const updated = exists ? prev.workingDays.filter((d) => d !== day) : [...prev.workingDays, day];
      return { ...prev, workingDays: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.branchId) {
      setFormError("Branch is required.");
      return;
    }
    if (!formData.name.trim()) {
      setFormError("Branch Unit Name is required.");
      return;
    }
    if (!formData.code.trim()) {
      setFormError("Unit Code is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        branchId: formData.branchId,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        market: formData.market,
        marketSegmentId: formData.marketSegmentId || undefined,
        currency: formData.currency,
        shiftTiming: formData.shiftTiming,
        workStartTime: formData.workStartTime,
        workEndTime: formData.workEndTime,
        timezone: formData.timezone,
        workingDays: formData.workingDays,
        breakDurationMinutes: Number(formData.breakDurationMinutes || 60),
        jobCodePattern: formData.jobCodePattern || null,
        allowNone: formData.allowNone,
        allowPods: formData.allowPods,
        allowAll: formData.allowAll,
        allowUnassigned: formData.allowUnassigned,
        podDistributionStrategy: formData.podDistributionStrategy,
      };

      await atsApi.businessUnits.update(unitId, payload);
      toast.success(`Branch Unit "${formData.name}" updated successfully!`);
      const targetBranchId = formData.branchId || parentBranch?.id;
      router.push(targetBranchId ? `/management/units?branchId=${targetBranchId}` : "/management/units");
    } catch (err: any) {
      console.error("Update unit error:", err);
      setFormError(err.message || "Failed to update branch unit.");
      toast.error(err.message || "Failed to update unit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const backUnitsUrl = formData.branchId || parentBranch ? `/management/units?branchId=${formData.branchId || parentBranch.id}` : "/management/units";

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-xs text-neutral-500 mt-2 font-medium">Loading branch unit details...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" /> Edit Branch Unit
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Configure shifts, branch unit attributes, recruitment pods, and isolated job assignment policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(backUnitsUrl)}
            className="h-9 px-4 text-xs font-semibold border-neutral-300 dark:border-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-9 px-5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {formError && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CARD 1: Identity & Branch */}
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Branch Unit Identity &amp; Host Branch
              </h2>
            </div>
            {parentBranch && (
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                Hosted at: {parentBranch.name}
              </span>
            )}
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.branchId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, branchId: val });
                    const found = branches.find((b) => b.id === val);
                    setParentBranch(found || null);
                  }}
                  className="w-full h-9.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 font-semibold text-neutral-900 dark:text-white cursor-pointer"
                  required
                >
                  <option value="">-- Select Branch Location --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city || "City Unspecified"}, {b.country || "India"})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-neutral-400 block">The branch office hosting this operating branch unit.</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Branch Unit Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. US IT Staffing"
                  className="h-9.5 text-xs font-medium rounded-lg border-neutral-300 dark:border-slate-700"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Unit Code <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. US-IT"
                  className="h-9.5 text-xs font-mono font-bold uppercase rounded-lg border-neutral-300 dark:border-slate-700"
                  required
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Custom Job Code Pattern
                </label>
                <Input
                  value={formData.jobCodePattern}
                  onChange={(e) => setFormData({ ...formData, jobCodePattern: e.target.value.toUpperCase() })}
                  placeholder="e.g. {BRANCH}-{UNIT}-{YYMMDD}-{SEQ}"
                  className="h-9.5 text-xs font-mono font-bold uppercase rounded-lg border-neutral-300 dark:border-slate-700"
                />
                <div className="space-y-1 mt-1">
                  <span className="text-[10px] text-neutral-500 block">
                    Tokens available: <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{BRANCH}"}</code>, <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{UNIT}"}</code>, <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{YYMMDD}"}</code>, <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{YYMM}"}</code>, <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{YY}"}</code>, <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{MM}"}</code>, <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{DD}"}</code>, <code className="bg-neutral-100 dark:bg-slate-800 px-1 rounded">{"{SEQ}"}</code> (or <code>{"{SEQ:4}"}</code> for length). Leave blank to inherit tenant default.
                  </span>
                  {formData.jobCodePattern && (
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded">
                      Live Preview: {formData.jobCodePattern
                        .replace(/{BRANCH}/g, (branches.find(b => b.id === formData.branchId)?.code || "BRX"))
                        .replace(/{UNIT}/g, formData.code || "UNIT")
                        .replace(/{YYMMDD}/g, [String(new Date().getFullYear()).slice(2), String(new Date().getMonth() + 1).padStart(2, '0'), String(new Date().getDate()).padStart(2, '0')].join(''))
                        .replace(/{YYMM}/g, [String(new Date().getFullYear()).slice(2), String(new Date().getMonth() + 1).padStart(2, '0')].join(''))
                        .replace(/{YY}/g, String(new Date().getFullYear()).slice(2))
                        .replace(/{MM}/g, String(new Date().getMonth() + 1).padStart(2, '0'))
                        .replace(/{DD}/g, String(new Date().getDate()).padStart(2, '0'))
                        .replace(/\{SEQ(?:[:]?(\d+))?\}/g, (m, p1) => "1".padStart(p1 ? parseInt(p1, 10) : 3, '0'))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: Market Segment & Currency */}
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Market Segment &amp; Financials
              </h2>
            </div>
            <span className="text-[10.5px] font-semibold text-neutral-400">Commercial Alignment</span>
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Market Segment
                </label>
                <select
                  value={formData.marketSegmentId}
                  onChange={(e) => {
                    const seg = marketSegments.find((s: any) => s.id === e.target.value);
                    if (seg) {
                      setFormData({
                        ...formData,
                        marketSegmentId: e.target.value,
                        market: seg.code,
        code: seg.code, // Auto-select unit code
                        currency: seg.defaultCurrency || formData.currency,
                        timezone: seg.defaultTimezone || formData.timezone,
                        shiftTiming: seg.defaultShift || formData.shiftTiming,
                        workStartTime: seg.defaultStartTime || formData.workStartTime,
                        workEndTime: seg.defaultEndTime || formData.workEndTime,
                      });
                    } else {
                      setFormData({ ...formData, marketSegmentId: e.target.value });
                    }
                  }}
                  disabled={loadingMarkets}
                  className="w-full h-9.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 font-semibold text-neutral-900 dark:text-white cursor-pointer"
                >
                  <option value="">-- Select Market Segment --</option>
                  {marketSegments.map((seg: any) => (
                    <option key={seg.id} value={seg.id}>
                      {seg.name} ({seg.code})
                    </option>
                  ))}
                </select>
                {marketSegments.length === 0 && !loadingMarkets && (
                  <p className="text-[10px] text-amber-600">
                    No markets defined.{" "}
                    <a href="/management/markets" className="underline font-semibold">Create a market segment</a>{" "}
                    first.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Operating Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full h-9.5 text-xs font-mono font-bold rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-neutral-900 dark:text-white cursor-pointer"
                >
                  {Array.from(new Set([
                    "USD", "INR", "GBP", "EUR", "AED", "CAD", "AUD", "SGD",
                    ...(typeof Intl !== "undefined" && Intl.supportedValuesOf ? Intl.supportedValuesOf("currency") : [])
                  ])).map((code) => {
                    let name = code;
                    let symbol = code;
                    try {
                      name = new Intl.DisplayNames(["en"], { type: "currency" }).of(code) || code;
                      symbol = (0).toLocaleString("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).replace(/[\d.,]/g, "").trim();
                    } catch {}
                    return (
                      <option key={code} value={code}>
                        {code} {symbol && symbol !== code ? `(${symbol} - ${name})` : `(${name})`}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: Operating Shift, Timezone & Schedule */}
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Work Shift Schedule &amp; Timezone
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Staffing hours, dynamic timezone, and AM/PM shift periods
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">Format:</span>
              <ShiftTimeFormatToggle format={timeFormat} onChange={handleTimeFormatChange} />
            </div>
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Operational Timezone <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    Local Time: {liveTzInfo.currentTime}
                  </span>
                </div>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full h-9.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 font-medium text-neutral-900 dark:text-white cursor-pointer"
                >
                  {tzOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Dynamic EDT/EST status pill */}
                <div className="p-2.5 bg-neutral-50 dark:bg-slate-850 rounded-lg border border-neutral-200/80 dark:border-slate-800 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {liveTzInfo.statusBadge}
                    </span>
                    <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                      Active Offset: <strong className="text-neutral-900 dark:text-white font-mono">{liveTzInfo.offset}</strong>
                    </span>
                  </div>
                  <span className="text-neutral-500 dark:text-neutral-400 text-[10.5px]">
                    {liveTzInfo.isEastern
                      ? "EDT/EST Friendly: Automatically shifts between EDT (summer) & EST (winter)"
                      : liveTzInfo.isDST
                      ? "Daylight saving time is active in this region"
                      : "Standard time is active in this region"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Shift Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.shiftTiming}
                  onChange={(e) => setFormData({ ...formData, shiftTiming: e.target.value })}
                  placeholder="e.g. General Day Shift, US Night Shift"
                  className="h-9.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700"
                />
                <span className="text-[10px] text-neutral-400 block">Identifies shift timing on job requisitions and candidate submissions.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <ShiftTimePicker
                label="Start Time"
                value={formData.workStartTime}
                onChange={(val) => setFormData({ ...formData, workStartTime: val })}
                format={timeFormat}
                required
              />

              <ShiftTimePicker
                label="End Time"
                value={formData.workEndTime}
                onChange={(val) => setFormData({ ...formData, workEndTime: val })}
                format={timeFormat}
                required
              />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Break Duration (Mins)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="180"
                  value={formData.breakDurationMinutes}
                  onChange={(e) => setFormData({ ...formData, breakDurationMinutes: Number(e.target.value) })}
                  className="h-9.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700"
                />
                <span className="text-[10px] text-neutral-400 block">Deducted from gross duration for net working hours.</span>
              </div>
            </div>

            {/* Shift Duration & Day/Night summary preview */}
            <ShiftDurationSummary
              startTime={formData.workStartTime}
              endTime={formData.workEndTime}
              timezone={formData.timezone}
              breakMinutes={formData.breakDurationMinutes}
            />

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">Working Days</label>
              <div className="flex flex-wrap gap-2">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                  const isSel = formData.workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        isSel
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                          : "bg-white dark:bg-slate-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-slate-700 hover:bg-neutral-50"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: Job Assignment & Routing Policy [Unit Isolated] */}
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Job Assignment Policy
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  [Unit Isolated]
                </span>
              </div>
            </div>
            <span className="text-[10.5px] font-semibold text-neutral-400">Requisition Distribution</span>
          </div>

          <CardContent className="p-6 space-y-4">
            <p className="text-xs text-neutral-500 leading-relaxed">
              Define which assignment channels are enabled for requisitions created under this branch unit.
            </p>

            <div className="space-y-3 divide-y divide-neutral-100 dark:divide-slate-800">
              {/* Option 1: Direct */}
              <div className="pt-3 first:pt-0 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    1. Direct Recruiter Assignment
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Allows job creators to assign requisitions directly to individual recruiters assigned to this unit.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allowNone}
                  onChange={(e) => setFormData({ ...formData, allowNone: e.target.checked })}
                  className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5"
                />
              </div>

              {/* Option 3: All Unit Recruiters (Pool) */}
              <div className="pt-3 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    3. All Unit Recruiters (Pool)
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    When assigned, the job requisition is pooled and broadcast strictly to active recruiters in this branch unit.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allowAll}
                  onChange={(e) => setFormData({ ...formData, allowAll: e.target.checked })}
                  className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5"
                />
              </div>

              {/* Option 2: Recruitment Pods */}
              <div className="pt-3 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                      2. Recruitment Pod System
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Enables pod assignment rules. Pods created under this unit handle specialized domain hiring.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.allowPods}
                    onChange={(e) => setFormData({ ...formData, allowPods: e.target.checked })}
                    className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5"
                  />
                </div>

                {formData.allowPods && (
                  <div className="p-3.5 bg-neutral-50 dark:bg-slate-850 rounded-xl border border-neutral-200/80 dark:border-slate-800 space-y-2.5">
                    <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                      Pod Distribution Strategy
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                          formData.podDistributionStrategy === "AUTOMATIC"
                            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40"
                            : "border-neutral-200 dark:border-slate-700 hover:bg-neutral-100/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="strategy"
                          checked={formData.podDistributionStrategy === "AUTOMATIC"}
                          onChange={() => setFormData({ ...formData, podDistributionStrategy: "AUTOMATIC" })}
                          className="mt-0.5"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                            Automatic Round-Robin
                          </span>
                          <p className="text-[10.5px] text-neutral-400">
                            Rotates incoming jobs automatically across active pods within this unit.
                          </p>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                          formData.podDistributionStrategy === "MANUAL"
                            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40"
                            : "border-neutral-200 dark:border-slate-700 hover:bg-neutral-100/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="strategy"
                          checked={formData.podDistributionStrategy === "MANUAL"}
                          onChange={() => setFormData({ ...formData, podDistributionStrategy: "MANUAL" })}
                          className="mt-0.5"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                            Manual Lead Selection
                          </span>
                          <p className="text-[10.5px] text-neutral-400">
                            Requisition creator selects target pod or assigns directly to Pod Lead.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Option 4: Unassigned */}
              <div className="pt-3 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    4. Allow Unassigned Requisitions
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Permits requisitions to be saved without an immediate recruiter or pod assignment.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allowUnassigned}
                  onChange={(e) => setFormData({ ...formData, allowUnassigned: e.target.checked })}
                  className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 5: Recruiter & Staff Members */}
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Recruiter &amp; Staff Members ({unitMembers.length})
                </h2>
                <p className="text-[11px] text-neutral-400">Team members assigned to source and manage requisitions in this branch unit</p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setShowAssignModal(true)}
              className="h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <UserPlus className="h-3.5 w-3.5" /> Assign Staff
            </Button>
          </div>

          <CardContent className="p-4">
            {unitMembers.length === 0 ? (
              <div className="p-8 text-center text-neutral-400">
                <Users className="h-10 w-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">No staff members currently assigned to this unit</p>
                <p className="text-[11px] text-neutral-400 mt-0.5 max-w-sm mx-auto">
                  Assign recruiters, account managers, and team members to handle jobs and pod allocations under this branch unit.
                </p>
                <Button
                  type="button"
                  onClick={() => setShowAssignModal(true)}
                  className="mt-3 h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Assign Staff Members
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {unitMembers.map((m) => {
                  const initials = (m.fullName || "User")
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl border border-neutral-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between gap-2.5 shadow-2xs hover:border-blue-200 dark:hover:border-blue-900/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white truncate block">
                            {m.fullName}
                          </span>
                          <span className="text-[10.5px] text-neutral-400 truncate block">
                            {m.email}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-slate-700">
                              {m.roleName}
                            </span>
                            {m.podName && (
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                                {m.podName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id, m.fullName)}
                        className="p-1 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
                        title={`Remove ${m.fullName} from unit`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CARD 6: Unit Pods Preview */}
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Recruitment Pods ({unitPods.length})
                </h2>
                <p className="text-[11px] text-neutral-400">Domain-specific pods isolated to this branch unit</p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/utility/pods`)}
              className="h-8 px-2.5 text-xs font-semibold border-neutral-200 dark:border-slate-700"
            >
              Manage in Pods Hub
            </Button>
          </div>

          <CardContent className="p-4">
            {unitPods.length === 0 ? (
              <div className="p-6 text-center text-neutral-400">
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">No recruitment pods linked to this unit</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Pods can be created and tied to this branch unit from the Recruitment Pods module.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {unitPods.map((p) => (
                  <div key={p.id} className="p-3 rounded-lg border border-neutral-200/80 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-850 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">{p.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                        {p.code || "POD"}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      {p.members?.length || 0} Members {"\u2022"} Lead: {p.leadName || p.leadEmail || "Unassigned"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-slate-800">
          <Link
            href={backUnitsUrl}
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
          >
            ← Cancel and return
          </Link>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(backUnitsUrl)}
              className="h-9 px-4 text-xs font-semibold border-neutral-300 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-6 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ASSIGN STAFF MODAL */}
        <AssignStaffModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          unit={{
            id: unitId,
            name: formData.name,
            code: formData.code,
            branchName: parentBranch?.name,
            branchId: formData.branchId,
            market: formData.market,
          }}
          onSaved={async () => {
            const updated = await atsApi.businessUnits.getMembers(unitId).catch(() => []);
            setUnitMembers(updated);
          }}
        />
      </form>
    </div>
  );
}
