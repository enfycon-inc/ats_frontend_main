"use client";
import React from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { APP_BRAND } from '@/lib/app-brand';
interface EnfyconLogoProps { className?: string; variant?: 'auto' | 'light' | 'dark'; width?: number; height?: number; showBadge?: boolean; iconOnly?: boolean; }
export const EnfyconLogo: React.FC<EnfyconLogoProps> = ({className,variant='auto',height=40,iconOnly=false}) => {
  const {theme}=useTheme();
  const dark=variant==='dark'||(variant==='auto'&&theme==='dark');
  return <span aria-label={APP_BRAND.name} className={cn('inline-flex items-center gap-2.5',className)} style={{minHeight:height}}>
    <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-lg font-bold text-white">{APP_BRAND.name.charAt(0)}</span>
    {!iconOnly && <span className={cn('text-sm font-bold tracking-tight',dark?'text-white':'text-slate-900')}>{APP_BRAND.name}</span>}
  </span>;
};
export default EnfyconLogo;
