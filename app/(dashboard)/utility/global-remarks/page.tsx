"use client";

import React, { useState, useEffect, useMemo } from "react";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Layers, 
  Building2, 
  ArrowRight, 
  ShieldAlert, 
  ShieldCheck, 
  Info, 
  Filter, 
  Sparkles,
  Search,
  Check,
  X,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STAGES = [
  { key: "review", label: "Internal Review Gate", desc: "Initial screening before client submission" },
  { key: "l1", label: "Round 1 (L1)", desc: "First round technical interview vetting" },
  { key: "l2", label: "Round 2 (L2)", desc: "Second round client / technical evaluation" },
  { key: "l3", label: "Round 3 (L3)", desc: "Third round leadership or commercial interview" },
  { key: "final", label: "Final Milestone", desc: "Offer, negotiation, and placement decision" },
  { key: "all", label: "All Stages", desc: "Universal templates across all recruitment stages" },
];

export default function GlobalRemarksPage() {
  const { data: session } = useSession();
  const [overrideRole, setOverrideRole] = useState<string | null>(null);

  const [remarks, setRemarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>("review");
  const [searchQuery, setSearchQuery] = useState("");

  const [newAcceptText, setNewAcceptText] = useState("");
  const [newRejectText, setNewRejectText] = useState("");
  const [addingAccept, setAddingAccept] = useState(false);
  const [addingReject, setAddingReject] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOverrideRole(localStorage.getItem("override_role"));
      const handleStorage = () => setOverrideRole(localStorage.getItem("override_role"));
      window.addEventListener("storage", handleStorage);
      window.addEventListener("overrideRoleChanged", handleStorage);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("overrideRoleChanged", handleStorage);
      };
    }
  }, []);

  const sessionUser = (session as any)?.user;
  const userPermissions = useMemo(() => {
    return Array.isArray(sessionUser?.permissions) ? sessionUser.permissions : [];
  }, [sessionUser]);

  const canManageGlobalRemarks = useMemo(() => {
    const roles = Array.isArray(sessionUser?.roles) ? sessionUser.roles : [];
    const sysRole = sessionUser?.systemRole;
    return (
      userPermissions.includes("tenant:settings") ||
      userPermissions.includes("tenant:manage") ||
      userPermissions.includes("system:admin") ||
      roles.some((r: string) => ["ADMIN", "SUPER_ADMIN", "TENANT_ADMIN"].includes(String(r).toUpperCase())) ||
      ["ADMIN", "SUPER_ADMIN", "TENANT_ADMIN"].includes(String(sysRole || "").toUpperCase()) ||
      ["ADMIN", "SUPER_ADMIN", "TENANT_ADMIN"].includes(String(overrideRole || "").toUpperCase())
    );
  }, [sessionUser, userPermissions, overrideRole]);

  const loadGlobalRemarks = async () => {
    try {
      setLoading(true);
      const data = await atsApi.submissions.getCustomRemarks(undefined, true);
      // Strictly filter to universal global remarks (branchId null or isGlobal true)
      const globalOnly = (data || []).filter((r: any) => !r.branchId || r.isGlobal);
      setRemarks(globalOnly);
    } catch (err: any) {
      toast.error("Failed to load global remarks templates: " + (err.message || "Network error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGlobalRemarks();
  }, []);

  const handleAddRemarks = async (type: "ACCEPT" | "REJECT", text: string) => {
    if (!text.trim()) return;
    const items = text
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (items.length === 0) return;

    const setAdding = type === "ACCEPT" ? setAddingAccept : setAddingReject;
    setAdding(true);
    try {
      const stageToUse = activeStage === "all" ? "review" : activeStage;
      const created = await Promise.all(
        items.map((itemText) =>
          atsApi.submissions.createCustomRemark({
            stage: stageToUse,
            remarkText: itemText,
            remarkType: type,
            isGlobal: true,
          })
        )
      );
      setRemarks((prev) => [...prev, ...(Array.isArray(created) ? created.flat() : [created])]);
      if (type === "ACCEPT") setNewAcceptText("");
      if (type === "REJECT") setNewRejectText("");
      toast.success(
        items.length === 1
          ? `Global ${type === "ACCEPT" ? "Acceptance" : "Rejection"} template added!`
          : `Added ${items.length} global ${type.toLowerCase()} templates!`
      );
    } catch (err: any) {
      toast.error("Failed to add template: " + (err.message || "Unknown error"));
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRemark = async (id: number) => {
    try {
      await atsApi.submissions.deleteCustomRemark(id);
      setRemarks((prev) => prev.filter((r) => r.id !== id));
      toast.success("Global template deleted successfully!");
    } catch (err: any) {
      toast.error("Failed to delete template: " + (err.message || "Unknown error"));
    }
  };

  // Filtered remarks based on stage filter & search
  const filteredRemarks = useMemo(() => {
    return remarks.filter((r) => {
      const matchesStage =
        activeStage === "all" ||
        r.stage === activeStage ||
        (activeStage === "review" && r.stage === "internal_review");
      const matchesSearch =
        !searchQuery.trim() ||
        (r.remarkText || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.stage || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStage && matchesSearch;
    });
  }, [remarks, activeStage, searchQuery]);

  const acceptRemarks = useMemo(() => {
    return filteredRemarks.filter((r) => r.remarkType === "ACCEPT");
  }, [filteredRemarks]);

  const rejectRemarks = useMemo(() => {
    return filteredRemarks.filter((r) => r.remarkType === "REJECT");
  }, [filteredRemarks]);

  // Statistics
  const stats = useMemo(() => {
    const total = remarks.length;
    const accept = remarks.filter((r) => r.remarkType === "ACCEPT").length;
    const reject = remarks.filter((r) => r.remarkType === "REJECT").length;
    const stagesCovered = new Set(remarks.map((r) => r.stage)).size;
    return { total, accept, reject, stagesCovered };
  }, [remarks]);

  if (!canManageGlobalRemarks) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <DashboardBreadcrumb title="Global Stage Remarks Templates" text="Settings" />
        <Card className="border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 shadow-xs">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Access Restricted: Global Administrator Required
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Only Global Admins and Tenant Administrators can create and edit organization-wide universal remark templates. Branch admins can select these templates within their branch settings.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb & Navigation */}
      <DashboardBreadcrumb title="Global Stage Remarks Templates" text="Settings" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Globe className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Global Stage Remarks Templates
            </h1>
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800 text-[10px] font-semibold px-2 py-0.5">
              GLOBAL ADMIN / SETTINGS
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Universal standard quick-pick templates available across all candidate review stages. Branch admins can choose to inherit all global templates or select specific ones in Branch Settings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={loadGlobalRemarks}
            variant="outline"
            size="sm"
            disabled={loading}
            className="h-9 text-xs font-semibold border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          <Button asChild size="sm" className="h-9 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer">
            <Link href="/utility/branches">
              <Building2 className="h-3.5 w-3.5 mr-1.5" /> Branch Locations
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI / Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Templates</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{stats.total}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Globe className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Acceptance Templates</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.accept}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rejection Templates</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{stats.reject}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Covered Stages</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{stats.stagesCovered} / 5</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stage Tabs & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Stage Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 shrink-0">Stage:</span>
          {STAGES.map((s) => {
            const count = remarks.filter(
              (r) => s.key === "all" || r.stage === s.key || (s.key === "review" && r.stage === "internal_review")
            ).length;
            const isActive = activeStage === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveStage(s.key)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                }`}
              >
                <span>{s.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-8.5 h-8.5 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-lg"
          />
        </div>
      </div>

      {/* Main Remarks Columns */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center">
          <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading universal templates...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* ── LEFT: ACCEPTANCE REMARKS ── */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                      Acceptance Remarks
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400">
                      Positive reasons for candidate approval
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-mono text-[10px]">
                  {acceptRemarks.length} Templates
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Quick Add Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddRemarks("ACCEPT", newAcceptText);
                }}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <Input
                    value={newAcceptText}
                    onChange={(e) => setNewAcceptText(e.target.value)}
                    placeholder="e.g. Strong technical fit, Excellent communication..."
                    disabled={addingAccept}
                    className="text-xs h-9 bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                  />
                  <Button
                    type="submit"
                    disabled={addingAccept || !newAcceptText.trim()}
                    className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-2xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Tip: Separate multiple remarks with commas or newlines to add in bulk.
                </p>
              </form>

              {/* Remarks List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {acceptRemarks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No acceptance templates found for this filter. Type above to add one.
                  </div>
                ) : (
                  acceptRemarks.map((rem) => (
                    <div
                      key={rem.id}
                      className="p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs mt-0.5 shrink-0">✓</span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                          {rem.remarkText}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                          {rem.stage}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteRemark(rem.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete global template"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── RIGHT: REJECTION REMARKS ── */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <CardHeader className="bg-rose-50/50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/40 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-xs">
                    ✕
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                      Rejection Remarks
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400">
                      Standard reasons for candidate disqualification
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-mono text-[10px]">
                  {rejectRemarks.length} Templates
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Quick Add Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddRemarks("REJECT", newRejectText);
                }}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <Input
                    value={newRejectText}
                    onChange={(e) => setNewRejectText(e.target.value)}
                    placeholder="e.g. Budget mismatch, Notice period too long..."
                    disabled={addingReject}
                    className="text-xs h-9 bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                  />
                  <Button
                    type="submit"
                    disabled={addingReject || !newRejectText.trim()}
                    className="h-9 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shrink-0 shadow-2xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Tip: Separate multiple remarks with commas or newlines to add in bulk.
                </p>
              </form>

              {/* Remarks List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {rejectRemarks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No rejection templates found for this filter. Type above to add one.
                  </div>
                ) : (
                  rejectRemarks.map((rem) => (
                    <div
                      key={rem.id}
                      className="p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="text-rose-600 dark:text-rose-400 font-bold text-xs mt-0.5 shrink-0">✕</span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                          {rem.remarkText}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                          {rem.stage}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteRemark(rem.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete global template"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Informational Guidance Footer */}
      <Card className="bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/70 dark:border-indigo-900/50 shadow-2xs">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                How Branches Consume Universal Templates
              </h4>
              <p className="text-[11.5px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                Templates created on this page are immediately accessible across the tenant. Branch managers can enable global templates or select specific templates per branch in <strong>Branch &amp; Office Locations</strong>.
              </p>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="shrink-0 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-semibold cursor-pointer">
            <Link href="/utility/branches">
              Configure Branch Selections <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
