
const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "app/(dashboard)/dashboard/components/admin-dashboard-view.tsx");
let c = fs.readFileSync(p, "utf8");

// Global Active Jobs
c = c.replace(
  "{activeJobs.length}",
  "{isLoadingBranches ? <Skeleton className=\"h-8 w-12\" /> : activeJobs.length}"
);

// Staff / Seat Usage
c = c.replace(
  "{users.length > 0 ? users.length : (isLoadingBranches ? <Skeleton className=\"h-8 w-16 inline-block\" /> : \"0\")} <span className=\"text-sm font-semibold text-default-400\">/ {seatLimit}</span>",
  "{isLoadingBranches ? <Skeleton className=\"h-8 w-24 inline-block\" /> : <>{users.length > 0 ? users.length : \"0\"} <span className=\"text-sm font-semibold text-default-400\">/ {seatLimit}</span></>}"
);

// Total Pipeline
c = c.replace(
  "{jobs.reduce((acc, job) => acc + (job.submissionsCount || 0), 0)}",
  "{isLoadingBranches ? <Skeleton className=\"h-8 w-12\" /> : jobs.reduce((acc, job) => acc + (job.submissionsCount || 0), 0)}"
);

fs.writeFileSync(p, c);
console.log("Fixed top cards skeletons");

