"use client";

import React, { useState, useEffect, useMemo } from "react";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  ShieldAlert, 
  Search,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface RemarkTemplate { id: number; stage: string; remarkText: string; remarkType?: string; branchId?: string | null; isGlobal?: boolean }

const STAGES = [
  { key: "review", label: "Review" },
  { key: "l1", label: "Round 1 (L1)" },
  { key: "l2", label: "Round 2 (L2)" },
  { key: "l3", label: "Round 3 (L3)" },
  { key: "final", label: "Final" },
  { key: "all", label: "All Stages" },
];

export default function GlobalRemarksPage() {
  const { data: session } = useSession();

  const [remarks, setRemarks] = useState<RemarkTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>("review");
  const [searchQuery, setSearchQuery] = useState("");

  const [newRemarkText, setNewRemarkText] = useState("");
  const [addingRemark, setAddingRemark] = useState(false);

  const sessionUser = session?.user as { permissions?: string[]; roles?: string[]; systemRole?: string } | undefined;
  const userPermissions = useMemo(() => {
    return Array.isArray(sessionUser?.permissions) ? sessionUser.permissions : [];
  }, [sessionUser]);

  const isGlobalAdmin = userPermissions.some(permission => ["system:admin", "platform:manage"].includes(permission));
  const canManageGlobalRemarks = isGlobalAdmin || userPermissions.some(permission => ["tenant:settings", "tenant:manage"].includes(permission));

  const loadGlobalRemarks = async () => {
    try {
      const data = await atsApi.submissions.getCustomRemarks(undefined, true);
      const globalOnly = (data || []).filter((r: RemarkTemplate) => !r.branchId || r.isGlobal);
      setRemarks(globalOnly);
    } catch (err: unknown) {
      toast.error("Failed to load global remarks templates: " + (err instanceof Error ? err.message : "Network error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) return loadGlobalRemarks(); });
    return () => { active = false; };
  }, []);

  const handleAddRemarks = async (text: string) => {
    if (!isGlobalAdmin) {
      toast.error("Only Global Administrators can add universal global remarks templates.");
      return;
    }
    if (!text.trim()) return;
    if (activeStage === "all") { toast.error("Choose a stage before adding a remark."); return; }
    const items = text
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (items.length === 0) return;

    const setAdding = setAddingRemark;
    setAdding(true);
    try {
      const stageToUse = activeStage === "all" ? "review" : activeStage;
      const created = await Promise.all(
        items.map((itemText) =>
          atsApi.submissions.createCustomRemark({
            stage: stageToUse,
            remarkText: itemText,
            remarkType: "GENERAL",
            isGlobal: true,
          })
        )
      );
      setRemarks((prev) => [...prev, ...(Array.isArray(created) ? created.flat() : [created])]);
      setNewRemarkText("");
      toast.success(
        items.length === 1
          ? "Added stage remark"
          : `Added ${items.length} stage remarks`
      );
    } catch (err: unknown) {
      toast.error("Failed to add template: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRemark = async (id: number) => {
    if (!isGlobalAdmin) {
      toast.error("Only Global Administrators can delete universal global remarks templates.");
      return;
    }
    try {
      await atsApi.submissions.deleteCustomRemark(id);
      setRemarks((prev) => prev.filter((r) => r.id !== id));
      toast.success("Template deleted");
    } catch (err: unknown) {
      toast.error("Failed to delete template: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

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

  const stageRemarks = filteredRemarks;


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
                Access Restricted
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Only Global Administrators and Tenant Administrators have permission to configure universal stage remarks templates.
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
    <div className="w-full max-w-full p-6 space-y-5">
      <DashboardBreadcrumb title="Global Remarks Templates" text="Settings" />

      {!isGlobalAdmin && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
          <span>Read-only mode: As a Tenant Administrator, you can view global remarks and enable them in Branch settings. Only Global Administrators can create or delete global remark templates.</span>
        </div>
      )}

      {/* Stage Toolbar with Search and Refresh */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-8.5 h-8 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <Button
            onClick={() => { setLoading(true); void loadGlobalRemarks(); }}
            variant="outline"
            size="sm"
            disabled={loading}
            className="h-8 text-xs font-semibold border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Stage remarks shared by both outcomes */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center">
          <div className="h-7 w-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading templates...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 items-start">
          {/* ── STAGE REMARKS ── */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/40 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                    •
                  </div>
                  <CardTitle className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Stage Remarks
                  </CardTitle>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {stageRemarks.length}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5">
              {!isGlobalAdmin ? (
                <div className="text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Only Global Administrators can add global stage remarks.</span>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddRemarks(newRemarkText);
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={newRemarkText}
                    onChange={(e) => setNewRemarkText(e.target.value)}
                    placeholder="Enter stage remark (comma-separated for multiple)..."
                    disabled={addingRemark}
                    className="text-xs h-8.5 bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                  />
                  <Button
                    type="submit"
                    disabled={addingRemark || !newRemarkText.trim()}
                    className="h-8.5 px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </form>
              )}

              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {stageRemarks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    No stage remarks found for this stage.
                  </div>
                ) : (
                  stageRemarks.map((rem) => (
                    <div
                      key={rem.id}
                      className="p-2.5 bg-slate-50/70 dark:bg-slate-850 rounded-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs mt-0.5 shrink-0">•</span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                          {rem.remarkText}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                          {rem.stage}
                        </span>
                        {isGlobalAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRemark(rem.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete template"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>


        </div>
      )}
    </div>
  );
}
