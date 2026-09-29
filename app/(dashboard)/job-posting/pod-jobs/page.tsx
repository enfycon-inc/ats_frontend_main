import JobPostingDashboard from "../components/job-posting-dashboard";
import JobPostingSkeleton from "../components/job-posting-skeleton";
import { Suspense } from "react";

export const metadata = {
  title: "Pod Jobs - Enfysync ATS",
  description: "View and manage jobs assigned to your pod.",
};

export default function PodJobsPage() {
  return (
    <Suspense fallback={<JobPostingSkeleton />}>
      <JobPostingDashboard initialStatusFilter="All" initialFilter="pod" />
    </Suspense>
  );
}
