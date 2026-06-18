"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Settings,
  Plus,
  Search,
  Download,
  RefreshCw,
  FolderPlus,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DataTableProps<TData> {
  data: TData[];
  selectedColumns: string[];
  allColumns: { id: string; label: string }[];
  onOpenFilters: () => void;
  onOpenColumns: () => void;
  onRefresh: () => void;
  onSaveView: (viewName: string) => void;
  savedViews: string[];
  activeView: string;
  onSelectView: (viewName: string) => void;
  onUpdateRecord?: (recordId: string, updatedFields: Partial<TData>) => void;
  
  // Generic Configuration
  getRowId?: (row: TData) => string;
  searchFilterOptions?: { label: string; value: string }[];
  defaultSearchFilter?: string;
  onSearchChange?: (query: string, filter: string) => void;
  
  // Custom Cell Renderer
  customCellRenderer?: (
    row: TData,
    colId: string,
    isEditing: boolean,
    editValue: string,
    setEditValue: (val: string) => void,
    saveEdit: () => void,
    cancelEdit: () => void
  ) => React.ReactNode;
  
  // Custom Actions Renderer (Context Menu & Action Column)
  actionsRenderer?: (row: TData) => React.ReactNode;
  contextMenuRenderer?: (row: TData, close: () => void) => React.ReactNode;
  
  // Top right actions
  topRightActions?: React.ReactNode;
  
  // Editable configs
  editableColumns?: string[];
  
  searchPlaceholder?: string;
}

