import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function JobPostingSkeleton() {
  return (
    <div className="h-full flex flex-col min-h-0 font-sans gap-2 p-0 animate-pulse select-none">
      {/* 1. Branch Tabs Skeleton (All Jobs / Branch Jobs / Shared Jobs) */}
      <div className="flex bg-default-100 dark:bg-slate-800 p-1 rounded-lg border border-default-250 w-fit mb-2 gap-1">
        <Skeleton className="h-8 w-24 rounded-md bg-white dark:bg-slate-700 shadow-xs" />
        <Skeleton className="h-8 w-28 rounded-md bg-default-200/50 dark:bg-slate-750/50" />
        <Skeleton className="h-8 w-28 rounded-md bg-default-200/50 dark:bg-slate-750/50" />
      </div>

      {/* 2. Main Table Card Container */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm shadow-none overflow-hidden relative font-sans">
        {/* Action Bar */}
        <div className="py-1 px-2.5 border-b border-neutral-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-neutral-50/50 dark:bg-slate-900/50 text-xs">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-32 rounded bg-default-200 dark:bg-slate-800" />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Refresh button */}
            <Skeleton className="h-7 w-7 rounded bg-default-200 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700" />
            {/* Export CSV button */}
            <Skeleton className="h-7 w-24 rounded bg-default-200 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700" />
            {/* New Job button */}
            <Skeleton className="h-7 w-20 rounded bg-primary/40" />
            {/* Filters & Columns Settings */}
            <div className="flex items-center border-l border-neutral-200 dark:border-slate-800 pl-1.5 gap-0.5">
              <Skeleton className="h-7 w-7 rounded bg-default-200 dark:bg-slate-800" />
              <Skeleton className="h-7 w-7 rounded bg-default-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>

        {/* Multi-Filter Bar */}
        <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-900/60 border-b border-neutral-200 dark:border-slate-800">
          <div className="flex flex-wrap items-end gap-3 lg:gap-3.5">
            {/* SEARCH */}
            <div className="flex flex-col gap-1.5 flex-[1.4] min-w-[200px]">
              <Skeleton className="h-2.5 w-14 rounded bg-default-200 dark:bg-slate-700" />
              <Skeleton className="h-9 w-full rounded-md bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700" />
            </div>

            {/* POD */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[130px]">
              <Skeleton className="h-2.5 w-10 rounded bg-default-200 dark:bg-slate-700" />
              <Skeleton className="h-9 w-full rounded-md bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700" />
            </div>

            {/* BRANCH */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
              <Skeleton className="h-2.5 w-14 rounded bg-default-200 dark:bg-slate-700" />
              <Skeleton className="h-9 w-full rounded-md bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700" />
            </div>

            {/* CREATED BY */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
              <Skeleton className="h-2.5 w-18 rounded bg-default-200 dark:bg-slate-700" />
              <Skeleton className="h-9 w-full rounded-md bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700" />
            </div>

            {/* ASSIGNED TO */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
              <Skeleton className="h-2.5 w-20 rounded bg-default-200 dark:bg-slate-700" />
              <Skeleton className="h-9 w-full rounded-md bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700" />
            </div>

            {/* CLIENT */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
              <Skeleton className="h-2.5 w-12 rounded bg-default-200 dark:bg-slate-700" />
              <Skeleton className="h-9 w-full rounded-md bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700" />
            </div>

            {/* STATUS */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[130px]">
              <Skeleton className="h-2.5 w-12 rounded bg-default-200 dark:bg-slate-700" />
              <Skeleton className="h-9 w-full rounded-md bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700" />
            </div>

            {/* PRIORITY */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
              <Skeleton className="h-2.5 w-14 rounded bg-default-200 dark:bg-slate-700" />
              <Skeleton className="h-9 w-full rounded-md bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700" />
            </div>
          </div>
        </div>

        {/* Spreadsheet Grid Table */}
        <div className="flex-1 overflow-x-auto relative min-h-0 bg-neutral-50/20 dark:bg-slate-950/10">
          <table className="w-full border-collapse text-left table-auto border-neutral-200 dark:border-slate-800">
            {/* Table Header */}
            <thead className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-800 shadow-2xs backdrop-blur-xs">
              <tr>
                <th className="sticky left-0 z-20 w-[44px] min-w-[44px] px-3.5 py-3.5 text-center bg-slate-100/95 dark:bg-slate-900 border-r border-b border-neutral-200 dark:border-slate-800">
                  <Skeleton className="h-3.5 w-3.5 rounded-xs mx-auto bg-slate-300 dark:bg-slate-700" />
                </th>
                <th className="px-4 py-3.5 border-r border-b border-neutral-200 dark:border-slate-800 min-w-[110px]">
                  <Skeleton className="h-3 w-16 rounded bg-slate-300 dark:bg-slate-700" />
                </th>
                <th className="px-4 py-3.5 border-r border-b border-neutral-200 dark:border-slate-800 min-w-[220px]">
                  <Skeleton className="h-3 w-28 rounded bg-slate-300 dark:bg-slate-700" />
                </th>
                <th className="px-4 py-3.5 border-r border-b border-neutral-200 dark:border-slate-800 min-w-[140px]">
                  <Skeleton className="h-3 w-20 rounded bg-slate-300 dark:bg-slate-700" />
                </th>
                <th className="px-4 py-3.5 border-r border-b border-neutral-200 dark:border-slate-800 min-w-[110px]">
                  <Skeleton className="h-3 w-14 rounded bg-slate-300 dark:bg-slate-700" />
                </th>
                <th className="px-4 py-3.5 border-r border-b border-neutral-200 dark:border-slate-800 min-w-[160px]">
                  <Skeleton className="h-3 w-20 rounded bg-slate-300 dark:bg-slate-700" />
                </th>
                <th className="px-4 py-3.5 border-r border-b border-neutral-200 dark:border-slate-800 min-w-[160px]">
                  <Skeleton className="h-3 w-22 rounded bg-slate-300 dark:bg-slate-700" />
                </th>
                <th className="px-4 py-3.5 border-r border-b border-neutral-200 dark:border-slate-800 min-w-[150px]">
                  <Skeleton className="h-3 w-16 rounded bg-slate-300 dark:bg-slate-700" />
                </th>
                <th className="px-4 py-3.5 border-r border-b border-neutral-200 dark:border-slate-800 min-w-[130px]">
                  <Skeleton className="h-3 w-16 rounded bg-slate-300 dark:bg-slate-700" />
                </th>
                <th className="px-4 py-3.5 border-r border-b border-neutral-200 dark:border-slate-800 min-w-[110px]">
                  <Skeleton className="h-3 w-14 rounded bg-slate-300 dark:bg-slate-700" />
                </th>
                <th className="px-4 py-3.5 border-r border-b border-neutral-200 dark:border-slate-800 min-w-[120px]">
                  <Skeleton className="h-3 w-16 rounded bg-slate-300 dark:bg-slate-700" />
                </th>
                <th className="px-4 py-3.5 border-r border-b border-neutral-200 dark:border-slate-800 min-w-[110px]">
                  <Skeleton className="h-3 w-16 rounded bg-slate-300 dark:bg-slate-700" />
                </th>
                <th className="px-4 py-3.5 border-r border-b border-neutral-200 dark:border-slate-800 min-w-[70px]">
                  <Skeleton className="h-3 w-10 rounded bg-slate-300 dark:bg-slate-700" />
                </th>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-neutral-150 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
              {Array.from({ length: 12 }).map((_, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Checkbox */}
                  <td className="sticky left-0 z-10 w-[44px] px-3.5 py-3 text-center bg-white dark:bg-slate-900 border-r border-neutral-200 dark:border-slate-800">
                    <Skeleton className="h-3.5 w-3.5 rounded-xs mx-auto bg-default-200 dark:bg-slate-800" />
                  </td>

                  {/* Job Code */}
                  <td className="px-4 py-3 border-r border-neutral-150 dark:border-slate-850">
                    <Skeleton className="h-5 w-16 rounded font-mono bg-blue-100/60 dark:bg-blue-950/40" />
                  </td>

                  {/* Job Title */}
                  <td className="px-4 py-3 border-r border-neutral-150 dark:border-slate-850">
                    <Skeleton className="h-4 w-44 rounded bg-default-200 dark:bg-slate-700 mb-1" />
                    <Skeleton className="h-2.5 w-24 rounded bg-default-100 dark:bg-slate-800" />
                  </td>

                  {/* Business Unit */}
                  <td className="px-4 py-3 border-r border-neutral-150 dark:border-slate-850">
                    <Skeleton className="h-3.5 w-20 rounded bg-default-200 dark:bg-slate-800" />
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3 border-r border-neutral-150 dark:border-slate-850">
                    <Skeleton
                      className={`h-5 w-16 rounded-full ${
                        idx % 3 === 0
                          ? "bg-emerald-100/70 dark:bg-emerald-950/50"
                          : idx % 3 === 1
                          ? "bg-amber-100/70 dark:bg-amber-950/50"
                          : "bg-blue-100/70 dark:bg-blue-950/50"
                      }`}
                    />
                  </td>

                  {/* Created By */}
                  <td className="px-4 py-3 border-r border-neutral-150 dark:border-slate-850">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-6 rounded-full bg-default-200 dark:bg-slate-800 shrink-0" />
                      <Skeleton className="h-3.5 w-24 rounded bg-default-200 dark:bg-slate-800" />
                    </div>
                  </td>

                  {/* Assigned To */}
                  <td className="px-4 py-3 border-r border-neutral-150 dark:border-slate-850">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-6 rounded-full bg-default-200 dark:bg-slate-800 shrink-0" />
                      <Skeleton className="h-3.5 w-28 rounded bg-default-200 dark:bg-slate-800" />
                    </div>
                  </td>

                  {/* Client */}
                  <td className="px-4 py-3 border-r border-neutral-150 dark:border-slate-850">
                    <Skeleton className="h-3.5 w-24 rounded bg-default-200 dark:bg-slate-800" />
                  </td>

                  {/* Location */}
                  <td className="px-4 py-3 border-r border-neutral-150 dark:border-slate-850">
                    <Skeleton className="h-3.5 w-20 rounded bg-default-200 dark:bg-slate-800" />
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3 border-r border-neutral-150 dark:border-slate-850">
                    <Skeleton
                      className={`h-5 w-14 rounded-full ${
                        idx % 2 === 0
                          ? "bg-rose-100/70 dark:bg-rose-950/50"
                          : "bg-amber-100/70 dark:bg-amber-950/50"
                      }`}
                    />
                  </td>

                  {/* Bill Rate */}
                  <td className="px-4 py-3 border-r border-neutral-150 dark:border-slate-850">
                    <Skeleton className="h-3.5 w-16 rounded bg-default-200 dark:bg-slate-800 font-mono" />
                  </td>

                  {/* Submissions */}
                  <td className="px-4 py-3 border-r border-neutral-150 dark:border-slate-850">
                    <Skeleton className="h-5 w-8 rounded-full bg-default-200 dark:bg-slate-800 mx-auto" />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-center">
                    <Skeleton className="h-6 w-6 rounded-md bg-default-200 dark:bg-slate-850 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination Bar */}
        <div className="px-4 py-2.5 border-t border-neutral-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <Skeleton className="h-3.5 w-48 rounded bg-default-200 dark:bg-slate-800" />

          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-28 rounded bg-default-200 dark:bg-slate-800" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-7 w-7 rounded bg-default-200 dark:bg-slate-800" />
              <Skeleton className="h-7 w-7 rounded bg-default-200 dark:bg-slate-800" />
              <Skeleton className="h-7 w-7 rounded bg-default-200 dark:bg-slate-800" />
              <Skeleton className="h-7 w-7 rounded bg-default-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
