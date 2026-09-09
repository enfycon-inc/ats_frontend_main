import { NavItem, GLOBAL_ADMIN_NAV_ITEMS, GLOBAL_ADMIN_MORE_ITEMS, PRIMARY_NAV_ITEMS, MORE_NAV_ITEMS } from "@/constants/navigation";

export type SystemRoleType =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "TENANT_ADMIN"
  | "BRANCH_ADMIN"
  | "DELIVERY_HEAD"
  | "ACCOUNT_MANAGER"
  | "POD_LEAD"
  | "RECRUITER";

export interface CustomRoleDefinition {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  systemRole?: string;
  replacesSystemRole?: string | null;
  permissions?: string[];
}

/**
 * Resolves a role name, array of roles, or ID to a canonical system role enum.
 * Handles exact system roles, custom role database records, arrays of roles, and standard role aliases.
 */
export function resolveActiveSystemRole(
  roleInput: string | string[] | null | undefined | any,
  availableRoles: CustomRoleDefinition[] = [],
  userProfile?: any
): SystemRoleType {
  // If array of roles is passed
  if (Array.isArray(roleInput)) {
    if (roleInput.length === 0) {
      const defaultRole = userProfile?.systemRole || userProfile?.roles?.[0] || "RECRUITER";
      if (defaultRole && defaultRole !== roleInput) {
        return resolveActiveSystemRole(defaultRole, availableRoles, userProfile);
      }
      return "RECRUITER";
    }

    // Check if any role in the array maps to a specific non-recruiter system role first
    for (const r of roleInput) {
      if (typeof r === "string" && r.trim()) {
        const resolved = resolveActiveSystemRole(r, availableRoles, userProfile);
        if (resolved === "ACCOUNT_MANAGER" || resolved === "DELIVERY_HEAD" || resolved === "POD_LEAD" || resolved === "BRANCH_ADMIN" || resolved === "ADMIN" || resolved === "SUPER_ADMIN") {
          return resolved;
        }
      }
    }
    return resolveActiveSystemRole(roleInput[0], availableRoles, userProfile);
  }

  // If role is null/undefined or not a string
  if (roleInput === null || roleInput === undefined || typeof roleInput !== "string") {
    const defaultRole = userProfile?.systemRole || userProfile?.roles?.[0] || "RECRUITER";
    if (defaultRole && defaultRole !== roleInput) {
      return resolveActiveSystemRole(defaultRole, availableRoles, userProfile);
    }
    return "RECRUITER";
  }

  const clean = String(roleInput).trim();
  if (!clean) {
    const defaultRole = userProfile?.systemRole || userProfile?.roles?.[0] || "RECRUITER";
    if (defaultRole && defaultRole !== roleInput) {
      return resolveActiveSystemRole(defaultRole, availableRoles, userProfile);
    }
    return "RECRUITER";
  }

  const upper = clean.toUpperCase();

  // 1. Direct standard system role match
  if (upper === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (upper === "ADMIN" || upper === "TENANT_ADMIN" || upper === "TENANT ADMIN") return "ADMIN";
  if (upper === "BRANCH_ADMIN" || upper === "BRANCH ADMIN") return "BRANCH_ADMIN";
  if (upper === "DELIVERY_HEAD" || upper === "DELIVERY HEAD") return "DELIVERY_HEAD";
  if (upper === "ACCOUNT_MANAGER" || upper === "ACCOUNT MANAGER") return "ACCOUNT_MANAGER";
  if (upper === "POD_LEAD" || upper === "POD LEAD") return "POD_LEAD";
  if (upper === "RECRUITER") return "RECRUITER";
  if (upper === "FINANCE_ADMIN" || upper === "FINANCE ADMIN" || upper.includes("FINANCE")) return "ADMIN";
  if (upper === "SENSE") return "RECRUITER";

  // 2. Lookup in availableRoles list
  if (Array.isArray(availableRoles) && availableRoles.length > 0) {
    const matched = availableRoles.find(
      (r) =>
        r.id === clean ||
        r.name?.toUpperCase() === upper ||
        r.name?.toLowerCase() === clean.toLowerCase()
    );
    if (matched) {
      const baseSys = matched.replacesSystemRole || matched.systemRole;
      if (baseSys && baseSys !== roleInput) {
        return resolveActiveSystemRole(baseSys, availableRoles, userProfile);
      }
    }
  }

  // 3. Fallback name pattern matching for common custom aliases
  if (
    upper.includes("BD") ||
    upper.includes("BUSINESS DEVELOPMENT") ||
    upper.includes("ACCOUNT") ||
    upper.includes("SALES") ||
    upper.includes("CLIENT SUCCESS")
  ) {
    return "ACCOUNT_MANAGER";
  }

  if (
    upper.includes("SOURC") ||
    upper.includes("RECRUIT") ||
    upper.includes("TALENT ACQUISITION") ||
    upper === "TA"
  ) {
    return "RECRUITER";
  }

  if (upper.includes("POD") || upper.includes("LEAD") || upper.includes("TEAM LEAD")) {
    return "POD_LEAD";
  }

  if (upper.includes("DELIVERY") || upper.includes("OPERATIONS HEAD")) {
    return "DELIVERY_HEAD";
  }

  if (upper.includes("BRANCH") || upper.includes("OFFICE ADMIN")) {
    return "BRANCH_ADMIN";
  }

  if (upper.includes("ADMIN") || upper.includes("DIRECTOR") || upper.includes("WORKSPACE ADMIN")) {
    return "ADMIN";
  }

  // Safe default: Recruiter
  return "RECRUITER";
}

/**
 * Retrieves effective permissions for the active role.
 */
export function getActiveRolePermissions(
  roleInput: string | string[] | null | undefined | any,
  availableRoles: CustomRoleDefinition[] = [],
  userProfile?: any
): string[] {
  // If an array of multiple roles is passed, compute the UNION of all permissions across all assigned roles
  if (Array.isArray(roleInput)) {
    if (roleInput.length === 0) {
      return userProfile?.permissions || [];
    }
    if (roleInput.length > 1) {
      const unionSet = new Set<string>();
      for (const singleRole of roleInput) {
        if (singleRole) {
          const perms = getActiveRolePermissions(singleRole, availableRoles, userProfile);
          perms.forEach((p) => unionSet.add(p));
        }
      }
      return Array.from(unionSet);
    }
    roleInput = roleInput[0];
  }

  let roleStr = roleInput;
  if (!roleStr || typeof roleStr !== "string") {
    return userProfile?.permissions || [];
  }

  const clean = String(roleStr).trim();
  const upper = clean.toUpperCase();

  // Check if custom role in availableRoles specifies exact permissions
  if (Array.isArray(availableRoles) && availableRoles.length > 0) {
    const matched = availableRoles.find(
      (r) =>
        r.id === clean ||
        r.name?.toUpperCase() === upper ||
        r.name?.toLowerCase() === clean.toLowerCase()
    );
    if (matched && Array.isArray(matched.permissions) && matched.permissions.length > 0) {
      return matched.permissions;
    }
  }

  // System role default permission sets
  const sysRole = resolveActiveSystemRole(roleStr, availableRoles, userProfile);
  switch (sysRole) {
    case "SUPER_ADMIN":
    case "ADMIN":
    case "TENANT_ADMIN":
      return [
        "job:create", "job:edit", "job:view", "job:publish_direct", "job:approve", "job:reject",
        "job:assign", "job:assign_recruiter", "job:assign_pod",
        "candidate:create", "candidate:view",
        "submission:view", "submission:create", "submission:internal_screening", "submission:audit_rounds", "submission:audit_l1", "submission:audit_l2", "submission:audit_l3", "submission:final_status", "submission:approve_client", "submission:schedule_interview", "submission:edit_rate", "submission:edit",
        "tenant:settings", "user:manage",
        "pod:create", "pod:edit", "pod:delete", "pod:view", "pod:reset_cycle",
        "branch_admin:manage", "candidate:search_all_branches", "job:view_all_branches",
        "client:view", "client:create", "client:edit", "placement:view", "placement:create",
        "report:view"
      ];
    case "BRANCH_ADMIN":
      return [
        "job:create", "job:view", "job:edit", "job:publish_direct", "job:approve", "job:reject",
        "job:assign", "job:assign_recruiter", "job:assign_pod",
        "candidate:create", "candidate:view",
        "submission:create", "submission:view", "submission:internal_screening", "submission:audit_rounds", "submission:audit_l1", "submission:audit_l2", "submission:audit_l3", "submission:final_status", "submission:approve_client", "submission:schedule_interview", "submission:edit_rate", "submission:edit",
        "branch_admin:manage", "user:manage", "pod:view", "pod:edit",
        "client:view", "placement:view", "report:view"
      ];
    case "DELIVERY_HEAD":
      return [
        "job:view", "job:edit", "job:approve", "job:reject",
        "job:assign", "job:assign_recruiter", "job:assign_pod",
        "candidate:view", "candidate:create",
        "submission:view", "submission:create", "submission:internal_screening", "submission:audit_rounds", "submission:audit_l1", "submission:audit_l2", "submission:audit_l3", "submission:final_status", "submission:approve_client", "submission:schedule_interview", "submission:edit_rate", "submission:edit",
        "pod:create", "pod:edit", "pod:delete", "pod:view", "pod:reset_cycle", "pod:overlap",
        "candidate:search_all_branches", "job:view_all_branches", "candidate:search_all_markets",
        "client:view", "placement:view", "report:view"
      ];
    case "ACCOUNT_MANAGER":
      return [
        "job:create", "job:edit", "job:view", "job:approve",
        "candidate:view", "candidate:create",
        "submission:view", "submission:create", "submission:audit_rounds", "submission:audit_l1", "submission:audit_l2", "submission:audit_l3", "submission:final_status", "submission:schedule_interview", "submission:edit_rate", "submission:edit",
        "pod:view",
        "client:view", "client:create", "client:edit",
        "placement:view", "placement:create",
        "report:view"
      ];
    case "POD_LEAD":
      return [
        "job:view", "job:edit", "job:approve", "job:reject",
        "candidate:view", "candidate:create",
        "submission:view", "submission:create", "submission:internal_screening", "submission:schedule_interview", "submission:edit",
        "pod:view", "pod:edit", "report:view"
      ];
    case "RECRUITER":
    default:
      return [
        "candidate:create", "candidate:view",
        "submission:create", "submission:view", "submission:edit",
        "job:view"
      ];
  }
}

/**
 * Checks whether the active perspective is considered an Admin (Tenant Admin or Super Admin).
 */
export function isRoleAdmin(
  roleStr: string | null | undefined,
  availableRoles: CustomRoleDefinition[] = [],
  userProfile?: any
): boolean {
  const sysRole = resolveActiveSystemRole(roleStr, availableRoles, userProfile);
  return sysRole === "ADMIN" || sysRole === "TENANT_ADMIN" || sysRole === "SUPER_ADMIN";
}

/**
 * Filter primary navigation items based strictly on active perspective.
 */
export function getFilteredPrimaryNav(
  roleStr: string | null | undefined,
  availableRoles: CustomRoleDefinition[] = [],
  userProfile?: any
): NavItem[] {
  const sysRole = resolveActiveSystemRole(roleStr, availableRoles, userProfile);
  const permissions = getActiveRolePermissions(roleStr, availableRoles, userProfile);

  if (sysRole === "SUPER_ADMIN") {
    return GLOBAL_ADMIN_NAV_ITEMS;
  }

  // Allowed item ID sets per base system role
  const roleAllowedMap: Record<SystemRoleType, string[]> = {
    SUPER_ADMIN: [],
    ADMIN: [
      "dashboard",
      "job-posting",
      "applicants",
      "submissions-tracker",
      "placements",
      "clients",
      "talent-bench",
      "vendors",
      "onboarding",
      "reports",
    ],
    TENANT_ADMIN: [
      "dashboard",
      "job-posting",
      "applicants",
      "submissions-tracker",
      "placements",
      "clients",
      "talent-bench",
      "vendors",
      "onboarding",
      "reports",
    ],
    BRANCH_ADMIN: [
      "dashboard",
      "job-posting",
      "applicants",
      "submissions-tracker",
      "placements",
      "clients",
      "talent-bench",
      "vendors",
      "onboarding",
      "reports",
    ],
    DELIVERY_HEAD: [
      "dashboard",
      "job-posting",
      "applicants",
      "submissions-tracker",
      "placements",
      "clients",
      "talent-bench",
      "vendors",
      "onboarding",
      "reports",
    ],
    ACCOUNT_MANAGER: [
      "dashboard",
      "job-posting",
      "applicants",
      "submissions-tracker",
      "clients",
      "placements",
      "reports",
    ],
    POD_LEAD: [
      "dashboard",
      "job-posting",
      "applicants",
      "submissions-tracker",
      "reports",
    ],
    RECRUITER: [
      "dashboard",
      "job-posting",
      "applicants",
      "submissions-tracker",
    ],
  };

  const allowedIds = new Set(roleAllowedMap[sysRole] || roleAllowedMap.RECRUITER);

  // Allow permission-based additions for custom roles
  if (permissions.includes("client:view") || permissions.includes("client:create")) {
    allowedIds.add("clients");
  }
  if (permissions.includes("placement:view") || permissions.includes("placement:create")) {
    allowedIds.add("placements");
  }
  if (permissions.includes("report:view")) {
    allowedIds.add("reports");
  }

  return PRIMARY_NAV_ITEMS.filter((item) => allowedIds.has(item.id)).map((item) => {
    if (item.id === "job-posting") {
      if (sysRole === "RECRUITER") {
        return {
          ...item,
          label: "Assigned Jobs",
          children: [
            { label: "All Assigned Jobs", href: "/job-posting" },
            { label: "Assigned to Me", href: "/job-posting?filter=direct" },
            { label: "My Pod Jobs", href: "/job-posting?filter=pod" },
          ],
        };
      }
      if (sysRole === "ACCOUNT_MANAGER") {
        return {
          ...item,
          label: "Job Postings",
          children: [
            { label: "All Jobs", href: "/job-posting" },
            { label: "Active Jobs", href: "/job-posting/active" },
            { label: "Unassigned Jobs", href: "/job-posting?filter=unassigned" },
            { label: "Draft Jobs", href: "/job-posting/drafts" },
            { label: "Job Boards", href: "/job-posting/boards" },
          ],
        };
      }
      // Admins, Branch Admins, Delivery Heads
      return {
        ...item,
        label: "Job Posting",
        children: [
          { label: "All Jobs", href: "/job-posting" },
          { label: "Active Jobs", href: "/job-posting/active" },
          { label: "Unassigned Jobs", href: "/job-posting?filter=unassigned" },
          { label: "Draft Jobs", href: "/job-posting/drafts" },
          { label: "Job Boards", href: "/job-posting/boards" },
        ],
      };
    }
    return item;
  });
}

/**
 * Filter more navigation items based strictly on active perspective.
 */
export function getFilteredMoreNav(
  roleStr: string | null | undefined,
  availableRoles: CustomRoleDefinition[] = [],
  userProfile?: any
): NavItem[] {
  const sysRole = resolveActiveSystemRole(roleStr, availableRoles, userProfile);
  const permissions = getActiveRolePermissions(roleStr, availableRoles, userProfile);

  if (sysRole === "SUPER_ADMIN") {
    return GLOBAL_ADMIN_MORE_ITEMS;
  }

  // Base More items visible to all staff (content inside Settings is role-customized)
  const baseMore = ["email", "calendar", "documents", "settings", "help"];
  const allowedIds = new Set(baseMore);

  const isAdmin = sysRole === "ADMIN" || sysRole === "TENANT_ADMIN";
  const isBranchAdmin = sysRole === "BRANCH_ADMIN";
  const isDeliveryHead = sysRole === "DELIVERY_HEAD";
  const isPodLead = sysRole === "POD_LEAD";

  // Role specific More items
  if (isAdmin) {
    allowedIds.add("database");
    allowedIds.add("integrations");
    allowedIds.add("user-management");
    allowedIds.add("branch-management");
    allowedIds.add("role-management");
    allowedIds.add("pod-management");
    allowedIds.add("dictionaries");
  } else if (isBranchAdmin) {
    allowedIds.add("user-management");
    allowedIds.add("pod-management");
  } else if (isDeliveryHead) {
    allowedIds.add("pod-management");
  } else if (isPodLead) {
    allowedIds.add("pod-management");
  }

  // Permission based additions
  const canViewLiveStream = isAdmin || isDeliveryHead || isBranchAdmin || permissions.includes("notification:broadcast") || permissions.includes("notification:view_all");
  const canViewAuditLogs = isAdmin || permissions.includes("audit:view") || permissions.includes("tenant:audit_logs");

  if (canViewLiveStream || canViewAuditLogs) {
    allowedIds.add("operations-logs");
  }

  if (
    permissions.includes("pod:manage") ||
    (permissions.includes("pod:view") && (isPodLead || isDeliveryHead || isBranchAdmin || isAdmin))
  ) {
    allowedIds.add("pod-management");
  }
  if (permissions.includes("user:manage") && (isAdmin || isBranchAdmin)) {
    allowedIds.add("user-management");
  }
  if (permissions.includes("branch_admin:manage") && isAdmin) {
    allowedIds.add("branch-management");
  }
  if (permissions.includes("tenant:settings") && isAdmin) {
    allowedIds.add("dictionaries");
    allowedIds.add("settings");
  }

  const canManageCompany = isAdmin || permissions.includes("tenant:settings") || permissions.includes("company:manage") || permissions.includes("company:view");

  return MORE_NAV_ITEMS
    .filter((item) => allowedIds.has(item.id))
    .map((item) => {
      if (item.id === "operations-logs") {
        const subChildren: { label: string; href: string }[] = [];
        if (canViewLiveStream) {
          subChildren.push({ label: "Live Activity Stream", href: "/utility/notifications" });
        }
        if (canViewAuditLogs) {
          subChildren.push({ label: "Security Audit Logs", href: "/utility/audit-logs" });
        }
        return {
          ...item,
          children: subChildren,
        };
      }

      if (item.id === "settings") {
        const subChildren: { label: string; href: string }[] = [];
        if (canManageCompany) {
          subChildren.push({ label: "Company & Workspace", href: "/company" });
        }
        subChildren.push({ label: "Sound & Tone Preferences", href: "/utility/settings-notifications" });
        return {
          ...item,
          children: subChildren,
        };
      }

      return item;
    })
    .filter((item) => !item.children || item.children.length > 0);
}