export default function DataTable<TData extends Record<string, any>>({
  data,
  selectedColumns,
  allColumns,
  onOpenFilters,
  onOpenColumns,
  onRefresh,
  onSaveView,
  savedViews,
  activeView,
  onSelectView,
  onUpdateRecord,
  getRowId = (row) => row.id,
  searchFilterOptions = [{ label: "Search Any", value: "All" }],
  defaultSearchFilter = "All",
  customCellRenderer,
  actionsRenderer,
  contextMenuRenderer,
  topRightActions,
  editableColumns = [],
  searchPlaceholder = "Type search terms...",
}: DataTableProps<TData>) {
  const router = useRouter();
  
  // Sorting State
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState(defaultSearchFilter);

  // Pagination State
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // New Save View dialog state
  const [newViewName, setNewViewName] = useState("");
  const [isSavingView, setIsSavingView] = useState(false);

  // Cell-level inline edit state
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editCellValue, setEditCellValue] = useState<string>("");

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    recordId: string;
  } | null>(null);

  // Handle Sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Filtered & Sorted Data
  const processedData = useMemo(() => {
    let result = [...data];

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) => {
        if (searchFilter === "All") {
          // generic match across selected columns
          return selectedColumns.some(colId => {
            const val = row[colId];
            return typeof val === "string" && val.toLowerCase().includes(q);
          });
        } else {
          const val = row[searchFilter];
          return typeof val === "string" && val.toLowerCase().includes(q);
        }
      });
    }

    // Sort
    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }

        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();
        if (strA < strB) return sortDirection === "asc" ? -1 : 1;
        if (strA > strB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, searchFilter, sortColumn, sortDirection, selectedColumns]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  // Row Selection logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds(paginatedData.map((row) => getRowId(row)));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleSelectRow = (recordId: string, checked: boolean) => {
    if (checked) {
      setSelectedRowIds((prev) => [...prev, recordId]);
    } else {
      setSelectedRowIds((prev) => prev.filter((id) => id !== recordId));
    }
  };

  // Context Menu handler
  const handleContextMenu = (e: React.MouseEvent, recordId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      recordId,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeContextMenu();
        setIsSavingView(false);
        handleCellCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // CSV Export
  const exportToCSV = () => {
    const headers = selectedColumns.map(
      (colId) => allColumns.find((c) => c.id === colId)?.label || colId
    );
    const rows = processedData.map((row) =>
      selectedColumns.map((colId) => {
        const value = row[colId];
        if (typeof value === "object") {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value || "").replace(/"/g, '""')}"`;
      })
    );

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cell-level double-click edit handlers
  const handleCellDoubleClick = (rowId: string, colId: string, currentValue: string) => {
    if (editableColumns.includes(colId)) {
      setEditingCell({ rowId, colId });
      setEditCellValue(currentValue === "N/A" ? "" : currentValue);
    }
  };

  const handleCellSave = () => {
    if (editingCell && onUpdateRecord) {
      onUpdateRecord(editingCell.rowId, { [editingCell.colId]: editCellValue || "N/A" } as Partial<TData>);
    }
    setEditingCell(null);
    setEditCellValue("");
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditCellValue("");
  };

  const defaultCellRenderer = (
    row: TData,
    colId: string,
    isEditing: boolean,
    editValue: string,
    setEditValue: (val: string) => void,
    saveEdit: () => void,
    cancelEdit: () => void
  ) => {
    if (isEditing) {
      return (
        <input
          autoFocus
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
          onClick={(e) => e.stopPropagation()}
          className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border-0 outline-none focus:ring-2 focus:ring-inset focus:ring-primary rounded-none text-neutral-800 dark:text-neutral-200"
        />
      );
    }
    return String(row[colId] || "N/A");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm shadow-none overflow-hidden relative font-sans" onClick={closeContextMenu}>
      {/* Action Bar */}
      <div className="py-1 px-2.5 border-b border-neutral-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-neutral-50/50 dark:bg-slate-900/50 text-xs">
        <div className="flex items-center gap-2">
          {/* Saved Views Select removed as per user request */}
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-1.5">
          {/* Bulk Actions */}
          {selectedRowIds.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-sm mr-1">
              <span className="text-[10px] font-bold text-primary">
                {selectedRowIds.length} Selected
              </span>
              <button
                onClick={exportToCSV}
                className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline ml-1 cursor-pointer"
              >
                <Download className="h-3 w-3" /> Export
              </button>
              <button
                onClick={() => setSelectedRowIds([])}
                className="text-[10px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 ml-1 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          <button
            onClick={onRefresh}
            className="p-1.5 border border-neutral-300 dark:border-slate-750 rounded bg-white dark:bg-slate-900 hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
            title="Refresh Table"
          >
            <RefreshCw className="h-3 w-3" />
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1 px-2 py-1 border border-neutral-300 dark:border-slate-750 rounded bg-white dark:bg-slate-900 hover:bg-neutral-100 dark:hover:bg-slate-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            <Download className="h-3 w-3" /> Export CSV
          </button>

          {topRightActions}

          {/* Right side settings icons */}
          <div className="flex items-center border-l border-neutral-200 dark:border-slate-800 pl-1.5 gap-0.5">
            <button
              onClick={onOpenFilters}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
              title="Filters"
            >
              <Filter className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onOpenColumns}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
              title="Columns settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters bar */}
      <div className="py-1 px-2.5 border-b border-neutral-200 dark:border-slate-800 flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900">
        <div className="flex items-center bg-neutral-50 dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded-sm w-[280px]">
          <select
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-2 pr-1 py-0.5 text-xs text-neutral-700 dark:text-neutral-300 bg-transparent outline-hidden cursor-pointer border-r border-neutral-300 dark:border-slate-700 font-medium"
          >
            {searchFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-2 py-0.5 text-xs text-neutral-850 dark:text-neutral-150 bg-transparent outline-hidden placeholder:text-neutral-400 font-medium"
          />
          <Search className="h-3.5 w-3.5 text-neutral-400 mr-2" />
        </div>
      </div>

      {/* Spreadsheet grid container */}
      <div className="flex-1 overflow-auto relative min-h-0 bg-neutral-50/20 dark:bg-slate-950/10">
        <table className="w-full min-w-max border-collapse text-left table-auto border-neutral-200 dark:border-slate-800">
          {/* Table Header */}
          <thead className="sticky top-0 z-10 bg-blue-50 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700 shadow-xs select-none">
            <tr>
              {/* Checkbox Header (Sticky Left) */}
              <th className="sticky left-0 z-20 w-[36px] min-w-[36px] p-1 text-center bg-blue-50 dark:bg-slate-800 border-r border-b border-neutral-250 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={
                    paginatedData.length > 0 &&
                    paginatedData.every((row) => selectedRowIds.includes(getRowId(row)))
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-3 w-3 accent-primary cursor-pointer rounded-xs"
                />
              </th>

              {/* Column Headers */}
              {selectedColumns.map((colId) => {
                const col = allColumns.find((c) => c.id === colId);
                const isSorted = sortColumn === colId;
                return (
                  <th
                    key={colId}
                    className="p-1.5 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 bg-blue-50 dark:bg-slate-800 border-r border-b border-neutral-250 dark:border-slate-700 hover:bg-blue-100 dark:hover:bg-slate-750 transition-colors cursor-pointer relative whitespace-nowrap"
                    onClick={() => handleSort(colId)}
                  >
                    <div className="flex items-center justify-between gap-1 pr-3">
                      <span className="uppercase tracking-wider text-[10px] whitespace-nowrap">{col?.label || colId}</span>
                      <div className="flex items-center gap-0.5 opacity-60">
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3 text-primary font-bold" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-primary font-bold" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 text-neutral-400" />
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}

              {/* Actions Header (Sticky Right) */}
              <th className="sticky right-0 z-20 w-[56px] min-w-[56px] p-1 text-center bg-blue-50 dark:bg-slate-800 border-l border-b border-neutral-250 dark:border-slate-700 uppercase tracking-wider text-[10px] font-bold text-neutral-700 dark:text-neutral-200">
                Action
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-neutral-200 dark:divide-slate-800 text-xs">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={selectedColumns.length + 2}
                  className="h-32 text-center text-neutral-500 font-medium bg-white dark:bg-slate-900"
                >
                  No matching records found. Try resetting your search or filters.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const rowId = getRowId(row);
                const isSelected = selectedRowIds.includes(rowId);
                const isRowEditing = editingCell?.rowId === rowId;
                return (
                  <tr
                    key={rowId}
                    onContextMenu={(e) => handleContextMenu(e, rowId)}
                    className={cn(
                      "group transition-colors cursor-default border-b border-neutral-200 dark:border-slate-800/80",
                      isSelected
                        ? "bg-primary/10 hover:bg-primary/10 dark:bg-primary/15 dark:hover:bg-primary/15"
                        : idx % 2 === 0
                        ? "bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-slate-800/60"
                        : "bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-slate-800/60",
                      isRowEditing ? "ring-1 ring-inset ring-primary/30" : ""
                    )}
                  >
                    {/* Checkbox (Sticky Left) */}
                    <td className={cn(
                      "sticky left-0 z-10 w-[36px] min-w-[36px] p-1.5 text-center border-r border-neutral-200 dark:border-slate-800 transition-colors duration-150",
                      isSelected
                        ? "bg-blue-50/95 dark:bg-blue-950/95"
                        : idx % 2 === 0
                        ? "bg-white dark:bg-slate-900 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/60"
                        : "bg-slate-50 dark:bg-slate-800/40 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/60"
                    )}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                        className="h-3 w-3 accent-primary cursor-pointer rounded-xs"
                      />
                    </td>

                    {/* Columns */}
                    {selectedColumns.map((colId) => {
                      const isCellEditing = editingCell?.rowId === rowId && editingCell?.colId === colId;
                      const isEditable = editableColumns.includes(colId);
                      const rawValue = String(row[colId] || "");
                      return (
                        <td
                          key={colId}
                          onDoubleClick={() => isEditable && handleCellDoubleClick(rowId, colId, rawValue)}
                          className={cn(
                            "py-2 px-2 border-r border-neutral-200 dark:border-slate-800 whitespace-nowrap font-normal text-neutral-800 dark:text-neutral-200 transition-colors",
                            isEditable && !isCellEditing ? "hover:bg-yellow-50/60 dark:hover:bg-yellow-950/10 cursor-cell" : "",
                            isCellEditing ? "p-0 bg-blue-50/40 dark:bg-blue-950/20" : ""
                          )}
                          title={isEditable && !isCellEditing ? "Double-click to edit" : undefined}
                        >
                          {customCellRenderer ? customCellRenderer(
                            row,
                            colId,
                            isCellEditing,
                            editCellValue,
                            setEditCellValue,
                            handleCellSave,
                            handleCellCancel
                          ) || defaultCellRenderer(row, colId, isCellEditing, editCellValue, setEditCellValue, handleCellSave, handleCellCancel)
                            : defaultCellRenderer(row, colId, isCellEditing, editCellValue, setEditCellValue, handleCellSave, handleCellCancel)}
                        </td>
                      );
                    })}

                    {/* Actions Column (Sticky Right) */}
                    <td className={cn(
                      "sticky right-0 z-10 w-[56px] min-w-[56px] p-0.5 text-center border-l border-neutral-200 dark:border-slate-800 transition-colors duration-150",
                      isSelected
                        ? "bg-blue-50/95 dark:bg-blue-950/95"
                        : idx % 2 === 0
                        ? "bg-white dark:bg-slate-900 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/60"
                        : "bg-slate-50 dark:bg-slate-800/40 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/60"
                    )}>
                      {isRowEditing ? (
                        <div className="flex items-center gap-0.5 justify-center">
                          <button
                            onMouseDown={(e) => { e.preventDefault(); handleCellSave(); }}
                            className="bg-green-600 text-white rounded-xs p-0.5 hover:bg-green-700 text-[9.5px] px-1 font-bold cursor-pointer"
                            title="Save (Enter)"
                          >
                            ✓
                          </button>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); handleCellCancel(); }}
                            className="bg-neutral-200 dark:bg-slate-700 text-neutral-700 dark:text-neutral-200 rounded-xs p-0.5 hover:bg-neutral-300 dark:hover:bg-slate-600 text-[9.5px] px-1 cursor-pointer"
                            title="Cancel (Esc)"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        actionsRenderer ? actionsRenderer(row) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-0.5 hover:bg-neutral-200 dark:hover:bg-slate-800 rounded text-neutral-500 dark:text-neutral-400 transition-colors cursor-pointer">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 py-0.5 font-sans">
                              <DropdownMenuItem
                                onClick={() => {
                                  if (editableColumns && editableColumns.length > 0) {
                                    const firstEditable = editableColumns[0];
                                    const rowId = getRowId(row);
                                    setEditingCell({ rowId, colId: firstEditable });
                                    setEditCellValue(String((row as any)[firstEditable] || ""));
                                  }
                                }}
                                className="cursor-pointer text-xs py-1 px-2 font-medium"
                              >
                                <Edit className="h-3 w-3 mr-1.5 text-neutral-500" /> Quick Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 hover:text-red-700 cursor-pointer text-xs py-1 px-2 font-medium">
                                <Trash2 className="h-3 w-3 mr-1.5 text-red-500" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="py-1 px-3 border-t border-neutral-200 dark:border-slate-800 bg-neutral-100 dark:bg-slate-850 flex items-center justify-between select-none shrink-0 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
        <div className="flex items-center gap-1.5">
          <span>
            {Math.min(processedData.length, (currentPage - 1) * pageSize + 1)}-
            {Math.min(processedData.length, currentPage * pageSize)} of{" "}
            {processedData.length} records
          </span>
        </div>

        {/* Page Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 border border-neutral-350 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 border border-neutral-350 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-slate-700 rounded-sm text-[11px] text-neutral-805 dark:text-neutral-150 outline-hidden cursor-pointer"
            >
              <option value={10}>10 Per Page</option>
              <option value={25}>25 Per Page</option>
              <option value={50}>50 Per Page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save View Modal Dialog */}
      {isSavingView && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-neutral-250 dark:border-slate-800 w-80 shadow-2xl space-y-4 font-sans">
            <div>
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                <FolderPlus className="h-4 w-4 text-primary" /> Save Current View
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Enter a name for this custom view config.
              </p>
            </div>
            <input
              type="text"
              placeholder="e.g. Custom View"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 outline-hidden focus:border-primary"
            />
            <div className="flex items-center justify-end gap-2 text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSavingView(false)}
                className="h-8 cursor-pointer text-neutral-500"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (newViewName.trim()) {
                    onSaveView(newViewName);
                    setNewViewName("");
                    setIsSavingView(false);
                  }
                }}
                className="h-8 bg-primary text-white cursor-pointer font-bold"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-white dark:bg-slate-900 border border-neutral-250 dark:border-slate-800 rounded shadow-2xl w-40 p-1 flex flex-col divide-y divide-neutral-200 dark:divide-slate-800 text-xs select-none font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenuRenderer && contextMenuRenderer(data.find((r) => getRowId(r) === contextMenu.recordId) as TData, closeContextMenu)}
        </div>
      )}
    </div>
  );
}
