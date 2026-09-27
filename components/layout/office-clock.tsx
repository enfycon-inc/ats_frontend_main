"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function OfficeClock() {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [timeZoneString, setTimeZoneString] = useState("UTC");
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");

  const syncBranchConfig = () => {
    if (typeof window === "undefined") return;
    const branchTz = localStorage.getItem("active_branch_timezone");
    const branchMarket = localStorage.getItem("active_branch_market");
    const start = localStorage.getItem("active_branch_start_time");
    const end = localStorage.getItem("active_branch_end_time");

    let resolvedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (branchTz) {
      if (branchTz === "India" || branchTz === "IST") resolvedTz = "Asia/Kolkata";
      else if (branchTz === "USA" || branchTz === "EST" || branchTz === "EDT") resolvedTz = "America/New_York";
      else resolvedTz = branchTz;
    } else if (branchMarket) {
      const m = branchMarket.toUpperCase();
      resolvedTz = (m === "US" || m === "USA") ? "America/New_York" : "Asia/Kolkata";
    }

    setTimeZoneString(resolvedTz);
    if (start) setShiftStart(start);
    else setShiftStart("");

    if (end) setShiftEnd(end);
    else setShiftEnd("");
  };

  useEffect(() => {
    setMounted(true);
    syncBranchConfig();
    setCurrentTime(new Date());

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const handleStorage = () => syncBranchConfig();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("branchChanged", handleStorage);

    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("branchChanged", handleStorage);
    };
  }, []);

  if (!mounted || !currentTime) {
    return (
      <div className="hidden sm:flex items-center h-8 w-28 bg-white/10 rounded-lg animate-pulse" />
    );
  }

  // 1. Format target time: "hh:mm:ss A (EST/IST/etc.)"
  let formattedTime = "";
  try {
    const tzFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZoneString,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
    formattedTime = tzFormatter.format(currentTime);
    if (timeZoneString === "Asia/Kolkata") {
      formattedTime = formattedTime.replace(/GMT\+5:30|GMT\+05:30/gi, "IST");
    }
  } catch {
    formattedTime = currentTime.toLocaleTimeString();
  }

  // 2. Parse shift start & end times
  const parseTime = (timeStr?: string, defaultH = 9, defaultM = 0) => {
    if (!timeStr || typeof timeStr !== "string") return { hour: defaultH, minute: defaultM };
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return { hour: defaultH, minute: defaultM };
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3]?.toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return { hour: hours, minute: minutes };
  };

  const startParts = parseTime(shiftStart, 9, 0);
  const endParts = parseTime(shiftEnd, 18, 0);

  // 3. Current time in target timezone
  let currHour = currentTime.getHours();
  let currMin = currentTime.getMinutes();
  let currSec = currentTime.getSeconds();
  try {
    const partsFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZoneString,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = partsFormatter.formatToParts(currentTime);
    parts.forEach((p) => {
      if (p.type === "hour") currHour = parseInt(p.value === "24" ? "0" : p.value, 10);
      if (p.type === "minute") currMin = parseInt(p.value, 10);
      if (p.type === "second") currSec = parseInt(p.value, 10);
    });
  } catch {}

  const currentMinutesIntoDay = currHour * 60 + currMin + currSec / 60;
  const startMinutesIntoDay = startParts.hour * 60 + startParts.minute;
  const endMinutesIntoDay = endParts.hour * 60 + endParts.minute;

  let isOpen = false;
  let diffSeconds = 0;

  if (endMinutesIntoDay > startMinutesIntoDay) {
    // Normal single-day shift (e.g. 09:00 to 18:00)
    if (currentMinutesIntoDay >= startMinutesIntoDay && currentMinutesIntoDay < endMinutesIntoDay) {
      isOpen = true;
      diffSeconds = Math.floor((endMinutesIntoDay - currentMinutesIntoDay) * 60);
    } else if (currentMinutesIntoDay < startMinutesIntoDay) {
      isOpen = false;
      diffSeconds = Math.floor((startMinutesIntoDay - currentMinutesIntoDay) * 60);
    } else {
      isOpen = false;
      diffSeconds = Math.floor((24 * 60 - currentMinutesIntoDay + startMinutesIntoDay) * 60);
    }
  } else {
    // Overnight shift (e.g. 19:00 to 04:00)
    if (currentMinutesIntoDay >= startMinutesIntoDay || currentMinutesIntoDay < endMinutesIntoDay) {
      isOpen = true;
      if (currentMinutesIntoDay >= startMinutesIntoDay) {
        diffSeconds = Math.floor((24 * 60 - currentMinutesIntoDay + endMinutesIntoDay) * 60);
      } else {
        diffSeconds = Math.floor((endMinutesIntoDay - currentMinutesIntoDay) * 60);
      }
    } else {
      isOpen = false;
      diffSeconds = Math.floor((startMinutesIntoDay - currentMinutesIntoDay) * 60);
    }
  }

  const diffHours = Math.floor(diffSeconds / 3600);
  const diffMinutes = Math.floor((diffSeconds % 3600) / 60);
  const diffSec = diffSeconds % 60;

  const h = diffHours.toString().padStart(2, "0");
  const m = diffMinutes.toString().padStart(2, "0");
  const s = diffSec.toString().padStart(2, "0");

  let statusText = "";
  if (isOpen) {
    statusText = `Closes in ${h}:${m}:${s}`;
  } else {
    const formattedStartTime = `${String(startParts.hour % 12 || 12).padStart(2, "0")}:${String(startParts.minute).padStart(2, "0")} ${startParts.hour >= 12 ? "PM" : "AM"}`;
    statusText = `Opens at ${formattedStartTime} (in ${h}:${m}:${s})`;
  }

  return (
    <div
      title={`Active Branch Timezone: ${timeZoneString} • Shift: ${shiftStart} - ${shiftEnd}`}
      className="hidden sm:flex flex-col items-end justify-center px-2.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 shadow-2xs text-white transition-all select-none"
    >
      <div className="text-[11px] font-bold tracking-wide leading-tight text-white flex items-center gap-1">
        <Clock className="w-3 h-3 text-indigo-200" />
        <span>{formattedTime}</span>
      </div>
      <div className={`text-[9px] font-semibold leading-tight flex items-center gap-1 ${isOpen ? "text-emerald-300" : "text-slate-300"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
        <span>{shiftStart && shiftEnd ? statusText : "Office hours unavailable"}</span>
      </div>
    </div>
  );
}

export default OfficeClock;
