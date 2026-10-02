import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Store,
  UserCheck,
  ClipboardList,
  MapPin,
  BarChart3,
  Settings,
  Mail,
  Bell,
  FileText,
  Calendar,
  Star,
  Database,
  Globe,
  HelpCircle,
  Shield,
  Activity,
  Cpu,
  Lock,
  Server,
  Layers,
  type LucideIcon,
} from "lucide-react";

// ─────────────────────────────────────────────
// TypeScript Types
// ─────────────────────────────────────────────

export interface NavSubItem {
  label: string;
  href: string;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  children?: NavSubItem[];
  badge?: number;
}

export interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export interface AppLauncherItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  color: string;
}

// ─────────────────────────────────────────────
// Primary Navigation
// ─────────────────────────────────────────────

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "job-posting",
    label: "Job Posting",
    href: "/job-posting",
    icon: Briefcase,
    children: [
      { label: "All Jobs", href: "/job-posting/all" },
      { label: "Active Jobs", href: "/job-posting/active" },
      { label: "My Jobs", href: "/job-posting/my-jobs" },
      { label: "Pod Jobs", href: "/job-posting/pod-jobs" },
      { label: "Draft Jobs", href: "/job-posting/drafts" },
      { label: "Co-sourced Jobs", href: "/job-posting/all?tab=shared" },
      { label: "Job Boards", href: "/job-posting/boards" },
    ],
  },
  {
    id: "submissions-tracker",
    label: "Recruitment",
    href: "/utility/submissions",
    icon: ClipboardList,
    children: [
      { label: "My Submissions", href: "/utility/submissions?view=my" },
      { label: "Pod Submissions", href: "/utility/submissions?view=pod" },
      { label: "All Submissions", href: "/utility/submissions?view=all" },
    ],
  },
  {
    id: "applicants",
    label: "Candidates & Talent Pool",
    href: "/applicants",
    icon: Users,
    children: [
      { label: "All Candidates", href: "/applicants/all" },
      { label: "US IT Candidate Search", href: "/applicants/resume-search/usit" },
      { label: "Domestic Candidate Search", href: "/applicants/resume-search/domestic" },
      { label: "Upload Single CV", href: "/applicants/new" },
      { label: "Batch CV Parsing Engine", href: "/applicants/bulk" },
      { label: "Pipeline View", href: "/applicants/pipeline" },
    ],
  },
  {
    id: "placements",
    label: "Placements",
    href: "/placements",
    icon: MapPin,
    children: [
      { label: "Active Placements", href: "/placements/active" },
      { label: "Ended Placements", href: "/placements/ended" },
      { label: "Timesheets", href: "/placements/timesheets" },
      { label: "Expenses", href: "/placements/expenses" },
    ],
  },
  {
    id: "clients",
    label: "Clients",
    href: "/clients",
    icon: Building2,
    children: [
      { label: "All Clients", href: "/clients/all" },
      { label: "Contacts", href: "/clients/contacts" },
      { label: "Agreements", href: "/clients/agreements" },
      { label: "Invoices", href: "/clients/invoices" },
    ],
  },
  {
    id: "talent-bench",
    label: "Talent Bench",
    href: "/talent-bench",
    icon: Star,
    children: [
      { label: "Bench Candidates", href: "/talent-bench/candidates" },
      { label: "Skill Matrix", href: "/talent-bench/skills" },
      { label: "Availability", href: "/talent-bench/availability" },
    ],
  },
  {
    id: "vendors",
    label: "Vendors",
    href: "/vendors",
    icon: Store,
    children: [
      { label: "Vendor List", href: "/vendors/list" },
      { label: "Vendor Portal", href: "/vendors/portal" },
      { label: "Submissions", href: "/vendors/submissions" },
    ],
  },
  {
    id: "onboarding",
    label: "Onboarding",
    href: "/onboarding",
    icon: UserCheck,
    children: [
      { label: "New Hires", href: "/onboarding/new-hires" },
      { label: "Documents", href: "/onboarding/documents" },
      { label: "Checklists", href: "/onboarding/checklists" },
      { label: "Background Checks", href: "/onboarding/background-checks" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    children: [
      { label: "Recruitment Analytics", href: "/reports/recruitment" },
      { label: "Pipeline Reports", href: "/reports/pipeline" },
      { label: "Client Reports", href: "/reports/clients" },
      { label: "Revenue Reports", href: "/reports/revenue" },
      { label: "Activity Reports", href: "/reports/activity" },
    ],
  },
  {
    id: "branch-units",
    label: "Branch & Units",
    href: "/management/branch",
    icon: Building2,
    children: [
      { label: "Branch", href: "/management/branch" },
      { label: "Units", href: "/management/units" },
      { label: "Markets", href: "/management/markets" },
    ],
  },
];

// ─────────────────────────────────────────────
// "More" Dropdown Items
// ─────────────────────────────────────────────

export const MORE_NAV_ITEMS: NavItem[] = [
  { id: "email", label: "Mass Mail", href: "/email", icon: Mail },
  { id: "calendar", label: "Calendar", href: "/calendar", icon: Calendar },
  { id: "documents", label: "Documents", href: "/documents", icon: FileText },
  { id: "database", label: "Database", href: "/database", icon: Database },
  { id: "integrations", label: "Integrations", href: "/integrations", icon: Globe },
  { id: "tenant-management", label: "Tenant Management", href: "/utility/approvals", icon: Building2 },
  { id: "user-management", label: "Users & Teams", href: "/utility/users", icon: Users },
  { id: "role-management", label: "Role Management", href: "/utility/roles-permissions", icon: UserCheck },
  { id: "pod-management", label: "Recruitment Pods", href: "/utility/pods", icon: Users },
  { id: "dictionaries", label: "Master Dictionaries", href: "/utility/dictionaries", icon: Database },
  {
    id: "operations-logs",
    label: "Operations & Logs",
    href: "/utility/notifications",
    icon: Activity,
    children: [
      { label: "Live Activity Stream", href: "/utility/notifications" },
      { label: "Security Audit Logs", href: "/utility/audit-logs" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/company",
    icon: Settings,
    children: [
      { label: "Company & Structure", href: "/company?tab=general" },
      { label: "Authentication & SSO", href: "/company?tab=auth" },
      { label: "Custom Domains", href: "/company?tab=domains" },
      { label: "Email Dispatch", href: "/company?tab=email" },
      { label: "Hiring & Pod Rules", href: "/company?tab=hiring" },
      { label: "Global Remarks Templates", href: "/utility/global-remarks" },
      { label: "Sound & Tone Preferences", href: "/utility/settings-notifications" },
    ],
  },
  { id: "help", label: "Help & Support", href: "/help", icon: HelpCircle },
];

// ─────────────────────────────────────────────
// Dedicated Global Admin (SUPER_ADMIN) Navigation
// ─────────────────────────────────────────────

export const GLOBAL_ADMIN_NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "tenant-management",
    label: "Tenants",
    href: "/utility/approvals",
    icon: Building2,
    children: [
      { label: "Pending Approvals", href: "/utility/approvals?tab=pending" },
      { label: "Active Tenants", href: "/utility/approvals?tab=tenants" },
    ],
  },
    {
      id: "platform-markets",
      label: "Markets",
      href: "/management/markets",
      icon: Globe,
    },
  {
    id: "security-audit",
    label: "Audit Logs",
    href: "/utility/audit-logs",
    icon: Shield,
  },
  {
    id: "ai-dictionaries",
    label: "Dictionaries",
    href: "/utility/dictionaries",
    icon: Cpu,
  },
  {
    id: "global-rbac",
    label: "Roles & Permissions",
    href: "/utility/roles-permissions",
    icon: Lock,
  },
  {
    id: "recruitment-pods",
    label: "Pods",
    href: "/utility/pods",
    icon: Users,
  },
];

export const GLOBAL_ADMIN_MORE_ITEMS: NavItem[] = [
  { id: "email-integration", label: "Mass Mail", href: "/email", icon: Mail },
  {
    id: "operations-logs",
    label: "Operations & Logs",
    href: "/utility/notifications",
    icon: Activity,
    children: [
      { label: "Live Activity Stream", href: "/utility/notifications" },
      { label: "Security Audit Logs", href: "/utility/audit-logs" },
    ],
  },
  {
    id: "system-settings",
    label: "Settings",
    href: "/company",
    icon: Settings,
    children: [
      { label: "Company & Structure", href: "/company?tab=general" },
      { label: "Authentication & SSO", href: "/company?tab=auth" },
      { label: "Custom Domains", href: "/company?tab=domains" },
      { label: "Email Dispatch", href: "/company?tab=email" },
      { label: "Hiring & Pod Rules", href: "/company?tab=hiring" },
      { label: "Global Remarks Templates", href: "/utility/global-remarks" },
      { label: "Sound & Tone Preferences", href: "/utility/settings-notifications" },
    ],
  },
  { id: "reports-analytics", label: "Reports", href: "/reports", icon: BarChart3 },
  { id: "help-support", label: "Help & Support", href: "/help", icon: HelpCircle },
];

// ─────────────────────────────────────────────
// Quick Actions
// ─────────────────────────────────────────────

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "add-job", label: "Add Job", href: "/job-posting/new", icon: Briefcase, description: "Post a new job opening" },
  { id: "add-candidate", label: "Add Candidate", href: "/applicants/new", icon: Users, description: "Add a new candidate" },
  { id: "add-client", label: "Add Client", href: "/clients/new", icon: Building2, description: "Create a new client" },
  { id: "send-offer", label: "Send Offer", href: "/applicants/offers/new", icon: ClipboardList, description: "Create & send an offer" },
  { id: "schedule-interview", label: "Schedule Interview", href: "/applicants/interviews/new", icon: Calendar, description: "Schedule candidate interview" },
];

