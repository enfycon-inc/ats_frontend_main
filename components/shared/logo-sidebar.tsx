
'use client'

import EnfyconLogo from "./enfycon-logo";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { cn } from '@/lib/utils';


function LogoSidebar() {
  const isCollapsed = useSidebarCollapsed();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render until mounted to avoid hydration mismatch or wrong theme
  if (!isMounted) return null;

  return (
    <Link
      href="/dashboard"
      className={cn(
        'sidebar-logo h-[72px] py-3.5 flex items-center justify-center border-b border-neutral-100 dark:border-slate-700',
        isCollapsed ? 'px-1' : 'px-4'
      )}
    >
      <EnfyconLogo iconOnly={isCollapsed} />
    </Link>
  )
}

export default LogoSidebar