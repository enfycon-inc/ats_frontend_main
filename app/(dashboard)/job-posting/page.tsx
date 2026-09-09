import JobPostingDashboard from "./components/job-posting-dashboard";
import { Suspense } from "react";

export const metadata = {
  title: "Job Postings - Enfysync ATS",
  description: "View and manage job requirements, candidate pipelines, and recruiter workflows.",
};

export default function JobPostingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-neutral-400">Loading Requisitions...</div>}>
      <JobPostingDashboard initialStatusFilter="All" />
    </Suspense>
  );
}
