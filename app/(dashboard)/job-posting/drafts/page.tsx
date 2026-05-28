import JobPostingDashboard from "../components/job-posting-dashboard";

export const metadata = {
  title: "Draft Jobs - Enfysync ATS",
  description: "View and manage draft requirements.",
};

export default function DraftJobsPage() {
  return <JobPostingDashboard initialStatusFilter="Draft" />;
}
