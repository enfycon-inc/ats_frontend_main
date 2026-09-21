"use client";

import React, { ReactNode } from "react";
import { SiteBreadcrumbPill } from "./layout/site-breadcrumb-pill";
import { SitePageHeader } from "./layout/site-page-header";

/**
 * SiteBreadcrumb is now superseded by the global SitePageHeader rendered in client-root.tsx.
 * To maintain 100% backward compatibility with legacy page calls, if children are passed,
 * they will be rendered in a flex container; otherwise it renders null to prevent duplicate breadcrumbs.
 */
const SiteBreadcrumb = ({ children }: { children?: ReactNode }) => {
  if (!children) {
    return null;
  }

  return (
    <div className="flex justify-end gap-2 items-center mb-4">
      {children}
    </div>
  );
};

export { SiteBreadcrumbPill, SitePageHeader };
export default SiteBreadcrumb;
