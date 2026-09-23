/**
 * timezone-helper.ts
 *
 * Dynamic timezone utilities for ATS Operating Units and Branches.
 * Dynamically computes UTC offsets, daylight saving status (EDT vs EST, CDT vs CST, etc.),
 * and provides friendly labels with live current times.
 */

export interface TimezoneDefinition {
  tz: string;
  name: string;
  stdAbbr: string;
  dstAbbr: string;
  region: string;
  majorCities: string;
}

export const TIMEZONE_DEFINITIONS: TimezoneDefinition[] = [
  // United States
  {
    tz: "America/New_York",
    name: "US Eastern Time",
    stdAbbr: "EST",
    dstAbbr: "EDT",
    region: "United States",
    majorCities: "New York, Atlanta, Miami, Boston, Washington D.C., Charlotte, Toronto",
  },
  {
    tz: "America/Chicago",
    name: "US Central Time",
    stdAbbr: "CST",
    dstAbbr: "CDT",
    region: "United States",
    majorCities: "Chicago, Dallas, Houston, Austin, Minneapolis, Nashville",
  },
  {
    tz: "America/Denver",
    name: "US Mountain Time",
    stdAbbr: "MST",
    dstAbbr: "MDT",
    region: "United States",
    majorCities: "Denver, Salt Lake City, Boise, Albuquerque, Calgary",
  },
  {
    tz: "America/Phoenix",
    name: "US Mountain Time (No DST)",
    stdAbbr: "MST",
    dstAbbr: "MST",
    region: "United States",
    majorCities: "Phoenix, Tucson (Standard Time All Year)",
  },
  {
    tz: "America/Los_Angeles",
    name: "US Pacific Time",
    stdAbbr: "PST",
    dstAbbr: "PDT",
    region: "United States",
    majorCities: "Los Angeles, San Francisco, Seattle, San Diego, Portland, Vancouver",
  },

  // India & South Asia
  {
    tz: "Asia/Kolkata",
    name: "India Standard Time",
    stdAbbr: "IST",
    dstAbbr: "IST",
    region: "India & South Asia",
    majorCities: "Bhubaneswar, Bengaluru, New Delhi, Mumbai, Hyderabad, Chennai, Pune",
  },

  // Europe & UK
  {
    tz: "Europe/London",
    name: "UK & Ireland Time",
    stdAbbr: "GMT",
    dstAbbr: "BST",
    region: "Europe & UK",
    majorCities: "London, Dublin, Manchester, Edinburgh",
  },
  {
    tz: "Europe/Paris",
    name: "Central European Time",
    stdAbbr: "CET",
    dstAbbr: "CEST",
    region: "Europe & UK",
    majorCities: "Paris, Berlin, Amsterdam, Frankfurt, Madrid, Rome, Zurich, Brussels",
  },

  // Middle East & Asia Pacific
  {
    tz: "Asia/Dubai",
    name: "Gulf Standard Time",
    stdAbbr: "GST",
    dstAbbr: "GST",
    region: "Middle East",
    majorCities: "Dubai, Abu Dhabi, Muscat",
  },
  {
    tz: "Asia/Singapore",
    name: "Singapore Standard Time",
    stdAbbr: "SGT",
    dstAbbr: "SGT",
    region: "Asia Pacific",
    majorCities: "Singapore, Kuala Lumpur",
  },
  {
    tz: "Asia/Manila",
    name: "Philippine Standard Time",
    stdAbbr: "PHT",
    dstAbbr: "PHT",
    region: "Asia Pacific",
    majorCities: "Manila, Cebu",
  },
  {
    tz: "Asia/Tokyo",
    name: "Japan Standard Time",
    stdAbbr: "JST",
    dstAbbr: "JST",
    region: "Asia Pacific",
    majorCities: "Tokyo, Osaka",
  },
  {
    tz: "Australia/Sydney",
    name: "Australian Eastern Time",
    stdAbbr: "AEST",
    dstAbbr: "AEDT",
    region: "Australia & Oceania",
    majorCities: "Sydney, Melbourne, Canberra, Brisbane",
  },

  // Global standard
  {
    tz: "UTC",
    name: "Coordinated Universal Time",
    stdAbbr: "UTC",
    dstAbbr: "UTC",
    region: "Global Standards",
    majorCities: "Universal Time Coordinate",
  },
];

/**
 * Computes dynamic metadata for a timezone (current abbreviation, UTC offset string, and DST status)
 */
export function getTimezoneMeta(timeZone: string, date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    const parts = formatter.formatToParts(date);
    let abbr = parts.find((p) => p.type === "timeZoneName")?.value || "";

    if (timeZone === "Asia/Kolkata" && (abbr.startsWith("GMT") || !abbr)) {
      abbr = "IST";
    }

    // Dynamic offset calculation
    const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
    const tz = new Date(date.toLocaleString("en-US", { timeZone }));
    const diffMin = Math.round((tz.getTime() - utc.getTime()) / 60000);
    const sign = diffMin >= 0 ? "+" : "-";
    const absMin = Math.abs(diffMin);
    const hours = String(Math.floor(absMin / 60)).padStart(2, "0");
    const mins = String(absMin % 60).padStart(2, "0");
    const offset = `UTC${sign}${hours}:${mins}`;

    // Detect if DST is active by comparing with January offset
    let isDST = false;
    if (timeZone.startsWith("America/") || timeZone.startsWith("Europe/") || timeZone.startsWith("Australia/")) {
      try {
        const jan = new Date(date.getFullYear(), 0, 15);
        const jul = new Date(date.getFullYear(), 6, 15);
        const janUtc = new Date(jan.toLocaleString("en-US", { timeZone: "UTC" }));
        const janTz = new Date(jan.toLocaleString("en-US", { timeZone }));
        const janDiff = Math.round((janTz.getTime() - janUtc.getTime()) / 60000);

        const julUtc = new Date(jul.toLocaleString("en-US", { timeZone: "UTC" }));
        const julTz = new Date(jul.toLocaleString("en-US", { timeZone }));
        const julDiff = Math.round((julTz.getTime() - julUtc.getTime()) / 60000);

        if (janDiff !== julDiff) {
          // Northern hemisphere: summer (Jul) offset is greater than winter (Jan)
          const stdDiff = Math.min(janDiff, julDiff);
          isDST = diffMin > stdDiff;
        }
      } catch {
        isDST = false;
      }
    }

    return { abbr, offset, diffMin, isDST };
  } catch {
    return { abbr: "UTC", offset: "UTC+00:00", diffMin: 0, isDST: false };
  }
}

