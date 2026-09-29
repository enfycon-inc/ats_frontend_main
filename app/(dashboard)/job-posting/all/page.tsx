import JobPostingDashboard from "../components/job-posting-dashboard";
import JobPostingSkeleton from "../components/job-posting-skeleton";
import { Suspense } from "react";

export const metadata = {
  title: "All Jobs - Enfysync ATS",
  description: "View and manage all job requirements, candidate pipelines, and recruiter workflows.",
};

export default function AllJobsPage() {
  return (
    <Suspense fallback={<JobPostingSkeleton />}>
      <JobPostingDashboard initialStatusFilter="All" />
    </Suspense>
  );
}
