import JobPostingDashboard from "../components/job-posting-dashboard";
import JobPostingSkeleton from "../components/job-posting-skeleton";
import { Suspense } from "react";

export const metadata = {
  title: "Draft Jobs - Enfysync ATS",
  description: "View and manage draft requirements.",
};

export default function DraftJobsPage() {
  return (
    <Suspense fallback={<JobPostingSkeleton />}>
      <JobPostingDashboard initialStatusFilter="Draft" />
    </Suspense>
  );
}
