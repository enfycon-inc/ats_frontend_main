export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

export interface RouteBreadcrumbInfo {
  pageTitle: string;
  breadcrumbs: BreadcrumbItem[];
  showBackButton: boolean;
  backHref?: string;
}

/**
 * Normalizes text from URL slugs (e.g. "resume-search" -> "Resume Search")
 */
function humanizeSlug(slug: string): string {
  if (!slug) return "";
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Returns canonical breadcrumbs and page titles for any pathname and search query.
 */
export function getRouteBreadcrumbInfo(
  pathname: string,
  searchParams?: URLSearchParams | null
): RouteBreadcrumbInfo {
  const cleanPath = (pathname || "/").split("?")[0].replace(/\/+$/, "") || "/";

  // 1. Root / Dashboard
  if (cleanPath === "" || cleanPath === "/" || cleanPath === "/dashboard") {
    return {
      pageTitle: "Dashboard",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Dashboard", isCurrent: true },
      ],
      showBackButton: false,
    };
  }

  // 2. Job Postings
  if (cleanPath === "/job-posting") {
    const filter = searchParams?.get("filter");
    let label = "All Jobs";
    if (filter === "direct") label = "My Jobs";
    else if (filter === "pod") label = "Pod Jobs";
    else if (filter === "unassigned") label = "Unassigned Jobs";

    return {
      pageTitle: "Job Postings",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Job Posting", href: "/job-posting" },
        { label, isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/job-posting/all") {
    return {
      pageTitle: "All Jobs",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Job Posting", href: "/job-posting/all" },
        { label: "All Jobs", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/job-posting/active") {
    return {
      pageTitle: "Active Jobs",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Job Posting", href: "/job-posting" },
        { label: "Active Jobs", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/job-posting",
    };
  }

  if (cleanPath === "/job-posting/drafts") {
    return {
      pageTitle: "Draft Jobs",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Job Posting", href: "/job-posting" },
        { label: "Draft Jobs", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/job-posting",
    };
  }

  if (cleanPath === "/job-posting/my-jobs") {
    return {
      pageTitle: "My Jobs",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Job Posting", href: "/job-posting" },
        { label: "My Jobs", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/job-posting",
    };
  }

  if (cleanPath === "/job-posting/pod-jobs") {
    return {
      pageTitle: "Pod Jobs",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Job Posting", href: "/job-posting" },
        { label: "Pod Jobs", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/job-posting",
    };
  }

  if (cleanPath === "/job-posting/boards") {
    return {
      pageTitle: "Job Boards & Syndication",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Job Posting", href: "/job-posting" },
        { label: "Job Boards", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/job-posting",
    };
  }

  if (cleanPath === "/job-posting/new") {
    return {
      pageTitle: "Post New Job Requirement",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Job Posting", href: "/job-posting" },
        { label: "Post New Job", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/job-posting",
    };
  }

  if (cleanPath === "/job-posting/templates") {
    return {
      pageTitle: "Job Templates",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Job Posting", href: "/job-posting" },
        { label: "Templates", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/job-posting",
    };
  }

  if (cleanPath.startsWith("/job-posting/")) {
    const segments = cleanPath.split("/").filter(Boolean);
    const id = segments[1];
    const sub = segments[2];

    if (sub === "edit") {
      return {
        pageTitle: "Edit Job",
        breadcrumbs: [
          { label: "ATS", href: "/dashboard" },
          { label: "Job Posting", href: "/job-posting" },
          { label: "Job Details", href: `/job-posting/${id}` },
          { label: "Edit", isCurrent: true },
        ],
        showBackButton: true,
        backHref: `/job-posting/${id}`,
      };
    }

    if (sub === "matches") {
      return {
        pageTitle: "Candidate Matches",
        breadcrumbs: [
          { label: "ATS", href: "/dashboard" },
          { label: "Job Posting", href: "/job-posting" },
          { label: "Job Details", href: `/job-posting/${id}` },
          { label: "Matches", isCurrent: true },
        ],
        showBackButton: true,
        backHref: `/job-posting/${id}`,
      };
    }

    return {
      pageTitle: "Job Details",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Job Posting", href: "/job-posting" },
        { label: "Job Details", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/job-posting",
    };
  }

  // 3. Recruitment / Submissions
  if (cleanPath === "/utility/submissions") {
    const view = searchParams?.get("view");
    let subTitle = "Submissions Tracker";
    if (view === "my") subTitle = "My Submissions";
    else if (view === "pod") subTitle = "Pod Submissions";
    else if (view === "all") subTitle = "All Submissions";

    return {
      pageTitle: subTitle,
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Recruitment", href: "/utility/submissions" },
        { label: subTitle, isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  // 4. Candidates & Talent Pool (Applicants)
  if (cleanPath === "/applicants" || cleanPath === "/applicants/all") {
    return {
      pageTitle: "Candidates & Talent Pool",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Candidates", href: "/applicants" },
        { label: "All Candidates", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/applicants/new") {
    return {
      pageTitle: "Upload Single CV",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Candidates", href: "/applicants" },
        { label: "Upload CV", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/applicants",
    };
  }

  if (cleanPath === "/applicants/bulk") {
    return {
      pageTitle: "Batch CV Parsing Engine",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Candidates", href: "/applicants" },
        { label: "Batch CV Parser", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/applicants",
    };
  }

  if (cleanPath === "/applicants/pipeline") {
    return {
      pageTitle: "Candidate Pipeline View",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Candidates", href: "/applicants" },
        { label: "Pipeline", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/applicants",
    };
  }

  if (cleanPath === "/applicants/interviews") {
    return {
      pageTitle: "Scheduled Interviews",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Candidates", href: "/applicants" },
        { label: "Interviews", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/applicants",
    };
  }

  if (cleanPath === "/applicants/offers") {
    return {
      pageTitle: "Job Offers & Rollouts",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Candidates", href: "/applicants" },
        { label: "Offers", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/applicants",
    };
  }

  if (cleanPath === "/applicants/resume-search/usit") {
    return {
      pageTitle: "US IT Resume Search",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Candidates", href: "/applicants" },
        { label: "US IT Search", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/applicants",
    };
  }

  if (cleanPath === "/applicants/resume-search/domestic") {
    return {
      pageTitle: "Domestic Resume Search",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Candidates", href: "/applicants" },
        { label: "Domestic Search", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/applicants",
    };
  }

  if (cleanPath.startsWith("/applicants/")) {
    const segments = cleanPath.split("/").filter(Boolean);
    const id = segments[1];
    return {
      pageTitle: `Candidate Profile • #${id}`,
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Candidates", href: "/applicants" },
        { label: `Candidate #${id}`, isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/applicants",
    };
  }

  // 5. Clients
  if (cleanPath === "/clients" || cleanPath === "/clients/all") {
    return {
      pageTitle: "Clients Directory",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Clients", href: "/clients" },
        { label: "All Clients", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/clients/contacts") {
    return {
      pageTitle: "Client Contacts",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Clients", href: "/clients" },
        { label: "Contacts", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/clients",
    };
  }

  if (cleanPath === "/clients/agreements") {
    return {
      pageTitle: "Client Agreements & MSAs",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Clients", href: "/clients" },
        { label: "Agreements", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/clients",
    };
  }

  if (cleanPath === "/clients/invoices") {
    return {
      pageTitle: "Client Invoices & Billing",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Clients", href: "/clients" },
        { label: "Invoices", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/clients",
    };
  }

  if (cleanPath === "/clients/new") {
    return {
      pageTitle: "Add New Client Account",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Clients", href: "/clients" },
        { label: "New Client", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/clients",
    };
  }

  if (cleanPath.startsWith("/clients/")) {
    const segments = cleanPath.split("/").filter(Boolean);
    const id = segments[1];
    const sub = segments[2];

    if (sub === "edit") {
      return {
        pageTitle: "Edit Client Account",
        breadcrumbs: [
          { label: "ATS", href: "/dashboard" },
          { label: "Clients", href: "/clients" },
          { label: "Client Account", href: `/clients/${id}` },
          { label: "Edit", isCurrent: true },
        ],
        showBackButton: true,
        backHref: `/clients/${id}`,
      };
    }

    return {
      pageTitle: "Client Account",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Clients", href: "/clients" },
        { label: "Client Account", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/clients",
    };
  }

  // 6. Placements
  if (cleanPath === "/placements" || cleanPath === "/placements/active") {
    return {
      pageTitle: "Active Placements",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Placements", href: "/placements" },
        { label: "Active Placements", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/placements/ended") {
    return {
      pageTitle: "Ended Placements",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Placements", href: "/placements" },
        { label: "Ended Placements", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/placements",
    };
  }

  if (cleanPath === "/placements/timesheets") {
    return {
      pageTitle: "Timesheet Management",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Placements", href: "/placements" },
        { label: "Timesheets", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/placements",
    };
  }

  if (cleanPath === "/placements/expenses") {
    return {
      pageTitle: "Placement Expenses",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Placements", href: "/placements" },
        { label: "Expenses", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/placements",
    };
  }

  // 7. Talent Bench
  if (cleanPath === "/talent-bench" || cleanPath === "/talent-bench/candidates") {
    return {
      pageTitle: "Bench Candidates",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Talent Bench", href: "/talent-bench" },
        { label: "Bench Candidates", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/talent-bench/skills") {
    return {
      pageTitle: "Skill Matrix",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Talent Bench", href: "/talent-bench" },
        { label: "Skill Matrix", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/talent-bench",
    };
  }

  if (cleanPath === "/talent-bench/availability") {
    return {
      pageTitle: "Bench Availability",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Talent Bench", href: "/talent-bench" },
        { label: "Availability", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/talent-bench",
    };
  }

  // 8. Vendors
  if (cleanPath === "/vendors" || cleanPath === "/vendors/list") {
    return {
      pageTitle: "Vendor Directory",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Vendors", href: "/vendors" },
        { label: "Vendor List", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/vendors/portal") {
    return {
      pageTitle: "Vendor Portal",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Vendors", href: "/vendors" },
        { label: "Portal", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/vendors",
    };
  }

  if (cleanPath === "/vendors/submissions") {
    return {
      pageTitle: "Vendor Submissions",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Vendors", href: "/vendors" },
        { label: "Submissions", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/vendors",
    };
  }

  // 9. Onboarding
  if (cleanPath === "/onboarding" || cleanPath === "/onboarding/new-hires") {
    return {
      pageTitle: "Onboarding & New Hires",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Onboarding", href: "/onboarding" },
        { label: "New Hires", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/onboarding/documents") {
    return {
      pageTitle: "Onboarding Documents",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Onboarding", href: "/onboarding" },
        { label: "Documents", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/onboarding",
    };
  }

  // 10. Reports
  if (cleanPath === "/reports" || cleanPath === "/reports/recruitment") {
    return {
      pageTitle: "Recruitment Analytics",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Reports", href: "/reports" },
        { label: "Recruitment Analytics", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath.startsWith("/reports/")) {
    const slug = cleanPath.replace("/reports/", "");
    const label = humanizeSlug(slug);
    return {
      pageTitle: `${label} Reports`,
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Reports", href: "/reports" },
        { label, isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/reports",
    };
  }

  // 11. Branch & Operating Units Management
  if (cleanPath === "/management/branch" || cleanPath === "/settings/branch") {
    return {
      pageTitle: "Branch Office Locations",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Branch & Units", href: "/management/branch" },
        { label: "Branch", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/management/branch/new") {
    return {
      pageTitle: "Create Branch",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Branch & Units", href: "/management/branch" },
        { label: "Branch", href: "/management/branch" },
        { label: "New Branch", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/management/branch",
    };
  }

  if (cleanPath.startsWith("/management/branch/") && cleanPath.endsWith("/edit") && !cleanPath.includes("/units/")) {
    return {
      pageTitle: "Edit Branch",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Branch & Units", href: "/management/branch" },
        { label: "Branch", href: "/management/branch" },
        { label: "Edit", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/management/branch",
    };
  }

  if (cleanPath === "/management/units" || cleanPath === "/settings/units") {
    const branchId = searchParams?.get("branchId");
    return {
      pageTitle: "Operating Units",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Branch & Units", href: "/management/branch" },
        { label: "Units", isCurrent: true },
      ],
      showBackButton: true,
      backHref: branchId ? "/management/branch" : "/dashboard",
    };
  }

  if (cleanPath === "/management/units/new" || cleanPath === "/management/branch/units/new") {
    const branchId = searchParams?.get("branchId");
    return {
      pageTitle: "Create Operating Unit",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Branch & Units", href: "/management/branch" },
        { label: "Units", href: "/management/units" },
        { label: "New Unit", isCurrent: true },
      ],
      showBackButton: true,
      backHref: branchId ? `/management/units?branchId=${branchId}` : "/management/units",
    };
  }

  if (
    (cleanPath.startsWith("/management/units/") && cleanPath.endsWith("/edit")) ||
    (cleanPath.startsWith("/management/branch/units/") && cleanPath.endsWith("/edit"))
  ) {
    return {
      pageTitle: "Edit Operating Unit",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Branch & Units", href: "/management/branch" },
        { label: "Units", href: "/management/units" },
        { label: "Edit", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/management/units",
    };
  }

  if (cleanPath === "/utility/approvals") {
    return {
      pageTitle: "Tenant Management & Approvals",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Management", href: "/utility/approvals" },
        { label: "Tenant Approvals", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/utility/users") {
    return {
      pageTitle: "Users & Teams Directory",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Management", href: "/utility/users" },
        { label: "Users & Teams", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/utility/roles-permissions") {
    return {
      pageTitle: "Role & Permission Management",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Management", href: "/utility/roles-permissions" },
        { label: "Roles & Permissions", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/utility/pods") {
    return {
      pageTitle: "Recruitment Pods Management",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Management", href: "/utility/pods" },
        { label: "Recruitment Pods", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/utility/dictionaries") {
    return {
      pageTitle: "Master Dictionaries & Taxonomies",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Management", href: "/utility/dictionaries" },
        { label: "Master Dictionaries", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  // 12. Operations & Logs
  if (cleanPath === "/utility/notifications") {
    return {
      pageTitle: "Live Activity Stream",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Operations", href: "/utility/notifications" },
        { label: "Activity Stream", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/utility/audit-logs") {
    return {
      pageTitle: "Security & Compliance Audit Logs",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Operations", href: "/utility/audit-logs" },
        { label: "Audit Logs", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  // 13. Settings
  if (cleanPath === "/company") {
    return {
      pageTitle: "Company & Workspace Settings",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Settings", href: "/company" },
        { label: "Company & Workspace", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/utility/global-remarks") {
    return {
      pageTitle: "Global Remarks Templates",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Settings", href: "/company" },
        { label: "Remarks Templates", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/company",
    };
  }

  if (cleanPath === "/utility/settings-notifications") {
    return {
      pageTitle: "Sound & Tone Preferences",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Settings", href: "/company" },
        { label: "Sound Preferences", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/company",
    };
  }

  if (cleanPath === "/settings/branch") {
    return {
      pageTitle: "Branch Office Settings",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Settings", href: "/company" },
        { label: "Branch Settings", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/company",
    };
  }

  // 14. Communication & Tools
  if (cleanPath === "/email" || cleanPath === "/mass-mail") {
    return {
      pageTitle: "Mass Mail Campaigns",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Tools", href: "/email" },
        { label: "Mass Mail", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/calendar") {
    return {
      pageTitle: "Recruitment Calendar & Schedules",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Tools", href: "/calendar" },
        { label: "Calendar", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/documents") {
    return {
      pageTitle: "Document Management System",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Tools", href: "/documents" },
        { label: "Documents", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/database") {
    return {
      pageTitle: "Candidate Database Explorer",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Tools", href: "/database" },
        { label: "Candidate Database", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  // 15. Integrations
  if (cleanPath === "/integrations") {
    return {
      pageTitle: "Third-Party Integrations",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Integrations", href: "/integrations" },
        { label: "Overview", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  if (cleanPath === "/integrations/dice") {
    return {
      pageTitle: "Dice Candidate Search Integration",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "Integrations", href: "/integrations" },
        { label: "Dice Integration", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/integrations",
    };
  }

  // 16. User profile
  if (cleanPath === "/view-profile") {
    return {
      pageTitle: "My Staff Profile",
      breadcrumbs: [
        { label: "ATS", href: "/dashboard" },
        { label: "User", href: "/view-profile" },
        { label: "Profile", isCurrent: true },
      ],
      showBackButton: true,
      backHref: "/dashboard",
    };
  }

  // 17. Fallback generic path parser
  const pathSegments = cleanPath.split("/").filter(Boolean);
  const crumbs: BreadcrumbItem[] = [{ label: "ATS", href: "/dashboard" }];

  let accumulatedPath = "";
  for (let i = 0; i < pathSegments.length; i++) {
    const seg = pathSegments[i];
    accumulatedPath += `/${seg}`;
    const isLast = i === pathSegments.length - 1;
    const label = humanizeSlug(seg);

    crumbs.push({
      label,
      href: isLast ? undefined : accumulatedPath,
      isCurrent: isLast,
    });
  }

  const lastLabel = crumbs[crumbs.length - 1]?.label || "Dashboard";

  return {
    pageTitle: lastLabel,
    breadcrumbs: crumbs,
    showBackButton: pathSegments.length > 1,
    backHref: pathSegments.length > 1 ? `/${pathSegments.slice(0, -1).join("/")}` : undefined,
  };
}
