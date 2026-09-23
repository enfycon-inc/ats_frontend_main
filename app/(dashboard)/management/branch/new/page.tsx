"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building2, MapPin, Check, Loader2, 
  Sparkles, ShieldCheck, Crown, MessageSquare, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";

export default function CreateBranchPage() {
  const router = useRouter();

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

  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const users = await atsApi.auth.listUsers();
        if (Array.isArray(users)) {
          setAvailableUsers(users.filter((u: any) => u.isActive !== false));
        }
      } catch (err) {
        console.warn("Failed to load users for branch manager assignment", err);
      }
    }
    loadUsers();
  }, []);

  const handleNameChange = (val: string) => {
    setFormData((prev) => {
      // Auto-suggest 3-letter code if code was empty or matches previous derivation
      const prevExpected = prev.name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
      const nextExpected = val.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
      const codeIsDefaultOrEmpty = !prev.code || prev.code === prevExpected;

      return {
        ...prev,
        name: val,
        code: codeIsDefaultOrEmpty ? nextExpected : prev.code,
      };
    });
  };

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

      const created = await atsApi.branches.create(payload);

      // If manager selected, assign manager
      if (formData.managerId && created?.id) {
        try {
          await atsApi.branches.updateManagers(created.id, [formData.managerId]);
        } catch (mErr) {
          console.warn("Manager assignment notice:", mErr);
        }
      }

      toast.success(`Branch "${formData.name}" established successfully!`);
      router.push("/management/branch");
    } catch (err: any) {
      console.error("Create branch error:", err);
      setFormError(err.message || "Failed to create branch location.");
      toast.error(err.message || "Failed to create branch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-600" /> Create Branch
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Add a new branch location. Operating practice divisions, shifts, and job routing are configured per Operating Unit.
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
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> Create Branch
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
        {/* CARD 1: Branch Identity */}
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
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Bhubaneswar Office, Dallas Tech Center, London Hub"
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
                  placeholder="e.g. BBS, DAL, LON, VIZ"
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
                  placeholder="e.g. Odisha, Texas, California"
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
                  placeholder="e.g. Infocity, Patia, Floor 4, Suite 402"
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
              <span className="text-[10px] text-neutral-400 block">The primary person responsible for local branch administration.</span>
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
                  Allow recruiters and coordinators at this location to use organization-wide remarks templates during candidate screening.
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
                  <Check className="h-3.5 w-3.5" /> Save Branch Location
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
