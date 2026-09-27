"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { atsApi } from "@/lib/ats-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ArrowLeft,
  Building,
  Save,
  Loader2,
  UserCheck,
  ShieldCheck,
  Globe,
  Briefcase,
  Edit,
  CheckCircle2,
  FileCheck,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  Tag,
  CreditCard
} from "lucide-react";
import toast from "react-hot-toast";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "tax" | "qualifier" | "jobs">("overview");
  const [clientData, setClientData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clientToReject, setClientToReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  useEffect(() => {
    atsApi.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  const userRoles = (currentUser?.roles || []).map((r: string) => String(r).toUpperCase().replace(/[\s-_]+/g, ''));
  const userPermissions = currentUser?.permissions || [];
  const isSuperOrAdmin = userRoles.includes('TENANT_ADMIN') || userRoles.includes('SUPERADMIN') || userRoles.includes('SUPER_ADMIN');
  const canApproveRejectClient = 
    userPermissions.includes('client:approve') || 
    userPermissions.includes('client:reject') ||
    (userPermissions.length === 0 && isSuperOrAdmin);

  // Editable Form State
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
    country: "",
    state: "",
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

  const fetchClientDetails = useCallback(async () => {
    if (!clientId) return;
    setIsLoading(true);
    try {
      const data = await atsApi.clients.get(clientId);
      setClientData(data);
      setFormData({
        client_name: data?.client_name || "",
        end_client_name: data?.end_client_name || data?.client_name || "",
        is_same_as_primary: data?.is_same_as_primary !== false,
        market: data?.market || "US",
        status: data?.status || "Active",
        contact_person: data?.contact_person || data?.client_lead || "",
        contact_designation: data?.contact_designation || "",
        email_id: data?.email_id || "",
        contact_number: data?.contact_number || "",
        website: data?.website || "",
        industry: data?.industry || "",
        country: data?.country || "",
        state: data?.state || "",
        city: data?.city || "",
        payment_terms: data?.payment_terms || "Net 30",
        federal_id: data?.federal_id || "",
        gstin: data?.gstin || "",
        pan_number: data?.pan_number || "",
        currency: data?.currency || "USD",
        tier_rating: data?.tier_rating || "TIER_1",
        credit_check_status: data?.credit_check_status || "APPROVED",
        fillability_score: data?.fillability_score || "HIGH",
        vetting_notes: data?.vetting_notes || "",
        onboarding_status: data?.onboarding_status || "ACTIVE",
        msa_signed: data?.msa_signed === true,
        sow_executed: data?.sow_executed === true,
        coi_received: data?.coi_received === true,
        vendor_portal_created: data?.vendor_portal_created === true,
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load client details.");
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientDetails();
  }, [fetchClientDetails]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name.trim()) {
      toast.error("Client Name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await atsApi.clients.update(clientId, formData);
      setClientData(updated);
      setIsEditing(false);
      toast.success("Client details updated successfully!");
      fetchClientDetails();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update client.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    setIsProcessingApproval(true);
    const toastId = toast.loading("Approving client account...");
    try {
      await atsApi.clients.approve(clientId);
      toast.success("Client account approved & activated successfully!", { id: toastId });
      fetchClientDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve client.", { id: toastId });
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }
    setIsProcessingApproval(true);
    const toastId = toast.loading("Rejecting client account...");
    try {
      await atsApi.clients.reject(clientId, rejectReason);
      toast.success("Client account rejected.", { id: toastId });
      setClientToReject(false);
      setRejectReason("");
      fetchClientDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject client.", { id: toastId });
    } finally {
      setIsProcessingApproval(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Loading Client 360° Profile...</p>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-red-500 font-semibold">Client not found or deleted.</p>
        <Button onClick={() => router.push("/clients/all")} variant="outline" size="sm">
          Return to Clients List
        </Button>
      </div>
    );
  }

  const isIndiaMarket = clientData?.market === "INDIA" || (clientData?.business_unit || "").toLowerCase().includes("domestic") || (clientData?.business_unit || "").toLowerCase().includes("bbsr");
  const isPendingApproval = clientData?.status === "Pending Approval" || clientData?.approval_status === "PENDING_APPROVAL";
  const isRejected = clientData?.status === "Rejected" || clientData?.approval_status === "REJECTED";

  return (
    <div className="h-full flex flex-col min-h-0 bg-neutral-50 dark:bg-slate-950 font-sans p-6 overflow-auto">
      <div className="max-w-6xl w-full mx-auto space-y-6 pb-12">
        {/* APPROVAL STATUS NOTICES */}
        {isPendingApproval && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Client Account is Pending Approval
                </h4>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                  Job requisitions mapped to this client cannot go Live / Active until an authorized Delivery Head, Tenant Admin, or Branch Admin approves this account.
                </p>
              </div>
            </div>

            {canApproveRejectClient && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={isProcessingApproval}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8"
                >
                  Approve Client
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setClientToReject(true)}
                  disabled={isProcessingApproval}
                  className="border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold h-8"
                >
                  Reject Client
                </Button>
              </div>
            )}
          </div>
        )}

        {isRejected && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 flex items-start justify-between gap-3 shadow-xs">
            <div>
              <h4 className="text-xs font-bold text-red-900 dark:text-red-200 flex items-center gap-2">
                Client Account Rejected
              </h4>
              <p className="text-[11px] text-red-800 dark:text-red-300 mt-0.5">
                Feedback: {clientData.rejection_reason || "Rejected by Reviewer"}. Jobs under this client cannot be activated.
              </p>
            </div>
            {canApproveRejectClient && (
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={isProcessingApproval}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 shrink-0"
              >
                Re-approve & Activate
              </Button>
            )}
          </div>
        )}

        {/* HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-6 rounded-xl shadow-xs">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/clients/all")} className="h-9 w-9 rounded-full bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-800 cursor-pointer shrink-0 mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                  {clientData.client_code}
                </span>
                <Badge className={isIndiaMarket ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                  {isIndiaMarket ? "🇮🇳 India Domestic (₹)" : "🇺🇸 USA IT ($)"}
                </Badge>
                <Badge className={
                  isPendingApproval 
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : isRejected
                    ? "bg-red-50 text-red-700 border-red-300"
                    : clientData.status === "Active" 
                    ? "bg-green-50 text-green-700 border-green-200" 
                    : "bg-neutral-100 text-neutral-700 border-neutral-300"
                }>
                  {isPendingApproval ? "Pending Approval" : isRejected ? "Rejected" : clientData.status}
                </Badge>
              </div>

              <h1 className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
                {clientData.client_name}
              </h1>

              <div className="flex items-center gap-4 text-xs text-neutral-500 mt-1.5 flex-wrap">
                <span>Business Unit: <strong className="text-neutral-700 dark:text-neutral-300">{clientData.business_unit || "Default"}</strong></span>
                <span>•</span>
                <span>Primary Owner: <strong className="text-neutral-700 dark:text-neutral-300">{clientData.primary_owner || "N/A"}</strong></span>
                <span>•</span>
                <span>Active Jobs: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{clientData.active_jobs_count || 0}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving} className="text-xs font-semibold">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                {isPendingApproval && canApproveRejectClient && (
                  <Button
                    onClick={handleApprove}
                    disabled={isProcessingApproval}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve Account
                  </Button>
                )}

                <Button onClick={() => router.push(`/clients/${clientId}/edit`)} variant="outline" className="text-xs font-bold flex items-center gap-1.5 border-neutral-300">
                  <Edit className="h-3.5 w-3.5 text-indigo-600" /> Edit CRM Profile
                </Button>

                <Button
                  variant="outline"
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to soft-delete '${clientData.client_name}'? This client will be archived.`)) {
                      try {
                        await atsApi.clients.delete(clientId);
                        toast.success(`Client '${clientData.client_name}' soft-deleted.`);
                        router.push("/clients/all");
                      } catch (err) {
                        toast.error("Failed to delete client.");
                      }
                    }
                  }}
                  className="text-xs font-bold border-red-200 text-red-600 hover:bg-red-50"
                >
                  Soft Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* REJECT CLIENT MODAL */}
        {clientToReject && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Reject Client Account
              </h3>
              <p className="text-xs text-neutral-500">
                Please provide rejection feedback for <strong>{clientData.client_name}</strong>.
              </p>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (e.g. Duplicate account, incomplete company details)..."
                className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setClientToReject(false);
                    setRejectReason("");
                  }}
                  disabled={isProcessingApproval}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isProcessingApproval || !rejectReason.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Building className="h-4 w-4" /> Overview &amp; POC Contact
          </button>
          <button
            onClick={() => setActiveTab("tax")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "tax"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Globe className="h-4 w-4" /> Market &amp; Tax Identifiers
          </button>
          <button
            onClick={() => setActiveTab("qualifier")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "qualifier"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> Qualifier &amp; Onboarding
          </button>
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "jobs"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Briefcase className="h-4 w-4" /> Associated Jobs ({clientData?.associated_jobs?.length || 0})
          </button>
        </div>

        {/* TAB CONTENTS */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                    <Building className="h-4 w-4" /> Primary &amp; End Client Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-neutral-700 dark:text-neutral-300">Primary Client Name</label>
                    {isEditing ? (
                      <input
                        name="client_name"
                        value={formData.client_name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none"
                      />
                    ) : (
                      <p className="font-semibold text-neutral-900 dark:text-white text-sm">{clientData.client_name}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-neutral-700 dark:text-neutral-300">End Client Name</label>
                    {isEditing ? (
                      <input
                        name="end_client_name"
                        value={formData.end_client_name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none"
                      />
                    ) : (
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {clientData.end_client_name || clientData.client_name}{" "}
                        {clientData.is_same_as_primary ? <span className="text-[10px] text-neutral-400 font-normal italic">(Same as Primary)</span> : null}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Industry</span>
                      <p className="font-semibold text-neutral-800 dark:text-neutral-200">{clientData.industry || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Website</span>
                      {clientData.website ? (
                        <a href={clientData.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                          {clientData.website} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="text-neutral-500">N/A</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* POC Card */}
              <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4" /> Point of Contact (POC) Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-neutral-700 dark:text-neutral-300">POC Contact Name</label>
                    {isEditing ? (
                      <input
                        name="contact_person"
                        value={formData.contact_person}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none"
                      />
                    ) : (
                      <p className="font-semibold text-neutral-900 dark:text-white text-sm">{clientData.contact_person || clientData.client_lead || "N/A"}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-neutral-700 dark:text-neutral-300">POC Title / Designation</label>
                    {isEditing ? (
                      <input
                        name="contact_designation"
                        value={formData.contact_designation}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none"
                      />
                    ) : (
                      <p className="font-semibold text-neutral-800 dark:text-neutral-200">{clientData.contact_designation || "N/A"}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Work Email</span>
                      <p className="font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                        <Mail className="h-3 w-3 text-neutral-400" /> {clientData.email_id || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Phone Number</span>
                      <p className="font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-neutral-400" /> {clientData.contact_number || "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: MARKET & TAX IDENTIFIERS */}
          {activeTab === "tax" && (
            <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-fadeIn">
              <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <Globe className="h-4 w-4" /> Market Alignment, Tax IDs &amp; Payment Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">Target Market</label>
                  {isEditing ? (
                    <select
                      name="market"
                      value={formData.market}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none"
                    >
                      <option value="US">US IT Staffing Market ($)</option>
                      <option value="INDIA">India Domestic Market (₹)</option>
                    </select>
                  ) : (
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">{isIndiaMarket ? "India Domestic (₹)" : "US IT Market ($)"}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">Payment Terms</label>
                  {isEditing ? (
                    <input
                      name="payment_terms"
                      value={formData.payment_terms}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none"
                    />
                  ) : (
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">{clientData.payment_terms || "Net 30"}</p>
                  )}
                </div>

                {isIndiaMarket ? (
                  <>
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">GSTIN Number</label>
                      <p className="font-mono font-bold text-neutral-900 dark:text-white uppercase">{clientData.gstin || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">PAN Number</label>
                      <p className="font-mono font-bold text-neutral-900 dark:text-white uppercase">{clientData.pan_number || "N/A"}</p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <label className="font-bold text-neutral-700 dark:text-neutral-300">Federal EIN / Tax ID</label>
                    <p className="font-mono font-bold text-neutral-900 dark:text-white">{clientData.federal_id || "N/A"}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 3: QUALIFIER & ONBOARDING */}
          {activeTab === "qualifier" && (
            <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-fadeIn">
              <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Qualification Rating &amp; Onboarding Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-6 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Client Tier Rating</span>
                    <Badge variant="outline" className="text-xs font-bold border-indigo-300 text-indigo-700 bg-indigo-50/50 mt-1">
                      {clientData.tier_rating ? clientData.tier_rating.replace('_', ' ') : "TIER 1"}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-neutral-400 block text-[11px]">Credit Check Status</span>
                    <Badge variant="outline" className="text-xs font-bold border-emerald-300 text-emerald-700 bg-emerald-50/50 mt-1">
                      {clientData.credit_check_status || "APPROVED"}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-neutral-400 block text-[11px]">Fillability Rating</span>
                    <p className="font-bold text-neutral-800 dark:text-neutral-200 mt-1">{clientData.fillability_score || "HIGH"}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-150 dark:border-slate-800">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 block mb-3">Onboarding Documents Checklist</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`p-3 rounded-lg border flex items-center justify-between ${clientData.msa_signed ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-neutral-50 border-neutral-200 text-neutral-500"}`}>
                      <span className="font-semibold">MSA Signed</span>
                      <CheckCircle2 className={`h-4 w-4 ${clientData.msa_signed ? "text-emerald-600" : "text-neutral-300"}`} />
                    </div>

                    <div className={`p-3 rounded-lg border flex items-center justify-between ${clientData.sow_executed ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-neutral-50 border-neutral-200 text-neutral-500"}`}>
                      <span className="font-semibold">SOW Executed</span>
                      <CheckCircle2 className={`h-4 w-4 ${clientData.sow_executed ? "text-emerald-600" : "text-neutral-300"}`} />
                    </div>

                    <div className={`p-3 rounded-lg border flex items-center justify-between ${clientData.coi_received ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-neutral-50 border-neutral-200 text-neutral-500"}`}>
                      <span className="font-semibold">COI Received</span>
                      <CheckCircle2 className={`h-4 w-4 ${clientData.coi_received ? "text-emerald-600" : "text-neutral-300"}`} />
                    </div>

                    <div className={`p-3 rounded-lg border flex items-center justify-between ${clientData.vendor_portal_created ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-neutral-50 border-neutral-200 text-neutral-500"}`}>
                      <span className="font-semibold">VMS Configured</span>
                      <CheckCircle2 className={`h-4 w-4 ${clientData.vendor_portal_created ? "text-emerald-600" : "text-neutral-300"}`} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: ASSOCIATED JOBS */}
          {activeTab === "jobs" && (
            <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-fadeIn">
              <CardHeader className="pb-3 border-b border-neutral-150 dark:border-slate-800 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" /> Associated Jobs &amp; Requisitions ({clientData?.associated_jobs?.length || 0})
                  </CardTitle>
                  <CardDescription className="text-[11px] text-neutral-500 mt-0.5">
                    Jobs where this client is either the Primary Contracting Client or the End Workplace Client.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => router.push("/jobs/new")} className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
                  + Create Job
                </Button>
              </CardHeader>
              <CardContent className="pt-4">
                {(!clientData.associated_jobs || clientData.associated_jobs.length === 0) ? (
                  <p className="text-xs text-neutral-500 text-center py-6">No jobs currently linked to this client.</p>
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-slate-800">
                    {clientData.associated_jobs.map((job: any) => (
                      <div key={job.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-600">{job.job_code}</span>
                            <span className="font-bold text-neutral-900 dark:text-white">{job.job_title}</span>
                            <Badge variant="outline" className="text-[9px]">{job.status}</Badge>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Primary: {job.client_name} • End Client: {job.end_client_name || job.client_name} • Location: {job.job_location || "N/A"}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => router.push(`/jobs/details/${job.id}`)} className="h-7 text-xs text-indigo-600 font-bold">
                          View Job →
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  );
}
