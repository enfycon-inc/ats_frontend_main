import JobPostingDashboard from "./components/job-posting-dashboard";
import JobPostingSkeleton from "./components/job-posting-skeleton";
import { Suspense } from "react";

export const metadata = {
  title: "Job Postings - Enfysync ATS",
  description: "View and manage job requirements, candidate pipelines, and recruiter workflows.",
};

export default function JobPostingPage() {
  return (
    <Suspense fallback={<JobPostingSkeleton />}>
      <JobPostingDashboard initialStatusFilter="All" />
    </Suspense>
  );
}
