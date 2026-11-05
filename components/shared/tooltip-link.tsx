'use client';
import type {ReactNode} from 'react';
import Link from 'next/link';
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip';
export function TooltipLink({href,tooltip,children,className}:{href:string;tooltip:string;children:ReactNode;className?:string}) {
  return <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild><Link href={href} className={className}>{children}</Link></TooltipTrigger><TooltipContent>{tooltip}</TooltipContent></Tooltip></TooltipProvider>;
}
