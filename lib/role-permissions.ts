import { NavItem, GLOBAL_ADMIN_NAV_ITEMS, GLOBAL_ADMIN_MORE_ITEMS, PRIMARY_NAV_ITEMS, MORE_NAV_ITEMS } from "@/constants/navigation";

export type SystemRoleType = "SUPER_ADMIN" | "TENANT_ADMIN" | "BRANCH_ADMIN" | "UNIT_ADMIN" | "DELIVERY_HEAD" | "ACCOUNT_MANAGER" | "POD_LEAD" | "RECRUITER";
export interface CustomRoleDefinition {
  id: string; name: string; description?: string; isSystem?: boolean;
  systemRole?: string; replacesSystemRole?: string | null; permissions?: string[];
}
const SYSTEM_KEYS: SystemRoleType[] = ["SUPER_ADMIN", "TENANT_ADMIN", "BRANCH_ADMIN", "UNIT_ADMIN", "DELIVERY_HEAD", "ACCOUNT_MANAGER", "POD_LEAD", "RECRUITER"];

// Role archetypes select presentation only. They never grant capabilities.
export function resolveActiveSystemRole(input: any, roles: CustomRoleDefinition[] = [], profile?: any): SystemRoleType {
  const seen = new Set<string>();
  function resolve(value: any): SystemRoleType {
    if (Array.isArray(value)) value = value[0];
    if (typeof value !== "string" || !value.trim()) return "RECRUITER";
    const key = value.trim();
    if (seen.has(key)) return "RECRUITER";
    seen.add(key);
    const exact = roles.find(r => r.id === key);
    if (exact) return resolve(exact.systemRole || exact.replacesSystemRole);
    const canonical = key.toUpperCase().replace(/ /g, "_");
    if (SYSTEM_KEYS.includes(canonical as SystemRoleType)) return canonical as SystemRoleType;
    const matches = roles.filter(r => r.name?.toLowerCase() === key.toLowerCase());
    if (matches.length === 1) return resolve(matches[0].systemRole || matches[0].replacesSystemRole);
    if (key === profile?.roleId) return resolve(profile?.systemRole);
    return "RECRUITER";
  }
  return resolve(input ?? profile?.systemRole);
}

export function getActiveRolePermissions(input: any, roles: CustomRoleDefinition[] = [], profile?: any): string[] {
  const catalog = [...(profile?.assignedRoles || []), ...roles];

  if (input) {
    const inputs = Array.isArray(input) ? input : [input];
    let foundRole = false;
    const resolvedPerms = inputs.flatMap(value => {
      const exact = catalog.find(r => r.id === value);
      const matches = catalog.filter(r => r.name?.toLowerCase() === String(value).toLowerCase());
      const role = exact || (matches.length === 1 ? matches[0] : undefined);
      if (role) foundRole = true;
      return Array.isArray(role?.permissions) ? role.permissions : [];
    });
    if (foundRole) return [...new Set(resolvedPerms)]; if (inputs.includes(profile?.systemRole)) return Array.isArray(profile?.permissions) ? profile.permissions : [];
    // If an explicit role was requested but not found, do not fall back to the union.
    return [];
  }

  // Fallback to the live backend union if no specific role was requested
  if (Array.isArray(profile?.permissions)) return profile.permissions;
  const assigned = new Set<string>([...(profile?.assignedRoleIds || []), profile?.roleId].filter(Boolean));
  if (assigned.size) return [...new Set<string>(catalog.filter(r => assigned.has(r.id)).flatMap(r => Array.isArray(r.permissions) ? r.permissions : []))];
  
  return [];
}

export function isRoleAdmin(input: any, roles: CustomRoleDefinition[] = [], profile?: any): boolean {
  const perms = getActiveRolePermissions(input, roles, profile); return perms.includes('*') || perms.some(p => ['tenant:settings', 'tenant:manage', 'platform:manage'].includes(p));
}

