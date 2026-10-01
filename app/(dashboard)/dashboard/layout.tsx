export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Navigation/profile data is loaded once by the parent dashboard layout and
  // provided by ClientRoot. Loading it again here doubled auth/profile calls.
  return children;
}