// ─────────────────────────────────────────────
// Apps Launcher
// ─────────────────────────────────────────────

export const APP_LAUNCHER_ITEMS: AppLauncherItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "#1a4fa0" },
  { id: "jobs", label: "Jobs", href: "/job-posting", icon: Briefcase, color: "#0d6efd" },
  { id: "candidates", label: "Candidates", href: "/applicants", icon: Users, color: "#198754" },
  { id: "clients", label: "Clients", href: "/clients", icon: Building2, color: "#6f42c1" },
  { id: "tenants", label: "Tenants", href: "/utility/approvals", icon: Building2, color: "#0dcaf0" },
  { id: "roles", label: "Roles", href: "/utility/roles-permissions", icon: UserCheck, color: "#fd7e14" },
  { id: "pods", label: "Pods", href: "/utility/pods", icon: Users, color: "#6f42c1" },
  { id: "reports", label: "Reports", href: "/reports", icon: BarChart3, color: "#fd7e14" },
  { id: "calendar", label: "Calendar", href: "/calendar", icon: Calendar, color: "#0dcaf0" },
  { id: "email", label: "Mass Mail", href: "/email", icon: Mail, color: "#d63384" },
  { id: "settings", label: "Settings", href: "/company", icon: Settings, color: "#6c757d" },
];
