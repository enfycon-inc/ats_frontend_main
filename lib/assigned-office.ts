// Refresh every field together; browser storage is never the source of identity.
export function syncAssignedOffice(profile: any, storage: Pick<Storage, "getItem" | "setItem" | "removeItem">): boolean {
  const values: Record<string, string | null> = {
    active_branch_id: profile.branchId || null,
    active_branch_name: profile.branchName || null,
    active_branch_timezone: profile.officeTimezone || null,
    active_branch_start_time: profile.officeStartTime || null,
    active_branch_end_time: profile.officeEndTime || null,
    active_branch_market: profile.defaultMarket || null,
  };
  let changed = false;
  for (const [key, value] of Object.entries(values)) {
    if (storage.getItem(key) !== value) {
      changed = true;
      if (value === null) storage.removeItem(key); else storage.setItem(key, value);
    }
  }
  return changed;
}
