"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Check, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ColumnDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allColumns: { id: string; label: string }[];
  selectedColumns: string[];
  onApply: (newSelectedOrder: string[]) => void;
}

export default function ColumnManager({
  isOpen,
  onClose,
  allColumns,
  selectedColumns: initialSelected,
  onApply,
}: ColumnDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelected, setTempSelected] = useState<string[]>(initialSelected);

  // Sync state on mount / open
  useEffect(() => {
    if (isOpen) {
      setTempSelected(initialSelected);
    }
  }, [isOpen, initialSelected]);

  const toggleColumnSelection = (id: string) => {
    setTempSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    if (tempSelected.length === allColumns.length) {
      setTempSelected([]);
    } else {
      setTempSelected(allColumns.map((col) => col.id));
    }
  };

  const moveColumn = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= tempSelected.length) return;

    const newOrder = [...tempSelected];
    const temp = newOrder[index];
    newOrder[index] = newOrder[nextIndex];
    newOrder[nextIndex] = temp;
    setTempSelected(newOrder);
  };

  const handleApply = () => {
    onApply(tempSelected);
    onClose();
  };

  const filteredColumns = allColumns.filter((col) =>
    col.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-[460px] max-w-md bg-white dark:bg-slate-900 border-l border-neutral-200 dark:border-slate-800 shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-in-out">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between bg-neutral-50 dark:bg-slate-900/50">
            <div>
              <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
                Edit Columns
              </h2>
              <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                {tempSelected.length} of {allColumns.length} columns selected
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-200 dark:hover:bg-slate-800 rounded-full transition-colors text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content Body split: Left selection checklist, Right order list */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left Selection List */}
            <div className="w-1/2 border-r border-neutral-200 dark:border-slate-800 flex flex-col bg-neutral-50/30 dark:bg-slate-950/20">
              <div className="p-3 border-b border-neutral-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search Column..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-slate-850 border border-neutral-350 dark:border-slate-700 rounded pl-8 pr-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 outline-hidden focus:border-primary transition-all"
                  />
                </div>

                {/* Select All */}
                <button
                  onClick={handleSelectAll}
                  className="text-[11px] text-primary dark:text-blue-400 font-bold flex items-center gap-1.5 hover:underline text-left cursor-pointer"
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5",
                      tempSelected.length === allColumns.length ? "opacity-100" : "opacity-40"
                    )}
                  />
                  Select All
                </button>
              </div>

              {/* Checklist */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {filteredColumns.map((col) => {
                  const isChecked = tempSelected.includes(col.id);
                  return (
                    <label
                      key={col.id}
                      className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer select-none text-xs text-neutral-700 dark:text-neutral-300 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleColumnSelection(col.id)}
                        className="h-3.5 w-3.5 text-primary border-neutral-300 dark:border-slate-700 rounded focus:ring-primary/20 accent-primary"
                      />
                      <span className="font-medium">{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Right Order List */}
            <div className="w-1/2 flex flex-col bg-white dark:bg-slate-900">
              <div className="p-3 border-b border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-900/50">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  Display Order
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {tempSelected.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-4 border-2 border-dashed border-neutral-200 dark:border-slate-800 rounded">
                    <p className="text-xs text-neutral-400">
                      No columns selected. Check items on the left to add them here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {tempSelected.map((colId, index) => {
                      const col = allColumns.find((c) => c.id === colId);
                      if (!col) return null;
                      return (
                        <div
                          key={colId}
                          className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-slate-850 border border-neutral-200 dark:border-slate-800 rounded text-xs select-none hover:border-neutral-400 dark:hover:border-slate-650 transition-colors"
                        >
                          <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate pr-2">
                            {col.label}
                          </span>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveColumn(index, "up")}
                              disabled={index === 0}
                              className="p-1 hover:bg-neutral-200 dark:hover:bg-slate-750 disabled:opacity-30 disabled:hover:bg-transparent rounded text-neutral-500 dark:text-neutral-400 cursor-pointer"
                              title="Move Up"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveColumn(index, "down")}
                              disabled={index === tempSelected.length - 1}
                              className="p-1 hover:bg-neutral-200 dark:hover:bg-slate-750 disabled:opacity-30 disabled:hover:bg-transparent rounded text-neutral-500 dark:text-neutral-400 cursor-pointer"
                              title="Move Down"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleColumnSelection(colId)}
                              className="p-1 hover:bg-neutral-200 dark:hover:bg-slate-750 text-neutral-400 hover:text-red-650 rounded cursor-pointer ml-1"
                              title="Remove"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-900/50 flex items-center justify-end gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-slate-800 cursor-pointer font-semibold text-xs animate-none"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="bg-primary text-white hover:bg-primary/90 px-5 cursor-pointer font-bold text-xs shadow-xs border-none"
            >
              Apply Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
