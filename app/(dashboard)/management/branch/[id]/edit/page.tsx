"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building2, MapPin, Check, Loader2, 
  Crown, MessageSquare, AlertCircle, Layers, Plus, ExternalLink, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";
import { parseTimeTo24, formatTimeDisplay } from "@/components/ui/shift-time-picker";

function formatUnitShiftTimes(start?: string, end?: string) {
  const s = parseTimeTo24(start || "09:30");
  const e = parseTimeTo24(end || "18:30");
  return `${formatTimeDisplay(s.hour24, s.minute, "12h")} – ${formatTimeDisplay(e.hour24, e.minute, "12h")}`;
}

export default function EditBranchPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    city: "",
    state: "",
    country: "India",
    street: "",
    pincode: "",
    managerId: "",
    enableGlobalRemarks: true,
  });

  const [branchUnits, setBranchUnits] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId) return;

    async function loadData() {
      setLoading(true);
      try {
        const [branch, units, users] = await Promise.all([
          atsApi.branches.get(branchId),
          atsApi.businessUnits.list(branchId).catch(() => []),
          atsApi.auth.listUsers().catch(() => []),
        ]);

        if (branch) {
          setFormData({
            name: branch.name || "",
            code: branch.code || "",
            city: branch.city || "",
            state: branch.state || "",
            country: branch.country || "India",
            street: branch.street || "",
            pincode: branch.pincode || "",
            managerId: branch.managerId || "",
            enableGlobalRemarks: branch.enableGlobalRemarks ?? true,
          });
        }
        if (Array.isArray(units)) {
          setBranchUnits(units);
        }
        if (Array.isArray(users)) {
          setAvailableUsers(users.filter((u: any) => u.isActive !== false));
        }
      } catch (err: any) {
        console.error("Failed to load branch details:", err);
        setFormError(err.message || "Failed to load branch details.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError("Branch Name is required.");
      return;
    }
    if (!formData.code.trim()) {
      setFormError("Branch Code is required.");
      return;
    }
    if (!formData.city.trim()) {
      setFormError("City is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        city: formData.city.trim(),
        state: formData.state.trim() || undefined,
        country: formData.country.trim() || "India",
        enableGlobalRemarks: formData.enableGlobalRemarks,
      };

      await atsApi.branches.update(branchId, payload);
      await atsApi.branches.updateManagers(branchId, formData.managerId ? [formData.managerId] : []);
      toast.success(`Branch "${formData.name}" updated successfully!`);
      router.push("/management/branch");
    } catch (err: any) {
      console.error("Update branch error:", err);
      setFormError(err.message || "Failed to update branch location.");
      toast.error(err.message || "Failed to update branch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-xs text-neutral-500 mt-2 font-medium">Loading branch details...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-600" /> Edit Branch
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Configure branch details and local office governance. Operating branch units, shifts, and job routing are managed in the Units module.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/management/branch")}
            className="h-9 px-4 text-xs font-semibold border-neutral-300 dark:border-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-9 px-5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
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
        {/* CARD 1: Identity */}
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Branch Identity
              </h2>
            </div>
            <span className="text-[10.5px] font-semibold text-neutral-400">Branch Details</span>
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Bhubaneswar Hub"
                  className="h-9.5 text-xs font-medium rounded-lg border-neutral-300 dark:border-slate-700"
                  required
                />
                <span className="text-[10px] text-neutral-400 block">The official name for this branch location.</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Branch Code <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. BBS"
                  className="h-9.5 text-xs font-mono font-bold uppercase rounded-lg border-neutral-300 dark:border-slate-700"
                  required
                />
                <span className="text-[10px] text-neutral-400 block">Short 2–4 letter branch identifier (e.g. BBS, DAL). Used in reporting and reference codes.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: Location & Address */}
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Geographical Location &amp; Address
              </h2>
            </div>
            <span className="text-[10.5px] font-semibold text-neutral-400">Postal Specifications</span>
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  City <span className="text-red-500">*</span>
                </label>
                <CityAutocomplete
                  value={formData.city}
                  onChange={(city, state, country) => {
                    setFormData((prev) => ({
                      ...prev,
                      city: city || "",
                      state: state !== undefined ? state : prev.state,
                      country: country !== undefined ? country : prev.country,
                    }));
                  }}
                  placeholder="Search city (auto-fills state/country)..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  State / Province
                </label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g. Odisha, Texas"
                  className="h-9.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Country
                </label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g. India, United States"
                  className="h-9.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Street Address / Office Premises
                </label>
                <Input
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  placeholder="e.g. Infocity, Patia, Floor 4"
                  className="h-9.5 text-xs rounded-lg border-neutral-300 dark:border-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Postal / Zip Code
                </label>
                <Input
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="e.g. 751024, 75001"
                  className="h-9.5 text-xs font-mono rounded-lg border-neutral-300 dark:border-slate-700"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: Administration & Oversight */}
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Branch Administration &amp; Governance
              </h2>
            </div>
            <span className="text-[10.5px] font-semibold text-neutral-400">Head of Office</span>
          </div>

          <CardContent className="p-6 space-y-5">
            <div className="space-y-1.5 max-w-md">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                Branch Head / Location Admin
              </label>
              <select
                value={formData.managerId}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                className="w-full h-9.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 font-medium text-neutral-900 dark:text-white cursor-pointer"
              >
                <option value="">Unassigned (Assign Later)</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.name || u.email} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-neutral-500" />
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Enable Global Remarks Templates
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Allow recruiters and coordinators at this location to use organization-wide remarks templates.
                </p>
              </div>

              <input
                type="checkbox"
                checked={formData.enableGlobalRemarks}
                onChange={(e) => setFormData({ ...formData, enableGlobalRemarks: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: Branch Units Hosted in this Branch */}
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-xs rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Branch Units ({branchUnits.length})
                </h2>
                <p className="text-[11px] text-neutral-400">Practice divisions and market segments operating from this branch</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/management/units?branchId=${branchId}`)}
                className="h-8 px-2.5 text-xs font-semibold border-neutral-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View in Units Table</span> <ExternalLink className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                onClick={() => router.push(`/management/units/new?branchId=${branchId}`)}
                className="h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add Unit
              </Button>
            </div>
          </div>

          <CardContent className="p-4">
            {branchUnits.length === 0 ? (
              <div className="p-8 text-center text-neutral-400">
                <Layers className="h-8 w-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">No Branch Units configured</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Add an branch unit to configure market segment, shifts, pods, and routing policies.</p>
                <Button
                  type="button"
                  onClick={() => router.push(`/management/units/new?branchId=${branchId}`)}
                  className="mt-3 h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add First Branch Unit
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-slate-800">
                {branchUnits.map((u) => (
                  <div key={u.id} className="py-3 px-2 flex items-center justify-between hover:bg-neutral-50/50 dark:hover:bg-slate-800/40 rounded-lg transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">{u.name}</span>
                        {u.code && (
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                            {u.code}
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-medium bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400">
                          {u.market === "US" ? "US IT" : "Domestic India"}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        {u.shiftTiming || 'General Shift'} ({formatUnitShiftTimes(u.workStartTime, u.workEndTime)}) • Currency: {u.currency || 'INR'} • {u.usersCount || 0} Staff
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/management/units/${u.id}/edit`)}
                        className="h-7 text-[11px] font-semibold border-neutral-300 dark:border-slate-700"
                      >
                        Edit Unit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-slate-800">
          <Link
            href="/management/branch"
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
          >
            ← Cancel and return
          </Link>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/management/branch")}
              className="h-9 px-4 text-xs font-semibold border-neutral-300 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-6 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
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
      </form>
    </div>
  );
}
