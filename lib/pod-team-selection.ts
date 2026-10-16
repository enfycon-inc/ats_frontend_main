export function changePodLead(memberIds: string[], previousLead: string, nextLead: string) {
  return [...new Set([...memberIds.filter(id => id !== previousLead && id !== nextLead), ...(nextLead ? [nextLead] : [])])];
}
export function podMembersWithoutLead<T extends { id: string; fullName?: string; email?: string }>(users: T[], leadId: string, search = '') {
  const query = search.trim().toLowerCase();
  return users.filter(user => user.id !== leadId && (!query || user.fullName?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query)));
}
