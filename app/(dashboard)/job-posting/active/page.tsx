import JobPostingDashboard from "../components/job-posting-dashboard";
import { Suspense } from "react";

export const metadata = {
  title: "Active Jobs - Enfysync ATS",
  description: "View and manage active requirements.",
};

export default function ActiveJobsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-neutral-400">Loading Active Jobs...</div>}>
      <JobPostingDashboard initialStatusFilter="Active" />
    </Suspense>
  );
}
