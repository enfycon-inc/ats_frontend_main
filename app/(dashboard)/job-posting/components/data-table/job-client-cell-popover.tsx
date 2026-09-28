"use client";

import React from "react";
import { Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface JobClientCellPopoverProps {
  colId: "client" | "endClientName";
  currentValue: string;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  availableClientNames: string[];
  onSelectClient: (clientName: string) => void;
  onOpenAddClientModal: () => void;
  onCancel: () => void;
}

export function JobClientCellPopover({
  colId,
  currentValue,
  searchText,
  onSearchTextChange,
  availableClientNames,
  onSelectClient,
  onOpenAddClientModal,
  onCancel,
}: JobClientCellPopoverProps) {
  const filteredNames = availableClientNames.filter((cName) =>
    cName.toLowerCase().includes(searchText.trim().toLowerCase())
  );
  const exactMatchExists = availableClientNames.some(
    (cn) => cn.toLowerCase() === searchText.trim().toLowerCase()
  );

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute left-0 top-0 z-[99] min-w-[260px] max-w-[300px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl p-2.5 font-sans text-xs space-y-2 animate-in fade-in zoom-in-95"
    >
      {/* Header Title */}
      <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100 dark:border-slate-800">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Select or Add {colId === "endClientName" ? "End Client" : "Client"}
        </span>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
        <input
          autoFocus
          type="text"
          placeholder={`Search ${colId === "endClientName" ? "end clients..." : "clients..."}`}
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
          className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs outline-none focus:ring-1 focus:ring-[#1a4fa0] text-slate-900 dark:text-slate-100 font-medium"
        />
      </div>

      {/* Scrollable List of Clients */}
      <div className="max-h-44 overflow-y-auto space-y-0.5 border-y border-slate-100 dark:border-slate-800 py-1">
        {filteredNames.map((cName, index) => {
          const isCurrent = cName === currentValue;
          return (
            <div
              key={cName + index}
              onClick={() => onSelectClient(cName)}
              className={cn(
                "px-2.5 py-1.5 rounded-md cursor-pointer transition-colors flex items-center justify-between text-xs font-medium",
                isCurrent
                  ? "bg-[#1a4fa0]/10 text-[#1a4fa0] dark:bg-blue-950/40 dark:text-blue-300 font-semibold"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
              )}
            >
              <span>{cName}</span>
              {isCurrent && (
                <span className="text-[#1a4fa0] dark:text-blue-400 text-[10px] font-bold">
                  Selected
                </span>
              )}
            </div>
          );
        })}

        {searchText.trim() !== "" && !exactMatchExists && (
          <div
            onClick={onOpenAddClientModal}
            className="px-2.5 py-1.5 rounded-md cursor-pointer bg-blue-50 dark:bg-blue-950/40 text-[#1a4fa0] dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-between text-xs font-semibold"
          >
            <span>Use "{searchText.trim()}"</span>
            <span className="text-[10px] uppercase tracking-wider font-bold">+ Add New</span>
          </div>
        )}

        {filteredNames.length === 0 && searchText.trim() === "" && (
          <div className="px-2 py-3 text-center text-slate-400 italic text-[11px]">
            No clients available
          </div>
        )}
      </div>

      {/* Bottom Add Client Button */}
      <button
        type="button"
        onClick={onOpenAddClientModal}
        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1a4fa0] hover:bg-[#154185] text-white font-medium rounded-md text-xs transition-colors cursor-pointer shadow-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Add New Client</span>
      </button>
    </div>
  );
}
