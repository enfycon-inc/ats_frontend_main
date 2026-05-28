import JobPostingDashboard from "../components/job-posting-dashboard";

export const metadata = {
  title: "Active Jobs - Enfysync ATS",
  description: "View and manage active requirements.",
};

export default function ActiveJobsPage() {
  return <JobPostingDashboard initialStatusFilter="Active" />;
}
