import { APP_BRAND } from "@/lib/app-brand";
import JobPostingDashboard from "../components/job-posting-dashboard";
import JobPostingSkeleton from "../components/job-posting-skeleton";
import { Suspense } from "react";

export const metadata = {
  title: `Archived Jobs - ${APP_BRAND.name}`,
  description: "View and manage closed/archived requirements.",
};

export default function ArchivedJobsPage() {
  return (
    <Suspense fallback={<JobPostingSkeleton />}>
      <JobPostingDashboard initialStatusFilter="Close" />
    </Suspense>
  );
}
