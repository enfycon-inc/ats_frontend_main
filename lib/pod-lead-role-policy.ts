export function isAutomaticPodLeadRole(role: { systemRole?: string | null; system_role?: string | null }) {
  return (role.systemRole || role.system_role || '').toUpperCase() === 'POD_LEAD';
}
