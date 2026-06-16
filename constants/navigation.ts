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
  FileText,
  Calendar,
  Star,
  Database,
  Globe,
  HelpCircle,
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
      { label: "All Jobs", href: "/job-posting" },
      { label: "Active Jobs", href: "/job-posting/active" },
      { label: "Draft Jobs", href: "/job-posting/drafts" },
      { label: "Archived Jobs", href: "/job-posting/archived" },
      { label: "Job Templates", href: "/job-posting/templates" },
      { label: "Job Boards", href: "/job-posting/boards" },
    ],
  },
  {
    id: "applicants",
    label: "Applicants",
    href: "/applicants",
    icon: Users,
    children: [
      { label: "Add Candidate", href: "/applicants/new" },
      { label: "All Candidates", href: "/applicants/all" },
      { label: "Pipeline View", href: "/applicants/pipeline" },
      { label: "Resume Search", href: "/applicants/resume-search" },
      { label: "Interviews", href: "/applicants/interviews" },
      { label: "Offers", href: "/applicants/offers" },
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
];

// ─────────────────────────────────────────────
// "More" Dropdown Items
// ─────────────────────────────────────────────

export const MORE_NAV_ITEMS: NavItem[] = [
  { id: "email", label: "Email", href: "/email", icon: Mail },
  { id: "calendar", label: "Calendar", href: "/calendar", icon: Calendar },
  { id: "documents", label: "Documents", href: "/documents", icon: FileText },
  { id: "database", label: "Database", href: "/database", icon: Database },
  { id: "integrations", label: "Integrations", href: "/integrations", icon: Globe },
  { id: "tenant-management", label: "Tenant Management", href: "/utility/approvals", icon: Building2 },
  { id: "role-management", label: "Role Management", href: "/utility/roles-permissions", icon: UserCheck },
  { id: "dictionaries", label: "Master Dictionaries", href: "/utility/dictionaries", icon: Database },
  { id: "settings", label: "Settings", href: "/company", icon: Settings },
  { id: "help", label: "Help & Support", href: "/help", icon: HelpCircle },
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
  { id: "reports", label: "Reports", href: "/reports", icon: BarChart3, color: "#fd7e14" },
  { id: "calendar", label: "Calendar", href: "/calendar", icon: Calendar, color: "#0dcaf0" },
  { id: "email", label: "Email", href: "/email", icon: Mail, color: "#d63384" },
  { id: "settings", label: "Settings", href: "/company", icon: Settings, color: "#6c757d" },
];
