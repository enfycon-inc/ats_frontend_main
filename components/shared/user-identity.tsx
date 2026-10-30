"use client";

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface UserIdentityDetails {
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  profilePicture?: string | null;
}

export function UserAvatar({ user, className }: { user: UserIdentityDetails; className?: string }) {
  const name = user.fullName || user.name || user.email || '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2);
  return <Avatar className={cn('h-8 w-8 shrink-0 border border-slate-200', className)}>
    <AvatarImage src={user.avatar || user.profilePicture || undefined} alt={name ? `${name}'s profile photo` : 'Profile photo'} />
    <AvatarFallback className="bg-blue-50 text-blue-700 text-[11px] font-semibold">{initials.toUpperCase() || '?'}</AvatarFallback>
  </Avatar>;
}

export function UserIdentity({ user, className, size = 'compact' }: { user: UserIdentityDetails; className?: string; size?: 'compact' | 'table' }) {
  return <div className={cn('flex items-center gap-2 min-w-0', className)}>
    <UserAvatar user={user} />
    <div className="min-w-0">
      <div className={cn('font-semibold truncate', size === 'table' ? 'text-sm' : 'text-xs')} title={user.fullName || user.name || undefined}>{user.fullName || user.name || user.email || 'Name unavailable'}</div>
      {user.email && <div className={cn('text-slate-500 dark:text-slate-400 truncate', size === 'table' ? 'text-xs' : 'text-[11px]')} title={user.email}>{user.email}</div>}
    </div>
  </div>;
}
