"use client";

import { useEffect } from "react";

/**
 * Fixes Radix UI's scroll-lock layout-shift in sidebar layouts where
 * <body> is NOT the scroll container.
 *
 * react-remove-scroll (used by Radix) does two things when a dropdown opens:
 *   1. Measures the scrollbar width and stores it in the CSS var
 *      --removed-body-scroll-bar-size on <html>
 *   2. Injects padding-right / margin-right on both <html> and <body>
 *      equal to that scrollbar width so content doesn't jump.
 *
 * In a SidebarInset layout the real scrollbar belongs to <main>, not <body>,
 * so these compensations create phantom whitespace on the right.
 *
 * Strategy:
 *   A) Override the CSS custom property at the :root level to always be 0px
 *      so the library calculates 0 compensation -> no padding injected at all.
 *   B) MutationObserver on both <html> and <body> as a safety net to zero-out
 *      any padding-right / margin-right injected as inline styles.
 */
export function useRadixScrollLockFix() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const html = document.documentElement;
    const body = document.body;

    // Strategy A: zero out the scrollbar-size CSS variable
    // react-remove-scroll reads this var to know how wide the scrollbar is.
    // Setting it to 0px tells it "no scrollbar compensation needed".
    html.style.setProperty("--removed-body-scroll-bar-size", "0px");

    // Strategy B: MutationObserver safety net
    const zeroScrollbarPadding = (el: HTMLElement) => {
      let changed = false;
      if (el.style.paddingRight && el.style.paddingRight !== "0px") {
        el.style.paddingRight = "0px";
        changed = true;
      }
      if (el.style.marginRight && el.style.marginRight !== "0px") {
        el.style.marginRight = "0px";
        changed = true;
      }
      // Also re-zero the CSS var in case react-remove-scroll re-sets it
      if (changed) {
        html.style.setProperty("--removed-body-scroll-bar-size", "0px");
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "style") {
          zeroScrollbarPadding(m.target as HTMLElement);
        }
      }
    });

    const opts: MutationObserverInit = {
      attributes: true,
      attributeFilter: ["style"],
    };

    observer.observe(html, opts);
    observer.observe(body, opts);

    return () => {
      observer.disconnect();
    };
  }, []);
}