export interface DynamicTimezoneOption {
  value: string;
  label: string;
  shortLabel: string;
  region: string;
  currentAbbr: string;
  offset: string;
  isDST: boolean;
  notes: string;
}

/**
 * Returns dynamic timezone options for dropdowns with EDT/EST friendly labels.
 */
export function getDynamicTimezoneOptions(): DynamicTimezoneOption[] {
  const now = new Date();

  return TIMEZONE_DEFINITIONS.map((item) => {
    const meta = getTimezoneMeta(item.tz, now);
    const isUsEastern = item.tz === "America/New_York";
    const hasDst = item.stdAbbr !== item.dstAbbr;

    let friendlyVariant = "";
    if (hasDst) {
      friendlyVariant = `${item.dstAbbr} / ${item.stdAbbr}`;
    } else {
      friendlyVariant = item.stdAbbr;
    }

    // Dynamic descriptive label using GMT reference
    const gmtOffset = meta.offset.replace('UTC', 'GMT');
    const city = item.tz.includes('/') ? item.tz.split('/').pop()?.replace(/_/g, ' ') : item.tz;
    const label = `(${gmtOffset}) ${item.name} - ${city}`;

    const shortLabel = `(${gmtOffset}) ${item.name}`;

    let notes = "";
    if (hasDst) {
      notes = meta.isDST
        ? `Daylight Saving Time (${meta.abbr}) is currently active (${meta.offset}). Observes ${item.stdAbbr} in winter.`
        : `Standard Time (${meta.abbr}) is currently active (${meta.offset}). Observes ${item.dstAbbr} during daylight saving.`;
    } else {
      notes = `Standard Time (${meta.abbr} • ${meta.offset}). No seasonal daylight saving adjustment.`;
    }

    return {
      value: item.tz,
      label,
      shortLabel,
      region: item.region,
      currentAbbr: meta.abbr,
      offset: meta.offset,
      isDST: meta.isDST,
      notes,
    };
  });
}

/**
 * Retrieves live information for a given timezone (e.g. current clock time, active abbreviation, daylight status)
 */
export function getTimezoneLiveInfo(tz: string) {
  const resolvedTz = normalizeTimezone(tz);
  const now = new Date();
  const meta = getTimezoneMeta(resolvedTz, now);

  let formattedTime = "";
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: resolvedTz,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
    formattedTime = formatter.format(now);
    if (resolvedTz === "Asia/Kolkata") {
      formattedTime = formattedTime.replace(/GMT\+5:30|GMT\+05:30/gi, "IST");
    }
  } catch {
    formattedTime = now.toLocaleTimeString();
  }

  const def = TIMEZONE_DEFINITIONS.find((d) => d.tz === resolvedTz);
  const isEastern = resolvedTz === "America/New_York";

  let statusBadge = "";
  if (isEastern) {
    statusBadge = meta.isDST
      ? "EDT (Daylight Saving) Active"
      : "EST (Standard Time) Active";
  } else if (def && def.stdAbbr !== def.dstAbbr) {
    statusBadge = meta.isDST ? `${meta.abbr} (Daylight Saving)` : `${meta.abbr} (Standard Time)`;
  } else {
    statusBadge = `${meta.abbr} (${meta.offset})`;
  }

  return {
    timezone: resolvedTz,
    currentTime: formattedTime,
    abbr: meta.abbr,
    offset: meta.offset,
    isDST: meta.isDST,
    statusBadge,
    isEastern,
  };
}

/**
 * Normalizes legacy or shorthand timezone strings (e.g. "EST", "EDT", "USA", "IST") to IANA timezones.
 */
export function normalizeTimezone(raw?: string): string {
  if (!raw || typeof raw !== "string") return "America/New_York";
  const trimmed = raw.trim();

  if (trimmed === "EST" || trimmed === "EDT" || trimmed === "US" || trimmed === "USA" || trimmed === "US/Eastern") {
    return "America/New_York";
  }
  if (trimmed === "CST" || trimmed === "CDT" || trimmed === "US/Central") {
    return "America/Chicago";
  }
  if (trimmed === "MST" || trimmed === "MDT" || trimmed === "US/Mountain") {
    return "America/Denver";
  }
  if (trimmed === "PST" || trimmed === "PDT" || trimmed === "US/Pacific") {
    return "America/Los_Angeles";
  }
  if (trimmed === "IST" || trimmed === "India" || trimmed === "Asia/Calcutta") {
    return "Asia/Kolkata";
  }
  if (trimmed === "GMT" || trimmed === "BST") {
    return "Europe/London";
  }

  // If already a valid IANA timezone in our list or standard string, return it
  return trimmed;
}
