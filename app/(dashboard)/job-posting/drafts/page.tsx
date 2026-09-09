import JobPostingDashboard from "../components/job-posting-dashboard";
import { Suspense } from "react";

export const metadata = {
  title: "Draft Jobs - Enfysync ATS",
  description: "View and manage draft requirements.",
};

export default function DraftJobsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-neutral-400">Loading Draft Jobs...</div>}>
      <JobPostingDashboard initialStatusFilter="Draft" />
    </Suspense>
  );
}
