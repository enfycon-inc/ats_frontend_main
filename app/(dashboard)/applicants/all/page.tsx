"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import ApplicantToolbar from "@/components/applicants/applicant-toolbar";
import SearchToolbar from "@/components/applicants/search-toolbar";
import ApplicantsTable, {
  ALL_COLUMNS,
  DEFAULT_COLUMNS,
} from "@/components/applicants/applicants-table";
import ApplicantPagination from "@/components/applicants/pagination";
import FilterDrawer, {
  SelectedFilters,
} from "@/components/applicants/filter-drawer";
import ColumnManager from "@/components/applicants/column-manager";
import UploadCvModal from "@/components/applicants/upload-cv-modal";
import { mockApplicants, Applicant } from "../data/mock-applicants";
import { atsApi } from "@/lib/ats-api";
import { useSession } from "next-auth/react";
import { CheckCircle2, AlertCircle, Users, FileText, UploadCloud, Database } from "lucide-react";
import { getUserColumnPreferences, saveUserColumnPreferences } from "@/utils/user-column-preferences";

export default function AllApplicantsPage() {
  // ── View state ────────────────────────────────────────────
  const [savedViews, setSavedViews] = useState<string[]>([]);
  const [activeView, setActiveView] = useState("All Applicants");

  const { data: session } = useSession();
  const [overrideRole, setOverrideRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOverrideRole(localStorage.getItem("override_role"));
      const handleRoleChange = () => {
        setOverrideRole(localStorage.getItem("override_role"));
      };
      window.addEventListener("overrideRoleChanged", handleRoleChange);
      return () => window.removeEventListener("overrideRoleChanged", handleRoleChange);
    }
  }, []);

  const systemRole = useMemo(() => {
    return overrideRole || (session as any)?.user?.systemRole || "RECRUITER";
  }, [session, overrideRole]);

  const isRecruiter = systemRole === "RECRUITER";

  // ── Column state (User Persistent) ─────────────────────────
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() =>
    getUserColumnPreferences("applicants", DEFAULT_COLUMNS)
  );
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setSelectedColumns(getUserColumnPreferences("applicants", DEFAULT_COLUMNS));
    }
  }, [session]);

  // ── Filter state ─────────────────────────────────────────
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<SelectedFilters>({
    source: "All selected",
    predefined: [],
  });

  // ── Search state ─────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("All");

  // ── Pagination state ─────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Selection state ──────────────────────────────────────
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // ── Modals & Toast ──────────────────────────────────────
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Backend Live Data State ──────────────────────────────
  const [dbCandidates, setDbCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await atsApi.candidates.list({ allMarkets: true, allBranches: true, limit: 5000 });
      setDbCandidates(data);
    } catch (err) {
      console.error("Failed to load candidates from database:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const isTenantAdmin = systemRole === "TENANT_ADMIN" || systemRole === "ADMIN" || systemRole === "SUPER_ADMIN";

  // Source Counts for KPI banner
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {
      total: dbCandidates.length,
      cvUpload: 0,
      dice: 0,
      monster: 0,
      linkedIn: 0,
    };

    dbCandidates.forEach((c) => {
      const src = c.source || "CV Upload";
      if (src.includes("CV") || src.includes("Upload") || src.includes("Direct") || src.includes("Manual")) counts.cvUpload++;
      else if (src.includes("Dice")) counts.dice++;
      else if (src.includes("Monster")) counts.monster++;
      else if (src.includes("LinkedIn")) counts.linkedIn++;
    });

    return counts;
  }, [dbCandidates]);

  // ── Filtered data ───────────────────────────────────────
  const filteredData = useMemo(() => {
    const dbMapped: any[] = dbCandidates.map((c) => ({
      candidateCode: c.candidateCode || `CAN-${String(c.dbId || c.id).padStart(6, '0')}`,
      uploadedByName: c.uploadedByName || "System Upload",
      applicantId: c.applicantId || `APP-${c.id}`,
      applicantName: c.fullName,
      email: c.email,
      mobile: c.phone || "N/A",
      city: c.city || "Unknown",
      state: c.state || "Unknown",
      source: c.source || "CV Upload",
      status: c.status || "New lead",
      jobTitle: c.jobTitle || "Unknown",
      workAuthorization: c.workAuthorization || "US Citizen",
      ownership: c.uploadedByName || "System",
      createdBy: c.uploadedByName || "System",
      createdOn: c.createdOn ? new Date(c.createdOn).toLocaleDateString() : new Date().toLocaleDateString(),
      createdDate: c.createdOn ? new Date(c.createdOn).toLocaleDateString() : new Date().toLocaleDateString(),
      skills: c.skills ? c.skills.join(", ") : "",
      experience: c.experienceYears ? `${c.experienceYears} Years` : "0 Years",
      starred: false,
    }));

    let result = dbMapped;

    // Source filter
    if (filters.source && filters.source !== "All selected") {
      result = result.filter((a) => a.source === filters.source);
    }

    // Predefined filter tags
    if (filters.predefined.length > 0) {
      result = result.filter((a) => {
        return filters.predefined.some((tag) => {
          if (tag === "New leads") return a.status === "New lead";
          if (tag === "Interviewing") return a.status === "Interviewing";
          if (tag === "H1B Candidates") return a.workAuthorization === "Have H1 Visa";
          if (tag === "US Citizens") return a.workAuthorization === "US Citizen";
          if (tag === "Dice Sourced") return a.source === "Dice";
          if (tag === "LinkedIn Sourced") return a.source === "LinkedIn";
          return false;
        });
      });
    }

    return result;
  }, [filters, dbCandidates]);

  const activeFiltersCount =
    (filters.source !== "All selected" ? 1 : 0) + filters.predefined.length;

  // ── Handlers ─────────────────────────────────────────────
  const handleSaveView = (name: string) => {
    setSavedViews((prev) => [...prev, name]);
    setActiveView(name);
  };

  const handleRefresh = async () => {
    setSearchQuery("");
    setSearchFilter("All");
    setCurrentPage(1);
    setSelectedRowIds([]);
    await loadCandidates();
    setToast({ kind: "ok", msg: "Candidate database refreshed successfully!" });
  };

  const handleExport = () => {
    const headers = selectedColumns.map(
      (colId) => ALL_COLUMNS.find((c) => c.id === colId)?.label || colId
    );
    const rows = filteredData.map((a) =>
      selectedColumns.map((colId) => {
        const val = a[colId as keyof typeof a];
        return `"${String(val || "").replace(/"/g, '""')}"`;
      })
    );
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `all_applicants_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedRowIds.length} candidate(s)?`)) return;
    try {
      setLoading(true);
      for (const id of selectedRowIds) {
        const match = String(id).match(/INT-.*-(\d+)/);
        if (match && match[1]) {
          await atsApi.candidates.delete(parseInt(match[1], 10));
        } else if (String(id).startsWith("APP-")) {
          const rawId = String(id).replace("APP-", "");
          await atsApi.candidates.delete(parseInt(rawId, 10));
        }
      }
      await loadCandidates();
      setSelectedRowIds([]);
      setToast({ kind: "ok", msg: "Selected candidate(s) deleted." });
    } catch (err: any) {
      console.error("Failed to delete selected candidates:", err);
      setToast({ kind: "err", msg: err?.message || "Failed to delete candidates" });
    } finally {
      setLoading(false);
    }
  };

  // Quick filter by clicking KPI Stat tiles
  const filterByKpiSource = (sourceName: string) => {
    if (sourceName === "ALL") {
      setFilters({ source: "All selected", predefined: [] });
    } else {
      setFilters({ source: sourceName, predefined: [] });
    }
    setCurrentPage(1);
  };

  // ── Total pages ────────────────────────────────────────────
  const totalRecords = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  return (
    <>
      {/* ── Viewport-locked professional ATS workspace ───────────────────── */}
      <div className="flex flex-col h-full min-h-0 min-w-0 gap-0 bg-neutral-50 dark:bg-slate-950 font-sans">
        
        {/* KPI Summary Tiles Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-800 shrink-0">
          <div 
            onClick={() => filterByKpiSource("ALL")}
            className="group cursor-pointer rounded-lg border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-850 px-3 py-2 hover:border-blue-400 transition-all shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Candidates</span>
              <Users className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-neutral-900 dark:text-white mt-0.5">{sourceCounts.total}</div>
          </div>

          <div 
            onClick={() => filterByKpiSource("CV Upload")}
            className="group cursor-pointer rounded-lg border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-850 px-3 py-2 hover:border-violet-400 transition-all shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">From CV Upload</span>
              <UploadCloud className="h-3.5 w-3.5 text-violet-500" />
            </div>
            <div className="text-xl font-bold text-violet-700 dark:text-violet-300 mt-0.5">{sourceCounts.cvUpload}</div>
          </div>

          <div 
            onClick={() => filterByKpiSource("Dice")}
            className="group cursor-pointer rounded-lg border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-850 px-3 py-2 hover:border-orange-400 transition-all shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">From Dice</span>
              <Database className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <div className="text-xl font-bold text-orange-700 dark:text-orange-300 mt-0.5">{sourceCounts.dice}</div>
          </div>

          <div 
            onClick={() => filterByKpiSource("Monster")}
            className="group cursor-pointer rounded-lg border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-850 px-3 py-2 hover:border-indigo-400 transition-all shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">From Monster</span>
              <Database className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">{sourceCounts.monster}</div>
          </div>
        </div>

        {/* Toolbar row */}
        <ApplicantToolbar
          savedViews={savedViews}
          activeView={activeView}
          onSelectView={setActiveView}
          onSaveView={handleSaveView}
          onRefresh={handleRefresh}
          onExport={handleExport}
          selectedCount={selectedRowIds.length}
          onDeleteSelected={handleDeleteSelected}
          isRecruiter={isRecruiter}
          isTenantAdmin={isTenantAdmin}
          onUploadCv={() => setUploadModalOpen(true)}
        />

        {/* Search & Filter row */}
        <SearchToolbar
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          searchFilter={searchFilter}
          onSearchFilterChange={setSearchFilter}
          onOpenFilters={() => setIsFilterDrawerOpen(true)}
          onOpenColumns={() => setIsColumnManagerOpen(true)}
          activeFiltersCount={activeFiltersCount}
        />

        {/* Professional Enterprise Data Grid */}
        <ApplicantsTable
          data={filteredData}
          selectedColumns={selectedColumns}
          allColumns={ALL_COLUMNS}
          searchQuery={searchQuery}
          searchFilter={searchFilter}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          selectedRowIds={selectedRowIds}
          onSelectionChange={setSelectedRowIds}
          onReorderColumns={(newCols) => {
            setSelectedColumns(newCols);
            saveUserColumnPreferences("applicants", newCols);
          }}
          isRecruiter={isRecruiter}
          loading={loading}
        />

        {/* Pagination bar */}
        <ApplicantPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* ── Modals & Drawers ─────────────────────────────────────── */}
      {uploadModalOpen && (
        <UploadCvModal
          onClose={() => setUploadModalOpen(false)}
          onDone={(msg) => {
            setToast({ kind: "ok", msg });
            loadCandidates();
          }}
        />
      )}

      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setCurrentPage(1);
        }}
        currentFilters={filters}
      />

      <ColumnManager
        isOpen={isColumnManagerOpen}
        onClose={() => setIsColumnManagerOpen(false)}
        allColumns={ALL_COLUMNS}
        selectedColumns={selectedColumns}
        defaultColumns={DEFAULT_COLUMNS}
        onApply={(newCols) => {
          setSelectedColumns(newCols);
          saveUserColumnPreferences("applicants", newCols);
        }}
      />

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold shadow-xl transition-all ${
          toast.kind === "ok"
            ? "bg-emerald-600 text-white"
            : "bg-red-600 text-white"
        }`}>
          {toast.kind === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}
    </>
  );
}
