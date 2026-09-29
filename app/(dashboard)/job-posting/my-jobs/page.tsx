import JobPostingDashboard from "../components/job-posting-dashboard";
import JobPostingSkeleton from "../components/job-posting-skeleton";
import { Suspense } from "react";

export const metadata = {
  title: "My Jobs - Enfysync ATS",
  description: "View and manage jobs assigned to you or created by you.",
};

export default function MyJobsPage() {
  return (
    <Suspense fallback={<JobPostingSkeleton />}>
      <JobPostingDashboard initialStatusFilter="All" initialFilter="my" />
    </Suspense>
  );
}
