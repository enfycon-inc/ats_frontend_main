"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Sun, Moon } from "lucide-react";

export type TimeFormat = "12h" | "24h";

interface ShiftTimePickerProps {
  label: string;
  value: string; // e.g. "18:30" or "09:30" or "06:30 PM"
  onChange: (value: string) => void;
  format: TimeFormat;
  className?: string;
  id?: string;
  required?: boolean;
}

// Parse string into { hour24: number, minute: number }
export function parseTimeTo24(val?: string): { hour24: number; minute: number } {
  if (!val || typeof val !== "string") return { hour24: 9, minute: 0 };
  const trimmed = val.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return { hour24: 9, minute: 0 };

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;

  return {
    hour24: Math.min(23, Math.max(0, isNaN(h) ? 9 : h)),
    minute: Math.min(59, Math.max(0, isNaN(m) ? 0 : m)),
  };
}

export function formatTimeDisplay(hour24: number, minute: number, fmt: TimeFormat) {
  const mStr = String(minute).padStart(2, "0");
  if (fmt === "24h") {
    return `${String(hour24).padStart(2, "0")}:${mStr}`;
  }
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const h12 = hour24 % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${mStr} ${ampm}`;
}

export function ShiftTimePicker({
  label,
  value,
  onChange,
  format,
  className,
  id,
  required,
}: ShiftTimePickerProps) {
  const { hour24, minute } = useMemo(() => parseTimeTo24(value), [value]);

  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  const [localHour, setLocalHour] = React.useState(format === "12h" ? String(hour12).padStart(2, "0") : String(hour24).padStart(2, "0"));
  const [localMinute, setLocalMinute] = React.useState(String(minute).padStart(2, "0"));

  React.useEffect(() => {
    setLocalHour(format === "12h" ? String(hour12).padStart(2, "0") : String(hour24).padStart(2, "0"));
    setLocalMinute(String(minute).padStart(2, "0"));
  }, [hour12, hour24, minute, format]);

  const handleHourChange = (newHourStr: string) => {
    setLocalHour(newHourStr);
    let raw = parseInt(newHourStr.replace(/\D/g, ""), 10);
    if (isNaN(raw)) return;

    if (format === "12h") {
      raw = Math.min(12, Math.max(1, raw));
      let updated24 = raw;
      if (ampm === "PM" && raw < 12) updated24 = raw + 12;
      if (ampm === "AM" && raw === 12) updated24 = 0;
      onChange(`${String(updated24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    } else {
      raw = Math.min(23, Math.max(0, raw));
      onChange(`${String(raw).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  };

  const handleMinuteChange = (newMinStr: string) => {
    setLocalMinute(newMinStr);
    let raw = parseInt(newMinStr.replace(/\D/g, ""), 10);
    if (isNaN(raw)) return;
    raw = Math.min(59, Math.max(0, raw));
    onChange(`${String(hour24).padStart(2, "0")}:${String(raw).padStart(2, "0")}`);
  };

  const handleBlurHour = () => setLocalHour(format === "12h" ? String(hour12).padStart(2, "0") : String(hour24).padStart(2, "0"));
  const handleBlurMinute = () => setLocalMinute(String(minute).padStart(2, "0"));

  const handleAmPmToggle = (target: "AM" | "PM") => {
    if (target === ampm) return;
    let new24 = hour24;
    if (target === "PM" && hour24 < 12) new24 = hour24 + 12;
    if (target === "AM" && hour24 >= 12) new24 = hour24 - 12;
    onChange(`${String(new24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  };

  // Alternative format representation for helper text
  const altDisplay =
    format === "12h"
      ? `24h: ${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      : `12h: ${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm}`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <span className="text-[10px] font-mono text-neutral-400">{altDisplay}</span>
      </div>

      <div className="relative flex items-center h-9.5 rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
        {/* Hours input */}
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={localHour}
          onChange={(e) => handleHourChange(e.target.value)}
          onBlur={handleBlurHour}
          className="w-8 text-center text-xs font-mono font-bold text-neutral-900 dark:text-white bg-transparent outline-none select-all"
          title={`Hour (${format === "12h" ? "1-12" : "00-23"})`}
          aria-label={`${label} Hour`}
        />

        <span className="text-neutral-400 font-mono font-bold px-0.5 select-none">:</span>

        {/* Minutes input */}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={localMinute}
          onChange={(e) => handleMinuteChange(e.target.value)}
          onBlur={handleBlurMinute}
          className="w-8 text-center text-xs font-mono font-bold text-neutral-900 dark:text-white bg-transparent outline-none select-all"
          title="Minute (00-59)"
          aria-label={`${label} Minute`}
        />

        <div className="flex-1" />

        {/* AM / PM Toggle Controls (Replaces the native browser clock icon!) */}
        {format === "12h" ? (
          <div className="flex items-center bg-neutral-100 dark:bg-slate-700/80 p-0.5 rounded-md border border-neutral-200 dark:border-slate-600/60 select-none">
            <button
              type="button"
              onClick={() => handleAmPmToggle("AM")}
              className={cn(
                "px-2 py-0.5 text-[10.5px] font-bold rounded transition-all cursor-pointer",
                ampm === "AM"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-slate-600"
              )}
              title="Set to AM (Morning / Forenoon)"
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => handleAmPmToggle("PM")}
              className={cn(
                "px-2 py-0.5 text-[10.5px] font-bold rounded transition-all cursor-pointer",
                ampm === "PM"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-slate-600"
              )}
              title="Set to PM (Afternoon / Evening / Night)"
            >
              PM
            </button>
          </div>
        ) : (
          /* In 24h mode: instead of a clock icon, display clean AM/PM pill so user always knows the period */
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-slate-700 text-neutral-600 dark:text-neutral-300 text-[10.5px] font-mono font-bold select-none border border-neutral-200 dark:border-slate-600">
            {ampm === "AM" ? <Sun className="h-3 w-3 text-amber-500" /> : <Moon className="h-3 w-3 text-indigo-400" />}
            <span>{ampm}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Format toggle selector (12-Hour vs 24-Hour)
 */
export function ShiftTimeFormatToggle({
  format,
  onChange,
  className,
}: {
  format: TimeFormat;
  onChange: (f: TimeFormat) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center bg-neutral-100 dark:bg-slate-800 p-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 select-none", className)}>
      <button
        type="button"
        onClick={() => onChange("12h")}
        className={cn(
          "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer",
          format === "12h"
            ? "bg-white dark:bg-slate-900 text-neutral-900 dark:text-white shadow-xs"
            : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
        )}
      >
        12-Hour (AM/PM)
      </button>
      <button
        type="button"
        onClick={() => onChange("24h")}
        className={cn(
          "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer",
          format === "24h"
            ? "bg-white dark:bg-slate-900 text-neutral-900 dark:text-white shadow-xs"
            : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
        )}
      >
        24-Hour
      </button>
    </div>
  );
}

/**
 * Visual badge showing shift duration and whether it spans overnight
 */
export function ShiftDurationSummary({
  startTime,
  endTime,
  timezone,
  breakMinutes = 60,
}: {
  startTime: string;
  endTime: string;
  timezone?: string;
  breakMinutes?: number;
}) {
  const start = parseTimeTo24(startTime);
  const end = parseTimeTo24(endTime);

  const startMin = start.hour24 * 60 + start.minute;
  let endMin = end.hour24 * 60 + end.minute;
  const isOvernight = endMin < startMin;

  if (isOvernight) {
    endMin += 24 * 60;
  }

  const totalMinutes = endMin - startMin;
  const totalHours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;
  const workHoursNet = Math.max(0, totalMinutes - (breakMinutes || 0));
  const netHours = Math.floor(workHoursNet / 60);
  const netRemMinutes = workHoursNet % 60;

  const start12 = formatTimeDisplay(start.hour24, start.minute, "12h");
  const end12 = formatTimeDisplay(end.hour24, end.minute, "12h");

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-neutral-50 dark:bg-slate-850 rounded-xl border border-neutral-200/80 dark:border-slate-800 text-xs">
      <div className="flex items-center gap-2">
        {isOvernight ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
            <Moon className="h-3 w-3" /> Overnight Shift (Ends Next Day)
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
            <Sun className="h-3 w-3" /> Day Shift
          </span>
        )}
        <span className="text-neutral-600 dark:text-neutral-300 font-semibold">
          {start12} – {end12}
        </span>
      </div>

      <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400 text-[11px]">
        <span>
          Gross: <strong className="text-neutral-800 dark:text-neutral-200">{totalHours}h {remMinutes > 0 ? `${remMinutes}m` : ""}</strong>
        </span>
        <span>•</span>
        <span>
          Net Work: <strong className="text-neutral-800 dark:text-neutral-200">{netHours}h {netRemMinutes > 0 ? `${netRemMinutes}m` : ""}</strong> ({breakMinutes}m break)
        </span>
      </div>
    </div>
  );
}
