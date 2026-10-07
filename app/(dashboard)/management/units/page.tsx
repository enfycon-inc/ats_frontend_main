"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Building2, Layers, Plus, Edit2, Users, Search, 
  Clock, Calendar, Check, X, Shield, 
  Trash2, Globe, Sparkles, Filter, ChevronRight, AlertCircle, Loader2, MoreHorizontal, UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";
import { AssignStaffModal } from "./components/assign-staff-modal";

function formatTime12(timeStr?: string) {
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

export function UnitsContent({
  hideTopHeader = false,
  initialBranchId,
  onSwitchTab,
}: {
  hideTopHeader?: boolean;
  initialBranchId?: string;
  onSwitchTab?: (tab: string, branchId?: string) => void;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryBranchId = searchParams?.get("branchId") || initialBranchId || "";

  const [loading, setLoading] = useState(true);
  const [canManageUnits, setCanManageUnits] = useState(false);
  const [canViewBranchSettings, setCanViewBranchSettings] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(queryBranchId);
  const [searchQuery, setSearchQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState("ALL");
  const [unitToDelete, setUnitToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [unitForStaffAssignment, setUnitForStaffAssignment] = useState<any | null>(null);

  // Sync selected branch if query param or initialBranchId changes
  useEffect(() => {
    if (queryBranchId) {
      setSelectedBranchId(queryBranchId);
    } else if (!initialBranchId) {
      setSelectedBranchId("ALL");
    }
  }, [queryBranchId, initialBranchId]);

  const [marketSegments, setMarketSegments] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await atsApi.auth.getProfile();
      const permissions: string[] = currentUser?.permissions || [];
      setCanManageUnits(permissions.some(p => ["tenant:settings", "tenant:manage", "platform:manage", "branch_admin:manage"].includes(p)));
      setCanViewBranchSettings(permissions.some(p => ["tenant:settings", "tenant:manage", "platform:manage", "branch_admin:manage", "branch:edit"].includes(p)));
      const isGlobalAdmin = currentUser?.permissions?.includes("tenant:settings");
      const userBranchId = currentUser?.branchId;

      const [branchList, unitList, marketList] = await Promise.all([
        atsApi.branches.list().catch(() => []),
        atsApi.businessUnits.list().catch(() => []),
        atsApi.marketSegments.list().catch(() => []),
      ]);

      let finalBranches = Array.isArray(branchList) ? branchList : [];
      let finalUnits = Array.isArray(unitList) ? unitList : [];

      if (!isGlobalAdmin && userBranchId) {
        finalBranches = finalBranches.filter(b => b.id === userBranchId);
        finalUnits = finalUnits.filter(u => u.branchId === userBranchId);
      }

      setBranches(finalBranches);
      setUnits(finalUnits);
      setMarketSegments(Array.isArray(marketList) ? marketList : []);

      if (!isGlobalAdmin && userBranchId && (!selectedBranchId || selectedBranchId === "ALL")) {
        setSelectedBranchId(userBranchId);
      }
    } catch (err) {
      console.error("Failed to load units and branches:", err);
      toast.error("Failed to load Branch Units");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeBranch = useMemo(() => {
    if (!selectedBranchId || selectedBranchId === "ALL") return null;
    return branches.find((b) => b.id === selectedBranchId) || null;
  }, [branches, selectedBranchId]);

  // Filtered Branch Units
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      // Branch filter
      if (selectedBranchId && selectedBranchId !== "ALL" && u.branchId !== selectedBranchId) {
        return false;
      }
      // Market filter
      if (marketFilter !== "ALL") {
        if (u.marketSegmentId) {
          if (u.marketSegmentId !== marketFilter) return false;
        } else {
          // Fallback to legacy string match if no ID (for old data before migration)
          if (marketFilter === "US" && u.market !== "US") return false;
          if (marketFilter === "INDIA" && u.market !== "INDIA") return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (u.name || "").toLowerCase().includes(q);
        const matchesCode = (u.code || "").toLowerCase().includes(q);
        const matchesBranch = (u.branchName || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesBranch) return false;
      }
      return true;
    });
  }, [units, selectedBranchId, marketFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalStaff = filteredUnits.reduce((acc, u) => acc + (u.usersCount || 0), 0);
    const totalPods = filteredUnits.reduce((acc, u) => acc + (u.podsCount || 0), 0);
    const totalJobs = filteredUnits.reduce((acc, u) => acc + (u.jobsCount || 0), 0);
    return {
      count: filteredUnits.length,
      staff: totalStaff,
      pods: totalPods,
      jobs: totalJobs,
    };
  }, [filteredUnits]);

  const handleDeleteUnit = async () => {
    if (!unitToDelete) return;
    setIsDeleting(true);
    try {
      await atsApi.businessUnits.delete(unitToDelete.id);
      toast.success(`Branch Unit "${unitToDelete.name}" deleted successfully.`);
      setUnitToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete Branch Unit.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {hideTopHeader ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-blue-600" /> Branch Units &amp; Branch Units
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Configure market segments, work shifts, recruitment pods, and isolated job routing policies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManageUnits && (<Button
              onClick={() => {
                const url = selectedBranchId && selectedBranchId !== "ALL"
                  ? `/management/units/new?branchId=${selectedBranchId}`
                  : "/management/units/new";
                router.push(url);
              }}
              className="h-8.5 px-3.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Branch Unit
            </Button>)}
          </div>
        </div>
      ) : (
        /* Top Header */
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" /> Branch Units &amp; Branch Units
              </h1>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Configure market segments, work shifts, recruitment pods, and isolated job routing policies across branch locations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canViewBranchSettings && (<Button
              variant="outline"
              onClick={() => {
                if (onSwitchTab) {
                  onSwitchTab("branches");
                } else {
                  router.push("/management/branch");
                }
              }}
              className="h-8.5 px-3 text-xs font-semibold border-neutral-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Building2 className="h-3.5 w-3.5 text-neutral-500" /> View Branches
            </Button>)}

            {canManageUnits && (<Button
              onClick={() => {
                const url = selectedBranchId && selectedBranchId !== "ALL"
                  ? `/management/units/new?branchId=${selectedBranchId}`
                  : "/management/units/new";
                router.push(url);
              }}
              className="h-8.5 px-3.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Branch Unit
            </Button>)}
          </div>
        </div>
      )}

      {/* KPI METRIC STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 shadow-2xs p-4">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-400 block">
            {activeBranch ? `${activeBranch.name} Units` : "Total Units"}
          </span>
          <span className="text-xl font-bold text-neutral-900 dark:text-white mt-1 block">
            {stats.count}
          </span>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 shadow-2xs p-4">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-400 block">
            Active Staff
          </span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
            {stats.staff}
          </span>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 shadow-2xs p-4">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-400 block">
            Recruitment Pods
          </span>
          <span className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 block">
            {stats.pods}
          </span>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 shadow-2xs p-4">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-400 block">
            Active Requisitions
          </span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {stats.jobs}
          </span>
        </Card>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search units by name or code..."
              className="pl-8.5 h-8.5 text-xs bg-neutral-50 dark:bg-slate-850 rounded-lg border-neutral-200 dark:border-slate-700"
            />
          </div>

          {/* Branch Filter Dropdown */}
          <div className="w-52">
            <select
              value={selectedBranchId || "ALL"}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedBranchId(val);
                if (onSwitchTab) {
                  onSwitchTab("units", val && val !== "ALL" ? val : undefined);
                } else {
                  const newUrl = val && val !== "ALL"
                    ? `/management/units?branchId=${val}`
                    : "/management/units";
                  router.replace(newUrl);
                }
              }}
              className="w-full h-8.5 text-xs rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-850 px-2.5 font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer"
            >
              <option value="ALL">All Branch Locations ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city || "Unspecified"})
                </option>
              ))}
            </select>
          </div>

          {/* Market Filter */}
          <div className="w-36">
            <select
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value)}
              className="w-full h-8.5 text-xs rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-850 px-2.5 font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer"
            >
              <option value="ALL">All Markets</option>
              {marketSegments.map((seg) => (
                <option key={seg.id} value={seg.id}>
                  {seg.name} ({seg.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Chip if active */}
        {activeBranch && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs shrink-0 font-medium">
            <Building2 className="h-3.5 w-3.5" />
            <span>Filtered by: <strong>{activeBranch.name}</strong></span>
            <button
              onClick={() => {
                setSelectedBranchId("ALL");
                if (onSwitchTab) {
                  onSwitchTab("units");
                } else {
                  router.replace("/management/units");
                }
              }}
              className="ml-1 text-blue-500 hover:text-blue-800 dark:hover:text-blue-200 cursor-pointer"
              title="Clear branch filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Branch UnitS DATA TABLE (Dense & Scalable for 100+ units) */}
      <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 dark:bg-slate-800/40 border-b border-neutral-200 dark:border-slate-800 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                <th className="py-3.5 px-4">Unit Name</th>
                <th className="py-3.5 px-4">Unit Code</th>
                <th className="py-3.5 px-4">Branch</th>
                <th className="py-3.5 px-4">Market Segment</th>
                <th className="py-3.5 px-4">Hours &amp; Shift</th>
                <th className="py-3.5 px-4">Currency</th>
                <th className="py-3.5 px-4">Recruiter Staff</th>
                <th className="py-3.5 px-4">Recruitment Pods</th>
                <th className="py-3.5 px-4">Job Routing Policy</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100 dark:divide-slate-800 text-xs">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div><div className="h-2.5 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-blue-100 dark:bg-blue-900/40 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div><div className="h-2.5 w-32 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-5 w-24 bg-emerald-100/70 dark:bg-emerald-900/30 rounded-full"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div><div className="h-2.5 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700"></div><div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"></div></td>
                    <td className="px-4 py-3 text-center"><div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div></td>
                  </tr>
                ))
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <Layers className="h-10 w-10 text-neutral-300 dark:text-neutral-600" />
                      <p className="font-semibold text-neutral-700 dark:text-neutral-200 text-sm">
                        {searchQuery || selectedBranchId !== "ALL" || marketFilter !== "ALL"
                          ? "No matching Branch Units found"
                          : "No Branch Units configured"}
                      </p>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {searchQuery || selectedBranchId !== "ALL" || marketFilter !== "ALL"
                          ? "Try clearing your filters or search query to see all units."
                          : "Create your first Branch Unit to establish market shifts and recruitment pods."}
                      </p>
                      {canManageUnits && (<Button
                        onClick={() => {
                          const url = selectedBranchId && selectedBranchId !== "ALL"
                            ? `/management/units/new?branchId=${selectedBranchId}`
                            : "/management/units/new";
                          router.push(url);
                        }}
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Branch Unit
                      </Button>)}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUnits.map((u) => {
                  const branch = u.branch || branches.find((b) => b.id === (u.branchId || u.branch_id));
                  const branchName = branch?.name || u.branchName;
                  const branchCity = branch?.city;
                  const branchCountry = branch?.country;
                  const branchId = branch?.id || u.branchId;

                  return (
                    <tr key={u.id} className="hover:bg-neutral-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      {/* UNIT NAME */}
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white">
                        <div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/management/units/${u.id}/edit`)}
                              className="font-bold text-xs text-neutral-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left transition-colors cursor-pointer"
                            >
                              {u.name}
                            </button>
                          </div>
                          
                        </div>
                      </td>

                      {/* UNIT CODE */}
                      <td className="py-3.5 px-4">
                        {u.code ? (
                          <span className="px-1.5 py-0.5 rounded text-[10.5px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                            {u.code}
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-[10.5px] italic">No code</span>
                        )}
                      </td>

                      {/* BRANCH */}
                      <td className="py-3.5 px-4">
                        {branchName ? (
                          <div className="space-y-0.5">
                            <button
                              onClick={() => {
                                if (branchId) router.push(`/management/branch/${branchId}/edit`);
                              }}
                              className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 hover:text-indigo-600 hover:underline cursor-pointer block text-left"
                            >
                              {branchName}
                            </button>
                            <p className="text-[10.5px] text-neutral-400">
                              {branchCity || "City"}, {branchCountry || "India"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic text-[11px]">Unassigned Branch</span>
                        )}
                      </td>

                      {/* MARKET SEGMENT */}
                      <td className="py-3.5 px-4">
                        <span className="text-[10.5px] font-medium font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-slate-700">
                          {u.marketSegment?.name ?? (u.market === "US" ? "US IT Market" : "Domestic India")}
                        </span>
                      </td>

                      {/* HOURS & SHIFT */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-medium text-neutral-800 dark:text-neutral-200 text-xs">
                            {formatTime12(u.workStartTime)} - {formatTime12(u.workEndTime)}
                          </div>
                          <div className="text-[10.5px] text-neutral-400 font-mono">
                            {u.shiftTiming || (u.market === "US" ? "US Shift" : "General Shift")} {"\u2022"} {u.timezone ? u.timezone.split("/").pop()?.replace(/_/g, " ") : "IST"}
                          </div>
                        </div>
                      </td>

                      {/* CURRENCY */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-neutral-800 dark:text-neutral-200">
                        {u.currency || "INR"}
                      </td>

                      {/* RECRUITER STAFF */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => setUnitForStaffAssignment({
                            id: u.id,
                            name: u.name,
                            code: u.code,
                            branchName: branchName,
                            branchId: branchId,
                            market: u.market,
                          })}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/60 text-neutral-800 dark:text-neutral-200 hover:text-blue-700 dark:hover:text-blue-300 border border-neutral-200/80 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800 transition-colors cursor-pointer group"
                          title="Manage assigned staff members"
                        >
                          <Users className="h-3.5 w-3.5 text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                          <span>{u.usersCount || 0} Staff</span>
                          <Plus className="h-3 w-3 text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 ml-0.5" />
                        </button>
                      </td>

                      {/* RECRUITMENT PODS */}
                      <td className="py-3.5 px-4">
                        {!u.allowPods ? (
                          <span className="text-neutral-400 text-[10.5px] font-semibold">NA</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800">
                            {u.podsCount || 0} Pods
                          </span>
                        )}
                      </td>

                      {/* ROUTING POLICY SUMMARY */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {u.allowPods && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800">
                              Pods ({u.podDistributionStrategy === "MANUAL" ? "Manual" : "Auto"})
                            </span>
                          )}
                          {u.allowNone && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800">
                              Direct
                            </span>
                          )}
                          {u.allowUnassigned && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800">
                              Unassigned
                            </span>
                          )}
                          {!u.allowPods && !u.allowNone && !u.allowUnassigned && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-neutral-100 text-neutral-600 dark:bg-slate-800 dark:text-neutral-400 border border-neutral-200/80 dark:border-slate-700">
                              Standard Routing
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ACTIONS COLUMN - UNIVERSAL THREE-DOT DROPDOWN MENU */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end">
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="p-1 hover:bg-[#1a4fa0]/10 dark:hover:bg-slate-800 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-[#1a4fa0] dark:hover:text-blue-400 transition-colors cursor-pointer"
                                title="Actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              sideOffset={4}
                              className="w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-neutral-200/90 dark:border-slate-800 rounded-xl shadow-xl shadow-slate-900/10 dark:shadow-black/50 p-1.5 animate-in fade-in-0 zoom-in-95 z-[100] font-sans"
                            >
                              <div className="px-2.5 pt-1 pb-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                Unit Actions
                              </div>

                              <DropdownMenuItem
                                onClick={() => router.push(`/management/units/${u.id}/edit`)}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <div className="h-6 w-6 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </div>
                                <span>Edit Unit</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => setUnitForStaffAssignment({
                                  id: u.id,
                                  name: u.name,
                                  code: u.code,
                                  branchName: branchName,
                                  branchId: branchId,
                                  market: u.market,
                                })}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                                  <UserPlus className="h-3.5 w-3.5" />
                                </div>
                                <span>Assign Staff</span>
                              </DropdownMenuItem>

                              {branchId && canViewBranchSettings && (
                                <DropdownMenuItem
                                  onClick={() => router.push(`/management/branch/${branchId}/edit`)}
                                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <div className="h-6 w-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                                    <Building2 className="h-3.5 w-3.5" />
                                  </div>
                                  <span>View Branch</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator className="my-1 border-neutral-100 dark:border-slate-800" />

                              {canManageUnits && (<DropdownMenuItem
                                onClick={() => setUnitToDelete(u)}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              >
                                <div className="h-6 w-6 rounded-md bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-2xs">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </div>
                                <span>Delete Unit</span>
                              </DropdownMenuItem>)}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DELETE CONFIRMATION MODAL */}
      {unitToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Delete Branch Unit
                </h3>
                <p className="text-xs text-neutral-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to delete Branch Unit <strong>"{unitToDelete.name}"</strong>? All associated pod links and unit configurations will be removed.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setUnitToDelete(null)}
                className="h-8.5 px-3 text-xs font-semibold border-neutral-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteUnit}
                disabled={isDeleting}
                className="h-8.5 px-4 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN RECRUITER STAFF MODAL */}
      <AssignStaffModal
        isOpen={!!unitForStaffAssignment}
        onClose={() => setUnitForStaffAssignment(null)}
        unit={unitForStaffAssignment}
        onSaved={loadData}
      />
    </div>
  );
}

export default function UnitsManagementPage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-xs text-neutral-500 mt-2 font-medium">Loading units...</p>
      </div>
    }>
      <UnitsContent />
    </Suspense>
  );
}
