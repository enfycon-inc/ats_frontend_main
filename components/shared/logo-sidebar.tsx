
'use client'

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { cn } from '@/lib/utils';
import EnfysyncLogo from '@/public/assets/images/logo.png';

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
      <Image
        src={EnfysyncLogo}
        alt="Enfysync Logo"
        width={isCollapsed ? 36 : 160}
        height={40}
        priority
        style={{ objectFit: 'contain' }}
      />
    </Link>
  )
}

export default LogoSidebar