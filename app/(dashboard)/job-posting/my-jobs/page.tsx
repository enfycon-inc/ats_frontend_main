import { APP_BRAND } from "@/lib/app-brand";
import JobPostingDashboard from "../components/job-posting-dashboard";
import JobPostingSkeleton from "../components/job-posting-skeleton";
import { Suspense } from "react";

export const metadata = {
  title: `My Jobs - ${APP_BRAND.name}`,
  description: "View and manage jobs assigned to you or created by you.",
};

export default function MyJobsPage() {
  return (
    <Suspense fallback={<JobPostingSkeleton />}>
      <JobPostingDashboard initialStatusFilter="All" initialFilter="my" />
    </Suspense>
  );
}
