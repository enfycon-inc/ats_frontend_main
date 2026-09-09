import JobPostingDashboard from "../components/job-posting-dashboard";
import { Suspense } from "react";

export const metadata = {
  title: "Archived Jobs - Enfysync ATS",
  description: "View and manage closed/archived requirements.",
};

export default function ArchivedJobsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-neutral-400">Loading Archived Jobs...</div>}>
      <JobPostingDashboard initialStatusFilter="Close" />
    </Suspense>
  );
}
