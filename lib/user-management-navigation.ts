export const USER_PAGE_LINKS = [
  { key: 'create', label: 'Create Users', href: '/utility/users/create' },
  { key: 'active', label: 'Active Users', href: '/utility/users/active' },
  { key: 'pending', label: 'Pending Users', href: '/utility/users/pending' },
  { key: 'blocked', label: 'Blocked Users', href: '/utility/users/blocked' },
  { key: 'activity', label: 'Users Activity', href: '/utility/users/activity' },
] as const;
export function canOpenUserPage(key: string, permissions: string[]) {
  const has = (...keys: string[]) => permissions.includes('*') || permissions.includes('platform:manage') || keys.some(p => permissions.includes(p));
  if (key === 'create') return has('user:manage');
  if (key === 'activity') return has('user:presence:view', 'user:sessions:view', 'user:login_logs:view');
  return has('user:manage', 'user:view');
}
