export function getUnitDashboardJobs(profile: any, jobs: any[]): any[] {
  if (!profile?.businessUnitId || !profile?.branchId) return [];
  return jobs.filter(job => job.businessUnitId === profile.businessUnitId && job.branchId === profile.branchId);
}