export function getFilteredPrimaryNav(input: any, roles: CustomRoleDefinition[] = [], profile?: any): NavItem[] {
  const podsEnabled = profile?.features?.podsEnabled === true;
  const perms = getActiveRolePermissions(input, roles, profile);
  const has = (...keys: string[]) => perms.includes('*') || keys.some(k => perms.includes(k));
  if (has("platform:manage")) return GLOBAL_ADMIN_NAV_ITEMS;
  const activeRole = resolveActiveSystemRole(input, [...(profile?.assignedRoles || []), ...roles], profile);
  const isAccountManagerRole = activeRole === "ACCOUNT_MANAGER";
  const canBrowseJobCatalog = has('tenant:manage', 'tenant:settings', 'platform:manage', 'branch_admin:manage', 'unit_admin:manage', 'job:create', 'job:override_assignment', 'job:view_all', 'job:view_all_branches');
  const canViewAllSubmissions = has("submission:view_all", "tenant:manage", "tenant:settings", "platform:manage", "branch_admin:manage", "unit_admin:manage");
  const canAccessSubmissions = canViewAllSubmissions || has("submission:view", "submission:create");
  const canViewCalendar = has("submission:view", "submission:view_all", "tenant:manage", "tenant:settings", "platform:manage", "branch_admin:manage", "unit_admin:manage");
  const allowed: Record<string, boolean> = {
    dashboard: true,
    interviews: canViewCalendar,
    "job-posting": has("job:view"), "applicants": has("candidate:view", "candidate:create"),
    "submissions-tracker": canAccessSubmissions, placements: false,
    clients: activeRole !== "RECRUITER" && has("client:view"),
    "talent-bench": !["RECRUITER", "ACCOUNT_MANAGER", "DELIVERY_HEAD"].includes(activeRole) && has("candidate:view"),
    vendors: has("vendor:view"), onboarding: has("onboarding:view"), reports: !["ACCOUNT_MANAGER", "DELIVERY_HEAD"].includes(activeRole) && has("report:view"),
    "branch-units": has("tenant:settings", "tenant:manage", "branch:create", "unit_admin:manage", "branch_admin:manage", "unit:view"),
  };
  return PRIMARY_NAV_ITEMS.filter(item => allowed[item.id]).map(item => {
    if (!item.children) return item;
    const children = item.children.filter(child => {
      if (child.href === '/job-posting/all' && !podsEnabled && !canBrowseJobCatalog) return false;
      if (child.href === '/job-posting/pod-jobs' && !(podsEnabled && has('job:view_pod_jobs', 'job:submit_pod_jobs'))) return false;
      if (child.href === '/utility/submissions?view=pod' && !podsEnabled) return false;
      if (child.href === "/utility/submissions?view=all" && !canViewAllSubmissions) return false;
      if (child.href === "/utility/submissions?view=my" && !canAccessSubmissions) return false;
      if (child.href === "/utility/submissions?view=pod" && !(canAccessSubmissions && has("pod:view"))) return false;
      const isGlobalOrBranchAdmin = has('tenant:manage', 'tenant:settings', 'branch_admin:manage', 'job:view_all', 'platform:manage', 'unit_admin:manage', 'job:view_all_branches');
      const isAccountManager = !isGlobalOrBranchAdmin && isAccountManagerRole;

      
      // Specific Removals for Managers (Unit Admin, Branch Admin, Tenant Admin)
      const isManagerRole = resolveActiveSystemRole(input, roles, profile) === "TENANT_ADMIN" || 
                              resolveActiveSystemRole(input, roles, profile) === "BRANCH_ADMIN" || 
                              resolveActiveSystemRole(input, roles, profile) === "DELIVERY_HEAD" || 
                              resolveActiveSystemRole(input, roles, profile) === "UNIT_ADMIN";
      
      if (isManagerRole) {
        if (child.href === "/job-posting/my-jobs") return false;
        if (child.href === "/job-posting/pod-jobs") return false;
        if (child.href === "/job-posting/drafts") return false;
        if (child.href === "/job-posting/boards") return false;
      }

      // ── Submission access gating for DH / UA / BA (granular permission) ──
      const isSubmissionGatedRole =
        resolveActiveSystemRole(input, roles, profile) === "DELIVERY_HEAD" ||
        resolveActiveSystemRole(input, roles, profile) === "UNIT_ADMIN" ||
        resolveActiveSystemRole(input, roles, profile) === "BRANCH_ADMIN";

      if (isSubmissionGatedRole) {
        // Pod Submissions: always hidden — not relevant for these roles
        if (child.href === "/utility/submissions?view=pod") return false;
        // My Submissions: hidden — managers oversee, they don't personally submit
        if (child.href === "/utility/submissions?view=my") return false;
        if (child.href === "/utility/submissions?view=all") return canViewAllSubmissions;
      }

        // ── Specific Removals for Account Manager ──
      if (isAccountManager) {
        if (child.href === "/job-posting/active") return false;
        if (child.href === "/job-posting/pod-jobs") return false;
        if (child.href === "/job-posting/boards") return false;
        if (child.href === "/utility/submissions?view=pod") return false;
        if (child.href === "/applicants/resume-search/usit") return false;
        
        if (child.href === "/utility/submissions?view=my" && !has("submission:view", "submission:create")) return false;
      }

      // ── Specific Removals for Recruiters ──
      const isRecruiter = !isGlobalOrBranchAdmin && !isAccountManager && resolveActiveSystemRole(input, roles, profile) === "RECRUITER";
      if (isRecruiter) {
        if (child.href === "/job-posting/active") return false;
      }

      if (["/applicants/new", "/applicants/bulk"].includes(child.href)) return has("candidate:create");
      if (child.href === "/applicants/pipeline") return has("submission:view");
      if (child.href === "/job-posting/drafts") return has("job:create");
      if (child.href === "/job-posting/new?mode=manual") return has("job:create");
      if (child.href === "/job-posting/boards") return has("job:publish_direct");
      if (child.href === "/job-posting/all?tab=shared") {
        const role = resolveActiveSystemRole(input, roles, profile);
        if (!["TENANT_ADMIN", "BRANCH_ADMIN", "UNIT_ADMIN", "DELIVERY_HEAD"].includes(role)) {
          return false;
        }
      }
      if (child.href === "/management/branch") return has("tenant:settings", "tenant:manage", "branch:create");
      if (child.href === "/management/markets") return profile?.roles?.includes("SUPER_ADMIN") || has("platform:manage");
      if (child.href === "/management/units") return has("tenant:settings", "tenant:manage", "branch_admin:manage", "unit_admin:manage", "unit:view");
      if (item.id === "applicants") return has("candidate:view");
      return true;
    });
    const unitOnly = item.id === "branch-units" && children.length === 1 && children[0].href === "/management/units";
    return { ...item, ...(unitOnly ? { label: "Units", href: "/management/units" } : {}), children };
  }).filter(item => !item.children || item.children.length > 0);
}

