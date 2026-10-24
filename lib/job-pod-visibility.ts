export interface PodBranchPolicy { id: string; allowPods?: boolean; isActive?: boolean }
export interface PodUnitPolicy { id: string; branchId?: string | null; allowPods?: boolean; isActive?: boolean }

export function visiblePodUnits(tenantEnabled: boolean, branches: PodBranchPolicy[], units: PodUnitPolicy[], branchId?: string | null, unitId?: string | null): string[] {
  if (!tenantEnabled) return [];
  const allowedBranches = new Set(branches.filter(branch => branch.allowPods === true && branch.isActive !== false && (!branchId || branch.id === branchId)).map(branch => branch.id));
  return units.filter(unit => unit.allowPods === true && unit.isActive !== false && Boolean(unit.branchId && allowedBranches.has(unit.branchId)) && (!unitId || unit.id === unitId)).map(unit => unit.id);
}
