"use client";

import { NavItem } from "@/constants/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
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
            item.children && item.children.length > 0 ? (
              <div key={item.id} className="group relative">
                <button
                  type="button"
                  className="
                    w-full flex items-center justify-between
                    px-4 py-2
                    text-[12.5px] text-neutral-700 dark:text-white/80
                    hover:bg-blue-50 dark:hover:bg-white/8
                    hover:text-blue-700 dark:hover:text-white
                    transition-colors duration-100
                    text-left cursor-pointer
                  "
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon && (
                      <item.icon className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    )}
                    {item.label}
                  </span>
                  <ChevronRight className="w-3 h-3 opacity-60 flex-shrink-0" />
                </button>

                {/* Submenu (cascades to the right) */}
                <div
                  className="
                    absolute left-full top-0 z-[300]
                    hidden group-hover:block
                    ml-0.5 min-w-[190px]
                    bg-white dark:bg-[#1e2d50]
                    border border-neutral-200 dark:border-white/10
                    rounded shadow-lg shadow-black/20
                    py-1
                    animate-in fade-in-0 slide-in-from-left-1
                  "
                >
                  {item.children.map((child) => (
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
              </div>
            ) : (
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
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main NavbarMenu export ──────────────────────────────────────────────────
export function NavbarMenu({ items, moreItems }: NavbarMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMeasured, setIsMeasured] = useState(false);
  const [dynamicVisibleCount, setDynamicVisibleCount] = useState(items.length);
  const measuredWidthsRef = useRef<number[]>([]);
  const moreButtonWidthRef = useRef<number>(65);

  // Re-measure whenever items changes
  useEffect(() => {
    setIsMeasured(false);
  }, [items]);

  useEffect(() => {
    if (!containerRef.current || isMeasured) return;

    const children = containerRef.current.children;
    const widths: number[] = [];
    
    // items.length is the count of primary nav items
    for (let i = 0; i < items.length; i++) {
      const child = children[i];
      if (child) {
        widths.push(child.getBoundingClientRect().width);
      } else {
        widths.push(80);
      }
    }
    
    // The More dropdown is the last child
    const moreBtn = children[items.length];
    if (moreBtn) {
      moreButtonWidthRef.current = moreBtn.getBoundingClientRect().width;
    }
    
    measuredWidthsRef.current = widths;
    setIsMeasured(true);
  }, [items, isMeasured]);

  useEffect(() => {
    if (!isMeasured) return;

    const handleResize = () => {
      const header = document.getElementById("top-navbar");
      if (!header) return;
      
      const headerWidth = header.getBoundingClientRect().width;
      const logoWidth = header.children[0]?.getBoundingClientRect().width || 160;
      
      const rightSection = header.querySelector('.border-l');
      const rightWidth = rightSection?.getBoundingClientRect().width || 350;
      
      // Let's reserve 180px for the search bar
      const searchMinWidth = 180;
      const availableWidth = headerWidth - logoWidth - rightWidth - searchMinWidth;

      const widths = measuredWidthsRef.current;
      const moreBtnWidth = moreButtonWidthRef.current;

      let currentWidth = 0;
      let count = 0;

      for (let i = 0; i < widths.length; i++) {
        const itemWidth = widths[i];
        
        // If it's the last item and we haven't needed "More" yet:
        if (i === widths.length - 1 && count === widths.length - 1) {
          if (currentWidth + itemWidth <= availableWidth) {
            count = widths.length;
            break;
          }
        }

        // Check if item + "More" fits
        if (currentWidth + itemWidth + moreBtnWidth <= availableWidth) {
          currentWidth += itemWidth;
          count = i + 1;
        } else {
          break;
        }
      }

      setDynamicVisibleCount(Math.max(1, count));
    };

    // Listen to resize
    window.addEventListener("resize", handleResize);
    // Initial call
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isMeasured]);

  const visibleCount = isMeasured ? dynamicVisibleCount : items.length;
  const visibleItems = items.slice(0, visibleCount);
  const hiddenItems = items.slice(visibleCount);
  const combinedMoreItems = [...hiddenItems, ...moreItems];

  return (
    <div ref={containerRef} className="flex items-stretch h-full">
      {visibleItems.map((item) =>
        item.children && item.children.length > 0 ? (
          <NavDropdown key={item.id} item={item} />
        ) : (
          <NavLeaf key={item.id} item={item} />
        )
      )}
      <MoreDropdown items={combinedMoreItems} />
    </div>
  );
}