export function getFilteredMoreNav(input: any, roles: CustomRoleDefinition[] = [], profile?: any): NavItem[] {
  const podsEnabled = profile?.features?.podsEnabled === true;
  const perms = getActiveRolePermissions(input, roles, profile);
  const has = (...keys: string[]) => perms.includes('*') || keys.some(k => perms.includes(k));
  const isAccountManager = resolveActiveSystemRole(input, roles, profile) === "ACCOUNT_MANAGER";
  const activeRole = resolveActiveSystemRole(input, [...(profile?.assignedRoles || []), ...roles], profile);
  const isDeliveryHead = activeRole === "DELIVERY_HEAD";
  if (has("platform:manage")) return GLOBAL_ADMIN_MORE_ITEMS;
  const company = has("tenant:settings", "tenant:manage");
  const allowed: Record<string, boolean> = {
    developer: company, email: true, documents: false, settings: activeRole !== "RECRUITER", help: true,
    database: has("database:manage", "tenant:settings"), integrations: has("integration:manage", "tenant:settings"),
    "user-management": has("user:manage", "user:view", "user:presence:view", "user:sessions:view", "user:login_logs:view"),
    "role-management": !isDeliveryHead && has("user:manage"),
    "pod-management": podsEnabled && !isAccountManager && has("pod:view", "pod:manage"), dictionaries: has("tenant:settings"),
    "operations-logs": has("notification:broadcast", "notification:view_all", "audit:view", "tenant:audit_logs"),
  };
  return MORE_NAV_ITEMS.filter(item => allowed[item.id]).map(item => {
    if (item.id === 'user-management') {
      const children = (item.children || []).filter(child => child.href.endsWith('/create') ? has('user:manage') : child.href.endsWith('/activity') ? has('user:presence:view', 'user:sessions:view', 'user:login_logs:view') : has('user:manage', 'user:view'));
      return { ...item, href: children[0]?.href || item.href, children };
    }
    if (item.id === "settings") {
      const children = [];
      if (company) children.push(
        { label: "Company & Structure", href: "/company?tab=general" },
        ...(has("tenant:settings") ? [{ label: "Client & POC Access", href: "/settings/client-access" }] : []),
        { label: "Authentication & SSO", href: "/company?tab=auth" },
        { label: "Custom Domains", href: "/company?tab=domains" },
        { label: "Email Dispatch", href: "/company?tab=email" },
        { label: "Hiring & Pod Rules", href: "/company?tab=hiring" },
        { label: "Global Remarks Templates", href: "/utility/global-remarks" },
      );
      if (!company && has("branch_admin:manage", "branch:edit", "branch:view", "branch:network:manage", "unit:geofence:manage")) children.push({ label: "Branch Settings", href: "/settings/branch" });
      if (has("job:grant_creation_delegate", "job:manage_creation_access")) children.push({ label: "Delegated Access", href: "/job-posting/access" });
      children.push({ label: "Sound & Tone Preferences", href: "/utility/settings-notifications" });
      return { ...item, children };
    }
    if (item.id === "operations-logs") return { ...item, children: [
      ...(has("notification:broadcast", "notification:view_all") ? [{ label: "Live Activity Stream", href: "/utility/notifications" }] : []),
      ...(has("audit:view", "tenant:audit_logs") ? [{ label: "Security Audit Logs", href: "/utility/audit-logs" }] : []),
    ] };
    return item;
  });
}
