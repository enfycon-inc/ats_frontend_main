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
    
    // Check local storage fallbacks for user email or ID
    const email = localStorage.getItem("ats_user_email") || localStorage.getItem("user_email");
    if (email) return `email_${email.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

    const userId = localStorage.getItem("ats_user_id") || localStorage.getItem("user_id");
    if (userId) return `user_${userId}`;
  } catch (e) {
    console.warn("Failed to get current user storage key:", e);
  }
  return "default_user";
}

/**
 * Retrieves persistent column preferences for a specific table, scoped to the active user.
 * Includes graceful fallbacks to universal table key and any existing user preferences
 * so initial mount before NextAuth hydration doesn't reset user selections.
 */
export function getUserColumnPreferences(tableKey: string, defaultColumns: string[]): string[] {
  if (typeof window === "undefined") return defaultColumns;
  try {
    const userKey = getCurrentUserStorageKey();

    // 1. Try user-specific key
    if (userKey !== "default_user") {
      const userSpecificKey = `ats_table_cols_${tableKey}_${userKey}`;
      const saved = localStorage.getItem(userSpecificKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }

    // 2. Try universal table fallback key
    const universalKey = `ats_table_cols_${tableKey}`;
    const universalSaved = localStorage.getItem(universalKey);
    if (universalSaved) {
      const parsed = JSON.parse(universalSaved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // 3. Scan for any user-specific key for this table (in case userKey hasn't resolved yet on mount)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`ats_table_cols_${tableKey}_`)) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn(`Failed to read column preferences for table [${tableKey}]:`, e);
  }
  return defaultColumns;
}

/**
 * Persists customized column selection & order for a table, scoped strictly to the current user
 * as well as the universal fallback key.
 */
export function saveUserColumnPreferences(tableKey: string, columns: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const userKey = getCurrentUserStorageKey();
    const serialized = JSON.stringify(columns);

    // Save user-specific
    const userSpecificKey = `ats_table_cols_${tableKey}_${userKey}`;
    localStorage.setItem(userSpecificKey, serialized);

    // Also save universal fallback
    const universalKey = `ats_table_cols_${tableKey}`;
    localStorage.setItem(universalKey, serialized);

    // Notify listeners in other components
    window.dispatchEvent(new CustomEvent("tableColumnsChanged", { detail: { tableKey, columns } }));
  } catch (e) {
    console.warn(`Failed to save column preferences for table [${tableKey}]:`, e);
  }
}

/**
 * Resets customized column selection & order for a table to default.
 */
export function resetUserColumnPreferences(tableKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const userKey = getCurrentUserStorageKey();
    localStorage.removeItem(`ats_table_cols_${tableKey}_${userKey}`);
    localStorage.removeItem(`ats_table_cols_${tableKey}`);
    
    // Clean any other scoped keys for this table
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key === `ats_table_cols_${tableKey}` || key.startsWith(`ats_table_cols_${tableKey}_`))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    window.dispatchEvent(new CustomEvent("tableColumnsReset", { detail: { tableKey } }));
  } catch (e) {
    console.warn(`Failed to reset column preferences for table [${tableKey}]:`, e);
  }
}
