"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { atsApi } from "@/lib/ats-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Building,
  Save,
  Loader2,
  UserCheck,
  ShieldCheck,
  Globe,
  MessageSquare,
  FileCheck,
  Tag,
  CreditCard
} from "lucide-react";
import toast from "react-hot-toast";
import { Country, State, City } from "country-state-city";

export default function EditClientCRMPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingClients, setExistingClients] = useState<any[]>([]);

  // End client selection mode: '__SAME__', '__CUSTOM__', or specific client name
  const [endClientSelectionMode, setEndClientSelectionMode] = useState<string>("__SAME__");

  const [formData, setFormData] = useState<any>({
    client_name: "",
    end_client_name: "",
    is_same_as_primary: true,
    market: "US",
    status: "Active",
    contact_person: "",
    contact_designation: "",
    email_id: "",
    contact_number: "",
    website: "",
    industry: "",
    countryIso: "",
    stateIso: "",
    city: "",
    payment_terms: "Net 30",
    federal_id: "",
    gstin: "",
    pan_number: "",
    currency: "USD",
    tier_rating: "TIER_1",
    credit_check_status: "APPROVED",
    fillability_score: "HIGH",
    vetting_notes: "",
    onboarding_status: "ACTIVE",
    msa_signed: false,
    sow_executed: false,
    coi_received: false,
    vendor_portal_created: false,
  });

  const fetchClientData = useCallback(async () => {
    if (!clientId) return;
    setIsLoading(true);
    try {
      const data = await atsApi.clients.get(clientId);
      const allClientsList = await atsApi.clients.list();
      setExistingClients(allClientsList || []);

      const isSame = data?.is_same_as_primary !== false;
      const initialEndMode = isSame ? "__SAME__" : (data?.end_client_name || "__CUSTOM__");
      setEndClientSelectionMode(initialEndMode);

      setFormData({
        client_name: data?.client_name || "",
        end_client_name: data?.end_client_name || data?.client_name || "",
        is_same_as_primary: isSame,
        market: data?.market || "US",
        status: data?.status || "Active",
        contact_person: data?.contact_person || data?.client_lead || "",
        contact_designation: data?.contact_designation || "",
        email_id: data?.email_id || "",
        contact_number: data?.contact_number || "",
        website: data?.website || "",
        industry: data?.industry || "",
        countryIso: "",
        stateIso: "",
        city: data?.city || "",
        payment_terms: data?.payment_terms || "Net 30",
        federal_id: data?.federal_id || "",
        gstin: data?.gstin || "",
        pan_number: data?.pan_number || "",
        currency: data?.currency || "USD",
        tier_rating: data?.tier_rating || "TIER_1",
        credit_check_status: data?.credit_check_status || "APPROVED",
        fillability_score: data?.fillability_score || "HIGH",
        vetting_notes: data?.vetting_notes || data?.comments || "",
        onboarding_status: data?.onboarding_status || "ACTIVE",
        msa_signed: !!data?.msa_signed,
        sow_executed: !!data?.sow_executed,
        coi_received: !!data?.coi_received,
        vendor_portal_created: !!data?.vendor_portal_created,
      });
    } catch (err) {
      console.error("Failed to fetch client for edit:", err);
      toast.error("Failed to load client details.");
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  // Sync end_client_name when mode or client_name changes
  useEffect(() => {
    if (endClientSelectionMode === "__SAME__") {
      setFormData((prev: any) => ({
        ...prev,
        is_same_as_primary: true,
        end_client_name: prev.client_name,
      }));
    } else if (endClientSelectionMode !== "__CUSTOM__") {
      setFormData((prev: any) => ({
        ...prev,
        is_same_as_primary: false,
        end_client_name: endClientSelectionMode,
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        is_same_as_primary: false,
      }));
    }
  }, [formData.client_name, endClientSelectionMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev: any) => {
      const updated = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "market") {
        updated.currency = value === "INDIA" ? "INR" : "USD";
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name.trim()) {
      toast.error("Primary Client Name is required.");
      return;
    }

    setIsSaving(true);
    try {
      let finalEndClientName = formData.client_name.trim();
      if (endClientSelectionMode === "__SAME__") {
        finalEndClientName = formData.client_name.trim();
      } else if (endClientSelectionMode === "__CUSTOM__") {
        finalEndClientName = formData.end_client_name.trim() || formData.client_name.trim();
      } else {
        finalEndClientName = endClientSelectionMode;
      }

      await atsApi.clients.update(clientId, {
        ...formData,
        client_name: formData.client_name.trim(),
        end_client_name: finalEndClientName,
        is_same_as_primary: endClientSelectionMode === "__SAME__",
      });

      toast.success(`Client "${formData.client_name}" updated successfully!`);
      router.push(`/clients/${clientId}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update client.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Loading Client CRM Editor...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 bg-neutral-50 dark:bg-slate-950 font-sans p-6 overflow-auto">
      <div className="max-w-5xl w-full mx-auto space-y-6 pb-12">
        {/* HEADER BAR */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/clients/${clientId}`)} className="h-8 w-8 rounded-full bg-white dark:bg-slate-900 shadow-xs border border-neutral-200 dark:border-slate-800 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Building className="h-5 w-5 text-indigo-600" /> Edit Client Account CRM
              </h1>
              <p className="text-xs text-neutral-500">Updating master account record for <strong className="text-neutral-800 dark:text-white">{formData.client_name}</strong></p>
            </div>
          </div>
          <Badge className={formData.market === "US" ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"}>
            {formData.market === "US" ? "US IT Market ($)" : "India Domestic Market (₹)"}
          </Badge>
        </div>

        {/* FULL CRM EDIT FORM */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
          {/* SECTION 1: IDENTITY & END CLIENT */}
          <div className="space-y-4 border-b border-neutral-150 dark:border-slate-800 pb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Building className="h-4 w-4" /> 1. Client Identity &amp; End Client Dropdown
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Primary Contracting Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  placeholder="e.g. Wipro, TekSystems, HDFC Bank"
                  className="w-full px-3 py-2 text-xs font-semibold bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  End Client (Workplace Site / Mandate)
                </label>
                <select
                  value={endClientSelectionMode}
                  onChange={(e) => setEndClientSelectionMode(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="__SAME__">Same as Primary Client (Direct Client Mandate)</option>
                  {existingClients.length > 0 && (
                    <optgroup label="Existing System Clients">
                      {existingClients
                        .filter((c) => c.client_name && c.client_name !== formData.client_name)
                        .map((c) => (
                          <option key={c.id} value={c.client_name}>
                            {c.client_name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  <option value="__CUSTOM__">+ Enter New Custom End Client...</option>
                </select>

                {endClientSelectionMode === "__CUSTOM__" && (
                  <input
                    name="end_client_name"
                    value={formData.end_client_name}
                    onChange={handleChange}
                    placeholder="Enter custom End Client name (e.g. Bank of America, Apple)"
                    className="w-full mt-2 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Industry</label>
                <input
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  placeholder="e.g. Information Technology, Financial Services"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Website</label>
                <input
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://company.com"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: POINT OF CONTACT (POC) */}
          <div className="space-y-4 border-b border-neutral-150 dark:border-slate-800 pb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <UserCheck className="h-4 w-4" /> 2. Point of Contact (POC) &amp; Communication Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">POC Contact Name</label>
                <input
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  placeholder="e.g. John Smith, Ramesh Kumar"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">POC Title / Designation</label>
                <input
                  name="contact_designation"
                  value={formData.contact_designation}
                  onChange={handleChange}
                  placeholder="e.g. VMS Lead, HR Director"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">POC Work Email</label>
                <input
                  type="email"
                  name="email_id"
                  value={formData.email_id}
                  onChange={handleChange}
                  placeholder="john.smith@client.com"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">POC Phone / Contact Number</label>
                <input
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  placeholder="+1 (555) 019-8234"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: MARKET & TAX IDENTIFIERS */}
          <div className="space-y-4 border-b border-neutral-150 dark:border-slate-800 pb-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Globe className="h-4 w-4" /> 3. Market Alignment &amp; Tax Identifiers
              </h3>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Target Market:</span>
                <select
                  name="market"
                  value={formData.market}
                  onChange={handleChange}
                  className="text-xs font-bold px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-md text-indigo-700 dark:text-indigo-300"
                >
                  <option value="US">US IT Staffing Market ($)</option>
                  <option value="INDIA">India Domestic Market (₹)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {formData.market === "INDIA" ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">GSTIN Number</label>
                    <input
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleChange}
                      placeholder="22AAAAA0000A1Z5"
                      className="w-full px-3 py-2 text-xs uppercase font-mono bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">PAN Number</label>
                    <input
                      name="pan_number"
                      value={formData.pan_number}
                      onChange={handleChange}
                      placeholder="ABCDE1234F"
                      className="w-full px-3 py-2 text-xs uppercase font-mono bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Federal EIN / Tax ID</label>
                  <input
                    name="federal_id"
                    value={formData.federal_id}
                    onChange={handleChange}
                    placeholder="12-3456789"
                    className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Payment Terms</label>
                <select
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                >
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 45">Net 45 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                  <option value="Paid When Paid">Paid When Paid (PWP)</option>
                  <option value="Immediate">Immediate / Advance</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: QUALIFIER & ONBOARDING CHECKLIST */}
          <div className="space-y-4 border-b border-neutral-150 dark:border-slate-800 pb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> 4. Qualification Rating &amp; Onboarding Verification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Client Tier Rating</label>
                <select
                  name="tier_rating"
                  value={formData.tier_rating}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                >
                  <option value="TIER_1">Tier 1 (Direct VMS / Preferred)</option>
                  <option value="TIER_2">Tier 2 (Implementation Partner)</option>
                  <option value="TIER_3">Tier 3 (Subcontract Vendor)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Credit Check Vetting</label>
                <select
                  name="credit_check_status"
                  value={formData.credit_check_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                >
                  <option value="APPROVED">Approved Credit</option>
                  <option value="PENDING_CHECK">Pending Check</option>
                  <option value="HIGH_RISK">High Financial Risk</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Fillability Rating</label>
                <select
                  name="fillability_score"
                  value={formData.fillability_score}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                >
                  <option value="HIGH">High (Fast Closure / Hot Account)</option>
                  <option value="MEDIUM">Medium (Standard Responsiveness)</option>
                  <option value="LOW">Low (Slow Feedback / Hard to Fill)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-950/20 text-xs font-semibold cursor-pointer">
                <span>MSA Signed</span>
                <Switch checked={formData.msa_signed} onCheckedChange={(val) => setFormData((p: any) => ({ ...p, msa_signed: val }))} />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-950/20 text-xs font-semibold cursor-pointer">
                <span>VMS Configured</span>
                <Switch checked={formData.vendor_portal_created} onCheckedChange={(val) => setFormData((p: any) => ({ ...p, vendor_portal_created: val }))} />
              </label>
            </div>
          </div>


          {/* SECTION 5: INTERNAL CRM NOTES & COMMENT BOX */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" /> 5. Internal CRM Notes &amp; Account Comments Box
            </h3>
            <p className="text-[11px] text-neutral-500">
              Type internal notes, recruiter guidelines, interview feedback preferences, fee structures, or account history.
            </p>
            <textarea
              name="vetting_notes"
              rows={4}
              value={formData.vetting_notes}
              onChange={handleChange}
              placeholder="e.g. Preferred vendor for Cloud Requisitions. Client requires 2-round technical interview process. Invoice contact prefers Net 45 billing cycle."
              className="w-full p-3 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 transition-all font-sans leading-relaxed"
            />
          </div>

          {/* FORM ACTIONS */}
          <div className="pt-4 border-t border-neutral-200 dark:border-slate-800 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.push(`/clients/${clientId}`)} disabled={isSaving} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Client CRM Record
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
