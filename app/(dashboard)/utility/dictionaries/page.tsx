"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";
import {
  Database,
  Search,
  Check,
  Plus,
  Trash2,
  ArrowRight,
  RefreshCw,
  Code,
  Briefcase,
  Building2,
  MapPin,
  GraduationCap,
  Sparkles,
  AlertTriangle,
  X,
  PlusCircle,
  Link as LinkIcon
} from "lucide-react";

interface PendingNormalization {
  id: number;
  category: "SKILL" | "DESIGNATION" | "COMPANY" | "LOCATION" | "DEGREE";
  rawValue: string;
  detectedCount: number;
  createdAt: string;
}

interface DictionaryAlias {
  id: number;
  name: string;
}

interface DictionaryTerm {
  id: number;
  name: string;
  aliases: DictionaryAlias[];
  seniorityLevel?: string;
  country?: string;
  state?: string;
}

const CATEGORIES = [
  { id: "SKILL", label: "Skills", icon: Code, color: "text-blue-500 bg-blue-500/10" },
  { id: "DESIGNATION", label: "Job Titles", icon: Briefcase, color: "text-emerald-500 bg-emerald-500/10" },
  { id: "COMPANY", label: "Companies", icon: Building2, color: "text-purple-500 bg-purple-500/10" },
  { id: "LOCATION", label: "Locations", icon: MapPin, color: "text-amber-500 bg-amber-500/10" },
  { id: "DEGREE", label: "Degrees", icon: GraduationCap, color: "text-rose-500 bg-rose-500/10" },
] as const;

