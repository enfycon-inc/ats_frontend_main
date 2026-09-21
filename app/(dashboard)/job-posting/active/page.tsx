import JobPostingDashboard from "../components/job-posting-dashboard";
import JobPostingSkeleton from "../components/job-posting-skeleton";
import { Suspense } from "react";

export const metadata = {
  title: "Active Jobs - Enfysync ATS",
  description: "View and manage active requirements.",
};

export default function ActiveJobsPage() {
  return (
    <Suspense fallback={<JobPostingSkeleton />}>
      <JobPostingDashboard initialStatusFilter="Active" />
    </Suspense>
  );
}
