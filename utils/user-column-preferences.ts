import { atsApi } from "@/lib/ats-api";

/**
 * Returns a unique key for the current user to isolate column customizations.
 */
export function getCurrentUserStorageKey(): string {
  if (typeof window === "undefined") return "default_user";
  try {
    const user = atsApi.auth.getCurrentUser();
    if (user?.id) return `user_${user.id}`;
    if (user?.email) return `email_${user.email.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const email = localStorage.getItem("ats_user_email");
    if (email) return `email_${email.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  } catch (e) {
    console.warn("Failed to get current user storage key:", e);
  }
  return "default_user";
}

/**
 * Retrieves persistent column preferences for a specific table, scoped to the active user.
 */
export function getUserColumnPreferences(tableKey: string, defaultColumns: string[]): string[] {
  if (typeof window === "undefined") return defaultColumns;
  try {
    const userKey = getCurrentUserStorageKey();
    const storageKey = `ats_table_cols_${tableKey}_${userKey}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn(`Failed to read column preferences for table [${tableKey}]:`, e);
  }
  return defaultColumns;
}

/**
 * Persists customized column selection & order for a table, scoped strictly to the current user.
 */
export function saveUserColumnPreferences(tableKey: string, columns: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const userKey = getCurrentUserStorageKey();
    const storageKey = `ats_table_cols_${tableKey}_${userKey}`;
    localStorage.setItem(storageKey, JSON.stringify(columns));
  } catch (e) {
    console.warn(`Failed to save column preferences for table [${tableKey}]:`, e);
  }
}
