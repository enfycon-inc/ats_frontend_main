"use client";

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {EmailLink} from './email-link';
import {CityBadge} from './city-badge';
import styles from './user-identity.module.css';
import {staffNameClass} from './staff-identity-styles';

export interface UserIdentityDetails {
  city?: string | null;
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

export function UserIdentity({ user, className, size = 'compact', wrapDetails = false, cityLayout = 'inline', linkEmail = false, onOpen }: { user: UserIdentityDetails; className?: string; size?: 'compact' | 'table'; wrapDetails?: boolean; cityLayout?: 'inline' | 'responsive'; linkEmail?: boolean; onOpen?: () => void }) {
  return <div className={cn('flex items-center gap-2 min-w-0', className)}>
    {onOpen ? <button type="button" onClick={onOpen} aria-label={`Open profile for ${user.fullName || user.name || user.email || "user"}`} className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-blue-500"><UserAvatar user={user}/></button> : <UserAvatar user={user}/> }
    <div className={cityLayout === 'responsive' ? styles.responsiveDetails : 'min-w-0'}>
      <div className={cityLayout === 'responsive' ? styles.nameRow : 'flex flex-wrap items-center gap-1.5'}><span className={cn('min-w-0', staffNameClass, wrapDetails ? 'whitespace-normal break-words' : 'truncate', size === 'table' ? 'text-sm' : 'text-xs')} title={user.fullName || user.name || undefined}>{onOpen ? <button type="button" onClick={onOpen} className="text-left hover:underline focus-visible:outline-2 focus-visible:outline-blue-500">{user.fullName || user.name || user.email || 'Name unavailable'}</button> : user.fullName || user.name || user.email || 'Name unavailable'}</span>{cityLayout === 'responsive' ? <span className={styles.inlineCity}><CityBadge city={user.city}/></span> : <CityBadge city={user.city}/>}</div>
      {user.email && <div className={cn('text-slate-500 dark:text-slate-400', wrapDetails ? 'whitespace-normal break-all' : 'truncate', size === 'table' ? 'text-xs' : 'text-[11px]')} title={user.email}>{linkEmail ? <EmailLink email={user.email}/> : user.email}</div>}
      {cityLayout === 'responsive' && user.city && <div className={styles.belowCity}><CityBadge city={user.city}/></div>}
    </div>
  </div>;
}
