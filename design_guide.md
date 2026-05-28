# Enfysync ATS Frontend Design Guide

This design guide outlines the UI/UX standards, color palettes, responsive layouts, and component patterns for the Enfysync ATS frontend application. The goal is to maintain a professional, minimal, and highly responsive user interface using Tailwind CSS.

---

## 1. Design System & Theme Colors

We prioritize a minimal, high-contrast, professional corporate theme. Avoid saturated neon or bright "Gen Z" colors. All colors should adapt gracefully to dark mode.

### Primary Color Palettes
* **Theme Archetype**: Professional Corporate Blue & Slate.
* **Primary Blue**: Deep blue (`oklch(0.63 0.2 264.02)`) used for primary action buttons, focus rings, active states, and highlights.
* **Secondary Slate**: Sophisticated neutral borders and secondary buttons.

### Light & Dark Mode Tokens (OKLCH mapping)

| Token Name | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--background` | `oklch(1 0 0)` (Pure White) | `oklch(0.145 0 0)` (Dark Charcoal) | Main body backdrop |
| `--foreground` | `oklch(0.145 0 0)` (Charcoal) | `oklch(0.985 0 0)` (Off-White) | Body text |
| `--card` | `oklch(1 0 0)` (White) | `oklch(0.205 0 0)` (Slate Gray) | Content containers, tables |
| `--primary` | `oklch(0.63 0.2 264.02)` | `oklch(0.63 0.2 264.02)` | CTA buttons, active links |
| `--muted` | `oklch(0.97 0 0)` (Soft Gray) | `oklch(0.269 0 0)` (Soft Slate) | Disabled states, headers |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | Table grids, card outlines |

---

## 2. Typography Hierarchy

Use Outfit or Geist Sans for readability. Ensure headings use high-contrast text and micro-spacing.

* **Main Page Titles (`h1`)**: `text-2xl font-bold tracking-tight text-neutral-900 dark:text-white`
* **Section Headers (`h2`)**: `text-base font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200`
* **Table Column Headers / Metatags**: `text-[10px] font-bold uppercase tracking-wider text-neutral-500`
* **Body Text**: `text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 leading-relaxed`

---

## 3. Responsive Breakpoints & Layouts

All page views must adjust dynamically across three core viewport widths:
1. **Mobile (default, `<768px`)**: Single-column layouts, full-width buttons, collapsible menus, and drawers.
2. **Tablet (`md:` breakpoint, `768px - 1024px`)**: Dual-column setups, grid layouts (grid-cols-2), and scrollable tables.
3. **Web (`lg:` / `xl:` breakpoint, `>1024px`)**: Multi-column layouts (grid-cols-4 or grid-cols-6 for metrics), wide tables with full columns, and expanded side actions.

### CSS Responsiveness Rules
* **Mobile-First Development**: Always write the mobile class first, then apply `md:` and `lg:` modifier classes.
* **Layout Wrappers**: Use responsive margins and paddings:
  ```html
  <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
  ```
* **Grid Layout Patterns**:
  ```html
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  ```

---

## 4. Reusable Component Guidelines

Ensure components are focus-controlled, state-isolated, and reusable. Avoid hardcoding utility styling directly inside pages; wrap them in core components.

### Action Buttons
Use the Tailwind classes aligned with our shadcn `Button` component:
* **Primary Button**:
  ```html
  <button className="h-8 px-4 rounded bg-primary text-white hover:bg-primary/95 text-xs font-bold transition-all">
  ```
* **Secondary / Ghost Button**:
  ```html
  <button className="h-8 px-4 rounded border border-neutral-300 dark:border-slate-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800 text-xs font-semibold">
  ```

### Form Input Primitives
Use custom wrappers for standard form elements (`Input`, `Label`, `Textarea`):
* **Label**:
  ```html
  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
  ```
* **Input Box**:
  ```html
  <input className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs focus:border-primary outline-none focus:ring-1 focus:ring-primary/20" />
  ```

---

## 5. Coding & Maintenance Best Practices

1. **Keep Page Files Lean**: Pages (`page.tsx`) should act as simple orchestrators or entry points. Delegate complex UI grids, forms, and widgets to `/components`.
2. **Handle Loading & Hydration**: Provide shimmer animations (`Skeleton` component) for async API calls instead of generic text spinners.
3. **Tailwind ONLY**: Do not write inline `style={{ ... }}` blocks for layout positions, borders, or colors unless dynamically calculated (e.g. context menu coordinates). Use Tailwind's utility class tokens.
4. **Theme Transitions**: Enable smooth class transitions for dark mode toggle:
  ```html
  className="transition-colors duration-200"
  ```
