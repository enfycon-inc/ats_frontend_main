"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, MapPin, Plus, Edit2, Users, CheckCircle2, XCircle, 
  Search, ShieldAlert, Sparkles, X, Globe, UserPlus, Briefcase, Crown, Shield,
  GitFork, ChevronRight, ChevronDown, Layers, Rocket, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { atsApi } from "@/lib/ats-api";

export default function BranchManagementPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "cards">("tree");
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isAssignUserOpen, setIsAssignUserOpen] = useState(false);

  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [branchMembers, setBranchMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Multi-role state for staff assignment
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["RECRUITER"]);
  const [allTenantUsers, setAllTenantUsers] = useState<any[]>([]);
  const [selectedUserToAssign, setSelectedUserToAssign] = useState<string>("");

  // Form states (Blank by default - zero hardcoding)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    city: "",
    state: "",
    country: "India",
    market: "INDIA",
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    loadBranchesAndHierarchy();
  }, []);

  const loadBranchesAndHierarchy = async () => {
    try {
      setLoading(true);
      const [listData, hierData] = await Promise.all([
        atsApi.branches.list().catch(() => []),
        atsApi.branches.getHierarchy().catch(() => null),
      ]);
      setBranches(listData || []);
      setHierarchyData(hierData);
    } catch (err: any) {
      console.error("Failed to load branches:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Branch Name is required");
      return;
    }
    try {
      setFormError("");
      const created = await atsApi.branches.create({
        name: formData.name,
        code: formData.code,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        market: formData.market,
      });
      if (created && typeof window !== "undefined") {
        localStorage.setItem("active_branch_id", created.id);
        localStorage.setItem("active_branch_name", created.name);
      }
      setIsCreateOpen(false);
      resetForm();
      await loadBranchesAndHierarchy();
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create branch");
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    try {
      setFormError("");
      await atsApi.branches.update(selectedBranch.id, {
        name: formData.name,
        code: formData.code,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        market: formData.market,
      });
      setIsEditOpen(false);
      resetForm();
      loadBranchesAndHierarchy();
    } catch (err: any) {
      setFormError(err.message || "Failed to update branch");
    }
  };

  const handleAssignManager = async (managerId: string) => {
    if (!selectedBranch) return;
    try {
      await atsApi.branches.updateManager(selectedBranch.id, managerId);
      loadBranchesAndHierarchy();
      if (selectedBranch) openMembersModal(selectedBranch);
    } catch (err: any) {
      alert(err.message || "Failed to set Branch Manager");
    }
  };

  const handleSaveMemberRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !selectedMember) return;
    try {
      await atsApi.branches.assignUser(selectedBranch.id, selectedMember.id, selectedRoles);
      setIsAssignUserOpen(false);
      openMembersModal(selectedBranch);
      loadBranchesAndHierarchy();
    } catch (err: any) {
      alert(err.message || "Failed to update staff roles");
    }
  };

  const openEditModal = (b: any) => {
    setSelectedBranch(b);
    setFormData({
      name: b.name || "",
      code: b.code || "",
      city: b.city || "",
      state: b.state || "",
      country: b.country || "India",
      market: b.market || "INDIA",
    });
    setFormError("");
    setIsEditOpen(true);
  };

  const openMembersModal = async (b: any) => {
    setSelectedBranch(b);
    setIsMembersOpen(true);
    setSelectedUserToAssign("");
    try {
      setMembersLoading(true);
      const [members, users] = await Promise.all([
        atsApi.branches.getMembers(b.id).catch(() => []),
        atsApi.auth.listUsers().catch(() => []),
      ]);
      setBranchMembers(members || []);
      setAllTenantUsers(users || []);
    } catch (err) {
      console.error("Failed to load members:", err);
      setBranchMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleAssignUserToBranch = async (userId: string) => {
    if (!selectedBranch || !userId) return;
    try {
      await atsApi.branches.assignUser(selectedBranch.id, userId);
      const members = await atsApi.branches.getMembers(selectedBranch.id);
      setBranchMembers(members || []);
      setSelectedUserToAssign("");
      loadBranchesAndHierarchy();
    } catch (err: any) {
      alert(err.message || "Failed to assign user to branch");
    }
  };

  const openEditMemberRolesModal = (user: any) => {
    setSelectedMember(user);
    setSelectedRoles(Array.isArray(user.roles) ? user.roles : ["RECRUITER"]);
    setIsAssignUserOpen(true);
  };

  const openCreateWithPreset = (presetMarket: string) => {
    resetForm();
    setFormData((prev) => ({
      ...prev,
      market: presetMarket,
      country: presetMarket === "US" ? "United States" : "India",
    }));
    setIsCreateOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      city: "",
      state: "",
      country: "India",
      market: "INDIA",
    });
    setFormError("");
    setSelectedBranch(null);
  };

  const filteredBranches = branches.filter((b) =>
    (b.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.city || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.code || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableRolesList = [
    { key: "BRANCH_ADMIN", label: "Branch Admin (Branch Manager)", desc: "Full administrative access within this branch" },
    { key: "ACCOUNT_MANAGER", label: "Account Manager (Sales)", desc: "Manages client relationships & job orders" },
    { key: "POD_LEAD", label: "Pod Lead", desc: "Leads a recruitment pod & assigns jobs" },
    { key: "RECRUITER", label: "Recruiter", desc: "Sourcing & candidate submissions" },
    { key: "DELIVERY_HEAD", label: "Delivery Head", desc: "Monitors overall branch delivery metrics" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-650">
              <GitFork className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
              Organizational Hierarchy & Branch Management
            </h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Define dynamic branch structures, assign Branch Managers (`BRANCH_ADMIN`), and visualize your entire organizational tree.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* VIEW MODE TOGGLE */}
          <div className="flex items-center bg-neutral-100 dark:bg-slate-800 p-1 rounded-lg border border-neutral-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode("tree")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                viewMode === "tree"
                  ? "bg-white dark:bg-slate-900 text-indigo-650 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400"
              }`}
            >
              <GitFork className="h-3.5 w-3.5" /> Visual Tree
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                viewMode === "cards"
                  ? "bg-white dark:bg-slate-900 text-indigo-650 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400"
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> Cards Grid
            </button>
          </div>

          <Button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 shadow"
          >
            <Plus className="h-4 w-4" /> Add New Branch
          </Button>
        </div>
      </div>

      {/* DYNAMIC HERO BANNER WHEN 0 BRANCHES */}
      {branches.length === 0 && !loading && (
        <div className="p-6 rounded-xl bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 text-white border border-indigo-700/50 shadow-lg space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 max-w-2xl">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1 w-fit">
                <Rocket className="h-3 w-3" /> Initial Workspace Setup
              </span>
              <h2 className="text-lg font-bold text-white">
                Configure Your First Operating Branch Location
              </h2>
              <p className="text-xs text-indigo-200 leading-relaxed">
                Your company workspace currently has no operating branches configured. Establish your primary branch (e.g., Main Office, Regional Hub, or US Staffing Branch) to start assigning recruiters, pods, and jobs.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={() => openCreateWithPreset("INDIA")}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-2 shadow"
            >
              <Building2 className="h-4 w-4" /> + Add Domestic India Branch <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={() => openCreateWithPreset("US")}
              variant="outline"
              className="border-indigo-400/50 text-indigo-100 hover:bg-indigo-800/50 font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-2"
            >
              <Globe className="h-4 w-4" /> + Add US IT Staffing Branch
            </Button>
          </div>
        </div>
      )}

      {/* SEARCH TOOLBAR */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branches by name, city, or code..."
            className="pl-9 h-9 text-xs bg-white dark:bg-slate-900 rounded-lg border-neutral-300 dark:border-slate-700"
          />
        </div>
        <div className="text-xs font-semibold text-neutral-500">
          Total Configured Branches: <span className="text-indigo-650 font-bold">{branches.length}</span>
        </div>
      </div>

      {/* CONTENT AREA */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-650 mx-auto"></div>
          <p className="text-xs text-neutral-500 mt-2 font-medium">Loading organization hierarchy...</p>
        </div>
      ) : viewMode === "tree" ? (
        /* VISUAL HIERARCHY TREE VIEW */
        <Card className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-sm p-6">
          <div className="space-y-6">
            {/* ROOT NODE: TENANT HQ */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
              <div className="p-3 bg-indigo-650 text-white rounded-lg shadow">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  Tenant Organization HQ
                </span>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                  {hierarchyData?.tenant?.name || "Company Tenant Workspace"}
                </h2>
                <p className="text-xs text-neutral-500">
                  Domain: <span className="font-mono text-indigo-650 font-semibold">{hierarchyData?.tenant?.domain || "workspace"}</span>
                </p>
              </div>
            </div>

            {/* BRANCH NODES CONTAINER */}
            <div className="pl-6 border-l-2 border-indigo-200 dark:border-slate-800 space-y-6 ml-6">
              {filteredBranches.length === 0 ? (
                <div className="py-6 text-xs text-neutral-450 italic border border-dashed border-neutral-300 p-4 rounded-lg text-center">
                  No branches configured under this tenant yet. Click <strong>"+ Add New Branch"</strong> above to create your first operating location.
                </div>
              ) : (
                filteredBranches.map((b) => {
                  const branchHier = (hierarchyData?.branches || []).find((h: any) => h.id === b.id);
                  const members = branchHier?.members || [];

                  return (
                    <div key={b.id} className="relative pl-6 space-y-3">
                      {/* CONNECTOR LINE */}
                      <div className="absolute -left-[25px] top-4 w-6 h-[2px] bg-indigo-200 dark:bg-slate-800" />
                      
                      {/* BRANCH CARD NODE */}
                      <div className="bg-neutral-50/80 dark:bg-slate-850 p-4 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-indigo-650 border border-neutral-200 dark:border-slate-700 shadow-xs">
                              <MapPin className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-neutral-900 dark:text-white">{b.name}</span>
                                {b.code && (
                                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-neutral-200 dark:bg-slate-700 text-neutral-700 dark:text-slate-300">
                                    {b.code}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-500">{b.city || "City Unspecified"}, {b.country || "Country"}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              b.market === "US" 
                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                            }`}>
                              {b.market === "US" ? "US IT Market" : "Domestic India"}
                            </span>

                            <Button
                              onClick={() => openEditModal(b)}
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] font-semibold border-neutral-300 text-indigo-650 hover:bg-indigo-50"
                            >
                              <Edit2 className="h-3 w-3 mr-1" /> Edit Branch
                            </Button>

                            <Button
                              onClick={() => openMembersModal(b)}
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] font-semibold border-neutral-300"
                            >
                              Manage Roster ({b.usersCount || 0})
                            </Button>
                          </div>
                        </div>

                        {/* BRANCH MANAGER STRIP */}
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-neutral-200 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-amber-500" />
                            <span className="text-xs font-bold text-neutral-800 dark:text-white">
                              Branch Head: {b.managerName ? b.managerName : <span className="text-neutral-400 font-normal italic">Unassigned (Click Assign)</span>}
                            </span>
                          </div>
                          <button
                            onClick={() => openMembersModal(b)}
                            className="text-[11px] font-bold text-indigo-650 hover:underline"
                          >
                            {b.managerName ? "Change Manager" : "Assign Manager"}
                          </button>
                        </div>

                        {/* MEMBERS NESTED NODES */}
                        <div className="pl-6 border-l-2 border-dashed border-neutral-300 dark:border-slate-700 space-y-2 pt-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Assigned Team Roster</p>
                          
                          {members.length === 0 ? (
                            <p className="text-xs text-neutral-400 italic">No recruiters assigned to this branch yet.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {members.map((m: any) => (
                                <div key={m.id} className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800">
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-neutral-800 dark:text-white">{m.fullName}</p>
                                    <p className="text-[10px] text-neutral-450">{m.email}</p>
                                  </div>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                                    {Array.isArray(m.roles) ? m.roles.join(", ") : "Recruiter"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      ) : (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBranches.map((b) => (
            <Card key={b.id} className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 shadow-sm hover:shadow transition-all">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-neutral-800 dark:text-white">
                        {b.name}
                      </span>
                      {b.code && (
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-700">
                          {b.code}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                      <span>{b.city || "Unspecified"}, {b.country || "India"}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    b.market === "US" 
                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                  }`}>
                    {b.market === "US" ? "US IT Segment" : "Domestic India"}
                  </span>
                </div>

                {/* BRANCH MANAGER BADGE */}
                <div className="bg-neutral-50 dark:bg-slate-850 p-2.5 rounded-lg border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Branch Head / Manager</p>
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100">
                        {b.managerName ? b.managerName : <span className="text-neutral-400 font-normal italic">Unassigned</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBranch(b);
                      openMembersModal(b);
                    }}
                    className="text-[10px] font-bold text-indigo-650 hover:underline cursor-pointer"
                  >
                    {b.managerName ? "Change" : "Assign"}
                  </button>
                </div>

                {/* STATS STRIP */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-neutral-50 dark:bg-slate-850 p-2 rounded text-center">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Assigned Staff</span>
                    <span className="text-sm font-bold text-indigo-650 dark:text-indigo-400">{b.usersCount || 0}</span>
                  </div>
                  <div className="bg-neutral-50 dark:bg-slate-850 p-2 rounded text-center">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Active Requisitions</span>
                    <span className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{b.jobsCount || 0}</span>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-slate-800">
                  <Button
                    onClick={() => openMembersModal(b)}
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] font-semibold border-neutral-300 rounded flex items-center gap-1"
                  >
                    <Users className="h-3.5 w-3.5 text-indigo-650" /> Roster & Roles ({b.usersCount || 0})
                  </Button>

                  <Button
                    onClick={() => openEditModal(b)}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] font-semibold text-neutral-600 hover:text-indigo-650"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit Branch
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE BRANCH MODAL (PURE DYNAMIC FORM) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-indigo-650" /> Create New Branch
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded border border-red-200">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Branch Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Primary Branch, Main Office, Tech Hub"
                  className="h-8 text-xs rounded border-neutral-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Branch Code</label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. MAIN, HQ, BHUB"
                    className="h-8 text-xs font-mono rounded border-neutral-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. City Name"
                    className="h-8 text-xs rounded border-neutral-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Market Segment *</label>
                <select
                  value={formData.market}
                  onChange={(e) => setFormData({ ...formData, market: e.target.value })}
                  className="w-full h-8 text-xs rounded border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 font-semibold"
                >
                  <option value="INDIA">Domestic India Segment</option>
                  <option value="US">US IT Segment</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-8 text-xs bg-indigo-650 hover:bg-indigo-700 text-white font-bold">
                  Save Branch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      {isEditOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-indigo-650" /> Edit Branch Details
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBranch} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded border border-red-200">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Branch Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-8 text-xs rounded border-neutral-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Branch Code</label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="h-8 text-xs font-mono rounded border-neutral-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="h-8 text-xs rounded border-neutral-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Market Segment *</label>
                <select
                  value={formData.market}
                  onChange={(e) => setFormData({ ...formData, market: e.target.value })}
                  className="w-full h-8 text-xs rounded border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 font-semibold"
                >
                  <option value="INDIA">Domestic India Segment</option>
                  <option value="US">US IT Segment</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-8 text-xs bg-indigo-650 hover:bg-indigo-700 text-white font-bold">
                  Update Branch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEMBER ROSTER & MULTI-ROLE MODAL */}
      {isMembersOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-650" /> Branch Roster: {selectedBranch.name}
                </h3>
                <p className="text-[11px] text-neutral-400">Staff members & custom multi-role assignments</p>
              </div>
              <button onClick={() => setIsMembersOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[460px] overflow-y-auto">
              {/* ASSIGN TEAM MEMBER STRIP */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5 text-indigo-650" /> Add / Assign Staff Member to Branch
                  </span>
                  <a
                    href="/utility/users"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10.5px] font-bold text-indigo-650 hover:underline"
                  >
                    Manage Full Roster →
                  </a>
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedUserToAssign}
                    onChange={(e) => setSelectedUserToAssign(e.target.value)}
                    className="flex-1 h-8 text-xs rounded border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 font-semibold text-neutral-800 dark:text-neutral-200 outline-none"
                  >
                    <option value="">-- Select Recruiter / Staff Member --</option>
                    {allTenantUsers
                      .filter((u) => u.branchId !== selectedBranch.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.email}) {u.branchName ? `[Currently in ${u.branchName}]` : "[Unassigned]"}
                        </option>
                      ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!selectedUserToAssign}
                    onClick={() => handleAssignUserToBranch(selectedUserToAssign)}
                    className="h-8 text-xs bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-3"
                  >
                    Assign
                  </Button>
                </div>
              </div>

              {membersLoading ? (
                <div className="text-center py-6 text-xs text-neutral-450">Loading staff members...</div>
              ) : branchMembers.length === 0 ? (
                <div className="text-center py-6 text-xs text-neutral-450 italic">
                  No recruiters currently assigned to this branch.
                </div>
              ) : (
                branchMembers.map((user) => {
                  const isManager = selectedBranch.managerId === user.id;
                  const rolesArray: string[] = Array.isArray(user.roles) ? user.roles : [user.roles];

                  return (
                    <div key={user.id} className="flex items-center justify-between p-3.5 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-neutral-800 dark:text-white">{user.fullName}</p>
                          {isManager && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <Crown className="h-3 w-3" /> Branch Head
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500">{user.email}</p>
                        
                        {/* ROLES BADGES */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {rolesArray.map((r) => (
                            <span key={r} className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                              {r === "BRANCH_ADMIN" ? "Branch Admin" : r.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isManager && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignManager(user.id)}
                            className="h-7 text-[10px] font-bold border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
                          >
                            Set as Branch Head
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditMemberRolesModal(user)}
                          className="h-7 text-[10px] font-bold border-neutral-300"
                        >
                          <Shield className="h-3 w-3 mr-1 text-indigo-650" /> Configure Roles
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-slate-850 border-t border-neutral-100 dark:border-slate-800 text-right">
              <Button size="sm" variant="outline" onClick={() => setIsMembersOpen(false)} className="h-8 text-xs font-bold">
                Close Roster
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-ROLE ASSIGNMENT MODAL */}
      {isAssignUserOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-650" /> Configure Roles: {selectedMember.fullName}
                </h3>
                <p className="text-[11px] text-neutral-400">Assign single or multiple operational roles to this staff member</p>
              </div>
              <button onClick={() => setIsAssignUserOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberRoles} className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                  Select Assigned System Roles
                </label>
                <div className="space-y-2 border border-neutral-200 dark:border-slate-800 p-3 rounded-lg bg-neutral-50/50">
                  {availableRolesList.map((r) => {
                    const isChecked = selectedRoles.includes(r.key);
                    return (
                      <div 
                        key={r.key} 
                        onClick={() => {
                          if (isChecked) setSelectedRoles(selectedRoles.filter(role => role !== r.key));
                          else setSelectedRoles([...selectedRoles, r.key]);
                        }}
                        className={`flex items-start gap-2.5 p-2 rounded cursor-pointer transition-colors border ${
                          isChecked ? "bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/40" : "bg-white border-neutral-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent div
                          className="h-4 w-4 accent-indigo-600 cursor-pointer mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-800 dark:text-white leading-none">{r.label}</p>
                          <p className="text-[10px] text-neutral-450 mt-0.5">{r.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignUserOpen(false)} className="h-8 text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-8 text-xs bg-indigo-650 hover:bg-indigo-700 text-white font-bold">
                  Save Roles & Permissions
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
