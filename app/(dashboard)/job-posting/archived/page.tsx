import JobPostingDashboard from "../components/job-posting-dashboard";

export const metadata = {
  title: "Archived Jobs - Enfysync ATS",
  description: "View and manage closed/archived requirements.",
};

export default function ArchivedJobsPage() {
  return <JobPostingDashboard initialStatusFilter="Close" />;
}
