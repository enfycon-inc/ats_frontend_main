"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { mockApplicants, Applicant } from "./data/mock-applicants";
import { atsApi } from "@/lib/ats-api";

export default function ApplicantsPage() {
  // ── View state ────────────────────────────────────────────
  const [savedViews, setSavedViews] = useState<string[]>([]);
  const [activeView, setActiveView] = useState("All Applicants");

  // ── Column state ─────────────────────────────────────────
  const [selectedColumns, setSelectedColumns] =
    useState<string[]>(DEFAULT_COLUMNS);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);

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

  // ── Backend Live Data State ──────────────────────────────
  const [dbCandidates, setDbCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCandidates() {
      try {
        const data = await atsApi.candidates.list();
        setDbCandidates(data);
      } catch (err) {
        console.error("Failed to load candidates from database:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCandidates();
  }, []);

  // ── Filtered data (by filter drawer selections) ──────────
  const filteredData = useMemo(() => {
    const dbMapped: Applicant[] = dbCandidates.map((c) => ({
      applicantId: c.applicantId || `APP-${c.id}`,
      applicantName: c.fullName,
      email: c.email,
      mobile: c.phone || "N/A",
      city: c.city || "Unknown",
      state: c.state || "Unknown",
      source: c.source || "Direct Upload",
      status: c.status || "New lead",
      jobTitle: c.jobTitle || "Unknown",
      workAuthorization: c.workAuthorization || "US Citizen",
      ownership: "System",
      createdBy: "System",
      createdOn: c.createdOn ? new Date(c.createdOn).toLocaleDateString() : new Date().toLocaleDateString(),
      createdDate: c.createdOn ? new Date(c.createdOn).toLocaleDateString() : new Date().toLocaleDateString(),
      skills: c.skills ? c.skills.join(", ") : "",
      experience: c.experienceYears ? `${c.experienceYears} Years` : "0 Years",
      starred: false,
    }));

    let result = [...dbMapped, ...mockApplicants];

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
    try {
      setLoading(true);
      const data = await atsApi.candidates.list();
      setDbCandidates(data);
    } catch (err) {
      console.error("Failed to refresh candidates:", err);
    } finally {
      setLoading(false);
    }
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
      `applicants_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteSelected = async () => {
    // Attempt deleting selected candidates from the DB if they are DB records
    try {
      setLoading(true);
      for (const id of selectedRowIds) {
        // DB records typically start with INT- or are pure IDs (check for DB candidates)
        const match = String(id).match(/INT-.*-(\d+)/);
        if (match && match[1]) {
          await atsApi.candidates.delete(parseInt(match[1], 10));
        } else if (String(id).startsWith("APP-")) {
          const rawId = String(id).replace("APP-", "");
          await atsApi.candidates.delete(parseInt(rawId, 10));
        }
      }
      const data = await atsApi.candidates.list();
      setDbCandidates(data);
      setSelectedRowIds([]);
    } catch (err) {
      console.error("Failed to delete selected candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Total pages (needed by pagination) ────────────────────
  const totalRecords = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  return (
    <>
      {/* ── Viewport-locked workspace ───────────────────── */}
      <div className="flex flex-col h-full min-h-0 min-w-0 gap-0">
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
        />

        {/* Search row */}
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

        {/* Data grid */}
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
        />

        {/* Pagination */}
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

      {/* ── Drawers ─────────────────────────────────────── */}
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
        onApply={setSelectedColumns}
      />
    </>
  );
}
