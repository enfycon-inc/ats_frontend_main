"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function ApplicantPagination({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="shrink-0 flex items-center justify-between px-3 py-1 border-t border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-sans">
      {/* Left: Record count */}
      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <span>
          Showing{" "}
          <span className="font-semibold text-neutral-700 dark:text-neutral-300">
            {startRecord}–{endRecord}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-neutral-700 dark:text-neutral-300">
            {totalRecords}
          </span>{" "}
          records
        </span>
      </div>

      {/* Right: Page size + Navigation */}
      <div className="flex items-center gap-2">
        {/* Rows per page */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="hidden sm:inline">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="px-1.5 py-0.5 text-xs border border-neutral-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-950 text-neutral-700 dark:text-neutral-300 outline-hidden cursor-pointer"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="w-px h-3.5 bg-neutral-200 dark:bg-slate-700" />

        {/* Page navigation */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={cn(
              "p-1 rounded-sm transition-colors cursor-pointer",
              currentPage === 1
                ? "text-neutral-300 dark:text-slate-700 cursor-not-allowed"
                : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-slate-800 hover:text-neutral-800 dark:hover:text-neutral-200"
            )}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={cn(
              "p-1 rounded-sm transition-colors cursor-pointer",
              currentPage === 1
                ? "text-neutral-300 dark:text-slate-700 cursor-not-allowed"
                : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-slate-800 hover:text-neutral-800 dark:hover:text-neutral-200"
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {/* Page indicator */}
          <span className="px-2 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{currentPage}</span>
            <span className="mx-1">/</span>
            <span>{totalPages || 1}</span>
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={cn(
              "p-1 rounded-sm transition-colors cursor-pointer",
              currentPage >= totalPages
                ? "text-neutral-300 dark:text-slate-700 cursor-not-allowed"
                : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-slate-800 hover:text-neutral-800 dark:hover:text-neutral-200"
            )}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className={cn(
              "p-1 rounded-sm transition-colors cursor-pointer",
              currentPage >= totalPages
                ? "text-neutral-300 dark:text-slate-700 cursor-not-allowed"
                : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-slate-800 hover:text-neutral-800 dark:hover:text-neutral-200"
            )}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
