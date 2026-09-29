const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/job-posting/components/job-posting-dashboard.tsx', 'utf8');

// 1. Add initialFilter to interface
c = c.replace(
  'interface JobPostingDashboardProps {\r\n  initialStatusFilter?: string;\r\n}',
  'interface JobPostingDashboardProps {\r\n  initialStatusFilter?: string;\r\n  initialFilter?: string; // Prop-based filter for dedicated pages (e.g. "my", "pod")\r\n}'
);

// 2. Add initialFilter to destructured props
c = c.replace(
  'export default function JobPostingDashboard({\r\n  initialStatusFilter = "All",\r\n}: JobPostingDashboardProps)',
  'export default function JobPostingDashboard({\r\n  initialStatusFilter = "All",\r\n  initialFilter,\r\n}: JobPostingDashboardProps)'
);

// 3. Make filterParam prefer the prop over searchParams
c = c.replace(
  'const filterParam = searchParams.get("filter"); // e.g. "direct", "pod", "unassigned", etc.',
  '// Prefer prop-based initialFilter (from dedicated pages like /my-jobs) over URL query param\n  const filterParam = initialFilter || searchParams.get("filter"); // e.g. "direct", "pod", "unassigned", "my"'
);

fs.writeFileSync('app/(dashboard)/job-posting/components/job-posting-dashboard.tsx', c);
console.log("Done!");
