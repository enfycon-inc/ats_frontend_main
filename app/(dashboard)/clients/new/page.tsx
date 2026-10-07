"use client";
 
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { atsApi } from "@/lib/ats-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Building, Save, Loader2, UserCheck, ShieldCheck, Globe, ChevronDown, ChevronUp, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Country, State, City } from "country-state-city";
 
export default function NewClientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [existingClients, setExistingClients] = useState<any[]>([]);

  // End client selection mode: '__SAME__', '__CUSTOM__', or specific client name
  const [endClientSelectionMode, setEndClientSelectionMode] = useState<string>("__SAME__");

  const [formData, setFormData] = useState({
    clientName: "",
    isSameAsPrimary: true,
    endClientName: "",
    market: "INDIA", // Automatically detected from branch
    status: "Active",
    contactFirstName: "", contactLastName: "",
    contactDesignation: "",
    emailId: "",
    contactNumber: "",
    website: "",
    industry: "",
    countryIso: "",
    stateIso: "",
    city: "",
    primaryOwner: "",
    businessUnit: "",
    category: "",
    // Tax fields
    federalId: "",
    gstin: "",
    panNumber: "",
    currency: "INR",
    paymentTerms: "Net 30",
    // Qualifier & Onboarding
    tierRating: "TIER_1",
    creditCheckStatus: "APPROVED",
    fillabilityScore: "HIGH",
    vettingNotes: "",
    onboardingStatus: "ACTIVE",
    msaSigned: false,
    sowExecuted: false,
    coiReceived: false,
    vendorPortalCreated: false,
  });

  useEffect(() => {
    async function loadDefaultsAndClients() {
      try {
        const prof = await atsApi.auth.me();
        const onboardingUser = prof?.fullName || prof?.full_name || prof?.name || (prof?.email ? prof.email.split('@')[0] : "");
        
        let activeBranch = typeof window !== 'undefined' ? localStorage.getItem('active_branch_name') : null;
        if (!activeBranch && prof?.activeBranch?.name) {
          activeBranch = prof.activeBranch.name;
        }
        if (!activeBranch) {
          activeBranch = "bbsr-domestic";
        }

        // Detect Market automatically from Branch Name
        const isDomesticBranch = activeBranch.toLowerCase().includes("domestic") || 
                                 activeBranch.toLowerCase().includes("bbsr") || 
                                 activeBranch.toLowerCase().includes("india");
        
        const detectedMarket = isDomesticBranch ? "INDIA" : "US";
        const detectedCurrency = isDomesticBranch ? "INR" : "USD";

        setFormData((prev) => ({
          ...prev,
          primaryOwner: prev.primaryOwner || onboardingUser,
          businessUnit: activeBranch,
          market: detectedMarket,
          currency: detectedCurrency,
        }));

        // Load existing clients for the End Client dropdown
        const clientList = await atsApi.clients.list();
        setExistingClients(clientList || []);
      } catch (err) {
        console.warn("Failed to load user/branch context or client list", err);
      }
    }
    loadDefaultsAndClients();
  }, []);

  // Sync endClientName when selection mode or clientName changes
  useEffect(() => {
    if (endClientSelectionMode === "__SAME__") {
      setFormData((prev) => ({
        ...prev,
        isSameAsPrimary: true,
        endClientName: prev.clientName,
      }));
    } else if (endClientSelectionMode !== "__CUSTOM__") {
      setFormData((prev) => ({
        ...prev,
        isSameAsPrimary: false,
        endClientName: endClientSelectionMode,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        isSameAsPrimary: false,
      }));
    }
  }, [formData.clientName, endClientSelectionMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => {
      const updated = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "countryIso") {
        updated.stateIso = "";
        updated.city = "";
      } else if (name === "stateIso") {
        updated.city = "";
      } else if (name === "market") {
        updated.currency = value === "INDIA" ? "INR" : "USD";
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName.trim()) {
      toast.error("Primary Client Name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalCountry = Country.getCountryByCode(formData.countryIso)?.name || "";
      const finalState = State.getStateByCodeAndCountry(formData.stateIso, formData.countryIso)?.name || "";

      let finalEndClientName = formData.clientName.trim();
      if (endClientSelectionMode === "__SAME__") {
        finalEndClientName = formData.clientName.trim();
      } else if (endClientSelectionMode === "__CUSTOM__") {
        finalEndClientName = formData.endClientName.trim() || formData.clientName.trim();
      } else {
        finalEndClientName = endClientSelectionMode;
      }

      await atsApi.clients.create({
        client_name: formData.clientName.trim(),
        end_client_name: finalEndClientName,
        is_same_as_primary: endClientSelectionMode === "__SAME__",
        market: formData.market,
        status: formData.status,
        contact_person: [formData.contactFirstName?.trim(), formData.contactLastName?.trim()].filter(Boolean).join(" "),
        contact_designation: formData.contactDesignation.trim(),
        email_id: formData.emailId.trim(),
        contact_number: formData.contactNumber.trim(),
        website: formData.website.trim(),
        industry: formData.industry,
        country: finalCountry,
        state: finalState,
        city: formData.city,
        primary_owner: formData.primaryOwner,
        business_unit: formData.businessUnit,
        category: formData.category,
        federal_id: formData.federalId.trim(),
        gstin: formData.gstin.trim(),
        pan_number: formData.panNumber.trim(),
        currency: formData.currency,
        payment_terms: formData.paymentTerms,
        tier_rating: formData.tierRating,
        credit_check_status: formData.creditCheckStatus,
        fillability_score: formData.fillabilityScore,
        vetting_notes: formData.vettingNotes,
        onboarding_status: formData.onboardingStatus,
        msa_signed: formData.msaSigned,
        sow_executed: formData.sowExecuted,
        coi_received: formData.coiReceived,
        vendor_portal_created: formData.vendorPortalCreated,
      });

      toast.success(`Client "${formData.clientName}" created successfully!`);
      router.push("/clients/all");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const countries = Country.getAllCountries();
  const states = formData.countryIso ? State.getStatesOfCountry(formData.countryIso) : [];
  const cities = formData.stateIso ? City.getCitiesOfState(formData.countryIso, formData.stateIso) : [];

  return (
    <div className="h-full flex flex-col min-h-0 bg-neutral-50 dark:bg-slate-950 font-sans p-6 overflow-auto">
      <div className="max-w-5xl w-full mx-auto space-y-6 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 rounded-full bg-white dark:bg-slate-900 shadow-xs border border-neutral-200 dark:border-slate-800 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Building className="h-5 w-5 text-indigo-600" /> Create New Client Account
              </h1>
              <p className="text-xs text-neutral-500">
                Business Unit: <strong className="text-neutral-700 dark:text-neutral-300">{formData.businessUnit}</strong>
              </p>
            </div>
          </div>
          <Badge className={formData.market === "US" ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"}>
            {formData.market === "US" ? "US IT Market ($)" : "India Domestic Market (₹)"}
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
          {/* SECTION 1: PRIMARY CLIENT & END CLIENT */}
          <div className="space-y-4 border-b border-neutral-150 dark:border-slate-800 pb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Building className="h-4 w-4" /> 1. Client Identity &amp; End Client Dropdown
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Client Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Primary Contracting Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  placeholder="e.g. Wipro, TekSystems, HDFC Bank"
                  className="w-full px-3 py-2 text-xs font-semibold bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <span className="text-[10px] text-neutral-400">Direct contracting vendor or MSP holding the client agreement.</span>
              </div>

              {/* End Client Dropdown */}
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
                        .filter((c) => c.client_name && c.client_name !== formData.clientName)
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
                    name="endClientName"
                    value={formData.endClientName}
                    onChange={handleChange}
                    placeholder="Enter custom End Client name (e.g. Bank of America, Apple)"
                    className="w-full mt-2 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 animate-fadeIn"
                  />
                )}
                <span className="text-[10px] text-neutral-400">
                  {endClientSelectionMode === "__SAME__"
                    ? "Auto-synced: End Client matches Primary Client."
                    : "Select an existing client or enter a new End Client name."}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: CLIENT POINT OF CONTACT (POC) */}
          <div className="space-y-4 border-b border-neutral-150 dark:border-slate-800 pb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <UserCheck className="h-4 w-4" /> 2. Client Point of Contact (POC) &amp; Communication
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">POC First Name</label>
                <input
                  name="contactFirstName"
                  value={formData.contactFirstName}
                  onChange={handleChange}
                  placeholder="First Name"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">POC Last Name</label>
                <input
                  name="contactLastName"
                  value={formData.contactLastName}
                  onChange={handleChange}
                  placeholder="Last Name"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">POC Title / Designation</label>
                <input
                  name="contactDesignation"
                  value={formData.contactDesignation}
                  onChange={handleChange}
                  placeholder="e.g. VMS Lead, HR Director"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">POC Work Email</label>
                <input
                  type="email"
                  name="emailId"
                  value={formData.emailId}
                  onChange={handleChange}
                  placeholder="john.smith@client.com"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">POC Phone / Contact</label>
                <input
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="+1 (555) 019-8234"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: MARKET, TAX & LOCATION */}
          <div className="space-y-4 border-b border-neutral-150 dark:border-slate-800 pb-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Globe className="h-4 w-4" /> 3. Auto Market Alignment &amp; Tax Identifiers
              </h3>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Market (Auto-detected):</span>
                <select
                  name="market"
                  value={formData.market}
                  onChange={handleChange}
                  className="text-xs font-bold px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-md text-indigo-700 dark:text-indigo-300"
                >
                  <option value="INDIA">India Domestic Market (₹)</option>
                  <option value="US">US IT Staffing Market ($)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {formData.market === "INDIA" ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">GSTIN Number</label>
                    <input
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleChange}
                      placeholder="22AAAAA0000A1Z5"
                      className="w-full px-3 py-2 text-xs uppercase font-mono bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">PAN Number</label>
                    <input
                      name="panNumber"
                      value={formData.panNumber}
                      onChange={handleChange}
                      placeholder="ABCDE1234F"
                      className="w-full px-3 py-2 text-xs uppercase font-mono bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Federal EIN / Tax ID</label>
                  <input
                    name="federalId"
                    value={formData.federalId}
                    onChange={handleChange}
                    placeholder="12-3456789"
                    className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Payment Terms</label>
                <select
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 45">Net 45 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                  <option value="Paid When Paid">Paid When Paid (PWP)</option>
                  <option value="Immediate">Immediate / Advance</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Industry</label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Industry</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Banking - Financial Services">Banking - Financial Services</option>
                  <option value="Healthcare & Pharma">Healthcare & Pharma</option>
                  <option value="Automotive & EV">Automotive & EV</option>
                  <option value="Telecommunications">Telecommunications</option>
                  <option value="Retail & eCommerce">Retail & eCommerce</option>
                </select>
              </div>
            </div>

            {/* Address Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Country</label>
                <select
                  name="countryIso"
                  value={formData.countryIso}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Country</option>
                  {countries.map((c: any) => (
                    <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">State / Province</label>
                <select
                  name="stateIso"
                  value={formData.stateIso}
                  onChange={handleChange}
                  disabled={!formData.countryIso || states.length === 0}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">{states.length === 0 && formData.countryIso ? "No states found" : "Select State"}</option>
                  {states.map((s: any) => (
                    <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">City</label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={!formData.stateIso || cities.length === 0}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">{cities.length === 0 && formData.stateIso ? "No cities found" : "Select City"}</option>
                  {cities.map((c: any) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* COLLAPSIBLE SECTION 4: QUALIFIER & ONBOARDING CHECKLIST */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-800/40 rounded-lg border border-neutral-200 dark:border-slate-800 text-xs font-bold text-neutral-900 dark:text-white"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Client Qualification &amp; Onboarding Checklist (Optional Defaults Active)
              </div>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAdvanced && (
              <div className="p-4 border border-neutral-200 dark:border-slate-800 rounded-xl space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Client Tier Rating</label>
                    <select
                      name="tierRating"
                      value={formData.tierRating}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    >
                      <option value="TIER_1">Tier 1 (Direct VMS / Preferred)</option>
                      <option value="TIER_2">Tier 2 (Implementation Partner)</option>
                      <option value="TIER_3">Tier 3 (Subcontract Vendor)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Credit Check Vetting</label>
                    <select
                      name="creditCheckStatus"
                      value={formData.creditCheckStatus}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    >
                      <option value="APPROVED">Approved Credit</option>
                      <option value="PENDING_CHECK">Pending Check</option>
                      <option value="HIGH_RISK">High Financial Risk</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Fillability Rating</label>
                    <select
                      name="fillabilityScore"
                      value={formData.fillabilityScore}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    >
                      <option value="HIGH">High (Fast Closure / Hot Account)</option>
                      <option value="MEDIUM">Medium (Standard Responsiveness)</option>
                      <option value="LOW">Low (Slow Feedback / Hard to Fill)</option>
                    </select>
                  </div>
                </div>

                {/* Onboarding Switches */}
                <div className="space-y-2 pt-2 border-t border-neutral-150 dark:border-slate-800">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                    Document &amp; Onboarding Verification Checklist
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-950/20 text-xs font-semibold cursor-pointer">
                      <span>MSA Executed</span>
                      <Switch checked={formData.msaSigned} onCheckedChange={(val) => setFormData(p => ({ ...p, msaSigned: val }))} />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-950/20 text-xs font-semibold cursor-pointer">
                      <span>VMS Portal Configured</span>
                      <Switch checked={formData.vendorPortalCreated} onCheckedChange={(val) => setFormData(p => ({ ...p, vendorPortalCreated: val }))} />
                    </label>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-neutral-200 dark:border-slate-800 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isSubmitting} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Client Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
