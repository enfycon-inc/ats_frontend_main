"use client";

import { NavItem } from "@/constants/navigation";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface MobileNavbarProps {
  open: boolean;
  onClose: () => void;
  primaryItems: NavItem[];
  moreItems: NavItem[];
}

function MobileNavItem({
  item,
  onClose,
}: {
  item: NavItem;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const isActive = item.href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(item.href);

  if (!item.children || item.children.length === 0) {
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={`
          flex items-center gap-3 px-4 py-2.5
          text-[13px] font-medium
          rounded mx-2
          transition-colors duration-100
          ${isActive
            ? "bg-[#1a4fa0] text-white"
            : "text-neutral-700 dark:text-white/80 hover:bg-blue-50 dark:hover:bg-white/8"
          }
        `}
      >
        {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`
          w-full flex items-center gap-3 px-4 py-2.5
          text-[13px] font-medium
          rounded mx-2
          transition-colors duration-100
          cursor-pointer
          ${isActive || expanded
            ? "bg-[#1a4fa0]/10 text-[#1a4fa0] dark:text-blue-400"
            : "text-neutral-700 dark:text-white/80 hover:bg-blue-50 dark:hover:bg-white/8"
          }
        `}
        style={{ width: "calc(100% - 16px)" }}
        aria-expanded={expanded}
      >
        {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
        <span className="flex-1 text-left">{item.label}</span>
        {expanded ? (
          <ChevronDown className="w-4 h-4 opacity-60" />
        ) : (
          <ChevronRight className="w-4 h-4 opacity-60" />
        )}
      </button>

      {expanded && (
        <div className="ml-10 mt-0.5 border-l-2 border-blue-200 dark:border-blue-800 pl-3 pb-1">
          {item.children?.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onClose}
              className={`
                block py-2 px-2
                text-[12.5px]
                rounded
                transition-colors duration-100
                ${pathname === child.href
                  ? "text-[#1a4fa0] dark:text-blue-400 font-semibold"
                  : "text-neutral-600 dark:text-white/60 hover:text-[#1a4fa0] dark:hover:text-blue-400"
                }
              `}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function MobileNavbar({
  open,
  onClose,
  primaryItems,
  moreItems,
}: MobileNavbarProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`
          fixed inset-0 z-40 bg-black/40
          transition-opacity duration-200
          md:hidden
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      />

      {/* Drawer */}
      <aside
        id="mobile-nav-drawer"
        role="navigation"
        aria-label="Mobile navigation"
        className={`
          fixed top-[46px] left-0 bottom-0 z-50
          w-[280px]
          bg-white dark:bg-[#1a2540]
          border-r border-neutral-200 dark:border-white/8
          shadow-2xl
          overflow-y-auto
          transition-transform duration-250 ease-in-out
          md:hidden
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-white/8 bg-[#1a4fa0]">
          <span className="text-[13px] font-semibold text-white">Navigation</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="text-white/70 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary nav */}
        <div className="py-2 space-y-0.5">
          {primaryItems.map((item) => (
            <MobileNavItem key={item.id} item={item} onClose={onClose} />
          ))}
        </div>

        {/* Divider + More section */}
        <div className="mx-4 my-2 border-t border-neutral-100 dark:border-white/8" />
        <p className="px-6 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/30">
          More
        </p>

        <div className="pb-4 space-y-0.5">
          {moreItems.map((item) => (
            <MobileNavItem key={item.id} item={item} onClose={onClose} />
          ))}
        </div>
      </aside>
    </>
  );
}
