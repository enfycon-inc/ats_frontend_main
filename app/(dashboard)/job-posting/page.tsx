import JobPostingDashboard from "./components/job-posting-dashboard";

export const metadata = {
  title: "Job Postings - Enfysync ATS",
  description: "View and manage job requirements, candidate pipelines, and recruiter workflows.",
};

export default function JobPostingPage() {
  return <JobPostingDashboard initialStatusFilter="All" />;
}