export default function DictionariesPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingList, setPendingList] = useState<PendingNormalization[]>([]);
  
  // Selected category in the active dictionary tab
  const [activeCategory, setActiveCategory] = useState<PendingNormalization["category"]>("SKILL");
  const [activeTerms, setActiveTerms] = useState<DictionaryTerm[]>([]);
  const [loadingActive, setLoadingActive] = useState(false);

  // Search/Filters
  const [pendingFilter, setPendingFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  // Approval selection state
  const [selectedPending, setSelectedPending] = useState<PendingNormalization | null>(null);
  const [approvalAction, setApprovalAction] = useState<"canonical" | "alias">("canonical");
  const [targetCanonicalId, setTargetCanonicalId] = useState<number | "">("");

  // Add Term State
  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState<"canonical" | "alias">("canonical");
  const [newCanonicalName, setNewCanonicalName] = useState("");
  const [newAliasName, setNewAliasName] = useState("");
  const [newMasterId, setNewMasterId] = useState<number | "">("");

  // Extra category fields for manual insertion
  const [extraCountry, setExtraCountry] = useState("US");
  const [extraState, setExtraState] = useState("");
  const [extraSeniority, setExtraSeniority] = useState("Mid");

  // Approval action loading
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const user = atsApi.auth.getCurrentUser();
    const hasAdmin = user?.roles?.includes("SUPER_ADMIN");
    setIsAdmin(hasAdmin);

    if (hasAdmin) {
      loadInitialData();
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch active terms whenever activeCategory changes
  useEffect(() => {
    if (isAdmin) {
      loadActiveDictionary();
    }
  }, [activeCategory, isAdmin]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await loadPending();
      await loadActiveDictionary();
    } catch (err: any) {
      toast.error("Failed to load normalization lists: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPending = async () => {
    const data = await atsApi.candidates.dictionary.listPending();
    setPendingList(data);
  };

  const loadActiveDictionary = async () => {
    try {
      setLoadingActive(true);
      const data = await atsApi.candidates.dictionary.listCategory(activeCategory);
      setActiveTerms(data);
    } catch (err: any) {
      toast.error(`Failed to load ${activeCategory} list: ` + err.message);
    } finally {
      setLoadingActive(false);
    }
  };

  // Run approval transaction
  const handleApprove = async () => {
    if (!selectedPending) return;
    
    if (approvalAction === "alias" && !targetCanonicalId) {
      toast.error("Please select a canonical term to link this alias to.");
      return;
    }

    try {
      setActionLoading(true);
      await atsApi.candidates.dictionary.approve({
        category: selectedPending.category,
        rawValue: selectedPending.rawValue,
        action: approvalAction,
        canonicalId: approvalAction === "alias" ? Number(targetCanonicalId) : undefined,
        country: selectedPending.category === "LOCATION" ? extraCountry : undefined,
        state: selectedPending.category === "LOCATION" ? extraState : undefined,
        seniorityLevel: selectedPending.category === "DESIGNATION" ? extraSeniority : undefined,
      });

      toast.success(`Successfully approved "${selectedPending.rawValue}"`);
      
      // Reset selected states
      setSelectedPending(null);
      setTargetCanonicalId("");
      
      // Reload lists
      await Promise.all([loadPending(), loadActiveDictionary()]);
    } catch (err: any) {
      toast.error("Failed to approve term: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Direct manual insertion
  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addType === "canonical" && !newCanonicalName.trim()) {
      toast.error("Canonical name is required.");
      return;
    }
    if (addType === "alias" && (!newAliasName.trim() || !newMasterId)) {
      toast.error("Alias name and target Canonical term are required.");
      return;
    }

    try {
      setActionLoading(true);
      const payload = addType === "canonical" 
        ? {
            type: "canonical" as const,
            name: newCanonicalName.trim(),
            country: activeCategory === "LOCATION" ? extraCountry : undefined,
            state: activeCategory === "LOCATION" ? extraState : undefined,
            seniorityLevel: activeCategory === "DESIGNATION" ? extraSeniority : undefined,
          }
        : {
            type: "alias" as const,
            alias: newAliasName.trim(),
            masterId: Number(newMasterId),
          };

      await atsApi.candidates.dictionary.addCategory(activeCategory, payload);
      toast.success("Term added successfully!");
      
      // Clear inputs
      setNewCanonicalName("");
      setNewAliasName("");
      setNewMasterId("");
      setShowAddForm(false);
      
      // Refresh
      await loadActiveDictionary();
    } catch (err: any) {
      toast.error("Failed to add term: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete category term/alias
  const handleDeleteTerm = async (id: number, type: "canonical" | "alias") => {
    const confirmationMsg = type === "canonical" 
      ? "Warning: Deleting this canonical term will cascade and delete all associated alias mappings. Are you sure?"
      : "Are you sure you want to delete this alias mapping?";

    if (!confirm(confirmationMsg)) return;

    try {
      await atsApi.candidates.dictionary.deleteCategory(activeCategory, id, type);
      toast.success("Successfully deleted term.");
      await loadActiveDictionary();
    } catch (err: any) {
      toast.error("Failed to delete term: " + err.message);
    }
  };

  // Filter lists
  const filteredPending = pendingList.filter((item) =>
    item.rawValue.toLowerCase().includes(pendingFilter.toLowerCase()) ||
    item.category.toLowerCase().includes(pendingFilter.toLowerCase())
  );

  const filteredActive = activeTerms.filter((term) =>
    term.name.toLowerCase().includes(activeFilter.toLowerCase()) ||
    term.aliases.some((a) => a.name.toLowerCase().includes(activeFilter.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 text-primary animate-spin" />
          <span className="text-xs text-neutral-500 font-medium">Loading Dictionaries...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 rounded-md">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Access Denied</h2>
        <p className="text-xs text-neutral-500 mt-2">
          This workspace is restricted to platform Super Admins. Please log in as a Super Admin to manage master dictionary mapping and normalization controls.
        </p>
      </div>
    );
  }

  const categoryDetails = CATEGORIES.find(c => c.id === activeCategory)!;
  const CategoryIcon = categoryDetails.icon;

  return (
    <div className="w-full max-w-full py-6 px-4 space-y-6 font-sans">
      {/* ── Breadcrumb & Header ────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-800 dark:text-neutral-100 flex items-center gap-2 mt-1">
            <Database className="h-5 w-5 text-primary" />
            Master Dictionary & Normalization Manager
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Resolve parsing raw terms, map them to canonical entities, and maintain clean lookup databases.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={loadInitialData}
            variant="outline"
            className="text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload Data
          </Button>
        </div>
      </div>

      {/* ── Dashboard Grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── Left Side: Pending Queue (lg:col-span-5) ───── */}
        <Card className="lg:col-span-5 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                  Pending Normalizations
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Terms extracted from CV files awaiting database mapping.
                </CardDescription>
              </div>
              <Badge className="bg-amber-500/10 text-amber-500 border-none font-bold text-[10px]">
                {pendingList.length} Items
              </Badge>
            </div>
            
            {/* Filter Search */}
            <div className="relative mt-2.5">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search raw values..."
                className="w-full pl-8 pr-3 py-1 text-xs border border-neutral-300 dark:border-slate-700 rounded-sm bg-neutral-50 dark:bg-slate-950 focus:bg-white outline-hidden focus:border-primary transition-colors text-neutral-700 dark:text-neutral-300"
                value={pendingFilter}
                onChange={(e) => setPendingFilter(e.target.value)}
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Pending List Area */}
            <div className="max-h-[360px] overflow-y-auto border border-neutral-200 dark:border-slate-800 rounded-sm divide-y divide-neutral-100 dark:divide-slate-800">
              {filteredPending.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400">
                  No pending normalization items found.
                </div>
              ) : (
                filteredPending.map((item) => {
                  const catInfo = CATEGORIES.find(c => c.id === item.category);
                  const CatIcon = catInfo ? catInfo.icon : Database;
                  
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedPending(item);
                        setApprovalAction("canonical");
                        setTargetCanonicalId("");
                      }}
                      className={`p-3 text-left transition-colors cursor-pointer flex items-center justify-between ${
                        selectedPending?.id === item.id
                          ? "bg-primary/5 dark:bg-primary/10 border-l-4 border-primary"
                          : "hover:bg-neutral-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                          {item.rawValue}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-xs text-[9px] font-bold uppercase ${catInfo?.color || "bg-neutral-100 text-neutral-500"}`}>
                            <CatIcon className="h-2.5 w-2.5" />
                            {catInfo?.label || item.category}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Count: <b className="text-neutral-600 dark:text-neutral-300">{item.detectedCount}</b>
                          </span>
                        </div>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 text-neutral-400" />
                    </div>
                  );
                })
              )}
            </div>

            {/* Approval Control Form Card */}
            {selectedPending && (
              <div className="border border-primary/20 bg-primary/5 dark:bg-slate-900/40 p-4 rounded-sm space-y-4 mt-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-primary dark:text-primary-400 uppercase tracking-wider">
                    Resolve: &quot;{selectedPending.rawValue}&quot;
                  </h4>
                  <button
                    onClick={() => setSelectedPending(null)}
                    className="p-0.5 rounded-sm hover:bg-neutral-200 dark:hover:bg-slate-800 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Approve Action Radio Selection */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalAction("canonical")}
                    className={`py-1.5 px-3 rounded-xs text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      approvalAction === "canonical"
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-white dark:bg-slate-950 border-neutral-300 dark:border-slate-800 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add as Canonical
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setApprovalAction("alias");
                      // Switch active dictionary tab automatically to match category
                      setActiveCategory(selectedPending.category);
                    }}
                    className={`py-1.5 px-3 rounded-xs text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      approvalAction === "alias"
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-white dark:bg-slate-950 border-neutral-300 dark:border-slate-800 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    Map as Alias
                  </button>
                </div>

                {/* Form fields based on selection */}
                {approvalAction === "canonical" ? (
                  <div className="space-y-3 pt-1">
                    <p className="text-[10px] text-neutral-500">
                      This will register <b>{selectedPending.rawValue}</b> as a new master entity in <b>{selectedPending.category}</b>.
                    </p>

                    {selectedPending.category === "LOCATION" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-neutral-400 uppercase">Country</label>
                          <select
                            className="w-full text-xs px-2 py-1 border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xs text-neutral-800 dark:text-neutral-200 outline-hidden"
                            value={extraCountry}
                            onChange={(e) => setExtraCountry(e.target.value)}
                          >
                            <option value="US">United States (US)</option>
                            <option value="IN">India (IN)</option>
                            <option value="CA">Canada (CA)</option>
                            <option value="UK">United Kingdom (UK)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-neutral-400 uppercase">State Code</label>
                          <input
                            type="text"
                            placeholder="VA"
                            maxLength={50}
                            className="w-full text-xs px-2 py-1 border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xs text-neutral-800 dark:text-neutral-200 outline-hidden"
                            value={extraState}
                            onChange={(e) => setExtraState(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {selectedPending.category === "DESIGNATION" && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-neutral-400 uppercase">Default Seniority</label>
                        <select
                          className="w-full text-xs px-2 py-1 border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xs text-neutral-800 dark:text-neutral-200 outline-hidden"
                          value={extraSeniority}
                          onChange={(e) => setExtraSeniority(e.target.value)}
                        >
                          <option value="Junior">Junior</option>
                          <option value="Mid">Mid Level</option>
                          <option value="Senior">Senior</option>
                          <option value="Lead">Lead / Manager</option>
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide block">
                      Link alias &quot;{selectedPending.rawValue}&quot; to Canonical Term:
                    </label>
                    <select
                      className="w-full text-xs px-2.5 py-1.5 border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xs text-neutral-800 dark:text-neutral-200 outline-hidden focus:border-primary cursor-pointer"
                      value={targetCanonicalId}
                      onChange={(e) => setTargetCanonicalId(e.target.value === "" ? "" : Number(e.target.value))}
                    >
                      <option value="">— Select Canonical Term —</option>
                      {activeTerms.map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-neutral-400">
                      Searching active dictionary list below for targets. If target doesn&apos;t exist, approve as canonical first.
                    </p>
                  </div>
                )}

                {/* Submit Action */}
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedPending(null)}
                    disabled={actionLoading}
                    className="text-xs h-7 px-3 text-neutral-500 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="text-xs h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white border-none gap-1 cursor-pointer font-bold"
                  >
                    {actionLoading ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Resolve Term
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right Side: Active Master Dictionaries (lg:col-span-7) ── */}
        <Card className="lg:col-span-7 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-800">
          <CardHeader className="pb-3 border-b border-neutral-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-primary" />
                  Active Master Dictionaries
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Explore current master terms and their child aliases.
                </CardDescription>
              </div>

              {/* Add Manual Term Trigger */}
              <Button
                size="sm"
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setNewCanonicalName("");
                  setNewAliasName("");
                  setNewMasterId("");
                }}
                className="text-xs font-semibold gap-1 bg-primary text-white border-none hover:bg-primary/90 h-7 cursor-pointer"
              >
                {showAddForm ? <X className="h-3.5 w-3.5" /> : <PlusCircle className="h-3.5 w-3.5" />}
                {showAddForm ? "Close Form" : "Add Direct Term"}
              </Button>
            </div>

            {/* Dictionaries Category Tabs */}
            <div className="flex flex-wrap gap-1 mt-4">
              {CATEGORIES.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveCategory(tab.id);
                      setSelectedPending(null);
                      setShowAddForm(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm border transition-all cursor-pointer ${
                      isActive
                        ? "bg-primary border-primary text-white shadow-xs"
                        : "bg-neutral-50 dark:bg-slate-950 border-neutral-300 dark:border-slate-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            
            {/* Manual Term Insertion Form */}
            {showAddForm && (
              <form onSubmit={handleAddManual} className="border border-dashed border-primary/30 p-4 rounded-sm bg-neutral-50 dark:bg-slate-950/40 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <PlusCircle className="h-3.5 w-3.5 text-primary" />
                    Add Direct term to {categoryDetails.label} Dictionary
                  </h4>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1">
                      <input
                        type="radio"
                        checked={addType === "canonical"}
                        onChange={() => setAddType("canonical")}
                        className="cursor-pointer"
                      />
                      Canonical
                    </label>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1">
                      <input
                        type="radio"
                        checked={addType === "alias"}
                        onChange={() => setAddType("alias")}
                        className="cursor-pointer"
                      />
                      Alias
                    </label>
                  </div>
                </div>

                {addType === "canonical" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Canonical Name</label>
                      <input
                        type="text"
                        placeholder="e.g. React"
                        className="w-full text-xs px-2.5 py-1.5 border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xs text-neutral-800 dark:text-neutral-200 outline-hidden"
                        value={newCanonicalName}
                        onChange={(e) => setNewCanonicalName(e.target.value)}
                      />
                    </div>

                    {activeCategory === "LOCATION" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-neutral-500 uppercase">Country</label>
                          <select
                            className="w-full text-xs px-2 py-1.5 border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xs text-neutral-800 dark:text-neutral-200 outline-hidden"
                            value={extraCountry}
                            onChange={(e) => setExtraCountry(e.target.value)}
                          >
                            <option value="US">US</option>
                            <option value="IN">IN</option>
                            <option value="CA">CA</option>
                            <option value="UK">UK</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-neutral-500 uppercase">State Code</label>
                          <input
                            type="text"
                            placeholder="NY"
                            className="w-full text-xs px-2 py-1.5 border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xs text-neutral-800 dark:text-neutral-200 outline-hidden"
                            value={extraState}
                            onChange={(e) => setExtraState(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {activeCategory === "DESIGNATION" && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-neutral-500 uppercase">Seniority</label>
                        <select
                          className="w-full text-xs px-2 py-1.5 border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xs text-neutral-800 dark:text-neutral-200 outline-hidden"
                          value={extraSeniority}
                          onChange={(e) => setExtraSeniority(e.target.value)}
                        >
                          <option value="Junior">Junior</option>
                          <option value="Mid">Mid</option>
                          <option value="Senior">Senior</option>
                          <option value="Lead">Lead</option>
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Alias Name</label>
                      <input
                        type="text"
                        placeholder="e.g. ReactJS"
                        className="w-full text-xs px-2.5 py-1.5 border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xs text-neutral-800 dark:text-neutral-200 outline-hidden"
                        value={newAliasName}
                        onChange={(e) => setNewAliasName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Target Canonical Term</label>
                      <select
                        className="w-full text-xs px-2.5 py-1.5 border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xs text-neutral-800 dark:text-neutral-200 outline-hidden cursor-pointer"
                        value={newMasterId}
                        onChange={(e) => setNewMasterId(e.target.value === "" ? "" : Number(e.target.value))}
                      >
                        <option value="">— Select Canonical Term —</option>
                        {activeTerms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAddForm(false)}
                    disabled={actionLoading}
                    className="text-xs h-7 px-3 text-neutral-500 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    type="submit"
                    disabled={actionLoading}
                    className="text-xs h-7 px-4 bg-primary text-white border-none gap-1 font-bold cursor-pointer"
                  >
                    {actionLoading ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Insert Term
                  </Button>
                </div>
              </form>
            )}

            {/* Active Dictionary Term Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder={`Search active ${categoryDetails.label.toLowerCase()}...`}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 dark:border-slate-700 rounded-sm bg-neutral-50 dark:bg-slate-950 focus:bg-white outline-hidden focus:border-primary transition-colors text-neutral-700 dark:text-neutral-300"
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                  />
                </div>
                <div className="text-[10px] text-neutral-400 font-bold whitespace-nowrap">
                  Showing {filteredActive.length} of {activeTerms.length} Terms
                </div>
              </div>

              {loadingActive ? (
                <div className="p-12 text-center text-xs text-neutral-400">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-primary" />
                  Updating category view...
                </div>
              ) : (
                <div className="border border-neutral-200 dark:border-slate-800 rounded-sm divide-y divide-neutral-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
                  {filteredActive.length === 0 ? (
                    <div className="p-12 text-center text-xs text-neutral-400">
                      No active master terms found matching your query.
                    </div>
                  ) : (
                    filteredActive.map((term) => (
                      <div
                        key={term.id}
                        className="p-3 hover:bg-neutral-50 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-3 text-left"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1">
                              <CategoryIcon className="h-3.5 w-3.5 text-neutral-400" />
                              {term.name}
                            </span>
                            
                            {/* Extra attributes visual indicators */}
                            {term.seniorityLevel && (
                              <Badge className="bg-neutral-100 dark:bg-slate-800 text-neutral-500 text-[8px] uppercase tracking-wide border-none px-1 py-0 font-bold">
                                {term.seniorityLevel}
                              </Badge>
                            )}
                            {term.country && (
                              <Badge className="bg-neutral-100 dark:bg-slate-800 text-neutral-500 text-[8px] uppercase tracking-wide border-none px-1 py-0 font-bold">
                                {term.state ? `${term.state}, ${term.country}` : term.country}
                              </Badge>
                            )}
                          </div>

                          {/* Alias Mappings Badges list */}
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider mr-1">
                              Aliases:
                            </span>
                            {term.aliases.length === 0 ? (
                              <span className="text-[10px] text-neutral-400 italic">None</span>
                            ) : (
                              term.aliases.map((alias) => (
                                <Badge
                                  key={alias.id}
                                  variant="outline"
                                  className="text-[9px] font-semibold pl-1.5 pr-1 py-0 border-neutral-300 dark:border-slate-800 text-neutral-600 dark:text-neutral-400 flex items-center gap-0.5 rounded-xs"
                                >
                                  {alias.name}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTerm(alias.id, "alias")}
                                    className="p-0.5 hover:bg-neutral-200 dark:hover:bg-slate-800 rounded-full text-neutral-400 hover:text-red-500 cursor-pointer"
                                    title="Remove alias mapping"
                                  >
                                    <X className="h-2 w-2" />
                                  </button>
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteTerm(term.id, "canonical")}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-neutral-400 hover:text-red-500 rounded-sm cursor-pointer transition-colors"
                            title="Delete canonical entity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Simple internal icon helper since we don't have ChevronRight exported from our standard list
function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
