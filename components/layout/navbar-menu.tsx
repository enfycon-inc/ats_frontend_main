"use client";

import { NavItem } from "@/constants/navigation";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface NavbarMenuProps {
  items: NavItem[];
  moreItems: NavItem[];
}

/** Returns true if the current path starts with the item's href */
function useIsActive(href: string) {
  const pathname = usePathname();
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

// ─── Individual leaf link (no dropdown) ─────────────────────────────────────
function NavLeaf({ item }: { item: NavItem }) {
  const active = useIsActive(item.href);

  return (
    <Link
      href={item.href}
      id={`nav-${item.id}`}
      aria-current={active ? "page" : undefined}
      className={`
        relative flex items-center gap-1.5
        px-3 h-full
        text-[12.5px] font-medium whitespace-nowrap
        transition-colors duration-150
        cursor-pointer select-none
        ${active
          ? "text-white bg-white/12"
          : "text-white/80 hover:text-white hover:bg-white/10"
        }
      `}
    >
      {item.label}

      {/* Active underline indicator */}
      {active && (
        <span
          aria-hidden="true"
          className="
            absolute bottom-0 left-0 right-0 h-[2px]
            bg-white rounded-t
          "
        />
      )}
    </Link>
  );
}

// ─── Dropdown nav item ────────────────────────────────────────────────────────
function NavDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = useIsActive(item.href);

  // Close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative h-full flex items-stretch"
    >
      <button
        id={`nav-${item.id}`}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`
          relative flex items-center gap-1.5
          px-3 h-full
          text-[12.5px] font-medium whitespace-nowrap
          transition-colors duration-150
          cursor-pointer select-none
          ${active || open
            ? "text-white bg-white/12"
            : "text-white/80 hover:text-white hover:bg-white/10"
          }
        `}
      >
        {item.label}
        <ChevronDown
          className={`
            w-3 h-3 opacity-70 flex-shrink-0
            transition-transform duration-200
            ${open ? "rotate-180" : ""}
          `}
        />

        {/* Active / open underline */}
        {(active || open) && (
          <span
            aria-hidden="true"
            className="
              absolute bottom-0 left-0 right-0 h-[2px]
              bg-white rounded-t
            "
          />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="menu"
          aria-label={`${item.label} submenu`}
          className="
            absolute top-full left-0 z-[200]
            mt-0 min-w-[190px]
            bg-white dark:bg-[#1e2d50]
            border border-neutral-200 dark:border-white/10
            rounded-b shadow-lg shadow-black/20
            py-1
            animate-in fade-in-0 slide-in-from-top-1
          "
        >
          {item.children?.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="
                block px-4 py-2
                text-[12.5px] text-neutral-700 dark:text-white/80
                hover:bg-blue-50 dark:hover:bg-white/8
                hover:text-blue-700 dark:hover:text-white
                transition-colors duration-100
              "
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── "More" dropdown ──────────────────────────────────────────────────────────
function MoreDropdown({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative h-full flex items-stretch">
      <button
        id="nav-more"
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`
          relative flex items-center gap-1.5
          px-3 h-full
          text-[12.5px] font-medium whitespace-nowrap
          transition-colors duration-150
          cursor-pointer select-none
          ${open
            ? "text-white bg-white/12"
            : "text-white/80 hover:text-white hover:bg-white/10"
          }
        `}
      >
        More
        <ChevronDown
          className={`
            w-3 h-3 opacity-70
            transition-transform duration-200
            ${open ? "rotate-180" : ""}
          `}
        />
        {open && (
          <span
            aria-hidden="true"
            className="
              absolute bottom-0 left-0 right-0 h-[2px]
              bg-white rounded-t
            "
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="More navigation items"
          className="
            absolute top-full left-0 z-[200]
            mt-0 w-[210px]
            bg-white dark:bg-[#1e2d50]
            border border-neutral-200 dark:border-white/10
            rounded-b shadow-lg shadow-black/20
            py-1
            animate-in fade-in-0 slide-in-from-top-1
          "
        >
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="
                flex items-center gap-2.5
                px-4 py-2
                text-[12.5px] text-neutral-700 dark:text-white/80
                hover:bg-blue-50 dark:hover:bg-white/8
                hover:text-blue-700 dark:hover:text-white
                transition-colors duration-100
              "
            >
              {item.icon && (
                <item.icon className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              )}
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main NavbarMenu export ──────────────────────────────────────────────────
export function NavbarMenu({ items, moreItems }: NavbarMenuProps) {
  return (
    <div className="flex items-stretch h-full">
      {items.map((item) =>
        item.children && item.children.length > 0 ? (
          <NavDropdown key={item.id} item={item} />
        ) : (
          <NavLeaf key={item.id} item={item} />
        )
      )}
      <MoreDropdown items={moreItems} />
    </div>
  );
}
